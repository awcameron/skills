// Tests for scripts/lib/schema-validate.js -- exercises it against the repo's real
// .claude-plugin manifests plus a couple of deliberately malformed ones.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { compileSchema, formatAjvErrors } from "./schema-validate.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const schemasDir = join(repoRoot, "schemas");

function validate(data, validator) {
  validator(data);
  return formatAjvErrors(validator.errors);
}

describe("schema-validate", () => {
  it("the repo's real plugin.json validates cleanly against plugin-manifest.schema.json", () => {
    const validator = compileSchema(join(schemasDir, "plugin-manifest.schema.json"));
    const plugin = JSON.parse(
      readFileSync(join(repoRoot, ".claude-plugin", "plugin.json"), "utf8"),
    );

    assert.deepEqual(validate(plugin, validator), []);
  });

  it("the repo's real marketplace.json validates cleanly against marketplace-registry.schema.json", () => {
    const validator = compileSchema(join(schemasDir, "marketplace-registry.schema.json"));
    const marketplace = JSON.parse(
      readFileSync(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8"),
    );

    assert.deepEqual(validate(marketplace, validator), []);
  });

  it("fails a plugin manifest missing the required `name` field", () => {
    const validator = compileSchema(join(schemasDir, "plugin-manifest.schema.json"));

    const errors = validate({ version: "1.0.0", description: "x" }, validator);

    assert.ok(errors.some((e) => e.includes("name")));
  });

  it("fails a marketplace registry missing required `plugins`", () => {
    const validator = compileSchema(join(schemasDir, "marketplace-registry.schema.json"));

    const errors = validate({ name: "x", owner: { name: "x" } }, validator);

    assert.ok(errors.some((e) => e.includes("plugins")));
  });
});
