'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseFrontmatter, resolveForm, listForms } = require('../lib/forms');

function tmpClaude() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myst-'));
  process.env.CLAUDE_CONFIG_DIR = dir;
  fs.mkdirSync(path.join(dir, 'roles'), { recursive: true });
  return dir;
}

const SAMPLE = `---
name: security-reviewer
description: Security-first review.
label: 🛡️ Security
tool_prefer: [Read, Grep, Glob]
tool_avoid: [Bash]
triggers: [auth, token, csrf]
spinner: [Hardening, Auditing]
---

## Principles
- Assume breach.
`;

test('parseFrontmatter extracts scalars, inline arrays, and body', () => {
  const { meta, body } = parseFrontmatter(SAMPLE);
  assert.strictEqual(meta.name, 'security-reviewer');
  assert.strictEqual(meta.description, 'Security-first review.');
  assert.strictEqual(meta.label, '🛡️ Security');
  assert.deepStrictEqual(meta.tool_prefer, ['Read', 'Grep', 'Glob']);
  assert.deepStrictEqual(meta.tool_avoid, ['Bash']);
  assert.deepStrictEqual(meta.triggers, ['auth', 'token', 'csrf']);
  assert.deepStrictEqual(meta.spinner, ['Hardening', 'Auditing']);
  assert.match(body.trim(), /^## Principles/);
});

test('parseFrontmatter strips trailing inline comments on scalars and arrays, preserves # without leading space', () => {
  const { meta } = parseFrontmatter(`---
name: sec
label: Security # statusline note
tool_prefer: [Read, Grep] # advisory only
color: #ff0000
---
body`);
  assert.strictEqual(meta.label, 'Security');
  assert.deepStrictEqual(meta.tool_prefer, ['Read', 'Grep']);
  assert.strictEqual(meta.color, '#ff0000');
});

test('parseFrontmatter handles CRLF line endings', () => {
  const crlf = '---\r\nname: sec\r\ntriggers: [auth, token]\r\n---\r\n## Body\r\n';
  const { meta, body } = parseFrontmatter(crlf);
  assert.strictEqual(meta.name, 'sec');
  assert.deepStrictEqual(meta.triggers, ['auth', 'token']);
  assert.match(body, /## Body/);
});

test('parseFrontmatter on text with no frontmatter returns empty meta + full body', () => {
  const { meta, body } = parseFrontmatter('just a body, no frontmatter');
  assert.deepStrictEqual(meta, {});
  assert.strictEqual(body.trim(), 'just a body, no frontmatter');
});

test('resolveForm finds a global form and returns name/meta/body/source', () => {
  const dir = tmpClaude();
  fs.writeFileSync(path.join(dir, 'roles', 'security-reviewer.md'), SAMPLE);
  const f = resolveForm('security-reviewer');
  assert.strictEqual(f.name, 'security-reviewer');
  assert.strictEqual(f.source, 'global');
  assert.strictEqual(f.meta.label, '🛡️ Security');
  assert.match(f.body, /Assume breach/);
});

test('resolveForm returns null for a missing form', () => {
  tmpClaude();
  assert.strictEqual(resolveForm('does-not-exist'), null);
});

test('resolveForm: project form shadows global form of same name', () => {
  const dir = tmpClaude();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
  fs.mkdirSync(path.join(proj, '.claude', 'roles'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'roles', 'dup.md'), `---\nname: dup\ndescription: global\n---\nG`);
  fs.writeFileSync(path.join(proj, '.claude', 'roles', 'dup.md'), `---\nname: dup\ndescription: project\n---\nP`);
  const cwd = process.cwd();
  process.chdir(proj);
  try {
    const f = resolveForm('dup');
    assert.strictEqual(f.source, 'project');
    assert.strictEqual(f.meta.description, 'project');
  } finally {
    process.chdir(cwd);
  }
});

test('listForms dedupes by name (project shadows global) and reports source', () => {
  const dir = tmpClaude();
  fs.writeFileSync(path.join(dir, 'roles', 'a.md'), `---\nname: a\ndescription: A\n---\n`);
  fs.writeFileSync(path.join(dir, 'roles', 'b.md'), `---\nname: b\ndescription: B\n---\n`);
  const forms = listForms().sort((x, y) => x.name.localeCompare(y.name));
  assert.deepStrictEqual(forms.map(f => f.name), ['a', 'b']);
  assert.strictEqual(forms[0].source, 'global');
});

test('resolveForm resolves an alias to its canonical filename stem', () => {
  const dir = tmpClaude();
  fs.writeFileSync(path.join(dir, 'roles', 'security-reviewer.md'),
    `---\nname: security-reviewer\naliases: [sr, sec]\ndescription: X\n---\nB`);
  const f = resolveForm('sr');
  assert.strictEqual(f.name, 'security-reviewer'); // canonical, not the alias
  assert.strictEqual(f.source, 'global');
  assert.match(f.body, /B/);
});

test('resolveForm: exact filename wins over another form claiming it as an alias', () => {
  const dir = tmpClaude();
  fs.writeFileSync(path.join(dir, 'roles', 'sr.md'), `---\nname: sr\ndescription: real sr\n---\n`);
  fs.writeFileSync(path.join(dir, 'roles', 'security-reviewer.md'),
    `---\nname: security-reviewer\naliases: [sr]\ndescription: aliased\n---\n`);
  const f = resolveForm('sr');
  assert.strictEqual(f.name, 'sr');
  assert.strictEqual(f.meta.description, 'real sr');
});

test('resolveForm: project alias shadows a global alias', () => {
  const dir = tmpClaude();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
  fs.mkdirSync(path.join(proj, '.claude', 'roles'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'roles', 'global-form.md'),
    `---\nname: global-form\naliases: [sr]\ndescription: global\n---\n`);
  fs.writeFileSync(path.join(proj, '.claude', 'roles', 'project-form.md'),
    `---\nname: project-form\naliases: [sr]\ndescription: project\n---\n`);
  const cwd = process.cwd();
  process.chdir(proj);
  try {
    const f = resolveForm('sr');
    assert.strictEqual(f.name, 'project-form');
    assert.strictEqual(f.source, 'project');
  } finally {
    process.chdir(cwd);
  }
});

test('resolveForm throws when two forms in one dir claim the same alias', () => {
  const dir = tmpClaude();
  fs.writeFileSync(path.join(dir, 'roles', 'one.md'), `---\nname: one\naliases: [x]\n---\n`);
  fs.writeFileSync(path.join(dir, 'roles', 'two.md'), `---\nname: two\naliases: [x]\n---\n`);
  assert.throws(() => resolveForm('x'), /claimed by multiple forms/);
});

test('listForms exposes each form\'s aliases', () => {
  const dir = tmpClaude();
  fs.writeFileSync(path.join(dir, 'roles', 'a.md'), `---\nname: a\naliases: [aa, ay]\ndescription: A\n---\n`);
  fs.writeFileSync(path.join(dir, 'roles', 'b.md'), `---\nname: b\ndescription: B\n---\n`);
  const forms = listForms().sort((x, y) => x.name.localeCompare(y.name));
  assert.deepStrictEqual(forms[0].aliases, ['aa', 'ay']);
  assert.deepStrictEqual(forms[1].aliases, []); // no aliases -> empty array
});
