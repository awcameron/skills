---
description: Handed a confirmed root cause, the skill runs the failing test before editing, fixes the loop bound, re-runs the test, and doesn't write a permanent test of its own.
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
---

The root cause is confirmed: in src/range.js, sumRange's loop uses `i < end`, but the function is
documented as inclusive, so it drops `end`. The failing test in test/range.test.js is correct. Go
ahead and fix it.
