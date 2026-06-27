'use strict';
const fs = require('fs');
const path = require('path');
const { sessionStatePath } = require('./paths');

const MAX = 2;

function normalize(data) {
  if (!data || !Array.isArray(data.active)) return { active: [] };
  return { active: data.active.slice(0, MAX).map(f => ({ name: f.name, label: f.label || '' })) };
}

function readState(sessionId) {
  try {
    const raw = fs.readFileSync(sessionStatePath(sessionId), 'utf8');
    return normalize(JSON.parse(raw));
  } catch {
    return { active: [] };
  }
}

function writeState(sessionId, stateObj) {
  const p = sessionStatePath(sessionId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(stateObj, null, 2));
  fs.renameSync(tmp, p);
  return stateObj;
}

// Replace the primary (index 0), preserving an existing secondary.
function setPrimary(sessionId, name, label = '') {
  const s = readState(sessionId);
  const secondary = s.active[1];
  const active = [{ name, label }];
  if (secondary && secondary.name !== name) active.push(secondary);
  return writeState(sessionId, { active });
}

// Append a second form. No-op if already active; throws if already at capacity.
function addStack(sessionId, name, label = '') {
  const s = readState(sessionId);
  if (s.active.some(f => f.name === name)) return s;
  if (s.active.length >= MAX) {
    throw new Error('Mystique holds two forms max. Clear or swap one.');
  }
  s.active.push({ name, label });
  return writeState(sessionId, s);
}

// Per-session clear = delete the file. Absent == no form, so this doubles as cleanup.
function clear(sessionId) {
  fs.rmSync(sessionStatePath(sessionId), { force: true });
  return { active: [] };
}

module.exports = { readState, writeState, setPrimary, addStack, clear, MAX };
