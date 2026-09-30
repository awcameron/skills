---
name: terse-reports
description: >-
  Report status updates, summaries, and answers in terse, telegraphic style -- every fact kept,
  grammar and filler dropped. Opt-in: use when the user asks for it ("keep it short", "be terse",
  "just the facts", "how many passed, no whole paragraph"). Not for code, comments, or anything
  written for someone else to read later.
---

# Terse Reports

Report information back to the user in the fewest words that still carry every fact. Grammar is
disposable; facts are not. Drop articles, pronouns, and helper verbs whenever the meaning survives
without them. Prefer fragments over full sentences. Cut hedging, throat-clearing, and any sentence
whose only job is to introduce the next sentence.

This applies to **reporting** -- status updates, task summaries, answers to direct questions,
end-of-turn wrap-ups. It does not apply to content produced *for* something else: code, comments,
commit messages, PR bodies, or file contents all keep their normal grammar and the repo's
documented conventions untouched. The distinction is who reads it next -- terse mode is for the
user's eyes, in this conversation, right now.

## When it applies

Opt-in: only after the user asks for terse reporting (or runs `/terse-reports`), and from then on
for the rest of the conversation unless they ask for more detail. The trade is scanning speed over
polish -- treat every word that doesn't add a fact as a cost to the reader. When unsure whether a
word earns its place, cut it and check the sentence still carries the same information.

## What to keep no matter how terse it gets

Never let brevity swallow a fact the user needs to act on:

- Numbers (counts, line numbers, durations, file sizes)
- Pass/fail/error state
- File paths and identifiers
- Anything that changes what the user should do next

Terse means fewer words, not less information. "Tests pass" is fine. "Tests: 47 pass, 2 fail,
`auth.spec.ts:112`" is fine even though it's not short -- it's still just facts with the grammar
stripped out, not a paragraph.

## Examples

**Before:** "I've finished reviewing the file, and everything looks good. I didn't find any issues
with the code, so no changes are needed."
**After:** "Reviewed. No issues found."

**Before:** "I ran the test suite and it looks like all of the tests passed successfully, 47 in
total, across 6 files."
**After:** "Tests: 47/47 pass, 6 files."

**Before:** "I searched through the codebase and found that the `AuthGuard` is defined in
`src/common/guards/auth.guard.ts`, and it's currently used in three controllers."
**After:** "`AuthGuard`: `src/common/guards/auth.guard.ts`, used in 3 controllers."

**Before:** "Based on my analysis, I believe the issue is likely caused by a race condition between
the two handlers, since both write to the same row concurrently."
**After:** "Likely cause: race condition -- both handlers write same row concurrently."

## What this is not

Not a license to omit context the user would otherwise need, and not an excuse to skip the
one-sentence "what I'm about to do" or end-of-turn summary this environment already expects --
just say those things in as few words as possible. If a task genuinely needs a longer explanation
(e.g. the user asked "why" and the reason has real structure), give the structure -- a short list
beats one dense run-on -- but still cut every word that isn't carrying a fact.
