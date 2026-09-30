---
description: Build one feature across contract, backend, and frontend from a single shared type
---

Invoke the awcameron-skills:fullstack-feature-slice skill against $ARGUMENTS

First find this repo's own layers -- the shared contract and how it's consumed, the backend
and frontend layouts, the shared API client, the authorization and error-handling conventions --
and read the closest existing feature end to end. Then build the contract first and derive every
other layer's type from it. Describe any Ask-First item (a new dependency, a schema change)
instead of writing it, and report the layers touched.
