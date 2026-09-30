---
description: Verify identity and resource ownership at every layer, not just the first one
---

Invoke the awcameron-skills:zero-trust-architecture skill against $ARGUMENTS (or the current diff if none was given).

First find this repo's own layers -- its guard/middleware chain, how identity and tenant are
attached to a request, any database-level isolation backstop, how services authenticate to each
other -- and keep new code consistent with them rather than adding a competing pattern. Then
check that each layer verifies the caller and their ownership of the specific resource on its
own, never trusting a client-supplied id or an earlier layer having passed.
