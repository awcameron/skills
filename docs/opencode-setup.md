# Using skills with OpenCode

OpenCode discovers `SKILL.md` files in `.opencode/skills/`, `.claude/skills/`, and
`.agents/skills/` (project-level, walking up to the git worktree root), and in
`~/.config/opencode/skills/`, `~/.claude/skills/`, and `~/.agents/skills/` globally. Skill names
must be unique across all of them.

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

## Verify

Ask OpenCode something that matches a skill's trigger phrasing (e.g. "review my changes") and
confirm it names the skill it's using. OpenCode's agent loads skills itself through its
built-in `skill` tool, so there's no way to run one directly (custom commands in
`.opencode/commands/` are a separate feature).

## Sources

Checked against [Agent Skills](https://opencode.ai/docs/skills) and
[Commands](https://opencode.ai/docs/commands/) on 2026-09-30.
