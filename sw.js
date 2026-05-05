const CACHE='maze3d-v2';
const ASSETS=[
  './','./index.html','./style.css','./app.js','./manifest.json',
  './icon-192.png','./icon-512.png',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});