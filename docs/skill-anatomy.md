# Skill Anatomy

This document describes the structure and format of this repo's skill files. Use it as a guide
when contributing a new skill or checking an existing one.

## File location

Every skill lives in its own directory under `skills/`:

```
skills/
  skill-name/
    SKILL.md          # Required: the skill definition
    references/       # Optional: skill-specific reference docs, loaded on demand
```

`SKILL.md` is the only required file. Add `references/` only when a skill genuinely needs
supporting material split out (see `ts-best-practices/references/` for an example: nine short
files, one per judgment-call category, so an agent opens only the one that applies instead of
loading all nine).

## SKILL.md format

### Frontmatter (required)

```yaml
---
name: skill-name-with-hyphens
description: >-
  What the skill does, then one or more "Use when ..." trigger conditions.
allowed-tools: [Read, Grep, Glob]   # optional -- Claude Code-specific, ignored by other tools
---
```

**Rules:**

- `name`: lowercase, hyphen-separated, must match the containing directory name.
- `description`: state what the skill does, then when to reach for it -- concrete trigger
  phrasing an agent would actually see in a request ("review this", "does this have tests"), not
  just an abstract category. This is what every supported tool actually reads to decide whether
  to activate the skill, so vague or purely categorical descriptions are the main reason a skill
  never triggers.
- `allowed-tools`: optional, Claude Code-only. Other tools ignore it; don't rely on it to
  actually restrict behavior outside Claude Code.

### Body

No single rigid template is enforced across this repo's skills -- they range from a tight
numbered workflow with confirmation checkpoints (`create-pr`) to a set of principles plus
reference files opened on demand (`ts-best-practices`). What every skill here does share:

- **State the mechanism, not just the goal.** "Review code for quality" is a goal; the actual
  steps, the order to check things in, and what to do when a check fails are the mechanism --
  that's what makes a skill followable rather than just a restated task description.
- **Discover before assuming.** Every skill that depends on a specific repo's conventions (test
  layout, branch naming, coding standards) has an explicit step to go find those conventions in
  the repo at hand -- reading its docs, its lint config, its real git history -- rather than
  hardcoding one project's answer as if it were universal.
- **Say what's uncertain.** A skill that can't verify something it did (a test that wasn't run
  against unfixed code, a claim that couldn't be cross-checked) states that plainly rather than
  implying it was confirmed.

## Contributing a skill

1. Write it for a repo you actually have in front of you -- against a real convention, a real
   failure mode, a real workflow -- then generalize by replacing that repo's specific facts with
   a "discover this repo's own version of that fact" step in the same place. A skill written in
   the abstract, with no real case behind it, tends to read as plausible-sounding process with
   nothing underneath it.
2. Add a directory under `skills/` and a `SKILL.md` following the frontmatter rules above.
3. Run `node scripts/validate-skills.js` and fix anything it flags.
4. If the skill deserves a slash-command shortcut, add a matching `.claude/commands/<name>.md`
   and `.gemini/commands/<name>.toml` (see any existing pair for the shape) -- optional, only
   worth it for a skill you'd want to invoke explicitly rather than wait on auto-discovery for.
