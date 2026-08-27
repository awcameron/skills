---
description: Write real tests grounded in this repo's actual test conventions
---

Invoke the agent-skills:write-tests skill against $ARGUMENTS (or the current diff if none was given).

Discover this repo's actual test runner, layout, and mocking conventions before writing anything
-- don't assume a house style. Pick unit vs. integration/e2e vs. browser based on what's actually
under test. Before reporting done, make the new test fail against the unfixed code and report
that verification honestly.
