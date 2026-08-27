# Using agent-skills with Cursor

Cursor's Agent Skills system discovers `SKILL.md` files from several paths, in project scope and
globally, including `.claude/skills/`, `.cursor/skills/`, `.agents/skills/`, and `.codex/skills/`
(all treated as compatible locations).

## Project setup

Clone this repo alongside your project and symlink its canonical `skills/` directory into
whichever compatible path you prefer in *your* project:

```bash
git clone https://github.com/<your-github-username>/agent-skills.git
cd your-project
ln -s ../agent-skills/skills .cursor/skills    # or .claude/skills / .agents/skills -- any works
```

Cursor's Agent then has every skill available automatically -- it decides when a skill is
relevant based on your request, the same way Claude Code does. You can also invoke one directly
by typing `/` in Agent chat and searching for the skill name.

## Global setup

```bash
ln -s /path/to/agent-skills/skills ~/.cursor/skills
```

Makes every skill available in every Cursor project without repeating the symlink per-repo.
