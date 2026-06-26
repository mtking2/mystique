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
  // Claude Code schema: spinnerVerbs is an OBJECT { verbs, mode }, not a bare array.
  assert.deepStrictEqual(readSettings(dir).spinnerVerbs, { verbs: ['Hardening', 'Auditing'], mode: 'replace' });
  assert.strictEqual(readSettings(dir).model, 'opus'); // other keys preserved
  assert.ok(fs.existsSync(path.join(dir, 'mystique', 'spinner-backup.json')));
  spinner.restoreSpinner();
  assert.strictEqual('spinnerVerbs' in readSettings(dir), false); // key removed (was absent)
  assert.strictEqual(fs.existsSync(path.join(dir, 'mystique', 'spinner-backup.json')), false);
});

test('restore puts back the user original custom verbs (object shape preserved verbatim)', () => {
  const dir = freshClaude();
  const original = { verbs: ['Thinking', 'Cogitating'], mode: 'append' };
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ spinnerVerbs: original }));
  spinner.applySpinner(['Hardening']);
  spinner.applySpinner(['Refactoring']); // second switch must NOT clobber the snapshot
  spinner.restoreSpinner();
  assert.deepStrictEqual(readSettings(dir).spinnerVerbs, original);
});

test('restore with no snapshot is a no-op', () => {
  freshClaude();
  assert.doesNotThrow(() => spinner.restoreSpinner());
});

test('applySpinner does NOT clobber a corrupt settings.json', () => {
  const dir = freshClaude();
  const sf = path.join(dir, 'settings.json');
  fs.writeFileSync(sf, '{ this is not json');
  spinner.applySpinner(['Hardening']);
  assert.strictEqual(fs.readFileSync(sf, 'utf8'), '{ this is not json'); // untouched
  assert.strictEqual(fs.existsSync(path.join(dir, 'mystique', 'spinner-backup.json')), false); // no snapshot taken
});

test('restoreSpinner skips when settings.json is corrupt, leaving backup intact', () => {
  const dir = freshClaude();
  // valid settings + apply to create a backup
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ spinnerVerbs: ['Orig'] }));
  spinner.applySpinner(['Hardening']);
  // now corrupt settings.json
  fs.writeFileSync(path.join(dir, 'settings.json'), 'garbage{');
  spinner.restoreSpinner();
  assert.strictEqual(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'), 'garbage{'); // untouched
  assert.ok(fs.existsSync(path.join(dir, 'mystique', 'spinner-backup.json'))); // backup preserved
});
