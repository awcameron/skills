// Thin wrapper around ajv, shared by scripts/validate-skills.js for checking SKILL.md
// frontmatter and the .claude-plugin manifests against schemas/*.schema.json.

import { readFileSync } from "node:fs";

// ajv's default export only understands draft-07; schemas/*.schema.json declare draft 2020-12,
// so this needs the dedicated 2020-12 build.
import Ajv2020 from "ajv/dist/2020.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });

/**
 * Reads and compiles a JSON Schema file. Compile once, reuse the returned validator. Safe to call
 * more than once for the same schema (e.g. from both validate-skills.js and its tests) -- ajv
 * keys compiled schemas by their `$id` and errors on a duplicate `compile()`, so this returns the
 * already-compiled validator instead of recompiling.
 */
export function compileSchema(schemaPath) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  return ajv.getSchema(schema.$id) ?? ajv.compile(schema);
}

/** Turns ajv's error array into short, one-line messages matching this repo's error style. */
export function formatAjvErrors(errors) {
  return (errors ?? []).map((error) => {
    const path = error.instancePath || "(root)";
    return `${path} ${error.message}`;
  });
}
