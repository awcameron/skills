#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
mkdir -p src/middleware src/routes
cat > src/middleware/auth.js <<'EOF'
import { verifySession } from "../session.js";

// Verifies the session token and attaches the caller's identity and org.
export async function requireAuth(req, res, next) {
  const session = await verifySession(req.headers.authorization);
  if (!session) return res.status(401).end();
  req.user = { id: session.userId, orgId: session.orgId };
  next();
}
EOF
cat > src/routes/rooms.js <<'EOF'
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

export const rooms = Router();

rooms.get("/rooms", requireAuth, async (req, res) => {
  const { rows } = await db.query("SELECT * FROM rooms WHERE org_id = $1", [req.user.orgId]);
  res.json(rows);
});

rooms.post("/rooms", requireAuth, async (req, res) => {
  const { name, orgId } = req.body;
  const { rows } = await db.query(
    "INSERT INTO rooms (name, org_id) VALUES ($1, $2) RETURNING *",
    [name, orgId],
  );
  res.status(201).json(rows[0]);
});

rooms.delete("/rooms/:id", requireAuth, async (req, res) => {
  await db.query("DELETE FROM rooms WHERE id = $1", [req.params.id]);
  res.status(204).end();
});
EOF
git add -A && git -c user.name=eval -c user.email=eval@example.com commit -qm "initial commit"
