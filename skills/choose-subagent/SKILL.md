---
name: choose-subagent
description: >-
  Decide which subagent type and model to use before spawning an Agent call -- by whether the task
  writes anything, not by its topic. Use when about to spawn a subagent, or when the user asks
  "which agent should I use for X", "read-only agent or write agent", or "what model should this
  subagent run on". Read-only work (review, audit, investigate) goes on a read-only or cheaper
  agent; write work stays on the default, moving to a stronger model only for unusually hard
  changes.
---

# Subagent Selection

Pick a subagent type by what the task actually *does*, not by its topic. "Review PR #12" and
"implement the fix for #12" both mention a live PR, but one reads and reports, the other writes --
they belong on different agents.

## The checklist

Before spawning a subagent (Claude Code's `Agent` tool, or your harness's equivalent), ask:
**does this task write anything?** (Edit/Write a file, run `git commit`, `git push`,
`gh pr create`, or otherwise change state.)

```
                    Does the task write anything?
                 (Edit/Write, git commit/push, gh pr create)
                                  |
                 +----------------+----------------+
                 | No                              | Yes
                 v                                 v
        read-only / exploration          default write-capable
        agent  (or a cheaper-model            agent, unchanged
        general-purpose agent if                    |
        it needs broader tools)                      | unusually hard?
                                              (ambiguous design,
                                               stubborn bug, risky/
                                               hard-to-reverse change)
                                              +--------+--------+
                                              | No              | Yes
                                              v                 v
                                        stay on default   same agent type,
                                        model             override to a
                                                           stronger model
```

- **No -- it only reads and reports** (code review, standards/spec review of a PR or diff,
  "investigate X decision", running a read-only skill against a PR, general research/exploration)
  -> use a read-only/exploration agent type if your harness has one.
  - If the task needs tool access broader than a read-only agent allows but is still purely
    read-and-report, use a general-purpose agent with a cheaper/smaller model instead of the
    default -- no need to pay for a bigger model on a task that never changes anything.

- **Yes -- it edits files, commits, or otherwise changes state** (implement an issue, build or
  apply a skill, migrate code, fix lint drift, open a PR) -> default general-purpose agent,
  unchanged.
  - If the task is unusually hard -- not just "another routine change" but something needing real
    judgment calls (an ambiguous architecture/design decision, a bug with no obvious cause after
    an initial look, a change that's risky or expensive to get wrong and undo) -> keep the same
    agent type but override to a stronger model tier (your provider's top reasoning tier, e.g.
    Opus, GPT-5-class, or Gemini Pro). Routine write work stays on the default model; reserve the
    stronger one for where the extra reasoning depth is actually load-bearing, not as a default
    upgrade for anything that sounds important.
  - Don't reach for a niche/creative-writing model as a default part of this heuristic without a
    concrete use case that actually needs it (e.g. narrative/creative-writing subagent work) --
    adding one speculatively just adds an unused branch to the checklist.
  - Running several write agents in parallel? Two agents editing the same files will collide.
    Give each its own worktree (or partition the files between them) before spawning; if the
    work can't be partitioned, run the agents sequentially.

## Why this matters

Cost and context, not just tidiness: in one project's own audit of session history, roughly a
fifth of general-purpose Agent calls were pure read-and-report tasks that never touched a file and
could have run on a cheaper agent/model instead of the default. General-purpose was also the
largest single share of overall session usage there, making this a real lever, not a nitpick --
the same shape of waste is worth checking for in any repo with enough agent-call history to audit.

## The trap to watch for

Classify by what the task *does*, not what it's *about*. Both of these mention a live PR, but only
one writes anything:

- "Review PR #12 against our coding standards" -- reads a diff, reports findings. **Read-only.**
- "Test the review skill against PR #12" -- runs the skill, reports what it found. Still
  **read-only**, even though it sounds like active PR work.
- "Implement the fix requested in PR #12's review comments" -- edits files, commits. **Write.**

The same trap shows up with no PR involved:

- "Run the test suite and report which tests fail" -- executes a command, but changes nothing
  you'd keep. **Read-only.**
- "Find where `parseConfig` is defined and who calls it" -- pure search. **Read-only.**
- "Fix the failing tests" -- edits source files. **Write.**

When in doubt, ask "will this call a file-editing tool (`Edit`/`Write` in Claude Code) or a
state-changing shell command (`git commit`, `git push`, `gh pr create`, etc.) at any point?" If
the honest answer is no, it's read-only regardless of how "live" the subject matter sounds.
