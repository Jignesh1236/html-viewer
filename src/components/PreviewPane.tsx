import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  FiRefreshCw, FiMonitor, FiTablet, FiSmartphone,
  FiArrowLeft, FiArrowRight, FiPlus, FiX,
} from 'react-icons/fi';
import { VscDebugConsole } from 'react-icons/vsc';

type DevToolsTab = 'console' | 'elements' | 'network' | 'styles';

const PreviewPane: React.FC = () => {
  const {
    files, previewRefreshKey, panels, setPanels,
    consoleEntries, addConsoleEntry, clearConsole,
    previewTabs, activePreviewTabId, addPreviewTab, closePreviewTab,
    setActivePreviewTab, updatePreviewTab,
  } = useEditorStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [devtoolsTab, setDevtoolsTab] = useState<DevToolsTab>('console');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [elementsHtml, setElementsHtml] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const urlBarRef = useRef<HTMLInputElement>(null);

  // Build the srcdoc that injects all project files into the HTML
  const buildSrcDoc = useCallback(() => {
    const htmlFile = files.find(f => f.type === 'html');
    if (!htmlFile) return '<html><body style="font-family:sans-serif;color:#888;padding:40px;background:#f0f0f0"><h2>No HTML file</h2><p>Create an index.html file to see the preview.</p></body></html>';

    let html = htmlFile.content;

    // Inject CSS files inline (replace link tags or append)
    files.filter(f => f.type === 'css').forEach(css => {
      const tag = `<style data-src="${css.name}">\n${css.content}\n</style>`;
      const linkRe = new RegExp(`<link[^>]*href=["']${css.name.replace('.', '\\.')}["'][^>]*/?>`, 'gi');
      if (linkRe.test(html)) {
        html = html.replace(linkRe, tag);
      } else {
        html = html.replace('</head>', `${tag}\n</head>`);
      }
    });

    // Inject JS files inline
    files.filter(f => f.type === 'js').forEach(js => {
      const tag = `<script data-src="${js.name}">\n${js.content}\n<\/script>`;
      const scriptRe = new RegExp(`<script[^>]*src=["']${js.name.replace('.', '\\.')}["'][^>]*><\/script>`, 'gi');
      if (scriptRe.test(html)) {
        html = html.replace(scriptRe, tag);
      } else {
        html = html.replace('</body>', `${tag}\n</body>`);
      }
    });

    // Fix uploaded image/asset URLs
    files.filter(f => f.type === 'image' && f.url).forEach(img => {
      const esc = img.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`(src|href)=["']${esc}["']`, 'gi'), `$1="${img.url}"`);
    });

    // Inject bridge script: console intercept + title/favicon detection
    const bridgeScript = `<script>
(function() {
  // Console bridge
  const _types = ['log','error','warn','info','debug'];
  _types.forEach(function(t) {
    const orig = console[t].bind(console);
    console[t] = function() {
      orig.apply(console, arguments);
      try {
        const msg = Array.from(arguments).map(function(a) {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
          catch(e) { return String(a); }
        }).join(' ');
        window.parent.postMessage({ __htmlEditor: true, type: 'console', level: t, message: msg }, '*');
      } catch(e) {}
    };
  });

  // Error bridge
  window.addEventListener('error', function(e) {
    window.parent.postMessage({ __htmlEditor: true, type: 'console', level: 'error', message: 'Uncaught ' + e.message + '\\n  at ' + e.filename + ':' + e.lineno + ':' + e.colno }, '*');
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.parent.postMessage({ __htmlEditor: true, type: 'console', level: 'error', message: 'UnhandledPromiseRejection: ' + e.reason }, '*');
  });

  // Title + favicon bridge (watch for changes)
  function sendMeta() {
    var title = document.title || 'Untitled';
    var favicon = '';
    var links = document.querySelectorAll('link[rel*="icon"]');
    if (links.length > 0) favicon = links[links.length - 1].href || '';
    window.parent.postMessage({ __htmlEditor: true, type: 'meta', title: title, favicon: favicon }, '*');
  }

  document.addEventListener('DOMContentLoaded', sendMeta);
  
  // Observe title changes
  var titleEl = document.querySelector('title');
  if (titleEl) {
    var mo = new MutationObserver(sendMeta);
    mo.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  // Navigation bridge
  var _pushState = history.pushState.bind(history);
  var _replaceState = history.replaceState.bind(history);
  history.pushState = function() { _pushState.apply(history, arguments); sendNav(); };
  history.replaceState = function() { _replaceState.apply(history, arguments); sendNav(); };
  window.addEventListener('popstate', sendNav);
  function sendNav() {
    window.parent.postMessage({ __htmlEditor: true, type: 'navigate', url: location.href }, '*');
  }
})();
<\/script>`;

    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + bridgeScript);
    } else {
      html = bridgeScript + html;
    }

    return html;
  }, [files]);

  // Listen for postMessages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data?.__htmlEditor) return;
      const d = e.data;
      if (d.type === 'console') {
        addConsoleEntry({ type: d.level as any, message: d.message, timestamp: new Date() });
      } else if (d.type === 'meta') {
        updatePreviewTab(activePreviewTabId, {
          title: d.title || 'Untitled',
          favicon: d.favicon || '',
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [activePreviewTabId, addConsoleEntry, updatePreviewTab]);

  // Rebuild srcdoc on file changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setLoading(true);
    const srcDoc = buildSrcDoc();
    iframe.srcdoc = srcDoc;
  }, [previewRefreshKey, buildSrcDoc]);

  const handleIframeLoad = () => {
    setLoading(false);
    // Get elements html for inspector
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        setElementsHtml(formatHTML(doc.documentElement.outerHTML));
      }
    } catch {}
  };

  // Simple HTML formatter
  const formatHTML = (html: string) => {
    let indent = 0;
    return html
      .replace(/></g, '>\n<')
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
        const out = '  '.repeat(indent) + trimmed;
        if (!trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) indent++;
        return out;
      })
      .filter(Boolean)
      .join('\n');
  };

  const viewportStyle = {
    desktop: { width: '100%', height: '100%' },
    tablet: { width: '768px', height: '100%', boxShadow: '0 0 0 1px #444, 0 4px 24px rgba(0,0,0,0.4)' },
    mobile: { width: '390px', height: '844px', borderRadius: 24, boxShadow: '0 0 0 8px #222, 0 0 0 10px #333, 0 8px 32px rgba(0,0,0,0.6)' },
  }[viewport];

  const errorCount = consoleEntries.filter(e => e.type === 'error').length;
  const warnCount = consoleEntries.filter(e => e.type === 'warn').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>

      {/* Browser Tab Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 32,
        background: '#2d2d2d', borderBottom: '1px solid #3e3e3e',
        padding: '0 4px', gap: 1, flexShrink: 0,
      }}>
        {previewTabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActivePreviewTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 26, maxWidth: 180, minWidth: 80,
              padding: '0 8px 0 8px',
              borderRadius: '4px 4px 0 0',
              background: tab.active ? '#1e1e1e' : 'transparent',
              border: tab.active ? '1px solid #3e3e3e' : '1px solid transparent',
              borderBottom: tab.active ? '1px solid #1e1e1e' : 'none',
              cursor: 'pointer',
              position: 'relative',
              top: tab.active ? 1 : 0,
              flex: '0 1 160px',
            }}
          >
            {/* Favicon */}
            {tab.favicon ? (
              <img src={tab.favicon} style={{ width: 12, height: 12, flexShrink: 0 }} alt="" />
            ) : (
              <div style={{ width: 12, height: 12, background: '#555', borderRadius: 2, flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: 11, color: tab.active ? '#ccc' : '#888',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {tab.title || 'Loading…'}
            </span>
            {previewTabs.length > 1 && (
              <div
                onClick={e => { e.stopPropagation(); closePreviewTab(tab.id); }}
                style={{
                  width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 2, opacity: 0.5, cursor: 'pointer', flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              >
                <FiX size={10} />
              </div>
            )}
          </div>
        ))}
        <button
          onClick={addPreviewTab}
          style={{
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', color: '#888', borderRadius: 4,
          }}
          title="New Tab"
        >
          <FiPlus size={13} />
        </button>
      </div>

      {/* Browser Address Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 34,
        background: '#252526', borderBottom: '1px solid #3e3e3e',
        padding: '0 8px', gap: 6, flexShrink: 0,
      }}>
        <button
          className="panel-icon-btn"
          title="Back"
          onClick={() => {
            if (historyIdx > 0) { setHistoryIdx(h => h - 1); }
          }}
          style={{ opacity: historyIdx > 0 ? 1 : 0.3 }}
        >
          <FiArrowLeft size={13} />
        </button>
        <button
          className="panel-icon-btn"
          title="Forward"
          onClick={() => {
            if (historyIdx < history.length - 1) setHistoryIdx(h => h + 1);
          }}
          style={{ opacity: historyIdx < history.length - 1 ? 1 : 0.3 }}
        >
          <FiArrowRight size={13} />
        </button>
        <button
          className="panel-icon-btn"
          title="Refresh (Ctrl+R)"
          onClick={() => useEditorStore.getState().refreshPreview()}
          style={{ color: loading ? 'var(--editor-amber)' : undefined }}
        >
          <FiRefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>

        {/* URL bar */}
        <div style={{
          flex: 1, background: '#1a1a1a', border: '1px solid #3e3e3e',
          borderRadius: 12, padding: '3px 12px',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
        }}>
          <span style={{ color: '#4ec9b0', fontSize: 11 }}>🔒</span>
          <input
            ref={urlBarRef}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12, color: '#bbb', fontFamily: 'var(--app-font-mono)',
            }}
            defaultValue="preview://localhost/"
            readOnly
          />
        </div>

        {/* Viewport switcher */}
        <div style={{ display: 'flex', gap: 2 }}>
          {(['desktop', 'tablet', 'mobile'] as const).map(v => (
            <button
              key={v}
              className={`panel-icon-btn ${viewport === v ? 'active' : ''}`}
              title={v === 'desktop' ? 'Desktop' : v === 'tablet' ? 'Tablet (768px)' : 'Mobile (390px)'}
              onClick={() => setViewport(v)}
              style={{ color: viewport === v ? 'var(--editor-amber)' : undefined }}
            >
              {v === 'desktop' ? <FiMonitor size={13} /> : v === 'tablet' ? <FiTablet size={13} /> : <FiSmartphone size={13} />}
            </button>
          ))}
        </div>

        {/* DevTools toggle */}
        <button
          className={`panel-icon-btn`}
          title="DevTools (F12)"
          onClick={() => setPanels({ devtools: !panels.devtools })}
          style={{
            color: panels.devtools ? 'var(--editor-amber)' : errorCount > 0 ? '#f44747' : undefined,
            position: 'relative',
          }}
        >
          <VscDebugConsole size={15} />
          {errorCount > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3, width: 12, height: 12,
              background: '#f44747', borderRadius: '50%', fontSize: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              {errorCount > 9 ? '9+' : errorCount}
            </span>
          )}
        </button>
      </div>

      {/* Preview Area */}
      <div style={{
        flex: 1, overflow: 'auto', background: viewport === 'desktop' ? '#fff' : '#2a2a2a',
        display: 'flex', alignItems: viewport === 'mobile' ? 'center' : 'flex-start',
        justifyContent: 'center', padding: viewport === 'desktop' ? 0 : 24,
        position: 'relative',
      }}>
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'var(--editor-amber)', zIndex: 10,
            animation: 'shimmer 1s ease infinite',
          }} />
        )}
        <iframe
          ref={iframeRef}
          title="Preview"
          onLoad={handleIframeLoad}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-pointer-lock"
          style={{
            ...viewportStyle,
            border: 'none', flexShrink: 0, overflow: 'hidden',
            transition: 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease',
          }}
        />
      </div>

      {/* DevTools Panel */}
      {panels.devtools && (
        <div style={{
          height: panels.devtoolsHeight, flexShrink: 0,
          borderTop: '1px solid #3e3e3e', background: '#1a1a1a',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}>
          {/* Resize handle */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4, cursor: 'row-resize', zIndex: 10,
            }}
            onMouseDown={(e) => {
              const startY = e.clientY;
              const startH = panels.devtoolsHeight;
              const onMove = (ev: MouseEvent) => setPanels({ devtoolsHeight: Math.max(80, Math.min(600, startH + (startY - ev.clientY)) )});
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          />

          {/* DevTools Tab Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', height: 30, flexShrink: 0,
            background: '#252526', borderBottom: '1px solid #3e3e3e',
          }}>
            {(['console', 'elements', 'styles', 'network'] as DevToolsTab[]).map(t => (
              <div
                key={t}
                onClick={() => setDevtoolsTab(t)}
                style={{
                  padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center',
                  fontSize: 12, cursor: 'pointer',
                  color: devtoolsTab === t ? '#ccc' : '#888',
                  borderBottom: devtoolsTab === t ? '2px solid var(--editor-amber)' : '2px solid transparent',
                  fontFamily: 'var(--app-font-sans)',
                  userSelect: 'none',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'console' && errorCount > 0 && (
                  <span style={{ marginLeft: 5, background: '#f44747', borderRadius: 3, fontSize: 10, padding: '0 4px', color: '#fff' }}>
                    {errorCount}
                  </span>
                )}
                {t === 'console' && warnCount > 0 && errorCount === 0 && (
                  <span style={{ marginLeft: 5, background: '#dcdcaa', borderRadius: 3, fontSize: 10, padding: '0 4px', color: '#000' }}>
                    {warnCount}
                  </span>
                )}
              </div>
            ))}
            <button
              onClick={clearConsole}
              style={{ marginLeft: 'auto', marginRight: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#888' }}
            >
              🚫 Clear
            </button>
          </div>

          {/* DevTools Content */}
          <div style={{ flex: 1, overflow: 'auto', fontFamily: 'var(--app-font-mono)', fontSize: 12 }}>
            {devtoolsTab === 'console' && (
              consoleEntries.length === 0 ? (
                <div style={{ padding: 12, color: '#555', fontSize: 12 }}>No console output. Your JavaScript console.log() calls will appear here.</div>
              ) : (
                consoleEntries.map(entry => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '3px 10px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      background: entry.type === 'error' ? 'rgba(244,71,71,0.07)' : entry.type === 'warn' ? 'rgba(220,220,170,0.05)' : 'transparent',
                    }}
                  >
                    <span style={{
                      color: entry.type === 'error' ? '#f44747' : entry.type === 'warn' ? '#dcdcaa' : entry.type === 'info' ? '#9cdcfe' : '#888',
                      flexShrink: 0, fontSize: 11,
                    }}>
                      {entry.type === 'error' ? '✕' : entry.type === 'warn' ? '⚠' : entry.type === 'info' ? 'ℹ' : '>'}
                    </span>
                    <pre style={{
                      flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0,
                      color: entry.type === 'error' ? '#f44747' : entry.type === 'warn' ? '#dcdcaa' : '#ccc',
                      fontSize: 12,
                    }}>
                      {entry.message}
                    </pre>
                    <span style={{ color: '#555', fontSize: 10, flexShrink: 0, alignSelf: 'center' }}>
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )
            )}

            {devtoolsTab === 'elements' && (
              <pre style={{ padding: 8, fontSize: 11, color: '#9cdcfe', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {elementsHtml || 'Elements will appear here after page loads.'}
              </pre>
            )}

            {devtoolsTab === 'styles' && (
              <div style={{ padding: 10, color: '#888', fontSize: 12 }}>
                Select an element in Visual mode to inspect its computed styles.
              </div>
            )}

            {devtoolsTab === 'network' && (
              <div style={{ padding: 10 }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Loaded resources:</div>
                {files.map(f => (
                  <div key={f.id} style={{ padding: '3px 0', fontSize: 11, display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#4ec9b0', width: 32, flexShrink: 0 }}>200</span>
                    <span style={{ color: '#9cdcfe' }}>{f.type.toUpperCase()}</span>
                    <span style={{ color: '#ccc' }}>{f.name}</span>
                    <span style={{ color: '#555', marginLeft: 'auto' }}>{(f.content.length / 1024).toFixed(1)}kb</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPane;
