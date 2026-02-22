const CACHE_VERSION = 'dsis-v1-pwa-v44';
const APP_SHELL = './ics_v_3_standalone_index.html';
const PRECACHE = [
  './',
  './index.html',
  './ics_v_3_standalone_index.html',
  './styles/main.css',
  './feedback/feedback.json',
  './lucide.min.js',
  './core-storage-security.js',
  './core-shared-utils.js',
  './core-school-profile-normalization.js',
  './core-lineage-audit.js',
  './core-record-normalization.js',
  './core-records-search-details.js',
  './core-inventory-table-render.js',
  './core-printing.js',
  './core-import-autosuggest.js',
  './core-form-staging.js',
  './core-shell-view-state.js',
  './core-data-manager.js',
  './core-records-workflow.js',
  './core-actions-workflow.js',
  './core-profile-session.js',
  './core-theme-preferences.js',
  './core-school-setup-ui.js',
  './core-profile-modal.js',
  './core-app-bootstrap.js',
  './core-keyboard-routing.js',
  './core-notifications.js',
  './core-delegated-action-routing.js',
  './core-modal-scroll-shadows.js',
  './core-ui-event-wiring.js',
  './core-modal-system.js',
  './core-shell-init.js',
  './core-dashboard-view.js',
  './core-dashboard-render.js',
  './core-inventory-view-render.js',
  './core-actions-view-render.js',
  './core-archives-view-render.js',
  './core-dashboard-actions.js',
  './core-dashboard-recent-activity.js',
  './core-dashboard-metrics.js',
  './core-main-entry.js',
  './core-icon-init.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/feedback/feedback.json') || url.pathname === '/feedback/feedback.json'){
    event.respondWith((async () => {
      try {
        const network = await fetch(request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, network.clone());
        return network;
      } catch {
        const cached = await caches.match(request);
        return cached || new Response('{"generated_at":null,"source":"google_form_csv","csv_url":"","count":0,"items":[]}', {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await fetch(request);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, network.clone());
        return network;
      } catch {
        const cached = await caches.match(request);
        return cached || caches.match(APP_SHELL);
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const network = await fetch(request);
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, network.clone());
      return network;
    } catch {
      return caches.match(APP_SHELL);
    }
  })());
});





















