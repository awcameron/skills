---
name: doc-fact-check
description: >-
  Cross-check a doc's factual and architectural claims against current truth and flag anything
  that's gone stale -- hosting/deploy targets, stack choices, layering rules, documented
  conventions, referenced file paths, naming conventions, and CLI commands a doc tells the reader
  to run -- checked against the codebase and git/GitHub history directly, not just the repo's own
  curated docs (the canonical doc can itself be the stale one). Use when the user asks whether a
  doc "is still accurate", to "check this doc for staleness", to "review/update a spec, plan,
  README, or onboarding doc against current facts", or points at any doc to verify it against
  reality. Also covers agent-skill files -- a skill file is documentation an agent acts on
  directly, so drift there is executed, not just read. Does NOT do mechanical Markdown formatting
  (that's `format-docs`) and does NOT review code quality (a separate code-review skill's job).
allowed-tools: [Read, Grep, Glob]
---

# Doc Drift Check

Docs describe the project as of whenever they were last touched. The project keeps moving.
Nothing forces a doc's prose to keep up -- so specs, plans, and READMEs quietly accumulate claims
that were true once and aren't anymore. This skill's job is narrow: catch that drift and report
it, without doing anything else to the doc.

## Scope

This is a fact-check pass, not an editorial one. It looks for claims about things that change
over time in a project:

- Deployment/hosting targets (where frontend/backend deploy, DNS provider)
- Stack choices (frameworks, libraries, database)
- Architectural decisions (layering rules, API style, module structure)
- Documented conventions (naming, testing, branch/PR format)

It is not a grammar check, a formatting pass, or a code review. If the doc's wording is fine but
outdated, that's exactly the job; if the wording is awkward but accurate, that's out of scope.

**Agent-skill files are in scope**, not just prose docs. A skill file makes the same kind of
checkable claims (a directory pattern, a library choice, a naming convention) and often quotes or
paraphrases one of the repo's canonical docs directly -- but unlike a README, an agent reads a
skill and then *acts* on it, so a stale claim there doesn't just mislead a reader, it gets
executed. When the user asks generally about "the docs," don't assume they meant only the prose
docs directory -- ask, or check both if the request is broad enough to plausibly cover skills too.

## Sources of truth

For architecture/convention-level claims, in rough order of authority (adjust to whatever a given
repo actually has):

1. A canonical conventions doc (`AGENTS.md`, `CONTRIBUTING.md`, or equivalent) -- the repo's own
   statement of architecture, conventions, and boundaries, if one exists.
2. Architectural Decision Records (`docs/adr/*.md` or similar) -- individual decisions with their
   own status/context/rationale.
3. An architecture spec or design doc describing the target structure and rollout plan.

If these disagree with each other, that's a separate problem worth surfacing to the user, not
something to silently resolve by picking one.

**None of these is ground truth by construction -- each can itself be the stale document.** A
canonical doc's own convention prose is a claim about the codebase, same as anything in a spec or
README, and it goes stale the same way: a module gets renamed, a pattern gets adopted, and the
sentence describing it doesn't get updated to match. So when a claim traces back to one of these
docs, still spot-check it against the tree when that's cheap (see below) rather than treating the
doc's word as final just because it outranks other docs in this list. A conflict between a
canonical doc and the actual codebase is a finding to report, not a reason to trust the doc over
the code.

**Most claims worth checking aren't covered by canonical docs at all**, and need the codebase
itself as the source of truth instead:

- **A referenced file/directory path** -- `find`/`ls`/`Read` it, don't assume the name in the doc
  still matches. A file gets renamed or consolidated without every doc that names it getting a
  matching edit.
- **A branch/commit/PR-title naming convention** -- `git for-each-ref`/`git log --oneline` for
  real recent examples, not the doc's own stated rule; a convention can drift in practice without
  anyone updating the doc that states it.
- **An issue-title/tracker convention** -- `gh issue list` for real recent titles, same reasoning.
- **A specific object count, script assertion, or CI job name** -- read the actual script or
  workflow file a doc's prose claims to summarize, not the doc's last-written number. A change
  landing shifts a count; a doc summarizing "asserts N tables" doesn't update itself.
- **An npm script or CLI command a doc tells the reader to run** -- check it actually exists
  (e.g. `grep '"<script>"' package.json`) and does what the doc says.

Treat these the same way as canonical docs: cite what you actually checked (the file path, the
git command's real output, the script line) in the finding, not "seems outdated."

**When a claim is about what's actually deployed or enabled, more than one file in the repo can
plausibly answer it -- and only one of them reflects reality.** A project can have a migrations
directory that's genuinely applied to production alongside a separate one an ORM generates for
local dev or CI (or a feature flag file next to the code path it's supposed to gate, or a staging
config next to a prod one). The trap is subtle: the *first* candidate a grep turns up is often a
local/CI-only one, because that's the one a test or verify script builds fresh on every run and
therefore the one with the most obvious, quotable assertion (an `EXPECT_*` constant, a "Builds the
schema from scratch and asserts N tables" comment) -- exactly the kind of concrete, checkable fact
this skill otherwise wants you to prefer. That concreteness is not the same as correctness: a
script asserting something about a database *it just built locally* proves the schema is defined
somewhere, not that it's live in the system users actually hit.

**This applies whether or not the doc's own sentence says "production" or "live."** Most claims
about security enforcement, access control, or what a system currently does for real users are
implicitly claims about the deployed system, not about what the code is capable of once built --
a doc rarely bothers spelling out "in production" for a security claim any more than it spells out
"when you're breathing" for a claim about a running process. The tell isn't the doc's wording, it's
the *subject*: ask whether this fact could plausibly differ between a fresh local build and what's
actually live for real users (a security policy, a feature's availability, a deploy target). If
it could, treat it as exactly this kind of claim regardless of whether the sentence in front of you
happens to say so. Before treating such a count or flag as settled:

- **Ask whether a second candidate exists before trusting the first.** Search the whole repo for
  the general concept (`grep -ri` for the doc's actual keyword -- "migration", "row level
  security", "feature flag" -- not just the specific path the first hit came from), since a
  same-sounding fact can live in two differently-structured places (e.g. an ORM's numbered
  migrations next to a separately-versioned, timestamp-named directory the actual database
  provider applies).
- **Look for what a deploy step actually pushes**, not what a local script rebuilds. A CI
  workflow, `Makefile` target, or `db push`/`migrate:deploy`-style command that names one specific
  directory is the tell for which one governs the live system; a script that starts from an empty
  database and reports "N tables" is proving its own fixture, not production.
- **Grep the docs directory itself for the same keyword**, not just the code. A companion doc
  covering the same topic in more careful language is often the fastest way to discover a fact has
  more nuance than the doc in front of you assumes -- cheaper than re-deriving it from the
  codebase alone, and two docs quietly disagreeing about the same claim (one already corrected) is
  itself exactly the kind of drift this skill exists to catch.

## Workflow

1. **Read the target doc(s).** If the user pointed at a specific file (including a skill file),
   start there. If they asked about "the docs" generally, ask which one(s) before scanning
   broadly, and don't assume that excludes skills -- don't guess scope.

2. **Extract factual/architectural claims.** Pull out every sentence that asserts something
   checkable: "the frontend deploys to X", "we use GraphQL", "auth is handled by Y", "branches are
   named Z", "this file is 15 lines", "the verify script asserts 7 tables", "business logic lives
   in `usecases/<action>/`". Skip prose that's just narrative, rationale, or opinion with nothing
   to verify.

3. **Cross-check each claim against the codebase itself whenever that's cheap**, even when the
   claim also traces back to a canonical doc -- a cited path exists (`find`/`Read`), a named
   directory pattern actually appears, a named library is really a dependency
   (`grep '"<pkg>"' */package.json`). Don't stop at "the doc says so" and call the claim confirmed:
   that's exactly what a stale claim looks like right up until the one-command check. Only fall
   back to citing the canonical doc's own text, without an independent tree check, for a claim
   that's genuinely too broad or subjective to spot-check this way (an architectural rationale, a
   design intent) -- most of what's worth checking isn't that kind of claim (see above).

4. **Report findings**, one entry per contradiction found:

   ```
   ## [doc path]: [short label for the claim]
   **Doc says:** "[quoted claim, with line reference]"
   **Current truth:** [what the codebase/canonical doc actually shows now], per [source]
   ```

   If nothing is stale, say so plainly -- don't manufacture findings to justify the pass.

5. **Do not edit the doc.** Propose the fix as part of the finding (what the corrected sentence
   would say) and wait for the user to confirm before touching the file. A doc's wording is the
   user's call, even when the fact behind it is unambiguous -- correct it only after the user
   confirms the actual answer, never by silently rewriting the sentence during the check.

## Why not fold this into `format-docs`

`format-docs` deliberately stays mechanical -- formatting-safe whitespace it can apply directly,
versus structural issues (headings, cross-doc consistency) it flags but never silently resolves.
Fact-checking a doc's claims against the rest of the repo is a different kind of risk again:
getting it wrong doesn't just misformat a file, it either misses real drift or "corrects"
something the user didn't actually confirm. Keeping it a separate skill keeps that risk boundary
clear rather than quietly expanding what `format-docs` is trusted to decide on its own.
