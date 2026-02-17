const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const swFile = path.join(__dirname, '..', 'sw.js');
const swSource = fs.readFileSync(swFile, 'utf8');
const cacheVersionMatch = swSource.match(/const CACHE_VERSION = '([^']+)'/);
if (!cacheVersionMatch){
  throw new Error('Could not parse CACHE_VERSION from sw.js');
}
const currentCacheVersion = cacheVersionMatch[1];

function bootServiceWorkerMocks(){
  const listeners = {};
  const calls = {
    skipWaiting: 0,
    claim: 0,
    open: 0,
    addAll: 0,
    cacheDeletes: []
  };

  const self = {
    location: { origin: 'https://example.test' },
    clients: {
      claim: async () => {
        calls.claim += 1;
      }
    },
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    skipWaiting: () => {
      calls.skipWaiting += 1;
    }
  };

  const caches = {
    open: async () => {
      calls.open += 1;
      return {
        addAll: async () => {
          calls.addAll += 1;
        },
        put: () => {}
      };
    },
    keys: async () => ['legacy-cache', currentCacheVersion],
    delete: async (key) => {
      calls.cacheDeletes.push(key);
      return true;
    },
    match: async () => null
  };

  const context = {
    self,
    caches,
    fetch: async () => {
      throw new Error('offline');
    },
    URL
  };

  vm.runInNewContext(swSource, context);
  return { listeners, calls };
}

test('install pre-caches assets but does not force skipWaiting', async () => {
  const { listeners, calls } = bootServiceWorkerMocks();
  assert.equal(typeof listeners.install, 'function');

  let installPromise = null;
  listeners.install({
    waitUntil: (p) => {
      installPromise = p;
    }
  });
  await installPromise;

  assert.equal(calls.open, 1);
  assert.equal(calls.addAll, 1);
  assert.equal(calls.skipWaiting, 0);
});

test('message SKIP_WAITING triggers worker activation request', () => {
  const { listeners, calls } = bootServiceWorkerMocks();
  assert.equal(typeof listeners.message, 'function');

  listeners.message({ data: { type: 'SKIP_WAITING' } });
  listeners.message({ data: { type: 'UNKNOWN' } });

  assert.equal(calls.skipWaiting, 1);
});

test('activate clears stale caches and claims clients', async () => {
  const { listeners, calls } = bootServiceWorkerMocks();
  assert.equal(typeof listeners.activate, 'function');

  let activatePromise = null;
  listeners.activate({
    waitUntil: (p) => {
      activatePromise = p;
    }
  });
  await activatePromise;

  assert.deepEqual(calls.cacheDeletes, ['legacy-cache']);
  assert.equal(calls.claim, 1);
});
