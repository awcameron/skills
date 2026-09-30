---
name: create-pr
description: >-
  Take local changes through a repo's real branch, commit, push, and PR workflow, using the naming
  conventions it finds in the repo's docs and git/GitHub history, and confirm before each visible
  step. Use when the user asks to "open a PR", "create a PR", "ship this branch", "push this up", or
  "get this reviewed" -- or reports a PR is merged ("it's merged", "that's in now") and the branches
  need cleaning up.
allowed-tools: [Read, Grep, Glob, Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git diff:*), Bash(git log:*), Bash(git checkout:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git pull:*), Bash(gh issue view:*), Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh pr create:*), Bash(gh pr merge:*), Bash(gh pr checks:*), Bash(gh repo view:*)]
---

# Create PR

This skill carries a set of local changes through a repo's real git/GitHub workflow: figure out
the ticket, name the branch, commit, push, and open a PR -- grounded in the repo's own documented
conventions plus its actual merged-PR history, discovered fresh each time. It does not judge code
quality or standards compliance -- that's `review-code`'s job.

**The user reports a merge** ("it's merged", "that's in now"), or asks this skill to merge: skip
Steps 0-6 and follow [`references/merge-and-cleanup.md`](references/merge-and-cleanup.md) --
verify the merge, sync the default branch, then confirm before deleting branches (Checkpoint 4).

```
Step 0 Orient (+ existing PR?)
Step 1 Determine ticket
Step 2 Discover conventions
Step 3 Branch name  --[Checkpoint 1]--> git checkout -b
Step 4 Commit       --[Checkpoint 2]--> git commit
Step 5 PR title + body
Step 6 Push + PR    --[Checkpoint 3]--> git push, gh pr create
Step 7 Merge and clean up --> references/merge-and-cleanup.md
```

## Guardrails (do not skip)

- **Confirmation checkpoints, not one pass-through.** Never chain straight from "make a PR" to a
  pushed branch with an open PR, and never from "it's merged" to deleted branches. Show the plan,
  stop, and wait for an explicit yes at each checkpoint. Silence or a vague "ok continue" is not
  confirmation of a specific commit/push/PR/delete.
  - **Combined checkpoint, opt-in only:** if the user asks to see everything at once ("show me the
    whole plan and I'll confirm once"), present Checkpoints 1-3 together -- branch name, commit
    message, PR title and body -- and treat one explicit yes as covering all three. Otherwise keep
    them separate.
- Never invent a ticket number. If one can't be determined, ask -- see Step 1.
- Never push directly to the default branch, and never target anything but the repo's actual
  default branch as the PR base unless the user explicitly says otherwise.
- Stay inside this skill's job. Don't fix lint/type errors, restructure code, or add dependencies
  to satisfy a check -- flag issues and let the user or `review-code` handle them.
- Respect whatever the repo's conventions doc marks off-limits (never commit `.env` files or
  secrets -- check `git status`/`git diff` before staging -- and never bypass a documented security
  boundary or a directory marked deprecated/off-limits). If staged changes touch any of these, stop
  and flag it.

## Step 0: Orient

```bash
git status
git branch --show-current
git log --oneline -5
```

Confirm what's changed (staged, unstaged, untracked) and which branch we're on. If the working
tree is clean and there's nothing to commit or push, say so rather than fabricating a change.

If already on a non-default branch, check for an open PR now, before building anything:

```bash
gh pr view --json number,url,state
```

If one is open, tell the user and push to it instead of opening a duplicate. Being on a feature
branch also means skipping Step 3 -- confirm the existing name matches the repo's convention (flag
it if not; don't silently rename).

## Step 1: Determine the ticket/issue number

Not every change is tied to a ticket. In this order:

1. **User said it directly** -- "this is for #35" / "closes issue 12" -- use that.
2. **Infer from the current branch**, if it's named `<type>/<ticket-id>-<description>` (e.g.
   `feature/6-shared-audit-log` → ticket `6`).
3. **Ambiguous or absent** -- ask rather than guessing. Don't silently decide there's no ticket,
   and don't invent one.

If the user confirms there's no ticket, proceed without one.

## Step 2: Discover this repo's actual conventions

1. **Read the repo's conventions doc** (`AGENTS.md`, `CONTRIBUTING.md`, or equivalent) for a
   documented branch-naming and PR-title format.
2. **Cross-check against merged history** -- documented convention and actual practice can
   diverge, and only merged PRs are real precedent:

   ```bash
   gh pr list --state merged --limit 20 --json title,headRefName
   ```

   That one call gives both the branch-name and PR-title vocabulary. If the repo squash-merges,
   the titles are also the commit subjects on the default branch.
3. **Note if branch prefixes and PR-title types use different words** (e.g. branch `feature/`
   landing as `feat:`) -- confirm rather than assume they match.
4. If nothing is documented and history is too sparse or inconsistent, ask the user what format
   they want.

Pick the change type (feature, fix, chore, docs, refactor, hotfix) from what the change actually
is, then use the discovered vocabulary for each artifact below.

## Step 3: Construct the branch name

Use Step 2's format -- commonly `<type>/<ticket-id>-<short-description>`, with a few kebab-case
words describing the change. With no ticket, drop that segment rather than inventing a placeholder.

**Checkpoint 1 -- before creating the branch:** show the exact branch name and get a yes. Then:

```bash
git checkout -b <type>/<ticket-id>-<short-description>
```

## Step 4: Stage and construct the commit

Stage specific files, then re-check -- a broad `git add -A` can sweep in something unintended:

```bash
git add <specific files>
git status   # confirm only the intended files are staged
```

**Commit message**: match the subject format Step 2 found (commonly `<type>(<ticket-id>): <short
summary>`), with a body wrapped at ~72-80 cols explaining what changed and why, and a
`Closes #<ticket-id>` trailer when there's a ticket.

**Checkpoint 2 -- before committing:** show the exact subject and body and get a yes. Then:

```bash
git commit -m "$(cat <<'EOF'
<the confirmed message>
EOF
)"
```

## Step 5: Construct the PR title and body

Do this before the next checkpoint, so both are shown together.

**Title:** Step 2's format -- commonly `<type>(<scope>): <description>` or `<type>: <description>`,
with a scope only when it adds clarity.

**Body:** use the repo's PR template (`.github/pull_request_template.md` or similar) if one exists;
otherwise match a recent merged PR body (`gh pr view <n>`); otherwise this shape:

```markdown
## Summary

- <bullet per meaningful change, file/behavior-specific, not vague>

## Known limitations

<only when something couldn't be verified here -- say plainly what and why; omit otherwise>

Closes #<ticket-id>

## Test plan

- [x] <a check that was actually run, e.g. `npm run build` -- clean>
- [ ] <something not verified in this environment -- leave unchecked>
```

- **One `Closes #N` line per issue.** GitHub only links the number right after the keyword --
  "Closes #394 and #395" closes only #394.
- Only check a `Test plan` box for something actually run; leave it unchecked otherwise.
- Keep Summary bullets concrete (file names, behavior, not "improved the code").

## Step 6: Push and open the PR

**Checkpoint 3 -- before pushing or opening the PR:** show the exact PR title and full body, with
a reminder of the branch name and commit, and get an explicit yes. This is the last chance to stop
before anything is visible to anyone else.

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

Skip the push if the branch is already up to date with its remote. Report the PR URL once
created. If `gh pr create` warns about uncommitted changes from unrelated stray files, just report
the PR normally -- don't add a sentence explaining the warning.

## Step 7: Merge and clean up

When the PR merges -- or the user asks this skill to merge it -- follow
[`references/merge-and-cleanup.md`](references/merge-and-cleanup.md).
