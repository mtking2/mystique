#!/usr/bin/env node
'use strict';
// UserPromptSubmit hook: re-inject the active mystique form(s) for THIS session
// every turn. Silent when no form is active or no session_id is present. Never throws.
const { readState } = require('../lib/state');
const { renderInjection } = require('../lib/render');

let buf = '';
process.stdin.on('data', d => { buf += d; });
process.stdin.on('end', () => {
  try {
    let sessionId;
    try { sessionId = JSON.parse(buf).session_id; } catch {}
    if (!sessionId) return; // can't resolve a session -> stay silent
    const injection = renderInjection(readState(sessionId));
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
