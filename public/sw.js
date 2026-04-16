const CACHE_STATIC = 'html-editor-static-v2';
const CACHE_DYNAMIC = 'html-editor-dynamic-v2';

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/404.html',
];

// ─── Install: pre-cache critical shell assets ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── Activate: clean up old caches ───
self.addEventListener('activate', (event) => {
  const valid = [CACHE_STATIC, CACHE_DYNAMIC];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !valid.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: stale-while-revalidate for app shell,
//           network-first for API, cache-first for static assets ───
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (fonts, CDN, etc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetchWithCacheFallback(event.request, CACHE_DYNAMIC));
    return;
  }

  // Cache-first for immutable build assets (hashed filenames)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }

  // Stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(event.request, CACHE_DYNAMIC));
});

// ─── Strategy: Cache First ───
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// ─── Strategy: Stale While Revalidate ───
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const networkFetch = fetch(request).then(async (response) => {
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || networkFetch;
}

// ─── Strategy: Network with Cache Fallback ───
async function fetchWithCacheFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
