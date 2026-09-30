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

/**
 * Checks that a script shipped by more than one skill (same `scripts/<file>` name) is byte-identical
 * in each. Skills install individually, so a shared script is copied rather than referenced, and
 * the copies must not drift. Returns error strings, one per differing copy.
 */
export function validateSharedScripts(skillsDirPath = skillsDir) {
  const copies = new Map(); // file name -> [{ skill, content }]
  for (const skill of readdirSync(skillsDirPath).sort()) {
    const scriptsDir = join(skillsDirPath, skill, "scripts");
    if (!existsSync(scriptsDir) || !statSync(scriptsDir).isDirectory()) continue;
    for (const file of readdirSync(scriptsDir)) {
      const path = join(scriptsDir, file);
      if (!statSync(path).isFile()) continue;
      if (!copies.has(file)) copies.set(file, []);
      copies.get(file).push({ skill, content: readFileSync(path, "utf8") });
    }
  }

  const errors = [];
  for (const [file, [first, ...rest]] of copies) {
    for (const copy of rest) {
      if (copy.content !== first.content) {
        errors.push(
          `skills/${copy.skill}/scripts/${file} differs from skills/${first.skill}/scripts/${file} -- keep the copies identical`,
        );
      }
    }
  }
  return errors;
}

/**
 * Checks that README.md's "What's here" catalog lists every skill directory exactly once, links it
 * to its own SKILL.md, and lists nothing that isn't a skill. Presence only: the one-line blurbs are
 * hand-written for humans and aren't compared with the frontmatter descriptions. Returns error
 * strings.
 */
export function validateReadmeCatalog(skillNames, readmePath = join(repoRoot, "README.md")) {
  let readme;
  try {
    readme = readFileSync(readmePath, "utf8");
  } catch (error) {
    return [`could not read ${readmePath}: ${error.message}`];
  }
  const section = readme.match(/^## What's here\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1];
  if (section === undefined) return ['README.md has no "## What\'s here" section'];

  const errors = [];
  const listed = new Map(); // name -> times listed
  for (const [, name, target] of section.matchAll(/^- \*\*\[`([^`]+)`\]\(([^)]+)\)\*\*/gm)) {
    listed.set(name, (listed.get(name) ?? 0) + 1);
    if (target !== `skills/${name}/SKILL.md`) {
      errors.push(`README entry \`${name}\` links to ${target}, expected skills/${name}/SKILL.md`);
    }
  }
  for (const name of skillNames) {
    if (!listed.has(name)) errors.push(`skills/${name}/ has no entry in README's "What's here"`);
  }
  for (const [name, count] of listed) {
    if (!skillNames.includes(name)) {
      errors.push(`README's "What's here" lists \`${name}\`, but there's no skills/${name}/`);
    } else if (count > 1) {
      errors.push(`README's "What's here" lists \`${name}\` ${count} times`);
    }
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

  // Checks on the repo as a whole, not one skill. Adding one is a new entry here -- the summary
  // total comes from this list's length.
  const repoChecks = [
    {
      label: "plugin.json",
      run: () =>
        validateManifest(join(repoRoot, ".claude-plugin", "plugin.json"), validatePluginManifest),
    },
    {
      label: "marketplace.json",
      run: () =>
        validateManifest(
          join(repoRoot, ".claude-plugin", "marketplace.json"),
          validateMarketplaceRegistry,
        ),
    },
    { label: "version sync", run: () => validateVersionSync() },
    { label: "shared skill scripts", run: () => validateSharedScripts() },
    { label: "README skill catalog", run: () => validateReadmeCatalog(dirNames) },
  ];
  let repoFailures = 0;
  for (const { label, run } of repoChecks) {
    if (report(label, run())) repoFailures++;
  }

  let failures = 0;
  let warnings = 0;
  for (const dirName of dirNames.sort()) {
    if (report(dirName, validateSkill(dirName))) failures++;
    for (const warning of skillWarnings(dirName)) {
      console.log(`        ! warning: ${warning}`);
      warnings++;
    }
  }

  console.log(`\n${repoChecks.length - repoFailures}/${repoChecks.length} repo checks passed`);
  console.log(`${dirNames.length - failures}/${dirNames.length} skills passed`);
  if (warnings > 0) console.log(`${warnings} warning${warnings === 1 ? "" : "s"} (not failing)`);
  process.exit(repoFailures > 0 || failures > 0 ? 1 : 0);
}

// Only run when invoked directly (`node scripts/validate-skills.js`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
