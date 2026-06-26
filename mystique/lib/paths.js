'use strict';
const os = require('os');
const path = require('path');

// Resolved fresh each call so tests can override via env.
function claudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// Project-local roles win over global. Project dir is relative to cwd.
function rolesDirs() {
  return [
    path.join(process.cwd(), '.claude', 'roles'),
    path.join(claudeDir(), 'roles'),
  ];
}

function statePath() {
  return path.join(claudeDir(), 'mystique', 'active.json');
}

function settingsPath() {
  return path.join(claudeDir(), 'settings.json');
}

function spinnerBackupPath() {
  return path.join(claudeDir(), 'mystique', 'spinner-backup.json');
}

module.exports = { claudeDir, rolesDirs, statePath, settingsPath, spinnerBackupPath };
