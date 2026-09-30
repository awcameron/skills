---
description: Given a failing test, the skill runs it, finds the off-by-one in src/range.js, and reports the cause with evidence -- leaving the source unfixed.
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
---

`npm test` is failing on the sumRange test. What's causing it?
