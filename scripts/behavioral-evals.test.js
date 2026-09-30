// Structural checks for the Tier-3 behavioral evals. Nothing here runs a model -- it checks that
// every skill has at least one behavioral case, and that each `claude plugin eval` case under
// plugin-evals/ is shaped so the runner will load it.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { accessSync, constants, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(repoRoot, "skills");
const manifest = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "plugin.json"), "utf8"));
const suiteDir = join(repoRoot, manifest.experimental?.evals ?? "evals");

const subdirs = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()) : [];

const isCase = (dir) => existsSync(join(dir, "prompt.md")) || existsSync(join(dir, "case.yaml"));

/** Case directories for one skill: plugin-evals/<skill>/<case>/. */
const casesFor = (skill) =>
  subdirs(join(suiteDir, skill))
    .map((name) => join(suiteDir, skill, name))
    .filter(isCase);

const skills = subdirs(skillsDir).filter((name) => existsSync(join(skillsDir, name, "SKILL.md")));

describe("behavioral eval coverage", () => {
  it("the plugin manifest points claude plugin eval at plugin-evals/, not the Tier-2 evals/", () => {
    assert.equal(manifest.experimental?.evals, "plugin-evals");
  });

  for (const skill of skills) {
    it(`${skill} has a skill-creator evals.json or a plugin-evals case`, () => {
      const hasSkillCreator = existsSync(join(skillsDir, skill, "evals", "evals.json"));
      assert.ok(
        hasSkillCreator || casesFor(skill).length > 0,
        `add plugin-evals/${skill}/<case>/ (prompt.md + graders/*.md)`,
      );
    });
  }
});

describe("plugin-evals case shape", () => {
  const groups = subdirs(suiteDir).filter((name) => name !== "results");

  it("every top-level directory is named after a skill", () => {
    for (const group of groups) assert.ok(skills.includes(group), `${group} isn't a skill name`);
  });

  for (const group of groups) {
    for (const caseDir of casesFor(group)) {
      const label = `${group}/${caseDir.split("/").pop()}`;

      it(`${label} has at least one grader`, () => {
        const graders = subdirs(caseDir).includes("graders")
          ? readdirSync(join(caseDir, "graders")).filter((f) => f.endsWith(".md"))
          : [];
        assert.ok(graders.length > 0, "a case without a grader fails to load");
      });

      it(`${label} names an executable scaffold script that exists, if it uses one`, () => {
        const caseYaml = join(caseDir, "case.yaml");
        if (!existsSync(caseYaml)) return;
        const match = readFileSync(caseYaml, "utf8").match(/scaffold_script:\s*(\S+)/);
        if (!match) return;
        const script = join(caseDir, match[1]);
        assert.ok(existsSync(script), `${match[1]} is missing`);
        accessSync(script, constants.X_OK);
      });
    }
  }
});
