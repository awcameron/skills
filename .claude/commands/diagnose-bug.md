---
description: Diagnose the root cause of a bug -- evidence, minimal repro, one hypothesis at a time
---

Invoke the awcameron-skills:diagnose-bug skill against: $ARGUMENTS

Get the actual error/stack trace/failing output before reading any code, reproduce it minimally
(confirming the repro environment actually runs first), localize by reading -- not guessing --
and test one falsifiable hypothesis at a time until the root cause is confirmed with real
evidence. Report the root cause and where the fix belongs; do not implement the fix.
