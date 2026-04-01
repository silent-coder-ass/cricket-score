/* ============================
   Firebase Messaging Service Worker
   Handles background push notifications from FCM
   ============================ */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDcrIULzcnp4hqj7jL7v9VWtaC0jhIGyNo",
  authDomain: "cricket-score-2dd6e.firebaseapp.com",
  databaseURL: "https://cricket-score-2dd6e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cricket-score-2dd6e",
  storageBucket: "cricket-score-2dd6e.firebasestorage.app",
  messagingSenderId: "346158439568",
  appId: "1:346158439568:web:8df1ee903ed354c597cc15"
});

const messaging = firebase.messaging();

// Handle background FCM push (from server if ever added)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  const data = payload.data || {};
  const notificationTitle = data.title || 'Cricket - Live Score';
  const notificationOptions = {
    body: data.body || 'Score updated',
    icon: '/public/stadium-bg.png',
    badge: '/public/stadium-bg.png',
    tag: 'live-score',
    renotify: false,
    requireInteraction: true,
    data: { url: '/' }
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// When user taps the notification, open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing open tab if any
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Cache core assets for offline use
const CACHE_NAME = 'cricket-pwa-v3';
const ASSETS_TO_CACHE = ['/', '/index.html', '/css/style.css'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
