// Checks every script a skill ships under skills/<name>/scripts/ is executable. A skill runs its
// script directly (`${CLAUDE_SKILL_DIR}/scripts/<file>`), so a copy committed without the
// executable bit passes every other check, then fails with "permission denied" in the user's repo.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { accessSync, constants, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");

const skillScripts = readdirSync(skillsDir)
  .map((skill) => join(skillsDir, skill, "scripts"))
  .filter((dir) => existsSync(dir) && statSync(dir).isDirectory())
  .flatMap((dir) => readdirSync(dir).map((file) => join(dir, file)))
  .filter((path) => statSync(path).isFile());

describe("skill scripts", () => {
  it("at least one skill ships a script (so this check isn't vacuous)", () => {
    assert.ok(skillScripts.length > 0);
  });

  for (const script of skillScripts) {
    const label = script.slice(skillsDir.length + 1);
    it(`skills/${label} is executable`, () => {
      assert.doesNotThrow(
        () => accessSync(script, constants.X_OK),
        `run \`chmod +x skills/${label}\` (and \`git add\` it) so the skill can run it`,
      );
    });
  }
});
