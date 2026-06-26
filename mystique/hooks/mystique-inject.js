#!/usr/bin/env node
'use strict';
// UserPromptSubmit hook: re-inject the active mystique form(s) every turn.
// Silent (no output) when no form is active. Never throws.
const { readState } = require('../lib/state');
const { renderInjection } = require('../lib/render');

// Drain stdin (we don't use the prompt payload) so the 'end' event fires.
process.stdin.on('data', () => {});
process.stdin.on('end', () => {
  try {
    const injection = renderInjection(readState());
    if (!injection) return; // silent: nothing active
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: injection,
      },
    }));
  } catch {
    // Swallow all errors — a broken hook must not break the prompt.
  }
});
