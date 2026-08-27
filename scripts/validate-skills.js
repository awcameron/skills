#!/usr/bin/env node
// Sanity-checks every skills/<name>/SKILL.md against docs/skill-anatomy.md's frontmatter rules.
// No dependencies -- deliberately, so this runs with a bare `node` install, nothing to npm install.
//
// Usage: node scripts/validate-skills.js

import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSkillFile } from "./lib/parse-skill.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(repoRoot, "skills");
const MAX_DESCRIPTION_LENGTH = 1024;
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateSkill(dirName) {
  let name;
  let description;
  try {
    ({ name, description } = parseSkillFile(join(skillsDir, dirName, "SKILL.md")));
  } catch (error) {
    return [error.message];
  }

  const errors = [];

  if (!name) {
    errors.push("frontmatter missing `name`");
  } else if (name !== dirName) {
    errors.push(`frontmatter name "${name}" does not match directory name "${dirName}"`);
  } else if (!NAME_PATTERN.test(name)) {
    errors.push(`name "${name}" must be lowercase, hyphen-separated (e.g. "my-skill")`);
  }

  if (!description) {
    errors.push("frontmatter missing `description`");
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `description is ${description.length} chars, over the ${MAX_DESCRIPTION_LENGTH}-char guideline`,
    );
  } else if (!/use when|use this|use for|whenever/i.test(description)) {
    errors.push(
      "description doesn't appear to state a trigger condition (\"use when...\") -- agents discover skills by this field, so it should say both what the skill does and when to reach for it",
    );
  }

  return errors;
}

function main() {
  const dirNames = readdirSync(skillsDir).filter((entry) =>
    statSync(join(skillsDir, entry)).isDirectory(),
  );

  if (dirNames.length === 0) {
    console.error(`No skill directories found under ${skillsDir}`);
    process.exit(1);
  }

  let failures = 0;
  for (const dirName of dirNames.sort()) {
    const errors = validateSkill(dirName);
    if (errors.length === 0) {
      console.log(`ok    ${dirName}`);
    } else {
      failures++;
      console.log(`FAIL  ${dirName}`);
      for (const error of errors) console.log(`        - ${error}`);
    }
  }

  console.log(`\n${dirNames.length - failures}/${dirNames.length} skills passed`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
