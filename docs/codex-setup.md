# Using skills with Codex CLI

Codex CLI scans `.agents/skills` (from your current directory up to the repo root, then
`$HOME/.agents/skills`) for `SKILL.md` files and follows one when your task matches its
description, or when you mention it explicitly with `$skill-name`.

## Project setup

Clone this repo once, then symlink its canonical `skills/` directory into your project:

```bash
git clone https://github.com/awcameron/skills.git ~/skills
cd your-project
mkdir -p .agents && ln -s ~/skills/skills .agents/skills
```

## Global setup

```bash
ln -s /path/to/skills/skills ~/.agents/skills
```

Available in every project Codex CLI runs in from then on.

## Invoking a skill explicitly

```
$review-code
```

Skips discovery and runs the named skill directly.
