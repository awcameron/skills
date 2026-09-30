---
description: Keep a contract change safe while old and new versions run side by side
---

Invoke the awcameron-skills:rollout-compatibility skill against $ARGUMENTS

First find this repo's own deployment model -- whether the contract, its producers, and its
consumers ship atomically or on separate schedules. If they ship atomically, say so and stop.
Otherwise plan the change so every version live during the rollout keeps working: additive
first, expand-contract for schema changes, and removal only after nothing reads the old shape.
