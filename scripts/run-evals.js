#!/usr/bin/env node
// Tier 2 trigger-routing evals: a deterministic, CI-safe check that this repo's skill
// descriptions actually carry the vocabulary a user would say, and that no two skills'
// descriptions collide badly enough to steal each other's prompts.
//
// This is a lexical approximation (TF-IDF cosine similarity, see scripts/lib/tfidf.js) -- it
// cannot judge semantics, only vocabulary overlap. See evals/README.md for what it does and
// doesn't catch, and why that's an accepted tradeoff for something that runs free in CI.
//
// Usage:
//   node scripts/run-evals.js                  # run every case, print full report
//   node scripts/run-evals.js --min-rank1 80    # exit 1 if positive-case rank-1 rate is below 80%

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadAllSkills } from "./lib/parse-skill.js";
import { fitTfIdf, rank, cosineSimilarity } from "./lib/tfidf.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(repoRoot, "skills");
const casesDir = join(repoRoot, "evals", "cases");
const COLLISION_THRESHOLD = 0.5;

function parseArgs(argv) {
  const args = { minRank1: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--min-rank1") args.minRank1 = Number(argv[++i]);
  }
  return args;
}

function loadCases() {
  return readdirSync(casesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(casesDir, file), "utf8")));
}

function main() {
  const { minRank1 } = parseArgs(process.argv.slice(2));

  const skills = loadAllSkills(skillsDir);
  const skillNames = new Set(skills.map((skill) => skill.name));
  const { docVectors, vectorizeQuery } = fitTfIdf(
    skills.map((skill) => ({ id: skill.name, text: skill.description ?? "" })),
  );

  const cases = loadCases();
  const coveredSkillNames = new Set(cases.map((testCase) => testCase.skill_name));
  const uncoveredSkillNames = skills
    .map((skill) => skill.name)
    .filter((name) => !coveredSkillNames.has(name));

  let positiveTotal = 0;
  let positivePassed = 0;
  let rank1Count = 0;
  let negativeTotal = 0;
  let negativePassed = 0;
  let hadUnknownSkillRef = false;

  if (uncoveredSkillNames.length > 0) {
    console.log("=== Missing coverage ===\n");
    for (const name of uncoveredSkillNames) {
      console.log(`FAIL  ${name}: no evals/cases/${name}.json -- this skill has zero trigger-routing coverage`);
    }
    console.log("");
  }

  console.log("=== Trigger routing ===\n");

  for (const testCase of cases) {
    const { skill_name: skillName, trigger } = testCase;
    if (!skillNames.has(skillName)) {
      console.log(`FAIL  ${skillName}: no such skill (check evals/cases/${skillName}.json)`);
      hadUnknownSkillRef = true;
      continue;
    }

    console.log(`${skillName}`);

    for (const { prompt, top_k: topK } of trigger.positive ?? []) {
      positiveTotal++;
      const ranked = rank(vectorizeQuery(prompt), docVectors);
      const position = ranked.findIndex((entry) => entry.id === skillName) + 1;
      const passed = position >= 1 && position <= topK;
      if (passed) positivePassed++;
      if (position === 1) rank1Count++;

      const status = passed ? "ok  " : "FAIL";
      console.log(
        `  ${status} positive "${prompt}" -> rank ${position} (want top ${topK}), leader: ${ranked[0]?.id}`,
      );
    }

    for (const { prompt, owner } of trigger.negative ?? []) {
      negativeTotal++;
      const ranked = rank(vectorizeQuery(prompt), docVectors);
      const ownerScore = ranked.find((entry) => entry.id === owner)?.score ?? 0;
      const selfScore = ranked.find((entry) => entry.id === skillName)?.score ?? 0;
      const passed = ownerScore > selfScore;
      if (passed) negativePassed++;

      const status = passed ? "ok  " : "FAIL";
      console.log(
        `  ${status} negative "${prompt}" -> expected ${owner} to outrank ${skillName} (${ownerScore.toFixed(3)} vs ${selfScore.toFixed(3)})`,
      );
    }

    console.log("");
  }

  console.log("=== Description collisions ===\n");
  console.log(`(pairs with cosine similarity > ${COLLISION_THRESHOLD})\n`);

  let collisions = 0;
  for (let i = 0; i < docVectors.length; i++) {
    for (let j = i + 1; j < docVectors.length; j++) {
      const similarity = cosineSimilarity(docVectors[i].vector, docVectors[j].vector);
      if (similarity > COLLISION_THRESHOLD) {
        collisions++;
        console.log(
          `  ${docVectors[i].id} <-> ${docVectors[j].id}: ${similarity.toFixed(3)}`,
        );
      }
    }
  }
  if (collisions === 0) console.log("  none");

  const rank1Rate = positiveTotal === 0 ? 100 : Math.round((rank1Count / positiveTotal) * 100);
  const topKRate =
    positiveTotal === 0 ? 100 : Math.round((positivePassed / positiveTotal) * 100);

  console.log("\n=== Summary ===\n");
  console.log(`positive cases:  ${positivePassed}/${positiveTotal} within top-k (${topKRate}%)`);
  console.log(`rank-1 rate:     ${rank1Count}/${positiveTotal} (${rank1Rate}%)`);
  console.log(`negative cases:  ${negativePassed}/${negativeTotal} correctly out-ranked`);
  console.log(`collisions:      ${collisions}`);
  console.log(`uncovered:       ${uncoveredSkillNames.length}/${skills.length} skills`);

  const failed =
    hadUnknownSkillRef ||
    uncoveredSkillNames.length > 0 ||
    positivePassed < positiveTotal ||
    negativePassed < negativeTotal ||
    (minRank1 !== null && rank1Rate < minRank1);

  if (minRank1 !== null) {
    console.log(
      `\n--min-rank1 ${minRank1}: ${rank1Rate >= minRank1 ? "pass" : "FAIL"} (actual ${rank1Rate}%)`,
    );
  }

  process.exit(failed ? 1 : 0);
}

main();
