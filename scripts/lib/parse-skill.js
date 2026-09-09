// Minimal frontmatter reader shared by scripts/validate-skills.js and scripts/run-evals.js.
// Not a general YAML parser -- handles exactly the two description shapes this repo's skills
// use (a single-line scalar, or a `>-` folded block), and nothing else. If a skill ever needs a
// frontmatter shape this can't read, extend this file rather than re-implementing the same
// parsing separately in each script that needs it.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { load as loadYaml } from "js-yaml";

/** Pulls out the YAML frontmatter block between the first pair of `---` lines. */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/**
 * Reads a SKILL.md file and returns its raw frontmatter block, or throws if it has none. Exported
 * so a caller that needs both parseFrontmatterFields() and parseFrontmatterYaml() (e.g.
 * validate-skills.js's validateSkill()) can read + extract the block once and derive both from
 * it, instead of each helper re-reading the same file from disk.
 */
export function readFrontmatterBlock(skillMdPath) {
  const content = readFileSync(skillMdPath, "utf8");
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter) {
    throw new Error(`${skillMdPath}: no frontmatter block found`);
  }
  return frontmatter;
}

/**
 * Reads a single frontmatter field. Handles `key: value` on one line, and `key: >-` folded
 * scalars spanning indented lines below it, joined into one string.
 */
function readField(frontmatter, key) {
  const lines = frontmatter.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (startIndex === -1) return null;

  const firstLine = lines[startIndex].slice(key.length + 1).trim();
  if (firstLine && firstLine !== ">-" && firstLine !== "|" && firstLine !== ">") {
    return firstLine.replace(/^["']|["']$/g, "");
  }

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

/** Reads {name, description} from an already-extracted frontmatter block. */
export function parseFrontmatterFields(frontmatter) {
  return {
    name: readField(frontmatter, "name"),
    description: readField(frontmatter, "description"),
  };
}

/**
 * Parses an already-extracted frontmatter block as real YAML via js-yaml, for schema validation
 * (scripts/lib/schema-validate.js) -- unlike parseFrontmatterFields() above, this isn't limited to
 * the two shapes that hand-rolled reader understands, so it also picks up `allowed-tools`,
 * `license`, `compatibility`, and `metadata`. Throws if the block isn't valid YAML.
 */
export function parseFrontmatterYaml(frontmatter) {
  return loadYaml(frontmatter) ?? {};
}

/** Reads {name, description} from one skills/<name>/SKILL.md, or throws if it's unreadable. */
export function parseSkillFile(skillMdPath) {
  return parseFrontmatterFields(readFrontmatterBlock(skillMdPath));
}

/**
 * Reads the full frontmatter block of one skills/<name>/SKILL.md as a plain object -- see
 * parseFrontmatterYaml() above. Throws if there's no frontmatter block or it isn't valid YAML.
 */
export function parseSkillFrontmatterObject(skillMdPath) {
  return parseFrontmatterYaml(readFrontmatterBlock(skillMdPath));
}

/** Returns [{name, description, path}] for every skills/<name>/SKILL.md under skillsDir. */
export function loadAllSkills(skillsDir) {
  const skillDirNames = readdirSync(skillsDir).filter((entry) =>
    statSync(join(skillsDir, entry)).isDirectory(),
  );

  return skillDirNames.sort().map((dirName) => {
    const path = join(skillsDir, dirName, "SKILL.md");
    const { name, description } = parseSkillFile(path);
    return { dirName, name, description, path };
  });
}
