# Expand-Contract Database Migrations

A schema change that both adds and removes in one migration assumes every piece of code touching
that table redeploys at the exact same instant the migration runs. That's never actually true --
migrations typically run before the new application code deploys (so old code briefly sees the new
schema) and a rolling deploy means old and new application code both run against whatever schema is
live at that moment. **Expand-contract** splits a schema change into separate steps, each safe on
its own, so there's never a moment where the schema and the currently-running code disagree about
what exists.

## The three (or four) steps, as separate deploys

1. **Expand.** Add the new column/table additively -- nullable, or with a default, never a required
   field with no default on an existing table. Old code ignores it; nothing breaks.
2. **Backfill.** Populate the new column for existing rows, and (this is the step that's easy to
   skip) make sure *new* rows get it too during the window before application code writes to it
   directly -- either a database default/trigger, or a dual-write step in the application layer (see
   below).
3. **Migrate reads/writes.** Deploy the application code that actually reads and writes the new
   column instead of, or in addition to, the old one. This is a separate deploy from step 1, not the
   same one -- the schema change and the code change that depends on it should not ship together, or
   a rolling deploy's old-code replicas fail against a schema they don't expect (rename/drop cases)
   or a mismatch goes unnoticed (additive cases, less risky, but still worth keeping separate for the
   rollback story below).
4. **Contract.** Only once nothing reads the old column/table anymore -- confirmed, not assumed, see
   below -- drop it in its own later migration.

Renaming a column is not one migration; it's expand (add the new name), backfill/dual-write, migrate
readers to the new name, then contract (drop the old name) -- four of the steps above, not a single
`RENAME COLUMN` in a codebase with more than one deploying consumer of that table.

## The application-level dual-write/dual-read window

Between "expand" and "contract," if both the old and new column need to stay correct for reads
(because not every reader has migrated yet), the application code writing to that table needs to
write to *both* columns for the duration -- a dual-write. This is the part that's easy to underscope:
it's not just the migration that needs a transition period, the application logic writing to the
table does too. Skipping the dual-write and relying on a one-time backfill alone means every row
written *after* the backfill and *before* every reader has switched over is missing data in
whichever column its writer didn't know about yet.

## Confirming a column/table is actually safe to drop

"We think everything's migrated" is not the same as verified. Before the contract step:

- Check real usage -- database query logs, an ORM-level deprecation warning, application metrics on
  reads/writes to the old column, or a feature flag that's been fully rolled out and can be checked.
- If multiple independently-deployed services read the table, confirm each one has actually shipped
  the code that stopped depending on the old shape -- not just that it's possible for them to.
- When in doubt, leave a longer window before the contract step than feels necessary. A drop is much
  harder to reverse than leaving an unused column around for an extra release cycle.

## Non-additive changes that need the same treatment

Not just adding/removing a column -- the same expand-contract shape applies to:

- **Widening or narrowing a type** (e.g. `int` to `bigint`, or a `varchar` length change) --
  generally safe to expand, but changing a type in a way that could truncate or overflow existing
  data needs the same backfill-then-verify caution as a rename.
- **Changing a nullable column to `NOT NULL`** -- only safe once backfill has actually completed and
  been verified, and only after confirming no in-flight code path can still write a null for that
  column (a service mid-rollout that hasn't picked up the "always set this field" change yet will
  violate the constraint the moment it's added).
- **Adding a new required foreign key** -- same shape: nullable first, backfilled, only made
  `NOT NULL`/enforced once every writer populates it.

## Common mistakes to avoid

- Writing a migration that does `ALTER TABLE ... RENAME COLUMN` (or `DROP` + `ADD` under a new name)
  as a single step when more than one deploying consumer reads that table.
- Adding a `NOT NULL` column with no default to a table with existing rows -- this fails outright
  against most databases, but the same shape without a hard failure (a default that's *wrong* for
  existing rows) is worse because it succeeds silently with bad data.
- Backfilling once and assuming that's sufficient, without a dual-write covering rows created after
  the backfill ran and before every writer has switched over.
- Dropping a column based on "nobody should be using this anymore" without checking actual usage
  first.
- Coupling the schema migration and the application code that depends on it into the same deploy,
  removing the safety margin expand-contract is meant to buy.
