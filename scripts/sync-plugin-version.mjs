#!/usr/bin/env node
// Syncs .claude-plugin/plugin.json's version field to match package.json's version.
// No dependencies -- deliberately, so this runs with a bare `node` install.
//
// Usage: node scripts/sync-plugin-version.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = join(repoRoot, "package.json");
const pluginPath = join(repoRoot, ".claude-plugin", "plugin.json");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const plugin = JSON.parse(readFileSync(pluginPath, "utf8"));

if (plugin.version === pkg.version) {
  console.log(`.claude-plugin/plugin.json already at ${pkg.version} -- nothing to do.`);
  process.exit(0);
}

const previousVersion = plugin.version;
plugin.version = pkg.version;
writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
console.log(`Synced .claude-plugin/plugin.json version: ${previousVersion} -> ${plugin.version}`);
