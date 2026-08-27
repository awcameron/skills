# Using agent-skills with OpenCode

OpenCode discovers `SKILL.md` files from several locations, searched in order: `.opencode/skills/`,
`.claude/skills/`, `.agents/skills/` (project-level, walking up to the git worktree root), then
the equivalent `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/` globally.

## Project setup

This repo already ships a `.claude/skills` symlink (and `.agents/skills`) to the canonical
`skills/` directory -- either is enough for OpenCode to pick everything up:

```bash
git clone https://github.com/<your-github-username>/agent-skills.git
cd your-project
ln -s ../agent-skills/skills .opencode/skills
```

## Global setup

```bash
ln -s /path/to/agent-skills/skills ~/.config/opencode/skills
```

Available in every OpenCode session from then on, without a per-project symlink.
