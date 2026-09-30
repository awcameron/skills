# Using skills with Claude Code

## Install as a plugin (recommended)

This repo is a self-contained Claude Code plugin -- `.claude-plugin/plugin.json` at its root
declares the `skills/` and `.claude/commands/` directories, so Claude Code discovers everything
automatically:

```bash
claude plugin marketplace add awcameron/skills
claude plugin install awcameron-skills@awcameron-skills
```

Or, from inside a session:

```text
/plugin marketplace add awcameron/skills
/plugin install awcameron-skills@awcameron-skills
```

In a session, `/plugin install` opens the plugin's details panel so you can pick a scope before it
installs.

Skills load as `awcameron-skills:<skill-name>` (e.g. `awcameron-skills:review-code`) and activate
automatically when your request matches a skill's description. The slash commands under
`.claude/commands/` (`/review-code`, `/write-tests`, `/create-pr`, etc.) are thin wrappers that
invoke a specific skill explicitly, for when you don't want to wait for auto-discovery.

## Project setup

```bash
git clone https://github.com/awcameron/skills.git ~/awcameron-skills
cd your-project
mkdir -p .claude && ln -s ~/awcameron-skills/skills .claude/skills
```

Claude Code discovers any `SKILL.md` under `.claude/skills/<name>/` without a plugin install
step. This is the lighter option if you just want the skills, not the slash commands or plugin
metadata.

## Global setup

```bash
ln -s ~/awcameron-skills/skills/review-code ~/.claude/skills/review-code
```

Symlink one skill (or the whole `skills/` directory) into `~/.claude/skills/` to make it
available in every project without repeating setup per-repo.

## Verify

Ask Claude Code something that matches a skill's trigger phrasing (e.g. "review my changes")
and confirm it names the skill it's using, or run `/review-code` directly.

## If a skill stops triggering

Claude Code lists every installed skill's name and description in each session, and that listing
has a character budget (1% of the model's context window). With many skills installed from
several sources, it drops descriptions for the skills you invoke least, so a skill can stay listed
by name but lose the trigger phrases Claude matches requests against.

The Skills row in `/context` shows the listing's size after the budget is applied. To raise the
budget, set `skillListingBudgetFraction` in `settings.json` (e.g. `0.02` for 2%) or the
`SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable to a fixed character count; to free budget,
set skills you rarely use to `"name-only"` in `skillOverrides`. See Claude Code's
[Skill descriptions are cut short](https://code.claude.com/docs/en/skills#skill-descriptions-are-cut-short).

## Sources

Checked against these on 2026-09-30:
[Skills](https://code.claude.com/docs/en/skills),
[Discover and install plugins](https://code.claude.com/docs/en/discover-plugins).
