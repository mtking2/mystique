'use strict';
const fs = require('fs');
const path = require('path');
const { statePath } = require('./paths');

const MAX = 2;

function readState() {
  try {
    const raw = fs.readFileSync(statePath(), 'utf8');
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.active)) return { active: [] };
    return { active: data.active.slice(0, MAX).map(f => ({ name: f.name, label: f.label || '' })) };
  } catch {
    return { active: [] };
  }
}

function writeState(stateObj) {
  const p = statePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(stateObj, null, 2));
  fs.renameSync(tmp, p);
  return stateObj;
}

// Replace the primary (index 0), preserving an existing secondary.
function setPrimary(name, label = '') {
  const s = readState();
  const secondary = s.active[1];
  const active = [{ name, label }];
  if (secondary && secondary.name !== name) active.push(secondary);
  return writeState({ active });
}

// Append a second form. No-op if already active; throws if already at capacity.
function addStack(name, label = '') {
  const s = readState();
  if (s.active.some(f => f.name === name)) return s;
  if (s.active.length >= MAX) {
    throw new Error('Mystique holds two forms max. Clear or swap one.');
  }
  s.active.push({ name, label });
  return writeState(s);
}

function clear() {
  return writeState({ active: [] });
}

module.exports = { readState, writeState, setPrimary, addStack, clear, MAX };
