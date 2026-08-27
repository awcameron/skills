---
name: create-pr
description: >-
  Take a set of local changes through a repo's real branch/commit/push/PR workflow, and sync up
  the local repo once that PR is done. Use this skill when the user asks to "open a PR", "create a
  PR", "make a pull request", "ship this branch", "submit this for review", "push this up", "put up
  a PR", "get this reviewed", or wants a branch created, changes committed, or a PR opened. Also
  covers the tail end of that workflow, when the user reports "it's done"/"that's in now" --
  confirm the PR's actual state, pull the default branch, and delete the leftover branch locally
  and on the remote. This skill discovers the repo's own branch-naming, commit-message,
  and PR-title/body conventions from its documented conventions plus its actual git/GitHub
  history -- it takes real, visible git/GitHub actions (push, `gh pr create`), so it shows the
  planned branch name, commit message, PR title, and PR body and gets explicit confirmation
  before each visible/remote step. It does not review code quality (see `review-code` for that).
allowed-tools: [Read, Grep, Glob, Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git diff:*), Bash(git log:*), Bash(git checkout:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git pull:*), Bash(gh issue view:*), Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh pr create:*), Bash(gh pr merge:*), Bash(gh pr checks:*), Bash(gh repo view:*)]
---

# Create PR

This skill carries a set of local changes through a repo's real git/GitHub workflow: figure out
the ticket, name the branch, commit, push, and open a PR — grounded in the repo's own documented
conventions plus its actual branch/PR/commit history (discovered fresh each time, not assumed
from another repo's habits). It does not judge code quality or standards compliance — that's
`review-code`'s job; run that first if there's any doubt about the change itself.

## Guardrails (do not skip)

- **Two confirmation checkpoints, not one pass-through.** Never chain straight from "make a PR" to
  a pushed branch with an open PR. Show the plan, stop, wait for an explicit yes at each
  checkpoint below. Silence or a vague "ok continue with the rest of the task" is not
  confirmation of a specific commit/push/PR action.
- Never invent a ticket number. If one can't be determined, ask — see Step 1.
- Never push directly to the default branch, and never target anything but the repo's actual
  default branch as the PR base unless the user explicitly says otherwise.
- Stay inside this skill's job. Don't fix lint/type errors, don't restructure code, don't add
  dependencies to satisfy a check — flag issues and let the user or `review-code` handle them.
- Respect whatever the repo's own conventions doc marks off-limits for an agent (never commit
  `.env` files or secrets — double-check `git status`/`git diff` output before staging — and never
  bypass a documented security boundary or a directory the repo marks as deprecated/off-limits).
  If staged changes touch any of these, stop and flag it instead of proceeding.

## Step 0: Orient

```bash
git status
git branch --show-current
git log --oneline -5
```

Confirm what's actually changed (staged, unstaged, untracked) and what branch we're starting
from. If the working tree is clean and there's nothing to commit, there's nothing for this skill
to do — say so rather than fabricating a change.

## Step 1: Determine the ticket/issue number

Not every change is tied to a ticket. Figure out which case this is, in this order:

1. **User said it directly** — "this is for #35" / "closes issue 12" — use that.
2. **Infer from the current branch**, if it's already checked out and named
   `<type>/<ticket-id>-<description>` (e.g. `feature/6-shared-audit-log` → ticket `6`).
3. **Ambiguous or absent** — ask the user rather than guessing. Don't silently decide there's no
   ticket just because none was mentioned, and don't silently invent one either.

If the user confirms there's genuinely no ticket for this change, proceed without one (Step 3
covers the branch-naming fallback).

## Step 2: Discover this repo's actual conventions

Don't assume a convention from another project — read this repo's own documented rules and its
real history before constructing anything:

1. **Read the repo's conventions doc** (`AGENTS.md`, `CONTRIBUTING.md`, or equivalent) for a
   documented branch-naming format and PR-title format, if one exists.
2. **Cross-check against real history**, since a documented convention and actual practice can
   diverge:

   ```bash
   git branch -a
   git for-each-ref --format='%(refname:short)' refs/heads refs/remotes
   gh pr list --state all --limit 50 --json title,headRefName
   ```

   Look for the actual prefix/type vocabulary used by *merged* PRs specifically — a branch or PR
   that never merged isn't real precedent for what ships, just a naming choice that didn't stick.
3. **Note if the branch-prefix vocabulary and the PR-title vocabulary are different sets of
   words** — this is common (e.g. a branch prefixed `feature/` landing as a PR titled with the
   abbreviated `feat:`) and worth confirming explicitly rather than assuming they match.
4. If nothing is documented and history is too sparse or inconsistent to infer a convention, ask
   the user what format they want rather than inventing one.

Pick the change type (new capability, bug fix, tooling/config chore, docs-only, refactor with no
behavior change, urgent hotfix) from what the change actually is, then use the discovered
vocabulary for each artifact below.

## Step 3: Construct the branch name

Using whatever format Step 2 discovered — commonly `<type>/<ticket-id>-<short-description>` in
kebab-case. Construct the short description from the actual change (a few kebab-case words, not
the full sentence). If Step 1 concluded there's no ticket, drop that segment entirely rather than
inventing a placeholder.

**Checkpoint 1 — before creating the branch:** show the user the exact branch name you're about
to create and get a yes. Then:

```bash
git checkout -b <type>/<ticket-id>-<short-description>
```

## Step 4: Stage and construct the commit

Stage deliberately — review `git status` after staging, not just before, in case something
unintended got swept in by a broad `git add -A`:

```bash
git add <specific files>
git status   # confirm only the intended files are staged
```

**Commit message**: use whatever subject-line format Step 2's history search actually showed
(commonly `<type>(<ticket-id>): <short summary>`, body wrapped at ~72-80 cols explaining what
changed and why, a `Closes #<ticket-id>` trailer). Match the vocabulary the repo's real commits
use for `<type>` — it may differ from the branch-prefix vocabulary (see Step 2). Omit the
`Closes #<ticket-id>` line entirely if Step 1 concluded there's no ticket.

**Checkpoint 2 — before committing:** show the user the exact commit subject + body you're about
to use and get a yes. Then:

```bash
git commit -m "$(cat <<'EOF'
<the confirmed message>
EOF
)"
```

## Step 5: Construct the PR title and body

Do this now, before the next checkpoint, so both are shown together.

### PR title

Use whatever format Step 2 discovered from the repo's documented convention and real merged PR
titles — commonly `<type>(<scope>): <description>` or `<type>: <description>`, with `<scope>`
included when it adds clarity (a ticket number is a safe default when one exists) and omitted
when the change doesn't map to one thing.

### PR body

Check whether the repo has a PR template (`.github/pull_request_template.md` or similar) first —
if one exists, use it. If not, read a few real recent merged PR bodies (`gh pr view <n>`) to infer
the de facto convention before improvising a generic one. A reasonable fallback shape, absent
either:

```markdown
## Summary

- <bullet per meaningful change, file/behavior-specific, not vague>
- <...>

## Known limitations

<optional -- only when something legitimately couldn't be verified in this environment. State
plainly what wasn't proven and why, don't fabricate verification. Omit this section entirely if
everything was actually verified.>

Closes #<ticket-id>

## Test plan

- [x] <a check that was actually run, e.g. `npm run build` -- clean>
- [x] <...>
- [ ] <something not verified in this environment -- leave unchecked, don't check boxes that
  weren't actually run>
```

Notes on real usage:

- **A PR that legitimately closes more than one issue needs one `Closes #N` line per issue, not
  one sentence naming both.** GitHub's closing-keyword parser only links the issue number
  immediately following the keyword — "Closes #394 (F2) and #395 (F3)" auto-closes only #394 and
  silently leaves #395 open despite the work being done. Write `Closes #394` and `Closes #395` as
  separate lines instead.
- Every `Test plan` box should reflect something actually run in this environment — never mark
  something verified that wasn't; leave a box unchecked rather than fake a check.
- Keep Summary bullets concrete (file names, behavior, not "improved the code").

## Step 6: Push and open the PR

**Checkpoint 3 (the "before pushing or opening the PR" gate) — before running either command
below:** show the user the exact PR title and full PR body from Step 5, alongside a reminder of
the branch name and commit from Checkpoints 1–2, and get an explicit yes. This is the last chance
to stop before anything becomes visible to anyone else.

```bash
git push -u origin <branch-name>
gh pr create \
  --base <repo's actual default branch> \
  --title "<confirmed title>" \
  --body "$(cat <<'EOF'
<confirmed body>
EOF
)"
```

Report the resulting PR URL back to the user once created. `gh pr create` sometimes prints a
warning about uncommitted changes when unrelated stray files sit in the working tree — don't add
a follow-up sentence explaining or dismissing that warning; just report the PR normally.

## Step 7: Merge and clean up

There are two ways this step gets reached, and they converge on the same cleanup tail:

- **This skill does the merge itself** (see "Merging" below), or
- **The user reports an external merge** — "it's merged", "pr merged", "all merged now" — because
  they merged it themselves in the GitHub UI, or something else did. This is a first-class trigger
  for this skill, not an afterthought: don't assume the branch is already cleaned up just because
  nobody asked explicitly, and don't skip verification just because the user said so — confirm it
  actually merged (see below) before touching branches.

### Merging (only when this skill is doing it)

Don't assume a standing authorization to merge without asking — confirm with the user (once, up
front, or per-PR) whether they want you to merge automatically once CI is green, and which method
their repo actually allows/prefers (squash, merge commit, or rebase-merge; check the repo's
settings or ask if unclear). Once that's established:

```bash
gh pr checks <n>   # confirm green first
gh pr merge <n> --squash   # or whichever method was confirmed
```

**Still stop and ask before merging** when the PR carries something that's genuinely the user's
call, not merge mechanics:

- CI isn't green, or its status can't be confirmed.
- The PR touches something the repo's own conventions mark as requiring sign-off (a new
  dependency, a schema change, a convention/ADR amendment) that wasn't already explicitly
  confirmed earlier in this conversation.
- A review (`review-code`, or similar) surfaced a finding that changes what the PR should contain.

### Verify, then sync and clean up (every merge, whichever path got here)

```bash
gh pr view <n> --json state,mergedAt
```

Don't skip this even when the user just told you it's merged — confirming which PR and that it's
actually `MERGED` (not just `CLOSED`) takes one call and avoids syncing/deleting branches based on
a mistaken assumption. If the user says "all merged" for several PRs at once, run this for each one
before touching any branches.

```bash
git checkout <default-branch>
git pull --ff-only
git branch -d <branch-name>
```

`git branch -d` (lowercase) is deliberate here, not `-D` — it refuses to delete a branch that
genuinely isn't merged, which is a useful safety check on top of the `gh pr view` confirmation
above. Expect it to print a `"has been merged to 'refs/remotes/origin/<branch>' but not yet merged
to HEAD"` warning and still succeed — that's normal for a squash-merged branch (the squash commit
on the default branch has a different SHA than the branch tip, so git can't verify the merge by
ancestry alone, but its remote-tracking check confirms it anyway). Treat that warning as expected,
not a sign something went wrong; only investigate if the delete actually fails.

Finally, delete the remote branch too — GitHub does not always do this automatically:

```bash
gh repo view --json deleteBranchOnMerge -q .deleteBranchOnMerge
```

If that's `false` (or the repo's setting is unknown), delete it explicitly:

```bash
git push origin --delete <branch-name>
```

If it's `true`, GitHub already deleted the remote branch on merge — skip this and don't try to
delete something that's already gone.

## Edge cases

- **Already on a feature branch with uncommitted changes**: skip Step 3 (no new branch needed),
  confirm the existing branch name matches this repo's convention (flag it if not, don't silently
  rename), and proceed from Step 4.
- **Nothing to push (branch already up to date with remote)**: skip the push in Step 6, go
  straight to `gh pr create` (still gated by Checkpoint 3).
- **A PR already exists for this branch**: don't open a duplicate — check with `gh pr view
  <branch>` first, and if one exists, tell the user instead of creating a second one.
- **"All merged" for multiple PRs at once**: run the verify-and-clean-up sequence in Step 7 once
  per PR/branch rather than assuming they're identical — a batch report can still include one that
  didn't actually merge, or a branch created by something other than this skill (e.g. an
  automation's own PR) that never got tracked as "in flight" in this conversation.
