const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const mainEntryFile = path.join(__dirname, '..', 'core-main-entry.js');
const shellInitFile = path.join(__dirname, '..', 'core-shell-init.js');

const mainSource = fs.readFileSync(mainEntryFile, 'utf8');
const shellSource = fs.readFileSync(shellInitFile, 'utf8');

test('shell chrome init is centralized in core-shell-init', () => {
  assert.match(mainSource, /initializeShellChrome\(/);
  assert.doesNotMatch(mainSource, /function\s+syncTopbarViewButtons\s*\(/);
  assert.doesNotMatch(mainSource, /function\s+syncDeveloperToolsAccess\s*\(/);
  assert.doesNotMatch(mainSource, /function\s+toggleSidebarCollapsed\s*\(/);
});

test('core-shell-init owns navigation and shell sync hooks', () => {
  assert.match(shellSource, /function\s+syncTopbarViewButtons\s*\(/);
  assert.match(shellSource, /function\s+syncDeveloperToolsAccess\s*\(/);
  assert.match(shellSource, /function\s+toggleSidebarCollapsed\s*\(/);
  assert.match(shellSource, /function\s+initializeShellChrome\s*\(/);
});
