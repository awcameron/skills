# Agent Skills

> [Agent Skills](https://agentskills.io/home) are a lightweight, open format for extending AI
> agent capabilities with specialized knowledge and workflows.

This is a portable library of them for Claude Code, Cursor, Codex CLI, Antigravity CLI, and
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

**Prerequisites:** `git`, plus the [GitHub CLI](https://cli.github.com/) (`gh`), logged in with
`gh auth login`. Some skills (`create-pr`, `review-code`, `write-tests`, and a few others) read
PRs, issues, or repo settings through `gh`. Without it they fall back to plain `git` where they
can, and stop where they can't.

To use it in your own project:

**Claude Code:** install the plugin.

```bash
claude plugin marketplace add awcameron/skills
claude plugin install awcameron-skills@awcameron-skills
```

**Cursor, Codex CLI, Antigravity CLI, OpenCode:** clone anywhere, then symlink `skills/` into your
project (`~/awcameron-skills` is just an example path):

```bash
git clone https://github.com/awcameron/skills.git ~/awcameron-skills
cd your-project
mkdir -p .agents && ln -s ~/awcameron-skills/skills .agents/skills
```

Then open your tool in the project and ask for something a skill matches ("review my changes");
the agent should name the skill. For global installs, tool-specific paths, and how to check it's
working, see the per-tool guides: [Claude Code](docs/claude-code-setup.md),
[Cursor](docs/cursor-setup.md), [Codex CLI](docs/codex-setup.md),
[Antigravity CLI](docs/antigravity-cli-setup.md), [OpenCode](docs/opencode-setup.md).

**Or try it in a clone** -- no install. The repo ships the symlinks each tool reads, so open your
tool in the clone and the skills are already there:

```bash
git clone https://github.com/awcameron/skills.git
cd skills
# open Claude Code / Cursor / Codex CLI / Antigravity CLI / OpenCode here
```

**Run a skill directly** instead of waiting for it to trigger: `/review-code` in Claude Code and
Antigravity CLI, `$review-code` in Codex CLI, or `/` then the skill name in Cursor's Agent chat.
In OpenCode the agent loads skills itself, so there's no way to run one directly.

**Update**

Claude Code plugin -- refresh the marketplace, update the plugin, then restart Claude Code:

```bash
claude plugin marketplace update awcameron-skills   # the marketplace
claude plugin update awcameron-skills               # the plugin (same name)
```

Any clone (symlinked or tried in place): run `git pull` in the clone.

## What's here

Each skill triggers on its own when a request matches it, and the "Stage" column says what part of
the work it acts on. [`docs/skill-categories.md`](docs/skill-categories.md) explains the stages
and how skills hand off to each other.

| Skill | Use it when | Stage |
|---|---|---|
| [`fullstack-feature-slice`](skills/fullstack-feature-slice/SKILL.md) | Building one feature across a monorepo's layers (shared contract, backend, frontend), following each layer's own conventions. | Feature building |
| [`create-tdd`](skills/create-tdd/SKILL.md) | Writing a technical design doc or RFC, greenfield or for existing code, from your template or the repo's own (with a bundled fallback). | Design documentation |
| [`review-code`](skills/review-code/SKILL.md) | Reviewing a diff or PR against the repo's own standards. Reports findings; doesn't fix them. | Code-quality lenses |
| [`ts-best-practices`](skills/ts-best-practices/SKILL.md) | Writing or reviewing TypeScript/JavaScript: the judgment calls a linter can't enforce. | Code-quality lenses |
| [`zero-trust-architecture`](skills/zero-trust-architecture/SKILL.md) | Touching auth, tenant isolation, or service-to-service calls: verify identity and ownership at every layer. | Code-quality lenses |
| [`rollout-compatibility`](skills/rollout-compatibility/SKILL.md) | Changing a schema, API shape, or event contract that something else deploys against. | Code-quality lenses |
| [`diagnose-bug`](skills/diagnose-bug/SKILL.md) | Something fails, crashes, flakes, or is slow: find the confirmed root cause, evidence first, without fixing it. | The bug lifecycle |
| [`fix-bug`](skills/fix-bug/SKILL.md) | The root cause is confirmed: fix the cause, not the symptom, and verify it. | The bug lifecycle |
| [`write-tests`](skills/write-tests/SKILL.md) | Adding tests with the repo's own runner and conventions, and proving each new test can fail. | Test authoring |
| [`upgrade-dependency`](skills/upgrade-dependency/SKILL.md) | Bumping a dependency: read the changelog across the range, check real usage, compare tests against a baseline. | Dependency maintenance |
| [`create-pr`](skills/create-pr/SKILL.md) | Taking local changes through the repo's branch, commit, push, and PR conventions, and cleaning up after merge. | Shipping workflow |
| [`doc-fact-check`](skills/doc-fact-check/SKILL.md) | Checking a doc's claims (including skill files) against the code and git history. | Documentation integrity |
| [`format-docs`](skills/format-docs/SKILL.md) | Formatting Markdown with the repo's own formatter, and flagging structural changes instead of making them. | Documentation integrity |
| [`choose-subagent`](skills/choose-subagent/SKILL.md) | Deciding which subagent type and model to spawn, based on whether the task writes anything. | Agent meta-behavior |
| [`terse-reports`](skills/terse-reports/SKILL.md) | You ask for terse, fact-dense status reports in this conversation. In Claude Code, the built-in [Concise output style](https://code.claude.com/docs/en/output-styles#concise) (`/output-style concise`) shortens every session's responses, less tersely than this skill. | Agent meta-behavior |

## Philosophy

There's no imposed spec→plan→build→ship pipeline and no fixed set of gates every change must
pass. Every skill here *discovers* a repo's own conventions -- its stack, file layout, naming
precedent, test setup -- rather than assuming or imposing them. Larger, more opinionated skill
packs bring their own process and vocabulary; this one is meant to disappear into whatever repo
it's dropped into. See
[`examples/skill-origin-case-study.md`](examples/skill-origin-case-study.md) for the concrete
story behind a few of these skills, including a real skill-drift bug this repo's own
`doc-fact-check` skill was built to catch.

## Contributing

Needs Node ≥20:

```bash
npm ci
npm run validate && npm test && npm run eval
```

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
