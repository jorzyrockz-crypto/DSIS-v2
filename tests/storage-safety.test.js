const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '..', 'core-storage-security.js'), 'utf8');

function bootStorageContext(seed = {}){
  const store = { ...seed };
  const context = {
    localStorage: {
      getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
      setItem: (key, value) => {
        store[key] = String(value);
      }
    },
    currentUser: { role: 'Admin' },
    sessionState: {},
    schoolIdentity: {},
    notify: () => {},
    showModal: () => {},
    isSchoolIdentityConfigured: () => true,
    requireSchoolIdentityConfigured: () => true,
    requireActiveSession: () => true
  };
  vm.runInNewContext(source, context);
  return { context, store };
}

test('safeParseJSON returns fallback for corrupt JSON', () => {
  const { context } = bootStorageContext();
  assert.deepEqual(context.safeParseJSON('{bad json', []), []);
});

test('loadLocalJSON returns fallback for missing and corrupt keys', () => {
  const { context } = bootStorageContext({ corrupt: '{bad json' });
  assert.deepEqual(context.loadLocalJSON('missing', []), []);
  assert.deepEqual(context.loadLocalJSON('corrupt', { ok: false }), { ok: false });
});

test('saveLocalJSON writes JSON payloads for later safe reads', () => {
  const { context, store } = bootStorageContext();
  context.saveLocalJSON('records', [{ id: 1 }]);
  assert.equal(store.records, '[{"id":1}]');
  assert.deepEqual(context.loadLocalJSON('records', []), [{ id: 1 }]);
});
