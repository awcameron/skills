# Using skills with Codex CLI

Codex CLI scans `.agents/skills` (from your current directory up to the repo root, then
`$HOME/.agents/skills`) for `SKILL.md` files and follows one when your task matches its
description, or when you mention it explicitly with `$skill-name`.

## Install with `npx skills`

Run the third-party [`skills` CLI](https://github.com/vercel-labs/skills) (needs Node ≥22.20) in
your project:

```bash
cd your-project
npx skills add awcameron/skills --agent codex                      # all skills
npx skills add awcameron/skills --agent codex --skill review-code  # one skill
```

It installs each skill's folder, `references/` included, into `.agents/skills/<name>/`. It records
what it installed in `skills-lock.json`; `npx skills update` updates it. Add `-g` to install for
your user instead of the project.

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

Skips discovery and runs the named skill directly. `/skills` lists the available skills to pick
from.

## Sources

Checked against [Build skills](https://learn.chatgpt.com/docs/build-skills) on 2026-09-30.
