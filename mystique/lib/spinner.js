'use strict';
const fs = require('fs');
const path = require('path');
const { settingsPath, spinnerBackupPath } = require('./paths');

// {ok:true, data} | {ok:false, reason:'missing'|'corrupt'}
function readJsonSafe(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch { return { ok: false, reason: 'missing' }; }
  try { return { ok: true, data: JSON.parse(raw) }; }
  catch { return { ok: false, reason: 'corrupt' }; }
}
function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

// Save the prior spinnerVerbs exactly once, before the first mutation.
function snapshotOnce(settings) {
  const backup = spinnerBackupPath();
  if (fs.existsSync(backup)) return;
  if ('spinnerVerbs' in settings) {
    writeJson(backup, { present: true, value: settings.spinnerVerbs });
  } else {
    writeJson(backup, { present: false });
  }
}

function applySpinner(verbs) {
  if (!verbs || !verbs.length) return; // form has no spinner — leave settings alone
  const file = settingsPath();
  const r = readJsonSafe(file);
  if (r.reason === 'corrupt') {
    process.stderr.write('mystique: settings.json is not valid JSON — skipping spinner update.\n');
    return; // never clobber a present-but-unparseable settings.json
  }
  const settings = r.ok ? r.data : {};
  snapshotOnce(settings);
  // Claude Code's settings schema requires spinnerVerbs to be an object
  // { verbs: string[], mode?: "append"|"replace" } — NOT a bare array.
  // 'replace' makes the form's verbs the whole spinner (role identity).
  settings.spinnerVerbs = { verbs, mode: 'replace' };
  writeJson(file, settings);
}

function restoreSpinner() {
  const b = readJsonSafe(spinnerBackupPath());
  if (!b.ok) return; // missing or corrupt backup → no-op
  const file = settingsPath();
  const r = readJsonSafe(file);
  if (r.reason === 'corrupt') {
    process.stderr.write('mystique: settings.json is not valid JSON — skipping spinner restore.\n');
    return; // leave the backup in place so a later restore can succeed
  }
  const settings = r.ok ? r.data : {};
  const snap = b.data;
  if (snap.present) {
    settings.spinnerVerbs = snap.value;
  } else {
    delete settings.spinnerVerbs;
  }
  writeJson(file, settings);
  fs.rmSync(spinnerBackupPath(), { force: true });
}

module.exports = { applySpinner, restoreSpinner };
