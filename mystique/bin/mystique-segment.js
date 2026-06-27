#!/usr/bin/env node
'use strict';
// Statusline segment: prints active form label(s) for THIS session, or nothing.
// Reads the session_id from the statusline stdin JSON. Never errors.
try {
  const fs = require('fs');
  const { readState } = require('../lib/state');
  let sessionId;
  try { sessionId = JSON.parse(fs.readFileSync(0, 'utf8')).session_id; } catch {}
  if (sessionId) {
    const active = readState(sessionId).active;
    if (active.length) {
      const parts = active.map(f => f.label || f.name);
      process.stdout.write(parts.join(' +'));
    }
  }
} catch {
  // print nothing on any failure
}
