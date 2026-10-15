// sw.js
const CACHE_NAME = 'talati-app-v5';

const assetsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/auth.js',
  './js/ui-logic.js',
  './js/135d.js',
  './js/pedhinamu.js',
  './js/area-calc.js',
  './js/directory.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First Strategy (હંમેશા નવો સુધારેલો કોડ જ લાવશે)
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  if (
    requestUrl.includes('firestore.googleapis.com') ||
    requestUrl.includes('firebase') ||
    requestUrl.includes('identitytoolkit')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});