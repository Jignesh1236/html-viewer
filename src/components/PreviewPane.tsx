import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  FiRefreshCw, FiMonitor, FiTablet, FiSmartphone,
  FiPlus, FiX, FiImage, FiChevronDown, FiExternalLink,
  FiLock, FiTrash2, FiPlay, FiSquare, FiGlobe, FiCode,
} from 'react-icons/fi';
import { VscDebugConsole, VscFileCode } from 'react-icons/vsc';
import { buildStaticPreviewHtml } from '../utils/previewEngine';
import { detectProjectType } from '../utils/fileTypes';
import { startWebContainerPreview, stopWebContainerRuntime } from '../utils/webContainerRuntime';

type DevToolsTab = 'console' | 'network' | 'styles';
type Viewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_STYLES: Record<Viewport, React.CSSProperties> = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '100%', boxShadow: '0 0 0 1px #444, 0 4px 24px rgba(0,0,0,0.4)' },
  mobile: { width: '390px', height: '844px', borderRadius: 24, boxShadow: '0 0 0 8px #222, 0 0 0 10px #333, 0 8px 32px rgba(0,0,0,0.6)' },
};

const PreviewPane: React.FC = () => {
  const {
    files, previewRefreshKey, panels, setPanels,
    consoleEntries, addConsoleEntry, clearConsole,
    previewTabs, activePreviewTabId, addPreviewTab, closePreviewTab,
    setActivePreviewTab, updatePreviewTab,
    timelineAnimationStyle,
    terminalWrite, terminalRunCommand,
  } = useEditorStore();

  const activeTab = previewTabs.find(t => t.id === activePreviewTabId);

  const [devtoolsTab, setDevtoolsTab] = useState<DevToolsTab>('console');
  const [newTabMenuOpen, setNewTabMenuOpen] = useState(false);
  const [customPort, setCustomPort] = useState('3000');
  const [runtimeStatus, setRuntimeStatus] = useState('');
  const [runtimeRunning, setRuntimeRunning] = useState(false);
  const [runCmdOverride, setRunCmdOverride] = useState('');
  const [runCfgOpen, setRunCfgOpen] = useState(false);
  const [tabKeys, setTabKeys] = useState<Record<string, number>>({});
  const [tabLoaded, setTabLoaded] = useState<Record<string, boolean>>({});
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const runtimeRunRef = useRef(0);
  const newTabBtnRef = useRef<HTMLButtonElement>(null);
  const newTabMenuRef = useRef<HTMLDivElement>(null);

  const bumpTabKey = useCallback((id: string) =>
    setTabKeys(k => ({ ...k, [id]: (k[id] ?? 0) + 1 })), []);

  const markTabLoaded = useCallback((id: string) =>
    setTabLoaded(l => ({ ...l, [id]: true })), []);

  const previewableFiles = useMemo(() =>
    files.filter(f => f.type === 'html' || f.type === 'image'), [files]);

  const htmlFiles = useMemo(() => files.filter(f => f.type === 'html'), [files]);
  const imageFiles = useMemo(() => files.filter(f => f.type === 'image'), [files]);

  const errorCount = consoleEntries.filter(e => e.type === 'error').length;
  const warnCount = consoleEntries.filter(e => e.type === 'warn').length;

  const tabSrcDocs = useMemo(() => {
    const docs: Record<string, string> = {};
    for (const tab of previewTabs) {
      if (tab.tabType === 'static') {
        docs[tab.id] = buildStaticPreviewHtml(files, {
          timelineAnimationStyle,
          htmlFileId: tab.htmlFileId,
        });
      }
    }
    return docs;
  }, [previewTabs, files, timelineAnimationStyle]);

  useEffect(() => {
    if (previewRefreshKey === 0 || !activeTab) return;
    bumpTabKey(activeTab.id);
    setTabLoaded(l => ({ ...l, [activeTab.id]: false }));
  }, [previewRefreshKey]);

  useEffect(() => {
    if (!newTabMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        newTabBtnRef.current && !newTabBtnRef.current.contains(e.target as Node) &&
        newTabMenuRef.current && !newTabMenuRef.current.contains(e.target as Node)
      ) setNewTabMenuOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [newTabMenuOpen]);

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

  useEffect(() => {
    return () => {
      runtimeRunRef.current += 1;
      stopWebContainerRuntime().catch(() => {});
    };
  }, []);

  const openFileInTab = useCallback((fileId: string) => {
    setNewTabMenuOpen(false);
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    if (file.type === 'image') {
      addPreviewTab({ tabType: 'image', imageFileId: file.id, title: file.name });
    } else if (file.type === 'html') {
      addPreviewTab({ tabType: 'static', htmlFileId: file.id, title: file.name });
    }
  }, [files, addPreviewTab]);

  const terminalWriteRef = useRef(terminalWrite);
  const terminalRunRef   = useRef(terminalRunCommand);
  useEffect(() => { terminalWriteRef.current = terminalWrite; }, [terminalWrite]);
  useEffect(() => { terminalRunRef.current = terminalRunCommand; }, [terminalRunCommand]);

  const writeToTerminal = useCallback((text: string) => {
    terminalWriteRef.current?.(text);
  }, []);

  const runProject = useCallback(async () => {
    setNewTabMenuOpen(false);
    setRunCfgOpen(false);

    // If there's a custom command override, just run it in the terminal
    if (runCmdOverride.trim()) {
      terminalRunRef.current?.(runCmdOverride.trim());
      return;
    }

    const existingPortTab = useEditorStore.getState().previewTabs.find(t => t.tabType === 'port');
    let portTabId: string;
    if (existingPortTab) {
      setActivePreviewTab(existingPortTab.id);
      portTabId = existingPortTab.id;
    } else {
      addPreviewTab({ tabType: 'port', title: 'Dev Server' });
      await new Promise(r => setTimeout(r, 0));
      portTabId = useEditorStore.getState().activePreviewTabId;
    }
    setRuntimeRunning(true);
    setRuntimeStatus('Starting…');
    const runId = ++runtimeRunRef.current;
    const projectType = detectProjectType(files);

    // Announce in terminal
    writeToTerminal('\r\n\x1b[36m  ▶ Starting dev server via preview pane…\x1b[0m\r\n');

    try {
      const result = await startWebContainerPreview(files, projectType, {
        onStatus: (_phase, message) => {
          if (runtimeRunRef.current === runId) {
            setRuntimeStatus(message);
            writeToTerminal(`\r\n\x1b[2m  ${message}\x1b[0m`);
          }
        },
        onConsole: (level, message) => {
          addConsoleEntry({ type: level as any, message, timestamp: new Date() });
          const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[0m';
          writeToTerminal(`\r\n${color}${message}\x1b[0m`);
        },
      });
      if (runtimeRunRef.current !== runId) return;
      setRuntimeStatus(`Running: ${result.command}`);
      writeToTerminal(`\r\n\x1b[32m  ✓ Server ready — ${result.url}\x1b[0m\r\n`);
      updatePreviewTab(portTabId, { portUrl: result.url, title: 'Dev Server' });
      bumpTabKey(portTabId);
      setTabLoaded(l => ({ ...l, [portTabId]: false }));
    } catch (err) {
      if (runtimeRunRef.current !== runId) return;
      const message = err instanceof Error ? err.message : String(err);
      setRuntimeStatus('Runtime unavailable');
      setRuntimeRunning(false);
      writeToTerminal(`\r\n\x1b[31m  ✕ ${message}\x1b[0m\r\n`);
      addConsoleEntry({ type: 'error', message, timestamp: new Date() });
    }
  }, [files, addPreviewTab, setActivePreviewTab, updatePreviewTab, addConsoleEntry, bumpTabKey, runCmdOverride, writeToTerminal]);

  const stopProject = useCallback(() => {
    runtimeRunRef.current += 1;
    setRuntimeRunning(false);
    setRuntimeStatus('');
    stopWebContainerRuntime().catch(() => {});
    for (const tab of useEditorStore.getState().previewTabs) {
      if (tab.tabType === 'port') {
        updatePreviewTab(tab.id, { portUrl: undefined });
      }
    }
  }, [updatePreviewTab]);

  const openInBrowser = useCallback(() => {
    if (!activeTab) return;
    if (activeTab.tabType === 'port' && activeTab.portUrl) {
      window.open(activeTab.portUrl, '_blank');
    } else if (activeTab.tabType === 'static') {
      const html = tabSrcDocs[activeTab.id] || '';
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }, [activeTab, tabSrcDocs]);

  const getTabUrl = (tab: typeof activeTab) => {
    if (!tab) return '';
    if (tab.tabType === 'port') return tab.portUrl || 'preview://runtime/waiting…';
    if (tab.tabType === 'static') {
      const file = tab.htmlFileId
        ? files.find(f => f.id === tab.htmlFileId)
        : files.find(f => f.type === 'html');
      return `preview://static/${file?.name || 'index.html'}`;
    }
    return '';
  };

  const viewport = activeTab?.viewport ?? 'desktop';

  const setViewport = (v: Viewport) => {
    if (activeTab) updatePreviewTab(activeTab.id, { viewport: v });
  };

  const openNewTabMenu = () => {
    if (newTabMenuOpen) { setNewTabMenuOpen(false); return; }
    const rect = newTabBtnRef.current?.getBoundingClientRect();
    if (rect) setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setNewTabMenuOpen(true);
  };

  const getTabIcon = (tab: (typeof previewTabs)[0]) => {
    if (tab.tabType === 'image') return <FiImage size={11} style={{ color: '#8bc34a', flexShrink: 0 }} />;
    if (tab.tabType === 'port') return <FiGlobe size={11} style={{ color: '#4ec9b0', flexShrink: 0 }} />;
    if (tab.favicon) return <img src={tab.favicon} style={{ width: 12, height: 12, flexShrink: 0, borderRadius: 2 }} alt="" />;
    return <FiCode size={11} style={{ color: '#e34c26', flexShrink: 0 }} />;
  };

  const isImageTab = activeTab?.tabType === 'image';
  const imageFile = isImageTab && activeTab?.imageFileId
    ? files.find(f => f.id === activeTab.imageFileId)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 32,
        background: '#2d2d2d', borderBottom: '1px solid #3e3e3e',
        padding: '0 4px', gap: 1, flexShrink: 0, position: 'relative',
        overflowX: 'auto', overflowY: 'hidden',
      }}>
        {previewTabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActivePreviewTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: '100%', minWidth: 90, maxWidth: 180,
              padding: '0 10px',
              background: tab.active ? '#1e1e1e' : 'transparent',
              borderRight: '1px solid #333',
              borderTop: tab.active
                ? tab.tabType === 'port' ? '2px solid #4ec9b0' : '2px solid #e5a45a'
                : '2px solid transparent',
              cursor: 'pointer',
              flex: '0 1 150px',
              userSelect: 'none',
              transition: 'background 0.1s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (!tab.active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (!tab.active) e.currentTarget.style.background = 'transparent'; }}
          >
            {getTabIcon(tab)}
            <span style={{
              fontSize: 12, color: tab.active ? '#d4d4d4' : '#888',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              fontWeight: tab.active ? 500 : 400,
            }}>
              {tab.title || 'Tab'}
            </span>
            {previewTabs.length > 1 && (
              <div
                onClick={e => { e.stopPropagation(); closePreviewTab(tab.id); }}
                style={{
                  width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 3, opacity: 0, cursor: 'pointer', flexShrink: 0,
                  transition: 'opacity 0.1s, background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(244,71,71,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.background = 'transparent'; }}
                className="preview-tab-close"
              >
                <FiX size={10} />
              </div>
            )}
          </div>
        ))}

        {/* New Tab button */}
        <button
          ref={newTabBtnRef}
          onClick={openNewTabMenu}
          style={{
            display: 'flex', alignItems: 'center', gap: 2,
            height: 24, padding: '0 8px', flexShrink: 0,
            background: newTabMenuOpen ? 'rgba(229,164,90,0.15)' : 'none',
            border: newTabMenuOpen ? '1px solid rgba(229,164,90,0.4)' : '1px solid transparent',
            cursor: 'pointer', color: newTabMenuOpen ? '#e5a45a' : '#888', borderRadius: 4,
          }}
          title="Open file in new tab"
        >
          <FiPlus size={13} />
          <FiChevronDown size={10} />
        </button>

        {/* New Tab Dropdown (fixed positioned) */}
        {newTabMenuOpen && (
          <div
            ref={newTabMenuRef}
            style={{
              position: 'fixed', top: dropdownPos.top, right: dropdownPos.right,
              background: '#252526', border: '1px solid #3e3e3e', borderRadius: 8,
              zIndex: 99999, minWidth: 260, boxShadow: '0 12px 32px rgba(0,0,0,0.6)', overflow: 'hidden',
            }}
          >
            {/* HTML Files → Static tabs */}
            <SectionHeader icon={<FiCode size={10} />} label="HTML Preview (Static)" />
            {htmlFiles.length === 0 ? (
              <EmptyHint text="No HTML files in project" />
            ) : (
              htmlFiles.map(file => (
                <DropdownFileBtn
                  key={file.id}
                  icon={<VscFileCode size={14} style={{ color: '#e34c26' }} />}
                  name={file.name}
                  badge="STATIC"
                  badgeColor="#e34c26"
                  onClick={() => openFileInTab(file.id)}
                />
              ))
            )}

            {/* Image Files */}
            {imageFiles.length > 0 && (
              <>
                <SectionHeader icon={<FiImage size={10} />} label="Image Viewer" />
                {imageFiles.map(file => (
                  <DropdownFileBtn
                    key={file.id}
                    icon={<FiImage size={13} style={{ color: '#8bc34a' }} />}
                    name={file.name}
                    badge="IMAGE"
                    badgeColor="#8bc34a"
                    onClick={() => openFileInTab(file.id)}
                  />
                ))}
              </>
            )}

            {/* Dev Server / Port tab */}
            <SectionHeader icon={<FiGlobe size={10} />} label="Dev Server" />
            <div style={{ padding: '6px 12px 4px' }}>
              <div style={{ fontSize: 10, color: '#666', marginBottom: 5 }}>Run command (leave blank for auto-detect)</div>
              <input
                type="text"
                value={runCmdOverride}
                onChange={e => setRunCmdOverride(e.target.value)}
                placeholder="e.g. npm run dev"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: 4,
                  color: '#ccc', fontSize: 12, padding: '5px 8px', outline: 'none',
                  fontFamily: 'var(--app-font-mono)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(229,164,90,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = '#3a3a3a')}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runProject(); } }}
              />
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                Output is streamed to the Terminal panel in real time.
              </div>
            </div>
            <div style={{ padding: '4px 12px 8px', display: 'flex', gap: 6 }}>
              <button
                onClick={() => runProject()}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '6px 0', fontSize: 12, borderRadius: 4, cursor: 'pointer',
                  background: 'rgba(78,201,176,0.15)', border: '1px solid rgba(78,201,176,0.35)',
                  color: '#4ec9b0', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(78,201,176,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(78,201,176,0.15)')}
              >
                <FiPlay size={12} /> {runCmdOverride.trim() ? `Run: ${runCmdOverride.trim()}` : 'Run App'}
              </button>
              {runtimeRunning && (
                <button
                  onClick={stopProject}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '6px 0', fontSize: 12, borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(244,71,71,0.1)', border: '1px solid rgba(244,71,71,0.3)',
                    color: '#f44747', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,71,71,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(244,71,71,0.1)')}
                >
                  <FiSquare size={11} /> Stop
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Image Tab ── */}
      {isImageTab ? (
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
          {/* ── Address Bar ── */}
          <div style={{
            display: 'flex', alignItems: 'center', height: 34,
            background: '#252526', borderBottom: '1px solid #3e3e3e',
            padding: '0 8px', gap: 6, flexShrink: 0,
          }}>
            <button
              className="panel-icon-btn"
              title="Refresh (Ctrl+R)"
              onClick={() => useEditorStore.getState().refreshPreview()}
            >
              <FiRefreshCw size={12} />
            </button>

            {/* Static / Port toggle for active tab */}
            {activeTab && (
              <button
                className="panel-icon-btn"
                title={activeTab.tabType === 'port' ? 'Showing Dev Server URL' : 'Switch tab to Dev Server (Run App)'}
                onClick={activeTab.tabType === 'port' ? undefined : runProject}
                style={{
                  color: activeTab.tabType === 'port' ? '#4ec9b0' : undefined,
                  cursor: activeTab.tabType === 'port' ? 'default' : 'pointer',
                }}
              >
                {activeTab.tabType === 'port' ? <FiGlobe size={12} /> : <FiPlay size={12} />}
              </button>
            )}

            {/* Address input */}
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
                value={getTabUrl(activeTab)}
                readOnly
              />
              {activeTab?.tabType === 'port' && (
                <span style={{
                  fontSize: 10, color: '#4ec9b0', border: '1px solid rgba(78,201,176,0.35)',
                  borderRadius: 10, padding: '1px 7px', flexShrink: 0,
                }}>
                  {runtimeStatus ? runtimeStatus : (activeTab.portUrl ? 'Running' : 'Waiting')}
                </span>
              )}
              {activeTab?.tabType === 'static' && (
                <span style={{
                  fontSize: 10, color: '#888', border: '1px solid #333',
                  borderRadius: 10, padding: '1px 7px', flexShrink: 0,
                }}>
                  Static
                </span>
              )}
            </div>

            {/* Viewport controls */}
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

            <button className="panel-icon-btn" title="Open in Browser" onClick={openInBrowser}>
              <FiExternalLink size={13} />
            </button>
            <button
              className="panel-icon-btn" title="DevTools"
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

          {/* ── Preview Area — all iframes mounted, inactive hidden ── */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            {previewTabs.filter(t => t.tabType !== 'image').map(tab => {
              const isActive = tab.id === activePreviewTabId;
              const vp = tab.viewport ?? 'desktop';
              const vpStyle = VIEWPORT_STYLES[vp];
              const loaded = tabLoaded[tab.id] ?? false;
              const key = `${tab.id}-${tabKeys[tab.id] ?? 0}`;

              const isPortWaiting = tab.tabType === 'port' && !tab.portUrl;

              return (
                <div
                  key={tab.id}
                  style={{
                    position: 'absolute', inset: 0,
                    display: isActive ? 'flex' : 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    background: vp === 'desktop' ? '#fff' : '#2a2a2a',
                    overflow: 'auto',
                    padding: vp === 'desktop' ? 0 : 24,
                  }}
                >
                  {/* Loading bar */}
                  {isActive && !loaded && !isPortWaiting && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: 'var(--editor-amber)', zIndex: 10,
                      animation: 'shimmer 1s ease infinite',
                    }} />
                  )}

                  {/* Port tab waiting state */}
                  {isPortWaiting ? (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      background: '#0f0f1a', color: '#ccc', width: '100%',
                      fontFamily: 'var(--app-font-sans)',
                    }}>
                      <div style={{
                        background: '#1a1a2e', border: '1px solid #2a2a40', borderRadius: 14,
                        padding: '36px 40px', maxWidth: 380, textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚛</div>
                        <h2 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 10 }}>Dev Server Tab</h2>
                        <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
                          {runtimeStatus || 'Click "Run App" to start the dev server. The preview will appear here once it\'s running.'}
                        </p>
                        <button
                          onClick={runProject}
                          style={{
                            width: '100%', padding: '10px 0', fontSize: 13, borderRadius: 8,
                            background: 'rgba(78,201,176,0.15)', border: '1px solid rgba(78,201,176,0.35)',
                            color: '#4ec9b0', cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          }}
                        >
                          <FiPlay size={14} /> Run App
                        </button>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      key={key}
                      title={tab.title || 'Preview'}
                      onLoad={() => markTabLoaded(tab.id)}
                      srcDoc={tab.tabType === 'static' ? tabSrcDocs[tab.id] : undefined}
                      src={tab.tabType === 'port' && tab.portUrl ? tab.portUrl : undefined}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-pointer-lock"
                      style={{
                        ...vpStyle,
                        border: 'none',
                        flexShrink: 0,
                        overflow: 'hidden',
                        transition: 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease',
                        opacity: loaded ? 1 : 0,
                        willChange: 'opacity',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── DevTools Panel ── */}
          {panels.devtools && (
            <div style={{
              height: panels.devtoolsHeight, flexShrink: 0,
              borderTop: '1px solid #3e3e3e', background: '#1a1a1a',
              display: 'flex', flexDirection: 'column', position: 'relative',
            }}>
              {/* Resize handle */}
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
              {/* DevTools tab bar */}
              <div style={{
                display: 'flex', alignItems: 'center', height: 30, flexShrink: 0,
                background: '#252526', borderBottom: '1px solid #3e3e3e',
              }}>
                {(['console', 'styles', 'network'] as DevToolsTab[]).map(t => (
                  <div
                    key={t}
                    onClick={() => setDevtoolsTab(t)}
                    style={{
                      padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center',
                      fontSize: 12, cursor: 'pointer',
                      color: devtoolsTab === t ? '#ccc' : '#888',
                      borderBottom: devtoolsTab === t ? '2px solid var(--editor-amber)' : '2px solid transparent',
                      fontFamily: 'var(--app-font-sans)', userSelect: 'none',
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
              {/* DevTools content */}
              <div style={{ flex: 1, overflow: 'auto', fontFamily: 'var(--app-font-mono)', fontSize: 12 }}>
                {devtoolsTab === 'console' && (
                  consoleEntries.length === 0 ? (
                    <div style={{ padding: 12, color: '#555', fontSize: 12 }}>
                      No console output. JavaScript console.log() calls will appear here.
                    </div>
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

/* ── Small helper sub-components ── */

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      padding: '7px 12px 5px', fontSize: 10, color: '#555',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
      borderTop: '1px solid #333', borderBottom: '1px solid #333',
      display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
    }}>
      {icon} {label}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ padding: '6px 12px', fontSize: 12, color: '#555', fontStyle: 'italic' }}>
      {text}
    </div>
  );
}

function DropdownFileBtn({ icon, name, badge, badgeColor, onClick }: {
  icon: React.ReactNode; name: string; badge: string; badgeColor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '6px 12px',
        background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left', fontSize: 12, color: '#ccc', fontFamily: 'inherit',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {icon}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <span style={{
        fontSize: 10, color: badgeColor, flexShrink: 0,
        background: '#1e1e1e', padding: '1px 5px', borderRadius: 3,
        border: `1px solid ${badgeColor}44`,
      }}>
        {badge}
      </span>
    </button>
  );
}

/* ── Inline Image Viewer ── */
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
              maxWidth: 'none', transform: `scale(${zoom})`, transformOrigin: 'center center',
              display: 'block', imageRendering: zoom > 2 ? 'pixelated' : 'auto',
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
