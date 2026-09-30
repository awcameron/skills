# Merge and clean up

Two ways in, one cleanup tail:

- **This skill does the merge itself** (see "Merging" below), or
- **The user reports an external merge** -- "it's merged", "pr merged", "all merged now" -- because
  they merged it in the GitHub UI, or something else did. Don't assume the branch is already
  cleaned up just because nobody asked, and don't skip verification just because the user said
  so -- confirm it actually merged before touching branches.

## Merging (only when this skill is doing it)

Don't assume a standing authorization to merge -- confirm with the user (once up front, or per PR)
whether to merge automatically once CI is green, and which method the repo allows/prefers (squash,
merge commit, or rebase-merge; check the repo's settings or ask if unclear). Then:

```bash
gh pr checks <n>   # confirm green first
gh pr merge <n> --squash   # or whichever method was confirmed
```

**Still stop and ask before merging** when something is genuinely the user's call:

- CI isn't green, or its status can't be confirmed.
- The PR touches something the repo's conventions mark as requiring sign-off (a new dependency, a
  schema change, a convention/ADR amendment) that wasn't already confirmed in this conversation.
- A review (`review-code`, or similar) surfaced a finding that changes what the PR should contain.

## Verify, then sync (every merge, whichever path got here)

```bash
gh pr view <n> --json state,mergedAt
```

Confirm it's actually `MERGED` (not just `CLOSED`) even when the user just said so -- one call, and
it avoids deleting branches on a mistaken assumption. For "all merged" across several PRs, check
each one: a batch report can include one that didn't merge, or a branch something other than this
skill created (e.g. an automation's own PR).

```bash
git checkout <default-branch>
git pull --ff-only
```

Safe without asking -- it only catches the local default branch up to what's already public.

## Checkpoint 4 -- before deleting anything

Show the user exactly what's about to be deleted (branch names, local and/or remote) and get an
explicit yes. "It's merged" confirms the merge, not the deletion. For several merged PRs, one
combined confirmation listing every branch is fine. Once confirmed:

```bash
git branch -d <branch-name>
```

Use `-d`, not `-D`: it refuses to delete a branch that genuinely isn't merged. For a squash-merged
branch it prints a `"has been merged to 'refs/remotes/origin/<branch>' but not yet merged to HEAD"`
warning and still succeeds -- that's expected. If the remote branch was already deleted (so there's
no remote-tracking ref to check against), `-d` can refuse a squash-merged branch outright; once
`gh pr view` has confirmed `MERGED`, `-D` is safe for that branch.

Then the remote branch, if it still exists:

```bash
gh repo view --json deleteBranchOnMerge -q .deleteBranchOnMerge
```

If `false` (or unknown), delete it with `git push origin --delete <branch-name>`. If `true`, GitHub
already deleted it -- skip it. Checking this and reporting the result needs no second confirmation;
Checkpoint 4 already covered the branch, local and remote.
