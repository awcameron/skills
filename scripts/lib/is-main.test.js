// Tests for scripts/lib/is-main.js.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, describe, it } from "node:test";

import { isMain } from "./is-main.js";

const dir = mkdtempSync(join(tmpdir(), "is-main-test-"));
const isMainUrl = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "is-main.js")).href;

after(() => rmSync(dir, { recursive: true, force: true }));

/** Writes a script that prints whether it was run directly, and runs it via `scriptPath`. */
function runScript(scriptDir, scriptPath = join(scriptDir, "script.mjs")) {
  mkdirSync(scriptDir, { recursive: true });
  writeFileSync(
    join(scriptDir, "script.mjs"),
    `import { isMain } from ${JSON.stringify(isMainUrl)};\nconsole.log(isMain(import.meta.url));\n`,
  );
  return execFileSync(process.execPath, [scriptPath], { encoding: "utf8" }).trim();
}

describe("isMain", () => {
  it("is true for the script node was started with", () => {
    assert.equal(runScript(join(dir, "plain")), "true");
  });

  it("is true under a path containing a space (the old file:// comparison was false)", () => {
    assert.equal(runScript(join(dir, "with space")), "true");
  });

  it("is true when the script is run through a symlinked directory", () => {
    const real = join(dir, "real");
    runScript(real);
    symlinkSync(real, join(dir, "link"));
    assert.equal(runScript(real, join(dir, "link", "script.mjs")), "true");
  });

  it("is false for a module that isn't the entry script, or with no argv[1]", () => {
    assert.equal(isMain(isMainUrl, join(dir, "plain", "script.mjs")), false);
    assert.equal(isMain(isMainUrl, undefined), false);
  });
});
