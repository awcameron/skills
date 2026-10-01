// Checks every script a skill ships under skills/<name>/scripts/ is executable. A skill runs its
// script directly (`${CLAUDE_SKILL_DIR}/scripts/<file>`), so a copy committed without the
// executable bit passes every other check, then fails with "permission denied" in the user's repo.
// Also runs change_scope.sh against throwaway git repos.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";

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

describe("change_scope.sh", () => {
  const script = join(skillsDir, "review-code", "scripts", "change_scope.sh");
  let dir;
  // Keep the user's git config (default branch name, signing, hooks) out of the fixture repos.
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const git = (cwd, ...args) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, env })
      .toString()
      .trim();
  const commit = (cwd, message) => git(cwd, "commit", "--allow-empty", "-qm", message);
  const scope = (cwd) => execFileSync(script, { cwd, env }).toString();

  // upstream/main is two commits ahead of the fork's stale origin/main; the clone branches off
  // upstream/main and adds one commit.
  function forkClone() {
    const upstream = join(dir, "upstream");
    git(dir, "init", "-q", "-b", "main", upstream);
    commit(upstream, "one");
    git(dir, "clone", "-q", "--bare", upstream, join(dir, "fork.git"));
    commit(upstream, "two");
    const clone = join(dir, "clone");
    git(dir, "clone", "-q", join(dir, "fork.git"), clone);
    return { upstream, clone, upstreamHead: git(upstream, "rev-parse", "HEAD") };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "change-scope-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("diffs against origin when there's no upstream remote", () => {
    const { clone } = forkClone();
    const originHead = git(clone, "rev-parse", "origin/main");
    git(clone, "switch", "-qc", "feature");
    commit(clone, "mine");

    assert.match(
      scope(clone),
      new RegExp(`^base: ${originHead} \\(merge-base of origin/main and HEAD\\)`, "m"),
    );
  });

  it("diffs against upstream in a fork, not the fork's stale default branch", () => {
    const { upstream, clone, upstreamHead } = forkClone();
    git(clone, "remote", "add", "upstream", upstream);
    git(clone, "fetch", "-q", "upstream");
    git(clone, "switch", "-qc", "feature", "upstream/main");
    commit(clone, "mine");

    assert.match(
      scope(clone),
      new RegExp(`^base: ${upstreamHead} \\(merge-base of upstream/main and HEAD\\)`, "m"),
    );
  });
});
