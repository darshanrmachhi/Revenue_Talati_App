// sw.js
const CACHE_NAME = 'talati-app-v6';

const assetsToCache = [
  './',
  './index.html',
  './css/styles.css?v=6',
  './js/config.js?v=6',
  './js/auth.js?v=6',
  './js/ui-logic.js?v=6',
  './js/135d.js?v=6',
  './js/pedhinamu.js?v=6',
  './js/area-calc.js?v=6',
  './js/directory.js?v=6',
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
  // માત્ર GET રિક્વેસ્ટ અને http/https ને જ કેશ કરવા (POST કે chrome-extension ને નહીં)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

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
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});