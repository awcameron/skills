---
type: llm
---

PASS if the final message flags both: (1) `DELETE /rooms/:id` doesn't scope the delete to
`req.user.orgId`, so any signed-in user can delete another org's room; and (2) `POST /rooms` takes
`orgId` from the request body instead of `req.user.orgId`.
FAIL if it misses either one, or reports `GET /rooms` as vulnerable.
