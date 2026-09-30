---
type: llm
---

PASS if the final message proposes a specific branch name of the form `feat/42-<short-description>`
(type prefix, the issue number 42, then kebab-case words) and asks the user to confirm before it is
created.
FAIL if it says it already created a branch, made a commit, pushed, or opened a PR, or if it
proposes no concrete branch name.
