---
description: Discover this repo's own coding standards and review a diff or PR against them
---

Invoke the skills:review-code skill against $ARGUMENTS (or the current local diff if none was given).

First discover this repo's own coding, observability, and security standards (its conventions
doc, its lint config, its ADRs) -- don't review against assumed or remembered conventions from a
different codebase. Report findings by severity (Blocker / Error / Needs Confirmation / Warning /
Suggestion), with file:line references. Report only -- do not auto-fix.
