
// Service Worker

// Name of our cache
const CACHE_NAME = 'all-games-cache-v1';

// Assets to cache on installation
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico', // Assuming you have one
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Add other critical static assets here if needed (e.g., main CSS, JS bundles if you know their names)
  // Be careful not to cache too much or API calls.
];

// Install event: Cache critical assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker.
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Become the service worker for clients that are already open.
  );
});

// Fetch event: Serve cached assets if available (Cache-first strategy for app shell)
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests for our app shell
  if (event.request.method === 'GET' && urlsToCache.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // console.log('[Service Worker] Serving from cache:', event.request.url);
            return response;
          }
          // console.log('[Service Worker] Fetching from network:', event.request.url);
          return fetch(event.request); // Fallback to network
        })
    );
  }
  // For other requests, just fetch from the network (e.g., API calls to Firebase)
});


// Push event: Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  
  let pushData = {
    title: 'All Games',
    body: 'You have a new message!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png', // Icon for the badge (monochrome often preferred)
    tag: 'new-message-notification',
    data: {
      url: '/chat' // URL to open on notification click
    }
  };

  try {
    if (event.data) {
      const parsedData = event.data.json();
      pushData = { ...pushData, ...parsedData }; // Merge with default
      console.log('[Service Worker] Push data:', parsedData);
    }
  } catch (e) {
    console.error('[Service Worker] Error parsing push data:', e);
    // Use default data if parsing fails
  }

  const notificationOptions = {
    body: pushData.body,
    icon: pushData.icon,
    badge: pushData.badge, // For Android notification drawer
    tag: pushData.tag, // So subsequent notifications can replace this one
    data: pushData.data, // Custom data for click handling
    actions: [ // Optional actions
        { action: 'open_chat', title: 'Open Chat' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(pushData.title, notificationOptions)
  );

  // App Icon Badging
  if (navigator.setAppBadge) {
    const badgeCount = pushData.badgeCount || 1; // Expect badgeCount in pushData or default to 1
    navigator.setAppBadge(badgeCount)
      .then(() => console.log('[Service Worker] App badge set to', badgeCount))
      .catch(e => console.error('[Service Worker] Error setting app badge:', e));
  } else {
    console.log('[Service Worker] Badging API not supported.');
  }
});

// Notification click event: Handle what happens when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.', event.notification);
  event.notification.close(); // Close the notification

  const urlToOpen = event.notification.data && event.notification.data.url 
                    ? event.notification.data.url 
                    : '/'; // Default URL

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );

  // Clear app icon badge on notification click if supported
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge()
      .then(() => console.log('[Service Worker] App badge cleared.'))
      .catch(e => console.error('[Service Worker] Error clearing app badge:', e));
  }
});
