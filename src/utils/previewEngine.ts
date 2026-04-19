import type { FileItem, ProjectType } from '../store/editorStore';
import { detectProjectType, isScriptFile } from './fileTypes';

export type PreviewFrame =
  | { mode: 'srcdoc'; value: string; projectType: ProjectType; runtimeLabel: string; url: string; error?: string }
  | { mode: 'url'; value: string; projectType: ProjectType; runtimeLabel: string; url: string; error?: string };

export interface BuildPreviewOptions {
  timelineAnimationStyle?: string;
  editorCss?: string;
  includeBridge?: boolean;
  fallbackHtml?: string;
}

function escRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectBefore(html: string, closingTag: 'head' | 'body', injection: string) {
  const re = new RegExp(`</${closingTag}>`, 'i');
  if (re.test(html)) return html.replace(re, `${injection}\n</${closingTag}>`);
  return closingTag === 'head' ? `${injection}\n${html}` : `${html}\n${injection}`;
}

export function buildPreviewBridgeScript() {
  return `<script>
(function() {
  if (window.__htmlEditorBridgeInstalled) return;
  window.__htmlEditorBridgeInstalled = true;
  var types = ['log','error','warn','info','debug'];
  types.forEach(function(t) {
    var orig = console[t] && console[t].bind(console);
    if (!orig) return;
    console[t] = function() {
      orig.apply(console, arguments);
      try {
        var msg = Array.from(arguments).map(function(a) {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
          catch(e) { return String(a); }
        }).join(' ');
        window.parent.postMessage({ __htmlEditor: true, type: 'console', level: t, message: msg }, '*');
      } catch(e) {}
    };
  });
  window.addEventListener('error', function(e) {
    window.parent.postMessage({ __htmlEditor: true, type: 'console', level: 'error', message: 'Uncaught ' + e.message + '\\n  at ' + e.filename + ':' + e.lineno + ':' + e.colno }, '*');
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.parent.postMessage({ __htmlEditor: true, type: 'console', level: 'error', message: 'UnhandledPromiseRejection: ' + e.reason }, '*');
  });
  function sendMeta() {
    var links = document.querySelectorAll('link[rel*="icon"]');
    window.parent.postMessage({ __htmlEditor: true, type: 'meta', title: document.title || 'Untitled', favicon: links.length ? links[links.length - 1].href || '' : '' }, '*');
  }
  function sendNav() {
    window.parent.postMessage({ __htmlEditor: true, type: 'navigate', url: location.href }, '*');
  }
  document.addEventListener('DOMContentLoaded', function() { sendMeta(); sendNav(); });
  var titleEl = document.querySelector('title');
  if (titleEl) new MutationObserver(sendMeta).observe(titleEl, { childList: true, characterData: true, subtree: true });
  var pushState = history.pushState.bind(history);
  var replaceState = history.replaceState.bind(history);
  history.pushState = function() { pushState.apply(history, arguments); sendNav(); };
  history.replaceState = function() { replaceState.apply(history, arguments); sendNav(); };
  window.addEventListener('popstate', sendNav);
})();
<\/script>`;
}

export function buildStaticPreviewHtml(files: FileItem[], options: BuildPreviewOptions = {}) {
  // For non-static projects, return a helpful "run in terminal" placeholder
  // instead of trying to execute JSX/TSX which requires a build step
  const projectType = detectProjectType(files);
  if (projectType !== 'static') {
    const cmd = projectType === 'react' ? 'npm install && npm run dev' : 'node index.js';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#0f0f1a;color:#ccc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:32px}
      .card{background:#1a1a2e;border:1px solid #2a2a40;border-radius:14px;padding:36px 40px;max-width:380px;text-align:center}
      .icon{font-size:3rem;margin-bottom:16px}
      h2{color:#fff;font-size:1.1rem;margin-bottom:10px}
      p{color:#888;font-size:0.85rem;line-height:1.6;margin-bottom:20px}
      .cmd{background:#0d0d1a;border:1px solid #2a2a40;border-radius:8px;padding:10px 16px;font-family:monospace;font-size:0.85rem;color:#e5a45a;margin-bottom:6px}
    </style></head><body>
      <div class="card">
        <div class="icon">${projectType === 'react' ? '⚛' : '🟩'}</div>
        <h2>${projectType === 'react' ? 'React / Vite' : 'Node'} Project</h2>
        <p>Open the terminal and run these commands to start your app:</p>
        <div class="cmd">npm install</div>
        <div class="cmd">${cmd.replace('npm install && ', '')}</div>
        <p style="margin-top:14px;font-size:0.78rem;color:#555">The preview updates automatically once the dev server is running.</p>
      </div>
    </body></html>`;
  }

  const htmlFile = files.find(f => f.type === 'html');
  let html = htmlFile?.content || options.fallbackHtml || '<html><body style="font-family:sans-serif;color:#888;padding:40px;background:#f0f0f0"><h2>No HTML file</h2><p>Create an index.html file to see the preview.</p></body></html>';

  files.filter(f => f.type === 'css').forEach(css => {
    const tag = `<style data-src="${css.id}">\n${css.content}\n</style>`;
    const refs = [css.name, ...(css.id !== css.name ? [css.id] : [])];
    let matched = false;
    for (const ref of refs) {
      const re = new RegExp(`<link[^>]*href=["']${escRe(ref)}["'][^>]*/?>`, 'gi');
      if (re.test(html)) {
        html = html.replace(re, tag);
        matched = true;
        break;
      }
    }
    if (!matched) html = injectBefore(html, 'head', tag);
  });

  // Only inline plain JS files — JSX/TSX/TS require a build step and cannot run in srcdoc
  files.filter(f => f.type === 'js').forEach(script => {
    const tag = `<script data-src="${script.id}">\n${script.content}\n<\/script>`;
    const refs = [script.name, ...(script.id !== script.name ? [script.id] : [])];
    let matched = false;
    for (const ref of refs) {
      const re = new RegExp(`<script[^>]*src=["']${escRe(ref)}["'][^>]*><\\/script>`, 'gi');
      if (re.test(html)) {
        html = html.replace(re, tag);
        matched = true;
        break;
      }
    }
    if (!matched) html = injectBefore(html, 'body', tag);
  });

  // Strip any remaining <script src="..."> tags that reference files needing a build step
  // (jsx, tsx, ts) or that point to non-existent virtual paths (e.g. /src/main.jsx in Vite)
  const buildStepExtRe = /\.(jsx|tsx|ts|mts|cts)["']/i;
  html = html.replace(/<script[^>]+src=["'][^"']*["'][^>]*><\/script>/gi, (match) => {
    const srcMatch = match.match(/src=["']([^"']*)["']/i);
    if (!srcMatch) return match;
    const src = srcMatch[1];
    // Remove if it references a build-step file OR if it's a virtual/absolute path not matched above
    if (buildStepExtRe.test(src)) return '';
    const isMapped = files.some(f => f.name === src || f.id === src || '/' + f.id === src || f.name === src.replace(/^\//, ''));
    if (!isMapped) return '';
    return match;
  });

  files.filter(f => f.type === 'image' && f.url).forEach(img => {
    const refs = [img.name, ...(img.id !== img.name ? [img.id] : [])];
    for (const ref of refs) {
      html = html.replace(new RegExp(`(src|href)=["']${escRe(ref)}["']`, 'gi'), `$1="${img.url}"`);
    }
  });

  if (options.timelineAnimationStyle?.trim()) {
    html = injectBefore(html, 'head', `<style id="__timeline-preview-anim-style">\n${options.timelineAnimationStyle}\n</style>`);
  }

  if (options.editorCss) {
    html = injectBefore(html, 'head', options.editorCss);
  }

  if (options.includeBridge !== false) {
    html = html.includes('<head>') ? html.replace('<head>', '<head>' + buildPreviewBridgeScript()) : buildPreviewBridgeScript() + html;
  }

  return html;
}

function buildRuntimePlaceholder(files: FileItem[], projectType: ProjectType) {
  const packageJson = files.find(f => f.name === 'package.json' || f.id.endsWith('/package.json'));
  const fileList = files.map(f => `<li><code>${f.id}</code> <span>${f.type.toUpperCase()}</span></li>`).join('');
  const startCommand = packageJson ? 'npm install && npm run dev' : projectType === 'react' ? 'npm install && npm run dev' : 'node index.js';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectType} runtime</title>
  <style>
    body{margin:0;background:#0f1117;color:#d6deeb;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}
    main{max-width:760px;padding:32px;border:1px solid #2d3345;background:#151925;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.45)}
    h1{margin:0 0 10px;font-size:24px;color:#f0b86b}
    p{line-height:1.6;color:#9da8bd}
    code{background:#0b0e14;border:1px solid #273044;border-radius:6px;padding:2px 6px;color:#8bd5ff}
    ul{columns:2;padding-left:18px;color:#9da8bd}
    li{break-inside:avoid;margin:6px 0}
    span{font-size:10px;color:#65708a;margin-left:6px}
  </style>
</head>
<body>
  <main>
    <h1>URL runtime pipeline ready</h1>
    <p>This project was detected as <code>${projectType}</code>. The preview is now using a URL-based iframe target, so a WebContainer adapter can mount these files and replace this placeholder with the dev-server URL.</p>
    <p>Expected runtime command: <code>${startCommand}</code></p>
    <ul>${fileList}</ul>
  </main>
</body>
</html>`;
}

export function createPreviewFrame(files: FileItem[], options: BuildPreviewOptions & { mode: 'srcdoc' | 'url'; previousObjectUrl?: string } = { mode: 'srcdoc' }) {
  const projectType = detectProjectType(files);
  if (options.previousObjectUrl) URL.revokeObjectURL(options.previousObjectUrl);

  if (options.mode === 'srcdoc') {
    return {
      mode: 'srcdoc',
      value: buildStaticPreviewHtml(files, options),
      projectType,
      runtimeLabel: 'srcDoc',
      url: 'preview://static/',
    } satisfies PreviewFrame;
  }

  const html = projectType === 'static' ? buildStaticPreviewHtml(files, options) : buildRuntimePlaceholder(files, projectType);
  const objectUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  return {
    mode: 'url',
    value: objectUrl,
    projectType,
    runtimeLabel: projectType === 'static' ? 'URL Blob' : 'WebContainer-ready URL',
    url: projectType === 'static' ? 'preview://url/static/' : `preview://runtime/${projectType}/`,
    error: projectType === 'static' ? undefined : 'WebContainer adapter boundary is ready; package install/dev-server execution can be connected here.',
  } satisfies PreviewFrame;
}