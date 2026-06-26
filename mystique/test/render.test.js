'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { renderInjection, toolLine } = require('../lib/render');

function tmpClaude() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-render-'));
  process.env.CLAUDE_CONFIG_DIR = dir;
  fs.mkdirSync(path.join(dir, 'roles'), { recursive: true });
  return dir;
}

function writeForm(dir, name, frontmatter, body) {
  fs.writeFileSync(path.join(dir, 'roles', `${name}.md`), `---\n${frontmatter}\n---\n${body}`);
}

test('renderInjection returns empty string for no active forms', () => {
  tmpClaude();
  assert.strictEqual(renderInjection({ active: [] }), '');
});

test('toolLine builds advisory guidance from prefer/avoid', () => {
  assert.strictEqual(
    toolLine({ tool_prefer: ['Read', 'Grep'], tool_avoid: ['Bash'] }),
    'Tool guidance (advisory): prefer Read, Grep; avoid Bash.'
  );
  assert.strictEqual(toolLine({}), '');
});

test('renderInjection for one form includes header, body, and tool line', () => {
  const dir = tmpClaude();
  writeForm(dir, 'sec', 'name: sec\ntool_prefer: [Read]\ntool_avoid: [Bash]', '## Principles\n- Assume breach.\n');
  const out = renderInjection({ active: [{ name: 'sec', label: '🛡️' }] });
  assert.match(out, /MYSTIQUE ACTIVE — form: sec/);
  assert.match(out, /Assume breach\./);
  assert.match(out, /Tool guidance \(advisory\): prefer Read; avoid Bash\./);
});

test('renderInjection for two forms labels primary and notes conflict rule', () => {
  const dir = tmpClaude();
  writeForm(dir, 'sec', 'name: sec', '- breach\n');
  writeForm(dir, 'rails', 'name: rails', '- rails\n');
  const out = renderInjection({ active: [{ name: 'sec', label: 'S' }, { name: 'rails', label: 'R' }] });
  assert.match(out, /2 forms/);
  assert.match(out, /primary \(form 1\) wins/i);
  assert.match(out, /form 1 \(primary\): sec/);
  assert.match(out, /form 2: rails/);
  assert.match(out, /breach/);
  assert.match(out, /rails/);
});

test('renderInjection skips a missing form gracefully', () => {
  tmpClaude();
  // form file never written
  const out = renderInjection({ active: [{ name: 'ghost', label: '' }] });
  assert.strictEqual(out, '');
});

test('renderInjection appends the composition footer for active forms', () => {
  const dir = tmpClaude();
  writeForm(dir, 'sec', 'name: sec', '- breach\n');
  const out = renderInjection({ active: [{ name: 'sec', label: 'S' }] });
  assert.match(out, /Composition: a communication-style mode \(e\.g\. caveman\)/);
  assert.match(out, /governs phrasing/);
  assert.match(out, /apply the style mode on top/);
});
