# Agent Skills

> [Agent Skills](https://agentskills.io/home) are a lightweight, open format for extending AI
> agent capabilities with specialized knowledge and workflows.

This is a portable library of them for Claude Code, Cursor, Antigravity CLI, Codex CLI, and
OpenCode users who want their agent to discover a repo's own conventions rather than have a skill
dictate new ones. Each one started as something built and iterated on while working on a real
application, then got rewritten into a plain `SKILL.md`: a description that tells an agent when to
reach for it, and a body that tells it what to actually do.

## Table of contents

- [Get started](#get-started)
- [What's here](#whats-here)
- [Philosophy](#philosophy)
- [Contributing](#contributing)
- [License](#license)

## Get started

**Try it in a clone** — no install. The repo ships the symlinks each tool reads, so open your
tool in the clone and the skills are already there:

```bash
git clone https://github.com/awcameron/skills.git
cd skills
# open Claude Code / Codex CLI / Antigravity CLI / OpenCode / Cursor here
```

Ask for something a skill matches ("review my changes") and check that the agent names the
skill, or run a slash command directly (`/review-code` in Claude Code, `$review-code` in Codex
CLI).

**Use it in your own project** — Claude Code: install the plugin.

```
claude plugin marketplace add awcameron/skills
claude plugin install awcameron-skills
```

Cursor, Codex CLI, Antigravity CLI, OpenCode: clone anywhere, then symlink `skills/` into your
project (`~/awcameron-skills` is just an example path):

```bash
git clone https://github.com/awcameron/skills.git ~/awcameron-skills
cd your-project
mkdir -p .agents && ln -s ~/awcameron-skills/skills .agents/skills
```

For global installs and tool-specific paths, see the per-tool guides:
[Claude Code](docs/claude-code-setup.md), [Cursor](docs/cursor-setup.md),
[Codex CLI](docs/codex-setup.md), [Antigravity CLI](docs/antigravity-cli-setup.md),
[OpenCode](docs/opencode-setup.md).

**Contribute** — needs Node ≥20:

```bash
npm ci
npm run validate && npm test && npm run eval
```

Branch, commit, and PR conventions are in [AGENTS.md](AGENTS.md).

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

### Slash commands

Every skill ships a matching slash command for explicit invocation instead of waiting on
auto-discovery -- except `zero-trust-architecture`, `fullstack-feature-slice`, and
`rollout-compatibility`, which are meant to auto-trigger on ordinary feature/review/migration
requests instead. Claude Code uses `.claude/commands/<name>.md`, and the legacy Gemini CLI uses
`.gemini/commands/<name>.toml`. Antigravity CLI generates its own.

## Philosophy

There's no imposed spec→plan→build→ship pipeline and no fixed set of gates every change must
pass. Every skill here *discovers* a repo's own conventions — its stack, file layout, naming
precedent, test setup — rather than assuming or imposing them. Larger, more opinionated skill
packs bring their own process and vocabulary; this one is meant to disappear into whatever repo
it's dropped into. See
[`examples/skill-origin-case-study.md`](examples/skill-origin-case-study.md) for the concrete
story behind a few of these skills, including a real skill-drift bug this repo's own
`doc-fact-check` skill was built to catch.

## Contributing

- **Repo conventions** (branches, commits, PRs, releases): [AGENTS.md](AGENTS.md), the canonical
  contributor doc for humans and agents alike. Release steps are in
  [`docs/releasing.md`](docs/releasing.md).
- **Adding or changing a skill**: [`docs/skill-anatomy.md`](docs/skill-anatomy.md) has the
  frontmatter/structure rules and contributing checklist. Hold skills to the "discover, don't
  dictate" principle from [Philosophy](#philosophy): read a repo's own conventions doc, check
  real git/GitHub history, and never hardcode a stack, file layout, or naming convention.
- **Security and conduct**: [SECURITY.md](SECURITY.md) covers reporting a vulnerability or a
  skill whose instructions look designed to make an agent behave harmfully;
  [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) covers community standards.

## License

MIT. See [LICENSE](LICENSE).
