# Changelog

All notable changes to mystique are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-27

### Changed

- **State is now per-session.** Each Claude Code window keeps its own active
  form(s) in `~/.claude/mystique/sessions/<session_id>.json`. Switching, stacking,
  or clearing a form in one window no longer leaks into other windows. The session
  id comes from `CLAUDE_CODE_SESSION_ID` (CLI) and the `session_id` stdin payload
  (hook and statusline segment). There is no global form layer.
- `clear` now deletes this session's state file rather than emptying a shared one.
- Statusline: the `bash`/`jq` README snippet now reads the per-session path and
  pulls `session_id` from the statusline stdin JSON.

### Added

- Per-session spinner: the `UserPromptSubmit` hook re-asserts the active form's
  `spinnerVerbs` every turn, so the window you are actively driving owns the
  thinking spinner (last-active-wins — and that is exactly the window whose
  spinner is about to render). Writes are change-guarded, so `settings.json` is
  only touched when the spinner actually needs to change.
- Spinner handoff (strategy S2): clearing a form re-applies the spinner of the
  most-recently-active surviving session, and only restores your original spinner
  once the last mystique session clears.
- Automatic cleanup: session state files older than 30 days are swept on CLI use.

### Known limitations

- Spinner changeover shows one stale frame. On a turn where the active spinner
  changes (a cross-window handoff, or a switch in another window), Claude Code
  reads `spinnerVerbs` to start the spinner at roughly the same moment the
  `UserPromptSubmit` hook writes the new verbs, so the opening frame can briefly
  show the previous value before the hot-reload flips it. It self-corrects within
  the same turn, and a single steady-state window never flashes (the change-guard
  no-ops). `UserPromptSubmit` is the earliest per-turn hook, so this opening-frame
  race can't be fully closed from the plugin side.

### Migration

- The old global `~/.claude/mystique/active.json` is ignored and deleted on first
  CLI invocation. No action required; sessions start with no form after upgrade.

## [0.1.0]

### Added

- Initial release: switchable **forms** (roles) as behavior bundles — mindset,
  output style, recommended skills, advisory tool scope, focus, and optional
  cosmetics (label + spinner verbs).
- `UserPromptSubmit` hook re-injects the active form(s) every turn.
- `switch`, `stack` (cap 2, primary wins), `clear`, `list`, `show` commands.
- Project-local (`./.claude/roles/`) forms override global (`~/.claude/roles/`).
- Composable statusline segment helper.
