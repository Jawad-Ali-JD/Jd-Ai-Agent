const CACHE_NAME = 'jd-ai-agent-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything: always try to get the latest live version first,
// only fall back to the cached copy if the network request fails (e.g. offline).
// This means future deploys show up immediately without needing to bump CACHE_NAME.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isApiCall = url.includes('supabase.co') || url.includes('generativelanguage.googleapis.com') || url.includes('/api/');

  if (isApiCall) {
    return; // let these hit the network normally, never cache auth/chat calls
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
