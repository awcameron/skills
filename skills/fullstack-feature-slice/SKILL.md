---
name: fullstack-feature-slice
description: >-
  Build or extend one feature end to end across a monorepo's layers -- a shared types/contract
  package, a backend handler, and a frontend -- deriving each layer's type from the shared contract
  instead of duplicating it. Use when adding a feature, endpoint, or contract that spans the
  shared-types package and both apps, or when the user says "vertical slice", "feature slice",
  "shared types", or "add a migration" / "add a table/column" as part of a feature. Not for a change
  inside one package.
allowed-tools: [Read, Grep, Glob, Edit, Write, Bash]
---

# Fullstack Feature Slice

Builds one feature across every layer it touches -- most commonly a shared type/contract, a backend
handler, and a frontend slice -- with the contract defined once and consumed everywhere else. Only
applies where more than one of those layers exists; a single-package repo has no slice to build.

**This is almost never a green-field decision.** A repo with a shared-types package and more than
one consuming app has already settled how a feature is laid out, how a type flows into each layer,
and how layers are tested. Find that answer before writing anything; don't import a pattern from
another stack because it's familiar. Every convention below is "match what this repo already does"
-- consistency beats whichever style is better in the abstract, and a second convention for the
same layer is the mistake to avoid.

## Discover this repo's own layers first

Don't assume a stack, package name, or directory layout. Find each of these:

- **The shared contract and its single-source-of-truth mechanism** -- Zod/io-ts with an inferred
  type, a `.proto`/OpenAPI/GraphQL schema with codegen, or a hand-shared `.d.ts`. Every layer
  derives its type from there; a second hand-written declaration of the same shape drifts with no
  compiler error to catch it, even when added "just to unblock". Also check whether it's consumed
  as **built output** (a `dist/` build, a Gradle/Maven module, a generated client) -- if so, a new
  export can be invisible to the typechecker, IDE, or test runner until it's rebuilt, which
  explains a phantom "not found"/"cannot resolve symbol".
- **Backend feature layout** -- vertical slices (one folder per feature holding handler, DTO, and
  test) or layered (global `controllers/`/`services/`/`dto/`, Spring's package-by-layer).
- **Consumer-side layout** -- a `features/<name>/` folder colocating a data-fetching unit and its
  view, or a layered `components/`/`hooks-or-viewmodels/`/`pages/` split. The consumer may be a
  browser SPA, a server-rendered view layer, or a mobile client. Note any **shared API-client
  module** (`api-client.ts`, a generated OpenAPI/Retrofit/Feign client, a typed RPC stub): new code
  goes through it, since calling the network directly silently drops what it adds (auth header,
  base URL, error normalization) and fails far from the call site.
- **The authorization chain**, for user- or org-owned data -- see `zero-trust-architecture`. In
  short: identity and tenant come from what the guard chain verified and attached to the request,
  never a client-supplied param or body field; every query keeps its own explicit scoping filter
  even when a database-level backstop exists.
- **Role/permission checks, separate from tenant scoping.** Passing the tenant guard proves
  membership, not that this caller may use this feature (admin-only, a plan tier). If the feature is
  gated, use this repo's role mechanism (a `@RequireRole`-style decorator, a permissions table, a
  policy class), not a one-off `if (user.role === "admin")`.
- **Logging** -- a shared structured logger, a request-scoped correlation id threaded from
  middleware down to the repository, or only a central error handler. Log through it; no ad hoc
  `console.log`/`print`. If one central place (an exception filter, error middleware) logs failures,
  don't also log the same error at every layer on the way up.
- **Error handling** -- typed `Result<T, E>`/`Either` for expected failures with throws only for
  broken invariants, or typed exceptions mapped by a global handler. Don't introduce a third style.
- **Tests** -- where each side's tests live relative to the code, and any existing cross-tenant or
  cross-user e2e test pattern.
- **Generated files** -- a TanStack-Router-style route tree, OpenAPI-Generator/protoc output,
  JAXB/gRPC stubs. Know what regenerates each; never hand-edit one (CI typically flags it as stale
  even when the edit was right).
- **Independent deploys.** If the contract, backend, and frontend ship on separate schedules (a
  mobile client, a rolling/blue-green deploy, a consumer on its own pipeline), a schema change or a
  change to an existing endpoint/event needs `rollout-compatibility`'s additive-first discipline.
  An atomic single release doesn't.

## Two checks before writing code

1. **Does a similar slice already exist?** Find the closest existing feature and read it all the
   way through -- file layout, naming, how it uses the guard chain and error convention -- then
   match its shape.
2. **Is anything Ask-First?** A new cross-package dependency, a database schema change, or a
   deviation from a documented convention typically needs confirmation -- check the repo's
   `AGENTS.md`/`CONTRIBUTING.md`. Don't write the file an Ask-First item would produce (a
   migration, a schema change), even as a draft: a file on disk reads as decided. Describe it in
   your response, and build everything that doesn't depend on it.

## Workflow for one feature

1. **Shared contract first** -- both sides depend on it. If the package uses barrel exports (or a
   module's public API surface), add the export at every level the existing pattern uses; a missed
   level is how "it compiles but nothing imports it" happens.
2. **Rebuild/regenerate the shared package** if it's consumed as built output. A dev server's
   restart hook or an IDE's incremental compiler can make it look fixed while `typecheck`, a clean
   `gradlew build`, or the test runner still sees the stale build.
3. **Backend** -- follow the discovered layout; wire the route through the repo's guards/
   middleware/interceptors (plus the role check if gated); register the module/route/bean if the
   framework needs it. An unregistered route is often a silent 404 -- confirm it's mounted in the
   startup log or route list (for Spring, the request-mapping log line).
4. **Consumer side** -- follow its discovered layout, go through the shared API client, and
   regenerate any generated router/client.
5. **Tests on both sides**, colocated per the repo's convention. If the feature touches
   authorization or cross-tenant data, add a real cross-tenant/cross-user test -- a unit test
   against a faked repository or mocked client can't prove isolation holds.
6. **Report the layers touched**: name the shared contract, the handler path, and the
   consumer-side path, since several packages moving together is easy to lose track of.
