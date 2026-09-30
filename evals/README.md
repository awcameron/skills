# Skill evals

How this repo checks whether its skills actually work: that they're well-formed, and that they
**trigger** on the vocabulary a user would actually say without stealing each other's prompts.

## The two tiers here

| Tier | What it checks | Runs | Cost |
|---|---|---|---|
| 1. Structural | Frontmatter `name`/`description` validity, name-matches-directory, a stated trigger condition | `node scripts/validate-skills.js` | Free |
| 2. Trigger & routing | Positive prompts rank their skill in the top-k; negative prompts don't let it beat the skill that should actually own them; no two descriptions collide | `node scripts/run-evals.js` | Free |

Both are deterministic and dependency-free -- no LLM call, safe to run in CI on every change.

There's a Tier 3 too -- behavioral, running a skill through a real agent and grading what it did
-- but it isn't run by anything in this `evals/` directory, and not in CI (it needs a credential
and costs money per run). It comes in two formats, and neither tool reads the other's files:

- **`claude plugin eval` cases** in [`plugin-evals/`](../plugin-evals/README.md) -- one directory
  per case, each with a prompt, a fixture-building script, and graders. This is the suite to run.
- **skill-creator cases** in `skills/<name>/evals/evals.json` (a prompt plus an `expected_output`
  description), run through the skill-creator plugin. The older format; these cases were written
  against another repo's files, so they don't run as-is here.

Which skills have which is listed in [`docs/skill-anatomy.md`](../docs/skill-anatomy.md) rather
than here, so there's one list to keep current. `npm test` fails if a skill has neither.

## What Tier 2 actually is

`scripts/run-evals.js` fits a small TF-IDF model over every skill's `description` field
(`scripts/lib/tfidf.js`), then scores each eval prompt in `evals/cases/<skill>.json` against every
skill by cosine similarity. This is a **lexical approximation** of routing -- it cannot judge
semantics, only vocabulary overlap. That's a known, accepted limitation: it catches the two
failure modes that actually dominate real trigger bugs --

- a description missing the vocabulary a user would actually say (a positive case ranks too low),
- an over-broad or accidentally-overlapping description that steals another skill's prompts (a
  negative case doesn't get correctly out-ranked, or two descriptions collide directly),

-- without needing a token spend to check for either one. A Tier-2 failure usually means *fix the
description*, not the eval or the test case. That's a real thing this repo's own eval run caught:
`terse-reports`'s description originally listed "PR descriptions" as an example of what it *doesn't*
apply to, and that vocabulary overlap alone was enough to briefly outrank `create-pr` on a prompt
about writing one -- the description was reworded to drop the specific phrase, not the test.

## Eval case format

One file per skill: `evals/cases/<skill-name>.json`.

```json
{
  "skill_name": "write-tests",
  "trigger": {
    "positive": [
      { "prompt": "write tests for this bug fix", "top_k": 2 }
    ],
    "negative": [
      { "prompt": "review this diff for code quality issues", "owner": "review-code" }
    ]
  }
}
```

- **`positive`**: a prompt a real user might send that should trigger this skill. `top_k` is how
  far down the ranking is still acceptable -- `1` demands this skill wins outright; a higher
  number tolerates a close, reasonable neighbor without demanding first place.
- **`negative`**: a prompt that's superficially similar but should actually belong to a different
  skill (`owner`). Checks discrimination, not just recall -- a skill that fires on everything
  passes every positive case and fails every negative one.

Write these from real, honest phrasing -- not phrasing hand-picked to pass. A negative case that
can't currently fail isn't testing anything, same principle as `write-tests`' "prove it can fail"
rule for a unit test.

## Running

```bash
node scripts/run-evals.js                  # full report: routing, collisions, summary
node scripts/run-evals.js --min-rank1 80    # exits 1 if positive-case rank-1 rate is below 80%
```

Any positive case outside its `top_k`, any negative case not correctly out-ranked, any unknown
`skill_name` in a case file, or any skill with no case file at all also fails the run outright,
independent of `--min-rank1` (which only gates the softer rank-1-exactly metric, not top-k
pass/fail, negative-case correctness, or coverage).

## Adding a case for a new skill

Add `evals/cases/<skill-name>.json` alongside the skill (see `docs/skill-anatomy.md`'s
contributing checklist). At minimum: two or three positive prompts using phrasing you'd actually
type, and one negative prompt aimed at whichever existing skill sounds closest to it -- that pair
is what actually exercises the model's ability to tell them apart.
