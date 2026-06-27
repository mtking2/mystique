'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BIN = path.join(__dirname, '..', 'bin', 'mystique.js');

// Build a temp global CLAUDE dir + a temp project with two spinner-bearing forms.
function setup() {
  const claude = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-cli-claude-'));
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-cli-proj-'));
  const roles = path.join(proj, '.claude', 'roles');
  fs.mkdirSync(roles, { recursive: true });
  fs.writeFileSync(path.join(roles, 'aaa.md'), '---\nlabel: A\nspinner: [Aaa]\n---\nbody A\n');
  fs.writeFileSync(path.join(roles, 'bbb.md'), '---\nlabel: B\nspinner: [Bbb]\n---\nbody B\n');
  return { claude, proj };
}
function run(claude, proj, sessionId, args) {
  return execFileSync('node', [BIN, ...args], {
    cwd: proj,
    env: { ...process.env, CLAUDE_CONFIG_DIR: claude, CLAUDE_CODE_SESSION_ID: sessionId },
    encoding: 'utf8',
  });
}
function settings(claude) {
  try { return JSON.parse(fs.readFileSync(path.join(claude, 'settings.json'), 'utf8')); }
  catch { return {}; }
}
function sessionFile(claude, id) {
  return path.join(claude, 'mystique', 'sessions', `${id}.json`);
}

test('switch writes a per-session file and applies that form spinner', () => {
  const { claude, proj } = setup();
  run(claude, proj, 's1', ['switch', 'aaa']);
  assert.strictEqual(fs.existsSync(sessionFile(claude, 's1')), true);
  assert.deepStrictEqual(settings(claude).spinnerVerbs, { verbs: ['Aaa'], mode: 'replace' });
});

test('S2: clearing one session re-applies a surviving session spinner; last clear restores', () => {
  const { claude, proj } = setup();
  run(claude, proj, 's1', ['switch', 'aaa']);   // spinner -> Aaa, backup captures "absent"
  run(claude, proj, 's2', ['switch', 'bbb']);   // spinner -> Bbb (last-writer-wins)
  assert.deepStrictEqual(settings(claude).spinnerVerbs, { verbs: ['Bbb'], mode: 'replace' });

  run(claude, proj, 's2', ['clear']);            // s1 still active -> spinner back to Aaa
  assert.deepStrictEqual(settings(claude).spinnerVerbs, { verbs: ['Aaa'], mode: 'replace' });
  assert.strictEqual(fs.existsSync(sessionFile(claude, 's2')), false);

  run(claude, proj, 's1', ['clear']);            // last session out -> restore original (was absent)
  assert.strictEqual('spinnerVerbs' in settings(claude), false);
});

test('startup deletes the legacy global active.json', () => {
  const { claude, proj } = setup();
  fs.mkdirSync(path.join(claude, 'mystique'), { recursive: true });
  fs.writeFileSync(path.join(claude, 'mystique', 'active.json'), JSON.stringify({ active: [{ name: 'x' }] }));
  run(claude, proj, 's1', ['list']);
  assert.strictEqual(fs.existsSync(path.join(claude, 'mystique', 'active.json')), false);
});
