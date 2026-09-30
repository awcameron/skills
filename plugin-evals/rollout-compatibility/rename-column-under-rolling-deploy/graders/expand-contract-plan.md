---
type: llm
---

PASS if the plan spans several deploys in expand-contract order: add `display_name`, write both
columns and backfill, switch reads to `display_name`, and drop `full_name` only in a later deploy
once no running version reads it -- and it ties this to old and new pods running side by side
during the rolling deploy.
FAIL if it proposes a single `ALTER TABLE ... RENAME COLUMN` (or add-and-drop) shipped in the
same deploy as the code change.
