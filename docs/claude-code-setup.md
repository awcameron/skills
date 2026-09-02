# Using skills with Claude Code

## Option 1: Install as a plugin (recommended)

This repo is a self-contained Claude Code plugin -- `.claude-plugin/plugin.json` at its root
declares the `skills/` and `.claude/commands/` directories, so Claude Code discovers everything
automatically:

```
/plugin marketplace add awcameron/skills
/plugin install awcameron-skills
```

Skills load as `awcameron-skills:<skill-name>` (e.g. `awcameron-skills:review-code`) and activate
automatically when your request matches a skill's description. The slash commands under
`.claude/commands/` (`/review-code`, `/write-tests`, `/create-pr`, etc.) are thin wrappers that
invoke a specific skill explicitly, for when you don't want to wait for auto-discovery.

## Option 2: Symlink into a project

```bash
git clone https://github.com/awcameron/skills.git
cd your-project
ln -s ../skills/skills .claude/skills
```

Claude Code discovers any `SKILL.md` under `.claude/skills/<name>/` without a plugin install
step. This is the lighter option if you just want the skills, not the slash commands or plugin
metadata.

The `SessionStart` catalog hook isn't auto-discovered this way -- it only wires up automatically
through the plugin install in Option 1. To get it here, wire it into your project's own
`.claude/settings.json` by hand; see [`hooks/README.md`](../hooks/README.md) for the exact JSON.

## Option 3: Global install

```bash
ln -s /path/to/skills/skills/review-code ~/.claude/skills/review-code
```

Symlink one skill (or the whole `skills/` directory) into `~/.claude/skills/` to make it
available in every project without repeating setup per-repo.

Same caveat as Option 2: the `SessionStart` catalog hook needs manual wiring here too --
see [`hooks/README.md`](../hooks/README.md).

## Verifying it worked

Ask Claude Code something that matches a skill's trigger phrasing (e.g. "review my changes")
and confirm it names the skill it's using, or run `/review-code` directly.
