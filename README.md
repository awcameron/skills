# Agent Skills

A portable library of **8 agent skills** — genericized from real workflows built and iterated on
in a substantial, real-world production codebase, not written speculatively. Each skill is a
plain `SKILL.md`: a description that tells an agent when to reach for it, and a body that tells
it what to actually do.

As of 2026, Claude Code, Cursor, OpenCode, Codex CLI, and Gemini CLI have all converged on the
same shape for this — a `SKILL.md` file with YAML frontmatter, discovered from a `skills/`-style
directory. That means this repo needs **no per-tool format conversion**: one canonical `skills/`
directory, exposed to each tool through the discovery path it already looks for, plus a thin
slash-command wrapper per tool for explicit invocation.

**Design principle: discover, don't dictate.** This isn't a prescriptive lifecycle framework —
there's no imposed spec→plan→build→ship pipeline, no fixed set of gates every change must pass.
Every skill here is written to *discover* a repo's own conventions (its stack, its file layout,
its naming precedent, its actual test setup) rather than assume or impose them. That's a
deliberate difference from larger, more opinionated skill packs, which tend to bring their own
process and vocabulary; this one is meant to disappear into whatever repo it's dropped into. See
[Where this came from](#where-this-came-from) for the concrete story behind that choice.

## Table of contents

- [What's here](#whats-here)
- [Where this came from](#where-this-came-from)
- [Using this with your tool](#using-this-with-your-tool)
- [Contributing / adapting a skill](#contributing--adapting-a-skill)
- [Releasing](#releasing)
- [License](#license)

## What's here

| Skill | What it does |
|---|---|
| [`review-code`](skills/review-code/SKILL.md) | Discovers a repo's own coding/observability standards and reviews a diff or PR against them — findings only, no auto-fix. |
| [`write-tests`](skills/write-tests/SKILL.md) | Writes real, runnable tests grounded in a repo's actual test conventions, with a hard rule: every new test must be shown to fail against the unfixed code. |
| [`diagnose-bug`](skills/diagnose-bug/SKILL.md) | Finds the confirmed root cause of a failing/crashing/flaky/slow bug -- evidence first, a minimal repro, one falsifiable hypothesis at a time -- and reports it with proof, without implementing the fix. |
| [`fix-bug`](skills/fix-bug/SKILL.md) | Implements a fix from an already-confirmed root cause, targeting the actual cause rather than the symptom and checking for the same defect shape elsewhere -- then hands off to `write-tests`/`review-code`/`create-pr` instead of duplicating them. |
| [`upgrade-dependency`](skills/upgrade-dependency/SKILL.md) | Bumps a dependency grounded in what the version jump actually changes -- reads the real changelog across the range crossed, checks the repo for real usage of anything flagged as breaking, and separates genuine breakage from unrelated noise. |
| [`create-pr`](skills/create-pr/SKILL.md) | Carries local changes through a repo's real branch → commit → push → PR workflow, discovering its naming/title conventions from its docs and history, with a confirmation checkpoint before every visible/remote action. |
| [`doc-fact-check`](skills/doc-fact-check/SKILL.md) | Cross-checks a doc's factual claims (stack, hosting, conventions, file paths) against the codebase itself — including skill files, since an agent *executes* a stale skill claim instead of just reading it. Deliberately a separate skill from `format-docs`: fact-checking prose never edits without confirmation, mechanical formatting always does. |
| [`format-docs`](skills/format-docs/SKILL.md) | Applies a repo's own Markdown formatter mechanically, and flags (without silently resolving) structural inconsistencies like prose-wrap style. |
| [`ts-best-practices`](skills/ts-best-practices/SKILL.md) | Staff-engineer-level TypeScript/JavaScript judgment calls a linter can't enforce — comment discipline, casting, function/class design, error handling, immutability, type narrowing, type design — as short, example-driven reference files. |
| [`choose-subagent`](skills/choose-subagent/SKILL.md) | A decision checklist for which subagent type/model to spawn a task on, based on whether the task writes anything — not what it's about. |
| [`terse-reports`](skills/terse-reports/SKILL.md) | A communication-style skill: report status/summaries in terse, fact-dense language, without touching the grammar of anything meant for someone else to read (code, commits, PR bodies). |

Every skill also ships a matching slash command (`.claude/commands/<name>.md`,
`.gemini/commands/<name>.toml`) for explicit invocation instead of waiting on auto-discovery.

## Where this came from

Every skill here started as something built for a real, actively-developed production codebase —
not a toy or a demo — and was rewritten to drop that project's specific facts (its stack, its file
layout, its branch-naming precedent) in favor of a "discover this repo's own conventions first"
step in the same place. See [`examples/skill-origin-case-study.md`](examples/skill-origin-case-study.md)
for the concrete story behind a few of them, including a real skill-drift bug this repo's own
`doc-fact-check` skill was built to catch.

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
declares `skills/`, `.claude/commands/`, and `hooks/`, so Claude Code discovers everything
automatically, including a `SessionStart` hook that injects a one-line-per-skill catalog into
every new session:

```
/plugin marketplace add <your-github-username>/agent-skills
/plugin install agent-skills
```

Symlinked in instead of installed as a plugin? The hook isn't auto-discovered outside the plugin
system — see [`hooks/README.md`](hooks/README.md) to wire it into your project's own
`.claude/settings.json`.

### Global install (any tool)

Symlink individual skills (or the whole directory) into your tool's global skills path instead of
a per-project one — e.g. `~/.claude/skills/`, `~/.cursor/skills/`, `~/.agents/skills/` — to make
them available in every project without repeating the setup above.

## Contributing / adapting a skill

For this repo's own branch/commit/PR/release conventions (as opposed to skill content itself),
see [AGENTS.md](AGENTS.md).

See [`docs/skill-anatomy.md`](docs/skill-anatomy.md) for the frontmatter and structure rules, and
run these two before opening a PR:

```bash
npm run validate   # frontmatter is well-formed: valid name, directory match, a stated trigger
npm run eval       # your positive/negative evals/cases/<skill>.json prompts actually route right
```

`npm run eval` is a deterministic (no LLM call) trigger-routing check — see
[`evals/README.md`](evals/README.md) for what it does and doesn't catch. Add a case file for any
new skill; it's what actually caught and fixed a real description collision during this repo's
own build (see that README's own example).

Hold new and existing skills to the "discover, don't dictate" principle above: a skill should read
a repo's own conventions doc, check real git/GitHub history, and read a couple of existing files
before writing more in the same style — never hardcode a stack, a file layout, or a naming
convention. If you find one that's drifted from that, that's worth an issue or a PR.

## Releasing

See [`docs/releasing.md`](docs/releasing.md) for how to bump the version and cut a GitHub Release
— it's a manual `workflow_dispatch` step, not something that happens automatically on merge.

## License

MIT — see [LICENSE](LICENSE).
