# Releasing

This repo's version lives in two places that must stay in sync: `package.json` and
`.claude-plugin/plugin.json`. A small pipeline of GitHub Actions workflows handles bumping both
together and publishing a GitHub Release -- this doc is how to actually use it.

## Triggering a version bump

The bump is a manual, deliberate action (`workflow_dispatch`) -- nothing bumps the version
automatically on merge, since that would fire on every doc/chore PR.

**Via the GitHub UI:** Actions tab → **Bump version** (left sidebar) → **Run workflow** →
choose `patch`/`minor`/`major` → **Run workflow**.

**Via the `gh` CLI:**

```bash
gh workflow run bump-version.yml --repo <your-github-username>/skills -f bump=patch
```

(swap `patch` for `minor`/`major` as needed)

## What it does

1. Runs `npm run validate` and `npm run eval` -- the bump won't proceed if either fails.
2. Bumps `package.json`'s version via `npm version --no-git-tag-version` (no tag yet -- see below).
3. Runs `npm run sync-plugin-version` to copy that version into `.claude-plugin/plugin.json`.
4. Opens a PR with all three changes (`package.json`, `package-lock.json`,
   `.claude-plugin/plugin.json`) -- it does not push to `main` directly, same as every other
   change in this repo.

Merge that PR like any other. Merging it is what actually ships the new version.

## What happens on merge

`.github/workflows/release.yml` watches for pushes to `main` that touch `package.json`. Once the
bump PR merges, it reads the new version, checks whether a release for that version already exists
(so an unrelated `package.json` edit doesn't re-trigger a release), and if not, tags the commit
`v<version>` and cuts a GitHub Release with auto-generated notes. Nothing else to do -- the tag and
the release page appear on their own.

## Choosing patch / minor / major

- **Patch** -- fixes, wording/doc corrections, metadata tweaks (e.g. `plugin.json` keywords). No
  behavior or interface change.
- **Minor** -- anything additive: a new skill, a new command, expanded scope on an existing skill.
  This is what most bumps so far have been.
- **Major** -- a change that breaks something a consumer already relies on: renaming or removing a
  skill/command someone has wired up (`skills/<name>/`, `.claude/commands/<name>.md`, a compat
  symlink like `.agents/skills`), restructuring `.claude-plugin/plugin.json`'s `skills`/
  `commands`/`hooks` keys in a way older tooling can't read, or changing a skill's documented
  behavior in a way that would silently change what an agent using it does.

One caveat: this repo is still on a `0.x` line. Under semver, `0.x` means "anything may change at
any time" -- a minor bump is allowed to be breaking pre-1.0, and major is conventionally reserved
for whenever a stable `1.0.0` is declared. There's no hard requirement to major-bump a breaking
change right now, but doing so anyway is a reasonable way to signal it before that point.

## Known gaps

- **A PR opened by the bump workflow's own `GITHUB_TOKEN` doesn't trigger other workflows**
  (CI, PR title lint) -- this is GitHub's anti-recursion safeguard, not a bug. Re-run those checks
  manually on the opened PR if you want them to run before merging, or accept that `validate`/`eval`
  already ran as part of the bump step itself.
- **Requires "Allow GitHub Actions to create pull requests" enabled** for this repo (Settings →
  Actions → General → Workflow permissions). Without it, the bump step still runs and pushes the
  branch, but the final `gh pr create` call fails -- open the PR manually for that branch if this
  happens.
