# N/N-1 Compatibility During a Rolling Deploy

During a rolling deploy, the previous version (N-1) and the next version (N) of a service run side
by side, serving live traffic simultaneously, for however long the rollout takes to replace every
instance -- seconds for a small deploy, longer for a large fleet or a slow health-check gate. Both
versions need to tolerate the other's behavior for that entire window: N-1 must not choke on
anything N produces or expects, and N must not depend on something N-1 hasn't started providing yet.
This is the same additive discipline as the other reference files, but it's worth naming
specifically because it applies even to a change with *no* external consumer at all -- N and N-1 of
the *same* service are each other's compatibility constraint.

## Where this bites even inside one service

- **A load balancer or shared cache sits in front of both versions** -- a request can hit an N-1
  instance right after being routed away from an N instance, or vice versa, with no guarantee of
  which one it lands on next. Nothing about "the deploy is in progress" changes which instance a
  given request reaches.
- **Shared state between instances** -- a shared database, cache, or message queue is written by
  both N-1 and N during the rollout. If N writes a new shape that N-1 doesn't know how to read (and
  N-1 is still serving reads until it's replaced), N-1 breaks on data N produced, even though N-1's
  own code never changed.
- **In-flight requests span the cutover.** A long-running request or a multi-step flow (an
  in-progress checkout, a paginated request using a cursor from before the deploy) can start on N-1
  and continue on N, or the reverse, depending on how the deploy handles connection draining.

## The concrete pattern for a change that isn't naturally additive

Some changes genuinely can't be made additive by themselves (e.g. changing how a value is
interpreted, not just its shape). For those, decouple the *code* deploy from the *behavior* cutover
using a feature flag or a config toggle:

1. Deploy the new code with the new behavior gated off by a flag -- N and N-1 behave identically at
   this point, so the rollout itself is uneventful.
2. Once every instance is running the new code (the flag-supporting code, not yet the new behavior),
   flip the flag. This is now a config change, not a deploy, so there's no N/N-1 split to worry
   about -- every instance already has the capability, just toggled together.
3. Remove the old code path and the flag itself in a later, separate deploy, once the new behavior
   has been confirmed stable.

This is the same three-step expand/cutover/contract shape as a database migration, applied to
application behavior instead of schema, and it's the standard way to make an otherwise-non-additive
change safe under a rolling deploy.

## Dual-write as the analogous pattern for shared state

When N needs to write a new shape to shared storage (a cache key format, a queue message shape) that
N-1 also reads, N should dual-write -- both the old and new shape -- until every instance is on the
version that only needs the new shape. Mirrors the database dual-write pattern in
`references/expand-contract-migrations.md`, applied to any shared-state boundary, not just a
relational table.

## Common mistakes to avoid

- Assuming a rolling deploy is "basically instant" and skipping this because the overlap window
  feels too short to matter -- the overlap is real regardless of duration, and a large fleet or a
  slow health check can stretch it well past a few seconds.
- Changing a cache key's shape or a queue message's schema in the same deploy that starts producing
  it, with no dual-write step -- N-1 instances still reading the old shape from a cache/queue N just
  wrote the new shape into will fail or misbehave until they're replaced.
- Putting a behavior change and the code that supports toggling it in the same deploy as flipping the
  toggle -- collapses the three-step pattern above back into one risky step with no rollback point
  short of a full redeploy.
- Treating a feature flag flip as risk-free because "it's not a deploy" -- it still needs the same
  confirmation that every instance already has the flag-aware code before flipping it.
