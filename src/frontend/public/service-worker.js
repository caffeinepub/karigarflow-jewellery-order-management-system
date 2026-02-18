const CACHE_NAME = 'karigarflow-v54';
const urlsToCache = [
  '/assets/generated/karigarflow-logo.dim_512x512.png',
  '/assets/generated/karigarflow-icon.dim_1024x1024.png',
  '/assets/generated/karigarflow-pattern.dim_1920x1080.png',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v54');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For navigation requests (HTML pages), prefer network with cache fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response for offline use
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline - please check your connection', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        })
    );
    return;
  }

  // For JS/CSS/static assets, prefer fresh network with cache fallback
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // For other requests (API calls), network only
  event.respondWith(fetch(request));
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v54');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  return self.clients.claim();
});
