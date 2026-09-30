#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
mkdir -p src
cat > AGENTS.md <<'EOF'
# AGENTS.md

## Branching, commits, and PRs

- Branch names: `<type>/<issue-number>-<short-description>`, e.g. `feat/12-add-login`.
- PR titles and commit subjects: Conventional Commits, `<type>: <subject>`.
- Never push directly to `main`.
EOF
cat > src/greet.js <<'EOF'
export function greet(name) {
  return `Hello, ${name}!`;
}
EOF
git add -A && git -c user.name=eval -c user.email=eval@example.com commit -qm "initial commit"
cat >> src/greet.js <<'EOF'

export function farewell(name) {
  return `Goodbye, ${name}!`;
}
EOF
