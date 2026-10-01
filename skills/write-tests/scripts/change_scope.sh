#!/usr/bin/env bash
# Print the scope of "my changes": everything this branch has changed -- committed, staged,
# uncommitted, and untracked -- since it left the repo's default branch.
#
# This mechanizes the "find my changes" step shared by the review-code and write-tests skills.
# Each skill ships an identical copy (skills are installed individually, so one can't call
# another's script); `npm run validate` fails if the copies drift.
#
# Usage: <this skill's dir>/scripts/change_scope.sh   (run from anywhere inside the target repo)
#   In Claude Code: ${CLAUDE_SKILL_DIR}/scripts/change_scope.sh
#
# Output: the default branch and how it was found, the merge-base, then changed and untracked
# paths (relative to the repo root). It doesn't print the diff itself -- run `git diff <base>`
# for that, so this output stays small.

set -u

top=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "not inside a git repository" >&2
  exit 1
}
cd "$top" || exit 1

# The remote the branch will merge into: in a fork that's `upstream` (origin is the fork, whose
# default branch can be stale), otherwise `origin`.
remote=origin
git remote get-url upstream >/dev/null 2>&1 && remote=upstream

# Default branch: GitHub's answer first, then <remote>/HEAD (unset in some clones), then asking
# the remote directly.
default="" source=""
if command -v gh >/dev/null 2>&1; then
  default=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null) &&
    [ -n "$default" ] && source="gh repo view"
fi
if [ -z "$source" ]; then
  default=$(git symbolic-ref --short "refs/remotes/$remote/HEAD" 2>/dev/null) &&
    default=${default#"$remote"/} && source="$remote/HEAD"
fi
if [ -z "$source" ]; then
  default=$(git remote show "$remote" 2>/dev/null | sed -n 's/^ *HEAD branch: //p')
  [ -n "$default" ] && [ "$default" != "(unknown)" ] && source="git remote show $remote"
fi
if [ -z "$source" ]; then
  echo "couldn't find the default branch (no gh, no $remote/HEAD, no reachable $remote)" >&2
  exit 1
fi

# Compare against the remote's copy, freshly fetched; fall back to the last-fetched copy
# offline, then to a local branch of the same name.
fetch_note=""
git fetch --quiet "$remote" "$default" 2>/dev/null || fetch_note=" (fetch failed; using last-fetched)"
if git rev-parse --verify --quiet "$remote/$default" >/dev/null; then
  ref="$remote/$default"
elif git rev-parse --verify --quiet "$default" >/dev/null; then
  ref="$default" fetch_note=" (no $remote/$default; using the local branch)"
else
  echo "default branch \"$default\" has no local or remote ref" >&2
  exit 1
fi

base=$(git merge-base "$ref" HEAD) || {
  echo "no common ancestor between $ref and HEAD" >&2
  exit 1
}

echo "default-branch: $default (via $source)"
echo "base: $base (merge-base of $ref and HEAD)$fetch_note"
echo "changed (git diff --name-only $base):"
git diff --name-only "$base" | sed 's/^/  /'
echo "untracked (read each in full -- git diff skips them):"
git ls-files --others --exclude-standard | sed 's/^/  /'
