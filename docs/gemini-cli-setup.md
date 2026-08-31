# Using agent-skills with Gemini CLI

## Option 1: Native skill discovery (recommended)

Gemini CLI has a native skills system that auto-discovers `SKILL.md` files in `.gemini/skills/`
or `.agents/skills/`. This repo already ships `.agents/skills` as a symlink to the canonical
`skills/` directory, so cloning it into a project and pointing either path at `skills/` is enough:

```bash
git clone https://github.com/<your-github-username>/agent-skills.git
cd your-project
ln -s ../agent-skills/skills .gemini/skills    # or .agents/skills -- either works
```

Gemini CLI injects each skill's name and description into the prompt automatically. When it
recognizes a matching task, it asks permission to activate the skill before loading its full
instructions. Verify with `/skills list`.

## Option 2: Slash commands

The repo also ships 10 slash commands under `.gemini/commands/` -- one thin wrapper per skill,
for explicit invocation instead of waiting on auto-discovery:

| Command | Skill it invokes |
|---|---|
| `/review-code` | `review-code` |
| `/write-tests` | `write-tests` |
| `/diagnose-bug` | `diagnose-bug` |
| `/fix-bug` | `fix-bug` |
| `/create-pr` | `create-pr` |
| `/doc-fact-check` | `doc-fact-check` |
| `/format-docs` | `format-docs` |
| `/ts-best-practices` | `ts-best-practices` |
| `/choose-subagent` | `choose-subagent` |
| `/terse-reports` | `terse-reports` |

Gemini CLI auto-discovers `.gemini/commands/*.toml` files when run from the project root -- no
separate install step.

## Option 3: GEMINI.md (persistent context)

For a skill you want always loaded rather than activated on demand, add it to your project's
`GEMINI.md` instead:

```markdown
# Project Instructions

@skills/ts-best-practices/SKILL.md
```

> **Skills vs. GEMINI.md:** skills are on-demand and keep the context window clean; GEMINI.md is
> loaded on every prompt. Prefer skills unless a convention genuinely needs to be always-on.

## Usage tips

- Each `SKILL.md`'s `description` frontmatter is what Gemini CLI uses for auto-discovery -- it's
  written to state both *what* the skill does and *when* to use it, for exactly this reason.
- Explicitly load a skill mid-prompt with `@skills/<name>/SKILL.md` if you want to guarantee it's
  followed rather than waiting on auto-discovery.
