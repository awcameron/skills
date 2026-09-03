# Consumer-Driven Contract Tests

Everything else in this skill is a set of rules for making a change additive by construction. A
contract test is how you actually *verify* compatibility instead of trusting that the rules were
followed correctly -- the same relationship a regular test has to "I read the code and it looks
right." Worth adding wherever a producer and consumer are independently deployed and a human
reviewing the producer's diff has no visibility into whether it broke a consumer they don't work on
day to day.

## What a consumer-driven contract test actually checks

A consumer publishes (or, more simply, commits alongside its own tests) a description of the shape
it expects from a producer -- specific fields it reads, specific values/types it depends on. The
producer's own test suite then verifies its actual output still satisfies every consumer's
recorded expectations, *before* the producer's change ships. This flips the usual direction of
verification: instead of the producer's author guessing at what might break a consumer, the
consumer states its own requirements once, and the producer's CI checks against them automatically
on every change.

## Where this repo may already have the pieces, without calling it a "contract test"

Look for what's already there before introducing a new tool or pattern:

- **A shared-types/shared-schema package** (see `fullstack-feature-slice`'s discovery step for the
  shared-contract mechanism) that both a producer and consumer import from is itself a lightweight
  form of this -- a producer that breaks the shared type fails its own typecheck immediately. This
  only catches shape changes typed as breaking (a required field removed), not a same-type
  meaning change (a field repurposed without a type change) -- worth calling out to the user if the
  only protection here is the type system, since it misses that case.
- **A dedicated contract-testing framework** (Pact is the common one across several languages, or
  a schema-registry's own compatibility-check gate on CI for events) if this repo already uses one
  -- check for a `pacts/` directory, a Pact broker URL in CI config, or a schema-registry
  compatibility check step in a workflow file before assuming there's nothing here.
- **An integration test that spins up both services together** and asserts on the real interaction,
  even without a dedicated contract-testing tool -- less precise about *which* consumer expectation
  broke, but still catches an incompatible change before it ships if it's actually run in CI for
  both the producer's and consumer's pipelines.

## Adding one where the pattern doesn't exist yet

Don't reach for a new framework/dependency by default -- that's exactly the kind of cross-package
addition worth confirming with the user first (see `fullstack-feature-slice`'s Ask-First guidance,
which applies here too). A reasonable minimum, using only what a repo's existing test framework
already provides:

1. In the consumer's own test suite, write a test that constructs the exact producer response/event
   shape the consumer's code depends on, and asserts the consumer handles it correctly -- this
   already exists in most repos as an ordinary unit test, just not usually labeled a "contract" test.
2. The harder, actually load-bearing half: get that fixture (or an equivalent one) exercised on the
   *producer's* side too, so a producer change that would violate it fails before merge, not after
   deploy. Concretely: a shared fixture file both sides import, a schema file checked by both
   pipelines, or (only if the repo's scale genuinely warrants the dependency) a real contract-testing
   tool.
3. Prioritize this for whichever contract has broken silently before, or has the most
   independently-deployed consumers -- not every internal contract needs this weight; it's a
   response to actual coordination risk, not a blanket requirement for every schema in the repo.

## Common mistakes to avoid

- Treating "the producer's own tests pass" as proof a change is compatible -- the producer's tests
  verify the producer's own understanding of the contract, which is exactly what can drift from a
  consumer's actual expectation without either side's tests catching it.
- Introducing a full contract-testing framework for a single, tightly-coupled internal contract with
  one consumer that deploys atomically with the producer -- the ceremony costs more than the
  compatibility risk it protects against there; save it for genuinely independent, multi-consumer
  contracts.
- Writing a contract test once and never revisiting it as the consumer's actual usage changes -- a
  stale contract test that no longer reflects what the consumer reads gives false confidence, which
  is worse than no test at all.
