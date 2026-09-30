#!/usr/bin/env node
// Sanity-checks every skills/<name>/SKILL.md against docs/skill-anatomy.md's frontmatter rules,
// and .claude-plugin/plugin.json + .claude-plugin/marketplace.json against schemas/*.schema.json.
// Uses ajv + js-yaml (see package.json) -- run `npm ci` first.
//
// Usage: node scripts/validate-skills.js

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { uncoveredCommands } from "./lib/allowed-tools.js";
import {
  parseFrontmatterFields,
  parseFrontmatterYaml,
  readFrontmatterBlock,
} from "./lib/parse-skill.js";
import { compileSchema, formatAjvErrors } from "./lib/schema-validate.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(repoRoot, "skills");
const schemasDir = join(repoRoot, "schemas");
const MAX_DESCRIPTION_LENGTH = 1024;
// Every skill's description is loaded into every session, used or not, so the budget is shared.
// Past this, warn (not fail): move mechanism detail into the body instead.
export const SOFT_DESCRIPTION_LENGTH = 600;
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

/** Prints one `ok`/`FAIL` result line (plus any error bullets). Returns whether it failed. */
function report(label, errors) {
  if (errors.length === 0) {
    console.log(`ok    ${label}`);
    return false;
  }
  console.log(`FAIL  ${label}`);
  for (const error of errors) console.log(`        - ${error}`);
  return true;
}

/**
 * Non-failing checks for a skill. Returns warning strings; an unreadable file or invalid YAML is
 * validateSkill's job.
 */
export function skillWarnings(dirName, skillsDirPath = skillsDir) {
  const skillMdPath = join(skillsDirPath, dirName, "SKILL.md");
  let content, frontmatter;
  try {
    content = readFileSync(skillMdPath, "utf8");
    frontmatter = parseFrontmatterYaml(readFrontmatterBlock(skillMdPath));
  } catch {
    return [];
  }

  const warnings = [];
  const { description } = frontmatter;
  if (typeof description === "string" && description.length > SOFT_DESCRIPTION_LENGTH) {
    warnings.push(
      `description is ${description.length} chars, over the ${SOFT_DESCRIPTION_LENGTH}-char soft limit -- it loads into every session, so move mechanism detail into the body`,
    );
  }
  for (const { line, command } of uncoveredCommands(frontmatter["allowed-tools"], content)) {
    warnings.push(
      `line ${line}: \`${command}\` isn't covered by allowed-tools -- add a Bash(...) entry, or reword it if it's not meant to be run`,
    );
  }
  return warnings;
}

export function validateSkill(dirName, skillsDirPath = skillsDir) {
  // Read + extract the frontmatter block once, then derive both the hand-parsed fields and the
  // full YAML object from that one string -- instead of each parser re-reading SKILL.md itself.
  let frontmatterBlock;
  try {
    frontmatterBlock = readFrontmatterBlock(join(skillsDirPath, dirName, "SKILL.md"));
  } catch (error) {
    return [error.message];
  }

  const { name, description } = parseFrontmatterFields(frontmatterBlock);
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
    const frontmatter = parseFrontmatterYaml(frontmatterBlock);
    validateFrontmatterSchema(frontmatter);
    for (const message of formatAjvErrors(validateFrontmatterSchema.errors)) {
      errors.push(`frontmatter ${message}`);
    }
  } catch (error) {
    errors.push(`could not parse frontmatter as YAML: ${error.message}`);
  }

  return errors;
}

/**
 * Checks that package.json, package-lock.json (both its top-level and `packages[""]` entries), and
 * .claude-plugin/plugin.json all carry the same version. Returns error strings, one per mismatch.
 */
export function validateVersionSync(root = repoRoot) {
  const readJson = (relativePath) => JSON.parse(readFileSync(join(root, relativePath), "utf8"));

  let pkg, plugin, lock;
  try {
    pkg = readJson("package.json");
    plugin = readJson(".claude-plugin/plugin.json");
    lock = readJson("package-lock.json");
  } catch (error) {
    return [`could not read version files: ${error.message}`];
  }

  const others = {
    ".claude-plugin/plugin.json": plugin.version,
    "package-lock.json": lock.version,
    'package-lock.json packages[""]': lock.packages?.[""]?.version,
  };

  return Object.entries(others)
    .filter(([, version]) => version !== pkg.version)
    .map(
      ([label, version]) =>
        `${label} version is ${JSON.stringify(version)}, expected ${JSON.stringify(pkg.version)} (package.json)`,
    );
}

function main() {
  const dirNames = readdirSync(skillsDir).filter((entry) =>
    statSync(join(skillsDir, entry)).isDirectory(),
  );

  if (dirNames.length === 0) {
    console.error(`No skill directories found under ${skillsDir}`);
    process.exit(1);
  }

  const manifestChecks = [
    {
      label: "plugin.json",
      path: join(repoRoot, ".claude-plugin", "plugin.json"),
      validator: validatePluginManifest,
    },
    {
      label: "marketplace.json",
      path: join(repoRoot, ".claude-plugin", "marketplace.json"),
      validator: validateMarketplaceRegistry,
    },
  ];
  let manifestFailures = 0;
  for (const { label, path, validator } of manifestChecks) {
    if (report(label, validateManifest(path, validator))) manifestFailures++;
  }
  // Not a schema check, but a manifest-level one: the three version fields must agree.
  const versionSyncFailed = report("version sync", validateVersionSync());
  if (versionSyncFailed) manifestFailures++;

  let failures = 0;
  let warnings = 0;
  for (const dirName of dirNames.sort()) {
    if (report(dirName, validateSkill(dirName))) failures++;
    for (const warning of skillWarnings(dirName)) {
      console.log(`        ! warning: ${warning}`);
      warnings++;
    }
  }

  const manifestTotal = manifestChecks.length + 1; // + version sync
  console.log(`\n${manifestTotal - manifestFailures}/${manifestTotal} manifest checks passed`);
  console.log(`${dirNames.length - failures}/${dirNames.length} skills passed`);
  if (warnings > 0) console.log(`${warnings} warning${warnings === 1 ? "" : "s"} (not failing)`);
  process.exit(manifestFailures > 0 || failures > 0 ? 1 : 0);
}

// Only run when invoked directly (`node scripts/validate-skills.js`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
