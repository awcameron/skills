// Minimal frontmatter reader shared by scripts/validate-skills.js and scripts/run-evals.js.
// Not a general YAML parser -- handles exactly the two description shapes this repo's skills
// use (a single-line scalar, or a `>-` folded block), and nothing else. If a skill ever needs a
// frontmatter shape this can't read, extend this file rather than re-implementing the same
// parsing separately in each script that needs it.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Pulls out the YAML frontmatter block between the first pair of `---` lines. */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
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

/** Reads {name, description} from one skills/<name>/SKILL.md, or throws if it's unreadable. */
export function parseSkillFile(skillMdPath) {
  const content = readFileSync(skillMdPath, "utf8");
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter) {
    throw new Error(`${skillMdPath}: no frontmatter block found`);
  }
  return {
    name: readField(frontmatter, "name"),
    description: readField(frontmatter, "description"),
  };
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
