---
name: fix-bug
description: >-
  Implement a fix for a bug whose root cause is confirmed -- handed over from `diagnose-bug` or
  already known -- targeting the cause, not the symptom. Use when the user says "fix this", "here's
  the root cause, go implement the fix", or "go ahead and fix what the diagnosis found". If the
  cause isn't confirmed, run `diagnose-bug` first. Stops at a verified fix; coverage, review, and
  shipping are separate steps.
allowed-tools: [Read, Grep, Glob, Edit, Write, Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(npm install:*), Bash(npm ci:*), Bash(npm run build:*), Bash(npm test:*), Bash(npm run test:*), Bash(pytest:*), Bash(python -m pytest:*), Bash(go test:*), Bash(cargo test:*)]
---

# Fix Bug

This skill implements a fix from an already-confirmed root cause. It does not diagnose (see
`diagnose-bug`), does not write the regression test (see `write-tests`), does not review the
change (see `review-code`), and does not ship it (see `create-pr`).

## Step 1: Require a confirmed root cause before touching anything

If you were handed a `diagnose-bug` report (or an equivalent investigation) with evidence, use it.
If a cause is only asserted, not confirmed ("I think it's X" with no evidence attached), stop --
either run `diagnose-bug` first or say plainly that any fix from here would be a guess.

## Step 2: Target the cause, not the symptom

Using the diagnosis's own evidence, identify the smallest change that fixes the actual mechanism,
not just the specific case that got reported. A guard that's wrongly scoped needs re-scoping, not
a special case bolted on for the one scenario that got noticed.

## Step 3: Check for sibling occurrences of the same defect shape

The same anti-pattern is sometimes copy-pasted or independently re-derived elsewhere in the
codebase. Grep for structurally similar code before considering the fix complete -- a root-cause
fix in one place is incomplete if the identical defect exists somewhere else, though a
superficially similar piece of code that doesn't actually share the defect doesn't need touching
just because it looks alike.

## Step 4: Show the diff before applying anything beyond the minimal, obvious change

A one-line fix at the exact location the diagnosis pointed to needs no gate. Anything broader --
multiple files, a changed public interface, refactoring the surrounding code -- does: stop, show
the diff, and wait for confirmation before applying it, the same confirmation discipline
`create-pr` uses for visible actions. This is a real stop, not a formality to note and skip past.

## Step 5: Apply the fix

## Step 6: Verify it actually resolves the originally confirmed symptom

Rerun the repro or failing test from the diagnosis and confirm it now passes. Don't assert a fix
"should" work without actually checking.

**If the repo isn't runnable as checked out** (a fresh clone/worktree missing installed
dependencies or an unbuilt workspace package), get it runnable first -- confirm the fix against a
real passing/failing signal, not a guess dressed up as verification.

**Verify with a throwaway check, not a permanent test file.** A scratch script or a temporary,
unsaved test run is enough to prove the fix works -- writing a lasting spec is `write-tests`'s job
(with its own conventions for naming, mocking style, and "prove it fails against the unfixed
code" discipline), not this skill's. Producing your own permanent test here duplicates that step
instead of handing off to it.

## Step 7: Hand off, don't duplicate

Point at `write-tests` for the regression test, `review-code` for a standards check, `create-pr`
to ship. This skill's job ends at a verified fix.
