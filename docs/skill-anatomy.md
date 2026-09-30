# Skill Anatomy

This document describes the structure and format of this repo's skill files. Use it as a guide
when contributing a new skill or checking an existing one.

## File location

Every skill lives in its own directory under `skills/`:

```text
skills/
  skill-name/
    SKILL.md          # Required: the skill definition
    references/       # Optional: skill-specific reference docs, loaded on demand
    evals/evals.json  # Optional: skill-creator eval cases (not read by `claude plugin eval`)
    scripts/           # Optional: helper scripts the skill's body shells out to
```

`SKILL.md` is the only required file.

- `references/` -- only when a skill genuinely needs supporting material split out (see
  `ts-best-practices/references/` for an example: eleven short files, one per judgment-call
  category, so an agent opens only the one that applies instead of loading all eleven; also used
  by `zero-trust-architecture`, `rollout-compatibility`, `create-tdd`, `create-pr`, and
  `format-docs`).
- `evals/evals.json` -- skill-creator-format eval cases, run through the skill-creator plugin;
  `claude plugin eval` doesn't read them. Present on `create-tdd`, `doc-fact-check`, `format-docs`,
  `fullstack-feature-slice`, `review-code`, `ts-best-practices`, and `write-tests`. The other eight
  skills (`choose-subagent`, `create-pr`, `diagnose-bug`, `fix-bug`, `rollout-compatibility`,
  `terse-reports`, `upgrade-dependency`, `zero-trust-architecture`) have `claude plugin eval`
  cases under [`plugin-evals/<name>/`](../plugin-evals/README.md) instead. A new skill needs one or
  the other -- `npm test` checks. Both are separate from the Tier-2 routing cases in
  `evals/cases/<skill>.json` (see [`evals/README.md`](../evals/README.md)).
- `scripts/` -- only when a skill's body benefits from mechanizing a repeatable step instead of
  re-deriving it one Read/Grep at a time (see `format-docs/scripts/detect_formatter.sh`). Call it
  as `${CLAUDE_SKILL_DIR}/scripts/<file>`, never a bare `scripts/<file>`, which resolves against
  the target repo. Skills install individually, so two skills that need the same script each ship
  a copy (`review-code` and `write-tests` share `change_scope.sh`); `npm run validate` fails if
  same-named copies differ.

## SKILL.md format

### Frontmatter (required)

This repo targets the [agentskills.io specification](https://agentskills.io/specification) for
`SKILL.md` frontmatter. It defines six recognized fields; this repo's skills use `name`,
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
  never triggers. Keep it to ~500 characters -- one sentence on what it does, the trigger
  phrases, and a "not for X" clause if another skill owns a nearby request. Every skill's
  description loads into every session whether it's used or not, so mechanism detail belongs in
  the body; `scripts/validate-skills.js` warns (without failing) above 600 characters and fails
  above the spec's 1024. A `>-` folded block (as above) is the common shape for a longer description, but
  a plain single-line scalar (`description: What the skill does...`) works too -- see
  `ts-best-practices/SKILL.md` for a real example. These are the only two shapes
  `scripts/lib/parse-skill.js`'s `parseSkillFile()` reads (used by `scripts/run-evals.js`); anything else won't parse
  there. Full-frontmatter schema validation (below) parses real YAML instead, so it isn't limited
  to those two shapes.
- `allowed-tools`: optional, Claude Code-only. Other tools ignore it; don't rely on it to
  actually restrict behavior outside Claude Code. The spec documents this field as a
  **space-separated string** (e.g. `allowed-tools: Read Bash(git:*)`); every skill in this repo
  that sets it instead uses a YAML **list** (e.g. `allowed-tools: [Read, Grep, Glob]`), which is
  Claude Code's own convention, not the spec's documented syntax. That's a deliberate divergence,
  not an oversight: the spec itself marks `allowed-tools` "Experimental, support varies between
  agent implementations," and Claude Code is the only consumer of it today (other supported tools
  ignore the field entirely) -- so there's no cross-tool compatibility to lose by keeping the list
  form Claude Code actually expects. Revisit if a second consumer starts reading this field.
  `scripts/validate-skills.js` warns (without failing) when the body tells the agent to run a
  command no `Bash(...)` entry covers -- a line in a `bash`/`sh` fence, or an inline code span
  starting with a known CLI and a subcommand (`git status`, `npm test`). Each one is a permission
  prompt at run time, so add the entry, or reword a command that's only mentioned, not run.
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
  `scripts/validate-skills.js`) reads it today.

This repo's own validation (`scripts/validate-skills.js`) checks `name` and `description` by hand
against the rules above, and separately validates the full frontmatter block's *shape* against
[`schemas/skill-frontmatter.schema.json`](../schemas/skill-frontmatter.schema.json) -- this doc
stays the authoritative explanation of *why* each field exists and how to use it; the schema is
just its machine-checked mirror (types, required fields, patterns), so keep them in sync rather
than letting one drift from the other. Two rules the schema can't express, which stay hand-written
checks: `name` matching the containing directory name (cross-file, not visible to a single
frontmatter block), and the "use when..." trigger-phrase heuristic (a heuristic, not a hard shape
rule). The spec's own reference validator
([`skills-ref validate`](https://github.com/agentskills/agentskills/tree/main/skills-ref)) isn't
run in CI on purpose: every rule it checks (allowed fields, `name` format and directory match,
length limits) is already enforced here, and all 15 skills passed it (0.1.5, checked in #141). If
the spec changes, rerun it by hand: `npx skills-ref validate skills/<name>`.

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

Requires Node >=20 + npm (for the commands in steps 3-5 below) -- run `npm ci` once first, since
`scripts/validate-skills.js` depends on packages in `node_modules` (`ajv`, `js-yaml`).

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
5. Add a behavioral case under `plugin-evals/<skill-name>/<case>/` (see
   [`plugin-evals/README.md`](../plugin-evals/README.md)), or a skill-creator
   `skills/<skill-name>/evals/evals.json`, then run `npm test`, which fails a skill with neither.
   Writing the case is free; running it with `claude plugin eval` is billed and opt-in.
6. Add a matching slash command: `.claude/commands/<name>.md` and `.gemini/commands/<name>.toml`
   (see any existing pair for the shape). Every skill ships one, including skills meant to
   auto-trigger, so it can always be invoked directly.
7. Add a row for the skill to [README.md](../README.md)'s "What's here" table:
   `| [\`<name>\`](skills/<name>/SKILL.md) | <use it when> | <stage> |`, with a stage from
   [`docs/skill-categories.md`](skill-categories.md) (add one there if none fits).
   `npm run validate` fails if a skill has no row, or a row names a skill that doesn't exist.
