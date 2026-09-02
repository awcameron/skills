# Using agent-skills with Codex CLI

Codex CLI scans `.agents/skills` (from your current directory up to the repo root, then
`$HOME/.agents/skills`) for `SKILL.md` files and follows one when your task matches its
description, or when you mention it explicitly with `$skill-name`.

## Project setup

This repo already ships an `.agents/skills` symlink to the canonical `skills/` directory:

```bash
git clone https://github.com/awcameron/agent-skills.git
cd your-project
ln -s ../agent-skills/skills .agents/skills
```

## Global setup

```bash
ln -s /path/to/agent-skills/skills ~/.agents/skills
```

Available in every project Codex CLI runs in from then on.

## Invoking a skill explicitly

```
$review-code
```

Skips discovery and runs the named skill directly.
