#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
mkdir -p migrations src deploy
cat > README.md <<'EOF'
# accounts-api

Deploys run from CI: apply pending migrations in `migrations/`, then roll the `api` Deployment
(see `deploy/api.yaml`) -- old and new pods serve traffic side by side during the rollout.
EOF
cat > deploy/api.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
EOF
cat > migrations/001_create_users.sql <<'EOF'
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL
);
EOF
cat > src/users.js <<'EOF'
export async function getUser(db, id) {
  const { rows } = await db.query("SELECT id, email, full_name FROM users WHERE id = $1", [id]);
  return rows[0];
}

export async function renameUser(db, id, fullName) {
  await db.query("UPDATE users SET full_name = $2 WHERE id = $1", [id, fullName]);
}
EOF
git add -A && git -c user.name=eval -c user.email=eval@example.com commit -qm "initial commit"
