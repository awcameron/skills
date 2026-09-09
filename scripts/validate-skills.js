#!/usr/bin/env node
// Sanity-checks every skills/<name>/SKILL.md against docs/skill-anatomy.md's frontmatter rules,
// and .claude-plugin/plugin.json + .claude-plugin/marketplace.json against schemas/*.schema.json.
// Uses ajv + js-yaml (see package.json) -- run `npm ci` first.
//
// Usage: node scripts/validate-skills.js

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSkillFile, parseSkillFrontmatterObject } from "./lib/parse-skill.js";
import { compileSchema, formatAjvErrors } from "./lib/schema-validate.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(repoRoot, "skills");
const schemasDir = join(repoRoot, "schemas");
const MAX_DESCRIPTION_LENGTH = 1024;
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const validateFrontmatterSchema = compileSchema(join(schemasDir, "skill-frontmatter.schema.json"));
const validatePluginManifest = compileSchema(join(schemasDir, "plugin-manifest.schema.json"));
const validateMarketplaceRegistry = compileSchema(
  join(schemasDir, "marketplace-registry.schema.json"),
);

/** Validates a manifest JSON file against a compiled schema. Returns formatted error strings. */
function validateManifest(manifestPath, validator) {
  let data;
  try {
    data = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return [`could not read/parse ${manifestPath}: ${error.message}`];
  }
  validator(data);
  return formatAjvErrors(validator.errors);
}

export function validateSkill(dirName, skillsDirPath = skillsDir) {
  let name;
  let description;
  try {
    ({ name, description } = parseSkillFile(join(skillsDirPath, dirName, "SKILL.md")));
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

  const evalsPath = join(skillsDirPath, dirName, "evals", "evals.json");
  if (existsSync(evalsPath)) {
    try {
      JSON.parse(readFileSync(evalsPath, "utf8"));
    } catch (error) {
      errors.push(`evals/evals.json is not valid JSON: ${error.message}`);
    }
  }

  try {
    const frontmatter = parseSkillFrontmatterObject(join(skillsDirPath, dirName, "SKILL.md"));
    validateFrontmatterSchema(frontmatter);
    for (const message of formatAjvErrors(validateFrontmatterSchema.errors)) {
      errors.push(`frontmatter ${message}`);
    }
  } catch (error) {
    errors.push(`could not parse frontmatter as YAML: ${error.message}`);
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

  let manifestFailures = 0;

  const manifestChecks = [
    ["plugin.json", join(repoRoot, ".claude-plugin", "plugin.json"), validatePluginManifest],
    [
      "marketplace.json",
      join(repoRoot, ".claude-plugin", "marketplace.json"),
      validateMarketplaceRegistry,
    ],
  ];
  for (const [label, manifestPath, validator] of manifestChecks) {
    const manifestErrors = validateManifest(manifestPath, validator);
    if (manifestErrors.length === 0) {
      console.log(`ok    ${label}`);
    } else {
      manifestFailures++;
      console.log(`FAIL  ${label}`);
      for (const error of manifestErrors) console.log(`        - ${error}`);
    }
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

  console.log(`\n${manifestChecks.length - manifestFailures}/${manifestChecks.length} manifests passed`);
  console.log(`${dirNames.length - failures}/${dirNames.length} skills passed`);
  process.exit(manifestFailures > 0 || failures > 0 ? 1 : 0);
}

// Only run when invoked directly (`node scripts/validate-skills.js`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
