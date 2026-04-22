import type { FileItem } from '../store/editorStore';

const SESSION_KEY = 'html-editor-preview-session-id';
const PREVIEW_BASE = '/__preview';

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
};

function mimeFor(name: string, fallback?: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return MIME[ext] || fallback || 'application/octet-stream';
}

function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 's' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
function getReg(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;
  registrationPromise = (async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      // Wait until the SW actually controls this page — otherwise fetches from
      // iframes with /__preview/* URLs won't be intercepted on first load.
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, 1500);
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            clearTimeout(t); resolve();
          }, { once: true });
        });
      }
      return reg;
    } catch {
      return null;
    }
  })();
  return registrationPromise;
}

async function postToSW(message: any): Promise<{ ok: boolean }> {
  const reg = await getReg();
  const sw = reg?.active || navigator.serviceWorker?.controller;
  if (!sw) return { ok: false };
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const t = setTimeout(() => resolve({ ok: false }), 1500);
    channel.port1.onmessage = ev => { clearTimeout(t); resolve({ ok: !!ev.data?.ok }); };
    try { sw.postMessage(message, [channel.port2]); }
    catch { clearTimeout(t); resolve({ ok: false }); }
  });
}

/* ── Project root resolution ──
   The root is the folder of the entry HTML file (index.html, else first .html).
   All other files keep their path relative to that root. */
export function resolveProjectRoot(files: FileItem[]): string {
  const entry =
    files.find(f => f.type === 'html' && f.name.toLowerCase() === 'index.html') ||
    files.find(f => f.type === 'html');
  return entry?.folder || '';
}

function relPath(file: FileItem, root: string): string {
  const full = file.folder ? `${file.folder}/${file.name}` : file.name;
  if (root && full === root) return file.name;
  if (root && full.startsWith(root + '/')) return full.slice(root.length + 1);
  return full;
}

/* ── Bridge script (inject into HTML for console + nav events) ── */
const BRIDGE_SCRIPT = `<script>
(function(){
  if (window.__htmlEditorBridge) return; window.__htmlEditorBridge = true;
  var types=['log','error','warn','info','debug'];
  types.forEach(function(t){
    var orig=console[t].bind(console);
    console[t]=function(){
      orig.apply(console, arguments);
      try {
        var msg=Array.from(arguments).map(function(a){
          if(a===null) return 'null'; if(a===undefined) return 'undefined';
          try { return typeof a==='object'?JSON.stringify(a,null,2):String(a);} catch(e){ return String(a);}
        }).join(' ');
        window.parent.postMessage({__htmlEditor:true,type:'console',level:t,message:msg},'*');
      } catch(e){}
    };
  });
  window.addEventListener('error',function(e){
    window.parent.postMessage({__htmlEditor:true,type:'console',level:'error',message:'Uncaught '+e.message+'\\n  at '+e.filename+':'+e.lineno+':'+e.colno},'*');
  });
  window.addEventListener('unhandledrejection',function(e){
    window.parent.postMessage({__htmlEditor:true,type:'console',level:'error',message:'UnhandledPromiseRejection: '+e.reason},'*');
  });
  function sendMeta(){
    var title=document.title||'Untitled', favicon='';
    var links=document.querySelectorAll('link[rel*="icon"]');
    if(links.length>0) favicon=links[links.length-1].href||'';
    window.parent.postMessage({__htmlEditor:true,type:'meta',title:title,favicon:favicon},'*');
  }
  document.addEventListener('DOMContentLoaded', sendMeta);
  var titleEl=document.querySelector('title');
  if(titleEl){ new MutationObserver(sendMeta).observe(titleEl,{childList:true,characterData:true,subtree:true}); }
  function sendNav(){ window.parent.postMessage({__htmlEditor:true,type:'navigate',url:location.href},'*'); }
  var _ps=history.pushState.bind(history), _rs=history.replaceState.bind(history);
  history.pushState=function(){ _ps.apply(history,arguments); sendNav(); };
  history.replaceState=function(){ _rs.apply(history,arguments); sendNav(); };
  window.addEventListener('popstate', sendNav);
})();
<\/script>`;

function injectBridge(html: string): string {
  if (html.includes('__htmlEditorBridge')) return html;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + BRIDGE_SCRIPT);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, m => m + BRIDGE_SCRIPT);
  return BRIDGE_SCRIPT + html;
}

/* ── Public API ── */
export interface PreviewServerStatus {
  ready: boolean;
  sessionId: string;
  baseUrl: string; // e.g. /__preview/<sid>/
}

let lastSyncedSig = '';

function fileSig(files: FileItem[], extraStyle: string): string {
  return files.map(f => `${f.folder || ''}|${f.name}|${(f.content || f.url || '').length}|${(f.content || '').slice(0, 16)}`).join('§') + '||' + extraStyle.length;
}

export function previewBaseUrl(): string {
  return `${PREVIEW_BASE}/${sessionId()}/`;
}

export function previewEntryUrl(files: FileItem[], path?: string): string {
  if (path) return `${previewBaseUrl()}${path.replace(/^\/+/, '')}`;
  const root = resolveProjectRoot(files);
  const entry =
    files.find(f => f.type === 'html' && f.name.toLowerCase() === 'index.html') ||
    files.find(f => f.type === 'html');
  if (!entry) return `${previewBaseUrl()}index.html`;
  return `${previewBaseUrl()}${relPath(entry, root)}`;
}

export function localhostUrlFor(previewUrl: string): string {
  // Map "/__preview/<sid>/foo/bar.html" to "http://localhost:3000/foo/bar.html"
  try {
    const u = new URL(previewUrl, location.origin);
    const m = u.pathname.match(/^\/__preview\/[^/]+\/(.*)$/);
    const tail = m ? m[1] : '';
    return `http://localhost:3000/${tail}${u.search}${u.hash}`;
  } catch {
    return previewUrl;
  }
}

export function absolutePreviewUrl(previewUrl: string): string {
  return new URL(previewUrl, location.origin).toString();
}

export async function syncPreview(
  files: FileItem[],
  opts: { extraInjectedCss?: string; force?: boolean } = {},
): Promise<PreviewServerStatus> {
  const sid = sessionId();
  const base = `${PREVIEW_BASE}/${sid}/`;
  const extraCss = opts.extraInjectedCss || '';
  const sig = fileSig(files, extraCss);
  if (!opts.force && sig === lastSyncedSig) {
    return { ready: true, sessionId: sid, baseUrl: base };
  }

  const root = resolveProjectRoot(files);
  const payload = files.map(f => {
    const path = relPath(f, root);
    if (f.type === 'image') {
      return {
        path,
        mime: f.mimeType || mimeFor(f.name, 'image/png'),
        body: f.content || '',
        isBinary: true,
      };
    }
    let body = f.content || '';
    let mime = mimeFor(f.name, f.type === 'html' ? 'text/html; charset=utf-8'
                                : f.type === 'css' ? 'text/css; charset=utf-8'
                                : f.type === 'js'  ? 'application/javascript; charset=utf-8'
                                : 'text/plain; charset=utf-8');
    if (f.type === 'html') {
      let html = body;
      if (extraCss.trim()) {
        const tag = `<style id="__timeline-preview-anim-style">\n${extraCss}\n</style>`;
        html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, tag + '\n</head>') : tag + html;
      }
      body = injectBridge(html);
    }
    return { path, mime, body, isBinary: false };
  });

  const result = await postToSW({ type: 'preview:set', sessionId: sid, files: payload });
  lastSyncedSig = sig;
  return { ready: result.ok, sessionId: sid, baseUrl: base };
}

export async function preflightSW(): Promise<boolean> {
  const reg = await getReg();
  return !!(reg?.active || navigator.serviceWorker?.controller);
}
