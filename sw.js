const CACHE_NAME = 'html-editor-v2';
const VIRTUAL_PATH_PREFIX = '/__vfs__/';

let virtualFS = new Map();

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_VFS') {
    virtualFS = new Map(Object.entries(event.data.files));
  }
});

const INJECTED_SCRIPTS = `
<script>
  (function() {
    // 1. Intercept link clicks for navigation
    document.addEventListener('click', e => {
      const a = e.target.closest('a');
      if(a && a.href) {
        const url = new URL(a.href, window.location.href);
        if(url.origin === window.location.origin && url.pathname.startsWith('${VIRTUAL_PATH_PREFIX}')) {
          // It's a virtual path. We'll let it happen, but also notify parent
          const path = url.pathname.slice('${VIRTUAL_PATH_PREFIX}'.length);
          window.parent.postMessage({ type: 'navigate', path: path }, '*');
        }
      }
    }, true);

    // 2. Intercept form submissions
    document.addEventListener('submit', e => {
      const action = e.target.getAttribute('action');
      if(action && !action.startsWith('http')) {
        window.parent.postMessage({ type: 'navigate', path: action }, '*');
      }
    }, true);

    // 3. Console Proxy
    const sendToParent = (type, args) => {
      window.parent.postMessage({
        type: 'console',
        logType: type,
        args: args.map(arg => {
          try { return typeof arg === 'object' ? JSON.parse(JSON.stringify(arg)) : arg; }
          catch(e) { return String(arg); }
        })
      }, '*');
    };
    const originalLog = console.log;
    console.log = (...args) => { originalLog.apply(console, args); sendToParent('info', args); };
    const originalError = console.error;
    console.error = (...args) => { originalError.apply(console, args); sendToParent('error', args); };
    const originalWarn = console.warn;
    console.warn = (...args) => { originalWarn.apply(console, args); sendToParent('warn', args); };
    window.onerror = (msg, url, line, col, error) => {
      sendToParent('error', [msg + ' (line ' + line + ')']);
      return false;
    };
  })();
</script>
`;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith(VIRTUAL_PATH_PREFIX)) {
    const path = url.pathname.slice(VIRTUAL_PATH_PREFIX.length);
    const filePath = path.endsWith('/') ? path + 'index.html' : path;
    
    if (virtualFS.has(filePath)) {
      let content = virtualFS.get(filePath);
      const ext = filePath.split('.').pop().toLowerCase();
      
      const mimeTypes = {
        'html': 'text/html', 'htm': 'text/html',
        'css': 'text/css', 'js': 'application/javascript',
        'json': 'application/json', 'png': 'image/png',
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'gif': 'image/gif', 'svg': 'image/svg+xml'
      };
      
      const contentType = mimeTypes[ext] || 'text/plain';
      
      if (contentType === 'text/html') {
        if (content.includes('</head>')) {
          content = content.replace('</head>', INJECTED_SCRIPTS + '</head>');
        } else {
          content = INJECTED_SCRIPTS + content;
        }
      }
      
      event.respondWith(new Response(content, {
        headers: { 'Content-Type': contentType }
      }));
      return;
    }
    
    event.respondWith(new Response('404 Not Found in VFS: ' + filePath, { status: 404 }));
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
