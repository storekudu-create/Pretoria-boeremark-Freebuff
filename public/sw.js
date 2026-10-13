/* Market Map demo service worker.
   Network-first for the API and app shell so map layout fixes are visible
   immediately after deployment, with cached fallback for offline use. */
const VERSION = 'bm-sw-v1';
const STATIC_CACHE = `${VERSION}-static`;
const API_CACHE = `${VERSION}-api`;
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('bm-sw-') && !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    // Network-first for data; cache fallback keeps the map usable offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            void caches.open(API_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  // Static assets & navigations: network-first so corrected SVG/data bundles replace old cached layouts.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          void caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
  );
});
