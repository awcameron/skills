#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
mkdir -p src node_modules/chalk
cat > package.json <<'EOF'
{
  "name": "logger-fixture",
  "private": true,
  "dependencies": { "chalk": "^4.1.2" }
}
EOF
cat > src/log.js <<'EOF'
const chalk = require("chalk");

module.exports = function log(message) {
  console.log(chalk.green(message));
};
EOF
cat > node_modules/chalk/package.json <<'EOF'
{ "name": "chalk", "version": "4.1.2", "main": "source/index.js" }
EOF
printf 'node_modules/\n' > .gitignore
git add -A && git -c user.name=eval -c user.email=eval@example.com commit -qm "initial commit"
