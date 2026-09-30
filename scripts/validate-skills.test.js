// Tests for scripts/validate-skills.js. Uses node:test -- no dependency, consistent with the
// script itself being deliberately dependency-free.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";

import {
  SOFT_DESCRIPTION_LENGTH,
  skillWarnings,
  validateReadmeCatalog,
  validateSharedScripts,
  validateSkill,
  validateVersionSync,
} from "./validate-skills.js";

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

describe("validateVersionSync", () => {
  function writeVersionFiles({ pkg = "1.2.3", plugin = "1.2.3", lock = "1.2.3", lockRoot = "1.2.3" } = {}) {
    mkdirSync(join(skillsDir, ".claude-plugin"), { recursive: true });
    writeFileSync(join(skillsDir, "package.json"), JSON.stringify({ version: pkg }));
    writeFileSync(join(skillsDir, ".claude-plugin", "plugin.json"), JSON.stringify({ version: plugin }));
    writeFileSync(
      join(skillsDir, "package-lock.json"),
      JSON.stringify({ version: lock, packages: { "": { version: lockRoot } } }),
    );
  }

  it("passes when package.json, plugin.json, and package-lock.json all agree", () => {
    writeVersionFiles();

    assert.deepEqual(validateVersionSync(skillsDir), []);
  });

  it("fails when package-lock.json lags package.json (the drift from PR #180)", () => {
    writeVersionFiles({ pkg: "0.12.4", plugin: "0.12.4", lock: "0.12.3", lockRoot: "0.12.3" });

    const errors = validateVersionSync(skillsDir);

    assert.equal(errors.length, 2);
    assert.match(errors[0], /package-lock\.json version is "0\.12\.3", expected "0\.12\.4"/);
    assert.match(errors[1], /packages\[""\]/);
  });

  it("fails when plugin.json lags package.json", () => {
    writeVersionFiles({ plugin: "1.2.2" });

    const errors = validateVersionSync(skillsDir);

    assert.equal(errors.length, 1);
    assert.match(errors[0], /plugin\.json version is "1\.2\.2"/);
  });

  it("reports a single readable error when a version file is missing", () => {
    const errors = validateVersionSync(skillsDir);

    assert.equal(errors.length, 1);
    assert.match(errors[0], /could not read version files/);
  });
});

describe("skillWarnings", () => {
  const withDescription = (description) =>
    `---\nname: my-skill\ndescription: ${description}\n---\n\nBody.\n`;

  it("doesn't warn at or under the soft limit", () => {
    const description = "Use when asked. ".padEnd(SOFT_DESCRIPTION_LENGTH, "x");
    writeSkill("my-skill", { frontmatter: withDescription(description) });

    assert.deepEqual(skillWarnings("my-skill", skillsDir), []);
  });

  it("warns, without failing validation, over the soft limit", () => {
    const description = "Use when asked. ".padEnd(SOFT_DESCRIPTION_LENGTH + 1, "x");
    writeSkill("my-skill", { frontmatter: withDescription(description) });

    const warnings = skillWarnings("my-skill", skillsDir);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], new RegExp(`${SOFT_DESCRIPTION_LENGTH + 1} chars`));
    assert.deepEqual(validateSkill("my-skill", skillsDir), []);
  });

  it("warns, without failing validation, on a body command allowed-tools doesn't cover", () => {
    writeSkill("my-skill", {
      frontmatter: `---\nname: my-skill\ndescription: Does a thing. Use when asked.\nallowed-tools: [Read, Bash(git status:*)]\n---\n\nRun \`git status\`, then \`git stash\`.\n`,
    });

    const warnings = skillWarnings("my-skill", skillsDir);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /line 7: `git stash` isn't covered by allowed-tools/);
    assert.deepEqual(validateSkill("my-skill", skillsDir), []);
  });

  it("returns no warnings for a missing SKILL.md (validateSkill reports that)", () => {
    assert.deepEqual(skillWarnings("does-not-exist", skillsDir), []);
  });
});

describe("validateSharedScripts", () => {
  const writeScript = (skill, file, content) => {
    mkdirSync(join(skillsDir, skill, "scripts"), { recursive: true });
    writeFileSync(join(skillsDir, skill, "scripts", file), content);
  };

  it("passes when a script shared by two skills is identical in both", () => {
    writeScript("a-skill", "shared.sh", "echo hi\n");
    writeScript("b-skill", "shared.sh", "echo hi\n");
    writeScript("b-skill", "own.sh", "echo only b\n");

    assert.deepEqual(validateSharedScripts(skillsDir), []);
  });

  it("fails when the copies differ", () => {
    writeScript("a-skill", "shared.sh", "echo hi\n");
    writeScript("b-skill", "shared.sh", "echo bye\n");

    const errors = validateSharedScripts(skillsDir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /skills\/b-skill\/scripts\/shared\.sh differs from skills\/a-skill/);
  });

  it("ignores skills without a scripts/ directory", () => {
    writeSkill("my-skill");

    assert.deepEqual(validateSharedScripts(skillsDir), []);
  });
});

describe("validateReadmeCatalog", () => {
  const entry = (name, target = `skills/${name}/SKILL.md`) =>
    `| [\`${name}\`](${target}) | Doing a thing. | Some stage |\n`;
  const writeReadme = (entries) => {
    const path = join(skillsDir, "README.md");
    writeFileSync(
      path,
      `# Title\n\n## What's here\n\n### Group\n\n${entries.join("")}\n## Philosophy\n\n${entry("after-section")}`,
    );
    return path;
  };

  it("passes when every skill is listed once, with its own link", () => {
    const readme = writeReadme([entry("a-skill"), entry("b-skill")]);

    assert.deepEqual(validateReadmeCatalog(["a-skill", "b-skill"], readme), []);
  });

  it("fails on a skill with no entry, and ignores entries outside the section", () => {
    const readme = writeReadme([entry("a-skill")]);

    assert.deepEqual(validateReadmeCatalog(["a-skill", "b-skill"], readme), [
      `skills/b-skill/ has no entry in README's "What's here"`,
    ]);
  });

  it("fails on an entry for a skill that doesn't exist", () => {
    const readme = writeReadme([entry("a-skill"), entry("gone-skill")]);

    assert.deepEqual(validateReadmeCatalog(["a-skill"], readme), [
      "README's \"What's here\" lists `gone-skill`, but there's no skills/gone-skill/",
    ]);
  });

  it("fails on a duplicate entry or a link to another skill's file", () => {
    const readme = writeReadme([entry("a-skill"), entry("a-skill", "skills/b-skill/SKILL.md")]);

    const errors = validateReadmeCatalog(["a-skill", "b-skill"], readme);
    assert.equal(errors.length, 3);
    assert.match(errors[0], /`a-skill` links to skills\/b-skill\/SKILL\.md/);
    assert.match(errors[1], /skills\/b-skill\/ has no entry/);
    assert.match(errors[2], /lists `a-skill` 2 times/);
  });

  it("fails when the section is missing", () => {
    const path = join(skillsDir, "README.md");
    writeFileSync(path, "# Title\n\n## Something else\n");

    assert.deepEqual(validateReadmeCatalog(["a-skill"], path), [
      `README.md has no "## What's here" section`,
    ]);
  });
});
