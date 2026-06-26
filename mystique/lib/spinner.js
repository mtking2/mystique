'use strict';
const fs = require('fs');
const path = require('path');
const { settingsPath, spinnerBackupPath } = require('./paths');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
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
  const settings = readJson(file, {});
  snapshotOnce(settings);
  settings.spinnerVerbs = verbs;
  writeJson(file, settings);
}

function restoreSpinner() {
  const backup = spinnerBackupPath();
  if (!fs.existsSync(backup)) return; // never mutated
  const snap = readJson(backup, { present: false });
  const file = settingsPath();
  const settings = readJson(file, {});
  if (snap.present) {
    settings.spinnerVerbs = snap.value;
  } else {
    delete settings.spinnerVerbs;
  }
  writeJson(file, settings);
  fs.rmSync(backup, { force: true });
}

module.exports = { applySpinner, restoreSpinner };
