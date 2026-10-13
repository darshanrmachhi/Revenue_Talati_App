const CACHE_NAME = 'talati-app-v1';
const assetsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/ui-logic.js',
  '/js/135d.js',
  '/js/pedhinamu.js',
  '/js/area-calc.js',
  '/js/directory.js'
];

// 1. Install Service Worker & Cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(assetsToCache);
    })
  );
});

// 2. Fetch Cached Files when Offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});const CACHE_NAME = 'talati-app-v1';
const assetsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/ui-logic.js',
  '/js/135d.js',
  '/js/pedhinamu.js',
  '/js/area-calc.js',
  '/js/directory.js'
];

// 1. Install Service Worker & Cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(assetsToCache);
    })
  );
});

// 2. Fetch Cached Files when Offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});