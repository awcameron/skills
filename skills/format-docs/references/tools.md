# Markdown formatters: commands and prose-rewrap defaults

Act on whichever tool `detect_formatter.sh` found, not on Prettier by default.

## Check and write commands

| Tool | Found via | Check | Write |
|---|---|---|---|
| Prettier | `.prettierrc*`, a `prettier` dependency, a `format`/`format:check` script | `npx --no-install prettier --check "<path>"` | `npx --no-install prettier --write "<path>"` |
| dprint | `dprint.json`/`.jsonc` with a markdown plugin | `dprint check` (scoped by its config, or `--` a path) | `dprint fmt` |
| markdownlint-cli2 | `.markdownlint.json`/`.yml`/`.markdownlint-cli2.jsonc` | `npx --no-install markdownlint-cli2 "<path>"` | `npx --no-install markdownlint-cli2 --fix "<path>"` |
| mdformat | `pyproject.toml` `[tool.mdformat]`, or an `mdformat` dependency | `mdformat --check "<path>"` | `mdformat "<path>"` |
| remark (standalone) | `.remarkrc*` not just underlying Prettier | `npx --no-install remark "<path>" --frail` | `npx --no-install remark "<path>" -o` |
| Biome | `biome.json`/`.jsonc` with markdown covered | `npx --no-install biome check "<path>"` | `npx --no-install biome check --write "<path>"` |

For a workspace with its own tool version but no config of its own, check whether it resolves the
nearest parent config, and whether that's the intended target, before assuming a monorepo
sub-package needs its own pass.

## Prose-rewrap defaults

A pass is mechanical only if it can't change how a paragraph reads. That isn't true of every tool,
so check the resolved config for the one that applies:

- **Prettier**: `proseWrap` defaults to `preserve` -- safe. If the config sets `proseWrap: always`
  (or similar), a run can reflow prose.
- **mdformat**: its own default (`--wrap keep`, confirmed against a real install) preserves line
  breaks -- an unconfigured run is safe. If the config sets `wrap` to an integer, or CLI usage
  passes `--wrap=<n>`, it reflows prose.
- **dprint's markdown plugin**: check its resolved `textWrap`; there's no safe default to assume.
- **markdownlint-cli2 `--fix`**: fixes lint violations (list markers, trailing whitespace, heading
  spacing) and doesn't reflow prose -- safe.
- **remark**: depends entirely on the configured plugins/options (e.g. `remark-stringify` width
  settings) -- read the config.
- **Biome**: its Markdown formatter is newer than its JS/CSS/JSON formatters and its defaults have
  moved between versions -- check the resolved config and the installed version. A `biome.json`
  with no `markdown` section doesn't confirm `.md` files are covered at all.

A tool that can reflow means even its check output needs a second look before anything it flags
is treated as mechanical drift. If the config doesn't make the answer clear, treat the pass as
structural and confirm before writing.
