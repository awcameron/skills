#!/usr/bin/env bash
# Scan a repo for whatever Markdown formatter/linter it already has configured.
#
# This mechanizes "Step 0" of the format-docs skill: rather than the model
# reading package.json, pyproject.toml, dotfiles, pre-commit hooks, and CI
# workflows one Read/Grep at a time, run this once and reason from its output.
#
# Usage: scripts/detect_formatter.sh [repo-root]   (defaults to cwd)
#
# Exit code is always 0 -- this is a report, not a pass/fail check. Read the
# output; don't script against it.

set -u
root="${1:-.}"
cd "$root" || { echo "no such directory: $root" >&2; exit 1; }

found=0

note() {
  found=1
  printf '%s\n' "$1"
}

# Print whichever of the given literal filenames exist, one per line.
# (Plain `ls a b c` exits non-zero -- and prints nothing useful for our
# purposes -- if even one of several literal names is missing, so a repo with
# only one of two candidate configs would look like it has neither. Glob
# patterns like `.prettierrc*` don't have this problem since a single glob
# either expands or doesn't; this helper is only needed for lists of
# distinct literal filenames.)
existing() {
  for f in "$@"; do
    [ -e "$f" ] && printf '%s\n' "$f"
  done
}

# --- Prettier ---
if ls .prettierrc* >/dev/null 2>&1; then
  note "[prettier] config file: $(ls .prettierrc* 2>/dev/null | tr '\n' ' ')"
fi
if [ -f package.json ] && grep -q '"prettier"' package.json 2>/dev/null; then
  note "[prettier] referenced in package.json -- could be a devDependency, a top-level \"prettier\" config key, or both; check which"
fi

# --- dprint ---
cfg=$(existing dprint.json dprint.jsonc | head -1)
if [ -n "$cfg" ]; then
  if grep -q 'markdown' "$cfg" 2>/dev/null; then
    note "[dprint] $cfg configures a markdown plugin"
  else
    note "[dprint] $cfg exists but no markdown plugin found in it -- check manually"
  fi
fi

# --- markdownlint-cli2 ---
hits=$(existing .markdownlint.json .markdownlint.yml .markdownlint.yaml .markdownlint-cli2.jsonc .markdownlint-cli2.yaml)
if [ -n "$hits" ]; then
  note "[markdownlint-cli2] config file: $(echo "$hits" | tr '\n' ' ')"
fi

# --- mdformat ---
if [ -f pyproject.toml ] && grep -q '\[tool.mdformat\]' pyproject.toml 2>/dev/null; then
  wrap=$(grep -A5 '\[tool.mdformat\]' pyproject.toml | grep -i wrap || true)
  note "[mdformat] pyproject.toml has [tool.mdformat]${wrap:+ (wrap setting: $wrap)}"
fi
for req in requirements*.txt requirements*.in; do
  [ -f "$req" ] || continue
  if grep -qi '^mdformat' "$req" 2>/dev/null; then
    note "[mdformat] listed in $req"
  fi
done
if [ -f Pipfile ] && grep -qi 'mdformat' Pipfile 2>/dev/null; then
  note "[mdformat] listed in Pipfile"
fi

# --- remark (standalone, not just Prettier's markdown support) ---
if ls .remarkrc* >/dev/null 2>&1; then
  note "[remark] config file: $(ls .remarkrc* 2>/dev/null | tr '\n' ' ') -- confirm it isn't just Prettier underneath"
fi

# --- Biome (markdown formatting support) ---
cfg=$(existing biome.json biome.jsonc | head -1)
if [ -n "$cfg" ]; then
  if grep -q '"markdown"' "$cfg" 2>/dev/null; then
    note "[biome] $cfg has an explicit \"markdown\" section -- still confirm it isn't disabled, and check the installed Biome version actually supports it stably"
  else
    note "[biome] $cfg exists but has no \"markdown\" section -- its absence does NOT mean markdown is covered by the default formatter section; treat Biome as not confirmed for .md files until you find an explicit markdown config"
  fi
fi

# --- package.json scripts ---
if [ -f package.json ]; then
  scripts_block=$(grep -A30 '"scripts"' package.json 2>/dev/null | grep -iE '"(format|format:check|lint:md|lint:markdown)"' || true)
  if [ -n "$scripts_block" ]; then
    note "[package.json scripts] $(echo "$scripts_block" | tr -d '\n' | tr -s ' ')"
  fi
fi

# --- pre-commit / lint-staged ---
if [ -d .husky ]; then
  note "[pre-commit] .husky/ present -- check its hooks for a markdown-touching command"
fi
if ls .lintstagedrc* >/dev/null 2>&1 || grep -q '"lint-staged"' package.json 2>/dev/null; then
  note "[pre-commit] lint-staged config present -- check its \\.md entry"
fi
if [ -f .pre-commit-config.yaml ]; then
  if grep -qiE 'markdown|mdformat|prettier|dprint' .pre-commit-config.yaml 2>/dev/null; then
    note "[pre-commit] .pre-commit-config.yaml has a markdown-related hook"
  fi
fi

# --- CI workflows ---
if [ -d .github/workflows ]; then
  hits=$(grep -lriE 'format|markdownlint|mdformat|dprint|prettier|remark' .github/workflows/*.y*ml 2>/dev/null || true)
  if [ -n "$hits" ]; then
    note "[CI] workflow file(s) reference formatting: $(echo "$hits" | tr '\n' ' ')"
  fi
fi

if [ "$found" -eq 0 ]; then
  echo "No Markdown formatter/linter configuration found under $root."
  echo "Treat any formatting pass as introducing a new check, not enforcing an existing one."
fi
