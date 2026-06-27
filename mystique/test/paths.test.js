'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const paths = require('../lib/paths');

function withClaudeDir(dir, fn) {
  const prev = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = dir;
  try { fn(); } finally { process.env.CLAUDE_CONFIG_DIR = prev; }
}

test('sessionStatePath nests under mystique/sessions by id', () => {
  withClaudeDir('/fake/claude', () => {
    assert.strictEqual(
      paths.sessionStatePath('abc-123'),
      path.join('/fake/claude', 'mystique', 'sessions', 'abc-123.json')
    );
    assert.strictEqual(
      paths.sessionsDir(),
      path.join('/fake/claude', 'mystique', 'sessions')
    );
  });
});

test('legacyStatePath points at the old global active.json', () => {
  withClaudeDir('/fake/claude', () => {
    assert.strictEqual(
      paths.legacyStatePath(),
      path.join('/fake/claude', 'mystique', 'active.json')
    );
  });
});

test('statePath is no longer exported', () => {
  assert.strictEqual(typeof paths.statePath, 'undefined');
});
