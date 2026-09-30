---
description: Under a rolling deploy, a column rename is planned as expand-contract across separate deploys, not a single in-place RENAME.
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
---

I want to rename users.full_name to display_name. Give me the plan -- don't change any files yet.
