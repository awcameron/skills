---
name: zero-trust-architecture
description: >-
  Enforces Zero Trust security principles -- never trust a caller based on where it came from or
  what layer already ran, always verify identity and object-level ownership explicitly -- across a
  request-layer authorization chain, service-to-service calls, background-job/queue consumers, a
  database-layer tenant-isolation backstop, and client-side session-token handling. Use this skill
  when creating or modifying an auth guard or middleware, a handler touching a specific user- or
  org/tenant-owned resource, an internal service call, a background job processing tenant data,
  tenant-isolation policies, or anything that stores, forwards, or revokes a session token -- even
  if the request doesn't say "security" explicitly, e.g. "add an endpoint to delete a room" or "why
  does this user see another org's data" should both trigger it. Also reach for this when auditing
  existing code for authorization gaps (BOLA/IDOR-style: does this handler trust a client-supplied
  id instead of the identity a guard already verified?).
allowed-tools: [Read, Grep, Glob, Edit, Write]
---

# Zero Trust Architecture

Zero Trust, applied concretely: a request having reached a handler confers no trust by itself.
Every layer — the request-layer guard/middleware, the handler, and the database — independently
verifies who the caller is and what they're allowed to touch, rather than assuming an earlier layer
already checked. This is _defense in depth_: each layer should still hold if the layer above it has
a bug.

**This is almost never a green-field proposal.** Most repos with any multi-tenant or multi-user data
already have *some* version of this — an auth middleware stack, a permissions framework, row-level
security or an equivalent tenant-scoping convention. Find what this repo already does before adding
anything, and keep new code consistent with that pattern rather than introducing a competing one.

## Discover this repo's own layers first

Before applying anything below, find this repo's actual version of each layer — don't assume a
stack and don't guess at file locations:

- **Request-layer identity/authz chain.** Whatever the framework calls it — Express/Koa middleware,
  Django permission classes and decorators, Rails `before_action` filters, NestJS guards, Spring
  Security filters/interceptors (Java/Kotlin), Play Framework/Pekko HTTP/http4s/ZIO HTTP
  authentication directives (Scala), a hand-rolled decorator/interceptor stack. Where does a
  verified identity get attached to the request, and where does role/membership get checked?
- **Database-layer tenant-isolation mechanism, if one exists.** Postgres/MySQL row-level security,
  an ORM-level tenant-scoping helper, a separate-schema- or separate-database-per-tenant pattern, or
  just a convention of an explicit `WHERE tenant_id = ...` on every query. Some repos have nothing
  here yet — that's worth noting, not silently working around.
- **Client-side token seam, if there's a frontend.** Where is a session/auth token read, stored, and
  attached to outgoing requests? Is there already one shared place that does this, or is it done
  ad hoc per call site?
- **Service-to-service trust boundary, if this app calls or is called by other services.** How does
  a downstream service verify who's calling it — mTLS, a signed/short-lived service token, a shared
  secret, or nothing at all because it's assumed to be "internal"? "Inside the network" is not a
  substitute for verification here any more than it is at the request layer.
- **Non-HTTP entry points.** Background jobs, queue consumers, and scheduled tasks touch the same
  tenant-scoped data without going through the request-layer chain at all — check how (or whether)
  they re-derive and verify tenant/caller identity before this skill's principles get applied there.

## Core principles

- **Never trust, always verify.** A request passing through an auth guard/middleware proves the
  caller has _a_ valid session or identity — nothing more. It doesn't prove they own the specific
  resource a route's `:id` points at. That's a separate, explicit check, at both the guard layer
  (does this user have _any_ relationship to this tenant/org?) and often again at the handler layer
  (does this specific resource belong to that tenant/org?).
- **Least privilege, denied by default.** A handler should have to prove access is allowed, not
  assume it unless something objects. Concretely: derive identity/role from what a guard or
  middleware already verified and attached to the request, never from a client-supplied field in the
  request body or query string — a client can put anything there.
- **Defense in depth, not one gate.** Independent layers, each of which would still catch a problem
  if the layer above it had a bug: the request-layer guard, explicit ownership checks in the handler
  for object-level (BOLA/IDOR-style) access, and a database-layer backstop if one exists. Passing the
  guard doesn't excuse skipping the other checks.

See the reference doc for each layer — read the one(s) relevant to what you're touching:

- **`references/authz-guard-chain.md`** — an ordered request-layer authorization chain, why the
  order is load-bearing, object-level (BOLA) checks inside handlers, applying the same chain to
  non-HTTP entry points (background jobs/queue consumers), and treating a public route as a
  deliberate exception rather than a gap.
- **`references/tenant-isolation-backstop.md`** — a database-layer isolation mechanism as the
  backstop that still holds if the layers above it fail, and why an explicit scoping filter stays
  even when that backstop is enabled.
- **`references/client-token-handling.md`** — how a frontend should hold and forward a session
  token: a single seam behind an interface, why reading it should be async-aware, revoking a session
  on logout or detecting a revoked token, and an honest look at the localStorage-vs-httpOnly-cookie
  tradeoff rather than a one-line "just fix it."
- **`references/service-to-service-trust.md`** — why "inside the network" confers no trust between
  services either, and how a downstream service should verify a caller (mTLS, signed/short-lived
  service tokens) rather than assume the request is legitimate because it arrived internally.

## Common mistakes to avoid

- Deriving a caller's tenant/org/role from a request body field, a query param, or a token claim
  read directly in a handler, instead of from whatever the request-layer chain already verified and
  attached. If a client can set it, it isn't identity — it's input.
- Treating "the guard/middleware passed" as proof a specific resource is accessible. A guard usually
  proves membership in general; a handler operating on one specific resource still needs to confirm
  that resource belongs to the tenant/org the guard already established — skipping this is exactly
  the BOLA/IDOR gap this skill exists to close.
- Adding a new tenant-scoped table or resource without its own isolation policy "for now, add it
  later" — if this repo has a tenant-isolation mechanism, every new tenant-scoped table needs it as
  a matter of course, not an opt-in follow-up.
- Reinventing a tenant-isolation or auth-chain helper under a different name instead of using the
  one this repo already has — two helpers doing the same job under different names is its own source
  of drift.

Each reference file below has its own "Common mistakes" section scoped to that layer (background
jobs, service-to-service calls, token revocation, etc.) — read the relevant one rather than expecting
every mistake to be repeated here.
