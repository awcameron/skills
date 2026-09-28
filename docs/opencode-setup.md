# Using skills with OpenCode

OpenCode discovers `SKILL.md` files from several locations, searched in order: `.opencode/skills/`,
`.claude/skills/`, `.agents/skills/` (project-level, walking up to the git worktree root), then
the equivalent `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/` globally.

## Project setup

Clone this repo once, then symlink its canonical `skills/` directory into your project:

```bash
git clone https://github.com/awcameron/skills.git ~/awcameron-skills
cd your-project
# .claude or .agents work in place of .opencode
mkdir -p .opencode && ln -s ~/awcameron-skills/skills .opencode/skills
```

## Global setup

```bash
ln -s ~/awcameron-skills/skills ~/.config/opencode/skills
```

Available in every OpenCode session from then on, without a per-project symlink.
