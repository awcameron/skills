# Security Policy

This repo has two distinct kinds of thing worth reporting a problem with: the usual
dependency/code vulnerabilities, and something more specific to what this repo actually is -- a
library of `SKILL.md` files whose instructions are read and *executed* by an AI agent, not just
read by a human.

## Reporting a conventional vulnerability

If you find a vulnerability in this repo's own code (the `scripts/` validators, CI workflows, or
build tooling) or in one of its dependencies, please report it privately rather than opening a
public issue:

- Preferred: use GitHub's [private vulnerability reporting](../../security/advisories/new) for
  this repo.
- If that's unavailable to you, open an issue with minimal detail (no exploit specifics) asking
  for a private channel, and the maintainer will follow up.

Please don't open a public issue or PR that includes exploit details before a fix is available.

## Reporting a malicious or unsafe skill

A `SKILL.md` file in this repo is not passive documentation -- it's a set of instructions an agent
follows, potentially including shell commands it's told to run. That makes "a submitted skill
whose instructions look designed to make an agent behave harmfully" a real, distinct threat model
here, separate from a conventional code vulnerability. Examples of what this covers:

- A skill that instructs an agent to exfiltrate secrets, credentials, or private repo contents
- A skill that instructs an agent to run destructive commands (e.g. against `main`, against a
  user's filesystem, or against production infrastructure) without being asked
- A skill that tries to disguise harmful instructions as something benign (prompt-injection-style
  phrasing, misleading naming, or instructions hidden in a way a human reviewer would likely miss)
- A skill that tries to get an agent to bypass another skill's or the repo's own documented
  guardrails (e.g. the confirmation checkpoints in [`create-pr`](skills/create-pr/SKILL.md))

If you find one, report it the same way as above (private vulnerability report preferred over a
public issue), including the skill's path and the specific instruction text that concerns you.

## Supported versions

This repo ships as a single rolling `main` branch (see [`docs/releasing.md`](docs/releasing.md))
rather than maintaining multiple supported version lines. Security fixes land on `main` and the
next release; there's no backport policy for older tagged versions.
