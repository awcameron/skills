# Using skills with Cursor

Cursor's Agent Skills system discovers `SKILL.md` files from several paths, in project scope and
globally, including `.claude/skills/`, `.cursor/skills/`, `.agents/skills/`, and `.codex/skills/`
(all treated as compatible locations).

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
