import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bashPrefixes, bodyCommands, uncoveredCommands } from "./allowed-tools.js";

const skill = (body) => `---\nname: my-skill\ndescription: git status\n---\n${body}`;
const commandsOf = (body) => bodyCommands(skill(body)).map(({ command }) => command);

describe("bodyCommands", () => {
  it("reads every line of a shell fence, dropping comments and line numbers from the frontmatter", () => {
    const content = skill("\n```bash\ngit status --short   # staged?\ngh pr view <n>\n```\n");

    assert.deepEqual(bodyCommands(content), [
      { line: 7, command: "git status --short" },
      { line: 8, command: "gh pr view <n>" },
    ]);
  });

  it("reads inline code spans in prose, splitting chained commands", () => {
    assert.deepEqual(commandsOf("Run `git fetch && git merge-base origin/main HEAD` first."), [
      "git fetch",
      "git merge-base origin/main HEAD",
    ]);
  });

  it("ignores file names and a bare CLI name", () => {
    assert.deepEqual(commandsOf("Check `yarn.lock`, `go.sum`, and review via `gh`."), []);
  });

  it("reads a file with CRLF line endings the same way", () => {
    const content = skill("\n```bash\ngit status --short\n```\nThen `gh pr view`.\n");

    assert.deepEqual(bodyCommands(content.replace(/\n/g, "\r\n")), bodyCommands(content));
  });

  it("ignores non-shell fences and the frontmatter", () => {
    assert.deepEqual(commandsOf("\n```json\n{ \"x\": \"git push\" }\n```\n"), []);
  });
});

describe("bashPrefixes", () => {
  it("treats a missing allowed-tools or a bare Bash entry as unrestricted", () => {
    assert.equal(bashPrefixes(undefined), null);
    assert.equal(bashPrefixes(["Read", "Bash"]), null);
  });

  it("returns the prefixes of Bash(...) entries", () => {
    assert.deepEqual(bashPrefixes(["Read", "Bash(git status:*)", "Bash(npx --no-install prettier:*)"]), [
      "git status",
      "npx --no-install prettier",
    ]);
  });
});

describe("uncoveredCommands", () => {
  it("returns only the commands no prefix covers", () => {
    const content = skill("Run `git status`, then `git stash push -- src/`, then `git statuses`.");

    assert.deepEqual(
      uncoveredCommands(["Bash(git status:*)"], content).map(({ command }) => command),
      ["git stash push -- src/", "git statuses"],
    );
  });

  it("returns nothing when allowed-tools grants all of Bash", () => {
    assert.deepEqual(uncoveredCommands(["Bash"], skill("Run `git push --force`.")), []);
  });
});
