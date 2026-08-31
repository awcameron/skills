---
description: Cross-check a doc's factual claims against the current codebase and flag anything stale
---

Invoke the agent-skills:doc-fact-check skill against $ARGUMENTS (or ask me which doc if none was given).

Extract the doc's checkable factual/architectural claims (stack, hosting, file paths, naming
conventions, counts, commands) and cross-check each one against the codebase itself, not just
against another curated doc. Report drift as `doc says` vs. `current truth`, with what you
actually checked cited. Do not edit the doc -- propose the fix and wait for confirmation.
