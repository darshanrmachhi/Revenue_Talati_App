// sw.js
const CACHE_NAME = 'talati-app-v2';

// ઓફલાઇન માટે જરૂરી લોકલ ફાઇલો (Relative Paths)
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
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ૧. Install Service Worker & Cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Static assets cached successfully for GitHub Pages.');
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
});

// ૨. Activate & Clean Old Caches (વર્ઝન અપડેટ થાય ત્યારે જૂનો કેશ ક્લિયર કરશે)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Old cache cleared:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ૩. Fetch Handler (Firebase/External API ને બાયપાસ કરીને બાકીની ફાઈલો કેશમાંથી આપશે)
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // Firebase Firestore, Auth કે Google APIs ને સર્વિસ વર્કર અટકાવશે નહીં
  if (
    requestUrl.includes('firestore.googleapis.com') ||
    requestUrl.includes('firebase') ||
    requestUrl.includes('identitytoolkit')
  ) {
    return;
  }

  // કેશમાં ફાઇલ હોય તો ત્યાંથી આપો, નહિતર નેટવર્ક પરથી લાવો
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});