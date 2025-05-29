
// Basic service worker for PWA installability

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  // event.waitUntil(self.skipWaiting()); // Optional: activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  // event.waitUntil(self.clients.claim()); // Optional: take control of open pages immediately
});

self.addEventListener('fetch', (event) => {
  // For now, just pass through network requests.
  // More advanced caching strategies can be added later.
  event.respondWith(fetch(event.request));
});
