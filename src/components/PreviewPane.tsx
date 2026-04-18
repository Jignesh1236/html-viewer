import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  FiRefreshCw, FiMonitor, FiTablet, FiSmartphone,
  FiArrowLeft, FiArrowRight, FiPlus, FiX, FiImage, FiChevronDown, FiExternalLink,
  FiLock, FiTrash2, FiPlay,
} from 'react-icons/fi';
import { VscDebugConsole, VscFileCode } from 'react-icons/vsc';
import { createPreviewFrame, buildStaticPreviewHtml } from '../utils/previewEngine';
import type { PreviewFrame } from '../utils/previewEngine';
import { projectTypeLabel } from '../utils/fileTypes';

type DevToolsTab = 'console' | 'elements' | 'network' | 'styles';

const PreviewPane: React.FC = () => {
  const {
    files, previewRefreshKey, panels, setPanels,
    consoleEntries, addConsoleEntry, clearConsole,
    previewTabs, activePreviewTabId, addPreviewTab, closePreviewTab,
    setActivePreviewTab, updatePreviewTab,
    timelineAnimationStyle,
  } = useEditorStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewFrame, setPreviewFrame] = useState<PreviewFrame>(() => createPreviewFrame([], { mode: 'srcdoc' }));
  const [previewMode, setPreviewMode] = useState<'srcdoc' | 'url'>('srcdoc');
  const objectUrlRef = useRef<string | null>(null);
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [devtoolsTab, setDevtoolsTab] = useState<DevToolsTab>('console');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [elementsHtml, setElementsHtml] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [currentUrl, setCurrentUrl] = useState('preview://localhost/');
  const historyIdxRef = useRef(-1);
  useEffect(() => { historyIdxRef.current = historyIdx; }, [historyIdx]);

  const [iframeKey, setIframeKey] = useState(0);
  const [newTabMenuOpen, setNewTabMenuOpen] = useState(false);
  const newTabBtnRef = useRef<HTMLButtonElement>(null);
  const newTabMenuRef = useRef<HTMLDivElement>(null);

  const activeTab = previewTabs.find(t => t.id === activePreviewTabId);

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

  const openFileInTab = useCallback((fileId: string) => {
    setNewTabMenuOpen(false);
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    if (file.type === 'image') {
      addPreviewTab({ title: file.name, previewType: 'image', imageFileId: file.id });
    } else if (file.type === 'html') {
      addPreviewTab({ title: file.name, previewType: 'page' });
    }
  }, [files, addPreviewTab]);

  const buildSrcDoc = useCallback(() => {
    return buildStaticPreviewHtml(files, { timelineAnimationStyle });
  }, [files, timelineAnimationStyle]);

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
      } else if (d.type === 'navigate' && typeof d.url === 'string') {
        setCurrentUrl(d.url);
        setHistory(prev => {
          const idx = historyIdxRef.current;
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
  }, [activePreviewTabId, addConsoleEntry, updatePreviewTab]);

  const scheduleRebuild = useCallback((forceRemount = false, modeOverride?: 'srcdoc' | 'url') => {
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    rebuildTimerRef.current = setTimeout(() => {
      const mode = modeOverride ?? previewMode;
      setLoading(true);
      setFadeIn(false);
      const frame = createPreviewFrame(files, {
        mode,
        timelineAnimationStyle,
        previousObjectUrl: objectUrlRef.current || undefined,
      });
      objectUrlRef.current = frame.mode === 'url' ? frame.value : null;
      setPreviewFrame(frame);
      setCurrentUrl(frame.url);
      setHistory([frame.url]);
      setHistoryIdx(0);
      if (forceRemount) setIframeKey(k => k + 1);
    }, 120);
  }, [files, previewMode, timelineAnimationStyle]);

  const openInBrowser = useCallback(() => {
    const html = buildSrcDoc();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [buildSrcDoc]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Rebuild srcdoc on file changes or explicit refresh
  useEffect(() => {
    if (activeTab?.previewType === 'image') return;
    scheduleRebuild(false);
    return () => {
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    };
  }, [activeTab?.previewType, scheduleRebuild]);

  // Force full remount on explicit refresh
  useEffect(() => {
    if (previewRefreshKey === 0) return;
    if (activeTab?.previewType === 'image') return;
    scheduleRebuild(true);
  }, [previewRefreshKey]);

  // When switching to a page tab, reload
  useEffect(() => {
    if (activeTab?.previewType !== 'page') return;
    scheduleRebuild();
  }, [activePreviewTabId, activeTab?.previewType, scheduleRebuild]);

  const runProject = useCallback(() => {
    setPreviewMode('url');
    scheduleRebuild(true, 'url');
  }, [scheduleRebuild]);

  const useInstantPreview = useCallback(() => {
    setPreviewMode('srcdoc');
    scheduleRebuild(true, 'srcdoc');
  }, [scheduleRebuild]);

  const handleIframeLoad = () => {
    setLoading(false);
    requestAnimationFrame(() => setFadeIn(true));
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) setElementsHtml(formatHTML(doc.documentElement.outerHTML));
    } catch {}
  };

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
              zIndex: 9999, minWidth: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
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
            <button
              className="panel-icon-btn" title="Back"
              onClick={() => {}}
              disabled
              style={{ opacity: 0.3, cursor: 'not-allowed' }}
            ><FiArrowLeft size={13} /></button>
            <button
              className="panel-icon-btn" title="Forward"
              onClick={() => {}}
              disabled
              style={{ opacity: 0.3, cursor: 'not-allowed' }}
            ><FiArrowRight size={13} /></button>
            <button
              className="panel-icon-btn" title="Refresh (Ctrl+R)"
              onClick={() => useEditorStore.getState().refreshPreview()}
              style={{ color: loading ? 'var(--editor-amber)' : undefined }}
            >
              <FiRefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              className="panel-icon-btn"
              title={previewMode === 'url' ? 'Switch to instant srcDoc preview' : 'Run project with URL preview'}
              onClick={previewMode === 'url' ? useInstantPreview : runProject}
              style={{ color: previewMode === 'url' ? 'var(--editor-amber)' : undefined }}
            >
              <FiPlay size={12} />
            </button>
            <div style={{
              flex: 1, background: '#1a1a1a', border: '1px solid #3e3e3e',
              borderRadius: 12, padding: '3px 12px',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            }}>
              <FiLock size={11} style={{ color: '#4ec9b0', flexShrink: 0 }} />
              <input
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 12, color: '#bbb', fontFamily: 'var(--app-font-mono)',
                }}
                value={currentUrl}
                readOnly
              />
              <span style={{
                fontSize: 10, color: previewMode === 'url' ? '#e5a45a' : '#666',
                border: `1px solid ${previewMode === 'url' ? 'rgba(229,164,90,0.35)' : '#333'}`,
                borderRadius: 10, padding: '1px 7px', flexShrink: 0,
              }}>
                {projectTypeLabel(previewFrame.projectType)} · {previewFrame.runtimeLabel}
              </span>
            </div>
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
            <button
              className="panel-icon-btn" title="Open in Browser"
              onClick={openInBrowser}
            >
              <FiExternalLink size={13} />
            </button>
            <button
              className="panel-icon-btn" title="DevTools (F12)"
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
              key={`${iframeKey}-${previewFrame.mode}`}
              ref={iframeRef}
              title="Preview"
              onLoad={handleIframeLoad}
              srcDoc={previewFrame.mode === 'srcdoc' ? previewFrame.value : undefined}
              src={previewFrame.mode === 'url' ? previewFrame.value : undefined}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-pointer-lock"
              style={{
                ...viewportStyle,
                border: 'none', flexShrink: 0, overflow: 'hidden',
                transition: 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease',
                opacity: fadeIn ? 1 : 0,
                willChange: 'opacity',
              }}
            />
            {previewFrame.error && (
              <div style={{
                position: 'absolute', left: 12, bottom: 12, maxWidth: 420,
                background: 'rgba(20,24,32,0.92)', color: '#d6deeb',
                border: '1px solid rgba(229,164,90,0.35)', borderRadius: 8,
                padding: '8px 10px', fontSize: 11, lineHeight: 1.45,
                boxShadow: '0 8px 28px rgba(0,0,0,0.35)', pointerEvents: 'none',
              }}>
                {previewFrame.error}
              </div>
            )}
          </div>

          {/* DevTools Panel */}
          {panels.devtools && (
            <div style={{
              height: panels.devtoolsHeight, flexShrink: 0,
              borderTop: '1px solid #3e3e3e', background: '#1a1a1a',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
            }}>
              <div
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, cursor: 'row-resize', zIndex: 10 }}
                onMouseDown={(e) => {
                  const startY = e.clientY;
                  const startH = panels.devtoolsHeight;
                  const onMove = (ev: MouseEvent) => setPanels({ devtoolsHeight: Math.max(80, Math.min(600, startH + (startY - ev.clientY))) });
                  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              />
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
                  <FiTrash2 size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> Clear
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', fontFamily: 'var(--app-font-mono)', fontSize: 12 }}>
                {devtoolsTab === 'console' && (
                  consoleEntries.length === 0 ? (
                    <div style={{ padding: 12, color: '#555', fontSize: 12 }}>No console output. Your JavaScript console.log() calls will appear here.</div>
                  ) : (
                    consoleEntries.map(entry => (
                      <div
                        key={entry.id}
                        style={{
                          padding: '3px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)',
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
  const src = file.url || (file.content ? `data:${file.mimeType || 'image/png'};base64,${file.content}` : '');
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
            {b === 'checker' ? 'Grid' : b === 'dark' ? 'Dark' : 'Light'}
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
            <FiImage size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>Cannot display image</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PreviewPane;
