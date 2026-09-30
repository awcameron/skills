// Frontmatter reader shared by scripts/validate-skills.js and scripts/run-evals.js. Parses the
// block as real YAML (js-yaml), so every caller reads a field the same way. Add new frontmatter
// reading here rather than re-implementing it in each script that needs it.

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
 * for validate-skills.js, which parses the block itself so it can report a YAML error as a
 * validation failure.
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
 * Parses an already-extracted frontmatter block as YAML via js-yaml. The one frontmatter parser
 * for every caller -- name/description checks, schema validation, and the eval all read fields
 * from this. Throws if the block isn't valid YAML.
 */
export function parseFrontmatterYaml(frontmatter) {
  return loadYaml(frontmatter) ?? {};
}

/**
 * Reads {name, description} from one skills/<name>/SKILL.md. Throws if there's no frontmatter
 * block or it isn't valid YAML.
 */
export function parseSkillFile(skillMdPath) {
  const frontmatter = parseFrontmatterYaml(readFrontmatterBlock(skillMdPath));
  const { name = null, description = null } = frontmatter;
  return { name, description };
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
