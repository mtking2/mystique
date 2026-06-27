'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const state = require('../lib/state');
const { syncSpinner } = require('../lib/spinner-sync');

// Fresh global CLAUDE dir with two global forms: one with a spinner, one without.
function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-sync-'));
  process.env.CLAUDE_CONFIG_DIR = dir;
  const roles = path.join(dir, 'roles');
  fs.mkdirSync(roles, { recursive: true });
  fs.writeFileSync(path.join(roles, 'rogue.md'), '---\nlabel: R\nspinner: [Chargin, Shufflin]\n---\nbody\n');
  fs.writeFileSync(path.join(roles, 'plain.md'), '---\nlabel: P\n---\nno spinner\n');
  return dir;
}
function settings(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8')); }
  catch { return {}; }
}

test('syncSpinner applies the session primary form spinner', () => {
  const dir = setup();
  state.setPrimary('s1', 'rogue', 'R');
  syncSpinner('s1');
  assert.deepStrictEqual(settings(dir).spinnerVerbs, { verbs: ['Chargin', 'Shufflin'], mode: 'replace' });
});

test('syncSpinner on a session with no form restores the default spinner', () => {
  const dir = setup();
  state.setPrimary('s1', 'rogue', 'R');
  syncSpinner('s1');                                   // spinner -> rogue, backup captures "absent"
  assert.ok('spinnerVerbs' in settings(dir));
  state.clear('s1');                                   // session goes formless
  syncSpinner('s1');                                   // -> restore original (was absent)
  assert.strictEqual('spinnerVerbs' in settings(dir), false);
});

test('syncSpinner with a form that has no spinner leaves settings untouched', () => {
  const dir = setup();
  state.setPrimary('s1', 'plain', 'P');
  syncSpinner('s1');
  assert.strictEqual(fs.existsSync(path.join(dir, 'settings.json')), false);
});
