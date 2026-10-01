# Using skills with Antigravity CLI

On 2026-06-18, Gemini CLI and the Gemini Code Assist IDE extensions stopped serving requests for
Google AI Pro/Ultra and free individual users, replaced by **Antigravity CLI** (`agy`) under the
unified Antigravity brand. Antigravity CLI keeps Gemini CLI's Agent Skills, Hooks, and Subagents,
and turns Extensions into Antigravity plugins, so this repo's `SKILL.md` files carry over with no
format changes. If your organization uses a Gemini Code Assist Standard/Enterprise license, or
Gemini Code Assist for GitHub through Google Cloud, your access to the legacy Gemini CLI is
unaffected; see [Legacy Gemini CLI (Enterprise)](#legacy-gemini-cli-enterprise) below.

## Install with `npx skills`

Run the third-party [`skills` CLI](https://github.com/vercel-labs/skills) (needs Node ≥22.20) in
your project:

```bash
cd your-project
npx skills add awcameron/skills --agent antigravity-cli                      # all skills
npx skills add awcameron/skills --agent antigravity-cli --skill review-code  # one skill
```

It installs each skill's folder, `references/` included, into `.agents/skills/<name>/`. It records
what it installed in `skills-lock.json`; `npx skills update` updates it. Add `-g` to install for
your user instead of the project.

## Project setup

Antigravity CLI auto-discovers `SKILL.md` files in a project's `.agents/skills/` directory. Clone
this repo once, then symlink its canonical `skills/` directory into your project:

```bash
git clone https://github.com/awcameron/skills.git ~/awcameron-skills
cd your-project
mkdir -p .agents && ln -s ~/awcameron-skills/skills .agents/skills
```

Once discovered, each skill both informs Antigravity's own routing (via its `description`
frontmatter) and is automatically exposed as a slash command -- see
[Slash commands](#slash-commands).

## Global setup

Symlink into `~/.gemini/antigravity-cli/skills/` (the path Google's own docs document). Community
reports say `~/.gemini/config/skills/` is recognized across the Antigravity, Antigravity IDE, and
Antigravity CLI flavors, but Google's docs don't list it.

## Verify

Ask Antigravity CLI something that matches a skill's trigger phrasing (e.g. "review my changes")
and confirm it names the skill it's using, or run `/review-code` directly.

## Slash commands

Unlike Gemini CLI, Antigravity CLI does not need a separate per-skill command file: every skill
under `.agents/skills/` converts automatically into a slash command (e.g. `/review-code`) the
moment `agy` discovers it. There is nothing to install beyond Project setup above -- **this repo
does not ship a `.antigravity/commands/`-style directory because Antigravity generates the
commands itself.**

## AGENTS.md / GEMINI.md (persistent context)

For a skill you want always loaded rather than activated on demand, add it to your project's
`AGENTS.md` (the cross-tool standard, also read by Claude Code, Cursor, and others) or
`GEMINI.md` (Antigravity's original, Gemini-specific convention) -- Antigravity CLI reads both as
Rules:

```markdown
# Project Instructions

@./.agents/skills/ts-best-practices/SKILL.md
```

> **Skills vs. AGENTS.md/GEMINI.md:** skills are on-demand and keep the context window clean;
> Rules files are injected into the system prompt on every turn, loaded from each directory
> between the file you're working on and the workspace root. Prefer skills unless a convention
> genuinely needs to be always-on. Each Rules file is truncated past 24,000 bytes, and above
> 20,000 tokens across all active rules, Antigravity swaps the largest files for pointers.

## Usage tips

- Each `SKILL.md`'s `description` frontmatter is what Antigravity CLI matches your request against
  to decide which skill to use -- it's written to state both *what* the skill does and *when* to
  use it, for exactly this reason.

## Legacy Gemini CLI (Enterprise)

If your organization's Gemini CLI access continues under a Gemini Code Assist
Standard/Enterprise license, this repo still ships `.gemini/commands/*.toml` -- one thin wrapper
per skill, unchanged from before the transition -- since Antigravity's auto-generated commands
(see [Slash commands](#slash-commands)) don't apply to the legacy CLI. Gemini CLI auto-discovers
those `.toml` files when run from the project root, and still auto-discovers `SKILL.md` files
under `.gemini/skills/` or `.agents/skills/` the same way described in Project setup above.

## Sources

Checked on 2026-09-30.

- [Transitioning Gemini CLI to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/) (Google Developers Blog)
- [Plugins](https://antigravity.google/docs/plugins?tab=cli) (Google Antigravity Docs)
- [Skills](https://antigravity.google/docs/skills/) (Google Antigravity Docs)
- [Rules](https://antigravity.google/docs/rules/) (Google Antigravity Docs)
- [Gemini CLI migration](https://antigravity.google/docs/cli/gcli-migration/) (Google Antigravity Docs)
- [Agents Command (`/agents`)](https://antigravity.google/docs/cli/commands/agents/) (Google Antigravity Docs)
- [Agent Skills](https://geminicli.com/docs/cli/skills/) (Gemini CLI docs)
- [Custom commands](https://geminicli.com/docs/cli/custom-commands/) (Gemini CLI docs)
