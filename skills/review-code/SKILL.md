---
name: review-code
description: >-
  Review code changes against a repo's own coding standards. Use this skill when the user asks to
  "review this", "code review", "check this code", "review my changes", "review the diff",
  "look over this", "check for issues", or wants feedback on code quality, conventions, or
  observability patterns. Also use when the user says "does this look right", "anything wrong with
  this", or "sanity check this". This skill discovers and checks against the repo's own coding
  guidelines, observability principles, DI patterns, and security practices -- it reports findings
  but does not auto-fix. Also use when the user asks to "post this review to the PR" or "leave
  this as a PR comment" -- posting is opt-in, only happens when explicitly asked, and is a single
  summary comment, not inline per-line review comments.
allowed-tools:
  [
    Read,
    Grep,
    Glob,
    Bash(git diff:*),
    Bash(git log:*),
    Bash(git show:*),
    Bash(gh pr view:*),
    Bash(gh pr diff:*),
    Bash(gh pr comment:*),
    Write,
  ]
---

# Review Code

This skill reviews code changes against a repo's *own* established standards -- not a generic
external style guide. It produces structured feedback with findings categorized by severity. It
does not make changes -- only reports what it finds, so the author can decide what to address.

## Step 0: Find the repo's actual standards before reviewing anything

Never review against assumed or remembered conventions from a different codebase. Look for, in
rough priority order:

- A conventions doc (`AGENTS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, or equivalent).
- Tool-specific rule files a repo already maintains (e.g. Cursor's `.cursor/rules/*.mdc`,
  an ESLint config's custom rules, a documented observability/logging standard).
- Architectural Decision Records (`docs/adr/*.md` or similar) for decisions that constrain how
  new code should be shaped.
- Lint/format config (`eslint.config.*`, `.eslintrc*`, `tsconfig.json` strictness flags) for what's
  actually enforced mechanically vs. merely a stated preference.

If a repo has none of this, say so, and fall back to the general-purpose judgment in the
`ts-best-practices` skill (or the closest equivalent for the language in use) rather than
inventing house rules that aren't actually this repo's.

**Distinguish enforced rules from stated preferences.** A conventions doc will often say something
is a preference, not a rule ("prefer functions under ~100 lines... where practical") -- if no lint
rule enforces it, don't report a violation of it as a blocking issue, and don't report length (or
any soft preference) alone when the file is in line with its siblings. Flag it only when it's a
symptom of something nameable: a function doing several jobs, or duplicated logic that wants
extracting. Name the duplication or the mixed responsibility, not the raw metric.

**A standard that describes a target not yet adopted anywhere in the codebase is not a violation
when existing code doesn't follow it** -- only flag *new* code that contradicts the target, never
existing code for not yet matching it. Check first whether the target has actually shipped
elsewhere in the codebase already (in which case departures from it are ordinary findings, not
exempt).

## Step 1: Identify the changes

Determine what to review based on context:

- If the user points to specific files, review those.
- If they say "review my changes" (or give no target), check the local git diff against the
  repo's actual default branch:

```bash
git diff --name-only origin/<default-branch>...HEAD
git diff origin/<default-branch>...HEAD
```

- If the user gives a PR number, review that PR directly via `gh` -- don't require it to be
  checked out locally first:

```bash
gh pr view <n> --json title,body,baseRefName,headRefName
gh pr diff <n>
```

Read the changed files in full -- don't review just the diff hunks. Understanding the surrounding
context is essential for catching issues like missing error handling or a broken pattern. For a
PR review, this means reading each changed file at its state on the PR's head branch, not the
base branch's version.

## Step 2: Check against the repo's discovered standards

Using what Step 0 found, look for the repo's actual patterns in categories like:

**Dependency injection / composition** — how are collaborators wired up in this codebase
(constructor injection, a DI container, plain factory functions)? Is new code consistent with
what's already there, cited with a real example file from the repo, not assumed from a framework's
generic docs?

**Function/module design** — does the repo have a documented or de facto size/complexity
preference? Is it enforced by a lint rule, or just a stated preference (see Step 0's distinction)?

**Error handling** — does the repo have a documented error-handling shape (a `Result<T,E>`
pattern, framework exception classes at boundaries, a specific tuple-return convention)? Cite a
real file that demonstrates the convention in use.

**Naming and organization** — filename casing convention, import ordering (and whether it's
lint-enforced, in which case tell the author to run the autofixer rather than itemizing every
reordering by hand), unused-variable handling.

**Style** — only flag deviations from what's actually enforced or actually consistent across the
existing codebase; don't import a preference from elsewhere.

## Step 3: Check for correctness bugs, independent of any documented convention

Everything in Step 2 is anchored to what the repo's own docs and patterns say. But a repo's
conventions doc was written to cover the things that recur often enough to be worth writing down
-- it was never meant to be a checklist of every way code can be wrong. A competent reviewer
still catches plain bugs that no doc mentions, and this skill should too: an `await`ed call whose
rejection is never handled and nothing upstream catches it; an input that's obviously required for
the operation to be safe or correct but is never validated; a calculation or piece of business
logic that does something different from what it appears to intend (a fee added where the reader
would expect it deducted, a boundary condition off by one, a comparison that can never be true);
sensitive data flowing into a type or parameter that has no reason to carry it, making it easy to
mishandle later even before anything actually logs it.

One pattern worth deliberately looking for: *asymmetric* validation. When a function guards some
of the inputs it's about to use for a given operation but not others feeding that same operation,
the unguarded ones are usually an oversight rather than a deliberate choice, not a hypothetical
one -- if one parameter got a null/range/presence check before being used, ask why a sibling
parameter headed for the same call or the same write didn't get the same treatment.

This is different from house-ruling a style preference the repo hasn't adopted (still don't do
that) -- a genuine correctness bug is a bug regardless of what any doc says, the same way a
security issue is flagged in Step 4 below whether or not the repo has a security doc. If Step 2's
convention-by-convention pass left the diff feeling clean but something about the actual behavior
still seems off, take a second pass asking "what would go wrong at runtime here, or what would a
careful reader assume this code does that it doesn't" before moving on.

## Step 4: Check observability, where applicable

**Logging** — does the repo have a documented logging standard (structured logging via a specific
library, required context fields)? Flag `console.*`/raw prints only if the repo has moved past
that convention elsewhere.

**Security** — never let a review miss: hardcoded credentials or secrets, logging of an
`Authorization` header or auth token, logging of other sensitive-by-convention fields the repo
already treats as PII/sensitive elsewhere.

**Log levels**, if the repo has a documented scheme (a common shape: ERROR for user-impacting
failures, WARN for degraded-but-functional, INFO for business events used sparingly, DEBUG for
diagnostics) -- check consistency with whatever the repo already does, not an external standard.

## Step 5: Check test quality, if tests are in scope

If test files are part of the changes, check against the repo's actual test conventions (runner,
mocking approach, assertion style) -- read an existing spec file first rather than assuming Jest,
Vitest, or any other runner's defaults apply. Look for:

- Consistency with the mocking library/pattern the repo actually uses (don't suggest a different
  one exists if it isn't a dependency).
- No `async describe` blocks (a common real footgun regardless of runner).
- Arrange-Act-Assert structure.
- Assertions that test behavior, not implementation details.

## Output Format

Structure the review as:

### Issues

Categorize findings by severity:

- **Blocker** -- violates a rule the repo's own conventions mark as never-acceptable (bypassing a
  documented security boundary, committing secrets, extending a directory the repo marks
  off-limits). List these first, above all other categories, regardless of file order -- these
  block merge outright, not a judgement call.
- **Error** -- violations that will cause bugs or security issues. Don't flag anything CI already
  gates on (lint, typecheck, format, build) -- CI catches that on every PR; duplicating it here is
  wasted effort.
- **Needs Confirmation** -- something the repo's conventions mark as requiring sign-off (a new
  dependency, a schema change, a change to the conventions doc/an ADR itself) done without visible
  discussion. Not a mistake -- flag it so a human signs off before merge.
- **Warning** -- deviations from conventions that should be addressed.
- **Suggestion** -- optional improvements that would make the code better.

For each finding, include:

- The file and line number (`file.ts:42`), not an approximate location.
- What the issue is.
- Why it matters (reference the relevant guideline, cited from the repo's own doc, not a generic
  claim).
- What the fix would look like (brief, not a full rewrite).

### What Looks Good

Call out things done well -- especially if the code demonstrates good composition, clean error
handling, or thorough observability. Positive feedback helps reinforce good practices.

### Summary

A brief overall assessment: is this ready to merge, or does it need another pass? If there are
blockers, be clear about which issues must be fixed vs. which are nice-to-haves.

## Posting to the PR (opt-in)

By default, the output above stays in conversation -- posting a comment to a real PR is an
outward-facing action, so it only happens when the user explicitly asks for it (e.g. "post this
to the PR", "leave this as a PR comment", "review PR #N and post it"). Reviewing a PR by number
alone is not, on its own, a request to post -- don't post unless asked.

When asked to post:

1. Write the full markdown output (Issues/What Looks Good/Summary, unedited) to a file in the
   scratchpad directory.
2. Post it with:

   ```bash
   gh pr comment <n> --body-file <path> --edit-last --create-if-none
   ```

   `--edit-last --create-if-none` gives idempotency for free, with no marker comment or dedup
   logic needed: on a first review it creates a new comment; on a re-review it edits *this
   reviewer's own* last comment on the PR in place, rather than piling up a new one each time. It
   only ever touches a comment made by the authenticated `gh` identity, so a human's own comments
   on the same PR are never at risk of being overwritten.

3. Report the comment URL `gh pr comment` prints on success back to the user.

Scope note: this posts one top-level summary comment, not per-line inline review comments
anchored to the diff. Inline comments need diff-position mapping (a finding can reference code
the PR didn't touch, which has no valid diff position) and are a meaningfully bigger, separate
piece of work -- not something to improvise here if asked for "inline" feedback specifically.
