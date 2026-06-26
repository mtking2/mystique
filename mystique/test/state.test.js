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

test('readState returns empty active when no file exists', () => {
  freshClaude();
  assert.deepStrictEqual(state.readState(), { active: [] });
});

test('readState returns empty active on corrupt file', () => {
  const dir = freshClaude();
  fs.mkdirSync(path.join(dir, 'mystique'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'mystique', 'active.json'), 'not json{');
  assert.deepStrictEqual(state.readState(), { active: [] });
});

test('setPrimary on empty state creates a single-form state', () => {
  freshClaude();
  const s = state.setPrimary('sec', '🛡️');
  assert.deepStrictEqual(s.active, [{ name: 'sec', label: '🛡️' }]);
  assert.deepStrictEqual(state.readState(), s); // persisted
});

test('setPrimary preserves an existing secondary form', () => {
  freshClaude();
  state.setPrimary('a', 'A');
  state.addStack('b', 'B');
  const s = state.setPrimary('c', 'C');
  assert.deepStrictEqual(s.active, [{ name: 'c', label: 'C' }, { name: 'b', label: 'B' }]);
});

test('addStack appends a second form', () => {
  freshClaude();
  state.setPrimary('a', 'A');
  const s = state.addStack('b', 'B');
  assert.deepStrictEqual(s.active.map(f => f.name), ['a', 'b']);
});

test('addStack on empty state sets the primary', () => {
  freshClaude();
  const s = state.addStack('a', 'A');
  assert.deepStrictEqual(s.active, [{ name: 'a', label: 'A' }]);
});

test('addStack is a no-op when the form is already active', () => {
  freshClaude();
  state.setPrimary('a', 'A');
  const s = state.addStack('a', 'A');
  assert.deepStrictEqual(s.active.map(f => f.name), ['a']);
});

test('addStack throws when two forms are already active', () => {
  freshClaude();
  state.setPrimary('a', 'A');
  state.addStack('b', 'B');
  assert.throws(() => state.addStack('c', 'C'), /two forms/i);
});

test('readState caps to MAX and normalizes entries from an oversized/dirty file', () => {
  const dir = freshClaude();
  fs.mkdirSync(path.join(dir, 'mystique'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'mystique', 'active.json'), JSON.stringify({
    active: [
      { name: 'a', label: 'A', extra: 'drop me' },
      { name: 'b' },
      { name: 'c', label: 'C' },
    ],
  }));
  const s = state.readState();
  assert.strictEqual(s.active.length, 2);                       // capped to MAX
  assert.deepStrictEqual(s.active, [{ name: 'a', label: 'A' }, { name: 'b', label: '' }]); // extra stripped, label defaulted
});

test('clear empties the active list', () => {
  freshClaude();
  state.setPrimary('a', 'A');
  const s = state.clear();
  assert.deepStrictEqual(s, { active: [] });
});
