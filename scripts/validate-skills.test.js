// Tests for scripts/validate-skills.js. Uses node:test -- no dependency, consistent with the
// script itself being deliberately dependency-free.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";

import { validateSkill } from "./validate-skills.js";

const VALID_FRONTMATTER = `---
name: my-skill
description: Does a thing. Use when the user asks for the thing.
---

Body.
`;

let skillsDir;

beforeEach(() => {
  skillsDir = mkdtempSync(join(tmpdir(), "validate-skills-test-"));
});

after(() => {
  if (skillsDir) rmSync(skillsDir, { recursive: true, force: true });
});

function writeSkill(dirName, { frontmatter = VALID_FRONTMATTER, evalsJson } = {}) {
  const skillDir = join(skillsDir, dirName);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), frontmatter);
  if (evalsJson !== undefined) {
    mkdirSync(join(skillDir, "evals"), { recursive: true });
    writeFileSync(join(skillDir, "evals", "evals.json"), evalsJson);
  }
}

describe("validateSkill", () => {
  it("passes a well-formed skill with no evals directory at all", () => {
    writeSkill("my-skill");

    assert.deepEqual(validateSkill("my-skill", skillsDir), []);
  });

  it("passes a well-formed skill whose evals/evals.json is valid JSON", () => {
    writeSkill("my-skill", { evalsJson: `{"skill_name": "my-skill", "evals": []}` });

    assert.deepEqual(validateSkill("my-skill", skillsDir), []);
  });

  it("fails a skill whose evals/evals.json has trailing garbage after the JSON", () => {
    // The exact regression from PR #148: a stray `np` appended after the closing `}`.
    writeSkill("my-skill", { evalsJson: `{"skill_name": "my-skill", "evals": []}np` });

    const errors = validateSkill("my-skill", skillsDir);

    assert.equal(errors.length, 1);
    assert.match(errors[0], /evals\/evals\.json is not valid JSON/);
  });

  it("fails a skill whose evals/evals.json is empty", () => {
    writeSkill("my-skill", { evalsJson: "" });

    const errors = validateSkill("my-skill", skillsDir);

    assert.equal(errors.length, 1);
    assert.match(errors[0], /evals\/evals\.json is not valid JSON/);
  });

  it("fails a skill whose evals/evals.json is truncated mid-object", () => {
    writeSkill("my-skill", { evalsJson: `{"skill_name": "my-skill", "evals": [` });

    const errors = validateSkill("my-skill", skillsDir);

    assert.equal(errors.length, 1);
    assert.match(errors[0], /evals\/evals\.json is not valid JSON/);
  });

  it("still reports frontmatter errors independently of the evals.json check", () => {
    writeSkill("my-skill", {
      frontmatter: `---\nname: my-skill\n---\n`, // missing description
      evalsJson: `not json`,
    });

    const errors = validateSkill("my-skill", skillsDir);

    assert.equal(errors.length, 2);
    assert.ok(errors.some((e) => e.includes("missing `description`")));
    assert.ok(errors.some((e) => e.includes("evals/evals.json is not valid JSON")));
  });
});
