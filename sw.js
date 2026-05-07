// ─────────────────────────────────────────────────────
//  sw.js  –  Service Worker (PWA offline cache)
// ─────────────────────────────────────────────────────

const CACHE_NAME = 'mazymaze-v4';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/game.js',
  './js/levels.js',
  './js/physics.js',
  './js/renderer.js',
  './js/input.js',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
