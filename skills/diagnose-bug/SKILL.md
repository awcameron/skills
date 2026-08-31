---
name: diagnose-bug
description: >-
  Diagnosis loop for a failing, erroring, crashing, hanging, or unexpectedly slow piece of code --
  forms one falsifiable hypothesis about the root cause at a time and finds the cheapest way to
  test it (the actual error/stack trace, a minimal repro, a single targeted log or breakpoint)
  before touching any fix, narrowing by bisection instead of guessing across files. Use this skill
  when the user reports something broken, throwing, failing, crashing, hanging, or behaving
  unexpectedly ("this is broken", "why is X happening", "I get an error when I do Y", "this test
  is flaky", "this got slow"), asks to "debug this" or "find out why", or points at a stack
  trace/error message and asks what's wrong. Produces a confirmed root cause with the evidence
  that proves it, not a fix -- see write-tests to prove a fix, review-code to check one. Not for a
  bug whose cause is already known and only the fix itself is needed.
allowed-tools: [Read, Grep, Glob, Edit, Write, Bash(git log:*), Bash(git blame:*), Bash(git show:*), Bash(git diff:*), Bash(git bisect:*), Bash(git stash:*), Bash(npm test:*), Bash(npm run test:*), Bash(npx playwright test:*), Bash(pytest:*), Bash(python -m pytest:*), Bash(go test:*), Bash(cargo test:*)]
---

# Diagnose Bug

This skill is read-only with respect to the real codebase: it produces a **confirmed root cause
plus the evidence that proves it**, not a fix. Any code it touches along the way (a temporary log
line, a scratch repro script) is removed before finishing.

## Step 1: Get the actual evidence before reading any source

Don't start reading code blind. Get, verbatim:

- The actual error message / stack trace / failing test output -- not a paraphrase. Ask for it if
  the user hasn't given it, or run the failing command yourself.
- Whether it's deterministic or flaky/intermittent -- this changes what "confirmed" even means
  later (a flaky repro needs several runs before a hypothesis counts as tested).

## Step 2: Reproduce minimally before hypothesizing

A bug you can't reproduce is a bug you can't confirm you've explained. Use an existing failing
test if one already exists and covers it; otherwise write the smallest throwaway repro that
triggers it (a script, a specific input, a specific sequence of actions).

**Confirm the repro actually runs before trusting anything it reports.** A fresh checkout or
worktree commonly isn't runnable yet -- missing `node_modules`, an unbuilt workspace package, a
service that needs to be started first. Get a baseline passing run (or at least a clean failure
that's actually about the bug, not about a missing dependency) before reading any signal from it;
otherwise an infra error can look exactly like the bug itself and cost real time to untangle.

Name a throwaway repro so it's obviously scratch and easy to grep for before finishing (an
underscore or `.scratch.` prefix, or whatever convention makes it stand out from the real suite) --
never committed, and confirmed removed via `git status` in Step 6.

## Step 3: Localize with evidence, not skimming

- Read the stack trace bottom-to-top to the first frame inside the repo's own code, not library
  internals.
- If this looks like a regression ("this used to work"), use `git log -p` / `git blame` on the
  suspect lines, or `git bisect` if the repo has a reliable pass/fail command, to find the
  introducing commit mechanically rather than guessing which recent change did it.

## Step 4: One falsifiable hypothesis at a time

State the hypothesis explicitly ("X is null because Y is only set when Z") before testing it. Test
it the cheapest way that actually settles it -- reading the code path directly if that's enough,
otherwise exactly one targeted log/breakpoint placed at the point that would confirm or refute it,
then remove it once done. Don't shotgun multiple speculative changes hoping one sticks -- confirm
or discard each hypothesis before moving to the next.

## Step 5: Confirm root cause, not a symptom

State the confirmed root cause with the specific evidence that proves it (the log line, the diff,
the exact condition). If a fix under discussion would only suppress the symptom rather than
address the cause, say so explicitly.

## Step 6: Report and clean up

Report: root cause, the evidence for it, and where the fix belongs -- this skill diagnoses, it
does not implement the fix (see `fix-bug`). Strip any temporary debug instrumentation added in
Step 4, and any scratch repro file from Step 2, then confirm with `git status` that nothing of it
remains -- "this skill doesn't touch real code" is a claim worth actually verifying, not assuming.
