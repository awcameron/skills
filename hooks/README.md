# Session start hook

`session-start.sh` injects a compact catalog (name + one-sentence description, generated fresh
from `skills/*/SKILL.md` on every run -- never hand-maintained, so it can't drift from the real
skills) into every new Claude Code session, via the `SessionStart` hook. It emits the required
`{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}` envelope
whether or not `jq` is installed (`jq` gives robust JSON escaping; without it, the hook falls back
to a hand-escaped one-liner rather than skip the catalog).

Only Claude Code's hook system is wired up here (`hooks/hooks.json`'s `SessionStart` shape is
Claude Code-specific). Other tools with their own session/lifecycle hook mechanism that accepts
the same JSON envelope could point at this same script; none of the other four tools this repo
targets are confirmed to work with it as-is.

## Setup

**Installed as the Claude Code plugin** (see `docs/claude-code-setup.md`): nothing to do --
Claude Code auto-loads `hooks/hooks.json` from its standard path for any installed plugin, no
`plugin.json` declaration needed (declaring it explicitly causes a duplicate-load error).

**Symlinked into a project instead of installed as a plugin**: hooks are not auto-discovered
outside the plugin system, so copy the hook registration into the project's own
`.claude/settings.json` (or `.claude/settings.local.json` for a personal-only setup) by hand:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"/path/to/skills/hooks/session-start.sh\""
          }
        ]
      }
    ]
  }
}
```

Adjust the path to wherever you cloned or symlinked this repo.

## Verifying it worked

```bash
bash hooks/session-start.sh | python3 -m json.tool
```

Should print a valid `hookSpecificOutput` envelope with one line per skill under
`additionalContext`. If a skill's line looks truncated or wrong, check its `SKILL.md`
frontmatter against `docs/skill-anatomy.md` -- the hook is a plain frontmatter reader, not a full
YAML parser, and expects the same two description shapes `scripts/validate-skills.js` checks for.
