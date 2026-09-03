---
name: fullstack-feature-slice
description: >-
  Build or extend one feature end-to-end across a monorepo's layers -- typically a shared
  type/contract package plus a backend handler and a frontend slice -- keeping the type discovered
  once and re-derived everywhere else, not hand-duplicated per layer. Use whenever the user asks to
  add a feature, endpoint, route, or contract spanning a shared-types package and both a backend and
  frontend app, or mentions "vertical slice", "feature slice", or "shared types" in a multi-package
  repo. Also covers a database schema or migration added as part of a feature -- "add a migration",
  "add a table/column" -- even when the request doesn't name a feature. A schema change, a new
  cross-package dependency, or a new architectural pattern is often Ask-First -- confirm before
  generating one. Not for a change confined to a single package or layer; that's a normal edit.
allowed-tools: [Read, Grep, Glob, Edit, Write, Bash]
---

# Fullstack Feature Slice

Builds one feature across every layer it touches -- most commonly a shared type/contract, a backend
handler, and a frontend slice -- keeping the contract defined once and consumed everywhere else,
never hand-duplicated per layer. This only applies to a monorepo (or polyrepo-with-a-shared-package)
where more than one of those layers actually exists; a single-package repo has no slice to build.

**This is almost never a green-field decision.** A repo with a shared-types package and more than
one consuming app has already settled its own answer for how a feature is laid out, how a type
flows from the contract into each layer, and how the layers are tested. Find that answer before
writing anything -- don't import a pattern from a different stack because it's a familiar shape.

## Discover this repo's own layers first

Before building anything, find this repo's actual version of each piece -- don't assume a stack,
a package name, or a directory layout:

- **Where the shared contract lives, and its single-source-of-truth mechanism.** A dedicated
  `packages/shared-types`-style package is common, but the mechanism matters more than the location:
  Zod/io-ts schema with an inferred type, a `.proto`/OpenAPI/GraphQL schema with codegen, or a
  hand-shared `.d.ts` -- whichever it is, every consumer should derive its type from that one place,
  not redeclare it. Check whether that package is consumed as built output or as source -- a
  Node-style package built to `dist/`, a Gradle/Maven multi-module reactor where a sibling module
  needs a build before it sees a new class, an OpenAPI/protobuf-generated client that needs
  regenerating -- if it's built, a new export/class can be invisible to a typechecker, IDE, or test
  runner until that build step runs, which is worth knowing before chasing a phantom
  "not found"/"cannot resolve symbol" error.
- **The backend's feature-organization convention.** Vertical slices (one folder per
  feature/action, holding its handler, DTO, and test together) versus a layered convention (global
  `controllers/`, `services/`, `dto/` folders, or Spring's package-by-layer default). Match whichever
  this repo already does -- don't introduce the other one for a single new feature.
- **The frontend (or downstream-consumer) feature-organization convention**, similarly -- a
  `features/<name>/` folder colocating a data-fetching unit and its view versus a layered
  `components/`/`hooks-or-viewmodels/`/`pages/` split. "Frontend" here means whatever actually
  consumes the contract on the other end -- a browser SPA, a server-rendered view layer, or a mobile
  client sharing models via Kotlin Multiplatform or generated code. Also check whether there's
  already a single shared API-client module that consumer is expected to go through (a JS
  `api-client.ts`, a generated OpenAPI/Retrofit/Feign client, a typed RPC stub), versus calling the
  network directly per call site.
- **The tenant/security boundary, if this is multi-tenant or multi-user data.** If this repo has
  (or should have) `[[zero-trust-architecture]]`'s layers -- a request-layer guard chain, a
  database-level isolation backstop, explicit ownership checks in the handler -- a new feature
  touching user- or org-owned data needs to plug into whatever already exists there, not invent its
  own scoping check. If this repo doesn't have `zero-trust-architecture`'s skill file, apply its
  principles directly: never derive identity/tenant from a client-supplied field.
- **Role/permission checks, separate from tenant scoping.** Belonging to a tenant/org and being
  allowed to use *this* feature within it are two different facts -- a guard chain proving org
  membership says nothing about whether this caller specifically is an admin, has a paid plan, or
  holds whatever role the feature actually requires. Does this repo have a role/permission
  mechanism (a `@RequireRole`-style decorator, a permissions table, a policy/ability class)? If the
  feature is gated to a subset of members, that check has to come from there, not be invented as a
  one-off `if (user.role === "admin")` in the new handler.
- **The observability/logging convention.** How does this repo log a request as it moves through a
  handler -- a shared structured logger, a request-scoped correlation id threaded from an
  interceptor/middleware down into the repository layer, or nothing beyond what a central error
  handler already logs on failure? A new handler should log through whatever's already there
  (including threading the same request-scoped context) rather than reaching for its own
  `console.log`/`print`/ad hoc logging shape.
- **The error-handling convention.** Does this backend return a typed `Result<T, E>`/`Either` for
  expected failures and throw only for broken invariants, or does it throw a typed exception for
  every failure path and rely on a global handler to map it to a response? A new handler should
  match whichever convention the codebase already committed to, not introduce a third style.
- **The test colocation and cross-layer-authorization test convention.** Where do backend and
  frontend tests for a feature live relative to its code, and is there an existing pattern for a
  cross-tenant/cross-user e2e test that a unit test with a faked repository can't prove?
- **Anything generated.** A frontend router, an API client, or a set of DTO/model classes is
  sometimes generated from route files or the shared schema -- a TanStack-Router-style route tree,
  an OpenAPI-Generator or protoc output, a JAXB/gRPC stub. Know what regenerates it (usually running
  the dev server or a specific build/codegen script) before treating a stale generated file as
  something to hand-edit.

## Two things to check before writing code

1. **Does a similar slice already exist?** Find the closest existing feature in this repo and match
   its shape -- file layout, naming, how it composes with the guard chain and the error-handling
   convention -- rather than introducing a second convention for the same layer. Read one all the
   way through before writing the new one.
2. **Is this Ask-First?** A new cross-package dependency, a database schema change, or a deviation
   from a documented convention typically needs confirmation before proceeding -- check this repo's
   own contributor doc (`AGENTS.md`/`CONTRIBUTING.md`-style) for what it calls out explicitly. When
   something in the feature depends on an Ask-First item, don't write the file that item would
   produce (a migration, a schema change) even in draft form -- describe what it would be and why
   it needs confirmation, and build everything else that doesn't depend on it. A file on disk reads
   as decided even with a comment saying otherwise; a description in your response can't be mistaken
   for something already applied.

## Core principles

- **Single source of truth for types, discovered per repo.** Whatever the shared-contract mechanism
  turned out to be above, every request/response shape starts there, with each layer's type derived
  from it -- never a second, hand-written declaration of the same shape in the backend or frontend.
  Two packages hand-syncing the same shape *will* drift with no compiler error to catch it.
- **Vertical, not layered -- if that's this repo's convention.** Where the discovery step above
  found a per-feature folder pattern, a new feature's DTO/handler/test (or data-fetching-unit/
  view/test) live together in one folder, not spread across a global
  `dto/`/`queries/`/`hooks-or-viewmodels/` folder. If this repo's actual convention is layered
  instead, match that -- the point is consistency with what's already there, not a preference for
  vertical slices in the abstract.
- **The security invariants are correctness, not style.** Identity and tenant/org scope come from
  whatever the guard chain already verified and attached to the request, never from a client-supplied
  param or body field. If there's a database-level isolation backstop, every new query still keeps
  its own explicit scoping predicate -- both failing open (silently returning more than intended) is
  a correctness bug, not a nit. See `[[zero-trust-architecture]]`.
- **Tenant scope and role/permission are two different checks.** Passing the tenant/org guard
  proves the caller belongs to the org; it doesn't prove this specific feature is open to them
  within it. If the feature is role- or plan-gated, that's a separate, explicit check through
  whatever role/permission mechanism this repo already has -- not folded into, or assumed to be
  covered by, the tenant check.
- **Match the discovered error-handling convention**, not a personal default. Consistency across
  handlers matters more here than which style is "better" in the abstract.
- **Log through the discovered convention, not a new shape.** A new handler doesn't invent its own
  logging approach; it uses whatever structured logger, log level convention, and request-scoped
  context this repo's observability layer already provides.

## Workflow for one feature

1. **Define or extend the shared contract first** (in whatever package/mechanism discovery found).
   Both the backend handler and the consuming side depend on it, so it has to exist before either
   does. If this repo's shared package uses barrel exports (or a Java/Kotlin module's public API
   surface), add the new export at every level the existing pattern uses -- a level that isn't
   updated is a common way for "it compiles but nothing imports it" to happen silently.
2. **Rebuild/regenerate the shared package if it's consumed as built output.** Skipping this is a
   classic false negative: a dev server's own restart hook, or an IDE's incremental compiler, may
   rebuild it automatically, making the problem look fixed in one context while `typecheck`/a clean
   `gradlew build`/the test runner still sees the stale build.
3. **Backend**: add the feature following the layout discovered above, wire it into the routing
   layer with whatever guards/middleware/interceptors this repo's authorization chain uses (plus a
   role/permission check if the feature is gated beyond tenant membership), and register the
   module/route/bean if this framework requires an explicit registration step. Log through this
   repo's existing observability convention rather than adding a one-off logging shape. An
   unregistered route is often a silent 404, not an error -- check the startup log or route list
   (or, for Spring, the request-mapping log line) for confirmation it's actually mounted.
4. **Frontend (or downstream consumer)**: add the feature following its discovered layout, going
   through the shared API client if one exists rather than calling the network directly. Regenerate
   any generated router/client file if this repo has one.
5. **Test both sides, colocated per this repo's convention.** If the feature touches authorization
   or cross-tenant data access, add or extend a real cross-tenant/cross-user test -- a unit test
   against a faked repository or mocked client can't prove isolation actually holds.
6. **Report which layers you touched and which shared contract they depend on.** Multiple packages
   moving together is easy to lose track of; naming the contract, the handler path, and the
   consumer-side path in the summary is worth more here than in a single-package change.

## Common mistakes to avoid

- **Duplicating a shape by hand** on either side "just to unblock" instead of importing the shared
  contract's derived type. This is the exact drift the shared package exists to prevent.
- **Calling the network directly** from consumer-side code when this repo already has a shared
  API-client module -- bypassing it commonly means it silently drops something the shared client
  adds (an auth header, a base URL, error normalization), which fails much later and less obviously
  than at the call site.
- **Dropping an explicit tenant/ownership filter** because a database-level backstop is enabled
  anyway. Defense in depth means the explicit filter stays even when a backstop exists.
- **Taking a tenant/user id from the request body or query string** instead of from what the guard
  chain already verified and attached -- a caller who can name their own id can name someone else's.
- **Checking tenant membership but not role/permission** for a feature that's actually gated
  further within the org (admin-only, a specific plan tier). Passing the tenant guard proves
  membership, not that this particular action is authorized for this particular caller.
- **Adding a bespoke logging statement** for the new handler -- an ad hoc `console.log`/`print`
  sitting next to everywhere else that goes through a shared structured logger is exactly the kind
  of drift a later cleanup has to go hunt down.
- **Hand-editing a generated file** (a generated router, a generated client, a generated schema)
  instead of regenerating it from its source -- it's typically checked against its generator in CI
  and will be flagged as stale even if the hand-edit was correct.
- **Introducing a second convention for the same layer** (a layered `dto/` folder next to an
  existing vertical-slice pattern, or vice versa) because it matched what the last repo did, instead
  of matching what *this* repo already does.
- **Logging a caught error at every layer it passes through** when this repo already has one central
  place (an exception filter, an error-boundary middleware) that logs it once. Return the typed
  failure; don't also log the same error redundantly on the way up.
