# Database-Layer Tenant Isolation: The Backstop

A database-layer isolation mechanism — Postgres/MySQL row-level security (RLS), an ORM-level
tenant-scoping helper, a separate-schema-or-database-per-tenant pattern — is deliberately the layer
that should still hold if the guard/middleware layer above it fails. Don't treat request-layer and
handler-level checks (see `references/authz-guard-chain.md`) as sufficient on their own if this repo
has a database-layer mechanism available; it's what turns a bug in either of those into a non-event
instead of a data leak. If this repo has no such mechanism yet, that's worth surfacing explicitly
rather than assuming one exists.

## Use the sanctioned path, not a raw/unscoped connection

Whatever the mechanism, it usually isn't automatic — a raw ORM/driver connection typically carries no
caller identity, so nothing about a query says who is asking unless something explicitly puts it
there. There is normally one sanctioned place this happens (a context-setting helper, a scoped query
builder, a repository base class); find it and use it rather than reaching for the underlying
client directly. On the JVM this is the same pattern under different names: Hibernate/JPA's
schema-per-tenant or discriminator-column multi-tenancy support with a `CurrentTenantIdentifierResolver`,
a Slick/Doobie/jOOQ query helper that injects a tenant filter, or a plain repository layer that
never exposes its raw `DataSource`/`Connection` to callers.

The property to watch for, regardless of mechanism, is that **bypassing the isolation layer usually
fails open, not loudly.** A query run outside the isolation boundary (e.g. as a superuser/table-owner
role under Postgres RLS, or through a raw connection that skips a tenant-scoping wrapper) does not
typically error — it returns everything, silently. That makes it worth treating as a Never-tier
mistake in a repo's own conventions, not just a style preference.

**One real example**, from a Supabase/Postgres RLS codebase, of how this fails in a way that's easy
to reproduce elsewhere: RLS policies read the caller's identity out of a session-local config value
that must be set to a *decoded claims payload*, not the raw signed token. Passing the raw token
instead makes the policy's own JSON cast throw, and every query against an RLS-enabled table starts
returning a 500 — including, in that case, the membership lookup the very first request-layer check
depends on. The bug is generic even though the specific fix was Postgres-specific: whatever shape of
context value your isolation mechanism expects, passing the wrong shape either breaks loudly (as
here) or, worse, silently no-ops the isolation instead.

## Still write the explicit scoping filter, even with the backstop enabled

Having a database-layer backstop enabled is not a reason to drop an explicit
`.where(tenantId = ...)`-equivalent filter from a query. Defense in depth is the design, and the two
layers fail differently:

- A missing request-layer check is a loud, visible failure (401/403).
- A missing explicit filter under a *working* backstop is just fewer rows than expected — easy to
  miss in casual testing.
- A missing explicit filter with the backstop somehow disabled or misconfigured is another tenant's
  data, in full.

Keeping both means a mistake in either one degrades rather than leaks. **The uncomfortable practical
consequence:** omitting the filter may not fail visibly in local testing at all — a real
cross-tenant test that actually asserts on data from two different tenants is what catches it, not
manual testing against a single tenant's data.

## Any escape-hatch client that bypasses isolation needs a named, scoped reason

Some setups include one deliberately privileged client that bypasses the isolation layer entirely
(a service-role key, an admin connection, a superuser-mode ORM client) for a narrow, legitimate
purpose — commonly something like provisioning a new account before that account's own identity
exists to authenticate with. That's a reasonable pattern *scoped tightly to that one case*. Using it
for anything else reopens exactly the hole the isolation layer exists to close. If this repo has such
a client, check what it's actually scoped to before reusing it for a new feature.

## Every new tenant-scoped resource needs its own isolation policy, no exceptions

If this repo has a database-layer isolation mechanism, a new tenant-scoped table or resource needs
its own policy/scoping as a matter of course when it's added — not an opt-in follow-up "for later."
Check whether this repo has an existing decision record (an ADR or equivalent) establishing this as a
requirement; if so, treat it as binding precedent rather than re-deciding it per feature.

## Common mistakes to avoid

- Querying through a raw/unscoped connection instead of this repo's sanctioned isolation-aware path
  — silently runs with no tenant boundary.
- Passing the wrong shape of identity/context value into the isolation mechanism's context-setting
  step (see the claims-payload example above) — check what shape it actually expects.
- Dropping the explicit tenant-scoping filter because the backstop is enabled — see above; it may
  not fail visibly.
- Reaching for a privileged/escape-hatch client outside its one narrow, documented case.
- Writing a second, parallel isolation-context helper under a different name instead of using the
  one this repo already has.
