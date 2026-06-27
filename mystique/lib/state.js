'use strict';
const fs = require('fs');
const path = require('path');
const { sessionStatePath, sessionsDir } = require('./paths');

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

// Active sessions (parseable, non-empty), newest mtime first.
function listActiveSessions() {
  let entries = [];
  try { entries = fs.readdirSync(sessionsDir()); } catch { return []; }
  const out = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const file = path.join(sessionsDir(), entry);
    let stat, st;
    try {
      stat = fs.statSync(file);
      st = normalize(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch { continue; }
    if (!st.active.length) continue;
    out.push({ id: entry.slice(0, -5), mtime: stat.mtimeMs, state: st });
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

// Delete session files whose mtime is older than maxAgeDays.
function sweepStale(maxAgeDays) {
  let entries = [];
  try { entries = fs.readdirSync(sessionsDir()); } catch { return; }
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const file = path.join(sessionsDir(), entry);
    try {
      if (fs.statSync(file).mtimeMs < cutoff) fs.rmSync(file, { force: true });
    } catch {}
  }
}

module.exports = { readState, writeState, setPrimary, addStack, clear, listActiveSessions, sweepStale, MAX };
