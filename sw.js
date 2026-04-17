const CACHE_NAME = 'html-editor-v2';
const VIRTUAL_MARKER = '__vfs__';

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
        if(url.origin === window.location.origin && url.pathname.includes('${VIRTUAL_MARKER}')) {
          const path = url.pathname.split('${VIRTUAL_MARKER}').pop().replace(/^\\//, '');
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
    if (typeof originalError === 'function') {
       console.error = (...args) => { originalError.apply(console, args); sendToParent('error', args); };
    }
    const originalWarn = console.warn;
    if (typeof originalWarn === 'function') {
       console.warn = (...args) => { originalWarn.apply(console, args); sendToParent('warn', args); };
    }
    window.onerror = (msg, url, line, col, error) => {
      sendToParent('error', [msg + ' (line ' + line + ')']);
      return false;
    };
  })();
</script>
`;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Heartbeat check
  if (url.pathname.endsWith('/__vfs_ping__')) {
    event.respondWith(new Response('pong', { headers: { 'Content-Type': 'text/plain' } }));
    return;
  }

  if (url.pathname.includes(VIRTUAL_MARKER)) {
    // Split by marker and take the last part
    const parts = url.pathname.split(VIRTUAL_MARKER);
    const filePath = parts.pop().replace(/^\//, ''); // Remove leading slash if any
    const cleanPath = filePath.endsWith('/') ? filePath + 'index.html' : filePath;
    
    if (virtualFS.has(cleanPath)) {
      let content = virtualFS.get(cleanPath);
      const ext = cleanPath.split('.').pop().toLowerCase();
      
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
        headers: { 
          'Content-Type': contentType,
          'X-VFS-Handled': 'true'
        }
      }));
      return;
    }
    
    // Fallback for not found files in VFS
    event.respondWith(new Response('404 Not Found in VFS: ' + cleanPath, { status: 404 }));
    return;
  }

  // Allow standard requests
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
