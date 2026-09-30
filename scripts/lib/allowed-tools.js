// Finds shell commands a SKILL.md body tells the agent to run that its `allowed-tools` doesn't
// cover -- each one is a permission prompt (or a skipped step) at run time. Used by
// scripts/validate-skills.js as a non-failing warning.
//
// Commands are read from two places: every line of a ```bash/sh/shell/console fence, and every
// inline `code span` in prose. Either way, only text that starts with a known CLI followed by a
// subcommand counts (`git status`, not `yarn.lock` or a bare `gh`), which keeps file names and
// passing mentions out. A command mentioned but not meant to be run should be reworded rather
// than exempted.

const CLI_PATTERN =
  /^(git|gh|npm|npx|pnpm|yarn|pytest|python|python3|pip|pip3|uv|poetry|bundle|go|cargo|mvn|\.\/gradlew|gradle)\s+\S/;
const SHELL_FENCE_LANGS = new Set(["bash", "sh", "shell", "console"]);

/** Returns [{line, command}] for every CLI command in a SKILL.md, frontmatter excluded. */
export function bodyCommands(content) {
  const lines = content.split(/\r?\n/);
  const commands = [];
  let start = 0;
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    start = end === -1 ? lines.length : end + 1;
  }

  let fence = null; // null outside a fence, else { shell: boolean }
  for (let i = start; i < lines.length; i++) {
    const fenceMatch = lines[i].match(/^\s*```(\w*)/);
    if (fenceMatch) {
      fence = fence ? null : { shell: SHELL_FENCE_LANGS.has(fenceMatch[1]) };
      continue;
    }
    let candidates = [];
    if (!fence) candidates = [...lines[i].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    else if (fence.shell) candidates = [lines[i]];

    for (const candidate of candidates) {
      for (const segment of candidate.split(/&&|\|\||;|\|/)) {
        const command = segment
          .replace(/\s+#.*$/, "")
          .replace(/^\s*\$\s+/, "")
          .trim();
        if (CLI_PATTERN.test(command)) commands.push({ line: i + 1, command });
      }
    }
  }
  return commands;
}

/**
 * Returns the `Bash(...)` prefixes an `allowed-tools` value grants, `null` if it grants all of Bash
 * (a bare `Bash` entry, or no `allowed-tools` at all, which restricts nothing), or `[]` if it
 * grants no Bash.
 */
export function bashPrefixes(allowedTools) {
  if (allowedTools === undefined || allowedTools === null) return null;
  const entries = Array.isArray(allowedTools) ? allowedTools : String(allowedTools).split(/\s+/);
  if (entries.includes("Bash")) return null;
  return entries.map((entry) => entry.match(/^Bash\((.+?)(?::\*)?\)$/)?.[1]).filter(Boolean);
}

/** Returns the body commands no `allowed-tools` prefix covers. */
export function uncoveredCommands(allowedTools, content) {
  const prefixes = bashPrefixes(allowedTools);
  if (prefixes === null) return [];
  return bodyCommands(content).filter(
    ({ command }) =>
      !prefixes.some((prefix) => command === prefix || command.startsWith(`${prefix} `)),
  );
}
