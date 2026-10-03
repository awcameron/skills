# AGENTS.md

This file is for developing *this* repo (skills itself) -- an agent or human contributing a
skill, doc, or workflow change here. It is not the skill content this repo distributes to
consumers; see [README.md](README.md) for what this repo is and how it's consumed.

## Table of Contents
- [Before you start](#before-you-start)
- [Branching, commits, and PRs](#branching-commits-and-prs)
- [CI coverage gap](#ci-coverage-gap)
- [Post-merge cleanup](#post-merge-cleanup)
- [Versioning and releases](#versioning-and-releases)
- [Where things live](#where-things-live)

## Before you start

- Skill structure and frontmatter rules: [`docs/skill-anatomy.md`](docs/skill-anatomy.md).
- This repo's design principle ("discover, don't dictate") is stated in [README.md](README.md) --
  hold new and existing skills to it.
- Before opening a PR, run:
  ```bash
  npm ci              # once per clone/dependency change -- validate depends on ajv + js-yaml
  npm run validate    # skill frontmatter (incl. schemas/skill-frontmatter.schema.json) and the
                       # .claude-plugin manifests (schemas/plugin-manifest.schema.json,
                       # schemas/marketplace-registry.schema.json) are well-formed, and
                       # package.json / package-lock.json / plugin.json versions agree,
                       # the plugin descriptions in package.json / plugin.json /
                       # marketplace.json match,
                       # and README's "What's here" lists every skill
  npm run eval        # trigger-routing hasn't regressed -- see evals/README.md
  ```

### For AI Agents (Subagent Delegation Rules)
- Do NOT spawn subagents for single-file reads, minor edits, or standard terminal commands.
- Reserve subagent spawning exclusively for multi-file research tasks or heavy parallel test
  execution.

### For Human Contributors
- Route routine search/scan subagents to Haiku by setting your environment variable:
  `CLAUDE_CODE_SUBAGENT_MODEL="haiku"`.

## Branching, commits, and PRs

Nothing is pushed directly to `main` -- every change, including a one-line doc fix, lands via PR.

**PR title / commit format**: Conventional Commits, enforced by
[`.github/workflows/pr-title-lint.yml`](.github/workflows/pr-title-lint.yml) --
`<type>(<scope>): <subject>`. Subject casing isn't restricted.

Valid types:
* `feat`: New features
* `fix`: Bug fixes
* `docs`: Documentation only changes
* `chore`: Maintenance tasks
* `refactor`: Code changes that neither fix a bug nor add a feature
* `test`: Adding or correcting tests
* `style`: Formatting, missing semi-colons, etc.
* `perf`: Code changes that improve performance
* `ci`: CI configuration changes
* `build`: Build system or external dependency changes
* `revert`: Reverting a previous commit

By convention (see git log), `<scope>` is whatever the change is actually about:

- the skill name touched, for a change inside `skills/<name>/` (e.g. `feat(ts-best-practices): ...`)
- the doc's filename, for a change to one doc (e.g. `docs(skill-anatomy): ...`, `docs(readme): ...`)
  -- the more common case for `docs` commits in practice
- omitted entirely, for a change that spans the repo rather than one skill or doc
  (e.g. `ci: ...`, `chore: ...`)

**Step-by-step mechanics** (branch naming, confirmation checkpoints before each visible/remote
action, commit body shape, PR body template): use the `create-pr` skill
([`skills/create-pr/SKILL.md`](skills/create-pr/SKILL.md)). It's written generically for any
repo it's dropped into, but it is exactly the process this repo itself follows.

## CI coverage gap

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`npm run validate` + `npm test` +
`npm run eval`) only runs if your PR touches the following allowlisted paths: `skills/**`,
`evals/**`, `plugin-evals/**`, `scripts/**`, `schemas/**`, `.claude-plugin/**`,
`.gemini/commands/**`, `package.json`, `package-lock.json`, `ci.yml` itself, or any `.md` file.

A change outside this allowlist gets no automated check at all -- review those by hand before
merging. The real case: a PR touching only the other workflows (`bump-version.yml`,
`release.yml`, `pr-title-lint.yml`), which the checks don't exercise anyway.

## Pinned actions

Every `uses:` in `.github/workflows/` names a full commit SHA with its version in a trailing
comment (`actions/checkout@<sha> # v5.1.0`), so a moved or hijacked tag can't change what the
workflows run. Pin any new action the same way. Dependabot
([`.github/dependabot.yml`](.github/dependabot.yml)) opens a monthly `ci:` PR to move the pins.

## Post-merge cleanup

After a PR merges (whether merged here or reported by the user as done elsewhere), verify it
actually merged before touching branches, then clean up -- see the `create-pr` skill's
[`references/merge-and-cleanup.md`](skills/create-pr/references/merge-and-cleanup.md) for the full
mechanism. One fact the skill can't hardcode since it's written generically: this repo has
"Automatically delete head branches" on (`deleteBranchOnMerge` is `true`), so GitHub deletes the
remote branch on merge and only the local branch needs deleting. The skill's own runtime check
confirms this before it touches the remote.

## Versioning and releases

Version lives in `package.json`, `package-lock.json`, and `.claude-plugin/plugin.json`. The bump
workflow keeps all three in sync, and `npm run validate` fails if they ever disagree. Full
bump/release pipeline: [`docs/releasing.md`](docs/releasing.md).

## Where things live

- `skills/` -- canonical skill content.
- `.claude-plugin/`
  - Contains `plugin.json` (versioned metadata: `skills`/`commands` paths, kept in sync with
    `package.json`, see "Versioning and releases" above).
  - Contains `marketplace.json` (what `/plugin marketplace add awcameron/skills` actually reads).
- `.claude/commands/`, `.gemini/commands/` -- thin per-tool slash-command wrappers.
- `.agents/skills/`, `.claude/skills/` -- symlinks back to `skills/`, for tools that discover
  skills from those paths directly.
- `.codex/skills/`
  - Same symlink target, kept for legacy/defensive coverage.
  - Codex CLI's own docs say it reads `.agents/skills`, not this path.
  - No confirmed tool actually discovers skills from `.codex/skills/` (see
    `docs/codex-setup.md`, which never references it).
- `evals/` -- the trigger-routing eval system; see [`evals/README.md`](evals/README.md).
- `plugin-evals/` -- behavioral `claude plugin eval` cases. Opt-in: each run costs money, so no
  routine check runs them -- don't run them unless asked. See
  [`plugin-evals/README.md`](plugin-evals/README.md).
- `docs/*-setup.md` -- per-tool consumer setup instructions (not relevant to developing this repo).
- `scripts/skill-usage.js` -- maintainer-only usage-logging hook and report (which skills run, and
  whether by auto-trigger or slash command). Not shipped in the plugin; setup is in its header.
