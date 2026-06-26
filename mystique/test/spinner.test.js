'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const spinner = require('../lib/spinner');

function freshClaude() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-spin-'));
  process.env.CLAUDE_CONFIG_DIR = dir;
  return dir;
}
function readSettings(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
}

test('applySpinner with no verbs leaves settings untouched', () => {
  const dir = freshClaude();
  spinner.applySpinner([]);
  assert.strictEqual(fs.existsSync(path.join(dir, 'settings.json')), false);
});

test('applySpinner writes verbs and snapshots prior absent key; restore removes it', () => {
  const dir = freshClaude();
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ model: 'opus' }));
  spinner.applySpinner(['Hardening', 'Auditing']);
  assert.deepStrictEqual(readSettings(dir).spinnerVerbs, ['Hardening', 'Auditing']);
  assert.strictEqual(readSettings(dir).model, 'opus'); // other keys preserved
  assert.ok(fs.existsSync(path.join(dir, 'mystique', 'spinner-backup.json')));
  spinner.restoreSpinner();
  assert.strictEqual('spinnerVerbs' in readSettings(dir), false); // key removed (was absent)
  assert.strictEqual(fs.existsSync(path.join(dir, 'mystique', 'spinner-backup.json')), false);
});

test('restore puts back the user original custom verbs', () => {
  const dir = freshClaude();
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ spinnerVerbs: ['Thinking', 'Cogitating'] }));
  spinner.applySpinner(['Hardening']);
  spinner.applySpinner(['Refactoring']); // second switch must NOT clobber the snapshot
  spinner.restoreSpinner();
  assert.deepStrictEqual(readSettings(dir).spinnerVerbs, ['Thinking', 'Cogitating']);
});

test('restore with no snapshot is a no-op', () => {
  freshClaude();
  assert.doesNotThrow(() => spinner.restoreSpinner());
});
