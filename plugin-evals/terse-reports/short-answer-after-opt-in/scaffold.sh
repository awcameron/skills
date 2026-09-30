#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs
printf '# Project\n\nShort readme.\n' > README.md
printf '# Notes\n\nA few notes.\n' > docs/notes.md
{
  printf '# Guide\n\n'
  for i in $(seq 1 60); do printf 'Step %s: do the thing described in this line of the guide.\n' "$i"; done
} > docs/guide.md
