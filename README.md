# mystique

> Shapeshift Claude Code into any **role** — instantly, mid-session, no restart.

`mystique` lets Claude assume switchable **forms**: self-contained bundles of mindset, output style, recommended skills, advisory tool scope, and focus areas. The active form is re-injected every turn via a `UserPromptSubmit` hook, so a role sticks across long sessions without drifting — and switching is just rewriting a small state file.

Roles are *forms*. Drive it with `/mystique` or its alias `/role`.

## Why

Existing role/persona projects each cover one slice — capability *or* cosmetic *or* a big library. mystique focuses on the gap: **frictionless in-session switching** of a **behavior bundle**, with light 2-form stacking and dead-simple authoring (write a markdown file).

## Highlights

- **Sticks across the session** — hook re-injects the active form every turn, no drift.
- **Behavior bundle** — principles, output style, recommended skills, focus, advisory tool scope.
- **Stacking (cap 2)** — combine two forms; primary wins conflicts.
- **Project + global forms** — `./.claude/roles/` overrides `~/.claude/roles/`. Repos ship their own forms.
- **Easy authoring** — `/role create` wizard, or just drop a markdown file.
- **Optional cosmetics** — per-form spinner verbs + a composable statusline segment.

## Status

Early development.

## Commands

| Command | Action |
|---------|--------|
| `/role` | Menu — active form(s) + available |
| `/role <name>` | Shift into a form (primary) |
| `/role +<name>` | Stack a 2nd form (cap 2) |
| `/role clear` | Revert to true self |
| `/role show` | Current form(s) + resolved injection |
| `/role list` | All forms, global + project |
| `/role create` | Guided authoring wizard |
| `/role edit <name>` | Edit a form file |

## Install

1. Add the marketplace and install the plugin (Claude Code):
   ```
   /plugin marketplace add mtking2/mystique
   /plugin install mystique@mystique
   ```
2. Copy the example forms into your global roles dir (or a project's `./.claude/roles/`):
   ```
   mkdir -p ~/.claude/roles && cp roles/*.md ~/.claude/roles/
   ```

## Authoring a form

A form is a markdown file in `~/.claude/roles/` (global) or `./.claude/roles/` (project — wins on name collision). Flat frontmatter + a markdown body:

```markdown
---
name: my-role
description: One line.
label: 🎭 My Role          # optional, statusline
tool_prefer: [Read, Grep]  # optional, advisory
tool_avoid: [Bash]         # optional, advisory
triggers: [keyword]        # optional, soft suggestions
spinner: [Doing]           # optional, spinner verbs
---

## Principles
- ...
## Output style
- ...
## Focus
- In: ... / Out: ...
```

Keep the body tight (~150 words) — it is injected every turn. Or just run `/role create` for a guided wizard.

## Statusline (optional)

Add the active form to your own statusline by calling the segment helper:

```
node ~/.claude/plugins/.../mystique/bin/mystique-segment.js
```

It prints e.g. `🛡️ Security +💎 Rails`, or nothing when no form is active.

## License

MIT — see [LICENSE](LICENSE).
