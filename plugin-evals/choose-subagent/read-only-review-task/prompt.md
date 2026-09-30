---
name: choose-subagent-read-only-review-task
description: A review-and-report task goes on a read-only or cheaper agent, not the default write-capable one.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

I'm about to hand "review PR #12 against our coding standards and report findings" to a subagent.
Which agent type and model should it run on? Just recommend -- don't spawn anything.
