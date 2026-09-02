# Using agent-skills with Claude Code

## Option 1: Install as a plugin (recommended)

This repo is a self-contained Claude Code plugin -- `.claude-plugin/plugin.json` at its root
declares the `skills/` and `.claude/commands/` directories, so Claude Code discovers everything
automatically:

```
/plugin marketplace add awcameron/agent-skills
/plugin install agent-skills
```

Skills load as `agent-skills:<skill-name>` (e.g. `agent-skills:review-code`) and activate
automatically when your request matches a skill's description. The slash commands under
`.claude/commands/` (`/review-code`, `/write-tests`, `/create-pr`, etc.) are thin wrappers that
invoke a specific skill explicitly, for when you don't want to wait for auto-discovery.

## Option 2: Symlink into a project

```bash
git clone https://github.com/awcameron/agent-skills.git
cd your-project
ln -s ../agent-skills/skills .claude/skills
```

Claude Code discovers any `SKILL.md` under `.claude/skills/<name>/` without a plugin install
step. This is the lighter option if you just want the skills, not the slash commands or plugin
metadata.

## Option 3: Global install

```bash
ln -s /path/to/agent-skills/skills/review-code ~/.claude/skills/review-code
```

Symlink one skill (or the whole `skills/` directory) into `~/.claude/skills/` to make it
available in every project without repeating setup per-repo.

## Verifying it worked

Ask Claude Code something that matches a skill's trigger phrasing (e.g. "review my changes")
and confirm it names the skill it's using, or run `/review-code` directly.
