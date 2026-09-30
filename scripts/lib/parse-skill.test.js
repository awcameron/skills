// Tests for scripts/lib/parse-skill.js -- the frontmatter reader shared by validate and eval.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  loadAllSkills,
  parseFrontmatterFields,
  parseFrontmatterYaml,
  readFrontmatterBlock,
} from "./parse-skill.js";

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "parse-skill-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeSkill(name, content) {
  mkdirSync(join(dir, name), { recursive: true });
  const path = join(dir, name, "SKILL.md");
  writeFileSync(path, content);
  return path;
}

describe("readFrontmatterBlock", () => {
  it("returns the text between the first pair of --- lines", () => {
    const path = writeSkill("a", "---\nname: a\ndescription: Does a.\n---\n\nBody.\n");
    assert.equal(readFrontmatterBlock(path), "name: a\ndescription: Does a.");
  });

  it("handles CRLF line endings", () => {
    const path = writeSkill("a", "---\r\nname: a\r\n---\r\nBody.\r\n");
    assert.equal(readFrontmatterBlock(path), "name: a");
  });

  it("throws, naming the file, when there's no frontmatter", () => {
    const path = writeSkill("a", "# Just a heading\n");
    assert.throws(() => readFrontmatterBlock(path), /no frontmatter block found/);
  });
});

describe("parseFrontmatterFields", () => {
  it("reads a single-line value and strips surrounding quotes", () => {
    assert.deepEqual(parseFrontmatterFields('name: a\ndescription: "Does a. Use when asked."'), {
      name: "a",
      description: "Does a. Use when asked.",
    });
  });

  it("joins a >- folded description's indented lines with spaces", () => {
    const block = "name: a\ndescription: >-\n  Does a thing.\n  Use when asked.\nallowed-tools: [Read]";
    assert.equal(parseFrontmatterFields(block).description, "Does a thing. Use when asked.");
  });

  it("returns null for a missing field", () => {
    assert.deepEqual(parseFrontmatterFields("name: a"), { name: "a", description: null });
  });
});

describe("parseFrontmatterYaml", () => {
  it("parses the full block, including lists", () => {
    assert.deepEqual(parseFrontmatterYaml("name: a\nallowed-tools: [Read, Grep]"), {
      name: "a",
      "allowed-tools": ["Read", "Grep"],
    });
  });

  it("returns an empty object for an empty block", () => {
    assert.deepEqual(parseFrontmatterYaml(""), {});
  });
});

describe("loadAllSkills", () => {
  it("reads every skill directory, sorted by name, and skips plain files", () => {
    writeSkill("b-skill", "---\nname: b-skill\ndescription: Does b.\n---\n");
    writeSkill("a-skill", "---\nname: a-skill\ndescription: Does a.\n---\n");
    writeFileSync(join(dir, "README.md"), "not a skill");

    assert.deepEqual(
      loadAllSkills(dir).map(({ dirName, name, description }) => ({ dirName, name, description })),
      [
        { dirName: "a-skill", name: "a-skill", description: "Does a." },
        { dirName: "b-skill", name: "b-skill", description: "Does b." },
      ],
    );
  });
});
