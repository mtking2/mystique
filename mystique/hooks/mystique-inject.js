#!/usr/bin/env node
'use strict';
// UserPromptSubmit hook: re-inject the active mystique form(s) every turn.
// Silent (no output) when no form is active. Never throws.
const { readState } = require('../lib/state');
const { renderInjection } = require('../lib/render');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
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
