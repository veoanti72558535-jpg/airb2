// AirBallistiK Service Worker — Offline cache strategy
const CACHE_NAME = 'airballistik-v1.0.0';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests for same-origin
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip Supabase API calls — always network
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/rest/')) return;
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Network-first for navigation, cache-first for assets
      if (event.request.mode === 'navigate') {
        return fetch(event.request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => cached || caches.match('/index.html'));
      }
      
      // Cache-first for static assets (JS/CSS/images)
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
