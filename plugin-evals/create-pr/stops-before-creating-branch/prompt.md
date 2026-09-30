---
description: Asked to open a PR from uncommitted changes on main, the skill proposes a branch name from the repo's documented convention and stops for confirmation instead of branching, committing, or pushing.
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

Open a PR for these changes -- it's for issue #42.
