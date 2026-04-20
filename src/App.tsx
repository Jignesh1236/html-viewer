import React, { useEffect, useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useEditorStore } from './store/editorStore';
import MenuBar from './components/MenuBar';
import FilePanel from './components/FilePanel';
import CodeEditor, { aiControl, clearAiCache } from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import VisualEditor from './components/VisualEditor';
import PropertiesPanel from './components/PropertiesPanel';
import TimelinePanel from './components/TimelinePanel';
import TerminalPane from './components/TerminalPane';
import GitPanel from './components/GitPanel';
import { useContextMenu } from './components/ContextMenu';
import {
  FiCode, FiEye, FiLayout, FiDownload, FiRefreshCw, FiFolder,
  FiSliders, FiClock, FiTerminal, FiSearch, FiGitBranch, FiX,
  FiMaximize2, FiMinimize2,
} from 'react-icons/fi';
import { exportProject } from './utils/export';
import { writeFileToContainer, isContainerBooted } from './utils/webContainerRuntime';

export type Mode = 'code' | 'visual' | 'split';

/* ─── AI Status Button ─── */
function AiStatusButton() {
  const [aiState, setAiState] = useState(aiControl.state);
  useEffect(() => {
    const h = () => setAiState(aiControl.state);
    aiControl.listeners.add(h);
    return () => { aiControl.listeners.delete(h); };
  }, []);
  const handleClick = () => { clearAiCache(); aiControl.triggerManual?.(); };
  const cfg = {
    idle:    { dot: 'rgba(255,255,255,0.4)', text: '✦ AI', bg: 'transparent' },
    loading: { dot: '#d29922',               text: '⟳ AI', bg: 'rgba(0,0,0,0.2)' },
    ready:   { dot: '#3fb950',               text: '✓ AI', bg: 'rgba(0,0,0,0.2)' },
    error:   { dot: '#ff7b72',               text: '✗ AI', bg: 'rgba(0,0,0,0.2)' },
  }[aiState];
  return (
    <button onClick={handleClick} title="AI Suggestions"
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: '100%', background: cfg.bg, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#ffffffcc', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.03em', transition: 'background 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.25)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = cfg.bg; }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0, boxShadow: aiState !== 'idle' ? `0 0 6px ${cfg.dot}` : 'none' }} />
      {cfg.text}
    </button>
  );
}

/* ─── Mobile check ─── */
function useIsMobile() {
  const [mob, setMob] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mob;
}

/* ─── Types ─── */
type SidebarView = 'files' | 'search' | 'git' | null;
type BottomView  = 'terminal' | 'timeline';
type EditorTab   = 'code' | 'preview' | 'visual' | 'properties';

const LS = {
  sidebar:    'hev-sidebar-v1',
  terminal:   'hev-terminal-v1',
  bottomView: 'hev-bottom-view-v1',
  openTabs:   'hev-open-tabs-v1',
  activeTab:  'hev-active-tab-v1',
  mode:       'hev-mode-v1',
};
function ls<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; }
}
function sv(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/* ─── Resize handle ─── */
function ResizeBar({ dir }: { dir: 'h' | 'v' }) {
  const [hov, setHov] = useState(false);
  const isV = dir === 'v';
  return (
    <PanelResizeHandle
      style={isV
        ? { width: 4, background: 'transparent', cursor: 'col-resize', flexShrink: 0, position: 'relative', zIndex: 10, transition: 'background 0.15s' }
        : { height: 4, background: 'transparent', cursor: 'row-resize', flexShrink: 0, position: 'relative', zIndex: 10, transition: 'background 0.15s' }
      }
      onDragging={dragging => setHov(dragging)}
    >
      <div style={isV
        ? { position: 'absolute', inset: 0, background: hov ? 'rgba(0,122,204,0.7)' : 'rgba(255,255,255,0.04)', transition: 'background 0.15s' }
        : { position: 'absolute', inset: 0, background: hov ? 'rgba(0,122,204,0.7)' : 'rgba(255,255,255,0.04)', transition: 'background 0.15s' }
      }
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      />
    </PanelResizeHandle>
  );
}

/* ─── Activity Bar ─── */
function ActivityBar({ sidebar, onSidebar, terminalOpen, onTerminal }: {
  sidebar: SidebarView;
  onSidebar: (v: SidebarView) => void;
  terminalOpen: boolean;
  onTerminal: () => void;
}) {
  const btns: { id: SidebarView; icon: React.ReactNode; title: string }[] = [
    { id: 'files',  icon: <FiFolder size={21} />,    title: 'Explorer (Ctrl+Shift+E)' },
    { id: 'search', icon: <FiSearch size={21} />,    title: 'Search (Ctrl+Shift+F)' },
    { id: 'git',    icon: <FiGitBranch size={21} />, title: 'Source Control' },
  ];
  return (
    <div style={{ width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#2c2c2c', borderRight: '1px solid #1b1b1b', userSelect: 'none' }}>
      {btns.map(b => (
        <button key={b.id ?? ''} title={b.title}
          onClick={() => onSidebar(sidebar === b.id ? null : b.id)}
          style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: sidebar === b.id ? '#fff' : '#858585', borderLeft: `2px solid ${sidebar === b.id ? '#007acc' : 'transparent'}`, transition: 'color 0.1s', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = sidebar === b.id ? '#fff' : '#858585'; }}
        >{b.icon}</button>
      ))}
      <div style={{ flex: 1 }} />
      <button title="Toggle Terminal (Ctrl+`)"
        onClick={onTerminal}
        style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: terminalOpen ? '#3fb950' : '#858585', borderLeft: `2px solid ${terminalOpen ? '#3fb950' : 'transparent'}`, transition: 'color 0.1s', flexShrink: 0, marginBottom: 6 }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = terminalOpen ? '#3fb950' : '#858585'; }}
      ><FiTerminal size={21} /></button>
    </div>
  );
}

/* ─── Tab Row ─── */
const TAB_META: Record<EditorTab, { label: string; icon: React.ReactNode }> = {
  code:       { label: 'Code Editor',    icon: <FiCode size={12} /> },
  preview:    { label: 'Preview',        icon: <FiEye size={12} /> },
  visual:     { label: 'Visual Editor',  icon: <FiLayout size={12} /> },
  properties: { label: 'Properties',     icon: <FiSliders size={12} /> },
};

function TabRow({ tabs, active, onTab, onClose, mode, onMode }: {
  tabs: EditorTab[];
  active: EditorTab;
  onTab: (t: EditorTab) => void;
  onClose: (t: EditorTab) => void;
  mode: Mode;
  onMode: (m: Mode) => void;
}) {
  return (
    <div style={{ height: 35, flexShrink: 0, display: 'flex', alignItems: 'stretch', background: '#252526', borderBottom: '1px solid #1b1b1b', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
        {tabs.map(tab => {
          const isActive = active === tab;
          return (
            <div key={tab}
              onClick={() => onTab(tab)}
              className="tab-item"
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: '100%', padding: '0 14px 0 12px', cursor: 'pointer', flexShrink: 0, background: isActive ? '#1e1e1e' : 'transparent', borderBottom: `2px solid ${isActive ? '#007acc' : 'transparent'}`, borderRight: '1px solid #1b1b1b', color: isActive ? '#cccccc' : '#8a8a8a', fontSize: 12, whiteSpace: 'nowrap', transition: 'color 0.1s, background 0.1s', userSelect: 'none' }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                const closeBtn = (e.currentTarget as HTMLElement).querySelector('.tab-close') as HTMLElement | null;
                if (closeBtn) closeBtn.style.opacity = '1';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                const closeBtn = (e.currentTarget as HTMLElement).querySelector('.tab-close') as HTMLElement | null;
                if (closeBtn) closeBtn.style.opacity = '0';
              }}
            >
              <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>{TAB_META[tab].icon}</span>
              {TAB_META[tab].label}
              <span
                className="tab-close"
                onClick={e => { e.stopPropagation(); onClose(tab); }}
                style={{ display: 'flex', alignItems: 'center', marginLeft: 2, opacity: 0, cursor: 'pointer', color: '#aaa', transition: 'opacity 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff7b72'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#aaa'; }}
                title="Close tab"
              ><FiX size={11} /></span>
            </div>
          );
        })}
      </div>

      {/* Layout switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', borderLeft: '1px solid #1b1b1b', flexShrink: 0 }}>
        {([['split', FiLayout, 'Split (Ctrl+3)'], ['code', FiCode, 'Code (Ctrl+1)'], ['visual', FiEye, 'Visual (Ctrl+2)']] as const).map(([m, Icon, title]) => (
          <button key={m} title={title} onClick={() => onMode(m)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 500, background: mode === m ? 'rgba(0,122,204,0.22)' : 'transparent', border: `1px solid ${mode === m ? 'rgba(0,122,204,0.5)' : 'transparent'}`, color: mode === m ? '#58a6ff' : '#767676', fontFamily: 'inherit', transition: 'all 0.1s' }}
          >
            <Icon size={12} />{m === 'split' ? 'Split' : m === 'code' ? 'Code' : 'Visual'}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Panel Bottom Header ─── */
function BottomHeader({ view, onView, onClose, maximized, onMaximize }: {
  view: BottomView; onView: (v: BottomView) => void;
  onClose: () => void; maximized: boolean; onMaximize: () => void;
}) {
  const views: { id: BottomView; label: string; icon: React.ReactNode }[] = [
    { id: 'terminal', label: 'TERMINAL', icon: <FiTerminal size={11} /> },
    { id: 'timeline', label: 'TIMELINE', icon: <FiClock size={11} /> },
  ];
  return (
    <div style={{ height: 35, flexShrink: 0, display: 'flex', alignItems: 'stretch', background: '#1e1e1e', borderTop: '2px solid #007acc', userSelect: 'none' }}>
      {views.map(v => (
        <button key={v.id}
          onClick={() => onView(v.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 16px', background: 'none', border: 'none', borderBottom: `2px solid ${view === v.id ? '#007acc' : 'transparent'}`, color: view === v.id ? '#cccccc' : '#6e7681', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', letterSpacing: '0.05em', transition: 'all 0.1s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = view === v.id ? '#ccc' : '#6e7681'; }}
        >{v.icon}{v.label}</button>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px' }}>
        <button onClick={onMaximize} title={maximized ? 'Restore Panel' : 'Maximize Panel'}
          style={{ background: 'none', border: 'none', color: '#6e7681', cursor: 'pointer', padding: 5, borderRadius: 3, display: 'flex', alignItems: 'center', transition: 'color 0.1s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6e7681'; }}
        >{maximized ? <FiMinimize2 size={13} /> : <FiMaximize2 size={13} />}</button>
        <button onClick={onClose} title="Close Panel"
          style={{ background: 'none', border: 'none', color: '#6e7681', cursor: 'pointer', padding: 5, borderRadius: 3, display: 'flex', alignItems: 'center', transition: 'color 0.1s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff7b72'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6e7681'; }}
        ><FiX size={13} /></button>
      </div>
    </div>
  );
}

/* ─── Sidebar panels ─── */
function SearchPanel() {
  const [q, setQ] = useState('');
  const { files, setActiveFile } = useEditorStore();
  const results = q.length > 1
    ? files.filter(f => f.content?.toLowerCase().includes(q.toLowerCase()))
        .map(f => ({ file: f, count: (f.content?.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length }))
    : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#252526' }}>
      <div style={{ padding: '10px 14px 8px', fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Search</div>
      <div style={{ padding: '0 10px 8px', flexShrink: 0 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search in files…"
          style={{ width: '100%', background: '#3c3c3c', border: '1px solid #494949', borderRadius: 3, color: '#ccc', padding: '5px 8px', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
          onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#007acc'; }}
          onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = '#494949'; }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {results.map(({ file, count }) => (
          <div key={file.id} onClick={() => setActiveFile(file.id)}
            style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div style={{ fontWeight: 600, color: '#ccc' }}>{file.name}</div>
            <div style={{ color: '#6e7681', fontSize: 11 }}>{count} match{count !== 1 ? 'es' : ''}</div>
          </div>
        ))}
        {q.length > 1 && results.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12, color: '#555' }}>No results found.</div>}
      </div>
    </div>
  );
}

/* ─── Sidebar header ─── */
function SidebarHeader({ view, onClose }: { view: SidebarView; onClose: () => void }) {
  const labels: Record<NonNullable<SidebarView>, string> = { files: 'EXPLORER', search: 'SEARCH', git: 'SOURCE CONTROL' };
  return (
    <div style={{ height: 35, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#252526', borderBottom: '1px solid #1b1b1b', userSelect: 'none' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '0.08em' }}>{view ? labels[view] : ''}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6e7681', cursor: 'pointer', padding: 3, borderRadius: 3, display: 'flex', alignItems: 'center', transition: 'color 0.1s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6e7681'; }}
      ><FiX size={13} /></button>
    </div>
  );
}

/* ─── Mobile App ─── */
function MobileApp() {
  const [tab, setTab] = useState<'code' | 'preview' | 'files' | 'props'>('code');
  const { files, mode, setMode, notification, showNotification } = useEditorStore();
  const TABS = [
    { id: 'files' as const, icon: <FiFolder size={18} />, label: 'Files' },
    { id: 'code' as const, icon: <FiCode size={18} />, label: 'Code' },
    { id: 'preview' as const, icon: <FiEye size={18} />, label: 'Preview' },
    { id: 'props' as const, icon: <FiSliders size={18} />, label: 'Props' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', background: '#1e1e1e', color: '#ccc', fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 46, flexShrink: 0, background: '#2c2c2c', borderBottom: '1px solid #3a3a3a', padding: '0 12px', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc', flex: 1 }}>HTML Editor</span>
        <button onClick={() => exportProject(files).then(() => showNotification('Exported project.zip'))}
          style={{ padding: '5px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer', background: 'rgba(0,122,204,0.12)', border: '1px solid rgba(0,122,204,0.3)', color: '#58a6ff', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
          <FiDownload size={12} /> ZIP
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: tab === 'files' ? 'flex' : 'none', flexDirection: 'column', height: '100%', background: '#252526' }}><FilePanel hideHeader /></div>
        <div style={{ display: tab === 'code' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}><CodeEditor /></div>
        <div style={{ display: tab === 'preview' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>{mode === 'visual' ? <VisualEditor /> : <PreviewPane />}</div>
        <div style={{ display: tab === 'props' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflowY: 'auto' }}><PropertiesPanel hideHeader /></div>
      </div>
      <div style={{ display: 'flex', height: 56, flexShrink: 0, background: '#252526', borderTop: '1px solid #1b1b1b', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: active ? 'rgba(0,122,204,0.08)' : 'transparent', borderTop: `2px solid ${active ? '#007acc' : 'transparent'}`, color: active ? '#58a6ff' : '#666', transition: 'all 0.15s' }}>
              {t.icon}
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      {notification && <div style={{ position: 'fixed', bottom: 68, left: '50%', transform: 'translateX(-50%)', zIndex: 100000, background: '#2d2d2d', border: '1px solid #454545', borderRadius: 6, padding: '8px 18px', fontSize: 13, color: '#ccc', boxShadow: '0 4px 16px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>{notification}</div>}
    </div>
  );
}

/* ─── App ─── */
export default function App() {
  const isMob = useIsMobile();
  if (isMob) return <MobileApp />;
  return <DesktopApp />;
}

function DesktopApp() {
  const { mode, setMode, notification, files, showNotification, activeFileId } = useEditorStore();
  const { show: showCtx, element: ctxEl } = useContextMenu();

  /* ── State ── */
  const [sidebar, setSidebar]         = useState<SidebarView>(() => ls(LS.sidebar, 'files'));
  const [terminalOpen, setTerminalOpen] = useState<boolean>(() => ls(LS.terminal, false));
  const [bottomView, setBottomView]   = useState<BottomView>(() => ls(LS.bottomView, 'terminal'));
  const [panelMax, setPanelMax]       = useState(false);
  const [openTabs, setOpenTabs]       = useState<EditorTab[]>(() => ls<EditorTab[]>(LS.openTabs, ['code', 'preview']));
  const [activeTab, setActiveTab]     = useState<EditorTab>(() => ls<EditorTab>(LS.activeTab, 'code'));

  /* Persist */
  useEffect(() => { sv(LS.sidebar, sidebar); },      [sidebar]);
  useEffect(() => { sv(LS.terminal, terminalOpen); }, [terminalOpen]);
  useEffect(() => { sv(LS.bottomView, bottomView); }, [bottomView]);
  useEffect(() => { sv(LS.activeTab, activeTab); },  [activeTab]);
  useEffect(() => { sv(LS.openTabs, openTabs); },    [openTabs]);

  /* Init mode from store */
  useEffect(() => {
    const saved = ls<Mode>(LS.mode, 'split');
    setMode(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Helpers ── */
  const ensureTab = useCallback((tab: EditorTab) => {
    setOpenTabs(t => t.includes(tab) ? t : [...t, tab]);
  }, []);

  const openTab = useCallback((tab: EditorTab) => {
    setOpenTabs(t => t.includes(tab) ? t : [...t, tab]);
    setActiveTab(tab);
  }, []);

  const closeTab = useCallback((tab: EditorTab) => {
    setOpenTabs(prev => {
      const next = prev.filter(x => x !== tab);
      return next.length === 0 ? ['code'] : next;
    });
    setActiveTab(prev => prev === tab ? (openTabs.find(x => x !== tab) ?? 'code') : prev);
  }, [openTabs]);

  const handleMode = useCallback((m: Mode) => {
    setMode(m);
    sv(LS.mode, m);
    if (m === 'code') {
      setOpenTabs(['code']);
      setActiveTab('code');
    } else if (m === 'visual') {
      setOpenTabs(t => {
        const next = t.filter(x => x !== 'preview' && x !== 'code');
        if (!next.includes('visual')) next.push('visual');
        if (!next.includes('properties')) next.push('properties');
        return next;
      });
      setActiveTab('visual');
    } else {
      setOpenTabs(t => {
        const next = [...t];
        if (!next.includes('code')) next.unshift('code');
        if (!next.includes('preview')) next.push('preview');
        return next.filter(x => x !== 'visual' && x !== 'properties');
      });
      setActiveTab('code');
    }
  }, [setMode]);

  const toggleTerminal = useCallback(() => setTerminalOpen(t => !t), []);
  const toggleSidebar  = useCallback((v: SidebarView) => setSidebar(s => s === v ? null : v), []);

  /* ── File → Container sync ── */
  useEffect(() => {
    if (!isContainerBooted()) return;
    files.forEach(f => {
      if (f.type === 'image') return;
      const path = f.folder ? `${f.folder}/${f.name}` : f.name;
      writeFileToContainer(path, f.content || '').catch(() => {});
    });
  }, [files]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key === 'E') { e.preventDefault(); toggleSidebar('files'); }
      if (mod && e.shiftKey && e.key === 'F') { e.preventDefault(); toggleSidebar('search'); }
      if (mod && e.key === '`')  { e.preventDefault(); toggleTerminal(); }
      if (mod && e.key === '1')  { e.preventDefault(); handleMode('code'); }
      if (mod && e.key === '2')  { e.preventDefault(); handleMode('visual'); }
      if (mod && e.key === '3')  { e.preventDefault(); handleMode('split'); }
      if (mod && e.key === 's')  { e.preventDefault(); showNotification('All files saved ✓'); }
      if (mod && e.key === 'e')  { e.preventDefault(); exportProject(files).then(() => showNotification('Exported project.zip')); }
      if (mod && e.key === 'r')  { e.preventDefault(); useEditorStore.getState().refreshPreview(); }
      if (e.key === 'Escape')    { useEditorStore.getState().setSelectedElement(null); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [files, handleMode, showNotification, toggleSidebar, toggleTerminal]);

  const activeFileName = files.find(f => f.id === activeFileId)?.name ?? '';

  /* ── Render editor content ── */
  function renderEditor() {
    if (mode === 'split') {
      return (
        <PanelGroup direction="horizontal" id="split-editors" style={{ flex: 1, minHeight: 0 }}>
          <Panel id="split-code" order={1} minSize={15}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#2a2a2a', borderBottom: '1px solid #1b1b1b', fontSize: 11, color: '#767676', gap: 5 }}>
                <FiCode size={11} /> Code Editor
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><CodeEditor /></div>
            </div>
          </Panel>
          <ResizeBar dir="v" />
          <Panel id="split-preview" order={2} minSize={15}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#2a2a2a', borderBottom: '1px solid #1b1b1b', fontSize: 11, color: '#767676', gap: 5 }}>
                <FiEye size={11} /> Preview
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><PreviewPane /></div>
            </div>
          </Panel>
        </PanelGroup>
      );
    }
    if (mode === 'visual') {
      return (
        <PanelGroup direction="horizontal" id="visual-editors" style={{ flex: 1, minHeight: 0 }}>
          <Panel id="visual-canvas" order={1} minSize={35}>
            <VisualEditor />
          </Panel>
          <ResizeBar dir="v" />
          <Panel id="visual-props" order={2} defaultSize={28} minSize={20} maxSize={48}>
            <PropertiesPanel hideHeader />
          </Panel>
        </PanelGroup>
      );
    }
    /* Code-only */
    switch (activeTab) {
      case 'code':       return <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><CodeEditor /></div>;
      case 'preview':    return <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><PreviewPane /></div>;
      case 'visual':     return <VisualEditor />;
      case 'properties': return <PropertiesPanel hideHeader />;
      default:           return <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><CodeEditor /></div>;
    }
  }

  /* Fake wins list for MenuBar (adapted for new layout) */
  const menuWins = [
    { id: 'files' as const,      title: 'File Explorer',          visible: sidebar === 'files',  minimized: false, docked: true },
    { id: 'terminal' as const,   title: 'Terminal',               visible: terminalOpen,          minimized: false, docked: true },
    { id: 'code' as const,       title: 'Code Editor',            visible: openTabs.includes('code'),       minimized: false, docked: true },
    { id: 'preview' as const,    title: 'Preview',                visible: openTabs.includes('preview'),    minimized: false, docked: true },
    { id: 'properties' as const, title: 'Properties',             visible: openTabs.includes('properties'), minimized: false, docked: true },
    { id: 'timeline' as const,   title: 'Timeline',               visible: bottomView === 'timeline' && terminalOpen, minimized: false, docked: true },
  ];

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#1e1e1e', color: '#cccccc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13, overflow: 'hidden' }}
      onContextMenu={e => {
        if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
        e.preventDefault();
        if ((e.target as HTMLElement).closest('[data-file-item],[data-folder-item],button')) return;
        showCtx(e, [
          { label: 'Split Layout',  icon: '3', action: () => handleMode('split') },
          { label: 'Code Layout',   icon: '1', action: () => handleMode('code') },
          { label: 'Visual Layout', icon: '2', action: () => handleMode('visual') },
          { separator: true, label: '' },
          { label: 'Toggle Terminal', icon: '`', action: toggleTerminal },
          { label: 'Refresh Preview', icon: '↻', action: () => useEditorStore.getState().refreshPreview() },
          { label: 'Export ZIP', icon: '↓', action: () => exportProject(files).then(() => showNotification('Exported project.zip')) },
        ]);
      }}
    >
      {/* ── Title / Menu Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 30, flexShrink: 0, background: '#323233', borderBottom: '1px solid #1b1b1b', position: 'relative', zIndex: 9999 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, background: 'linear-gradient(135deg, #e34c26 0%, #f06529 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0 }}>H</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#cccccc', letterSpacing: '0.01em' }}>HTML Editor</span>
        </div>

        {/* MenuBar dropdowns */}
        <MenuBar
          wins={menuWins}
          onToggleWin={(id) => {
            if (id === 'files') toggleSidebar('files');
            else if (id === 'terminal') toggleTerminal();
            else if (id === 'code') { ensureTab('code'); setActiveTab('code'); }
            else if (id === 'preview') { ensureTab('preview'); setActiveTab('preview'); }
            else if (id === 'properties') { ensureTab('properties'); setActiveTab('properties'); }
            else if (id === 'timeline') { setBottomView('timeline'); setTerminalOpen(true); }
          }}
          onOpenWin={(id) => {
            if (id === 'files') setSidebar('files');
            else if (id === 'terminal') { setTerminalOpen(true); setBottomView('terminal'); }
            else if (id === 'timeline') { setTerminalOpen(true); setBottomView('timeline'); }
            else if (id === 'code') openTab('code');
            else if (id === 'preview') openTab('preview');
            else if (id === 'properties') openTab('properties');
          }}
          onResetLayout={() => {
            setSidebar('files');
            setOpenTabs(['code', 'preview']);
            setActiveTab('code');
            setTerminalOpen(false);
            handleMode('split');
            showNotification('Layout reset');
          }}
          onApplyModePreset={handleMode}
        />

        {/* Active file indicator (center) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#666', letterSpacing: '0.01em' }}>{activeFileName}</span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', flexShrink: 0 }}>
          <TitleBtn title="Refresh Preview (Ctrl+R)" icon={<FiRefreshCw size={13} />} onClick={() => useEditorStore.getState().refreshPreview()} />
          <TitleBtn title="Export ZIP (Ctrl+E)" icon={<FiDownload size={13} />} onClick={() => exportProject(files).then(() => showNotification('Exported project.zip'))} />
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Activity Bar */}
        <ActivityBar
          sidebar={sidebar}
          onSidebar={toggleSidebar}
          terminalOpen={terminalOpen}
          onTerminal={toggleTerminal}
        />

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          <PanelGroup direction="horizontal" id="main-h" style={{ flex: 1, minHeight: 0 }}>

            {/* Sidebar */}
            {sidebar && (
              <>
                <Panel id="sidebar-panel" order={1} defaultSize={18} minSize={10} maxSize={40}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#252526', borderRight: '1px solid #1b1b1b' }}>
                    <SidebarHeader view={sidebar} onClose={() => setSidebar(null)} />
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                      {sidebar === 'files'  && <FilePanel hideHeader />}
                      {sidebar === 'search' && <SearchPanel />}
                      {sidebar === 'git'    && <GitPanel />}
                    </div>
                  </div>
                </Panel>
                <ResizeBar dir="v" />
              </>
            )}

            {/* Editor + bottom panel */}
            <Panel id="editor-panel" order={2} minSize={25} style={{ position: 'relative' }}>
              <PanelGroup direction="vertical" id="main-v" style={{ height: '100%' }}>

                {/* Editor pane */}
                <Panel id="editor-top" order={1} minSize={15} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  {/* Tab bar */}
                  <TabRow
                    tabs={openTabs}
                    active={activeTab}
                    onTab={setActiveTab}
                    onClose={closeTab}
                    mode={mode}
                    onMode={handleMode}
                  />
                  {/* Content */}
                  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {renderEditor()}
                  </div>
                </Panel>

                {/* Bottom panel */}
                {terminalOpen && !panelMax && (
                  <>
                    <ResizeBar dir="h" />
                    <Panel id="bottom-panel" order={2} defaultSize={28} minSize={8} maxSize={75} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <BottomHeader
                        view={bottomView} onView={setBottomView}
                        onClose={() => setTerminalOpen(false)}
                        maximized={false} onMaximize={() => setPanelMax(true)}
                      />
                      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                        {bottomView === 'terminal' && <TerminalPane />}
                        {bottomView === 'timeline' && <TimelinePanel onClose={() => setTerminalOpen(false)} />}
                      </div>
                    </Panel>
                  </>
                )}
              </PanelGroup>

              {/* Maximized overlay */}
              {terminalOpen && panelMax && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
                  <BottomHeader
                    view={bottomView} onView={setBottomView}
                    onClose={() => { setTerminalOpen(false); setPanelMax(false); }}
                    maximized onMaximize={() => setPanelMax(false)}
                  />
                  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    {bottomView === 'terminal' && <TerminalPane />}
                    {bottomView === 'timeline' && <TimelinePanel onClose={() => setPanelMax(false)} />}
                  </div>
                </div>
              )}
            </Panel>
          </PanelGroup>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 24, flexShrink: 0, background: '#007acc', fontSize: 11, color: 'rgba(255,255,255,0.95)', zIndex: 200, userSelect: 'none' }}>
        {/* Left */}
        <StatusItem
          onClick={() => toggleSidebar('git')}
          icon={<FiGitBranch size={12} />}
          label="main"
          title="Source Control"
          bordered="right"
        />
        <StatusItem
          onClick={() => handleMode(mode === 'split' ? 'code' : mode === 'code' ? 'visual' : 'split')}
          icon={mode === 'split' ? <FiLayout size={11} /> : mode === 'code' ? <FiCode size={11} /> : <FiEye size={11} />}
          label={mode === 'split' ? 'Split' : mode === 'code' ? 'Code' : 'Visual'}
          title="Click to cycle layout (Ctrl+1/2/3)"
          bordered="right"
        />
        <div style={{ flex: 1 }} />
        {/* Right */}
        <StatusItem label={activeFileName} title="Active file" bordered="left" />
        <StatusItem label={`${files.length} files`} title="Total files" bordered="left" />
        <StatusItem
          onClick={toggleTerminal}
          icon={<FiTerminal size={11} />}
          label="Terminal"
          title="Toggle Terminal (Ctrl+`)"
          bordered="left"
          highlight={terminalOpen}
        />
        <AiStatusButton />
      </div>

      {/* Toast */}
      {notification && (
        <div style={{ position: 'fixed', bottom: 36, right: 16, zIndex: 100000, background: '#2d2d2d', border: '1px solid #454545', borderLeft: '3px solid #007acc', borderRadius: 4, padding: '8px 14px', fontSize: 12, color: '#ccc', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', pointerEvents: 'none', maxWidth: 340 }}>
          {notification}
        </div>
      )}

      {ctxEl}

      {/* Global file upload shim */}
      <input
        id="global-file-upload"
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          const fs = e.target.files;
          if (!fs) return;
          Array.from(fs).forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
              const { addFile } = useEditorStore.getState();
              const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
              const isImg = ['png','jpg','jpeg','gif','webp','svg','ico'].includes(ext);
              addFile({
                id: file.name,
                name: file.name,
                type: isImg ? 'image' : ext === 'css' ? 'css' : ext === 'js' ? 'js' : ext === 'html' ? 'html' : 'other',
                content: isImg ? '' : String(ev.target?.result ?? ''),
                url: isImg ? URL.createObjectURL(file) : undefined,
                mimeType: file.type,
              });
            };
            reader.readAsText(file);
          });
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* ─── Small helpers ─── */
function TitleBtn({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid transparent', color: '#888', fontFamily: 'inherit', transition: 'all 0.1s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
    >{icon}</button>
  );
}

function StatusItem({ icon, label, title, onClick, bordered, highlight }: {
  icon?: React.ReactNode;
  label: string;
  title?: string;
  onClick?: () => void;
  bordered?: 'left' | 'right';
  highlight?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: bordered === 'left' ? '1px solid rgba(255,255,255,0.15)' : undefined,
        borderRight: bordered === 'right' ? '1px solid rgba(255,255,255,0.15)' : undefined,
        background: highlight ? 'rgba(0,0,0,0.2)' : 'transparent',
        transition: 'background 0.1s',
        fontWeight: highlight ? 600 : 400,
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.2)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = highlight ? 'rgba(0,0,0,0.2)' : 'transparent'; }}
    >
      {icon}{label}
    </div>
  );
}
