# Skill categories

This repo doesn't impose a lifecycle framework -- see the README's "discover, don't dictate"
principle -- so there's no fixed pipeline every skill slots into. But the skills here do fall into
natural groups, along two axes: what stage of work a skill acts on, and whether it touches the
target codebase at all. This doc explains the grouping used in the README's
["What's here"](../README.md#whats-here) table and how the skills within a group relate to each
other.

## Feature building

`fullstack-feature-slice`

Its own category, and the earliest-stage one -- writing new feature code, as opposed to judging
code already written (the next group) or fixing/testing/shipping it (the pipeline after that). It
carries a fixed, portable *shape* (shared contract first, then backend, then frontend, then tests,
then a cross-layer summary) the way `ts-best-practices` and `zero-trust-architecture` carry a fixed
body of judgment calls, but the specifics inside that shape -- what the shared-contract mechanism
actually is, whether the backend is vertical-slice or layered, what the error-handling convention
is -- are entirely discovered per repo rather than assumed. It leans on `zero-trust-architecture`
by name for the security-boundary piece rather than re-deriving that layer itself.

## Design documentation

`create-tdd`

Its own category, upstream of `fullstack-feature-slice` -- writes the design document a feature
gets built from, rather than the feature code itself. Follows the user's or the repo's own
design-doc template, falling back to the bundled `references/technical-design-doc.md` only when
there's neither, and discovers per repo which sections apply, whether it's running greenfield or
retroactively against an existing codebase, and where a repo already keeps its design docs before
defaulting to its own `docs/tdd/` path. It leans on `zero-trust-architecture`
by name for the Security section and, when a design changes a contract an existing consumer
depends on, `rollout-compatibility` for the Data Models/Deployment Plan sections -- the same
by-name pattern `fullstack-feature-slice` uses, rather than re-deriving either body of judgment
calls itself.

## Code-quality lenses

`review-code`, `ts-best-practices`, `zero-trust-architecture`, `rollout-compatibility`

The "read code, judge it against a body of standards" skills. They share a purpose, not
necessarily a structure -- they differ in where that body of standards comes from, and that
difference shows up in how each one is laid out on disk:

- `review-code` *discovers* a repo's own standards (its documented conventions, its lint config,
  its real git history) -- it has no fixed opinions of its own, so there's nothing fixed to split
  into `references/`.
- `ts-best-practices`, `zero-trust-architecture`, and `rollout-compatibility` each carry a fixed,
  portable body of judgment calls -- TypeScript/JavaScript idiom, Zero Trust authorization
  architecture, and backward/forward-compatible change discipline, respectively -- that apply
  across repos, with an explicit step to check whether a given repo's own documented convention (or
  deployment model) should win over the general default. All three split that detail into
  `references/` files opened on demand rather than loaded all at once.

All four apply equally while *writing* new code and while *reviewing* existing code -- none of
them is review-only. `rollout-compatibility` is the newest of the four and the one most likely to
be a no-op for a given repo -- its own discovery step says so plainly when a repo ships everything
in one atomic release with no rolling window, the same way `zero-trust-architecture` notes when a
repo has no database-layer tenant isolation yet.

## The bug lifecycle

`diagnose-bug` → `fix-bug`

A designed two-step pipeline, not two independent skills that happen to be about bugs.
`diagnose-bug` produces a confirmed root cause with the evidence that proves it (the actual
error/stack trace, a minimal repro, a throwaway test) and deliberately stops short of the fix.
`fix-bug` consumes that confirmed root cause -- either handed to it directly or produced by
`diagnose-bug` moments earlier -- and implements a fix targeting the actual cause, checking for the
same defect shape elsewhere before considering itself done. If `fix-bug` is invoked without an
already-confirmed root cause, it defers to `diagnose-bug` first rather than guessing at a patch.

`fix-bug`'s own description states it stops at a verified fix and hands off downstream -- coverage
to `write-tests`, a standards pass to `review-code`, shipping to `create-pr` -- rather than
duplicating any of them. That handoff is the seam connecting this group to the next three.

## Test authoring

`write-tests`

Its own category -- no skill here has an equally close sibling. Consumed both by the bug lifecycle
(verifying a fix, distinct from the throwaway repro `diagnose-bug`/`fix-bug` use internally to
confirm a hypothesis) and by standalone "write tests for this" requests.

## Dependency maintenance

`upgrade-dependency`

Its own category too. Reads the actual changelog/migration guide across the version range being
crossed and greps the repo for real usage of anything flagged as breaking, rather than trusting a
changelog entry's relevance without checking it against this codebase specifically. It records a
test baseline before the bump, so it can report what the bump broke separately from failures that
were already there.

## Shipping workflow

`create-pr`

The terminal step most of the above hand off to: branch → commit → push → PR, discovering a
repo's own naming and commit-message conventions from its docs and real history, with a
confirmation checkpoint before every visible or remote action.

## Documentation integrity

`doc-fact-check`, `format-docs`

Both operate on docs, but on deliberately orthogonal axes, and the split is intentional rather
than incidental -- `doc-fact-check`'s own `SKILL.md` calls it out explicitly:

- `doc-fact-check` checks whether a doc's *claims* are still true -- stack choices, file paths,
  documented conventions, even other skill files (an agent *executes* a stale skill claim instead
  of just reading it, so skill drift is in scope, not just prose). Never edits without
  confirmation.
- `format-docs` checks whether a doc's *formatting* is mechanically consistent -- whitespace, list
  markers, table alignment -- using whatever formatter the repo already runs. Applies its findings
  directly; flags (without silently resolving) anything that would change wording or structure.

A doc can be factually accurate and badly formatted, or perfectly formatted and confidently wrong
-- the two failure modes don't imply each other, which is the reason this is two skills instead of
one.

## Agent meta-behavior

`choose-subagent`, `terse-reports`

The odd group out: neither skill touches the target codebase at all. Both govern how the agent
*doing* the work behaves, not the work's subject matter -- `choose-subagent` is a decision
checklist for which subagent type/model to spawn a task on (based on whether the task writes
anything, not what it's about), and `terse-reports` governs the register used to report status and
findings back to the user (never applied to code, commits, or PR bodies -- anything meant for
someone else to read keeps normal grammar).

## The coarse view

Collapsed further, there are really three tiers: **design documentation** writes the plan that
**feature building** turns into the code the **code-quality lenses** then read, which feeds into
the **build/fix/test/ship pipeline** (bug lifecycle → test authoring → dependency maintenance
→ shipping), while **documentation integrity** and **agent meta-behavior** sit orthogonal to all
of it -- they apply regardless of where in the pipeline a given task currently is.
