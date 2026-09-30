// Tests for hooks/session-start.sh's catalog entries. Uses node:test -- no dependency, same as
// validate-skills.test.js.
//
// The hook resolves skills/ relative to its own location, so each fixture copies it into a temp
// dir next to a fixture skills/ tree and runs that copy.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(REPO_ROOT, "hooks", "session-start.sh");

const tempDirs = [];

after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function runHook(hookPath, env = {}) {
  const stdout = execFileSync("bash", [hookPath], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return JSON.parse(stdout).hookSpecificOutput.additionalContext;
}

function catalogEntry(context, name) {
  return context.split("\n").find((line) => line.startsWith(`- \`${name}\`:`));
}

function hookWithSkill(name, description) {
  const root = mkdtempSync(join(tmpdir(), "session-start-test-"));
  tempDirs.push(root);
  mkdirSync(join(root, "hooks"));
  copyFileSync(HOOK, join(root, "hooks", "session-start.sh"));
  mkdirSync(join(root, "skills", name), { recursive: true });
  writeFileSync(
    join(root, "skills", name, "SKILL.md"),
    `---\nname: ${name}\ndescription: >-\n  ${description}\n---\n\nBody.\n`,
  );
  return join(root, "hooks", "session-start.sh");
}

describe("session-start catalog entries", () => {
  for (const locale of ["C", "en_US.UTF-8"]) {
    it(`doesn't cut at a mid-sentence "e.g." (LC_ALL=${locale})`, () => {
      const hook = hookWithSkill(
        "abbrev",
        "Fixes a bug from a known cause -- handed to it (e.g. a diagnosis report) or already known. Use when asked.",
      );
      assert.equal(
        catalogEntry(runHook(hook, { LC_ALL: locale }), "abbrev"),
        "- `abbrev`: Fixes a bug from a known cause -- handed to it (e.g. a diagnosis report) or already known.",
      );
    });
  }

  it("cuts at the first real sentence boundary", () => {
    const hook = hookWithSkill("two-sentences", "Does a thing. Use when the user asks for the thing.");
    assert.equal(
      catalogEntry(runHook(hook), "two-sentences"),
      "- `two-sentences`: Does a thing.",
    );
  });

  it("caps a long description with no sentence break", () => {
    const hook = hookWithSkill("long", "word ".repeat(60).trim());
    const entry = catalogEntry(runHook(hook), "long");
    assert.ok(entry.endsWith("..."), entry);
    assert.equal(entry.length, "- `long`: ".length + 160);
  });

  it("gives every real skill an entry that doesn't end mid-abbreviation", () => {
    const context = runHook(HOOK);
    const entries = context.split("\n").filter((line) => line.startsWith("- `"));
    assert.ok(entries.length > 0, "no catalog entries");
    for (const entry of entries) {
      assert.doesNotMatch(entry, /\b(e\.g|i\.e|etc)\.$/, entry);
    }
  });
});
