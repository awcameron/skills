// Tests for scripts/lib/tfidf.js -- the lexical scorer behind `npm run eval`.
//
// Usage: node --test scripts/

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cosineSimilarity, fitTfIdf, rank, tokenize } from "./tfidf.js";

describe("tokenize", () => {
  it("lowercases, splits on non-alphanumerics, and drops one-letter tokens", () => {
    assert.deepEqual(tokenize("Review-Diff: X y"), ["review", "diff"]);
  });

  it("drops stopwords, including the halves of a split contraction", () => {
    assert.deepEqual(tokenize("this isn't the test"), ["test"]);
  });

  it("strips -ing and a plain plural -s, but not -ss", () => {
    assert.deepEqual(tokenize("reviewing tests class"), ["review", "test", "class"]);
  });

  it("reduces a word ending in a silent e and its other forms to one stem", () => {
    for (const forms of ["file files", "change changes changed changing", "base based"]) {
      assert.equal(new Set(tokenize(forms)).size, 1, forms);
    }
  });

  it("strips -es only after a sibilant, and -ies to -y", () => {
    assert.deepEqual(tokenize("fixes classes pushes dependencies"), [
      "fix",
      "class",
      "push",
      "dependency",
    ]);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors and 0 for vectors with no terms in common", () => {
    const vector = new Map([["review", 2], ["code", 1]]);
    assert.equal(cosineSimilarity(vector, vector).toFixed(6), "1.000000");
    assert.equal(cosineSimilarity(vector, new Map([["deploy", 1]])), 0);
  });

  it("is 0, not NaN, when either vector is empty", () => {
    assert.equal(cosineSimilarity(new Map(), new Map([["code", 1]])), 0);
  });
});

describe("fitTfIdf + rank", () => {
  const { docVectors, vectorizeQuery } = fitTfIdf([
    { id: "review-code", text: "Review a diff against the repo's coding standards." },
    { id: "write-tests", text: "Write tests for a change using the repo's test runner." },
    { id: "create-pr", text: "Open a pull request following the repo's branch conventions." },
  ]);

  it("ranks the document sharing the query's words first", () => {
    const ranked = rank(vectorizeQuery("please write tests for my change"), docVectors);
    assert.equal(ranked[0].id, "write-tests");
    assert.ok(ranked[0].score > ranked[1].score);
  });

  it("weights a word found in one document above a word found in all of them", () => {
    // "repo" is in every document, so it can't decide the ranking; "diff" is only in one.
    const ranked = rank(vectorizeQuery("repo diff"), docVectors);
    assert.equal(ranked[0].id, "review-code");
  });

  it("scores every document 0 for a query with no known words", () => {
    const ranked = rank(vectorizeQuery("zebra"), docVectors);
    assert.deepEqual(
      ranked.map(({ score }) => score),
      [0, 0, 0],
    );
  });
});
