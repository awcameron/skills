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
    "here there out up down off over under again further the will don't doesn't isn't the's"
  )
    .split(/\s+/)
    .filter(Boolean),
);

/** Strips a handful of common suffixes -- a stemmer only in the loosest sense, not Porter. */
function stem(word) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
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
