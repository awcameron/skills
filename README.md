# Agent Skills

> [Agent Skills](https://agentskills.io/home) are a lightweight, open format for extending AI
> agent capabilities with specialized knowledge and workflows.

This is a portable library of them for Claude Code, Cursor, Antigravity CLI, Codex CLI, and
OpenCode users who want their agent to discover a repo's own conventions rather than have a skill
dictate new ones. Each one started as something built and iterated on while working on a real
application, then got rewritten into a plain `SKILL.md`: a description that tells an agent when to
reach for it, and a body that tells it what to actually do.

```
claude plugin marketplace add awcameron/skills
claude plugin install awcameron-skills
```

Cursor, Antigravity CLI, Codex CLI, and OpenCode each have their own quick install; see
[Using this with your tool](#using-this-with-your-tool) for all five.

## Table of contents

- [What's here](#whats-here)
  - [Feature building](#feature-building)
  - [Code-quality lenses](#code-quality-lenses)
  - [The bug lifecycle](#the-bug-lifecycle)
  - [Test authoring](#test-authoring)
  - [Dependency maintenance](#dependency-maintenance)
  - [Shipping workflow](#shipping-workflow)
  - [Documentation integrity](#documentation-integrity)
  - [Agent meta-behavior](#agent-meta-behavior)
- [Philosophy](#philosophy)
- [Using this with your tool](#using-this-with-your-tool)
  - [Quick install (compat-path tools)](#quick-install-compat-path-tools)
  - [Claude Code, as an installable plugin](#claude-code-as-an-installable-plugin)
  - [Global install (any tool)](#global-install-any-tool)
- [Contributing / adapting a skill](#contributing--adapting-a-skill)
- [Releasing](#releasing)
- [License](#license)

## What's here

Grouped by what stage of work each skill acts on — see
[`docs/skill-categories.md`](docs/skill-categories.md) for the reasoning behind the grouping and
how the skills in each one hand off to each other.

### Feature building

- **[`fullstack-feature-slice`](skills/fullstack-feature-slice/SKILL.md)** — builds one feature
  across a monorepo's layers (shared contract, backend, frontend), discovering each layer's own
  convention rather than assuming a stack.

### Design documentation

- **[`create-tdd`](skills/create-tdd/SKILL.md)** — generates a Technical Design Document from a
  bundled reference template, either for a new (greenfield) design or as a retroactive writeup of
  an existing codebase.

### Code-quality lenses

Read code against a body of standards, whether writing or reviewing.

- **[`review-code`](skills/review-code/SKILL.md)** — discovers a repo's own coding/observability
  standards, then reviews a diff or PR against them with findings only (no auto-fix).
- **[`ts-best-practices`](skills/ts-best-practices/SKILL.md)** — staff-engineer-level
  TypeScript/JavaScript judgment calls a linter can't enforce, as short, example-driven reference
  files.
- **[`zero-trust-architecture`](skills/zero-trust-architecture/SKILL.md)** — never trusts a caller
  based on what layer already checked it; verifies identity and ownership explicitly across the
  whole request chain, discovered against a repo's own stack.
- **[`rollout-compatibility`](skills/rollout-compatibility/SKILL.md)** — backward/forward-compatible
  change discipline (expand-contract migrations, additive API/event changes, N/N-1 rolling-deploy
  tolerance) for a repo whose pieces deploy independently or gradually.

### The bug lifecycle

A two-step pipeline where diagnosis produces a confirmed root cause and fixing consumes it instead
of re-guessing.

- **[`diagnose-bug`](skills/diagnose-bug/SKILL.md)** — finds the confirmed root cause of a
  failing/crashing/flaky/slow bug, evidence-first, without implementing the fix.
- **[`fix-bug`](skills/fix-bug/SKILL.md)** — implements a fix from an already-confirmed root
  cause, targeting the actual cause rather than the symptom.

### Test authoring

- **[`write-tests`](skills/write-tests/SKILL.md)** — writes real, runnable tests grounded in a
  repo's actual test conventions; every new test must fail against the unfixed code first.

### Dependency maintenance

- **[`upgrade-dependency`](skills/upgrade-dependency/SKILL.md)** — bumps a dependency grounded in
  what the version jump actually changes: a real changelog read, a real usage check, real test
  results.

### Shipping workflow

- **[`create-pr`](skills/create-pr/SKILL.md)** — carries local changes through a repo's real
  branch → commit → push → PR workflow, discovering its naming/title conventions from its own
  history.

### Documentation integrity

Two orthogonal axes: factual accuracy and mechanical formatting.

- **[`doc-fact-check`](skills/doc-fact-check/SKILL.md)** — cross-checks a doc's factual claims
  (including skill files) against the codebase itself, since an agent *executes* a stale skill
  claim instead of just reading it.
- **[`format-docs`](skills/format-docs/SKILL.md)** — applies a repo's own Markdown formatter
  mechanically, flagging (not silently resolving) structural inconsistencies.

### Agent meta-behavior

Governs how the agent itself operates, not the target codebase.

- **[`choose-subagent`](skills/choose-subagent/SKILL.md)** — a decision checklist for which
  subagent type/model to spawn a task on, based on whether the task writes anything, not what
  it's about.
- **[`terse-reports`](skills/terse-reports/SKILL.md)** — reports status/summaries in terse,
  fact-dense language, without touching code, commit, or PR-body grammar.

Every skill except `zero-trust-architecture`, `fullstack-feature-slice`, and
`rollout-compatibility` also ships a matching slash command for explicit invocation instead of
waiting on auto-discovery -- a `.claude/commands/<name>.md` file for Claude Code, and (for
organizations still on the legacy, pre-Antigravity Gemini CLI) a `.gemini/commands/<name>.toml`
file. Antigravity CLI needs neither: it generates a slash command per skill automatically. These
three are the exception: they're meant to auto-trigger on ordinary feature/review/migration requests
instead.

## Philosophy

As of 2026, Claude Code, Cursor, Antigravity CLI, Codex CLI, and OpenCode have all converged on
the same shape for a skill: a `SKILL.md` file with YAML frontmatter, discovered from a
`skills/`-style directory. That means this repo needs **no per-tool format conversion** — one
canonical `skills/` directory, exposed through each tool's own discovery path:

- **Claude Code** — a plugin install, plus a thin, pre-generated slash-command file per skill for
  explicit invocation.
- **Antigravity CLI** — native skill discovery, and it generates a slash command per skill
  automatically, no file needed.
- **Cursor and Codex CLI** — their own built-in explicit-invocation UI instead (`/` search,
  `$skill-name`).
- **OpenCode** — currently relies on auto-discovery alone.

**Design principle: discover, don't dictate.** There's no imposed spec→plan→build→ship pipeline
and no fixed set of gates every change must pass. Every skill here *discovers* a repo's own
conventions — its stack, file layout, naming precedent, test setup — rather than assuming or
imposing them. Larger, more opinionated skill packs bring their own process and vocabulary; this
one is meant to disappear into whatever repo it's dropped into. See
[`examples/skill-origin-case-study.md`](examples/skill-origin-case-study.md) for the concrete
story behind a few of these skills, including a real skill-drift bug this repo's own
`doc-fact-check` skill was built to catch.

## Using this with your tool

Clone it (or add it as a submodule) into a project, then point your tool at `skills/` through
whichever path it already looks for. A symlink is enough; no copying needed. Setup for each tool,
including its slash commands and any tool-specific quirks, is documented separately:

- [`docs/claude-code-setup.md`](docs/claude-code-setup.md) — plugin install or symlink, plus `.claude/commands/`
- [`docs/cursor-setup.md`](docs/cursor-setup.md)
- [`docs/antigravity-cli-setup.md`](docs/antigravity-cli-setup.md) — native skill discovery,
  automatic slash commands, and the legacy Gemini CLI (Enterprise) path
- [`docs/codex-setup.md`](docs/codex-setup.md)
- [`docs/opencode-setup.md`](docs/opencode-setup.md)

### Quick install (compat-path tools)

If your tool reads `.agents/skills/` (Codex CLI, Antigravity CLI, OpenCode) or an equivalent
compat path (`.claude/skills/`, `.cursor/skills/`):

```bash
git clone https://github.com/awcameron/skills.git
cd your-project
ln -s ../skills/skills .agents/skills
```

### Claude Code, as an installable plugin

This repo is also a self-contained Claude Code plugin. `.claude-plugin/plugin.json` at its root
declares `skills/` and `.claude/commands/`, so Claude Code discovers both automatically. It also
auto-loads `hooks/hooks.json` from its standard path (no `plugin.json` declaration needed),
injecting a one-line-per-skill catalog into every new session via a `SessionStart` hook:

```
claude plugin marketplace add awcameron/skills
claude plugin install awcameron-skills
```

See [`docs/claude-code-setup.md`](docs/claude-code-setup.md) for the in-session slash-command
form, and the symlink caveat if you install without the plugin system (the `SessionStart` catalog
hook needs manual wiring in that case; see [`hooks/README.md`](hooks/README.md)).

### Global install (any tool)

Symlink individual skills (or the whole directory) into your tool's global skills path instead of
a per-project one, e.g. `~/.claude/skills/`, `~/.cursor/skills/`, `~/.agents/skills/`, to make them
available in every project without repeating the setup above.

## Contributing / adapting a skill

For this repo's own branch/commit/PR/release conventions (as opposed to skill content itself),
see [AGENTS.md](AGENTS.md) — it's the canonical contributor doc, for humans and agents alike.

For adding or changing a skill itself, see [`docs/skill-anatomy.md`](docs/skill-anatomy.md) for
the frontmatter/structure rules and the step-by-step contributing checklist.

Hold new and existing skills to the "discover, don't dictate" principle above: a skill should read
a repo's own conventions doc, check real git/GitHub history, and read a couple of existing files
before writing more in the same style. Never hardcode a stack, a file layout, or a naming
convention. If you find one that's drifted from that, that's worth an issue or a PR.

## Releasing

See [`docs/releasing.md`](docs/releasing.md) for how to bump the version and cut a GitHub Release.
It's a manual `workflow_dispatch` step, not something that happens automatically on merge.

## Security and conduct

See [SECURITY.md](SECURITY.md) for reporting a vulnerability or a skill whose instructions look
designed to make an agent behave harmfully, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for
community standards.

## License

MIT. See [LICENSE](LICENSE).
