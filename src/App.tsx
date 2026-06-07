import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Router as WouterRouter, Route, Switch } from 'wouter';

/* ── Legacy type re-exports (MenuBar still imports these) ── */
export type WinId = 'files' | 'code' | 'preview' | 'properties' | 'timeline' | 'events' | 'console' | 'anim-presets' | 'anim-config' | 'anim-tracks' | 'vanta-editor';
export interface WinState {
  id: WinId; title: string; visible: boolean; minimized: boolean;
  docked: boolean; zIndex: number; rect: { x: number; y: number; w: number; h: number };
}
import Documentation from './pages/Documentation';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import NotFound from './pages/not-found';
import { useEditorStore } from './store/editorStore';
import MenuBar from './components/MenuBar';
import GoldenLayoutEditor from './components/GoldenLayoutEditor';
import type { GoldenLayoutEditorHandle, PanelType, Mode } from './components/GoldenLayoutEditor';
import { aiControl, clearAiCache } from './components/CodeEditor';
import FilePanel from './components/FilePanel';
import CodeEditor from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import VisualEditor from './components/VisualEditor';
import PropertiesPanel from './components/PropertiesPanel';
import ConsolePanel from './components/ConsolePanel';
import { exportProject } from './utils/export';
import {
  FiCode, FiEye, FiLayout, FiDownload, FiRefreshCw, FiRotateCcw,
  FiFolder, FiSliders, FiClock, FiMonitor, FiBox, FiX, FiTerminal, FiZap,
} from 'react-icons/fi';

/* ─── Non-intrusive Corner Ad Banner ─── */
const EditorAdBanner: React.FC = () => {
  const AD_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes
  const isDismissed = () => {
    try {
      const ts = localStorage.getItem('editor-ad-dismissed-at');
      if (!ts) return false;
      return Date.now() - parseInt(ts, 10) < AD_COOLDOWN_MS;
    } catch { return false; }
  };
  const [dismissed, setDismissed] = useState(isDismissed);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('editor-ad-dismissed-at', String(Date.now())); } catch {}
    setTimeout(() => setDismissed(false), AD_COOLDOWN_MS);
  };
  useEffect(() => {
    if (dismissed) return;
    const el = containerRef.current;
    if (!el) return;
    const w = window as Window & { atOptions?: object };
    w.atOptions = {
      key: 'bb79f6157e39f7e04c987ee47a1c5964',
      format: 'iframe',
      height: 50,
      width: 320,
      params: {},
    };
    const script = document.createElement('script');
    script.src = 'https://www.highperformanceformat.com/bb79f6157e39f7e04c987ee47a1c5964/invoke.js';
    script.async = true;
    el.appendChild(script);
    return () => {
      try { el.removeChild(script); } catch {}
    };
  }, [dismissed]);
  if (dismissed) return null;
  return (
    <div style={{ position: 'fixed', bottom: 30, right: 16, zIndex: 1400, background: '#1e1e1e', border: '1px solid #3e3e3e', borderRadius: 8, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: 336 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: '#555', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Advertisement</span>
        <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 2 }}>
          <FiX size={12} />
        </button>
      </div>
      <div ref={containerRef} style={{ width: 320, height: 50, overflow: 'hidden' }} />
    </div>
  );
};


/* ─── AI Status Button ─── */
function AiStatusButton() {
  const [aiState, setAiState] = useState(aiControl.state);
  const [aiEnabled, setAiEnabled] = useState(aiControl.enabled);
  useEffect(() => {
    const handler = () => {
      setAiState(aiControl.state);
      setAiEnabled(aiControl.enabled);
    };
    aiControl.listeners.add(handler);
    return () => { aiControl.listeners.delete(handler); };
  }, []);
  const handleClick = () => {
    if (!aiControl.enabled) {
      aiControl.setEnabled(true);
      clearAiCache();
      setTimeout(() => aiControl.triggerManual?.(), 50);
      return;
    }
    clearAiCache();
    aiControl.triggerManual?.();
  };
  const cfg = !aiEnabled ? {
    dot: 'rgba(255,255,255,0.35)', dotGlow: false, text: 'AI Off', bg: 'rgba(0,0,0,0.18)', label: 'AI is off. Click to enable AI suggestions for this browser.'
  } : {
    idle:    { dot: 'rgba(255,255,255,0.5)', dotGlow: false, text: '✦ AI',  bg: 'rgba(0,0,0,0.15)',  label: 'Click to get AI suggestion' },
    loading: { dot: '#fbbf24',               dotGlow: true,  text: '⟳ AI…', bg: 'rgba(0,0,0,0.25)',  label: 'AI is thinking…' },
    ready:   { dot: '#4ade80',               dotGlow: true,  text: '✓ AI',  bg: 'rgba(0,0,0,0.25)',  label: 'Suggestion ready — Tab to accept · Click to refresh' },
    error:   { dot: '#f87171',               dotGlow: false, text: '✗ AI',  bg: 'rgba(0,0,0,0.25)',  label: 'AI error — click to retry' },
  }[aiState];
  return (
    <button title={cfg.label} onClick={handleClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', height: '100%', background: cfg.bg, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.04em', transition: 'background 0.15s', flexShrink: 0, whiteSpace: 'nowrap' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = cfg.bg; }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0, boxShadow: cfg.dotGlow ? `0 0 6px ${cfg.dot}` : 'none', transition: 'background 0.2s' }} />
      {cfg.text}
    </button>
  );
}

/* ─── Mobile hook ─── */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

/* ─── Mobile App (unchanged) ─── */
type MobileTab = 'code' | 'preview' | 'files' | 'props' | 'console';

function MobileApp() {
  const [tab, setTab] = useState<MobileTab>('code');
  const { files, mode, setMode, notification, showNotification } = useEditorStore();

  const TABS: { id: MobileTab; icon: React.ReactNode; label: string }[] = [
    { id: 'files',   icon: <FiFolder size={17} />,   label: 'Files'   },
    { id: 'code',    icon: <FiCode size={17} />,      label: 'Code'    },
    { id: 'preview', icon: <FiEye size={17} />,       label: 'Preview' },
    { id: 'console', icon: <FiTerminal size={17} />,  label: 'Console' },
    { id: 'props',   icon: <FiSliders size={17} />,   label: 'Props'   },
  ];

  const accent = '#e5a45a', bg = '#1e1e1e', bar = '#252526', border = '#3a3a3a';

  /* skeuomorphic mobile tokens */
  const SKU_HDR  = 'linear-gradient(180deg,#2e2e34 0%,#252528 50%,#222225 100%)';
  const SKU_BAR  = 'linear-gradient(180deg,#222226 0%,#1e1e22 100%)';
  const SKU_BTN  = 'linear-gradient(180deg,#3a3a42 0%,#2e2e35 50%,#2a2a31 100%)';
  const SKU_ABTN = 'linear-gradient(180deg,#c8913c 0%,#e5a45a 40%,#c8913c 100%)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', background: '#1e1e22', color: '#d8d8d8', fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'hidden' }}>
      {/* ── SKEUOMORPHIC MOBILE HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 48, flexShrink: 0,
        background: SKU_HDR,
        borderBottom: '1px solid rgba(0,0,0,0.6)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.07),0 3px 10px rgba(0,0,0,0.5)',
        padding: '0 12px', gap: 8, zIndex: 100,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, flexShrink: 0,
          background: 'linear-gradient(145deg,#cc3300 0%,#e34c26 50%,#aa2200 100%)',
          border: '1px solid rgba(0,0,0,0.5)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25),0 2px 4px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}>H</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#d8d8d8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>HTML Editor</span>
        <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 3, flexShrink: 0, border: '1px solid rgba(0,0,0,0.4)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
          {([['split', 'View'], ['visual', 'Visual']] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setTab('preview'); }}
              style={{
                padding: '3px 10px', fontSize: 10, borderRadius: 4, cursor: 'pointer',
                fontWeight: 700, fontFamily: 'inherit',
                border: `1px solid ${mode === m ? 'rgba(180,110,20,0.6)' : 'transparent'}`,
                background: mode === m ? SKU_ABTN : 'transparent',
                color: mode === m ? '#1a0d00' : '#66666e',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                boxShadow: mode === m ? 'inset 0 1px 0 rgba(255,255,255,0.2),0 1px 3px rgba(0,0,0,0.4)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => exportProject(files).then(() => showNotification('Exported!'))}
          style={{
            padding: '5px 9px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
            background: SKU_BTN,
            border: '1px solid rgba(0,0,0,0.5)',
            color: accent, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14),0 2px 4px rgba(0,0,0,0.5)',
          }}>
          <FiDownload size={12} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <div style={{ display: tab === 'files' ? 'flex' : 'none', flexDirection: 'column', height: '100%', background: '#1e1e22' }}><FilePanel hideHeader /></div>
        <div style={{ display: tab === 'code' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}><CodeEditor /></div>
        <div style={{ display: tab === 'preview' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>{mode === 'visual' ? <VisualEditor /> : <PreviewPane />}</div>
        <div style={{ display: tab === 'console' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}><ConsolePanel /></div>
        <div style={{ display: tab === 'props' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflowY: 'auto' }}><PropertiesPanel hideHeader /></div>
      </div>

      {/* ── SKEUOMORPHIC MOBILE TAB BAR ── */}
      <div style={{
        display: 'flex', height: 58, flexShrink: 0,
        background: SKU_BAR,
        borderTop: '1px solid rgba(0,0,0,0.6)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100,
      }}>
        {TABS.map(t => {
          const isActive = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
              background: isActive ? 'rgba(229,164,90,0.07)' : 'transparent',
              borderTop: `2px solid ${isActive ? accent : 'transparent'}`,
              color: isActive ? accent : '#555560', transition: 'all 0.15s',
            }}>
              {t.icon}
              <span style={{ fontSize: 8, fontWeight: isActive ? 700 : 500, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {notification && (
        <div style={{
          position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1400,
          background: 'linear-gradient(180deg,#3a3a42 0%,#2e2e36 100%)',
          border: '1px solid rgba(0,0,0,0.6)', borderTopColor: 'rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '9px 20px', fontSize: 13, color: '#d8d8d8',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.1)',
          whiteSpace: 'nowrap', textShadow: '0 1px 1px rgba(0,0,0,0.4)',
        }}>
          {notification}
        </div>
      )}
    </div>
  );
}

/* ─── App router ─── */
export default function App() {
  const isMobile = useIsMobile();
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/docs" component={Documentation} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/">
          {isMobile ? <MobileApp /> : <DesktopApp />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

/* ─── Desktop App with Golden Layout ─── */
function DesktopApp() {
  const { mode, setMode, notification, files, showNotification, activeFileId } = useEditorStore();
  const glRef = useRef<GoldenLayoutEditorHandle>(null);
  const [openPanels, setOpenPanels] = useState<import('./components/GoldenLayoutEditor').PanelType[]>(
    ['files', 'code', 'preview']
  );

  const applyModePreset = useCallback((m: Mode) => {
    setMode(m);
  }, [setMode]);

  const handlePanelToggle = useCallback((type: PanelType) => {
    glRef.current?.focusOrAddPanel(type);
  }, []);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === '1') { e.preventDefault(); applyModePreset('code'); }
      if (mod && e.key === '2') { e.preventDefault(); applyModePreset('visual'); }
      if (mod && e.key === '3') { e.preventDefault(); applyModePreset('split'); }
      if (mod && e.key === 's') {
        e.preventDefault();
        const st = useEditorStore.getState();
        const activeId = st.activeFileId;
        if (activeId) {
          st.markFileSaved(activeId);
        } else {
          st.markAllSaved();
        }
        showNotification('File saved ✓');
      }
      if (mod && e.key === 'e') { e.preventDefault(); exportProject(files).then(() => showNotification('Exported project.zip')); }
      if (mod && e.key === 'r') { e.preventDefault(); useEditorStore.getState().refreshPreview(); }
      if (mod && e.key === '`') { e.preventDefault(); handlePanelToggle('console'); }
      if (mod && e.key === '0') { e.preventDefault(); glRef.current?.resetLayout(); }
      if (e.key === 'Escape') { useEditorStore.getState().setSelectedElement(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [files, applyModePreset, handlePanelToggle]);

  const activeFileName = useEditorStore(s => s.files.find(f => f.id === s.activeFileId)?.name || '');

  const PANEL_BTNS: { type: PanelType; icon: React.ReactNode; label: string; title: string }[] = [
    { type: 'files',        icon: <FiFolder size={12} />,   label: 'Explorer',    title: 'File Explorer' },
    { type: 'code',         icon: <FiCode size={12} />,     label: 'Code',        title: 'Code Editor' },
    { type: 'preview',      icon: <FiMonitor size={12} />,  label: 'Preview',     title: 'Preview' },
    { type: 'console',      icon: <FiTerminal size={12} />, label: 'Console',     title: 'Console' },
    { type: 'properties',   icon: <FiSliders size={12} />,  label: 'Properties',  title: 'Properties' },
    { type: 'timeline',     icon: <FiClock size={12} />,    label: 'Timeline',    title: 'Timeline' },
    { type: 'events',       icon: <FiZap size={12} />,      label: 'Events',      title: 'Event Listeners' },
    { type: 'anim-presets', icon: <FiBox size={12} />,      label: 'Anim Presets',title: 'Anim Presets' },
    { type: 'anim-config',  icon: <FiSliders size={12} />,  label: 'Anim Config', title: 'Anim Config' },
    { type: 'anim-tracks',  icon: <FiLayout size={12} />,   label: 'Anim Tracks', title: 'Anim Tracks' },
    { type: 'vanta-editor', icon: <FiBox size={12} />,      label: 'Vanta JS',    title: 'Vanta JS' },
  ];

  /* ── Skeuomorphic tokens ── */
  const SKU_TITLEBAR = 'linear-gradient(180deg,#2e2e34 0%,#252528 50%,#222225 100%)';
  const SKU_STATUS   = 'linear-gradient(180deg,#1e1e22 0%,#191919 100%)';
  const SKU_BTNRAISED = 'linear-gradient(180deg,#3a3a42 0%,#2e2e35 50%,#2a2a31 100%)';
  const SKU_BTNACTIVE = 'linear-gradient(180deg,#c8913c 0%,#e5a45a 40%,#c8913c 100%)';
  const SKU_SHADOW_BTN = 'inset 0 1px 0 rgba(255,255,255,0.14),0 2px 4px rgba(0,0,0,0.5)';
  const SKU_SHADOW_ACTIVE = 'inset 0 1px 0 rgba(229,164,90,0.3),0 0 8px rgba(229,164,90,0.2)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#1e1e22', color: '#d8d8d8', fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 13, overflow: 'hidden' }}>

      {/* ══ SKEUOMORPHIC MENU BAR ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 34, flexShrink: 0,
        background: SKU_TITLEBAR,
        borderBottom: '1px solid rgba(0,0,0,0.6)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.07),0 3px 10px rgba(0,0,0,0.5)',
        position: 'relative', zIndex: 100,
      }}>
        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.4)', height: '100%' }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
            background: 'linear-gradient(145deg,#cc3300 0%,#e34c26 50%,#aa2200 100%)',
            border: '1px solid rgba(0,0,0,0.5)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25),0 2px 4px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900, color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}>H</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#d8d8d8', letterSpacing: '-0.01em', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>HTML Editor</span>
        </div>

        <MenuBar
          wins={PANEL_BTNS.map(b => ({
            id: b.type as import('./App').WinId,
            title: b.title,
            visible: openPanels.includes(b.type as import('./components/GoldenLayoutEditor').PanelType),
            minimized: false, docked: true, zIndex: 1,
            rect: { x: 0, y: 0, w: 300, h: 400 },
          }))}
          onToggleWin={(id) => handlePanelToggle(id as import('./components/GoldenLayoutEditor').PanelType)}
          onOpenWin={(id) => handlePanelToggle(id as import('./components/GoldenLayoutEditor').PanelType)}
          onResetLayout={() => glRef.current?.resetLayout()}
          onApplyModePreset={(m: string) => applyModePreset(m as Mode)}
        />
        <div style={{ flex: 1 }} />

        {/* Layout mode pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '0 8px', borderLeft: '1px solid rgba(0,0,0,0.4)', height: '100%' }}>
          {([['split', FiLayout, 'Ctrl+3'], ['code', FiCode, 'Ctrl+1'], ['visual', FiEye, 'Ctrl+2']] as const).map(([m, Icon, sc]) => {
            const isActive = mode === m;
            return (
              <button key={m} title={`${m} layout (${sc})`} onClick={() => applyModePreset(m)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '3px 8px', borderRadius: 4,
                  cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', fontWeight: 700,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  background: isActive ? SKU_BTNACTIVE : SKU_BTNRAISED,
                  border: `1px solid ${isActive ? 'rgba(180,110,20,0.6)' : 'rgba(0,0,0,0.5)'}`,
                  color: isActive ? '#1a0d00' : '#888890',
                  boxShadow: isActive ? SKU_SHADOW_ACTIVE : SKU_SHADOW_BTN,
                  textShadow: `0 1px 1px rgba(0,0,0,${isActive ? 0.2 : 0.5})`,
                  gap: 4, transition: 'all 0.12s',
                }}>
                <Icon size={10} />{m}
              </button>
            );
          })}
        </div>

        {/* Utility buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', borderLeft: '1px solid rgba(0,0,0,0.4)', height: '100%' }}>
          {[
            { title: 'Refresh Preview (Ctrl+R)', icon: <FiRefreshCw size={11}/>, onClick: () => useEditorStore.getState().refreshPreview() },
            { title: 'Export ZIP (Ctrl+E)', icon: <FiDownload size={11}/>, onClick: () => exportProject(files).then(() => showNotification('Exported project.zip')) },
          ].map(({ title, icon, onClick }) => (
            <button key={title} title={title} onClick={onClick}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                background: SKU_BTNRAISED,
                border: '1px solid rgba(0,0,0,0.5)',
                color: '#888890',
                boxShadow: SKU_SHADOW_BTN,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#d8d8d8'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888890'; }}>
              {icon}
            </button>
          ))}
        </div>

        {/* Active file */}
        <span style={{
          fontSize: 10, color: '#555560', padding: '0 14px',
          borderLeft: '1px solid rgba(0,0,0,0.4)', height: '100%',
          display: 'flex', alignItems: 'center',
          textShadow: '0 1px 1px rgba(0,0,0,0.5)',
          fontFamily: 'monospace',
        }}>{activeFileName}</span>
      </div>

      {/* ══ WORKSPACE ══ */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <GoldenLayoutEditor ref={glRef} mode={mode as Mode} onPanelsChange={setOpenPanels} />
      </div>

      {/* ══ SKEUOMORPHIC STATUS BAR ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 24, flexShrink: 0,
        background: SKU_STATUS,
        borderTop: '1px solid rgba(0,0,0,0.6)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.06),inset 0 1px 0 rgba(0,0,0,0.3)',
        padding: '0 0 0 0', fontSize: 10, color: '#555560', zIndex: 200,
      }}>
        {/* Left — branding chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 14px', borderRight: '1px solid rgba(0,0,0,0.4)',
          height: '100%',
          background: 'linear-gradient(180deg,rgba(229,164,90,0.12) 0%,rgba(229,164,90,0.06) 100%)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 10, color: '#e5a45a', textShadow: '0 1px 1px rgba(0,0,0,0.5)', letterSpacing: '0.06em' }}>HTML Editor</span>
        </div>

        {[
          { label: 'Mode', value: mode.toUpperCase() },
          { label: null, value: activeFileName, mono: true },
        ].map(({ label, value, mono }, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0 12px', borderRight: '1px solid rgba(0,0,0,0.3)',
            height: '100%',
          }}>
            {label && <span style={{ color: '#444', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.08em' }}>{label}:</span>}
            <span style={{ color: '#666670', fontFamily: mono ? 'monospace' : 'inherit', fontSize: 10 }}>{value}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <span style={{ padding: '0 12px', borderLeft: '1px solid rgba(0,0,0,0.3)', color: '#444454', fontSize: 9, fontStyle: 'italic' }}>
          Drag tabs to rearrange
        </span>
        <span style={{ padding: '0 12px', borderLeft: '1px solid rgba(0,0,0,0.3)', color: '#555560' }}>{files.length} files</span>
        <span style={{ padding: '0 12px', borderLeft: '1px solid rgba(0,0,0,0.3)', color: '#555560', fontFamily: 'monospace', fontSize: 9 }}>UTF-8</span>
        <AiStatusButton />
      </div>

      {/* ══ SKEUOMORPHIC TOAST ══ */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: 36, right: 16, zIndex: 1400,
          background: 'linear-gradient(180deg,#3a3a42 0%,#2e2e36 100%)',
          border: '1px solid rgba(0,0,0,0.6)',
          borderTopColor: 'rgba(255,255,255,0.1)',
          borderRadius: 7, padding: '9px 18px', fontSize: 12,
          color: '#d8d8d8',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.1)',
          pointerEvents: 'none',
          textShadow: '0 1px 1px rgba(0,0,0,0.4)',
        }}>
          {notification}
        </div>
      )}
      <EditorAdBanner />
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
