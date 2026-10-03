#!/usr/bin/env node
// Logs which skills actually get used, and whether the model picked them up on its own or the
// user had to type the slash command -- so renames before 1.0 (#286) rest on data, and a skill
// that only ever runs as `/name` shows up as undertriggering.
//
// Maintainer tooling, not part of the plugin: it isn't wired into `.claude-plugin/`, so installing
// the plugin never logs anything on someone else's machine. To log your own use across every repo,
// add this to `~/.claude/settings.json` (absolute path to this checkout):
//
//   "hooks": {
//     "PreToolUse": [{ "matcher": "Skill", "hooks": [
//       { "type": "command", "command": "node /path/to/skills/scripts/skill-usage.js log" }] }],
//     "UserPromptSubmit": [{ "hooks": [
//       { "type": "command", "command": "node /path/to/skills/scripts/skill-usage.js log" }] }]
//   }
//
// Then: `node scripts/skill-usage.js report` (add `--all` to include skills from other plugins).
//
// The log is local JSONL at ~/.claude/skill-usage.jsonl (override with SKILL_USAGE_LOG). It keeps
// a skill name, session id, project directory name, and timestamp -- never prompt text.

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib/is-main.js";

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");

export function logPath(env = process.env) {
  return env.SKILL_USAGE_LOG || join(homedir(), ".claude", "skill-usage.jsonl");
}

/** `awcameron-skills:review-code`, `/review-code args` -> `review-code`. */
export function skillName(raw) {
  const token = raw.trim().replace(/^\//, "").split(/\s/)[0];
  return token.slice(token.lastIndexOf(":") + 1);
}

/**
 * Turns one hook event into a log entry, or null when there's nothing to log. Every prompt is
 * logged (as `prompt`, without its text) so the report knows where one turn ends; a prompt that
 * starts with `/` is logged as `slash` with the command name.
 */
export function toEntry(event, now = new Date()) {
  const base = {
    ts: now.toISOString(),
    session: event.session_id ?? null,
    project: event.cwd ? basename(event.cwd) : null,
  };
  if (event.hook_event_name === "PreToolUse" && event.tool_name === "Skill") {
    const skill = event.tool_input?.skill;
    return typeof skill === "string" ? { ...base, kind: "skill", skill: skillName(skill) } : null;
  }
  if (event.hook_event_name === "UserPromptSubmit" && typeof event.prompt === "string") {
    return event.prompt.trimStart().startsWith("/")
      ? { ...base, kind: "slash", skill: skillName(event.prompt) }
      : { ...base, kind: "prompt" };
  }
  return null;
}

/**
 * Counts uses per skill. A `slash` followed in the same turn by a Skill call for the same name is
 * one use (this repo's command wrappers tell the model to invoke the skill); a Skill call with no
 * matching slash in its turn is `auto`. Skills in `known` appear even at zero -- a skill nobody
 * uses is the finding. Slash commands that aren't skills (`/help`) are dropped.
 */
export function summarize(entries, known = []) {
  const rows = new Map(known.map((name) => [name, { skill: name, auto: 0, slash: 0, last: null }]));
  const pendingSlash = new Map();
  const row = (name) => {
    if (!rows.has(name)) rows.set(name, { skill: name, auto: 0, slash: 0, last: null });
    return rows.get(name);
  };

  for (const entry of entries) {
    if (entry.kind === "prompt") {
      pendingSlash.delete(entry.session);
    } else if (entry.kind === "slash") {
      pendingSlash.set(entry.session, entry.skill);
      if (rows.has(entry.skill)) {
        rows.get(entry.skill).slash++;
        rows.get(entry.skill).last = entry.ts;
      }
    } else if (entry.kind === "skill") {
      const r = row(entry.skill);
      if (pendingSlash.get(entry.session) === entry.skill) {
        pendingSlash.delete(entry.session);
      } else {
        r.auto++;
      }
      r.last = entry.ts;
    }
  }

  return [...rows.values()]
    .map((r) => ({ ...r, total: r.auto + r.slash }))
    .sort((a, b) => b.total - a.total || a.skill.localeCompare(b.skill));
}

/** Parses JSONL, skipping lines that aren't valid entries rather than failing the report. */
export function parseLog(text) {
  return text.split("\n").flatMap((line) => {
    try {
      const entry = JSON.parse(line);
      return entry && typeof entry.kind === "string" ? [entry] : [];
    } catch {
      return [];
    }
  });
}

function log() {
  // A hook must never block or slow the session, and UserPromptSubmit stdout is added to the
  // model's context -- so print nothing and exit 0 whatever happens.
  try {
    const entry = toEntry(JSON.parse(readFileSync(0, "utf8")));
    if (!entry) return;
    const path = logPath();
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(entry)}\n`);
  } catch {
    // Swallowed on purpose; see above.
  }
}

function report(all) {
  const path = logPath();
  if (!existsSync(path)) {
    console.log(`No usage log at ${path} yet -- see the setup comment at the top of this script.`);
    return;
  }
  const entries = parseLog(readFileSync(path, "utf8"));
  const known = readdirSync(skillsDir);
  const rows = summarize(entries, known).filter((r) => all || known.includes(r.skill));

  console.log(`${entries.length} events in ${path}, since ${entries[0]?.ts.slice(0, 10) ?? "-"}\n`);
  const width = Math.max(5, ...rows.map((r) => r.skill.length));
  console.log(`${"skill".padEnd(width)}  total   auto  slash  last used`);
  for (const r of rows) {
    const counts = [r.total, r.auto, r.slash].map((n) => String(n).padStart(5)).join("  ");
    console.log(`${r.skill.padEnd(width)}  ${counts}  ${r.last?.slice(0, 10) ?? "-"}`);
  }
}

if (isMain(import.meta.url)) {
  const [mode, ...flags] = process.argv.slice(2);
  if (mode === "log") log();
  else if (mode === "report") report(flags.includes("--all"));
  else {
    console.error("Usage: node scripts/skill-usage.js log|report [--all]");
    process.exitCode = 1;
  }
}
