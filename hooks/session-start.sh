#!/bin/bash
# skills session start hook
#
# Injects a compact catalog (name + description) of every skill under skills/ into
# every new Claude Code session, so the catalog is visible up front instead of relying
# entirely on auto-discovery to notice a request matches later.
#
# Every output path must emit the standard SessionStart envelope:
#   {"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}
# Claude Code rejects any other shape, so even the "nothing to report" and "jq missing"
# paths below still emit a valid envelope rather than plain text or silence.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")/skills"

# Emits the SessionStart envelope, JSON-escaping via jq when it's available and falling
# back to a hand-escaped one-liner otherwise (jq is not guaranteed to be on PATH, and this
# hook must never hard-fail a session start over a missing optional dependency).
emit() {
  local context="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -cn --arg context "$context" \
      '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $context}}'
  else
    # Hand-escaping only covers backslash/quote/newline -- it's a fallback for when jq is
    # missing, not a general JSON encoder. Fine here since the content is our own catalog
    # text, not arbitrary user input.
    local escaped
    escaped=$(printf '%s' "$context" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    printf '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "%s"}}\n' "$escaped"
  fi
}

if [ ! -d "$SKILLS_DIR" ]; then
  emit "skills: skills directory not found at $SKILLS_DIR -- skipping catalog injection."
  exit 0
fi

catalog="skills is available this session. Each skill activates automatically when a request matches its description, or can be invoked explicitly via its matching slash command:"

found_any=0
for skill_md in "$SKILLS_DIR"/*/SKILL.md; do
  [ -f "$skill_md" ] || continue
  found_any=1

  name=$(sed -n 's/^name: *//p' "$skill_md" | head -1 | tr -d '\r')

  # description is either a single-line scalar (`description: foo`) or a folded `>-`
  # block (`description: >-` followed by indented continuation lines) -- join whichever
  # shape it is into one string. Not a general YAML parser, just enough to read this
  # repo's two actual description shapes.
  full_description=$(awk '
    /^description:/ {
      found = 1
      sub(/^description: */, "")
      if ($0 != ">-" && $0 != "|" && $0 != ">" && $0 != "") { buf = $0 }
      next
    }
    found && /^[[:space:]]/ { sub(/^[[:space:]]+/, ""); buf = (buf == "" ? $0 : buf " " $0); next }
    found { exit }
    END { print buf }
  ' "$skill_md")

  # Catalog entries are meant to be a compact one-liner per skill, not the full
  # multi-sentence description -- cut at the first sentence boundary (". ") rather
  # than an arbitrary character count, so an entry never ends mid-clause. Fall back to
  # a hard cap only for the rare description with no early sentence break.
  description="${full_description%%. *}"
  if [ "$description" = "$full_description" ] && [ ${#description} -gt 160 ]; then
    description="${description:0:157}..."
  else
    description="${description}."
  fi

  [ -n "$name" ] && catalog="${catalog}"$'\n'"- \`${name}\`: ${description}"
done

if [ "$found_any" -eq 0 ]; then
  emit "skills: no SKILL.md files found under $SKILLS_DIR -- skipping catalog injection."
  exit 0
fi

emit "$catalog"
