---
name: write-tests
description: >-
  Write or scaffold tests for a change using the repo's own test runner, layout, and mocking
  conventions, and prove each new test can fail. Use when the user asks to "write tests", "add
  tests", "test this", "scaffold a spec", or "add test coverage", or asks "does this have tests" /
  "what's untested here". Covers unit, integration/e2e, and schema/contract tests. Not for general
  code review (`review-code`).
allowed-tools: [Read, Grep, Glob, Edit, Write, Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git status:*), Bash(git fetch:*), Bash(git merge-base:*), Bash(git symbolic-ref:*), Bash(git remote:*), Bash(gh repo view:*), "Bash(${CLAUDE_SKILL_DIR}/scripts/change_scope.sh:*)", Bash(gh pr diff:*), Bash(gh issue view:*), Bash(git stash:*), Bash(git restore:*), Bash(npm run test:*), Bash(npm test:*), Bash(pnpm test:*), Bash(pnpm run test:*), Bash(yarn test:*), Bash(yarn run test:*), Bash(npx vitest:*), Bash(npx jest:*), Bash(npx playwright test:*), Bash(pytest:*), Bash(python -m pytest:*), Bash(go test:*), Bash(cargo test:*)]
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
- If they say "test my changes" or give no target, diff the working tree -- committed, staged,
  *and* uncommitted changes -- against where this branch left the repo's actual default branch:

```bash
${CLAUDE_SKILL_DIR}/scripts/change_scope.sh   # -> default branch, <base>, changed + untracked paths
git diff <base>
```

  The script ships inside this skill's directory, not the target repo. Claude Code fills in
  `${CLAUDE_SKILL_DIR}`; if it's still literal text, use the absolute path of the `scripts/`
  directory next to this `SKILL.md`. If the script can't run (no bash), do its steps by hand: get
  the default branch from `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` (off
  GitHub, `git symbolic-ref --short refs/remotes/origin/HEAD`, unset in some clones), then
  `git fetch origin <default-branch>`, `git merge-base origin/<default-branch> HEAD` for `<base>`,
  `git diff --name-only <base>`, and `git status --short` for untracked (`??`) paths. In a fork
  (`git remote` lists `upstream`), use `upstream` wherever these say `origin`.

  Don't use `origin/<default-branch>...HEAD` -- it only covers commits, so uncommitted work comes
  back empty. `git diff <base>` also skips untracked files: read every untracked path in full as
  new code.

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

**Before finishing, make the new test fail.** Revert the fix, run the spec, watch it go red, then
restore. This takes about twenty seconds and it is the only direct evidence that a test tests
anything.

Revert **only the source files, never the spec files** -- a bare `git stash` also stashes a test
you added to an existing spec file, so the "red" run tests nothing:

```bash
# Fix is uncommitted:
git stash push -- <source files>      # run the spec -> red
git stash pop

# Fix is already committed (and those source files have no uncommitted edits):
git restore --source=<commit before the fix> -- <source files>   # run the spec -> red
git restore -- <source files>
```

For a one-line fix, commenting the line out or restoring the old value by hand works too.
Either way, confirm with `git status` afterwards that the source is back to the fixed version.

If the change is a bug fix, prefer writing the test *first* and watching it fail ("red before
green"), or follow the repo's own test-first workflow if it has one. A test written after the fix
has only ever been observed agreeing with the code.

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
