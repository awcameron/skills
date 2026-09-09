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

    // "missing description" is reported twice on purpose: once by the hand-written check above,
    // once by schema validation (which also catches shape errors the hand-written check doesn't,
    // e.g. an unknown key) -- see the "schema checks" describe block below.
    assert.equal(errors.length, 3);
    assert.ok(errors.some((e) => e.includes("missing `description`")));
    assert.ok(errors.some((e) => e.includes("evals/evals.json is not valid JSON")));
  });
});

describe("validateSkill -- schema checks", () => {
  it("fails a skill with an unrecognized frontmatter key", () => {
    writeSkill("my-skill", {
      frontmatter: `---\nname: my-skill\ndescription: Does a thing. Use when the thing is needed.\nfoo: bar\n---\n`,
    });

    const errors = validateSkill("my-skill", skillsDir);

    assert.ok(errors.some((e) => e.includes("additional properties")));
  });

  it("fails allowed-tools given as a space-separated string (the spec's form, not this repo's)", () => {
    writeSkill("my-skill", {
      frontmatter:
        `---\nname: my-skill\ndescription: Does a thing. Use when the thing is needed.\n` +
        `allowed-tools: Read Grep\n---\n`,
    });

    const errors = validateSkill("my-skill", skillsDir);

    assert.ok(errors.some((e) => e.includes("frontmatter")));
  });

  it("passes allowed-tools given as a YAML list (this repo's convention)", () => {
    writeSkill("my-skill", {
      frontmatter:
        `---\nname: my-skill\ndescription: Does a thing. Use when the thing is needed.\n` +
        `allowed-tools: [Read, Grep]\n---\n`,
    });

    assert.deepEqual(validateSkill("my-skill", skillsDir), []);
  });

  it("fails a compatibility field over 500 characters", () => {
    writeSkill("my-skill", {
      frontmatter:
        `---\nname: my-skill\ndescription: Does a thing. Use when the thing is needed.\n` +
        `compatibility: ${"x".repeat(501)}\n---\n`,
    });

    const errors = validateSkill("my-skill", skillsDir);

    assert.ok(errors.some((e) => e.includes("frontmatter")));
  });

  it("fails a description over 1024 characters", () => {
    writeSkill("my-skill", {
      frontmatter: `---\nname: my-skill\ndescription: "${"Use when needed. ".repeat(70)}"\n---\n`,
    });

    const errors = validateSkill("my-skill", skillsDir);

    assert.ok(errors.some((e) => e.includes("over the 1024-char guideline")));
    assert.ok(errors.some((e) => e.includes("frontmatter") && e.includes("more than 1024 characters")));
  });

  it("fails metadata with a non-string value", () => {
    writeSkill("my-skill", {
      frontmatter:
        `---\nname: my-skill\ndescription: Does a thing. Use when the thing is needed.\n` +
        `metadata:\n  count: 3\n---\n`,
    });

    const errors = validateSkill("my-skill", skillsDir);

    assert.ok(errors.some((e) => e.includes("frontmatter")));
  });

  it("passes metadata with string values", () => {
    writeSkill("my-skill", {
      frontmatter:
        `---\nname: my-skill\ndescription: Does a thing. Use when the thing is needed.\n` +
        `metadata:\n  key: value\n---\n`,
    });

    assert.deepEqual(validateSkill("my-skill", skillsDir), []);
  });

  it("passes a license string", () => {
    writeSkill("my-skill", {
      frontmatter:
        `---\nname: my-skill\ndescription: Does a thing. Use when the thing is needed.\n` +
        `license: MIT\n---\n`,
    });

    assert.deepEqual(validateSkill("my-skill", skillsDir), []);
  });
});
