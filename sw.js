// Keeps the page working with no internet: every file is saved on the phone.
// Change VERSION whenever a file changes, so phones fetch the new copy;
// also change the number shown in index.html (id="ver") to match.
var VERSION = 'fair-v15';
var FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png',
             'lib/xlsx.full.min.js', 'lib/zbar.js', 'cut128.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; })
                           .map(function (k) { return caches.delete(k); }));
  }));
});
self.addEventListener('fetch', function (e) {
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(function (hit) {
    return hit || fetch(e.request);
  }));
});
