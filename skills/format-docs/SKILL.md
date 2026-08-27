---
name: format-docs
description: >-
  Format and check consistency of a repo's Markdown docs (README, AGENTS.md/CONTRIBUTING.md-style
  files, docs/**). Use this skill when the user asks to "format the docs", "format markdown",
  "lint the docs", "check doc formatting", "clean up the docs", "fix markdown formatting", or
  points at a `.md` file and asks for formatting/consistency fixes -- also "does this doc look
  right" or "check this markdown" for a doc-focused request. Discovers whatever Markdown formatter
  the repo already uses (Prettier, dprint, markdownlint-cli2, mdformat, remark) and applies its
  mechanical formatting directly (whitespace, list-marker indentation, table alignment, trailing
  newlines), showing the diff. Flags but does not silently apply anything that changes wording,
  restructures headings, or resolves a cross-doc inconsistency (e.g. prose-wrap style) -- those
  are proposed for the user to confirm. Does not review code (see `review-code`) and is not the
  same as a repo's own code formatter, usually run via its own pre-commit hook/CI.
allowed-tools:
  [
    Read,
    Grep,
    Glob,
    Edit,
    Bash(npx --no-install prettier:*),
    Bash(npx --no-install dprint:*),
    Bash(dprint:*),
    Bash(npx --no-install markdownlint-cli2:*),
    Bash(npx --no-install remark:*),
    Bash(mdformat:*),
    Bash(python -m mdformat:*),
    Bash(git diff:*),
    Bash(git status:*),
  ]
---

# Format Docs

This skill formats and checks the consistency of a repo's Markdown documentation. It has two
distinct jobs, kept separate because they carry different risk:

1. **Mechanical formatting** -- whitespace, list-marker indentation, table column alignment,
   trailing newlines. Safe, reversible, no wording changes. Apply directly, then show the diff.
2. **Structural consistency** -- heading hierarchy, code-fence language tags, cross-doc
   conventions like prose-wrap style. Report what's inconsistent; propose a specific fix; do not
   apply it without the user confirming. This includes anything that would change wording or
   restructure headings.

Never blur the two: don't fold a wording change into a "mechanical" commit, and don't ask for
confirmation on something that's genuinely just whitespace.

## Step 0: Find out what's already enforced

Before assuming there's a gap to fill, check whether the repo already formats/lints its Markdown
automatically -- most of the time there's already a real answer, and re-discovering it is cheap.
Don't assume the tool is Prettier -- a repo with no `package.json` at all (a Python, Rust, or Go
project) can still have a real Markdown formatter configured:

- Root (and per-workspace) `package.json` `scripts` for a `format`/`format:check`/`lint:md` entry,
  and what glob it targets.
- A pre-commit hook (`.husky/`, `lint-staged.config.*`, `.lintstagedrc*`, or a non-JS equivalent
  like `.pre-commit-config.yaml`) for a `"**/*.md"` (or `\.md$`) entry.
- CI workflow files (`.github/workflows/*.yml` or equivalent) for a job that runs the format
  script unconditionally.
- Tool-specific config files, since more than one of these can coexist:
  - `.prettierrc*` / a `prettier` dependency (Prettier) -- not scoped away from `.md` files.
  - `dprint.json`/`dprint.jsonc` with a markdown plugin entry (dprint).
  - `.markdownlint.json`/`.yml` or `.markdownlint-cli2.jsonc` (markdownlint-cli2).
  - `pyproject.toml` `[tool.mdformat]`, or `mdformat` in a `requirements*`/lockfile (mdformat).
  - `.remarkrc*` that isn't just Prettier's own Markdown support underneath (standalone remark).

If more than one of these is present, don't just pick one -- flag it to the user; it's usually
leftover config from a migration, and running the wrong one can produce a confusing diff.

If Markdown formatting is already enforced automatically, say so, and treat this skill's
mechanical-formatting job as *running that same check manually* -- useful before committing, or
against a file the automated path didn't reach (an out-of-scope file the user names explicitly, or
a doc edited through a path that skipped the hook, e.g. `git commit --no-verify` or a web UI
edit). A doc that's already been through a normal commit should already be clean; finding drift
there is a signal something bypassed the hook, worth mentioning to the user, not just silently
fixing.

If nothing is configured, say that too, and treat the mechanical pass below as introducing a
check, not enforcing an existing one -- flag that distinction to the user rather than implying a
convention exists when it doesn't yet.

## Mechanical formatting: reuse whatever tool the repo already uses, don't invent new rules

Act on whatever Step 0 actually found configured -- don't default to Prettier just because it's
the most common case. Match the check/write pair to the tool that's actually there:

| Tool | Found via | Check | Write |
|---|---|---|---|
| Prettier | `.prettierrc*`, a `prettier` dependency, a `format`/`format:check` script | `npx --no-install prettier --check "<path>"` | `npx --no-install prettier --write "<path>"` |
| dprint | `dprint.json`/`.jsonc` with a markdown plugin | `dprint check` (scoped by its config, or `--` a path) | `dprint fmt` |
| markdownlint-cli2 | `.markdownlint.json`/`.yml`/`.markdownlint-cli2.jsonc` | `npx --no-install markdownlint-cli2 "<path>"` | `npx --no-install markdownlint-cli2 --fix "<path>"` |
| mdformat | `pyproject.toml` `[tool.mdformat]`, or an `mdformat` dependency | `mdformat --check "<path>"` | `mdformat "<path>"` |
| remark (standalone) | `.remarkrc*` not just underlying Prettier | `npx --no-install remark "<path>" --frail` | `npx --no-install remark "<path>" -o` |

If nothing is configured, Prettier remains the reasonable **default to propose** -- most repos
that touch JS/TS tooling at all have it available and it formats Markdown out of the box with no
extra setup. But say explicitly that this introduces a check rather than enforcing an existing
one (per Step 0), and confirm before running any `--write`/`fmt` step against real files.

`--no-install` (Prettier, markdownlint-cli2, remark) guarantees npx resolves the repo's
already-installed local binary instead of fetching one from the network -- never drop it. For a
workspace with its own tool version but no config of its own, check whether it resolves the
nearest parent config, and whether that's actually the intended target before assuming a
monorepo sub-package needs its own pass.

## Know each tool's prose-rewrap default before running --write

The property that makes a formatting pass "mechanical" (safe to apply without confirmation) is
that it cannot silently change how a paragraph reads -- it only touches whitespace, list markers,
table alignment, trailing newlines. That property is **not** universal across tools, so check the
resolved config for whichever one applies before assuming it holds:

- **Prettier**: `proseWrap` defaults to `preserve` -- safe by default. If a repo's config sets
  `proseWrap: always` (or similar), a Prettier run *can* reflow prose -- treat that as
  structural risk (see below), not a mechanical pass.
- **mdformat**: reflows/wraps paragraphs to a fixed width **by default**, unless the repo passes
  `--wrap=no`/`--wrap=preserve` or sets the equivalent option. Confirm that flag is set before
  treating an mdformat run as mechanical -- the unflagged default is not safe to apply without
  confirmation.
- **dprint's markdown plugin**: check its resolved `textWrap` setting the same way -- it has no
  universal safe default to assume.
- **markdownlint-cli2 `--fix`**: fixes lint violations (list markers, trailing whitespace, heading
  spacing) and does not reflow prose -- safe by default.
- **remark**: reflow behavior depends entirely on which plugins/options are configured (e.g.
  `remark-stringify` width settings) -- read the config rather than assuming either behavior.

When a given tool's config doesn't make the answer clear, treat the pass as structural risk and
confirm before writing, rather than assuming mechanical safety by default.

## What these formatters do *not* fix: know the boundary before you touch anything

None of the tools above are a complete style checker. Beyond mechanical whitespace/list/table
fixes (and, for markdownlint, its specific lint rules), none of them:

- Enforce heading hierarchy or level choice.
- Enforce or add code-fence language tags.
- Catch broken internal links, stale file-path references, or wording issues.

Those require reading the docs and using judgment (see below).

## Structural consistency: derive patterns from the repo itself

Don't apply generic Markdown best-practice opinions -- read a representative sample of the repo's
actual docs (its README, its `AGENTS.md`/`CONTRIBUTING.md`-equivalent, a handful of files under
`docs/`) and derive what's *already* consistent there before flagging anything as wrong. Typical
things worth checking once you know the repo's own pattern:

- **Heading hierarchy**: does every file start at `#` (one per file, the title), then `##` for
  major sections? Flag a file that skips a level or starts below `#` only if that's not already
  how other files in the repo do it.
- **List markers**: is `-` used consistently, or does the repo mix `-` and `*`? Flag inconsistency
  within a file, not a repo-wide marker choice you'd prefer.
- **Code-fence language tags**: are fenced blocks containing real shell/code commands tagged
  consistently (`` ```bash ``, etc.) in the files that already have them? A bare fence around a
  file-tree diagram or an abstract pattern illustration (not actual source in a language) is
  usually fine as-is -- don't flag those as missing a tag.

**Prose-wrap style is a common source of real, unresolved inconsistency** -- some files hard-wrap
paragraphs at a fixed column, others write each paragraph as one long unwrapped line, and a single
file sometimes mixes both across sections. Since `proseWrap` is usually unset (`preserve`), a
formatter will never resolve this on its own -- it isn't a formatting bug, it's an undocumented
split in authoring convention. **Do not pick one and rewrap the other's files or sections to
match -- that's a wording-adjacent structural change.** Surface it as a call the user (or a
follow-up issue) should make explicitly, and only rewrap after that's answered.

## `.mdc`/tool-specific rule files: usually out of scope

If the repo has tool-specific rule files (e.g. Cursor's `.cursor/rules/*.mdc`), treat those as a
different document type with their own frontmatter contract that a generic Markdown formatter has
no awareness of -- they are not general-purpose Markdown. Default to targeting only plain `.md`
files (the README, docs, and other `.md` files the user explicitly names). If asked to format one
of these tool-specific files, say so explicitly and stop rather than running a Markdown formatter
against it unreviewed.

## What's in scope by default

- The repo's canonical conventions doc (README, `AGENTS.md`/`CONTRIBUTING.md`, etc.) and
  everything under its main docs directory (commonly `docs/**/*.md`).
- Any other `.md` file the user explicitly points at.
- Anything the repo's own conventions mark off-limits (a deprecated/legacy directory, a scaffold
  slated for removal) -- check for that kind of boundary doc before sweeping broadly.
- A one-line include file with no prose of its own (e.g. a root file that just references another
  doc) -- skip it rather than reporting it as untouched; there's nothing for this skill to do
  there.

## Workflow

1. **Determine target files.** Default to the repo's canonical doc + its main docs directory if
   the user doesn't name specific files. Confirm the target list back to the user if it's broader
   than a file or two, so nothing unexpected gets swept in.

2. **Before running anything, read the discovered tool's prose-rewrap default** (see "Know each
   tool's prose-rewrap default" above) -- do this as part of discovery, not as an afterthought
   right before writing. Knowing upfront whether the tool is safe-by-default (Prettier,
   markdownlint-cli2) or needs an explicit flag checked (mdformat, dprint) shapes how you read its
   next result: a tool with a risky default means even its *check* output needs a second look
   before you treat anything it flags as simple mechanical drift.

3. **Run the discovered tool's check command**, don't jump straight to writing. E.g. for Prettier:

   ```bash
   npx --no-install prettier --check "<canonical-doc>" "docs/**/*.md"
   ```

   (Substitute the matching check command from the table above for whatever Step 0 found instead.)
   This tells you which files actually have mechanical drift before touching anything.

4. **Apply mechanical fixes directly** to whatever the check step flagged, using that same tool's
   write command (e.g. `npx --no-install prettier --write "<flagged files>"`, or `dprint fmt`,
   `mdformat`, etc. per the table above) -- provided its prose-rewrap default checked out safe in
   step 2.

   Then show the result with `git diff -- <flagged files>` so the user can see exactly what
   changed -- list-marker indentation, table alignment, trailing newlines. If the diff contains
   anything beyond whitespace/list/table mechanics, stop and treat it as a structural change
   instead (see step 6) rather than reporting it as "just formatting."

5. **Check structural consistency** (heading hierarchy, code-fence tags, list markers) against the
   patterns you derived from the repo's own docs, for every target file, not just ones the
   formatter flagged -- a Markdown formatter doesn't check any of this.

6. **For anything structural** -- a heading-level fix, adding a missing language tag, or a
   prose-wrap split -- propose the specific edit (the exact `Edit` you'd make) and get
   confirmation before applying it. Don't fold these into the mechanical diff from step 4.

7. **Report** what was applied directly (mechanical) vs. what's proposed and awaiting confirmation
   (structural), file by file. If nothing needed fixing, say so plainly rather than manufacturing
   findings.
