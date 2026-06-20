import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  FiRefreshCw, FiMonitor, FiTablet, FiSmartphone,
  FiArrowLeft, FiArrowRight, FiPlus, FiX, FiImage, FiChevronDown, FiExternalLink,
  FiBox, FiZap,
} from 'react-icons/fi';
import { VscFileCode, VscDebugAlt } from 'react-icons/vsc';
import { buildProjectHtml, getTargetHtmlFile, imageSource, insertBeforeClosingTag } from '../utils/projectFiles';
import {
  detectFramework, startDevServer, syncFileToWebContainer, checkCrossOriginIsolation,
} from '../utils/webcontainer';

const PreviewPane: React.FC = () => {
  const {
    files, previewRefreshKey, panels, setPanels,
    addConsoleEntry, folders,
    previewTabs, activePreviewTabId, addPreviewTab, closePreviewTab,
    setActivePreviewTab, updatePreviewTab,
    timelineAnimationStyle,
    liveServer, autoSave,
    unsavedFileIds,
    addPort,
  } = useEditorStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wcIframeRef = useRef<HTMLIFrameElement>(null);
  const [srcDoc, setSrcDoc] = useState<string>('');
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [currentUrl, setCurrentUrl] = useState('preview://localhost/');
  const historyIdxRef = useRef(-1);
  useEffect(() => { historyIdxRef.current = historyIdx; }, [historyIdx]);

  const [iframeKey, setIframeKey] = useState(0);
  const [newTabMenuOpen, setNewTabMenuOpen] = useState(false);
  const newTabBtnRef = useRef<HTMLButtonElement>(null);
  const newTabMenuRef = useRef<HTMLDivElement>(null);
  const [erudaOpen, setErudaOpen] = useState(false);
  const [viewportMenuOpen, setViewportMenuOpen] = useState(false);
  const viewportBtnRef = useRef<HTMLButtonElement>(null);
  const viewportMenuRef = useRef<HTMLDivElement>(null);

  /* ── WebContainer state ── */
  type PreviewMode = 'static' | 'webcontainer';
  const [previewMode, setPreviewMode]       = useState<PreviewMode>('static');
  const [wcUrl, setWcUrl]                   = useState<string | null>(null);
  const [wcLoading, setWcLoading]           = useState(false);
  const [wcLogs, setWcLogs]                 = useState<string[]>([]);
  const [wcError, setWcError]               = useState<string | null>(null);
  const wcStartedRef                        = useRef(false);

  const pushWcLog = useCallback((msg: string) => {
    setWcLogs(prev => [...prev.slice(-149), msg]);
  }, []);

  const framework = useMemo(() => detectFramework(files), [files]);
  const hasPackageJson = files.some(f => f.name === 'package.json');

  const activeTab = previewTabs.find(t => t.id === activePreviewTabId);
  const livePreviewEnabled = liveServer && autoSave;
  const previewConsoleEnabled = autoSave || unsavedFileIds.length === 0;

  /* ── Listen for PortManager "open in preview" event ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (!url) return;
      setWcUrl(url);
      setPreviewMode('webcontainer');
    };
    window.addEventListener('wc-preview-url', handler);
    return () => window.removeEventListener('wc-preview-url', handler);
  }, []);

  /* ── Start WebContainer dev server ── */
  const startWC = useCallback(async () => {
    if (wcStartedRef.current) return;
    wcStartedRef.current = true;
    setWcLoading(true);
    setWcError(null);
    setWcLogs([]);

    const isolation = checkCrossOriginIsolation();
    if (!isolation.ok) {
      setWcError(
        'Cross-origin isolation required.\n\n' +
        'Open this app in a standalone browser tab (click the ↗ button in the preview header) — ' +
        'WebContainer needs COOP + COEP headers which only apply outside an iframe.'
      );
      setWcLoading(false);
      wcStartedRef.current = false;
      return;
    }

    try {
      await startDevServer({
        files,
        folders,
        onLog: (msg) => pushWcLog(msg),
        onReady: (port, url) => {
          setWcUrl(url);
          setWcLoading(false);
          addPort({ port, url, status: 'running', command: `npm run ${framework !== 'static' ? 'dev' : 'start'}` });
          pushWcLog(`✅ Ready at ${url}`);
        },
      });
    } catch (err) {
      setWcError(String(err));
      setWcLoading(false);
      wcStartedRef.current = false;
    }
  }, [files, folders, addPort, framework, pushWcLog]);

  /* ── Sync changed files into running WebContainer ── */
  useEffect(() => {
    if (previewMode !== 'webcontainer' || wcLoading) return;
    const changed = files.filter(f => unsavedFileIds.includes(f.id));
    changed.forEach(f => syncFileToWebContainer(f).catch(() => {}));
  }, [files, previewMode, wcLoading, unsavedFileIds]);

  // Close new-tab menu when clicking outside
  useEffect(() => {
    if (!newTabMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        newTabBtnRef.current && !newTabBtnRef.current.contains(e.target as Node) &&
        newTabMenuRef.current && !newTabMenuRef.current.contains(e.target as Node)
      ) {
        setNewTabMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [newTabMenuOpen]);

  // Close viewport menu when clicking outside
  useEffect(() => {
    if (!viewportMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        viewportBtnRef.current && !viewportBtnRef.current.contains(e.target as Node) &&
        viewportMenuRef.current && !viewportMenuRef.current.contains(e.target as Node)
      ) {
        setViewportMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [viewportMenuOpen]);

  const openFileInTab = useCallback((fileId: string) => {
    setNewTabMenuOpen(false);
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    if (file.type === 'image') {
      addPreviewTab({ title: file.name, previewType: 'image', imageFileId: file.id });
    } else if (file.type === 'html') {
      addPreviewTab({ title: file.name, previewType: 'page', fileId: file.id });
    }
  }, [files, addPreviewTab]);

  // Build the srcdoc that injects all project files into the HTML
  const buildSrcDoc = useCallback(() => {
    const htmlFile = getTargetHtmlFile(files, activeTab?.fileId);
    if (!htmlFile) return '<html><body style="font-family:sans-serif;color:#888;padding:40px;background:#f0f0f0"><h2>No HTML file</h2><p>Create an index.html file to see the preview.</p></body></html>';

    const timelineStyleTag = timelineAnimationStyle.trim()
      ? `<style id="__timeline-preview-anim-style">\n${timelineAnimationStyle.replace(/<\/style/gi, '<\\/style')}\n</style>`
      : '';
    let html = buildProjectHtml(files, htmlFile, timelineStyleTag);

    const erudaScript = `<script src="https://cdn.jsdelivr.net/npm/eruda@3/eruda.min.js"><\/script><script>
(function() {
  function initEruda() {
    if (!window.eruda) return;
    try {
      eruda.init({
        tool: ['console','elements','network','resources','info'],
        useShadowDom: false,
        autoScale: true,
        defaults: { displaySize: 50, transparency: 0.95, theme: 'Dark' }
      });
      setTimeout(function() {
        try {
          eruda.hide();
          var btn = eruda && eruda._entryBtn && eruda._entryBtn._$el && eruda._entryBtn._$el[0];
          if (btn) btn.style.display = 'none';
        } catch(e) {}
      }, 100);
      var _erudaVisible = false;
      window.addEventListener('message', function(e) {
        if (!e.data || !e.data.__htmlEditor) return;
        if (e.data.type === 'eruda-toggle') {
          try {
            _erudaVisible = !_erudaVisible;
            _erudaVisible ? eruda.show() : eruda.hide();
          } catch(ex) {}
        }
      });
    } catch(ex) {}
  }
  if (document.readyState === 'complete') {
    initEruda();
  } else {
    window.addEventListener('load', initEruda);
  }
})();
<\/script>`;

    const bridgeScript = `<script>
(function() {
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
  window.addEventListener('error', function(e) {
    window.parent.postMessage({ __htmlEditor: true, type: 'console', level: 'error', message: 'Uncaught ' + e.message + '\\n  at ' + e.filename + ':' + e.lineno + ':' + e.colno }, '*');
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.parent.postMessage({ __htmlEditor: true, type: 'console', level: 'error', message: 'UnhandledPromiseRejection: ' + e.reason }, '*');
  });
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.__htmlEditor) return;
    if (e.data.type === 'go-back') history.back();
    if (e.data.type === 'go-forward') history.forward();
  });
  function sendMeta() {
    var title = document.title || 'Untitled';
    var favicon = '';
    var links = document.querySelectorAll('link[rel*="icon"]');
    if (links.length > 0) favicon = links[links.length - 1].href || '';
    window.parent.postMessage({ __htmlEditor: true, type: 'meta', title: title, favicon: favicon }, '*');
  }
  document.addEventListener('DOMContentLoaded', sendMeta);
  var titleEl = document.querySelector('title');
  if (titleEl) {
    var mo = new MutationObserver(sendMeta);
    mo.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }
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

    html = insertBeforeClosingTag(html, 'head', erudaScript + bridgeScript);

    return html;
  }, [activeTab?.fileId, files, timelineAnimationStyle]);

  const goBack = useCallback(() => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      const url = history[nextIdx];
      setHistoryIdx(nextIdx);
      setCurrentUrl(url);
      if (iframeRef.current?.contentWindow) {
        // We can't easily force an iframe with srcdoc to navigate history,
        // but we can try to re-apply the URL if it's a real URL, or just
        // let eruda/internal state handle it if it's preview://
        if (url.startsWith('preview://')) {
          // If it's internal, we might just have to reload the srcdoc
          // or send a message to the iframe to go back
          iframeRef.current.contentWindow.postMessage({ __htmlEditor: true, type: 'go-back' }, '*');
        } else {
          iframeRef.current.contentWindow.location.href = url;
        }
      }
    }
  }, [history, historyIdx]);

  const goForward = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      const url = history[nextIdx];
      setHistoryIdx(nextIdx);
      setCurrentUrl(url);
      if (iframeRef.current?.contentWindow) {
        if (url.startsWith('preview://')) {
          iframeRef.current.contentWindow.postMessage({ __htmlEditor: true, type: 'go-forward' }, '*');
        } else {
          iframeRef.current.contentWindow.location.href = url;
        }
      }
    }
  }, [history, historyIdx]);

  // Listen for postMessages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data?.__htmlEditor) return;
      if (!previewConsoleEnabled) return;
      const d = e.data;
      if (d.type === 'console') {
        addConsoleEntry({ type: d.level as any, message: d.message, timestamp: new Date() });
      } else if (d.type === 'meta') {
        updatePreviewTab(activePreviewTabId, {
          title: d.title || 'Untitled',
          favicon: d.favicon || '',
        });
      } else if (d.type === 'navigate' && typeof d.url === 'string') {
        setCurrentUrl(d.url);
        setHistory(prev => {
          const idx = historyIdxRef.current;
          // If we are navigating to a new URL, clear the forward history
          const base = idx >= 0 ? prev.slice(0, idx + 1) : prev;
          if (base[base.length - 1] === d.url) return base;
          const next = [...base, d.url];
          setHistoryIdx(next.length - 1);
          return next;
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [activePreviewTabId, addConsoleEntry, updatePreviewTab, previewConsoleEnabled]);

  const lastSrcDocRef = useRef<string>('');

  const scheduleRebuild = useCallback((forceRemount = false) => {
    if (!livePreviewEnabled && !forceRemount) return;
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    rebuildTimerRef.current = setTimeout(() => {
      const newDoc = buildSrcDoc();
      // Strip GSAP preview injection blocks before comparing to avoid spurious rebuilds
      const strip = (s: string) =>
        s.replace(/\n?<!-- gsap-(editor|tl)-preview-start -->[\s\S]*?<!-- gsap-(editor|tl)-preview-end -->/g, '');
      const changed = strip(newDoc) !== strip(lastSrcDocRef.current);
      const fullChanged = newDoc !== lastSrcDocRef.current;
      if (!fullChanged && !forceRemount) return;
      lastSrcDocRef.current = newDoc;
      setLoading(true);
      setFadeIn(false);
      if (changed || forceRemount) {
        setCurrentUrl('preview://localhost/');
        setHistory(['preview://localhost/']);
        setHistoryIdx(0);
      }
      if (forceRemount) setIframeKey(k => k + 1);
      setSrcDoc(newDoc);
    }, 400);
  }, [buildSrcDoc, livePreviewEnabled]);

  const openInBrowser = useCallback(() => {
    const html = buildSrcDoc();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [buildSrcDoc]);

  // Rebuild srcdoc on file changes or explicit refresh
  useEffect(() => {
    if (activeTab?.previewType === 'image') return;
    if (!livePreviewEnabled) return;
    scheduleRebuild(false);
    return () => {
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    };
  }, [activeTab?.previewType, scheduleRebuild, livePreviewEnabled]);

  // Force full remount on explicit refresh
  useEffect(() => {
    if (previewRefreshKey === 0) return;
    if (activeTab?.previewType === 'image') return;
    scheduleRebuild(true);
  }, [previewRefreshKey, activeTab?.previewType, scheduleRebuild]);

  // When switching to a page tab, reload
  useEffect(() => {
    if (activeTab?.previewType !== 'page') return;
    if (!livePreviewEnabled) return;
    scheduleRebuild();
  }, [activePreviewTabId, activeTab?.previewType, scheduleRebuild, livePreviewEnabled]);

  const handleIframeLoad = () => {
    setLoading(false);
    requestAnimationFrame(() => setFadeIn(true));
  };

  const viewportStyle = {
    desktop: { width: '100%', height: '100%' },
    tablet: { width: '768px', height: '100%', boxShadow: '0 0 0 1px #444, 0 4px 24px rgba(0,0,0,0.4)' },
    mobile: { width: '390px', height: '844px', borderRadius: 24, boxShadow: '0 0 0 8px #222, 0 0 0 10px #333, 0 8px 32px rgba(0,0,0,0.6)' },
  }[viewport];

  // Files available to open in preview
  const previewableFiles = files.filter(f => f.type === 'html' || f.type === 'image');

  // Active tab image (for image preview tabs)
  const imageFile = activeTab?.previewType === 'image' && activeTab.imageFileId
    ? files.find(f => f.id === activeTab.imageFileId)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>

      {/* Browser Tab Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 32,
        background: '#2d2d2d', borderBottom: '1px solid #3e3e3e',
        padding: '0 4px', gap: 1, flexShrink: 0, position: 'relative',
      }}>
        {previewTabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActivePreviewTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 26, maxWidth: 180, minWidth: 80,
              padding: '0 8px',
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
            {tab.previewType === 'image'
              ? <FiImage size={11} style={{ color: '#8bc34a', flexShrink: 0 }} />
              : (tab.favicon
                ? <img src={tab.favicon} style={{ width: 12, height: 12, flexShrink: 0 }} alt="" />
                : <div style={{ width: 12, height: 12, background: '#555', borderRadius: 2, flexShrink: 0 }} />
              )
            }
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

        {/* New Tab button with file picker */}
        <button
          ref={newTabBtnRef}
          onClick={() => setNewTabMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 2,
            height: 24, padding: '0 6px',
            background: newTabMenuOpen ? 'rgba(229,164,90,0.12)' : 'none',
            border: newTabMenuOpen ? '1px solid rgba(229,164,90,0.35)' : '1px solid transparent',
            cursor: 'pointer', color: newTabMenuOpen ? '#e5a45a' : '#888', borderRadius: 4,
          }}
          title="Open file in new tab"
        >
          <FiPlus size={13} />
          <FiChevronDown size={10} />
        </button>

        {/* File picker dropdown */}
        {newTabMenuOpen && (
          <div
            ref={newTabMenuRef}
            style={{
              position: 'absolute', top: 32, left: 'auto', right: 0,
              background: '#252526', border: '1px solid #3e3e3e', borderRadius: 6,
              zIndex: 900, minWidth: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '6px 10px 4px', fontSize: 10, color: '#666',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
              borderBottom: '1px solid #3e3e3e',
            }}>
              Open file in new tab
            </div>
            {previewableFiles.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12, color: '#555' }}>
                No HTML or image files found
              </div>
            ) : (
              previewableFiles.map(file => (
                <button
                  key={file.id}
                  onClick={() => openFileInTab(file.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', fontSize: 12, color: '#ccc',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {file.type === 'image'
                    ? <FiImage size={13} style={{ color: '#8bc34a', flexShrink: 0 }} />
                    : <VscFileCode size={14} style={{ color: '#e34c26', flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>
                    {file.type.toUpperCase()}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Image tab viewer */}
      {activeTab?.previewType === 'image' ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {imageFile ? (
            <InlineImageViewer file={imageFile} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#555', fontSize: 13 }}>
              Image file not found
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Browser Address Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', height: 34,
            background: '#252526', borderBottom: '1px solid #3e3e3e',
            padding: '0 8px', gap: 6, flexShrink: 0,
          }}>
            {/* Mode toggle: Static / WebContainer */}
            <div style={{ display: 'flex', gap: 1, flexShrink: 0, background: '#1a1a1a', borderRadius: 5, padding: 2, border: '1px solid #333' }}>
              <button
                onClick={() => setPreviewMode('static')}
                title="Static HTML preview"
                style={{
                  padding: '2px 7px', fontSize: 10, borderRadius: 3, cursor: 'pointer', border: 'none',
                  background: previewMode === 'static' ? '#3a3a3a' : 'transparent',
                  color: previewMode === 'static' ? '#e5a45a' : '#666',
                  fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <FiBox size={9} /> Static
              </button>
              <button
                onClick={() => {
                  setPreviewMode('webcontainer');
                  if (!wcStartedRef.current && hasPackageJson) startWC();
                }}
                title={hasPackageJson ? 'WebContainer dev server' : 'Add package.json to enable'}
                style={{
                  padding: '2px 7px', fontSize: 10, borderRadius: 3, cursor: hasPackageJson ? 'pointer' : 'not-allowed', border: 'none',
                  background: previewMode === 'webcontainer' ? '#3a3a3a' : 'transparent',
                  color: previewMode === 'webcontainer' ? '#4ade80' : hasPackageJson ? '#666' : '#3a3a3a',
                  fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
                  opacity: hasPackageJson ? 1 : 0.4,
                }}
              >
                <FiZap size={9} /> WC
              </button>
            </div>

            {previewMode === 'static' && <>
              <button
                className="panel-icon-btn" title="Back"
                onClick={goBack}
                disabled={historyIdx <= 0}
                style={{ opacity: historyIdx <= 0 ? 0.3 : 1, cursor: historyIdx <= 0 ? 'not-allowed' : 'pointer' }}
              ><FiArrowLeft size={13} /></button>
              <button
                className="panel-icon-btn" title="Forward"
                onClick={goForward}
                disabled={historyIdx >= history.length - 1}
                style={{ opacity: historyIdx >= history.length - 1 ? 0.3 : 1, cursor: historyIdx >= history.length - 1 ? 'not-allowed' : 'pointer' }}
              ><FiArrowRight size={13} /></button>
            </>}
            <button
              className="panel-icon-btn" title="Refresh"
              onClick={() => {
                if (previewMode === 'webcontainer') {
                  wcIframeRef.current?.contentWindow?.location.reload();
                } else {
                  useEditorStore.getState().refreshPreview();
                }
              }}
              style={{ color: loading ? 'var(--editor-amber)' : undefined }}
            >
              <FiRefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <div style={{
              flex: 1, background: '#1a1a1a', border: '1px solid #3e3e3e',
              borderRadius: 12, padding: '3px 12px',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            }}>
              <span style={{ color: '#4ec9b0', fontSize: 11 }}>🔒</span>
              <input
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 12, color: '#bbb', fontFamily: 'var(--app-font-mono)',
                }}
                value={previewMode === 'webcontainer' ? (wcUrl ?? 'webcontainer://…') : currentUrl}
                readOnly
              />
            </div>
            <div style={{ position: 'relative' }}>
              <button
                ref={viewportBtnRef}
                className="panel-icon-btn"
                title={viewport === 'desktop' ? 'Desktop' : viewport === 'tablet' ? 'Tablet (768px)' : 'Mobile (390px)'}
                onClick={() => setViewportMenuOpen(o => !o)}
                style={{
                  color: viewportMenuOpen ? 'var(--editor-amber)' : undefined,
                  display: 'flex', alignItems: 'center', gap: 2,
                }}
              >
                {viewport === 'desktop' ? <FiMonitor size={13} /> : viewport === 'tablet' ? <FiTablet size={13} /> : <FiSmartphone size={13} />}
                <FiChevronDown size={9} style={{ opacity: 0.6 }} />
              </button>
              {viewportMenuOpen && (
                <div
                  ref={viewportMenuRef}
                  style={{
                    position: 'absolute', top: 30, right: 0,
                    background: '#252526', border: '1px solid #3e3e3e',
                    borderRadius: 6, zIndex: 900, minWidth: 140,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
                  }}
                >
                  {([
                    { v: 'desktop', label: 'Desktop', sub: 'Full width', icon: <FiMonitor size={13} /> },
                    { v: 'tablet', label: 'Tablet', sub: '768px', icon: <FiTablet size={13} /> },
                    { v: 'mobile', label: 'Mobile', sub: '390px', icon: <FiSmartphone size={13} /> },
                  ] as const).map(({ v, label, sub, icon }) => (
                    <button
                      key={v}
                      onClick={() => { setViewport(v); setViewportMenuOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '7px 12px',
                        background: viewport === v ? 'rgba(229,164,90,0.1)' : 'none',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (viewport !== v) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { if (viewport !== v) (e.currentTarget as HTMLElement).style.background = 'none'; }}
                    >
                      <span style={{ color: viewport === v ? 'var(--editor-amber)' : '#888' }}>{icon}</span>
                      <span style={{ fontSize: 12, color: viewport === v ? 'var(--editor-amber)' : '#ccc' }}>{label}</span>
                      <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>{sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="panel-icon-btn" title="Open in Browser"
              onClick={openInBrowser}
            >
              <FiExternalLink size={13} />
            </button>
            <button
              className="panel-icon-btn"
              title={erudaOpen ? 'Hide DevTools' : 'Show DevTools'}
              onClick={() => {
                iframeRef.current?.contentWindow?.postMessage({ __htmlEditor: true, type: 'eruda-toggle' }, '*');
                setErudaOpen(o => !o);
              }}
              style={{
                color: erudaOpen ? 'var(--editor-amber)' : undefined,
                background: erudaOpen ? 'rgba(229,164,90,0.1)' : 'transparent',
                border: `1px solid ${erudaOpen ? 'rgba(229,164,90,0.3)' : 'transparent'}`,
                borderRadius: 4, padding: '2px 4px',
              }}
            >
              <VscDebugAlt size={14} />
            </button>
          </div>

          {/* Preview Area */}
          <div style={{
            flex: 1, minHeight: 0, overflow: viewport === 'desktop' ? 'hidden' : 'auto',
            background: viewport === 'desktop' ? (previewMode === 'webcontainer' ? '#1e1e1e' : '#fff') : '#2a2a2a',
            display: 'flex',
            alignItems: viewport === 'mobile' ? 'center' : viewport === 'tablet' ? 'flex-start' : 'stretch',
            justifyContent: viewport === 'desktop' ? 'stretch' : 'center',
            padding: viewport === 'desktop' ? 0 : 24,
            position: 'relative',
          }}>
            {loading && previewMode === 'static' && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'var(--editor-amber)', zIndex: 10,
                animation: 'shimmer 1s ease infinite',
              }} />
            )}

            {/* ── WebContainer Preview ── */}
            {previewMode === 'webcontainer' && (
              wcUrl ? (
                <iframe
                  ref={wcIframeRef}
                  src={wcUrl}
                  title="WebContainer Preview"
                  style={{
                    ...viewportStyle,
                    border: 'none', flexShrink: 0,
                  }}
                  allow="cross-origin-isolated"
                />
              ) : wcLoading ? (
                /* Boot / install loading screen */
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'flex-start',
                  background: '#0e0e10', padding: '24px 20px', overflow: 'auto',
                  fontFamily: 'monospace', fontSize: 11,
                }}>
                  <div style={{ width: '100%', maxWidth: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 18 }}>⚡</span>
                      <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>WebContainer</span>
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 8,
                        background: 'rgba(250,204,21,0.15)', color: '#facc15',
                        border: '1px solid rgba(250,204,21,0.3)',
                      }}>
                        BOOTING
                      </span>
                    </div>
                    <div style={{
                      background: '#141416', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '10px 12px', maxHeight: 320, overflow: 'auto',
                    }}>
                      {wcLogs.length === 0 ? (
                        <div style={{ color: '#555', fontSize: 11 }}>Initializing…</div>
                      ) : (
                        wcLogs.map((l, i) => (
                          <div key={i} style={{ color: l.startsWith('❌') ? '#f87171' : l.startsWith('✅') || l.startsWith('🌐') ? '#4ade80' : '#888', lineHeight: '18px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {l}
                          </div>
                        ))
                      )}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#555', fontSize: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#facc15', animation: 'pulse 1s ease infinite' }} />
                      First boot may take 15–30s (downloads Node.js runtime)
                    </div>
                  </div>
                </div>
              ) : wcError ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                  background: '#0e0e10', padding: 24,
                }}>
                  <div style={{ fontSize: 28 }}>❌</div>
                  <div style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>WebContainer Error</div>
                  <div style={{ fontSize: 11, color: '#666', maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
                    {wcError}
                  </div>
                  <button
                    onClick={() => { wcStartedRef.current = false; startWC(); }}
                    style={{
                      padding: '6px 16px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
                      background: 'rgba(229,164,90,0.12)', border: '1px solid rgba(229,164,90,0.3)',
                      color: '#e5a45a', fontFamily: 'inherit', fontWeight: 600,
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                /* No package.json — instructions */
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: '#0e0e10', padding: 24, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, opacity: 0.4 }}>⚡</div>
                  <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>WebContainer Preview</div>
                  <div style={{ fontSize: 11, color: '#555', maxWidth: 300, lineHeight: 1.6 }}>
                    Add a <code style={{ color: '#e5a45a', background: 'rgba(229,164,90,0.1)', padding: '0 4px', borderRadius: 3 }}>package.json</code> with a <code style={{ color: '#e5a45a', background: 'rgba(229,164,90,0.1)', padding: '0 4px', borderRadius: 3 }}>dev</code> script to run a real Node.js dev server here.
                  </div>
                  <button
                    onClick={() => setPreviewMode('static')}
                    style={{
                      padding: '5px 14px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
                      background: 'transparent', border: '1px solid #333',
                      color: '#666', fontFamily: 'inherit',
                    }}
                  >
                    Switch to Static Preview
                  </button>
                </div>
              )
            )}

            {/* ── Static srcdoc Preview ── */}
            {previewMode === 'static' && (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                title="Preview"
                onLoad={handleIframeLoad}
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-pointer-lock allow-downloads"
                style={{
                  ...viewportStyle,
                  border: 'none', flexShrink: 0, overflow: 'hidden',
                  transition: 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease',
                  opacity: fadeIn ? 1 : 0,
                  willChange: 'opacity',
                }}
              />
            )}
          </div>

        </>
      )}
    </div>
  );
};

/* ── Inline Image Viewer (for image preview tabs) ── */
interface InlineImageViewerProps {
  file: { name: string; url?: string; content: string; mimeType?: string };
}
function InlineImageViewer({ file }: InlineImageViewerProps) {
  const src = imageSource(file);
  const [zoom, setZoom] = React.useState(1);
  const [bg, setBg] = React.useState<'dark' | 'light' | 'checker'>('checker');

  const bgStyle: React.CSSProperties = bg === 'checker'
    ? { backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%)', backgroundSize: '20px 20px' }
    : { background: bg === 'dark' ? '#111' : '#f0f0f0' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
        background: '#252526', borderBottom: '1px solid #3e3e3e', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <FiImage size={12} style={{ color: '#8bc34a' }} />
        <span style={{ fontSize: 12, color: '#ccc' }}>{file.name}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#666' }}>BG:</span>
        {(['checker', 'dark', 'light'] as const).map(b => (
          <button key={b} onClick={() => setBg(b)}
            style={{
              padding: '1px 7px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
              background: bg === b ? 'rgba(229,164,90,0.15)' : 'transparent',
              border: `1px solid ${bg === b ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`,
              color: bg === b ? '#e5a45a' : '#888', fontFamily: 'inherit',
            }}>
            {b === 'checker' ? '⬛' : b === 'dark' ? 'Dark' : 'Light'}
          </button>
        ))}
        <div style={{ width: 1, height: 14, background: '#3e3e3e' }} />
        <button onClick={() => setZoom(z => Math.max(0.1, +(z - 0.25).toFixed(2)))}
          style={{ width: 20, height: 20, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontSize: 14, lineHeight: 1, fontFamily: 'inherit' }}>−</button>
        <span style={{ fontSize: 11, color: '#bbb', minWidth: 34, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))}
          style={{ width: 20, height: 20, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontSize: 14, lineHeight: 1, fontFamily: 'inherit' }}>+</button>
        <button onClick={() => setZoom(1)}
          style={{ padding: '1px 7px', fontSize: 11, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontFamily: 'inherit' }}>1:1</button>
      </div>
      <div style={{
        flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, minHeight: 0, ...bgStyle,
      }}>
        {src ? (
          <img
            src={src} alt={file.name}
            style={{
              maxWidth: 'none',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              display: 'block',
              imageRendering: zoom > 2 ? 'pixelated' : 'auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          />
        ) : (
          <div style={{ color: '#555', fontSize: 13, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🖼</div>
            <div>Cannot display image</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PreviewPane;
