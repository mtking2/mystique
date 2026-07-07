'use strict';
const fs = require('fs');
const path = require('path');
const { rolesDirs } = require('./paths');

const ARRAY_KEYS = new Set(['tool_prefer', 'tool_avoid', 'triggers', 'spinner', 'aliases']);

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

// Read and parse every .md form in a dir. Returns [{stem, meta, body, path}];
// a missing/unreadable dir yields []. Unparseable files degrade to empty meta.
function readFormsDir(dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir); } catch { return []; }
  const out = [];
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const file = path.join(dir, entry);
    let parsed = { meta: {}, body: '' };
    try { parsed = parseFrontmatter(fs.readFileSync(file, 'utf8')); } catch {}
    out.push({ stem: entry.slice(0, -3), meta: parsed.meta, body: parsed.body, path: file });
  }
  return out;
}

// Resolve a form by name across project-first then global roles dirs.
// Exact filename always wins; on a miss, fall back to matching a form's
// frontmatter `aliases`. The returned `name` is always the canonical filename
// stem (never the alias) so callers persist a name that re-resolves each turn.
function resolveForm(name) {
  const dirs = rolesDirs();
  const sources = ['project', 'global'];
  // 1. Exact filename match — wins over any alias.
  for (let i = 0; i < dirs.length; i++) {
    const file = path.join(dirs[i], `${name}.md`);
    if (fs.existsSync(file)) {
      const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
      return { name, meta, body, source: sources[i], path: file };
    }
  }
  // 2. Alias fallback, project-first. A duplicate alias within one dir is an error.
  for (let i = 0; i < dirs.length; i++) {
    const matches = readFormsDir(dirs[i])
      .filter(f => Array.isArray(f.meta.aliases) && f.meta.aliases.includes(name));
    if (matches.length > 1) {
      throw new Error(`Alias "${name}" is claimed by multiple forms in ${dirs[i]}: ${matches.map(m => m.stem).join(', ')}. Rename an alias to disambiguate.`);
    }
    if (matches.length === 1) {
      const m = matches[0];
      return { name: m.stem, meta: m.meta, body: m.body, source: sources[i], path: m.path };
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
    for (const f of readFormsDir(dirs[i])) {
      if (seen.has(f.stem)) continue; // earlier dir (project) wins
      seen.set(f.stem, {
        name: f.stem,
        description: f.meta.description || '',
        aliases: Array.isArray(f.meta.aliases) ? f.meta.aliases : [],
        source: sources[i],
      });
    }
  }
  return [...seen.values()];
}

module.exports = { parseFrontmatter, resolveForm, listForms };
