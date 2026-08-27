# Releasing

This repo's version lives in two places that must stay in sync: `package.json` and
`.claude-plugin/plugin.json`. A small pipeline of GitHub Actions workflows handles bumping both
together and publishing a GitHub Release — this doc is how to actually use it.

## Triggering a version bump

The bump is a manual, deliberate action (`workflow_dispatch`) — nothing bumps the version
automatically on merge, since that would fire on every doc/chore PR.

**Via the GitHub UI:** Actions tab → **Bump version** (left sidebar) → **Run workflow** → choose
`patch`/`minor`/`major` → **Run workflow**.

**Via the `gh` CLI:**

```bash
gh workflow run bump-version.yml --repo <your-github-username>/agent-skills -f bump=patch
```

(swap `patch` for `minor`/`major` as needed)

## What it does

1. Runs `npm run validate` and `npm run eval` — the bump won't proceed if either fails.
2. Bumps `package.json`'s version via `npm version --no-git-tag-version` (no tag yet — see below).
3. Runs `npm run sync-plugin-version` to copy that version into `.claude-plugin/plugin.json`.
4. Opens a PR with both changes — it does not push to `main` directly, same as every other change
   in this repo.

Merge that PR like any other. Merging it is what actually ships the new version.

## What happens on merge

`.github/workflows/release.yml` watches for pushes to `main` that touch `package.json`. Once the
bump PR merges, it reads the new version, checks whether a release for that version already exists
(so an unrelated `package.json` edit doesn't re-trigger a release), and if not, tags the commit
`v<version>` and cuts a GitHub Release with auto-generated notes. Nothing else to do — the tag and
the release page appear on their own.

## Known gaps

- **The bump PR's branch isn't auto-deleted on merge.** Same as any PR in this repo — check
  `gh repo view --json deleteBranchOnMerge`, and if it's `false`, delete
  `chore/bump-version-<version>` manually (local + remote) after merging, the same as any other
  branch (see `create-pr`'s post-merge cleanup step).
- **A PR opened by the bump workflow's own `GITHUB_TOKEN` doesn't trigger other workflows**
  (CI, PR title lint) — this is GitHub's anti-recursion safeguard, not a bug. Re-run those checks
  manually on the opened PR if you want them to run before merging, or accept that `validate`/`eval`
  already ran as part of the bump step itself.
- **Requires "Allow GitHub Actions to create pull requests" enabled** for this repo (Settings →
  Actions → General → Workflow permissions). Without it, the bump step still runs and pushes the
  branch, but the final `gh pr create` call fails — open the PR manually for that branch if this
  happens.
