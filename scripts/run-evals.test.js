// Tests for scripts/run-evals.js's input checks. Importing it doesn't run the evals: its main()
// only runs when the file is executed directly (see scripts/lib/is-main.js).
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseArgs, topKProblem } from "./run-evals.js";

describe("parseArgs", () => {
  it("defaults to no rank-1 threshold", () => {
    assert.deepEqual(parseArgs([]), { minRank1: null });
  });

  it("reads --min-rank1 as a number", () => {
    assert.deepEqual(parseArgs(["--min-rank1", "80"]), { minRank1: 80 });
  });

  it("throws when --min-rank1 has no value, instead of silently passing with NaN", () => {
    assert.throws(() => parseArgs(["--min-rank1"]), /needs a percentage from 0 to 100/);
  });

  it("throws on an empty or blank value, which Number() would read as 0", () => {
    assert.throws(() => parseArgs(["--min-rank1", ""]), /got ""/);
    assert.throws(() => parseArgs(["--min-rank1", "  "]), /got "  "/);
  });

  it("throws on a value that isn't a percentage", () => {
    assert.throws(() => parseArgs(["--min-rank1", "abc"]), /got "abc"/);
    assert.throws(() => parseArgs(["--min-rank1", "150"]), /got "150"/);
  });

  it("throws on an unknown argument", () => {
    assert.throws(() => parseArgs(["--min-rank"]), /unknown argument: --min-rank/);
  });
});

describe("topKProblem", () => {
  it("accepts a positive integer", () => {
    assert.equal(topKProblem(1), null);
    assert.equal(topKProblem(3), null);
  });

  it("names a missing top_k", () => {
    assert.equal(topKProblem(undefined), "missing top_k");
  });

  it("rejects zero, fractions, and strings", () => {
    for (const bad of [0, 1.5, "2"]) {
      assert.match(topKProblem(bad), /top_k must be a positive integer/);
    }
  });
});
