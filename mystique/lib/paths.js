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

function sessionsDir() {
  return path.join(claudeDir(), 'mystique', 'sessions');
}

function sessionStatePath(sessionId) {
  return path.join(sessionsDir(), `${sessionId}.json`);
}

// The pre-per-session global state file. Retained only so startup can delete it.
function legacyStatePath() {
  return path.join(claudeDir(), 'mystique', 'active.json');
}

function settingsPath() {
  return path.join(claudeDir(), 'settings.json');
}

function spinnerBackupPath() {
  return path.join(claudeDir(), 'mystique', 'spinner-backup.json');
}

module.exports = {
  claudeDir, rolesDirs, sessionsDir, sessionStatePath, legacyStatePath,
  settingsPath, spinnerBackupPath,
};
