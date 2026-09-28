# Using skills with Codex CLI

Codex CLI scans `.agents/skills` (from your current directory up to the repo root, then
`$HOME/.agents/skills`) for `SKILL.md` files and follows one when your task matches its
description, or when you mention it explicitly with `$skill-name`.

## Project setup

Clone this repo once, then symlink its canonical `skills/` directory into your project:

```bash
git clone https://github.com/awcameron/skills.git ~/awcameron-skills
cd your-project
mkdir -p .agents && ln -s ~/awcameron-skills/skills .agents/skills
```

## Global setup

```bash
ln -s ~/awcameron-skills/skills ~/.agents/skills
```

Available in every project Codex CLI runs in from then on.

## Verify

Ask Codex CLI something that matches a skill's trigger phrasing (e.g. "review my changes") and
confirm it names the skill it's using, or run `$review-code` directly (see below).

## Invoking a skill explicitly

```text
$review-code
```

Skips discovery and runs the named skill directly.
