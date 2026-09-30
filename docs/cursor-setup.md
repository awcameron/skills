# Using skills with Cursor

Cursor's Agent Skills system discovers `SKILL.md` files from `.cursor/skills/` and
`.agents/skills/` in a project, and from `~/.cursor/skills/` and `~/.agents/skills/` globally. For
compatibility it also loads `.claude/skills/`, `.codex/skills/`, `~/.claude/skills/`, and
`~/.codex/skills/`.

## Project setup

Clone this repo once, then symlink its canonical `skills/` directory into whichever compatible
path you prefer in *your* project:

```bash
git clone https://github.com/awcameron/skills.git ~/awcameron-skills
cd your-project
# .claude or .agents work in place of .cursor
mkdir -p .cursor && ln -s ~/awcameron-skills/skills .cursor/skills
```

Cursor's Agent then has every skill available automatically -- it decides when a skill is
relevant based on your request, the same way Claude Code does. You can also invoke one directly
by typing `/` in Agent chat and searching for the skill name.

## Global setup

```bash
ln -s ~/awcameron-skills/skills ~/.cursor/skills
```

Makes every skill available in every Cursor project without repeating the symlink per-repo.
`~/.agents/skills` works too, and is shared with Codex CLI and OpenCode.

## Verify

Ask Cursor's Agent something that matches a skill's trigger phrasing (e.g. "review my changes")
and confirm it names the skill it's using, or type `/` in Agent chat and search for
`review-code`.

## Sources

Checked against [Agent Skills](https://cursor.com/docs/context/skills) on 2026-09-30.
