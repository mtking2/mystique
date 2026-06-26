#!/usr/bin/env node
'use strict';
// Statusline segment: prints active form label(s), or nothing. Never errors.
try {
  const { readState } = require('../lib/state');
  const active = readState().active;
  if (active.length) {
    const parts = active.map(f => f.label || f.name);
    process.stdout.write(parts.join(' +'));
  }
} catch {
  // print nothing on any failure
}
