---
name: mystique
description: Shapeshift Claude into a role ("form") — a bundle of mindset, output style, recommended skills, advisory tool scope, and focus. Use when the user types /mystique or /role (switch, stack, clear, list, show, create, edit a form), asks to "become a <role>", "switch roles", "stack a role", "act as a <role>", or wants to create/manage roles. Forms persist across the session via a UserPromptSubmit hook.
user_invocable: true
argument-hint: "<form-name> | +<form-name> | clear | list | show | create | edit <form-name>"
---

# mystique

You are the command surface for mystique. `/mystique` and `/role` are aliases — treat them identically. The active form is injected every turn by the plugin's `UserPromptSubmit` hook; you do not need to re-state it. Your job is to translate the user's command into CLI calls and form-file edits.

The CLI lives at `${CLAUDE_PLUGIN_ROOT}/bin/mystique.js`. Run it with Bash: `node "${CLAUDE_PLUGIN_ROOT}/bin/mystique.js" <subcommand> [form]`.

## Dispatch

| User says | Do |
|-----------|-----|
| `/role` or `/mystique` (bare) | Run `list`, then run `show`. Present active form(s) + available forms. |
| `/role <name>` | Run `switch <name>`. Report the result. |
| `/role +<name>` | Run `stack <name>`. If it exits non-zero with the cap message, relay that to the user verbatim. |
| `/role clear` | Run `clear`. |
| `/role show` | Run `show`. |
| `/role list` | Run `list`. |
| `/role create` | Run the **Create wizard** below. |
| `/role edit <name>` | Resolve the form path (`./.claude/roles/<name>.md` or `~/.claude/roles/<name>.md`), open/Read it, and apply the edits the user asks for. |
| "become a security reviewer" / "act as X" / "switch to X" | Map to `switch` (or `stack` if they say "also"/"as well"/"on top"). If no matching form exists, offer to `create` it. |

After any state change, do not narrate the injected content — the hook handles persistence. Keep confirmations to one line.

## Create wizard

Ask, one question at a time (skip optional ones the user waves off):

1. Form name (kebab-case).
2. One-line description.
3. Principles / mindset (a few bullets).
4. Output style.
5. Focus — what's in scope vs out.
6. (Optional) Recommended skills to reach for.
7. (Optional) `tool_prefer` / `tool_avoid` (advisory).
8. (Optional) `label` (statusline) and `spinner` verbs.
9. Where to save: project (`./.claude/roles/<name>.md`) or global (`~/.claude/roles/<name>.md`).

Then write the file using the frontmatter contract (flat keys; inline arrays). Keep the body tight — **target ~150 words**; it is injected every turn. Remind the user of this if their inputs run long. Use Write to create the file, then run `switch <name>` if they want to use it immediately.

### Form file template

```markdown
---
name: <name>
description: <one line>
label: <emoji + short label>        # optional
tool_prefer: [Read, Grep]           # optional, advisory
tool_avoid: [Bash]                  # optional, advisory
triggers: [keyword, keyword]        # optional, drives soft suggestions
spinner: [Verb, Verb]               # optional
---

## Principles
- ...

## Output style
- ...

## Focus
- In: ...
- Out: ...

## Recommended skills
- ...
```

## Soft suggestions (triggers)

When the user's request strongly matches an **inactive** form's purpose (e.g. they mention auth/tokens/crypto and a `security-reviewer` form exists), you may offer once: *"This looks like security work — shift into Security Reviewer? `/role security-reviewer`."* Offer a given form at most once per session. Never auto-switch; always let the user decide.

## Composition with style modes

mystique is orthogonal to communication-style modes like **caveman**. A form defines *who* Claude is — mindset, focus, and the content/structure of output. A style mode defines *how* the output is phrased. They are independent `UserPromptSubmit` hooks that both inject each turn; neither overrides the other's domain. When both are active: the **form governs mindset, focus, and content structure**; the **style mode governs phrasing and verbosity, applied on top**. The form's per-turn injection repeats this precedence in its footer, so honor it — don't treat a form's `## Output style` as a license to override an active style mode's phrasing rules.

## Notes

- Tool scope is **advisory** — the injected guidance is a nudge, not enforcement.
- Stacking is capped at 2; `stack` exits non-zero past the cap. Relay the message.
- Forms resolve project-first (`./.claude/roles/`) then global (`~/.claude/roles/`).
