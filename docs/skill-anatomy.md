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
    evals/evals.json  # Optional: claude plugin eval cases for this skill (see `claude plugin eval`)
    scripts/           # Optional: helper scripts the skill's body shells out to
```

`SKILL.md` is the only required file.

- `references/` -- only when a skill genuinely needs supporting material split out (see
  `ts-best-practices/references/` for an example: eleven short files, one per judgment-call
  category, so an agent opens only the one that applies instead of loading all eleven; also used
  by `zero-trust-architecture` and `create-tdd`).
- `evals/evals.json` -- a per-skill eval-case file for `claude plugin eval`, distinct from this
  repo's own top-level `evals/cases/<skill>.json` trigger-routing evals (see
  [`evals/README.md`](../evals/README.md)); present on `create-tdd`, `doc-fact-check`,
  `format-docs`, `fullstack-feature-slice`, `review-code`, `ts-best-practices`, and `write-tests`
  so far.
- `scripts/` -- only when a skill's body benefits from mechanizing a repeatable step instead of
  re-deriving it one Read/Grep at a time (see `format-docs/scripts/detect_formatter.sh`).

## SKILL.md format

### Frontmatter (required)

This repo targets the [agentskills.io specification](https://agentskills.io/specification) for
`SKILL.md` frontmatter. It defines five recognized fields; this repo's skills use `name`,
`description`, and `allowed-tools` today, and don't yet use `license`, `compatibility`, or
`metadata` (see below for when each is actually worth adding).

```yaml
---
name: skill-name-with-hyphens
description: >-
  What the skill does, then one or more "Use when ..." trigger conditions.
allowed-tools: [Read, Grep, Glob]   # optional -- Claude Code-specific, ignored by other tools
license: MIT                        # optional -- see "license" below
compatibility: ...                  # optional, rarely needed -- see "compatibility" below
metadata:                           # optional -- see "metadata" below
  key: value
---
```

**Rules:**

- `name`: lowercase, hyphen-separated, must match the containing directory name.
- `description`: state what the skill does, then when to reach for it -- concrete trigger
  phrasing an agent would actually see in a request ("review this", "does this have tests"), not
  just an abstract category. This is what every supported tool actually reads to decide whether
  to activate the skill, so vague or purely categorical descriptions are the main reason a skill
  never triggers. A `>-` folded block (as above) is the common shape for a longer description, but
  a plain single-line scalar (`description: What the skill does...`) works too -- see
  `ts-best-practices/SKILL.md` for a real example. These are the only two shapes the tooling
  actually reads (`scripts/lib/parse-skill.js`, and the `SessionStart` hook -- see
  [`hooks/README.md`](../hooks/README.md)); anything else won't parse.
- `allowed-tools`: optional, Claude Code-only. Other tools ignore it; don't rely on it to
  actually restrict behavior outside Claude Code. The spec documents this field as a
  **space-separated string** (e.g. `allowed-tools: Read Bash(git:*)`); every skill in this repo
  instead uses a YAML **list** (e.g. `allowed-tools: [Read, Grep, Glob]`), which is Claude Code's
  own convention, not the spec's documented syntax. That's a deliberate divergence, not an
  oversight: the spec itself marks `allowed-tools` "Experimental, support varies between agent
  implementations," and Claude Code is the only consumer of it today (other supported tools ignore
  the field entirely) -- so there's no cross-tool compatibility to lose by keeping the list form
  Claude Code actually expects. Revisit if a second consumer starts reading this field.
- `license`: optional. Only add it if a skill's license genuinely differs from the repo's own --
  every skill here currently shares the root [`LICENSE`](../LICENSE) (MIT), so this repo doesn't
  set the field per-skill; if you do need it, `license: MIT` (a license name) or a path to a
  bundled license file are both valid per the spec.
- `compatibility`: optional, and per the spec itself "most skills do not need this field." Add it
  only for a genuine non-discoverable hard dependency a skill can't detect and route around at run
  time (e.g. requires a specific OS or a tool version too specific to sensibly probe for) -- not
  for anything a skill could instead discover by reading the repo it's operating in (that's the
  "discover, don't dictate" principle from [README.md](../README.md), and it applies here too).
  Keep it under the spec's 500-character limit.
- `metadata`: optional, a freeform string-to-string map for client-specific extensions. Only add a
  key when there's an actual known consumer that reads it -- an untargeted `metadata` block is
  just noise, since nothing in this repo's own tooling (`scripts/lib/parse-skill.js`,
  `scripts/validate-skills.js`, the `SessionStart` hook) reads it today.

This repo's own validation (`scripts/validate-skills.js`) checks `name` and `description` against
the rules above; it doesn't yet run the spec's own reference validator
([`skills-ref validate`](https://github.com/agentskills/agentskills/tree/main/skills-ref)) as a
second check. Worth adding to CI later, but not wired up yet -- track before relying on it.

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

Requires Node >=20 + npm (for the commands in steps 3-4 below).

1. Write it for a repo you actually have in front of you -- against a real convention, a real
   failure mode, a real workflow -- then generalize by replacing that repo's specific facts with
   a "discover this repo's own version of that fact" step in the same place. A skill written in
   the abstract, with no real case behind it, tends to read as plausible-sounding process with
   nothing underneath it.
2. Add a directory under `skills/` and a `SKILL.md` following the frontmatter rules above.
3. Run `node scripts/validate-skills.js` and fix anything it flags.
4. Add `evals/cases/<skill-name>.json` (see [`evals/README.md`](../evals/README.md) for the
   format) with a few positive/negative trigger-routing prompts, then run `npm run eval` and fix
   anything it flags -- this is what actually catches a skill whose description doesn't carry the
   vocabulary a user would say, or that collides with an existing skill's.
5. If the skill deserves a slash-command shortcut, add a matching `.claude/commands/<name>.md`
   and `.gemini/commands/<name>.toml` (see any existing pair for the shape) -- optional, only
   worth it for a skill you'd want to invoke explicitly rather than wait on auto-discovery for.
6. Add a row for the skill in [README.md](../README.md)'s "What's here" list, under whichever
   category it fits (see [`docs/skill-categories.md`](skill-categories.md) if none of the existing
   categories fit). Skipping this step ships a working skill that never shows up in the catalog.
