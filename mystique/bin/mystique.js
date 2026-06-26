#!/usr/bin/env node
'use strict';
const state = require('../lib/state');
const { resolveForm, listForms } = require('../lib/forms');
const { renderInjection } = require('../lib/render');
const spinner = require('../lib/spinner');

function fail(msg) { process.stderr.write(msg + '\n'); process.exit(1); }

// Apply the spinner verbs of the current primary form (if any).
function syncSpinner() {
  const s = state.readState();
  if (!s.active.length) { spinner.restoreSpinner(); return; }
  const primary = resolveForm(s.active[0].name);
  const verbs = (primary && primary.meta.spinner) || [];
  if (verbs.length) spinner.applySpinner(verbs);
}

function cmdSwitch(name) {
  if (!name) fail('Usage: mystique switch <form>');
  const f = resolveForm(name);
  if (!f) fail(`No form "${name}". Run \`mystique list\` to see available forms.`);
  state.setPrimary(name, f.meta.label || '');
  syncSpinner();
  process.stdout.write(`Shifted into ${name}${f.meta.label ? ` (${f.meta.label})` : ''}.\n`);
}

function cmdStack(name) {
  if (!name) fail('Usage: mystique stack <form>');
  const f = resolveForm(name);
  if (!f) fail(`No form "${name}". Run \`mystique list\` to see available forms.`);
  const already = state.readState().active.some(x => x.name === name);
  try {
    state.addStack(name, f.meta.label || '');
  } catch (e) {
    fail(e.message);
  }
  syncSpinner();
  const active = state.readState().active.map(x => x.name).join(' + ');
  const verb = already ? `${name} already active` : `Stacked ${name}`;
  process.stdout.write(`${verb}. Active: ${active}.\n`);
}

function cmdClear() {
  state.clear();
  spinner.restoreSpinner();
  process.stdout.write('Reverted to true self. No form active.\n');
}

function cmdList() {
  const forms = listForms();
  if (!forms.length) { process.stdout.write('No forms found in ./.claude/roles/ or ~/.claude/roles/.\n'); return; }
  const active = new Set(state.readState().active.map(f => f.name));
  for (const f of forms.sort((a, b) => a.name.localeCompare(b.name))) {
    const mark = active.has(f.name) ? '* ' : '  ';
    process.stdout.write(`${mark}${f.name}  [${f.source}]  ${f.description}\n`);
  }
}

function cmdShow() {
  const s = state.readState();
  if (!s.active.length) { process.stdout.write('No form active (true self).\n'); return; }
  process.stdout.write(`Active: ${s.active.map(f => f.name).join(' + ')}\n\n--- injected each turn ---\n`);
  process.stdout.write(renderInjection(s) + '\n');
}

function main() {
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
