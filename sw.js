// sw.js
const CACHE_NAME = 'talati-app-v7';

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
  './js/profile.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled so one missing file won't abort the entire install
      return Promise.allSettled(
        assetsToCache.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Pre-cache failed for ${url}:`, err);
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first with fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = event.request.url;

  // Never cache Firebase / Google auth / Firestore traffic
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('identitytoolkit')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid responses including opaque CDN assets
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Ignore query string mismatch when offline
        return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          return cached || caches.match('./index.html', { ignoreSearch: true });
        });
      })
  );
});