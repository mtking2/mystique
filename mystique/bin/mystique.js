#!/usr/bin/env node
'use strict';
const fs = require('fs');
const state = require('../lib/state');
const { resolveForm, listForms } = require('../lib/forms');
const { renderInjection } = require('../lib/render');
const { legacyStatePath } = require('../lib/paths');
const spinner = require('../lib/spinner');
const { syncSpinner, verbsFor } = require('../lib/spinner-sync');

// This window's session. Falls back to a stable id for manual CLI use outside Claude Code.
const SESSION_ID = process.env.CLAUDE_CODE_SESSION_ID || '_default';
const STALE_DAYS = 30;

function fail(msg) { process.stderr.write(msg + '\n'); process.exit(1); }

// S2: after this session's file is gone, hand the spinner to the surviving
// most-recently-touched session; restore the true original only when none remain.
function resyncSpinnerAfterClear() {
  const others = state.listActiveSessions();
  if (!others.length) { spinner.restoreSpinner(); return; }
  const verbs = verbsFor(others[0].state.active[0].name);
  if (verbs.length) spinner.applySpinner(verbs);
}

// Resolve a form name-or-alias to its canonical form; exits on collision or miss.
function resolveOrFail(name) {
  let f;
  try { f = resolveForm(name); } catch (e) { fail(e.message); }
  if (!f) fail(`No form "${name}". Run \`mystique list\` to see available forms.`);
  return f;
}

function cmdSwitch(name) {
  if (!name) fail('Usage: mystique switch <form>');
  const f = resolveOrFail(name);
  state.setPrimary(SESSION_ID, f.name, f.meta.label || '');
  syncSpinner(SESSION_ID);
  const via = f.name !== name ? ` (via "${name}")` : '';
  process.stdout.write(`Shifted into ${f.name}${f.meta.label ? ` (${f.meta.label})` : ''}${via}.\n`);
}

function cmdStack(name) {
  if (!name) fail('Usage: mystique stack <form>');
  const f = resolveOrFail(name);
  const already = state.readState(SESSION_ID).active.some(x => x.name === f.name);
  try {
    state.addStack(SESSION_ID, f.name, f.meta.label || '');
  } catch (e) {
    fail(e.message);
  }
  syncSpinner(SESSION_ID);
  const active = state.readState(SESSION_ID).active.map(x => x.name).join(' + ');
  const verb = already ? `${f.name} already active` : `Stacked ${f.name}`;
  process.stdout.write(`${verb}. Active: ${active}.\n`);
}

function cmdClear() {
  state.clear(SESSION_ID);
  resyncSpinnerAfterClear();
  process.stdout.write('Reverted to true self. No form active.\n');
}

function cmdList() {
  const forms = listForms();
  if (!forms.length) { process.stdout.write('No forms found in ./.claude/roles/ or ~/.claude/roles/.\n'); return; }
  const active = new Set(state.readState(SESSION_ID).active.map(f => f.name));
  for (const f of forms.sort((a, b) => a.name.localeCompare(b.name))) {
    const mark = active.has(f.name) ? '* ' : '  ';
    const aliases = f.aliases && f.aliases.length ? `  aliases: ${f.aliases.join(', ')}` : '';
    process.stdout.write(`${mark}${f.name}  [${f.source}]${aliases}  ${f.description}\n`);
  }
}

function cmdShow() {
  const s = state.readState(SESSION_ID);
  if (!s.active.length) { process.stdout.write('No form active (true self).\n'); return; }
  process.stdout.write(`Active: ${s.active.map(f => f.name).join(' + ')}\n\n--- injected each turn ---\n`);
  process.stdout.write(renderInjection(s) + '\n');
}

function main() {
  state.sweepStale(STALE_DAYS);
  fs.rmSync(legacyStatePath(), { force: true }); // one-way migration off the old global file
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case 'switch': return cmdSwitch(arg);
    case 'stack': return cmdStack(arg);
    case 'clear': return cmdClear();
    case 'list': return cmdList();
    case 'show': return cmdShow();
    default:
      fail('Usage: mystique <switch|stack|clear|list|show> [form]');
  }
}

main();
