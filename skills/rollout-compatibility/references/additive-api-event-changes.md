# Additive-Only API and Contract Changes

The same expand-contract discipline that applies to a database schema (see
`references/expand-contract-migrations.md`) applies to an API request/response shape or any other
contract with a consumer that doesn't deploy atomically with the producer -- a mobile app, a
third-party integration, a frontend that caches a bundle, or another service on its own deploy
schedule. The failure mode is different (a broken response instead of a broken query) but the root
cause is the same: a change that only works once every consumer has switched over breaks during the
window before they have.

## What's actually safe to change without a version bump

- **Adding a new optional field** to a response -- safe. Old clients ignore fields they don't know
  about (true for JSON; not automatically true for a binary format enforcing a strict schema --
  check what serialization this repo uses).
- **Adding a new optional request parameter with a default** that preserves old behavior when
  omitted -- safe, as long as omitting it truly reproduces the old behavior exactly.
- **Adding a new endpoint** -- always safe; it has no existing consumers by definition.
- **Loosening a validation rule** (accepting a wider range of previously-rejected input) -- usually
  safe, but check whether any consumer relies on the old rejection as behavior (rare, but happens
  with client-side retry/fallback logic keyed on a specific error).

## What needs versioning or a deprecation window instead

- **Removing a field** a client might still read. Even a field that looks unused from this repo's
  own code can be read by a client this repo doesn't control (a mobile app, a partner integration).
  Mark it deprecated, keep populating it, and only actually remove it once usage data (API gateway
  metrics, a deprecation-header response client applications are expected to check, direct
  confirmation from known consumers) shows it's genuinely unread -- same "confirm, don't assume"
  discipline as dropping a database column.
- **Renaming a field** -- not a rename; add the new field, populate both for the deprecation window,
  remove the old one only once confirmed unread. Never `s/oldName/newName/` in place.
- **Changing a field's type or meaning** without changing its name -- the most dangerous version of
  this mistake, because it's not just unsupported for old clients, it's *silently wrong*: an old
  client still parses the field successfully, just with a value that no longer means what the client
  thinks it means. Always give a changed meaning a new field name or a version bump, never reuse the
  old name for a different meaning.
- **Making a previously-optional field required**, or **removing a previously-required field's
  default** -- breaks any consumer whose requests were built against the looser contract; treat like
  removing a field.
- **Changing an enum's set of valid values in a breaking way** (removing a value a consumer might
  send or expect, changing what a value means) -- same treatment as changing a field's meaning.

## Versioning vs. deprecation-in-place

Two different mechanisms, and a repo may already have a documented convention for which one it uses
-- follow that rather than picking one ad hoc:

- **A version prefix or header** (`/v1/`, `/v2/`, an `Accept-Version` header) -- appropriate for a
  breaking change to a whole resource/endpoint shape. Old and new versions run side by side
  indefinitely, or until the old version is explicitly sunset with its own deprecation window.
- **Field-level deprecation within one version** -- appropriate for a smaller, additive-then-remove
  change that doesn't warrant a whole new version. Mark deprecated (a doc comment, an
  `x-deprecated` OpenAPI annotation, a response header), keep the field populated and correct, remove
  once confirmed unread.

Check for an existing convention (an API gateway's version routing, an OpenAPI spec's own
`deprecated: true` markers, a documented sunset-header policy) before introducing either mechanism
fresh.

## Common mistakes to avoid

- Reusing a field name for a different meaning "since it's basically the same field" -- this is the
  silent-corruption case, worse than an outright break because nothing surfaces the mismatch.
- Shipping a breaking response-shape change and a frontend/consumer update that depends on it in the
  same deploy, when the two don't actually deploy atomically (a cached frontend bundle, a mobile
  client, an independently-deployed consumer service) -- same coupling mistake as the database case.
- Treating "this is just an internal API" as a reason to skip this discipline without checking who
  actually calls it -- an API with exactly one consumer today can still gain a second, independently
  deployed one later; the additive habit costs little and avoids re-litigating this decision later.
- Removing a field the moment its last *known* caller stops using it, without checking whether an
  unknown or undocumented caller still depends on it.
