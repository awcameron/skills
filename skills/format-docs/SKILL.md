---
name: format-docs
description: >-
  Format a repo's Markdown docs (README, AGENTS.md/CONTRIBUTING.md, docs/**) with whatever formatter
  it already uses -- applying whitespace, list indentation, and table fixes directly, and proposing
  heading, wording, or wrap-style changes for confirmation. Use when the user asks to "format the
  docs", "lint the docs", "clean up the formatting", "fix markdown formatting", or "check this
  markdown". Not for fact-checking a doc (`doc-fact-check`) or reviewing code.
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
    Bash(npx --no-install biome:*),
    Bash(biome:*),
    Bash(git diff:*),
    Bash(git status:*),
    "Bash(${CLAUDE_SKILL_DIR}/scripts/detect_formatter.sh:*)",
  ]
---

# Format Docs

This skill formats and checks the consistency of a repo's Markdown docs. It has two jobs, kept
separate because they carry different risk:

1. **Mechanical formatting** -- whitespace, list-marker indentation, table column alignment,
   trailing newlines. Safe, reversible, no wording changes. Apply directly, then show the diff.
2. **Structural consistency** -- heading hierarchy, code-fence language tags, cross-doc
   conventions like prose-wrap style, and anything that changes wording. Report it, propose a
   specific fix, and don't apply it until the user confirms.

Never blur the two: don't fold a wording change into a "mechanical" diff, and don't ask for
confirmation on something that's genuinely just whitespace.

## Step 0: Find out what's already enforced

Most repos already have an answer, and it isn't always Prettier -- a repo with no `package.json`
(Python, Rust, Go) can still have a Markdown formatter configured. Run the bundled scan instead of
grepping for each config file by hand. It ships inside this skill's directory, not the target
repo:

```bash
${CLAUDE_SKILL_DIR}/scripts/detect_formatter.sh <repo-root>
```

Claude Code fills in `${CLAUDE_SKILL_DIR}`. If it's still literal text (another agent tool), use
the absolute path of the `scripts/` directory next to this `SKILL.md` -- never a bare
`scripts/detect_formatter.sh`, which resolves against the target repo.

The script checks tool configs, `package.json` scripts, pre-commit hooks, and CI workflows in one
pass. Its output is a lead to verify, not a final answer: when the setup is ambiguous, read the
flagged file (it can't tell you, for example, what a dprint markdown plugin's `textWrap` is).

- **More than one tool found:** flag it rather than picking one -- it's usually leftover config
  from a migration, and running the wrong one produces a confusing diff.
- **Already enforced automatically:** say so, and treat the mechanical job as running that same
  check by hand -- before committing, or on a file the automated path didn't reach. Drift in a doc
  that went through a normal commit means something bypassed the hook (`--no-verify`, a web UI
  edit); mention it, don't just fix it silently.
- **Nothing configured:** say so. Prettier is the reasonable default to propose, but running it
  introduces a check rather than enforcing an existing one -- tell the user, and confirm before
  any write.

## Before running a tool, read `references/tools.md`

[`references/tools.md`](references/tools.md) has each tool's check/write commands and its
prose-rewrap default. Read the entry for the discovered tool before running anything: a pass is
only mechanical if the tool can't reflow prose under this repo's config, and several tools can
(Prettier with `proseWrap: always`, mdformat with an integer `wrap`, dprint's `textWrap`, remark
and Biome depending on config). If it's unclear, treat the pass as structural.

Keep `--no-install` on every `npx` call, so npx uses the repo's installed binary instead of
fetching one from the network.

## What formatters don't fix

Beyond whitespace/list/table mechanics (and markdownlint's own rules), none of these tools enforce
heading hierarchy, add code-fence language tags, or catch broken links, stale paths, or wording
issues. Those need reading and judgment.

## Structural consistency: derive patterns from the repo itself

Don't apply generic Markdown opinions. Read a representative sample -- the README, the
`AGENTS.md`/`CONTRIBUTING.md`-equivalent, a handful of files under `docs/` -- and flag only what's
inconsistent with the repo's own pattern:

- **Heading hierarchy**: one `#` title per file, then `##`? Flag a skipped level or a file that
  starts below `#` only if other files don't already do the same.
- **List markers**: flag `-`/`*` mixed within a file, not a repo-wide choice you'd prefer.
- **Code-fence language tags**: real shell/code blocks should be tagged the way the repo already
  tags them. A bare fence around a file tree or an abstract illustration is fine.
- **Prose-wrap style**: some files hard-wrap at a fixed column, others use one line per paragraph,
  and one file can mix both. A formatter set to preserve won't resolve this -- it's an
  undocumented authoring split, not a formatting bug. **Don't pick a side and rewrap to match.**
  Surface it as a decision for the user (or a follow-up issue), and rewrap only after it's made.

## Scope

In scope by default: the repo's canonical conventions doc (README, `AGENTS.md`/`CONTRIBUTING.md`)
and its main docs directory (commonly `docs/**/*.md`), plus any `.md` file the user names.

Skip:

- Anything the repo's conventions mark off-limits (a deprecated or legacy directory, a scaffold
  slated for removal).
- A one-line include file with no prose of its own -- there's nothing to do there.
- Tool-specific rule files such as Cursor's `.cursor/rules/*.mdc`. They have their own frontmatter
  contract that a Markdown formatter doesn't know about. If asked to format one, say so and stop.

## Workflow

1. **Target files.** Default to the scope above. If the list is broader than a file or two,
   confirm it back to the user.
2. **Discover** the tool (Step 0) and its rewrap behavior (`references/tools.md`).
3. **Run the check command** first, not the write, to see which files have mechanical drift.
4. **Apply mechanical fixes** with the same tool's write command, if its rewrap behavior checked
   out safe. Show `git diff -- <files>`. If the diff has anything beyond whitespace/list/table
   mechanics, stop and treat it as structural (step 6).
5. **Check structural consistency** in every target file, not just the ones the formatter flagged.
6. **Propose each structural edit** -- heading fix, missing language tag, prose-wrap split -- as
   the exact `Edit` you'd make, and apply it only after confirmation.
7. **Report** file by file: what was applied (mechanical) vs. what's proposed and awaiting
   confirmation (structural). If nothing needed fixing, say so plainly.
