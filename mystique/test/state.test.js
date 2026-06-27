'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const state = require('../lib/state');

function freshClaude() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-state-'));
  process.env.CLAUDE_CONFIG_DIR = dir;
  return dir;
}
function sessionFile(dir, id) {
  return path.join(dir, 'mystique', 'sessions', `${id}.json`);
}

test('readState returns empty active when no file exists', () => {
  freshClaude();
  assert.deepStrictEqual(state.readState('s1'), { active: [] });
});

test('readState returns empty active on corrupt file', () => {
  const dir = freshClaude();
  fs.mkdirSync(path.join(dir, 'mystique', 'sessions'), { recursive: true });
  fs.writeFileSync(sessionFile(dir, 's1'), 'not json{');
  assert.deepStrictEqual(state.readState('s1'), { active: [] });
});

test('state is isolated per session', () => {
  freshClaude();
  state.setPrimary('s1', 'pirate', '🏴‍☠️');
  assert.deepStrictEqual(state.readState('s2'), { active: [] }); // s2 untouched
  assert.deepStrictEqual(state.readState('s1').active, [{ name: 'pirate', label: '🏴‍☠️' }]);
});

test('setPrimary on empty state creates a single-form state', () => {
  freshClaude();
  const s = state.setPrimary('s1', 'sec', '🛡️');
  assert.deepStrictEqual(s.active, [{ name: 'sec', label: '🛡️' }]);
  assert.deepStrictEqual(state.readState('s1'), s); // persisted
});

test('setPrimary preserves an existing secondary form', () => {
  freshClaude();
  state.setPrimary('s1', 'a', 'A');
  state.addStack('s1', 'b', 'B');
  const s = state.setPrimary('s1', 'c', 'C');
  assert.deepStrictEqual(s.active, [{ name: 'c', label: 'C' }, { name: 'b', label: 'B' }]);
});

test('addStack appends a second form', () => {
  freshClaude();
  state.setPrimary('s1', 'a', 'A');
  const s = state.addStack('s1', 'b', 'B');
  assert.deepStrictEqual(s.active.map(f => f.name), ['a', 'b']);
});

test('addStack on empty state sets the primary', () => {
  freshClaude();
  const s = state.addStack('s1', 'a', 'A');
  assert.deepStrictEqual(s.active, [{ name: 'a', label: 'A' }]);
});

test('addStack is a no-op when the form is already active', () => {
  freshClaude();
  state.setPrimary('s1', 'a', 'A');
  const s = state.addStack('s1', 'a', 'A');
  assert.deepStrictEqual(s.active.map(f => f.name), ['a']);
});

test('addStack throws when two forms are already active', () => {
  freshClaude();
  state.setPrimary('s1', 'a', 'A');
  state.addStack('s1', 'b', 'B');
  assert.throws(() => state.addStack('s1', 'c', 'C'), /two forms/i);
});

test('readState caps to MAX and normalizes entries from an oversized/dirty file', () => {
  const dir = freshClaude();
  fs.mkdirSync(path.join(dir, 'mystique', 'sessions'), { recursive: true });
  fs.writeFileSync(sessionFile(dir, 's1'), JSON.stringify({
    active: [
      { name: 'a', label: 'A', extra: 'drop me' },
      { name: 'b' },
      { name: 'c', label: 'C' },
    ],
  }));
  const s = state.readState('s1');
  assert.strictEqual(s.active.length, 2);                       // capped to MAX
  assert.deepStrictEqual(s.active, [{ name: 'a', label: 'A' }, { name: 'b', label: '' }]); // extra stripped, label defaulted
});

test('clear deletes the session file (resolution -> no form)', () => {
  const dir = freshClaude();
  state.setPrimary('s1', 'a', 'A');
  assert.strictEqual(fs.existsSync(sessionFile(dir, 's1')), true);
  const s = state.clear('s1');
  assert.deepStrictEqual(s, { active: [] });
  assert.strictEqual(fs.existsSync(sessionFile(dir, 's1')), false);
});

test('clear on a session with no file is a no-op', () => {
  freshClaude();
  assert.doesNotThrow(() => state.clear('nope'));
});

function touch(dir, id, ageDays) {
  const file = sessionFile(dir, id);
  const t = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);
  fs.utimesSync(file, t, t);
}

test('listActiveSessions returns only non-empty sessions, newest first', () => {
  const dir = freshClaude();
  state.setPrimary('old', 'a', 'A');
  state.setPrimary('new', 'b', 'B');
  state.clear('empty');                 // no file created
  touch(dir, 'old', 2);                 // 2 days ago
  touch(dir, 'new', 0);                 // now
  const list = state.listActiveSessions();
  assert.deepStrictEqual(list.map(s => s.id), ['new', 'old']); // newest first
  assert.deepStrictEqual(list[0].state.active[0], { name: 'b', label: 'B' });
});

test('listActiveSessions skips corrupt and empty session files', () => {
  const dir = freshClaude();
  fs.mkdirSync(path.join(dir, 'mystique', 'sessions'), { recursive: true });
  fs.writeFileSync(sessionFile(dir, 'bad'), 'garbage{');
  fs.writeFileSync(sessionFile(dir, 'empty'), JSON.stringify({ active: [] }));
  state.setPrimary('good', 'a', 'A');
  assert.deepStrictEqual(state.listActiveSessions().map(s => s.id), ['good']);
});

test('sweepStale deletes files older than maxAgeDays, keeps fresh ones', () => {
  const dir = freshClaude();
  state.setPrimary('stale', 'a', 'A');
  state.setPrimary('fresh', 'b', 'B');
  touch(dir, 'stale', 40);
  touch(dir, 'fresh', 1);
  state.sweepStale(30);
  assert.strictEqual(fs.existsSync(sessionFile(dir, 'stale')), false);
  assert.strictEqual(fs.existsSync(sessionFile(dir, 'fresh')), true);
});

test('sweepStale is a no-op when the sessions dir is missing', () => {
  freshClaude();
  assert.doesNotThrow(() => state.sweepStale(30));
});
