# Using skills with Antigravity CLI

Google retired the standalone Gemini CLI for Google AI Pro/Ultra and free individual users on
2026-06-18, replacing it with **Antigravity CLI** (`agy`) under the unified Antigravity brand.
Antigravity CLI keeps Gemini CLI's Agent Skills, Hooks, Subagents, and Extensions -- now
implemented as Antigravity plugins -- so this repo's `SKILL.md` files carry over with no format
changes. If your organization is still on a Gemini Code Assist Standard/Enterprise license (or
Gemini Code Assist for GitHub), your access to the legacy Gemini CLI is unaffected; see
[Legacy Gemini CLI (Enterprise)](#legacy-gemini-cli-enterprise) below.

## Option 1: Native skill discovery (recommended)

Antigravity CLI auto-discovers `SKILL.md` files in a project's `.agents/skills/` directory. Clone
this repo once, then symlink its canonical `skills/` directory into your project:

```bash
git clone https://github.com/awcameron/skills.git ~/awcameron-skills
cd your-project
mkdir -p .agents && ln -s ~/awcameron-skills/skills .agents/skills
```

Once discovered, each skill both informs Antigravity's own routing (via its `description`
frontmatter) and is automatically exposed as a slash command -- see Option 2.

## Option 2: Slash commands (automatic, no separate files needed)

Unlike Gemini CLI, Antigravity CLI does not need a separate per-skill command file: every skill
under `.agents/skills/` converts automatically into a slash command (e.g. `/review-code`) the
moment `agy` discovers it. There is nothing to install beyond Option 1 above -- **this repo does
not ship a `.antigravity/commands/`-style directory because Antigravity generates the commands
itself.**

## Option 3: AGENTS.md / GEMINI.md (persistent context)

For a skill you want always loaded rather than activated on demand, add it to your project's
`AGENTS.md` (the cross-tool standard, also read by Claude Code, Cursor, and others) or
`GEMINI.md` (Antigravity's original, Gemini-specific convention) -- Antigravity CLI reads both as
Rules:

```markdown
# Project Instructions

@./.agents/skills/ts-best-practices/SKILL.md
```

> **Skills vs. AGENTS.md/GEMINI.md:** skills are on-demand and keep the context window clean;
> Rules files are prepended to every prompt. Prefer skills unless a convention genuinely needs to
> be always-on. Rules files are capped at 12,000 characters each.

## Usage tips

- Each `SKILL.md`'s `description` frontmatter is what Antigravity CLI uses for auto-discovery --
  it's written to state both *what* the skill does and *when* to use it, for exactly this reason.
- Global setup: symlink into `~/.gemini/antigravity-cli/skills/` (the path Google's own docs
  document) -- or, per community testing, `~/.gemini/config/skills/` if you want one path
  recognized across the Antigravity, Antigravity IDE, and Antigravity CLI flavors.

## Legacy Gemini CLI (Enterprise)

If your organization's Gemini CLI access continues under a Gemini Code Assist
Standard/Enterprise license, this repo still ships `.gemini/commands/*.toml` -- one thin wrapper
per skill, unchanged from before the transition -- since Antigravity's auto-generated commands
(Option 2) don't apply to the legacy CLI. Gemini CLI auto-discovers those `.toml` files when run
from the project root, and still auto-discovers `SKILL.md` files under `.gemini/skills/` or
`.agents/skills/` the same way described in Option 1 above.

## Sources

- [Transitioning Gemini CLI to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/) (Google Developers Blog)
- [Plugins & Skills](https://antigravity.google/docs/cli/plugins/) (Google Antigravity Docs)
- [Agents Command (`/agents`)](https://antigravity.google/docs/cli/commands/agents/) (Google Antigravity Docs)
