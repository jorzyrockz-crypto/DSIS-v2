const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const htmlFile = path.join(__dirname, '..', 'ics_v_3_standalone_index.html');
const html = fs.readFileSync(htmlFile, 'utf8');

function extractScriptSrcs(markup){
  return [...markup.matchAll(/<script\s+src="\.\/([^"]+)"\s*><\/script>/g)].map((m) => m[1]);
}

const scriptSrcs = extractScriptSrcs(html);

function assertOrder(first, second){
  const firstIndex = scriptSrcs.indexOf(first);
  const secondIndex = scriptSrcs.indexOf(second);
  assert.ok(firstIndex >= 0, `Missing script: ${first}`);
  assert.ok(secondIndex >= 0, `Missing script: ${second}`);
  assert.ok(firstIndex < secondIndex, `Expected ${first} to load before ${second}`);
}

test('runtime html has no inline script tags', () => {
  const inlineScriptPattern = /<script(?![^>]*\bsrc=)[^>]*>/i;
  assert.equal(inlineScriptPattern.test(html), false);
});

test('core script load order preserves dependency boundaries', () => {
  assertOrder('core-shell-init.js', 'core-main-entry.js');
  assertOrder('core-dashboard-actions.js', 'core-shell-view-state.js');
  assertOrder('core-ui-event-wiring.js', 'core-main-entry.js');
  assertOrder('core-shell-view-state.js', 'core-main-entry.js');
});

test('core scripts are not duplicated in html', () => {
  const duplicates = scriptSrcs.filter((src, i) => scriptSrcs.indexOf(src) !== i);
  assert.deepEqual(duplicates, []);
});
