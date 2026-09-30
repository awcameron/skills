---
name: choose-subagent-hard-write-task
description: A write task with a stubborn, unexplained bug stays on the write-capable agent type but moves to a stronger model.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

I'm about to hand a subagent this: "fix the intermittent data corruption in the sync worker --
we've looked for a day and still have no idea what causes it, then commit the fix." Which agent
type and model should it run on? Just recommend -- don't spawn anything.
