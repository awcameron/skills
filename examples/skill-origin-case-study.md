# Case study: where these skills actually came from

The skills in this repo weren't drafted speculatively — they were built for, and iterated on
inside, a real, actively-developed production codebase. Each one went through the same loop:
something went wrong or got noticed in a real session, the skill got a rule added to catch it
next time, and — for this repo — the rule got rewritten to drop the original project's specific
facts in favor of a "go find out what *this* repo does" step in the same place.

A few concrete examples of what that looked like before the genericizing pass:

## `doc-fact-check`: a skill's own claim was the stale one

A skill file described the backend's feature-organization pattern using a directory name
(`usecases/<action>/`) that had been copied from the project's own canonical conventions doc.
By the time anyone checked, every module in the actual codebase had already moved to a different
pattern (`features/<action>/`) — the convention doc itself hadn't been updated to match the
refactor, so an agent trusting "the docs say so" would have kept the stale name alive by acting on
it, not just reading it. That's the reason `doc-fact-check` treats a repo's canonical docs as
*checkable claims*, not ground truth by construction — and it's why the skill explicitly covers
other skill files as in-scope, not just prose documentation. An agent doesn't just read a stale
skill claim, it executes it.

A related catch from the same project: a planning doc's "Technical Context" section claimed the
frontend deployed to one hosting provider, when it had actually been moved to a different one
months earlier. Nobody had gone back to fix the sentence. Same failure mode, different doc.

## `create-pr`: two real near-misses baked into the guardrails

- A broad `git add -A` once swept an unrelated file into a commit it had no business being in,
  and it had to be split back out into a follow-up PR. That's why the skill insists on reviewing
  `git status` *after* staging, not just before.
- A PR body that closed two issues wrote them as one sentence ("Closes #394 (F2) and #395 (F3)")
  instead of two separate `Closes #N` lines. GitHub's closing-keyword parser only links the number
  immediately following the keyword — it silently closed one issue and left the other open despite
  the work being done. That's a GitHub parsing quirk worth knowing regardless of what repo you're
  in, which is why it's called out explicitly in the skill rather than left as tribal knowledge.

## `choose-subagent`: a real audit, not a guess

An audit of that project's own agent-call history found that roughly a fifth of "full write-agent"
calls were actually pure read-and-report tasks (a PR review, an investigation) that never touched
a file — work that could have run on a cheaper read-only agent or a smaller model instead. That's
the origin of the skill's core heuristic: classify a task by whether it *writes* anything, not by
what it's *about*. The exact percentage was specific to that project's history, so it's kept here
as an anecdote rather than a claim this repo's version makes about your project — but the same
kind of audit is cheap to run against any repo with enough agent-call history, and tends to turn
up the same shape of waste.

## Why this matters for the genericized versions

None of the rewritten skills in this repo invent new content to sound more general — they keep
the same real mechanism (the workflow, the guardrail, the failure mode) and swap out only the
project-specific facts (a stack, a file path, a naming precedent) for a "discover this repo's own
version of that fact first" step. The goal is that a skill here should feel exactly as
concrete and well-worn in *your* repo as it did in its original one, once it's had a chance to
read your conventions doc and your real git history.
