---
name: choose-subagent
description: >-
  Pick a subagent's type and model by whether the task writes anything, not by its topic. Use when
  about to spawn a subagent, or when the user asks "which agent should I use for X", "read-only
  agent or write agent", or "what model should this subagent run on".
---

# Choose Subagent

Before spawning a subagent (Claude Code's `Agent` tool, or your harness's equivalent), ask:
**does this task write anything?** -- Edit/Write a file, `git commit`, `git push`, `gh pr create`,
or otherwise change state.

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

- **No -- it only reads and reports** (code or spec review, investigating a decision, running a
  read-only skill, research/exploration): use a read-only/exploration agent type if the harness
  has one. If it needs broader tools but still only reads, use a general-purpose agent on a
  cheaper/smaller model -- no need to pay for a bigger model on a task that changes nothing.
- **Yes -- it edits, commits, or changes state** (implement an issue, migrate code, fix lint drift,
  open a PR): the default general-purpose agent, unchanged.
  - **Unusually hard** -- an ambiguous design decision, a bug with no obvious cause after a first
    look, a change that's risky or expensive to undo: same agent type, overridden to the
    provider's top reasoning tier (e.g. Opus, GPT-5-class, Gemini Pro). Routine write work stays
    on the default; don't upgrade just because a task sounds important.
  - **Several write agents in parallel** collide when they edit the same files. Give each its own
    worktree or partition the files first; if the work can't be partitioned, run them
    sequentially.

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
