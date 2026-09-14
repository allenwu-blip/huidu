/**
 * Service worker: make 回读 work with no network.
 *
 * The whole app is one HTML file plus icons, so the shell is tiny and can simply be precached.
 * Strategy is network-first for the page and cache-first for icons:
 *   - the page must pick up a new build without the reader having to clear anything, and
 *   - a reader on a subway with no signal must still get their five highlights.
 * Their highlights live in IndexedDB, which the worker never touches.
 *
 * Bump VERSION on every release; the activate handler drops every other cache.
 */
// Icons keep their filenames across palette changes, so every icon change must roll the cache.
// v2: neutral palette. v3: 纸与墨, the page redesign.
const VERSION = 'huidu-v3';
const SHELL = [
  './',
  './index.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      // addAll rejects the whole install if any single file 404s; add individually so one
      // missing icon cannot leave the reader with no offline copy at all.
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never touch cross-origin

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isPage) {
    // network first, so a new build reaches the reader on their next online visit
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
    );
    return;
  }

  // everything else (icons, manifest) is immutable per release: cache first
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        }),
    ),
  );
});
