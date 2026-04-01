const CACHE_NAME = 'cricket-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/cricket.js',
  '/js/firebase.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // PWA Pass-through
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Bring app to foreground if they tap the Live Score notification
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus(); // Focus existing tab
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/'); // Or open new
      }
    })
  );
});
