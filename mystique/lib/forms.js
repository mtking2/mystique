'use strict';
const fs = require('fs');
const path = require('path');
const { rolesDirs } = require('./paths');

const ARRAY_KEYS = new Set(['tool_prefer', 'tool_avoid', 'triggers', 'spinner']);

// Parse a single-line inline array "[a, b, c]" -> ['a','b','c']; empty -> [].
function parseInlineArray(value) {
  const start = value.indexOf('[');
  const end = value.lastIndexOf(']');
  const inner = (start !== -1 && end > start) ? value.slice(start + 1, end).trim() : value.trim();
  if (!inner) return [];
  return inner.split(',').map(s => s.trim()).filter(Boolean);
}

// Constrained frontmatter parser: scalars + single-line inline arrays. No nesting.
function parseFrontmatter(text) {
  const meta = {};
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { meta, body: text };
  const block = match[1];
  const body = text.slice(match[0].length);
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    // strip trailing inline comment (sentinel: space-hash) for scalars AND arrays
    const hashIdx = value.indexOf(' #');
    if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    if (value.startsWith('[')) {
      meta[key] = parseInlineArray(value);
    } else {
      meta[key] = ARRAY_KEYS.has(key) ? parseInlineArray(value) : value;
    }
  }
  return { meta, body };
}

// Resolve a form by name across project-first then global roles dirs.
function resolveForm(name) {
  const dirs = rolesDirs();
  const sources = ['project', 'global'];
  for (let i = 0; i < dirs.length; i++) {
    const file = path.join(dirs[i], `${name}.md`);
    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, 'utf8');
      const { meta, body } = parseFrontmatter(text);
      return { name, meta, body, source: sources[i], path: file };
    }
  }
  return null;
}

// List all forms across both dirs; project shadows global by name.
function listForms() {
  const dirs = rolesDirs();
  const sources = ['project', 'global'];
  const seen = new Map();
  for (let i = 0; i < dirs.length; i++) {
    let entries = [];
    try { entries = fs.readdirSync(dirs[i]); } catch { continue; }
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      const name = entry.slice(0, -3);
      if (seen.has(name)) continue; // earlier dir (project) wins
      let meta = {};
      try { meta = parseFrontmatter(fs.readFileSync(path.join(dirs[i], entry), 'utf8')).meta; } catch {}
      seen.set(name, { name, description: meta.description || '', source: sources[i] });
    }
  }
  return [...seen.values()];
}

module.exports = { parseFrontmatter, resolveForm, listForms };
