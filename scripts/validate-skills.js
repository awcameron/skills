#!/usr/bin/env node
// Sanity-checks every skills/<name>/SKILL.md against docs/skill-anatomy.md's frontmatter rules.
// No dependencies -- deliberately, so this runs with a bare `node` install, nothing to npm install.
//
// Usage: node scripts/validate-skills.js

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(repoRoot, "skills");
const MAX_DESCRIPTION_LENGTH = 1024;
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Pulls out the YAML frontmatter block between the first pair of `---` lines. */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/**
 * Minimal frontmatter field reader -- not a real YAML parser. Handles the two shapes this repo's
 * skills actually use: `key: value` on one line, and `key: >-` folded scalars spanning
 * indented lines below it. Good enough for validation; do not reuse this for anything that needs
 * real YAML semantics.
 */
function readField(frontmatter, key) {
  const lines = frontmatter.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (startIndex === -1) return null;

  const firstLine = lines[startIndex].slice(key.length + 1).trim();
  if (firstLine && firstLine !== ">-" && firstLine !== "|" && firstLine !== ">") {
    return firstLine.replace(/^["']|["']$/g, "");
  }

  // Folded/block scalar: collect indented continuation lines.
  const continuation = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^\s/.test(lines[i]) && lines[i].trim() !== "") {
      continuation.push(lines[i].trim());
    } else if (lines[i].trim() === "") {
      continue;
    } else {
      break;
    }
  }
  return continuation.join(" ") || null;
}

function validateSkill(name) {
  const errors = [];
  const skillPath = join(skillsDir, name, "SKILL.md");

  let content;
  try {
    content = readFileSync(skillPath, "utf8");
  } catch {
    return [`missing SKILL.md (expected at skills/${name}/SKILL.md)`];
  }

  const frontmatter = extractFrontmatter(content);
  if (!frontmatter) {
    return ["no frontmatter block found (must start with a --- ... --- header)"];
  }

  const declaredName = readField(frontmatter, "name");
  if (!declaredName) {
    errors.push("frontmatter missing `name`");
  } else if (declaredName !== name) {
    errors.push(`frontmatter name "${declaredName}" does not match directory name "${name}"`);
  } else if (!NAME_PATTERN.test(declaredName)) {
    errors.push(`name "${declaredName}" must be lowercase, hyphen-separated (e.g. "my-skill")`);
  }

  const description = readField(frontmatter, "description");
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
  const skillNames = readdirSync(skillsDir).filter((entry) =>
    statSync(join(skillsDir, entry)).isDirectory(),
  );

  if (skillNames.length === 0) {
    console.error(`No skill directories found under ${skillsDir}`);
    process.exit(1);
  }

  let failures = 0;
  for (const name of skillNames.sort()) {
    const errors = validateSkill(name);
    if (errors.length === 0) {
      console.log(`ok    ${name}`);
    } else {
      failures++;
      console.log(`FAIL  ${name}`);
      for (const error of errors) console.log(`        - ${error}`);
    }
  }

  console.log(`\n${skillNames.length - failures}/${skillNames.length} skills passed`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
