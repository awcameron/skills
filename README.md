# agent-skills

A portable library of agent skills — genericized from real workflows built and iterated on in a
production SaaS monorepo, not written speculatively. Each skill is a plain `SKILL.md`: a
description that tells an agent when to reach for it, and a body that tells it what to actually
do.

As of 2026, Claude Code, Cursor, OpenCode, Codex CLI, and Gemini CLI have all converged on the
same shape for this — a `SKILL.md` file with YAML frontmatter, discovered from a `skills/`-style
directory. That means this repo needs **no per-tool format conversion**: one canonical `skills/`
directory, exposed to each tool through the discovery path it already looks for, plus a thin
slash-command wrapper per tool for explicit invocation.

## What's here

| Skill | What it does |
|---|---|
| [`review-code`](skills/review-code/SKILL.md) | Discovers a repo's own coding/observability standards and reviews a diff or PR against them — findings only, no auto-fix. |
| [`write-tests`](skills/write-tests/SKILL.md) | Writes real, runnable tests grounded in a repo's actual test conventions, with a hard rule: every new test must be shown to fail against the unfixed code. |
| [`create-pr`](skills/create-pr/SKILL.md) | Carries local changes through a repo's real branch → commit → push → PR workflow, discovering its naming/title conventions from its docs and history, with a confirmation checkpoint before every visible/remote action. |
| [`doc-drift-check`](skills/doc-drift-check/SKILL.md) | Cross-checks a doc's factual claims (stack, hosting, conventions, file paths) against the codebase itself — including skill files, since an agent *executes* a stale skill claim instead of just reading it. Deliberately a separate skill from `format-docs`: fact-checking prose never edits without confirmation, mechanical formatting always does. |
| [`format-docs`](skills/format-docs/SKILL.md) | Applies a repo's own Markdown formatter mechanically, and flags (without silently resolving) structural inconsistencies like prose-wrap style. |
| [`idiomatic-typescript`](skills/idiomatic-typescript/SKILL.md) | Staff-engineer-level TypeScript/JavaScript judgment calls a linter can't enforce — comment discipline, casting, function/class design, error handling, immutability — as nine short, example-driven reference files. |
| [`subagent-selection`](skills/subagent-selection/SKILL.md) | A decision checklist for which subagent type/model to spawn a task on, based on whether the task writes anything — not what it's about. |
| [`brevity`](skills/brevity/SKILL.md) | A communication-style skill: report status/summaries in terse, fact-dense language, without touching the grammar of anything meant for someone else to read (code, commits, PR bodies). |

Every skill also ships a matching slash command (`.claude/commands/<name>.md`,
`.gemini/commands/<name>.toml`) for explicit invocation instead of waiting on auto-discovery.

## Where this came from

Every skill here started as something built for a real, running product — a NestJS/React/Postgres
SaaS app — and was rewritten to drop that product's specific facts (its stack, its file layout, its
branch-naming precedent) in favor of a "discover this repo's own conventions first" step in the
same place. See [`examples/summersync-case-study.md`](examples/summersync-case-study.md) for the
concrete story behind a few of them, including a real skill-drift bug this repo's own
`doc-drift-check` skill was built to catch.

## Using this with your tool

Clone it (or add it as a submodule) into a project, then point your tool at `skills/` through
whichever path it already looks for — a symlink is enough, no copying. Setup for each tool,
including its slash commands and any tool-specific quirks, is documented separately:

- [`docs/claude-code-setup.md`](docs/claude-code-setup.md) — plugin install or symlink, plus `.claude/commands/`
- [`docs/cursor-setup.md`](docs/cursor-setup.md)
- [`docs/gemini-cli-setup.md`](docs/gemini-cli-setup.md) — native skill discovery, plus `.gemini/commands/`
- [`docs/codex-setup.md`](docs/codex-setup.md)
- [`docs/opencode-setup.md`](docs/opencode-setup.md)

Quick version, if your tool reads `.agents/skills/` (Codex CLI, Gemini CLI, OpenCode) or an
equivalent compat path (`.claude/skills/`, `.cursor/skills/`):

```bash
git clone https://github.com/<your-github-username>/agent-skills.git
cd your-project
ln -s ../agent-skills/skills .agents/skills
```

### Claude Code, as an installable plugin

This repo is also a self-contained Claude Code plugin — `.claude-plugin/plugin.json` at its root
declares `skills/` and `.claude/commands/`, so Claude Code discovers everything automatically:

```
/plugin marketplace add <your-github-username>/agent-skills
/plugin install agent-skills
```

### Global install (any tool)

Symlink individual skills (or the whole directory) into your tool's global skills path instead of
a per-project one — e.g. `~/.claude/skills/`, `~/.cursor/skills/`, `~/.agents/skills/` — to make
them available in every project without repeating the setup above.

## Contributing / adapting a skill

See [`docs/skill-anatomy.md`](docs/skill-anatomy.md) for the frontmatter and structure rules, and
run `npm run validate` before opening a PR — it checks every `skills/*/SKILL.md` for a valid,
directory-matching `name` and a description that actually states a trigger condition.

Every skill here is written to *discover* a repo's conventions rather than assume them — read a
repo's own conventions doc, check real git/GitHub history, read a couple of existing files before
writing more in the same style. None of them hardcode a stack, a file layout, or a naming
convention. If you find one that's drifted from that principle, that's worth an issue or a PR.

## License

MIT — see [LICENSE](LICENSE).
