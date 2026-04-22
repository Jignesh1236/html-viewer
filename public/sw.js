const CACHE_VERSION = 'html-editor-v6';
const STATIC_ASSETS = ['/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png'];
const PREVIEW_PREFIX = '/__preview/';

// Virtual filesystem for the localhost-style preview engine.
// Map<sessionId, Map<relPath, { mime, body, isBinary }>>
const previewSessions = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Messaging from main thread (preview engine) ──
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const { type } = data;

  if (type === 'preview:set') {
    const { sessionId, files } = data;
    const map = new Map();
    for (const f of files) {
      map.set(f.path, { mime: f.mime, body: f.body, isBinary: !!f.isBinary });
    }
    previewSessions.set(sessionId, map);
    if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
  } else if (type === 'preview:update') {
    const { sessionId, file } = data;
    const map = previewSessions.get(sessionId);
    if (map) map.set(file.path, { mime: file.mime, body: file.body, isBinary: !!file.isBinary });
    if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: !!map });
  } else if (type === 'preview:clear') {
    previewSessions.delete(data.sessionId);
    if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
  } else if (type === 'preview:list') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ sessions: [...previewSessions.keys()] });
    }
  } else if (type === 'ping') {
    if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
  } else if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // ── Preview engine: serve from virtual FS ──
  if (url.pathname.startsWith(PREVIEW_PREFIX)) {
    event.respondWith(servePreview(url));
    return;
  }

  // ── Existing app shell: network-first ──
  event.respondWith(networkFirst(event.request));
});

function decodeBase64ToUint8(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function servePreview(url) {
  // /__preview/<sessionId>/<relPath...>
  const rest = url.pathname.slice(PREVIEW_PREFIX.length);
  const slash = rest.indexOf('/');
  const sessionId = slash === -1 ? rest : rest.slice(0, slash);
  let path = slash === -1 ? '' : rest.slice(slash + 1);

  const session = previewSessions.get(sessionId);
  if (!session) {
    return new Response(notFoundHtml(`Preview session "${sessionId}" not found`), {
      status: 404, headers: corsHeaders('text/html; charset=utf-8'),
    });
  }

  if (path === '' || path.endsWith('/')) path += 'index.html';
  // Try direct match, then strip leading slashes, then fall back to index.html in the directory.
  let entry = session.get(path) || session.get(path.replace(/^\/+/, ''));
  if (!entry && !path.includes('.')) {
    entry = session.get(path + '/index.html') || session.get(path + '.html');
  }

  if (!entry) {
    return new Response(notFoundHtml(`Cannot find <code>/${path}</code> in your project.`), {
      status: 404, headers: corsHeaders('text/html; charset=utf-8'),
    });
  }

  const headers = corsHeaders(entry.mime || 'application/octet-stream');

  if (entry.isBinary) {
    return new Response(decodeBase64ToUint8(entry.body), { status: 200, headers });
  }
  return new Response(entry.body, { status: 200, headers });
}

// Build response headers with CORP/COEP set so iframes can load these
// responses even when the parent page sends Cross-Origin-Embedder-Policy: require-corp.
function corsHeaders(contentType) {
  return new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
}

function notFoundHtml(msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>404 — Not Found</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1e1e1e;color:#ccc;padding:60px;margin:0}h1{color:#e34c26;font-size:48px;margin:0 0 12px}p{color:#888;font-size:14px;line-height:1.6}code{background:#2d2d2d;padding:2px 6px;border-radius:3px;color:#dcdcaa;font-family:Menlo,Consolas,monospace}small{color:#555;font-size:11px;display:block;margin-top:32px}</style>
</head><body><h1>404</h1><p>${msg}</p><small>HTML Editor Pro · localhost preview engine</small></body></html>`;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
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
