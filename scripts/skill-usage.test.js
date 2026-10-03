import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import { parseLog, skillName, summarize, toEntry } from "./skill-usage.js";

const script = join(dirname(fileURLToPath(import.meta.url)), "skill-usage.js");
const now = new Date("2026-10-02T12:00:00Z");

describe("skillName", () => {
  it("strips a plugin prefix, a leading slash, and arguments", () => {
    assert.equal(skillName("awcameron-skills:review-code"), "review-code");
    assert.equal(skillName("/review-code HEAD~3"), "review-code");
    assert.equal(skillName("/awcameron-skills:create-pr"), "create-pr");
  });
});

describe("toEntry", () => {
  const base = { session_id: "s1", cwd: "/Users/me/git/app" };

  it("logs a Skill tool call", () => {
    const event = { ...base, hook_event_name: "PreToolUse", tool_name: "Skill",
      tool_input: { skill: "awcameron-skills:write-tests" } };
    assert.deepEqual(toEntry(event, now), { ts: now.toISOString(), session: "s1",
      project: "app", kind: "skill", skill: "write-tests" });
  });

  it("logs a slash prompt by command name", () => {
    const event = { ...base, hook_event_name: "UserPromptSubmit", prompt: "/fix-bug the crash" };
    assert.equal(toEntry(event, now).kind, "slash");
    assert.equal(toEntry(event, now).skill, "fix-bug");
  });

  it("logs a plain prompt without its text", () => {
    const entry = toEntry({ ...base, hook_event_name: "UserPromptSubmit", prompt: "secret" }, now);
    assert.equal(entry.kind, "prompt");
    assert.ok(!JSON.stringify(entry).includes("secret"));
  });

  it("ignores other tools and malformed Skill input", () => {
    assert.equal(toEntry({ ...base, hook_event_name: "PreToolUse", tool_name: "Bash" }), null);
    assert.equal(toEntry({ ...base, hook_event_name: "PreToolUse", tool_name: "Skill",
      tool_input: {} }), null);
  });
});

describe("summarize", () => {
  const e = (kind, skill, session = "s1") => ({ ts: now.toISOString(), session, kind, skill });
  const get = (rows, name) => rows.find((r) => r.skill === name);

  it("counts a slash command and the Skill call it triggers as one slash use", () => {
    const rows = summarize([e("slash", "fix-bug"), e("skill", "fix-bug")], ["fix-bug"]);
    assert.deepEqual([get(rows, "fix-bug").slash, get(rows, "fix-bug").auto], [1, 0]);
  });

  it("counts a Skill call after a plain prompt as auto, even if the session used the slash earlier", () => {
    const rows = summarize(
      [e("slash", "fix-bug"), e("skill", "fix-bug"), e("prompt"), e("skill", "fix-bug")],
      ["fix-bug"],
    );
    assert.deepEqual([get(rows, "fix-bug").slash, get(rows, "fix-bug").auto], [1, 1]);
  });

  it("doesn't let a slash in one session claim a Skill call in another", () => {
    const rows = summarize([e("slash", "fix-bug", "s1"), e("skill", "fix-bug", "s2")], ["fix-bug"]);
    assert.deepEqual([get(rows, "fix-bug").slash, get(rows, "fix-bug").auto], [1, 1]);
  });

  it("lists known skills at zero and drops slash commands that aren't skills", () => {
    const rows = summarize([e("slash", "help")], ["choose-subagent"]);
    assert.deepEqual(rows.map((r) => [r.skill, r.total]), [["choose-subagent", 0]]);
  });

  it("lets a slash claim only the first matching Skill call in its turn", () => {
    const rows = summarize([e("slash", "fix-bug"), e("skill", "fix-bug"), e("skill", "fix-bug")],
      ["fix-bug"]);
    assert.deepEqual([get(rows, "fix-bug").slash, get(rows, "fix-bug").auto], [1, 1]);
  });

  it("counts a slash use of another plugin's skill once its Skill call confirms it", () => {
    const rows = summarize([e("slash", "docs"), e("skill", "docs")], ["fix-bug"]);
    assert.deepEqual([get(rows, "docs").slash, get(rows, "docs").auto], [1, 0]);
  });
});

describe("parseLog", () => {
  it("skips blank and corrupt lines", () => {
    const ok = '{"kind":"prompt","ts":"2026-10-02T12:00:00Z"}';
    assert.equal(parseLog(`${ok}\n\nnot json\n{"x":1}\nnull\n`).length, 1);
  });

  it("skips an entry with no timestamp, which the report would otherwise crash on", () => {
    assert.deepEqual(parseLog('{"kind":"prompt"}\n'), []);
  });
});

describe("log mode", () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "skill-usage-")); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (input, logFile) => execFileSync(process.execPath, [script, "log"], {
    input, encoding: "utf8", env: { ...process.env, SKILL_USAGE_LOG: logFile },
  });

  it("appends one line and prints nothing (stdout would reach the model's context)", () => {
    const logFile = join(dir, "nested", "usage.jsonl");
    const event = { hook_event_name: "PreToolUse", tool_name: "Skill", session_id: "s1",
      cwd: "/x/app", tool_input: { skill: "review-code" } };
    assert.equal(run(JSON.stringify(event), logFile), "");
    assert.equal(JSON.parse(readFileSync(logFile, "utf8")).skill, "review-code");
  });

  it("exits 0 silently on garbage input", () => {
    assert.equal(run("not json", join(dir, "usage.jsonl")), "");
  });
});

describe("report mode", () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "skill-usage-")); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("shows dates in the local time zone, not UTC", () => {
    // 01:00 UTC on Oct 3 is still the evening of Oct 2 in Chicago.
    const logFile = join(dir, "usage.jsonl");
    writeFileSync(logFile, `${JSON.stringify({ ts: "2026-10-03T01:00:00Z", session: "s1",
      kind: "skill", skill: "review-code" })}\n`);
    const out = execFileSync(process.execPath, [script, "report"], {
      encoding: "utf8", env: { ...process.env, SKILL_USAGE_LOG: logFile, TZ: "America/Chicago" },
    });
    assert.match(out, /since 2026-10-02/);
    assert.match(out, /review-code\s+1\s+1\s+0\s+2026-10-02/);
  });
});
