const CACHE_VERSION = 'html-editor-v3';
const STATIC_ASSETS = ['/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png'];

// ─── Install: pre-cache only icons/manifest (not hashed JS/CSS) ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: wipe ALL old caches so stale JS chunks never get served ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Network-first for everything so fresh JS is always loaded ───
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin (CDN, fonts, APIs)
  if (url.origin !== self.location.origin) return;

  // Network-first for all requests — prevents stale hashed chunk issues
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Only cache successful, same-origin, non-opaque responses
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
