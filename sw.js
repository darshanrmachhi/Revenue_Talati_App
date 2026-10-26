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
  './js/profile.js?v=6',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // સુરક્ષિત રીતે કેશિંગ (એક ફાઈલ મિસિંગ હોય તો પણ SW ફેઈલ ન થાય)
      return Promise.allSettled(
        assetsToCache.map(url => cache.add(url))
      );
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

// Network-First with Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const requestUrl = event.request.url;
  // ફાયરબેઝ અને ડેટાબેઝ કોલ્સ કેશ ન કરવા
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
        // status 200 અથવા opaque (status 0) બંને સેવ કરો
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request, { ignoreSearch: true }).then(cached => {
          return cached || caches.match('./index.html');
        });
      })
  );
});