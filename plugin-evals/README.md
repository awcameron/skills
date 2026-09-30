# Behavioral evals (`claude plugin eval`)

The Tier-3 suite: each case runs a real prompt through Claude Code with this plugin loaded, in an
empty workspace seeded by the case's `scaffold.sh`, then grades what happened. The Tier-1/2 checks
in [`evals/`](../evals/README.md) only look at skill files; these look at behavior.

`.claude-plugin/plugin.json` points the runner here (`"experimental": { "evals": "plugin-evals" }`),
because `evals/` already holds the trigger-routing cases.

## Layout

```text
plugin-evals/
  <skill-name>/            # one directory per skill (npm test checks each name is a real skill)
    <case>/
      prompt.md            # frontmatter: run limits, tools; body: the user's request
      case.yaml            # optional: names scaffold.sh
      scaffold.sh          # optional: builds the fixture repo the run starts in
      graders/*.md         # one check each
```

Each case pairs `skill-fired` (did the skill run -- reported, not scored, in a two-arm run) with
graders on the outcome: a file's final contents, a tool that must or must not be called, or a
short `llm` rubric. Format reference: <https://code.claude.com/docs/en/plugin-evals>.

## Running it

From the repo root:

```bash
claude plugin eval . --scaffold \
  --allow-tools Bash Edit Write \
    "WebFetch(domain:github.com)" "WebFetch(domain:raw.githubusercontent.com)" \
    "WebFetch(domain:registry.npmjs.org)"
```

- `--scaffold` runs each case's `scaffold.sh` (this repo's own scripts: they only write fixture
  files and a git commit into the run's empty workspace).
- `Edit`/`Write` are granted to every case; the cases that must not edit assert that with a
  `max: 0` grader.
- Defaults: 3 runs per case, plus a no-plugin baseline arm (`W/OUT` and `Δ` columns). For a quick
  smoke pass: `--runs 1 --ablation none`, and `--case 'fix-bug*'` for one case.
- Cost: a full default run is roughly $10; `--runs 1` with the baseline is about $2.50. Set
  `--max-cost-usd` to cap it.
- Results land in `plugin-evals/results/` (gitignored).

Not run in CI: it needs a Claude credential and costs money per run. `npm test` does check that
every skill has a case (here, or a skill-creator `skills/<name>/evals/evals.json`) and that each
case has a grader and an executable scaffold script.

## Known caveats

- On macOS without the Xcode command-line tools, `git` inside the run's sandbox is the Xcode stub
  and fails, so skills that inspect git state fall back to reading files.
- Most cases also pass without the plugin on current models -- they guard against a skill
  regressing, not prove the skill is needed. A case with `Δ` near 0 is a candidate for a harder
  fixture.
