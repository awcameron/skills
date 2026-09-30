---
name: doc-fact-check
description: >-
  Check a doc's factual claims -- deploy targets, stack choices, architecture rules, conventions,
  file paths, CLI commands -- against the current codebase and git/GitHub history, and flag anything
  stale. The repo's canonical docs can be the stale ones, and agent-skill files count as docs. Use
  when the user asks whether a doc "is still accurate" or "still matches" how things are done, or to
  "check this doc for staleness". Not for Markdown formatting (`format-docs`) or code review.
allowed-tools: [Read, Grep, Glob, Bash(git log:*), Bash(git for-each-ref:*), Bash(git ls-files:*), Bash(gh issue list:*), Bash(gh pr list:*)]
---

# Doc Drift Check

Docs describe the project as of whenever they were last touched, and nothing forces their prose
to keep up. This skill catches claims that were true once and aren't anymore, and reports them.
It doesn't edit the doc, polish wording, or fix formatting (`format-docs`).

## Scope

A fact-check pass, not an editorial one. It looks for claims about things that change over time:

- Deployment/hosting targets (where frontend/backend deploy, DNS provider)
- Stack choices (frameworks, libraries, database)
- Architectural decisions (layering rules, API style, module structure)
- Documented conventions (naming, testing, branch/PR format)

Outdated but well-worded is exactly the job; awkward but accurate is out of scope.

**Agent-skill files are docs too.** A skill makes the same checkable claims (a directory pattern, a
library choice, a naming convention), often paraphrasing a canonical doc -- and an agent *acts* on
it, so a stale claim there gets executed, not just read.

**Which docs:** if the user names a file (a skill file included), start there. If they ask about
"the docs" generally, ask which ones before scanning, and list the skill files among the options
rather than assuming "docs" means only the prose docs directory.

## Sources of truth

For architecture/convention claims, in rough order of authority (adjust to what the repo has):

1. A canonical conventions doc (`AGENTS.md`, `CONTRIBUTING.md`, or equivalent).
2. Architectural Decision Records (`docs/adr/*.md` or similar).
3. An architecture spec or design doc.

If these disagree with each other, surface it rather than silently picking one. **None of them is
ground truth by construction** -- a canonical doc's convention prose is a claim about the codebase
and goes stale the same way. Spot-check it against the tree when that's cheap; a conflict between
a canonical doc and the code is a finding, not a reason to trust the doc.

Most claims worth checking aren't in canonical docs at all, and the codebase is the source of
truth:

- **A referenced file/directory path** -- `Glob`/`Read` it; files get renamed without every doc
  that names them being updated.
- **A branch/commit/PR-title convention** -- `git for-each-ref`, `git log --oneline`, or
  `gh pr list --state merged` for real recent examples, not the doc's stated rule.
- **An issue-title convention** -- `gh issue list` for real recent titles.
- **A count, script assertion, or CI job name** -- read the script or workflow the doc summarizes;
  "asserts N tables" doesn't update itself when a change lands.
- **An npm script or CLI command the doc tells the reader to run** -- confirm it exists (e.g.
  `Grep` for `"<script>"` in `package.json`) and does what the doc says.

Cite what you actually checked (the file path, the command's real output, the script line), not
"seems outdated."

## Claims about what's deployed or enabled

A security policy, a feature's availability, a deploy target: if a fact could differ between a
fresh local build and what's live for real users, treat it as a claim about the deployed system,
whether or not the sentence says "production". More than one file can plausibly answer it -- an
applied migrations directory next to an ORM-generated local one, a prod config next to staging --
and the first grep hit is often the local/CI one, because a test script rebuilds it every run and
asserts something quotable about it. A script that asserts "N tables" on a database it just built
proves the schema is defined, not that it's live. Before treating such a fact as settled:

- **Look for a second candidate.** Case-insensitive `Grep` across the repo for the doc's own
  keyword ("migration", "row level security", "feature flag"), not just the first hit's path.
- **Find what a deploy step actually pushes.** A CI workflow, `Makefile` target, or
  `db push`/`migrate:deploy`-style command naming one directory shows which governs the live
  system.
- **Grep the docs directory for the same keyword.** A companion doc may already state the nuance
  more carefully -- and two docs disagreeing about one claim is itself drift to report.

## Workflow

1. **Read the target doc(s)**, scoped as above.
2. **Extract checkable claims**: "the frontend deploys to X", "we use GraphQL", "branches are
   named Z", "the verify script asserts 7 tables", "business logic lives in `usecases/<action>/`".
   Skip narrative, rationale, and opinion.
3. **Check each claim against the codebase when that's cheap**, even when it traces back to a
   canonical doc -- "the doc says so" is what a stale claim looks like until the one-command check.
   Fall back to citing the doc's own text only for claims too broad or subjective to spot-check (a
   design rationale).
4. **Report**, one entry per contradiction:

   ```
   ## [doc path]: [short label for the claim]
   **Doc says:** "[quoted claim, with line reference]"
   **Current truth:** [what the codebase/canonical doc actually shows now], per [source]
   ```

   If nothing is stale, say so plainly -- don't manufacture findings.
5. **Don't edit the doc.** Propose the corrected sentence in the finding and wait for the user to
   confirm before touching the file -- its wording is their call, even when the fact is
   unambiguous.
