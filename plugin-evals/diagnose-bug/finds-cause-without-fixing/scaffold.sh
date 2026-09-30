#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
mkdir -p src test
cat > package.json <<'EOF'
{
  "name": "range-fixture",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
EOF
cat > src/range.js <<'EOF'
// Sums the integers from start to end, inclusive of both.
export function sumRange(start, end) {
  let total = 0;
  for (let i = start; i < end; i++) {
    total += i;
  }
  return total;
}
EOF
cat > test/range.test.js <<'EOF'
import test from "node:test";
import assert from "node:assert/strict";
import { sumRange } from "../src/range.js";

test("sumRange includes both ends", () => {
  assert.equal(sumRange(1, 3), 6);
});
EOF
git add -A && git -c user.name=eval -c user.email=eval@example.com commit -qm "initial commit"
