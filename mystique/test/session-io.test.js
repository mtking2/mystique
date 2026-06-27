'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK = path.join(__dirname, '..', 'hooks', 'mystique-inject.js');

function setup() {
  const claude = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-io-claude-'));
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-io-proj-'));
  const roles = path.join(proj, '.claude', 'roles');
  fs.mkdirSync(roles, { recursive: true });
  fs.writeFileSync(path.join(roles, 'aaa.md'), '---\nlabel: A\n---\nYou are form A.\n');
  const sessions = path.join(claude, 'mystique', 'sessions');
  fs.mkdirSync(sessions, { recursive: true });
  fs.writeFileSync(path.join(sessions, 's1.json'), JSON.stringify({ active: [{ name: 'aaa', label: 'A' }] }));
  return { claude, proj };
}
function runHook(claude, proj, stdin) {
  return execFileSync('node', [HOOK], {
    cwd: proj,
    env: { ...process.env, CLAUDE_CONFIG_DIR: claude },
    input: stdin,
    encoding: 'utf8',
  });
}

test('hook injects the form for the stdin session_id', () => {
  const { claude, proj } = setup();
  const out = runHook(claude, proj, JSON.stringify({ session_id: 's1', prompt: 'hi' }));
  const parsed = JSON.parse(out);
  assert.match(parsed.hookSpecificOutput.additionalContext, /MYSTIQUE ACTIVE/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /form A/);
});

test('hook is silent for a session with no active form', () => {
  const { claude, proj } = setup();
  const out = runHook(claude, proj, JSON.stringify({ session_id: 's-unknown' }));
  assert.strictEqual(out.trim(), '');
});

test('hook is silent when stdin has no session_id', () => {
  const { claude, proj } = setup();
  const out = runHook(claude, proj, JSON.stringify({ prompt: 'hi' }));
  assert.strictEqual(out.trim(), '');
});

const SEG = path.join(__dirname, '..', 'bin', 'mystique-segment.js');

function runSeg(claude, proj, stdin) {
  return execFileSync('node', [SEG], {
    cwd: proj,
    env: { ...process.env, CLAUDE_CONFIG_DIR: claude },
    input: stdin,
    encoding: 'utf8',
  });
}

test('segment prints the label for the stdin session_id', () => {
  const { claude, proj } = setup();
  assert.strictEqual(runSeg(claude, proj, JSON.stringify({ session_id: 's1' })), 'A');
});

test('segment prints nothing for an unknown session', () => {
  const { claude, proj } = setup();
  assert.strictEqual(runSeg(claude, proj, JSON.stringify({ session_id: 's-unknown' })), '');
});

test('segment prints nothing when stdin has no session_id', () => {
  const { claude, proj } = setup();
  assert.strictEqual(runSeg(claude, proj, JSON.stringify({})), '');
});
