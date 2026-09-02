# Request-Layer Authorization Chain & Object-Level (BOLA) Checks

## The chain: order is load-bearing

Whatever your framework calls this layer — Express/Koa middleware, Django permission classes and
decorators, Rails `before_action` filters, NestJS guards, Spring Security filter chains/method
interceptors (Java/Kotlin), Play Framework `ActionBuilder`/`ActionFilter` composition, Pekko HTTP
or http4s authentication/authorization directives (Scala), a hand-rolled decorator/interceptor
stack — the same structural shape recurs: a small ordered sequence of checks, each one reading a
property an earlier check attached to the request, and rejecting before the handler ever runs if
something's missing.

The order matters precisely because later checks depend on earlier ones' output:

1. **Verify identity.** Validate whatever credential the request carries (a bearer token, a session
   cookie, an API key) and attach the verified identity to the request. Reject (401) if missing or
   invalid. This step should not need to call out to another service on every request if the
   credential can be verified locally (e.g. a signed JWT verified against a known key) — that's
   both faster and one fewer thing that can be down.
2. **Resolve tenant/org membership.** Look up the caller's own membership/role for whatever unit of
   multi-tenancy this app has (an org, a workspace, an account) and attach it. Reject (403) if there
   is none. This is usually a lookup derived from the caller's own identity, not from a route
   parameter — many routes don't carry a tenant id in the URL at all.
3. **Match route tenant to resolved tenant**, only for routes that *do* carry a tenant id in the
   path. Assert the route's tenant equals the caller's own resolved membership; reject otherwise.
   Worth keeping as its own explicit step rather than folding into the previous one: a check whose
   behavior depends on which route it happens to be mounted under is exactly the implicit coupling
   an authorization boundary shouldn't have.
4. **Check role/permission**, reading whatever the membership-resolution step attached — never a raw
   token claim, and never a database column read fresh in this step. Run this last, since it depends
   on what the membership step already resolved.

**One real example of this shape**, from a NestJS/Supabase codebase, to make it concrete rather than
abstract: `SupabaseAuthGuard` (verifies the bearer JWT locally, attaches `request.user`/`request.jwt`)
→ `CallerMembershipGuard` (DB lookup, attaches `request.membership`) → `OrgIdMatchGuard` (only on
routes carrying `:orgId`, compares it against the resolved membership) → `RolesGuard` (reads
`@Roles(...)` metadata against `request.membership.role`). That specific split into four guards is
one way to do it, not the only correct shape — the load-bearing property is the *ordering
dependency*, not the exact number of steps.

The same shape shows up just as concretely on the JVM: a Spring Security filter chain that
authenticates a bearer token and populates the `SecurityContext`, followed by a
`@PreAuthorize`/method-security check that reads the resolved `Authentication`/`GrantedAuthority`
set — never a claim re-read from the raw JWT inside the method body. Kotlin code on the same stack
follows the identical ordering. A Scala service built on Play or http4s expresses it as composed
`ActionFilter`s or authentication middleware/directives instead of annotations, but the dependency
is the same: a later filter/directive reads a request attribute (or a typed context value) an
earlier one attached, and the composition order is what makes that safe to assume.

**The BOLA-relevant property to notice, regardless of framework:** none of these checks should trust
anything the client sent except the credential itself. A tenant-match check doesn't say "the client
named this org, allow it" — it compares the requested tenant against a membership record a previous
step already looked up. That lookup is the actual authorization decision; everything downstream just
reads its result. A handler should receive tenant id and identity from what the chain attached to the
request, never from a route param, body, or query string re-read independently.

## Object-level (BOLA) checks belong in the handler too, not just the chain

The chain above proves the caller belongs to *some* tenant, and (if a route carries one) that the
route's tenant is that same tenant. Neither proves that a specific resource the route operates on (a
specific document, room, order, key — whatever the domain object is) actually belongs to that
tenant. That's a second, explicit check, usually because the chain runs before the handler has even
loaded which specific resource is being touched.

After loading the target resource, verify it belongs to the tenant already established on the
request before acting on it, and fail the same way any other expected error is handled in this
codebase — not as a special case. The shape below is TypeScript, but it's the same check whether it
returns a `Result`/`Either` type, a Kotlin `sealed class` outcome, or a Scala `Either`/`ZIO` error
channel:

```typescript
async function deleteRoomKey(request: DeleteRoomKeyRequest, membership: { orgId: string }) {
  const room = await repository.findById(request.roomId)
  if (!room) {
    return err({ type: 'NOT_FOUND', entity: 'room', id: request.roomId })
  }
  if (room.orgId !== membership.orgId) {
    // The caller has a valid membership somewhere -- just not for the tenant
    // this specific room belongs to. This is the BOLA check a route-level
    // guard alone can't make, since it doesn't know which room until now.
    return err({ type: 'FORBIDDEN', reason: "Room does not belong to caller's organization" })
  }
  // ...
}
```

Skipping this and trusting "the chain already checked" is exactly the IDOR/BOLA gap this pattern
exists to close — a check verifying *general* tenant membership says nothing about *this specific*
resource unless something explicitly checks it.

## Common mistakes to avoid

- Reading a tenant/user id out of the request body or query string anywhere in authorization logic —
  a client can set these to anything; only what the chain itself resolved and attached counts as
  verified identity.
- Skipping the resource-ownership check in a handler because "the chain already ran" — the chain
  checks tenant membership in general, not that this specific resource belongs to that tenant.
- Reading a role from a raw token claim instead of what the membership-resolution step resolved and
  attached — if role changes need to take effect immediately (rather than waiting for a token to
  refresh), a token claim can't do that; a fresh lookup can.
