const CACHE_NAME = 'karigarflow-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/generated/karigarflow-logo.dim_512x512.png',
  '/assets/generated/karigarflow-icon.dim_1024x1024.png',
  '/assets/generated/karigarflow-pattern.dim_1920x1080.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
