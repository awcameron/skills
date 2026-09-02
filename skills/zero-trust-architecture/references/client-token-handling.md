# Frontend Token Handling & Propagation

## The ideal, and where a given frontend actually sits

The Zero Trust concern with client-side token storage is narrow but real: anything readable by
JavaScript on the page (like `localStorage`) is also readable by an XSS payload on that page —
storing a session token there means an XSS bug becomes a full session-theft bug, not just a
defaced page. Storage that isn't script-readable (an httpOnly cookie, or nothing persisted at all)
doesn't have that failure mode.

**Check this repo's actual auth-client configuration before asserting either way** — it would be
easy to state the ideal as if it were already true. Look for whatever this repo's session/auth
library exposes as a persistence option (often named something like `persistSession` or
`storage`/`storageKey`); if it's left at a default with no custom storage adapter, the session is
very likely landing in `localStorage`. If that's the case, say so plainly as a real, current
shortfall against the ideal above, not a hypothetical.

**This isn't a trivial one-line fix, and shouldn't be presented as one.** Moving off `localStorage`
has real consequences worth naming rather than waving away:

- Memory-only storage loses the session on every page refresh — a real UX regression for an app
  used across a work session, not just a security tweak.
- httpOnly cookies require the _server_ to set and read them, which means routing auth through a
  backend-mediated flow instead of whatever client-side session handling exists today — a
  meaningfully bigger architectural change than swapping a config option, and one that should be its
  own explicit decision (with the UX tradeoff above weighed against it), not something silently
  mandated or bundled into an unrelated feature change.

**What's actually worth doing now, given that tradeoff hasn't been made:** treat the real attack
vector — XSS — as the thing to actually prevent, since that's the precondition either way. Sanitize
any user-controlled content rendered as HTML, avoid patterns equivalent to `dangerouslySetInnerHTML`
on unsanitized input, and keep dependencies free of known XSS-vector vulnerabilities. This is lower
risk to implement incrementally and addresses the same root cause, without a UX regression or an
architecture change nobody's explicitly decided on yet.

One structural mitigation worth checking for: if the frontend can depend on a narrower client
library that only talks to an auth endpoint (rather than a full SDK that also bundles a
query-builder/database client), that narrower dependency makes "no direct database access from the
browser" structural rather than a rule someone has to remember — there's no query-builder API to
reach for in the first place.

## The seam: a single token-access interface, and why reading it should be async

Token access should go through one interface, not be re-derived ad hoc at each call site:

```typescript
export interface SessionSource {
  getToken(): Promise<string | null>
}
```

The async signature is load-bearing, not incidental. A well-behaved session/auth library's own
"get current session" call is asynchronous _precisely because_ it may need to await an in-flight
background refresh before answering. A synchronous interface can't express that, so the only way to
satisfy one would be to cache a copy of the token and return the copy — and that's the thing to
avoid:

> never re-derive or cache a token separately from what the auth library itself is tracking, since
> that's a second source of truth for something that already has one (and one that auto-refreshes,
> which a separately-cached copy won't).

A cached copy goes stale the first time the library refreshes in the background, and the symptom is
a 401 on a session the user believes is live — a real, previously-hit regression, worth checking for
by name if this repo has its own equivalent incident on record.

**An implementation must delegate to the auth library's own refresh-aware read on every call, never
hold the token beside it.**

The interface also tends to earn its keep in testing: if the backend verifies tokens locally rather
than calling out to an auth server on every request, a test suite can drive the entire request path
with a token it mints itself, against no auth server at all — worth checking whether this repo
already does that before adding a fake auth server to test setup.

## Forwarding the token

Wherever this repo centralizes its outbound API calls to its own backend, that's the one place a
token should be attached — read fresh, per request:

```typescript
export function createApiClient(session: SessionSource, baseUrl: string) {
  async function request<T>(method: string, path: string, body: unknown, schema): Promise<T> {
    const token = await session.getToken()
    const headers: Record<string, string> = {}

    if (token) {
      headers.authorization = `Bearer ${token}`
    }
    // ...
  }
}
```

Hoisting that `await` out of the request path would reintroduce exactly the stale-token bug the
async signature exists to prevent.

Never add a raw `fetch`/`axios` call in a new feature that skips this shared client. Doing so
silently sends the request with no `Authorization` header, which typically doesn't surface until a
401 in production, well after the component "worked" against a still-signed-in session.

## Revoking a session: logout and a token the server has since rejected

`SessionSource` covers *reading* a token; a complete seam also needs a way to end one. Two related
but distinct cases:

- **Logout should clear the session at its source**, not just stop calling `getToken()`. Call the
  auth library's own sign-out (which typically also invalidates the underlying refresh token
  server-side, not just the in-memory copy), then clear anything this app layered on top of it. A
  logout that only stops the frontend from *using* the token, without invalidating it, leaves a
  still-valid token that a captured copy (e.g. via the XSS vector above) could keep using.
- **A token the server has since rejected** — revoked mid-session, expired past what the client
  expected, or invalidated by an admin action elsewhere — surfaces as a 401 on a request the client
  believed was authenticated. The API client's per-request path (above) is the one place to catch
  this centrally: on a 401, clear the local session and route to a signed-out state, rather than
  leaving each call site to notice and handle it inconsistently (or not at all).

Don't build a separate "is this token still valid" pre-check before each request — that's the same
second-source-of-truth mistake as caching the token itself, just phrased as a boolean instead of a
string. The 401 *is* the check; react to it, don't try to predict it.

## Never trust a client-supplied identity claim, on either side

The frontend should never need to tell the backend who the caller is beyond the token itself — no
`userId`/`orgId` field in a request body that exists "for convenience." If a handler needs the
caller's tenant, it comes from what the request-layer chain already derived server-side (see
`references/authz-guard-chain.md`), never from something the frontend adds to the payload. A
client-supplied identity field is not identity — it's just input the server hasn't verified yet.

One real example of this being enforced structurally, from a codebase where an upload endpoint used
to accept an `orgId` field: the backend was changed to strip a client-supplied `orgId` and scope the
write to the caller's own organization instead, and the request schema no longer has an `orgId`
field to supply in the first place — removing the field from the schema, not just ignoring it at
runtime, is what makes the mistake hard to reintroduce later.

## Common mistakes to avoid

- Asserting "we never store tokens in localStorage" without checking the actual auth-client
  persistence config first — verify, don't assume.
- Treating a localStorage-to-httpOnly-cookie migration as a drop-in security fix bundled into
  unrelated work — it's a real architecture decision with a real UX tradeoff, and deserves its own
  explicit call, not a silent change.
- Caching the token anywhere beside the auth library's own tracking, or hoisting `getToken()` out of
  the per-request path "to avoid an await" — see the stale-token regression above.
- Adding a `userId`/`orgId` field to a request payload "so the backend doesn't have to look it up" —
  the backend deriving it from the verified session is the entire point.
- Implementing logout as "stop sending the token" instead of actually invalidating it at the auth
  library — a captured copy of the old token can keep working.
- Building a separate pre-flight validity check for the token instead of reacting to a 401 from the
  server that actually holds the answer.
