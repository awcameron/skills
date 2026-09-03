---
name: rollout-compatibility
description: >-
  Backward/forward-compatible change discipline for a repo whose pieces deploy independently or
  roll out gradually -- a database migration, an API/event schema change, or a change spanning a
  shared contract and its consumers, where old and new versions of something coexist even
  momentarily. Use when creating or modifying a database column/table, an API request/response
  shape, an event/message schema (Kafka, SQS, webhooks), or any change to an existing contract
  between services or between a backend and frontend that don't deploy atomically together. Also
  reach for this when the request is a migration ("add a column", "rename a field", "add a
  migration"), a rolling/blue-green/canary deploy is mentioned, or an existing endpoint/event is
  being changed rather than a new one added. Not needed for a genuinely new, unreleased contract
  with no existing consumers, or a repo that ships everything in one atomic release with no
  rolling window.
allowed-tools: [Read, Grep, Glob, Edit, Write]
---

# Rollout Compatibility

A change to a shared contract -- a database schema, an API shape, an event/message schema -- is not
safe just because it works against the new code. If the pieces that read and write that contract
don't deploy in perfect lockstep, there is a window (a rolling deploy's overlap, a blue-green
cutover, a mobile client that doesn't force-update, a consumer service that deploys on its own
schedule) where the old shape and the new shape both exist in production at the same time. A change
that only makes sense once every reader and writer has switched over will break during exactly that
window, even though it passed every test written against "new talks to new."

**This doesn't apply to every repo.** A repo that ships its backend, frontend, and schema together
in one atomic release/deploy, with no rolling window and no independent consumer, has no
old-meets-new moment to protect against -- say so plainly and move on rather than forcing
expand-contract ceremony onto a change that doesn't need it.

## Discover this repo's own deployment model first

Before applying anything below, find out whether this repo actually has a compatibility window to
protect, and how it currently handles one:

- **Does this repo deploy its pieces independently, or in lockstep?** A monorepo with one deploy
  pipeline that ships the contract, backend, and frontend together atomically has no window. Separate
  deploy pipelines per service/app (check `.github/workflows/`, `Dockerfile`s per app, separate CI
  jobs), a backend that deploys more often than a mobile client can force-update, or multiple
  services owned by different teams consuming the same event stream -- any of these means old and
  new coexist, even if only for the length of one deploy.
- **What's the actual rollout mechanism?** Rolling deploy (old and new pods/instances serve traffic
  side by side for the deploy's duration), blue-green (a cutover, but a client mid-request or a
  cached response can still straddle it), canary (a subset of traffic hits new code while most still
  hits old, deliberately, often for longer than a rolling deploy's overlap). Check deploy config
  (Kubernetes `Deployment`/`RolloutStrategy`, ECS service config, a Helm chart's `strategy` block,
  CI/CD pipeline YAML) rather than assuming -- the actual strategy determines how long "old and new
  both live" actually lasts, which matters for how conservative to be.
- **Does this repo already have a versioning/deprecation convention?** An API version prefix
  (`/v1/`, `/v2/`), a `Deprecated`/`@deprecated` marker convention, an event schema registry with its
  own compatibility mode (see `references/event-schema-evolution.md`), a documented "field removal"
  process. If one exists, follow it rather than inventing a parallel one for this change.
- **Who are the actual consumers of what's being changed?** A database column read by one service
  under active development is a very different compatibility risk than an event schema consumed by
  three independently-deployed services, or an API response shape consumed by a mobile app whose
  users can't be forced to update. Find the real consumer list (grep for the field/endpoint/topic
  name across the repo or its sibling services, check an API gateway's registered consumers, a
  schema registry's subject list) before deciding how conservative the change needs to be -- a
  single, fully-controlled consumer that deploys atomically with the producer may not need the full
  expand-contract treatment either.

## Core principles

- **Additive before subtractive, always in that order.** Add the new shape, deploy it, let it
  coexist and get adopted, and only remove the old shape in a later, separate deploy once nothing
  reads it anymore. Combining "add the new thing" and "remove the old thing" into one deploy is what
  reopens the old-meets-new gap this discipline exists to close.
- **Both directions of compatibility matter, not just one.** *Backward*-compatible means new code
  can still read data/messages written by old code. *Forward*-compatible means old code, still
  running during the rollout, doesn't choke on a new field or shape it doesn't recognize. A rolling
  deploy needs both simultaneously, because for its duration both old and new code are live.
- **Never repurpose a field or a meaning in place.** Changing what an existing field means (not just
  its name) while old code still reads the old meaning is silent corruption, not a breaking error --
  often worse than a hard failure because nothing flags it. Add a new field/version instead.
- **The removal step needs its own confirmation that nothing reads the old shape anymore** --
  usage/metrics on the old field, a consumer-list check, or a deliberately delayed deploy window --
  not just an assumption that "everyone should be on the new version by now."

See the reference doc for each concrete mechanism -- read the one(s) relevant to what's actually
changing:

- **`references/expand-contract-migrations.md`** -- database schema changes: add-backfill-cut over
  a three-step sequence, why an application-level dual-write/dual-read window is often needed, and
  when a column/table can safely be dropped.
- **`references/additive-api-event-changes.md`** -- API request/response and general contract
  changes: additive fields, versioning vs. deprecation, and why removing or repurposing a field in
  place breaks old clients silently.
- **`references/rolling-deploy-n-n1.md`** -- what N/N-1 compatibility actually requires during a
  rolling or canary deploy, and the concrete pattern (feature flags, dual-write) for a change that
  can't be made additive on its own.
- **`references/event-schema-evolution.md`** -- event/message schema changes for a broker-based
  system (Kafka, SQS, webhooks): schema registry compatibility modes, consumer-group rollout order,
  and why an event schema is harder to roll back than an API.
- **`references/contract-testing.md`** -- consumer-driven contract tests as the way to actually
  verify old-meets-new compatibility instead of assuming it, and how to add one where this repo
  doesn't yet have the pattern.

## Common mistakes to avoid

- Adding and removing in the same deploy -- e.g. renaming a column via `DROP`+`ADD` in one
  migration, or replacing a field in an API response instead of adding the new one alongside the
  old. This is the single most common way this discipline gets skipped, usually because the change
  "looks like one rename" rather than two separate steps.
- Assuming a consumer has already switched over without checking. "Nothing should still be reading
  the old field" is a guess, not a fact, until it's checked against real usage/metrics or an
  explicit consumer inventory.
- Treating an event/message schema like an API endpoint that can just be redeployed to fix a mistake
  -- once a bad event ships to a broker, every consumer that already read it has processed the old
  shape; a schema mistake in an event stream is much harder to walk back than a bad API response
  (see `references/event-schema-evolution.md`).
- Skipping this for "an internal change nobody else calls" without actually checking -- a field or
  event consumed only by code in this same repo today can still have an external or
  independently-deployed consumer added later that assumes additive-only discipline was followed
  from the start; check, don't assume from the name of the thing being changed.
- Writing a migration that assumes the deploy that adds a column and the deploy that starts writing
  to it happen at the same moment. During a rolling deploy, old application code is still running
  against the new schema for the deploy's duration -- the migration and the code that depends on it
  are not the same event.

Each reference file below has its own "Common mistakes" section scoped to that mechanism -- read the
relevant one rather than expecting every mistake to be repeated here.
