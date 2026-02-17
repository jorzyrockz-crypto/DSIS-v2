const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { extractFunctionSource } = require('./helpers/extract-function');

const file = path.join(__dirname, '..', 'core-dashboard-actions.js');
const clearSource = extractFunctionSource(file, 'clearActionCenterICSFilter');
const openPastSource = extractFunctionSource(file, 'openPastEULForItem');

test('openPastEULForItem sets deep-link target state (ics/par aware)', () => {
  const calls = [];
  const context = {
    actionCenterFilter: 'all',
    actionCenterICSFilter: '',
    actionCenterItemFilter: '',
    actionCenterSourceFilter: '',
    closeICSDetailsModal: () => calls.push('close'),
    goToView: (view) => calls.push(`go:${view}`)
  };

  vm.runInNewContext(`${openPastSource}; openPastEULForItem('2026-02-003','IT-29447','par');`, context);

  assert.equal(context.actionCenterFilter, 'past');
  assert.equal(context.actionCenterICSFilter, '2026-02-003');
  assert.equal(context.actionCenterItemFilter, 'IT-29447');
  assert.equal(context.actionCenterSourceFilter, 'par');
  assert.deepEqual(calls, ['close', 'go:Action Center']);
});

test('clearActionCenterICSFilter resets all target scopes and returns full list mode', () => {
  const calls = [];
  const context = {
    actionCenterFilter: 'past',
    actionCenterICSFilter: '2026-02-003',
    actionCenterItemFilter: 'IT-29447',
    actionCenterSourceFilter: 'par',
    goToView: (view) => calls.push(view)
  };

  vm.runInNewContext(`${clearSource}; clearActionCenterICSFilter();`, context);

  assert.equal(context.actionCenterFilter, 'all');
  assert.equal(context.actionCenterICSFilter, '');
  assert.equal(context.actionCenterItemFilter, '');
  assert.equal(context.actionCenterSourceFilter, '');
  assert.deepEqual(calls, ['Action Center']);
});
