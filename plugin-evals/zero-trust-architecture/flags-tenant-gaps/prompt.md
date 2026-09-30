---
description: The skill flags both tenant gaps in a routes file -- a delete not scoped to the caller's org, and a create that trusts a client-supplied orgId -- without flagging the correctly scoped list route.
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash, Edit, Write]
---

Can you check src/routes/rooms.js for authorization gaps? Just report -- don't change anything.
