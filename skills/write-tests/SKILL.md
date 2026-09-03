---
name: write-tests
description: >-
  Scaffold or write tests for a given change in a repo, grounded in that repo's own actual test
  conventions. Use this skill when the user asks to "write tests", "add tests", "test this",
  "scaffold a test", "add test coverage", "write a spec for this", or points at a diff/file/PR and
  asks for tests to be added. Also use when the user says "does this have tests" or "what's
  untested here" as a lead-in to writing them. Covers unit tests, integration/e2e tests against
  real dependencies, and schema/contract tests, wherever a repo's own layout puts them. Does not
  review code quality or standards compliance outside of tests (see `review-code` for that).
allowed-tools: [Read, Grep, Glob, Edit, Write, Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git stash:*), Bash(npm run test:*), Bash(npm test:*), Bash(npx playwright test:*)]
---

# Write Tests

This skill writes real, runnable tests, grounded in a repo's *actual* conventions -- verified by
reading real spec files in that repo, never assumed from "how this test runner usually looks".

## Step 0: Discover the actual layout before writing anything

Don't assume a test runner, mocking library, or directory layout from a different project. Find
out, for the repo at hand:

- Which test runner is actually a dependency (check `package.json`/lockfile), and whether more
  than one coexists in different parts of a monorepo.
- Where specs live relative to source -- colocated (`<name>.spec.ts` next to the file it tests) or
  in a parallel `test/`/`__tests__/` tree -- and whether that differs between unit and
  integration/e2e suites.
- The mocking approach actually in use (a runner's own built-in mocks, a separate mocking library,
  or hand-built fake objects) -- don't suggest a library that isn't already a dependency.
- How to actually run one spec vs. the whole suite (`package.json` scripts, workspace flags).
- Whether integration/e2e tests need a real dependency running first (a database, a live backend)
  and how that's started locally.

Read two or three existing spec files in the area you're about to add to before writing anything --
they're the house style, not a generic guide.

**If the repo previously had a documented gap here (a missing runner, a "don't write frontend
tests yet" note) that's since closed, trust what you actually find over a stale doc** -- check
`doc-fact-check` if there's any doubt the docs still match reality.

## Step 1: Identify what's untested

- If the user points at specific files, use those.
- If they say "test my changes" or give no target, read the diff:

```bash
git diff --name-only origin/<default-branch>...HEAD
git diff origin/<default-branch>...HEAD
```

- If given a PR or issue number, read it first with `gh pr diff <n>` / `gh issue view <n>`.

Read the changed source in full, not just the hunk -- you need the real signature and behaviour to
assert against. Then check whether a spec already covers it, so you don't add a redundant one.

## Step 2: Pick the mode

Choose by what is actually under test, rather than defaulting:

- **Unit spec** -- one class, hook, or function in isolation, with hand-built collaborators. The
  default for logic.
- **Integration/e2e** -- boots a real instance of the service or app against a real dependency
  (database, backend). Use it when the thing under test is *wiring*: middleware order, a policy
  actually filtering data, a route's real contract. A unit test on one piece of that pipeline
  never proves the whole thing assembled correctly.
- **Browser/end-to-end UI** -- a real browser against a real backend. Use it for anything a
  simulated DOM structurally cannot see: file uploads, streaming, navigation, or "did this
  actually persist."

## Step 3: Read the real conventions before writing

Cite files you actually opened in this repo rather than inventing a house style -- the specific
imports, mock setup, and naming pattern in an existing spec near the code you're testing.

Typical conventions worth confirming per layer (fill these in from what Step 0 found, not from
memory of another project):

- `describe`/`it` naming style, and whether specs favor `beforeEach` rebuilding fresh
  collaborators vs. once-per-file setup.
- Whether collaborators are faked as plain objects, a mocking library's `fn()`/`mock()`, or a
  dedicated test-double module the repo already provides.
- For component/UI tests: whether the convention queries by role/accessible name (preferred) or
  falls back to test-id attributes, and under what circumstances.
- For schema/contract tests: the shape of a typical "valid input, then each rejection case" spec.

## Step 4: The bar that matters most -- prove the test can fail

**A test that passes whether or not the code is correct is worse than no test.** It occupies the
place a real test should be, and no amount of CI can catch what the assertion itself cannot
detect.

**Before finishing, make the new test fail.** Revert the fix -- `git stash`, comment the line out,
restore the old value -- run the spec, watch it go red, then restore. This takes about twenty
seconds and it is the only direct evidence that a test tests anything.

If the change is a bug fix, prefer writing the test *first* and watching it fail, per the `tdd`
skill's "red before green" (or the equivalent test-first workflow if this repo has one). A test
written after the fix has only ever been observed agreeing with the code.

### Failure shapes worth watching for

Every one of these can produce a green test over broken code:

- **Satisfied by a different mechanism.** An assertion checks that something disappeared after an
  interaction -- but a different, unrelated effect of that same interaction (e.g. unmounting a
  parent) also makes it disappear, regardless of whether the actual state was cleared. Assert on
  the state that survives the interaction, not on something the interaction removes anyway.
- **An unscoped query matching the wrong element.** A text/selector query intended for one part of
  the output actually matches a different part that happens to render the same string. Scope
  queries to the specific row/section/accessible name under test.
- **A "called with" assertion while something fires more than once.** It matches if *any* call
  matches the expected arguments, so it says nothing about how many calls happened. When "exactly
  once" is part of the behaviour, assert the call count too.
- **The mirror image: a call-count assertion standing in for a "called with" one.** A test named
  for what a call was scoped to or invoked with (an id, a filter, a specific argument) but that
  only asserts `toHaveBeenCalledTimes(n)` proves nothing about *which* id or argument was used --
  it would pass identically if the code queried the wrong thing entirely, as long as it queried
  something the same number of times. If the mock doesn't capture its call arguments, it can't
  back up a claim about what was passed; either assert on the captured arguments or rename the
  test to describe what it actually checks.
- **A fixture that makes the case unreachable.** A spec named for disambiguating repeated items
  passes only because the fixture happens to contain just one. If the test is about N items, the
  fixture needs N.
- **A shell/script check that cannot fail.** A diff or grep check run from the wrong directory (or
  against the wrong glob) matches nothing and exits success, reporting "no drift" when there
  actually was some. A check that reports success must be shown capable of reporting failure --
  the same rule as a test.

Also still vacuous, in the ordinary ways: asserting a tautology, mocking the very method under
test, or asserting only that something "was called" when the change is about what it computed.

## Step 5: Show the file before writing it

Writing a spec is local and reversible, so it needs no confirmation gate -- but a plausible-looking
wrong test is worth a glance. State the exact path, show the test code, then write it.

## Step 6: Run it, and report what actually happened

Use the actual run commands Step 0 discovered for this repo. Report the real result rather than
assuming. If you could not verify the test fails against the unfixed code, say so plainly instead
of implying it was checked -- an unverified regression test is worth stating as unverified.
