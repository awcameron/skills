# AGENTS.md

This file is for developing *this* repo (agent-skills itself) — an agent or human contributing a
skill, doc, or workflow change here. It is not the skill content this repo distributes to
consumers; see [README.md](README.md) for what this repo is and how it's consumed.

## Before you start

- Skill structure and frontmatter rules: [`docs/skill-anatomy.md`](docs/skill-anatomy.md).
- This repo's design principle ("discover, don't dictate") is stated in [README.md](README.md) —
  hold new and existing skills to it.
- Before opening a PR, run:
  ```bash
  npm run validate   # skill frontmatter is well-formed
  npm run eval        # trigger-routing hasn't regressed -- see evals/README.md
  ```

## Branching, commits, and PRs

Nothing is pushed directly to `main` — every change, including a one-line doc fix, lands via PR.

- **PR title / commit format**: Conventional Commits, enforced by
  [`.github/workflows/pr-title-lint.yml`](.github/workflows/pr-title-lint.yml) —
  `<type>(<scope>): <subject>`, subject not capitalized. Valid types: `feat`, `fix`, `docs`,
  `chore`, `refactor`, `test`, `style`, `perf`, `ci`, `build`, `revert`. By convention (see git
  log), `<scope>` is the skill name touched (e.g. `feat(ts-best-practices): ...`); omit the
  scope entirely for a change that spans the repo rather than one skill (e.g. `ci: ...`,
  `chore: ...`).
- **Step-by-step mechanics** (branch naming, confirmation checkpoints before each visible/remote
  action, commit body shape, PR body template): use the `create-pr` skill
  ([`skills/create-pr/SKILL.md`](skills/create-pr/SKILL.md)). It's written generically for any
  repo it's dropped into, but it is exactly the process this repo itself follows.

## CI coverage gap

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`npm run validate` + `npm run eval`) runs
on PRs/pushes touching `skills/**`, `evals/**`, `scripts/**`, `package.json`, or any `.md` file. A
workflow-only PR (e.g. editing a `.github/workflows/*.yml` file with no accompanying doc/skill
change) still gets no automated check — review those by hand before merging.

## Post-merge cleanup

After a PR merges (whether merged here or reported by the user as done elsewhere):

```bash
gh pr view <n> --json state,mergedAt   # confirm it actually merged
git checkout main && git pull --ff-only
git branch -d <branch>                  # a "not fully merged" warning here is expected/benign
                                         # on a squash-merge -- the delete still succeeds
gh repo view --json deleteBranchOnMerge -q .deleteBranchOnMerge   # currently false for this repo
git push origin --delete <branch>       # only if the above is false
```

See `create-pr`'s own "Merge and clean up" step for the full mechanism.

## Versioning and releases

Version lives in both `package.json` and `.claude-plugin/plugin.json`, kept in sync via
`npm run sync-plugin-version`. Full bump/release pipeline: [`docs/releasing.md`](docs/releasing.md).

## Where things live

- `skills/` — canonical skill content.
- `.claude/commands/`, `.gemini/commands/` — thin per-tool slash-command wrappers.
- `.agents/skills/`, `.claude/skills/`, `.codex/skills/` — symlinks back to `skills/`, for tools
  that discover skills from those paths directly.
- `evals/` — the trigger-routing eval system; see [`evals/README.md`](evals/README.md).
- `hooks/` — the SessionStart hook; see [`hooks/README.md`](hooks/README.md).
- `docs/*-setup.md` — per-tool consumer setup instructions (not relevant to developing this repo).
