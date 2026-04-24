import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Router, Route, Switch } from 'wouter';
import Documentation from './pages/Documentation';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { useEditorStore } from './store/editorStore';
import MenuBar from './components/MenuBar';
import FilePanel from './components/FilePanel';
import CodeEditor, { aiControl, clearAiCache } from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import VisualEditor from './components/VisualEditor';
import PropertiesPanel from './components/PropertiesPanel';
import TimelinePanel from './components/TimelinePanel';
import ComponentSidebar from './components/ComponentSidebar';
import FloatingWindow, { WinRect, showCapture, hideCapture } from './components/FloatingWindow';
import { useContextMenu } from './components/ContextMenu';
import { FiCode, FiEye, FiLayout, FiDownload, FiRefreshCw, FiFolder, FiSliders, FiClock, FiMonitor, FiBox, FiX } from 'react-icons/fi';
import { exportProject } from './utils/export';

/* ─── Non-intrusive AdSense Banner (can be dismissed) ─── */
const EditorAdBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('editor-ad-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('editor-ad-dismissed', 'true');
    } catch {}
  };

  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      /* AdSense blocked or not loaded */
    }
  }, []);

  if (dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 30,
      right: 16,
      zIndex: 9999,
      background: '#1e1e1e',
      border: '1px solid #3e3e3e',
      borderRadius: 8,
      padding: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      maxWidth: 300,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: '#555', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Advertisement</span>
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 2, display: 'flex' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#999'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
        >
          <FiX size={12} />
        </button>
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-1826192920016393"
        data-ad-slot="7872622325"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

/* ─── AI Status Button (shown in bottom status bar) ─── */
function AiStatusButton() {
  const [aiState, setAiState] = useState(aiControl.state);

  useEffect(() => {
    const handler = () => setAiState(aiControl.state);
    aiControl.listeners.add(handler);
    return () => { aiControl.listeners.delete(handler); };
  }, []);

  const handleClick = () => {
    clearAiCache();
    aiControl.triggerManual?.();
  };

  const cfg = {
    idle:    { dot: 'rgba(255,255,255,0.5)', dotGlow: false, text: '✦ AI',  bg: 'rgba(0,0,0,0.15)',  label: 'Click to get AI suggestion' },
    loading: { dot: '#fbbf24',               dotGlow: true,  text: '⟳ AI…', bg: 'rgba(0,0,0,0.25)',  label: 'AI is thinking…' },
    ready:   { dot: '#4ade80',               dotGlow: true,  text: '✓ AI',  bg: 'rgba(0,0,0,0.25)',  label: 'Suggestion ready — Tab to accept · Click to refresh' },
    error:   { dot: '#f87171',               dotGlow: false, text: '✗ AI',  bg: 'rgba(0,0,0,0.25)',  label: 'AI error — click to retry' },
  }[aiState];

  return (
    <button
      title={cfg.label}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '0 10px',
        height: '100%',
        background: cfg.bg,
        border: 'none',
        borderLeft: '1px solid rgba(255,255,255,0.15)',
        color: '#ffffff',
        cursor: 'pointer',
        fontSize: 11,
        fontFamily: 'inherit',
        fontWeight: 600,
        letterSpacing: '0.04em',
        transition: 'background 0.15s',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = cfg.bg; }}
    >
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: cfg.dot,
        display: 'inline-block',
        flexShrink: 0,
        boxShadow: cfg.dotGlow ? `0 0 6px ${cfg.dot}, 0 0 10px ${cfg.dot}88` : 'none',
        transition: 'background 0.2s, box-shadow 0.2s',
      }} />
      {cfg.text}
    </button>
  );
}

/* ─── mobile hook ─── */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

/* ─────────────────────────────────────────
   Types
   ───────────────────────────────────────── */
export type WinId = 'files' | 'code' | 'preview' | 'properties' | 'timeline' | 'components';
export type Mode = 'code' | 'visual' | 'split';
export interface WinState {
  id: WinId;
  title: string;
  rect: WinRect;
  visible: boolean;
  minimized: boolean;
  zIndex: number;
  docked: boolean;
}

interface DockSizes {
  leftW: number;         // width of left (files) panel
  rightW: number;        // width of right panel in split mode (preview)
  visualRightW: number;  // width of right panel in visual mode (properties)
  bottomH: number;       // height of bottom (timeline) panel
}

const WIN_ICONS: Record<WinId, React.ReactNode> = {
  files:      <FiFolder size={11} />,
  code:       <FiCode size={11} />,
  preview:    <FiMonitor size={11} />,
  properties: <FiSliders size={11} />,
  timeline:   <FiClock size={11} />,
  components: <FiBox size={11} />,
};

const WIN_LABELS: Record<WinId, string> = {
  files: 'File Explorer', code: 'Code Editor', preview: 'Preview',
  properties: 'Properties', timeline: 'Timeline', components: 'Components',
};

/* ─────────────────────────────────────────
   Dock slot calculator
   ───────────────────────────────────────── */
function getDockRect(id: WinId, wsW: number, wsH: number, mode: Mode, sizes: DockSizes, visible?: Set<WinId>): WinRect | null {
  const { leftW, rightW, visualRightW, bottomH } = sizes;

  if (mode === 'visual') {
    const showFiles = !visible || visible.has('files');
    const showProps = !visible || visible.has('properties');
    const showTL    = !visible || visible.has('timeline');
    const effLeft   = showFiles ? leftW : 0;
    const effRight  = showProps ? visualRightW : 0;
    const effBottom = showTL    ? bottomH : 0;
    const cw = Math.max(160, wsW - effLeft - effRight);

    if (id === 'files'      && showFiles) return { x: 0,               y: 0,             w: leftW,       h: wsH };
    if (id === 'preview')                 return { x: effLeft,          y: 0,             w: cw,          h: wsH - effBottom };
    if (id === 'timeline'   && showTL)    return { x: effLeft,          y: wsH - effBottom, w: cw + effRight, h: bottomH };
    if (id === 'properties' && showProps) return { x: effLeft + cw,     y: 0,             w: visualRightW, h: wsH - effBottom };
    return null;
  } else if (mode === 'code') {
    const showFiles = !visible || visible.has('files');
    const effLeft   = showFiles ? leftW : 0;
    if (id === 'files' && showFiles) return { x: 0,       y: 0, w: leftW,        h: wsH };
    if (id === 'code')               return { x: effLeft,  y: 0, w: wsW - effLeft, h: wsH };
    return null;
  } else {
    // split
    const showFiles   = !visible || visible.has('files');
    const showPreview = !visible || visible.has('preview');
    const effLeft  = showFiles   ? leftW  : 0;
    const effRight = showPreview ? rightW : 0;
    const cw = Math.max(160, wsW - effLeft - effRight);

    if (id === 'files'   && showFiles)   return { x: 0,              y: 0, w: leftW,  h: wsH };
    if (id === 'code')                   return { x: effLeft,         y: 0, w: cw,     h: wsH };
    if (id === 'preview' && showPreview) return { x: effLeft + cw,    y: 0, w: rightW, h: wsH };
    return null;
  }
}

/** All slots that exist in this mode (for snap zones) */
function getSnapSlots(wsW: number, wsH: number, mode: Mode, sizes: DockSizes, visible?: Set<WinId>): { id: WinId; rect: WinRect }[] {
  const ids: WinId[] =
    mode === 'visual' ? ['files', 'preview', 'timeline', 'properties', 'components'] :
    mode === 'code'   ? ['files', 'code', 'components'] :
                        ['files', 'code', 'preview', 'components'];
  return ids.flatMap(id => {
    const r = getDockRect(id, wsW, wsH, mode, sizes, visible);
    return r ? [{ id, rect: r }] : [];
  });
}

function floatingDefault(id: WinId, wsW: number, wsH: number): WinRect {
  const defaults: Record<WinId, WinRect> = {
    files:      { x: 20,  y: 20,  w: 200, h: Math.min(520, wsH - 60) },
    code:       { x: 240, y: 20,  w: Math.max(420, wsW * 0.4),  h: Math.min(580, wsH - 60) },
    preview:    { x: Math.max(240, wsW - Math.max(380, wsW * 0.38) - 20), y: 20, w: Math.max(380, wsW * 0.38), h: Math.min(500, wsH - 80) },
    properties: { x: Math.max(0, wsW - 280), y: 60, w: 265, h: Math.min(440, wsH - 100) },
    timeline:   { x: 20, y: Math.max(80, wsH - 200), w: Math.max(460, wsW * 0.6), h: 185 },
    components: { x: 20, y: 100, w: 220, h: Math.min(400, wsH - 120) },
  };
  return defaults[id];
}

const DEFAULT_DOCK: DockSizes = { leftW: 200, rightW: 420, visualRightW: 240, bottomH: 160 };

function defaultLayout(wsW: number, wsH: number, mode: Mode = 'split'): WinState[] {
  const dockedPerMode: Record<Mode, WinId[]> = {
    code:   ['files', 'code'],
    split:  ['files', 'code', 'preview'],
    visual: ['files', 'preview', 'timeline', 'properties'],
  };
  const dockedSet = new Set(dockedPerMode[mode]);
  const allIds: WinId[] = ['files', 'code', 'preview', 'properties', 'timeline', 'components'];
  return allIds.map((id, i) => ({
    id, title: WIN_LABELS[id],
    rect: floatingDefault(id, wsW, wsH),
    visible: dockedSet.has(id),
    minimized: false,
    zIndex: 10 + i,
    docked: dockedSet.has(id),
  }));
}

const LS_KEY = 'html-editor-win-layout-v6';
const LS_DOCK = 'html-editor-dock-sizes-v2';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeRect(rect: WinRect, wsW: number, wsH: number): WinRect {
  const minW = 140;
  const minH = 100;
  const w = clamp(rect.w, minW, Math.max(minW, wsW));
  const h = clamp(rect.h, minH, Math.max(minH, wsH));
  const x = clamp(rect.x, 0, Math.max(0, wsW - w));
  const y = clamp(rect.y, 0, Math.max(0, wsH - 34));
  return { x, y, w, h };
}

function normalizeLayout(wins: WinState[], wsW: number, wsH: number): WinState[] {
  return wins.map(w => ({ ...w, rect: normalizeRect(w.rect, wsW, wsH) }));
}

function loadLayout(wsW: number, wsH: number): WinState[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as WinState[];
      if (Array.isArray(saved)) {
        // Migration: if saved has 5 windows, add the new 'components' window
        if (saved.length === 5) {
          const allIds: WinId[] = ['files', 'code', 'preview', 'properties', 'timeline', 'components'];
          const savedIds = saved.map(w => w.id);
          const missingIds = allIds.filter(id => !savedIds.includes(id));
          if (missingIds.length > 0) {
            const missingWins = missingIds.map(id => ({
              id,
              title: WIN_LABELS[id],
              rect: floatingDefault(id, wsW, wsH),
              visible: false,
              minimized: false,
              zIndex: 10 + saved.length,
              docked: false,
            }));
            return normalizeLayout([...saved, ...missingWins], wsW, wsH);
          }
        }
        if (saved.length === 6) return normalizeLayout(saved, wsW, wsH);
      }
    }
  } catch {}
  return normalizeLayout(defaultLayout(wsW, wsH), wsW, wsH);
}
function loadDockSizes(): DockSizes {
  try {
    const raw = localStorage.getItem(LS_DOCK);
    if (raw) return { ...DEFAULT_DOCK, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_DOCK };
}
function saveLayout(wins: WinState[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(wins)); } catch {} }
function saveDockSizes(s: DockSizes)  { try { localStorage.setItem(LS_DOCK, JSON.stringify(s)); } catch {} }

let _zTop = 20;
function nextZ() { return ++_zTop; }

/* ─────────────────────────────────────────
   Divider component (resizes docked panels)
   ───────────────────────────────────────── */
interface DividerProps {
  orientation: 'vertical' | 'horizontal';
  pos: number; // pixel position (x for vertical, y for horizontal)
  min: number;
  max: number;
  wsW: number;
  wsH: number;
  onChange: (newPos: number) => void;
}
function DockDivider({ orientation, pos, min, max, onChange }: DividerProps) {
  const [hov, setHov] = useState(false);
  const [drag, setDrag] = useState(false);
  const isV = orientation === 'vertical';

  const onMd = (e: React.MouseEvent) => {
    e.preventDefault();
    setDrag(true);
    showCapture(isV ? 'col-resize' : 'row-resize');
    const startMouse = isV ? e.clientX : e.clientY;
    const startPos = pos;
    const onMv = (ev: MouseEvent) => {
      const delta = (isV ? ev.clientX : ev.clientY) - startMouse;
      onChange(Math.max(min, Math.min(max, startPos + delta)));
    };
    const onUp = () => {
      setDrag(false); hideCapture();
      window.removeEventListener('mousemove', onMv);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  };

  const SIZE = 4; // hit area
  const style: React.CSSProperties = isV
    ? { position: 'absolute', top: 0, bottom: 0, left: pos - SIZE / 2, width: SIZE, cursor: 'col-resize', zIndex: 500 }
    : { position: 'absolute', left: 0, right: 0, top: pos - SIZE / 2, height: SIZE, cursor: 'row-resize', zIndex: 500 };

  return (
    <div
      onMouseDown={onMd}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...style,
        background: (hov || drag) ? 'rgba(100,160,255,0.5)' : 'transparent',
        transition: 'background 0.15s',
      }}
    />
  );
}

/* ─────────────────────────────────────────
   Snap zone overlay (shown while dragging floating windows)
   ───────────────────────────────────────── */
function SnapZonesOverlay({
  slots, dragPos, hoveredSlot,
}: {
  slots: { id: WinId; rect: WinRect }[];
  dragPos: { x: number; y: number } | null;
  hoveredSlot: WinId | null;
}) {
  if (!dragPos) return null;
  return (
    <>
      {slots.map(({ id, rect }) => {
        const isHov = hoveredSlot === id;
        return (
          <div key={id} style={{
            position: 'absolute',
            left: rect.x, top: rect.y, width: rect.w, height: rect.h,
            zIndex: 9000,
            pointerEvents: 'none',
            border: `2px dashed ${isHov ? '#64a0ff' : 'rgba(100,160,255,0.3)'}`,
            background: isHov ? 'rgba(100,160,255,0.12)' : 'rgba(100,160,255,0.04)',
            borderRadius: 4,
            transition: 'all 0.1s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isHov && (
              <div style={{
                background: 'rgba(100,160,255,0.85)', borderRadius: 6,
                padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
                Drop to dock here
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ─────────────────────────────────────────
   Mobile App
   ───────────────────────────────────────── */
type MobileTab = 'code' | 'preview' | 'files' | 'props';

function MobileApp() {
  const [tab, setTab] = useState<MobileTab>('code');
  const { files, mode, setMode, notification, showNotification } = useEditorStore();

  const TABS: { id: MobileTab; icon: React.ReactNode; label: string }[] = [
    { id: 'files',   icon: <FiFolder size={18} />,  label: 'Files'   },
    { id: 'code',    icon: <FiCode size={18} />,    label: 'Code'    },
    { id: 'preview', icon: <FiEye size={18} />,     label: 'Preview' },
    { id: 'props',   icon: <FiSliders size={18} />, label: 'Props'   },
  ];

  const accent = '#e5a45a';
  const bg = '#1e1e1e';
  const bar = '#252526';
  const border = '#3a3a3a';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', background: bg, color: '#ccc', fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'hidden' }}>

      {/* ── Top header ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 46, flexShrink: 0, background: '#323233', borderBottom: `1px solid ${border}`, padding: '0 12px', gap: 10, zIndex: 100 }}>
        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#e34c26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>H</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc', flex: 1 }}>HTML Editor</span>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 2, background: '#1e1e1e', borderRadius: 6, padding: 2 }}>
          {([['split', 'View'], ['visual', 'Visual']] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setTab('preview'); }}
              style={{ padding: '3px 10px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', border: 'none', background: mode === m ? accent : 'transparent', color: mode === m ? '#111' : '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportProject(files).then(() => showNotification('Exported project.zip'))}
          style={{ padding: '5px 10px', fontSize: 11, borderRadius: 5, cursor: 'pointer', background: 'rgba(229,164,90,0.12)', border: `1px solid rgba(229,164,90,0.35)`, color: accent, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
          <FiDownload size={12} /> ZIP
        </button>
      </div>

      {/* ── Panel area ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: tab === 'files' ? 'flex' : 'none', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>
          <FilePanel hideHeader />
        </div>
        <div style={{ display: tab === 'code' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <CodeEditor />
        </div>
        <div style={{ display: tab === 'preview' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          {mode === 'visual' ? <VisualEditor /> : <PreviewPane />}
        </div>
        <div style={{ display: tab === 'props' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <PropertiesPanel hideHeader />
        </div>
      </div>

      {/* ── Bottom tab bar ── */}
      <div style={{ display: 'flex', height: 58, flexShrink: 0, background: bar, borderTop: `1px solid ${border}`, paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100 }}>
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: active ? 'rgba(229,164,90,0.08)' : 'transparent',
              borderTop: `2px solid ${active ? accent : 'transparent'}`,
              color: active ? accent : '#666',
              transition: 'all 0.15s',
            }}>
              {t.icon}
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toast */}
      {notification && (
        <div style={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 1000000, background: '#3c3c3c', border: '1px solid #555', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: '#ccc', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
          {notification}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   App (detects mobile + routing)
   ───────────────────────────────────────── */
export default function App() {
  const isMobile = useIsMobile();
  return (
    <Router>
      <Switch>
        <Route path="/docs" component={Documentation} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/">
          {isMobile ? <MobileApp /> : <DesktopApp />}
        </Route>
      </Switch>
    </Router>
  );
}

function DesktopApp() {
  const { mode, setMode, notification, files, showNotification, activeFileId } = useEditorStore();
  const { show: showCtx, element: ctxEl } = useContextMenu();

  const wsRef = useRef<HTMLDivElement>(null);
  const [wsSize, setWsSize] = useState({ w: 1200, h: 660 });

  useEffect(() => {
    const upd = () => {
      if (wsRef.current) {
        const r = wsRef.current.getBoundingClientRect();
        setWsSize({ w: Math.max(600, r.width), h: Math.max(400, r.height) });
      }
    };
    upd();
    const ro = new ResizeObserver(upd);
    if (wsRef.current) ro.observe(wsRef.current);
    window.addEventListener('resize', upd);
    return () => { ro.disconnect(); window.removeEventListener('resize', upd); };
  }, []);

  const [wins, setWins] = useState<WinState[]>(() => {
    const w = Math.max(600, window.innerWidth);
    const h = Math.max(400, window.innerHeight - 90);
    return loadLayout(w, h);
  });
  const [dockSizes, setDockSizes] = useState<DockSizes>(loadDockSizes);
  const didInitLayoutRef = useRef(false);

  // After workspace size is measured, re-load and clamp layout once.
  useEffect(() => {
    if (didInitLayoutRef.current) return;
    if (!wsRef.current) return;
    didInitLayoutRef.current = true;
    setWins(loadLayout(wsSize.w, wsSize.h));
  }, [wsSize.w, wsSize.h]);

  /* Snap zone drag state */
  const [dragState, setDragState] = useState<{
    winId: WinId;
    pos: { x: number; y: number };
    hovered: WinId | null;
  } | null>(null);

  useEffect(() => { saveLayout(wins); }, [wins]);
  useEffect(() => { saveDockSizes(dockSizes); }, [dockSizes]);

  /* ── Window operations ── */
  const updateWin = useCallback((id: WinId, patch: Partial<WinState>) => {
    setWins(ws => ws.map(w => w.id === id ? { ...w, ...patch } : w));
  }, []);

  const focusWin = useCallback((id: WinId) => {
    setWins(ws => ws.map(w => w.id === id ? { ...w, zIndex: nextZ(), minimized: false } : w));
  }, []);

  const floatWin = useCallback((id: WinId) => {
    const fr = floatingDefault(id, wsSize.w, wsSize.h);
    setWins(ws => ws.map(w =>
      w.id === id ? { ...w, docked: false, zIndex: nextZ(), rect: normalizeRect(fr, wsSize.w, wsSize.h), visible: true, minimized: false } : w
    ));
  }, [wsSize]);

  const dockWin = useCallback((id: WinId) => {
    const slot = getDockRect(id, wsSize.w, wsSize.h, mode as Mode, dockSizes);
    if (!slot) { showNotification(`No dock slot for "${WIN_LABELS[id]}" in ${mode} mode`); return; }
    setWins(ws => ws.map(w => w.id === id ? { ...w, docked: true, zIndex: nextZ(), visible: true } : w));
  }, [wsSize, mode, dockSizes, showNotification]);

  const toggleWin = useCallback((id: WinId) => {
    setWins(ws => ws.map(w =>
      w.id !== id ? w : { ...w, visible: !w.visible, minimized: false, zIndex: !w.visible ? nextZ() : w.zIndex }
    ));
  }, []);

  const openWin = useCallback((id: WinId, asDocked?: boolean) => {
    setWins(ws => ws.map(w => {
      if (w.id !== id) return w;
      const docked = asDocked ?? w.docked;
      return { ...w, visible: true, minimized: false, docked, zIndex: nextZ() };
    }));
  }, []);

  /* ── Mode presets ── */
  const applyModePreset = useCallback((m: Mode) => {
    setMode(m);
    const dockMap: Record<Mode, WinId[]> = {
      code:   ['files', 'code'],
      split:  ['files', 'code', 'preview'],
      visual: ['files', 'preview', 'timeline', 'properties'],
    };
    const visible = new Set(dockMap[m]);
    setWins(ws => ws.map(w => ({
      ...w, visible: visible.has(w.id), docked: visible.has(w.id),
      minimized: false, zIndex: visible.has(w.id) ? nextZ() : w.zIndex,
    })));
  }, [setMode]);

  const resetLayout = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_DOCK);
    setDockSizes({ ...DEFAULT_DOCK });
    setWins(normalizeLayout(defaultLayout(wsSize.w, wsSize.h, mode as Mode), wsSize.w, wsSize.h));
    showNotification('Layout reset to defaults');
  }, [wsSize, mode, showNotification]);

  /* Set of window IDs that are currently visible AND docked — used to compute fill-on-close layout */
  const visibleDockedSet = new Set<WinId>(
    wins.filter(w => w.visible && w.docked).map(w => w.id)
  );

  /* ── Snap zone drag handlers ── */
  const snapSlots = getSnapSlots(wsSize.w, wsSize.h, mode as Mode, dockSizes);
  const SNAP_THRESH = 80; // px from slot edge to trigger snap

  const onDragPos = useCallback((winId: WinId, cx: number, cy: number) => {
    // cx, cy are client coords — need to convert to workspace-relative
    const wsEl = wsRef.current;
    if (!wsEl) return;
    const br = wsEl.getBoundingClientRect();
    const rx = cx - br.left, ry = cy - br.top;

    // Find which slot the cursor is hovering
    let hovered: WinId | null = null;
    for (const { id, rect } of snapSlots) {
      if (rx >= rect.x - SNAP_THRESH && rx <= rect.x + rect.w + SNAP_THRESH &&
          ry >= rect.y - SNAP_THRESH && ry <= rect.y + rect.h + SNAP_THRESH) {
        hovered = id;
        break;
      }
    }
    setDragState({ winId, pos: { x: rx, y: ry }, hovered });
  }, [snapSlots]);

  const onDragEnd = useCallback((winId: WinId, cx: number, cy: number) => {
    setDragState(prev => {
      if (prev?.hovered) {
        // Snap! Dock the window to the hovered slot
        const targetSlot = prev.hovered;
        setTimeout(() => {
          setWins(ws => ws.map(w =>
            w.id === winId ? { ...w, docked: true, zIndex: nextZ() } : w
          ));
        }, 0);
      }
      return null;
    });
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === '1') { e.preventDefault(); applyModePreset('code'); }
      if (mod && e.key === '2') { e.preventDefault(); applyModePreset('visual'); }
      if (mod && e.key === '3') { e.preventDefault(); applyModePreset('split'); }
      if (mod && e.key === 's') { e.preventDefault(); showNotification('All files saved ✓'); }
      if (mod && e.key === 'e') { e.preventDefault(); exportProject(files).then(() => showNotification('Exported project.zip')); }
      if (mod && e.key === 'r') { e.preventDefault(); useEditorStore.getState().refreshPreview(); }
      if (e.key === 'Escape')   { useEditorStore.getState().setSelectedElement(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [files, applyModePreset]);

  const winMap = Object.fromEntries(wins.map(w => [w.id, w])) as Record<WinId, WinState>;
  const activeFileName = files.find(f => f.id === activeFileId)?.name || '';

  /* Effective rect: docked → slot rect (with fill-on-close), floating → saved rect */
  function getEffRect(id: WinId): WinRect {
    const w = winMap[id];
    if (w.docked) return getDockRect(id, wsSize.w, wsSize.h, mode as Mode, dockSizes, visibleDockedSet) ?? w.rect;
    return w.rect;
  }

  function winContent(id: WinId) {
    switch (id) {
      case 'files':      return <FilePanel onClose={() => updateWin('files', { visible: false })} hideHeader />;
      case 'code':       return <CodeEditor />;
      case 'preview':    return mode === 'visual' ? <VisualEditor /> : <PreviewPane />;
      case 'properties': return <PropertiesPanel onClose={() => updateWin('properties', { visible: false })} hideHeader />;
      case 'timeline':   return <TimelinePanel onClose={() => updateWin('timeline', { visible: false })} />;
      case 'components': return <ComponentSidebar onDragStart={() => {}} />;
    }
  }

  /* Dock dividers — only between panels that are actually docked */
  const showLeftDiv  = winMap.files.visible && winMap.files.docked &&
                       (winMap.code.visible && winMap.code.docked || winMap.preview.visible && winMap.preview.docked);
  const showRightDiv = (winMap.code.visible && winMap.code.docked || winMap.preview.visible && winMap.preview.docked) &&
                       (winMap.preview.visible && winMap.preview.docked || winMap.properties.visible && winMap.properties.docked);
  const showBotDiv   = mode === 'visual' && winMap.timeline.visible && winMap.timeline.docked &&
                       winMap.preview.visible && winMap.preview.docked;

  const sortedWins = [...wins].sort((a, b) => {
    if (a.docked !== b.docked) return a.docked ? -1 : 1;
    return a.zIndex - b.zIndex;
  });

  const winTitle: Record<WinId, string> = {
    files: 'File Explorer', code: 'Code Editor',
    preview: mode === 'visual' ? 'Visual Editor' : 'Preview',
    properties: 'Properties', timeline: 'Timeline', components: 'Components',
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#111', color: '#ccc', fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 13, overflow: 'hidden' }}
      onContextMenu={(e) => {
        // Keep native context menu inside editable controls, but prevent it everywhere else.
        if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
        e.preventDefault();
        e.stopPropagation();
        // If a component (like FilePanel rows) wants to handle its own context menu,
        // it should stopPropagation; we avoid showing the global menu for those.
        if ((e.target as HTMLElement).closest('[data-file-item], [data-folder-item], button')) return;
        showCtx(e, [
          { label: 'Mode: Code Layout', icon: '1', action: () => applyModePreset('code') },
          { label: 'Mode: Visual Layout', icon: '2', action: () => applyModePreset('visual') },
          { label: 'Mode: Split Layout', icon: '3', action: () => applyModePreset('split') },
          { separator: true, label: '' },
          { label: 'Refresh Preview', icon: '↻', action: () => useEditorStore.getState().refreshPreview() },
          { label: 'Export ZIP', icon: '📦', action: () => exportProject(files).then(() => showNotification('Exported project.zip')) },
          { separator: true, label: '' },
          { label: 'Reset Layout', icon: '↺', action: () => resetLayout() },
        ]);
      }}
    >

      {/* Global drag-capture overlay */}
      <div id="__drag-capture" style={{ display: 'none', position: 'fixed', inset: 0, zIndex: 999999, background: 'transparent' }} />

      {/* ── Menu Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 30, flexShrink: 0, background: '#323233', borderBottom: '1px solid #3e3e3e', position: 'relative', zIndex: 9999 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, background: '#e34c26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>H</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>HTML Editor</span>
        </div>
        <MenuBar
          wins={wins}
          onToggleWin={toggleWin}
          onOpenWin={openWin}
          onResetLayout={resetLayout}
          onApplyModePreset={applyModePreset}
        />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#555', padding: '0 12px' }}>
          {activeFileName}
        </span>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 36, flexShrink: 0, background: '#2d2d2d', borderBottom: '1px solid #3e3e3e', padding: '0 10px', gap: 4, position: 'relative', zIndex: 9998 }}>
        <span style={{ fontSize: 11, color: '#555', marginRight: 2 }}>Layout:</span>
        {([['split', 'Split', FiLayout, 'Ctrl+3'], ['code', 'Code', FiCode, 'Ctrl+1'], ['visual', 'Visual', FiEye, 'Ctrl+2']] as const).map(([m, label, Icon, sc]) => (
          <button key={m} title={`${label} layout (${sc})`} onClick={() => applyModePreset(m)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', background: mode === m ? 'rgba(229,164,90,0.15)' : 'transparent', border: `1px solid ${mode === m ? 'rgba(229,164,90,0.5)' : 'transparent'}`, color: mode === m ? '#e5a45a' : '#888' }}>
            <Icon size={13} />{label}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: '#3e3e3e', margin: '0 4px' }} />
        <ToolbarBtn title="Refresh (Ctrl+R)" icon={<FiRefreshCw size={13} />} label="Refresh" onClick={() => useEditorStore.getState().refreshPreview()} />
        <ToolbarBtn title="Export ZIP (Ctrl+E)" icon={<FiDownload size={13} />} label="Export" onClick={() => exportProject(files).then(() => showNotification('Exported project.zip'))} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#555' }}>Windows:</span>
        {(['files', 'code', 'preview', 'properties', 'timeline', 'components'] as WinId[]).map(id => {
          const w = winMap[id];
          if (!w) return null;
          const shortLabels: Record<WinId, string> = { files: 'Explorer', code: 'Code', preview: 'Preview', properties: 'Props', timeline: 'Timeline', components: 'Comps' };
          return (
            <button key={id} onClick={() => toggleWin(id)}
              title={w.docked ? `${shortLabels[id]} (docked)` : `${shortLabels[id]} ${w.visible ? '(floating)' : '(hidden)'}`}
              style={{ padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', background: w.visible ? (w.docked ? 'rgba(100,180,255,0.12)' : 'rgba(229,164,90,0.12)') : '#1a1a1a', border: `1px solid ${w.visible ? (w.docked ? 'rgba(100,180,255,0.35)' : 'rgba(229,164,90,0.4)') : '#3e3e3e'}`, color: w.visible ? (w.docked ? '#7ab8f5' : '#e5a45a') : '#666' }}
            >
              {w.docked && w.visible ? '📌' : ''}{shortLabels[id]}
            </button>
          );
        })}
        <button onClick={resetLayout} title="Reset layout"
          style={{ marginLeft: 4, padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#777', fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5a45a'; (e.currentTarget as HTMLElement).style.color = '#e5a45a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3e3e3e'; (e.currentTarget as HTMLElement).style.color = '#777'; }}
        >↺ Reset</button>
      </div>

      {/* ── Workspace ── */}
      <div ref={wsRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#161616' }}>

        {/* Snap zone overlay (shown while dragging a floating window) */}
        <SnapZonesOverlay
          slots={snapSlots}
          dragPos={dragState?.pos ?? null}
          hoveredSlot={dragState?.hovered ?? null}
        />

        {/* Dock dividers (drag to resize docked panels) */}
        {showLeftDiv && (
          <DockDivider
            orientation="vertical"
            pos={dockSizes.leftW}
            min={120} max={Math.max(121, wsSize.w - (mode === 'visual' ? dockSizes.visualRightW : dockSizes.rightW) - 160)}
            wsW={wsSize.w} wsH={wsSize.h}
            onChange={v => setDockSizes(s => ({ ...s, leftW: v }))}
          />
        )}
        {showRightDiv && mode !== 'visual' && (
          <DockDivider
            orientation="vertical"
            pos={wsSize.w - dockSizes.rightW}
            min={Math.max(121, dockSizes.leftW + 160)} max={wsSize.w - 160}
            wsW={wsSize.w} wsH={wsSize.h}
            onChange={v => setDockSizes(s => ({ ...s, rightW: Math.max(160, wsSize.w - v) }))}
          />
        )}
        {showBotDiv && (
          <DockDivider
            orientation="horizontal"
            pos={wsSize.h - dockSizes.bottomH}
            min={100} max={wsSize.h - 80}
            wsW={wsSize.w} wsH={wsSize.h}
            onChange={v => setDockSizes(s => ({ ...s, bottomH: Math.max(60, wsSize.h - v) }))}
          />
        )}
        {/* Right divider in visual mode (properties panel — uses visualRightW) */}
        {mode === 'visual' && winMap.properties.visible && winMap.properties.docked && (
          <DockDivider
            orientation="vertical"
            pos={wsSize.w - dockSizes.visualRightW}
            min={Math.max(121, dockSizes.leftW + 160)} max={wsSize.w - 160}
            wsW={wsSize.w} wsH={wsSize.h}
            onChange={v => setDockSizes(s => ({ ...s, visualRightW: Math.max(160, wsSize.w - v) }))}
          />
        )}

        {/* All windows */}
        {sortedWins.map(w => {
          const effRect = getEffRect(w.id);
          const hasDockSlot = getDockRect(w.id, wsSize.w, wsSize.h, mode as Mode, dockSizes, visibleDockedSet) !== null;
          return (
            <FloatingWindow
              key={w.id}
              id={w.id}
              title={winTitle[w.id]}
              icon={WIN_ICONS[w.id]}
              rect={effRect}
              zIndex={w.zIndex}
              visible={w.visible}
              minimized={w.minimized}
              docked={w.docked}
              onFloat={w.docked ? () => floatWin(w.id) : undefined}
              onDock={!w.docked && hasDockSlot ? () => dockWin(w.id) : undefined}
              minW={140} minH={100}
              workspaceW={wsSize.w}
              workspaceH={wsSize.h}
              onFocus={() => focusWin(w.id)}
              onMove={(x, y) => updateWin(w.id, { rect: { ...w.rect, x, y } })}
              onResize={rect => updateWin(w.id, { rect })}
              onClose={() => updateWin(w.id, { visible: false })}
              onMinimize={() => updateWin(w.id, { minimized: !w.minimized })}
              onDragPos={!w.docked ? (cx, cy) => onDragPos(w.id, cx, cy) : undefined}
              onDragEnd={!w.docked ? (cx, cy) => onDragEnd(w.id, cx, cy) : undefined}
            >
              {winContent(w.id)}
            </FloatingWindow>
          );
        })}
      </div>

      {/* ── Status Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 24, flexShrink: 0, background: '#007acc', padding: '0 0 0 12px', gap: 0, fontSize: 11, color: 'rgba(255,255,255,0.9)', zIndex: 200 }}>
        <span style={{ fontWeight: 600, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.2)' }}>HTML Editor</span>
        <span style={{ padding: '0 12px' }}>Mode: {mode}</span>
        <span style={{ padding: '0 12px', opacity: 0.8 }}>{activeFileName}</span>
        <div style={{ flex: 1 }} />
        <span style={{ opacity: 0.6, fontSize: 10, paddingRight: 12 }}>
          {wins.filter(w => w.visible && w.docked).map(w => winTitle[w.id]).join(' · ')}
          {wins.some(w => w.visible && !w.docked) && <> + {wins.filter(w => w.visible && !w.docked).length} floating</>}
        </span>
        <span style={{ padding: '0 10px', borderLeft: '1px solid rgba(255,255,255,0.2)', opacity: 0.8 }}>{files.length} files</span>
        <span style={{ padding: '0 10px', borderLeft: '1px solid rgba(255,255,255,0.2)', opacity: 0.8 }}>UTF-8</span>
        <AiStatusButton />
      </div>

      {/* ── Toast ── */}
      {notification && (
        <div style={{ position: 'fixed', bottom: 36, right: 16, zIndex: 1000000, background: '#3c3c3c', border: '1px solid #555', borderRadius: 6, padding: '8px 16px', fontSize: 13, color: '#ccc', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
          {notification}
        </div>
      )}
      <EditorAdBanner />
      {ctxEl}
    </div>
  );
}

function ToolbarBtn({ title, icon, label, onClick }: { title: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: 'transparent', border: '1px solid transparent', color: '#888', fontFamily: 'inherit' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
    >{icon}{label}</button>
  );
}
