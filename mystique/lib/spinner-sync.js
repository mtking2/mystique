'use strict';
// Spinner sync shared by the CLI (bin/mystique.js) and the UserPromptSubmit
// hook (hooks/mystique-inject.js). spinnerVerbs is a single global settings.json
// key, so per-session spinners aren't truly possible; instead the session whose
// prompt just fired re-asserts its spinner each turn — last-active window wins,
// which is exactly the window whose spinner is about to render.
const { readState } = require('./state');
const { resolveForm } = require('./forms');
const spinner = require('./spinner');

function verbsFor(name) {
  const f = resolveForm(name);
  return (f && f.meta.spinner) || [];
}

// Apply this session's primary-form spinner (write-on-change); restore the
// default when the session has no form. Cheap to call every turn: applySpinner
// skips the write when already current, and restoreSpinner no-ops once restored.
function syncSpinner(sessionId) {
  const s = readState(sessionId);
  if (!s.active.length) { spinner.restoreSpinner(); return; }
  const verbs = verbsFor(s.active[0].name);
  if (verbs.length) spinner.applySpinner(verbs);
}

module.exports = { syncSpinner, verbsFor };
