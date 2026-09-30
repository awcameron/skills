// A small, dependency-free TF-IDF scorer used by scripts/run-evals.js's Tier 2 (trigger &
// routing) check. This is a deliberately crude lexical approximation of "does this prompt route
// to the right skill" -- it cannot judge semantics, only vocabulary overlap. That's a known,
// accepted limitation (see evals/README.md): it catches the two failure modes that actually
// dominate real trigger bugs -- a description missing the words a user would say, and an
// over-broad description that steals another skill's prompts -- without needing an LLM call, so
// it's free to run in CI on every change.

const STOPWORDS = new Set(
  (
    "a an and or of to in on for with this that these those is are was were be been being " +
    "when use uses using used it its as by from not but at into than then do does did if so " +
    "no yes you your i we our he she they their them has have had will would can could should " +
    "may might also any other some more most such only own same both each few all just once " +
    "here there out up down off over under again further the " +
    // tokenize() strips apostrophes into whitespace before this filter runs, so a contraction
    // like "isn't" arrives here already split into "isn" + "t" -- these are the post-split forms,
    // not the literal apostrophe'd word, which could never match.
    "isn doesn don aren wasn weren didn hasn haven hadn won wouldn couldn shouldn mustn"
  )
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Strips a handful of common suffixes -- a stemmer only in the loosest sense, not Porter. The aim
 * is that a word's common forms reduce to one stem: `file`/`files`, `change`/`changes`/`changed`/
 * `changing`, and `base`/`based` all do, because a final silent "e" is dropped last.
 */
function stem(word) {
  let stemmed = word;
  if (stemmed.length > 5 && stemmed.endsWith("ing")) stemmed = stemmed.slice(0, -3);
  else if (stemmed.length > 4 && stemmed.endsWith("ies")) stemmed = `${stemmed.slice(0, -3)}y`;
  // "-es" is its own suffix only after a sibilant (fixes, classes, pushes); in "files" the "e"
  // belongs to the word, so only the "s" goes.
  else if (stemmed.length > 4 && /(s|x|z|ch|sh)es$/.test(stemmed)) stemmed = stemmed.slice(0, -2);
  else if (stemmed.length > 4 && stemmed.endsWith("ed")) stemmed = stemmed.slice(0, -2);
  else if (stemmed.length > 3 && stemmed.endsWith("s") && !stemmed.endsWith("ss")) {
    stemmed = stemmed.slice(0, -1);
  }
  if (stemmed.length > 3 && stemmed.endsWith("e")) stemmed = stemmed.slice(0, -1);
  return stemmed;
}

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map(stem);
}

function termFrequency(tokens) {
  const tf = new Map();
  for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
  return tf;
}

/**
 * Builds a TF-IDF model over a corpus of {id, text} documents. Returns the fitted document
 * vectors plus a `vectorizeQuery` function that scores a new piece of text (an eval prompt)
 * against the same IDF weights, so a query and the corpus are always comparable.
 */
export function fitTfIdf(documents) {
  const docTokens = documents.map((doc) => tokenize(doc.text));
  const documentFrequency = new Map();
  for (const tokens of docTokens) {
    for (const term of new Set(tokens)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const totalDocs = documents.length;
  const idf = (term) => Math.log((totalDocs + 1) / ((documentFrequency.get(term) ?? 0) + 1)) + 1;

  const toVector = (tokens) => {
    const tf = termFrequency(tokens);
    const vector = new Map();
    for (const [term, count] of tf) {
      vector.set(term, count * idf(term));
    }
    return vector;
  };

  const docVectors = documents.map((doc, i) => ({ id: doc.id, vector: toVector(docTokens[i]) }));

  return {
    docVectors,
    vectorizeQuery: (text) => toVector(tokenize(text)),
  };
}

export function cosineSimilarity(vectorA, vectorB) {
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (const value of vectorA.values()) magnitudeA += value * value;
  for (const value of vectorB.values()) magnitudeB += value * value;
  for (const [term, value] of vectorA) {
    if (vectorB.has(term)) dot += value * vectorB.get(term);
  }
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/** Ranks every doc vector against a query vector, highest similarity first. */
export function rank(queryVector, docVectors) {
  return docVectors
    .map(({ id, vector }) => ({ id, score: cosineSimilarity(queryVector, vector) }))
    .sort((a, b) => b.score - a.score);
}
