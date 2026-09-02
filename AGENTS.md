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

**PR title / commit format**: Conventional Commits, enforced by
[`.github/workflows/pr-title-lint.yml`](.github/workflows/pr-title-lint.yml) —
`<type>(<scope>): <subject>`, subject not capitalized. Valid types: `feat`, `fix`, `docs`,
`chore`, `refactor`, `test`, `style`, `perf`, `ci`, `build`, `revert`.

By convention (see git log), `<scope>` is whatever the change is actually about:

- the skill name touched, for a change inside `skills/<name>/` (e.g. `feat(ts-best-practices): ...`)
- the doc's filename, for a change to one doc (e.g. `docs(skill-anatomy): ...`, `docs(readme): ...`)
  — the more common case for `docs` commits in practice
- omitted entirely, for a change that spans the repo rather than one skill or doc
  (e.g. `ci: ...`, `chore: ...`)

**Step-by-step mechanics** (branch naming, confirmation checkpoints before each visible/remote
action, commit body shape, PR body template): use the `create-pr` skill
([`skills/create-pr/SKILL.md`](skills/create-pr/SKILL.md)). It's written generically for any
repo it's dropped into, but it is exactly the process this repo itself follows.

## CI coverage gap

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`npm run validate` + `npm run eval`) runs
on PRs/pushes touching `skills/**`, `evals/**`, `scripts/**`, `package.json`, or any `.md` file. A
change outside those paths gets no automated check at all — review those by hand before merging.
Two real cases:

- A `.github/workflows/*.yml`-only PR (no accompanying doc/skill change).
- A `hooks/*.sh` or `hooks/hooks.json` change — `hooks/` isn't in the CI path filter either, so
  `session-start.sh`'s actual logic is only ever checked by the manual
  `bash hooks/session-start.sh | python3 -m json.tool` in [`hooks/README.md`](hooks/README.md),
  not CI.

## Post-merge cleanup

After a PR merges (whether merged here or reported by the user as done elsewhere), verify it
actually merged before touching branches, then clean up — see the `create-pr` skill's own "Merge
and clean up" step ([`skills/create-pr/SKILL.md`](skills/create-pr/SKILL.md)) for the full
mechanism. One fact the skill can't hardcode since it's written generically: `deleteBranchOnMerge`
is currently `false` for this repo, so the remote branch needs an explicit
`git push origin --delete <branch>` too, not just the local `git branch -d`.

## Versioning and releases

Version lives in both `package.json` and `.claude-plugin/plugin.json`, kept in sync via
`npm run sync-plugin-version`. Full bump/release pipeline: [`docs/releasing.md`](docs/releasing.md).

## Where things live

- `skills/` — canonical skill content.
- `.claude/commands/`, `.gemini/commands/` — thin per-tool slash-command wrappers.
- `.agents/skills/`, `.claude/skills/` — symlinks back to `skills/`, for tools that discover
  skills from those paths directly.
- `.codex/skills/` — same symlink target, kept for legacy/defensive coverage; Codex CLI's own
  docs say it reads `.agents/skills`, not this path, and no confirmed tool actually discovers
  skills from `.codex/skills/` (see `docs/codex-setup.md`, which never references it).
- `evals/` — the trigger-routing eval system; see [`evals/README.md`](evals/README.md).
- `hooks/` — the SessionStart hook; see [`hooks/README.md`](hooks/README.md).
- `docs/*-setup.md` — per-tool consumer setup instructions (not relevant to developing this repo).
