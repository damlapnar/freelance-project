/* D'era House — Service Worker */
const CACHE_NAME = 'dera-static-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/products.html',
  '/about.html',
  '/locations.html',
  '/contact.html',
  '/gallery.html',
  '/custom-order.html',
  '/styles.min.css',
  '/animations.min.css',
  '/animations.min.js',
  '/cart.js',
  '/manifest.json',
  '/favicon.ico',
  '/404.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          fetch(request).then(response => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(request).then(response => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => caches.match(request));
      })
    );
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
