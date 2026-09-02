---
description: Implement a fix from a confirmed root cause, then hand off to write-tests/review-code/create-pr
---

Invoke the skills:fix-bug skill against: $ARGUMENTS

Require a confirmed root cause before touching anything -- run diagnose-bug first if one isn't
already established. Target the actual cause, not the reported symptom, check for the same
defect shape elsewhere in the codebase, and verify the fix with a throwaway check before handing
off to write-tests for the regression test, review-code for a standards check, and create-pr to
ship. Don't write the regression test or open the PR yourself.
