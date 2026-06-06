import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useContextMenu } from './ContextMenu';
import { FiPlay, FiSquare, FiPlus, FiZoomIn, FiZoomOut, FiX, FiRefreshCw, FiCheck, FiEdit3, FiTrash2, FiSave, FiCopy } from 'react-icons/fi';
import { ANIMATION_PRESETS, ANIMATION_CATEGORIES, KEYFRAMES_MAP, PRESET_BY_NAME } from '../lib/animations';
import { getTargetHtmlFile } from '../utils/projectFiles';

type Track = import('../store/editorStore').TimelineTrack;
type CustomAnimation = import('../store/editorStore').CustomAnimation;

const COLORS = ['#e5a45a', '#4ec9b0', '#9cdcfe', '#dcdcaa', '#c586c0', '#f44747', '#89d185'];
const TRACK_H = 28;

const EASING_NAMED: { label: string; value: string }[] = [
  { label: 'ease', value: 'ease' },
  { label: 'linear', value: 'linear' },
  { label: 'ease-in', value: 'ease-in' },
  { label: 'ease-out', value: 'ease-out' },
  { label: 'ease-in-out', value: 'ease-in-out' },
  { label: 'spring', value: 'cubic-bezier(0.68,-0.55,0.27,1.55)' },
  { label: 'bounce', value: 'cubic-bezier(0.34,1.56,0.64,1)' },
  { label: 'snap', value: 'cubic-bezier(0.175,0.885,0.32,1.275)' },
  { label: 'smooth', value: 'cubic-bezier(0.25,0.46,0.45,0.94)' },
  { label: 'sharp', value: 'cubic-bezier(0.4,0,0.6,1)' },
  { label: 'steps(4)', value: 'steps(4, end)' },
  { label: 'steps(10)', value: 'steps(10, end)' },
];

function parseCubicBezier(v: string): [number, number, number, number] | null {
  const m = v.match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
}

function MiniCurve({ value, size = 28 }: { value: string; size?: number }) {
  let x1 = 0.25, y1 = 0.1, x2 = 0.25, y2 = 1;
  const named: Record<string, [number, number, number, number]> = {
    'ease': [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1], 'linear': [0, 0, 1, 1],
  };
  const p = parseCubicBezier(value) || named[value];
  if (p) { [x1, y1, x2, y2] = p; }
  const S = size;
  const PAD = 3;
  const W = S - PAD * 2;
  return (
    <svg width={S} height={S} style={{ flexShrink: 0 }}>
      <rect x={0} y={0} width={S} height={S} fill="rgba(0,0,0,0.25)" rx="2" />
      <path
        d={`M${PAD},${PAD + W} C${PAD + x1 * W},${PAD + (1 - y1) * W} ${PAD + x2 * W},${PAD + (1 - y2) * W} ${PAD + W},${PAD}`}
        fill="none" stroke="#e5a45a" strokeWidth="1.5"
      />
    </svg>
  );
}

function CubicBezierEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseCubicBezier(value) || [0.25, 0.1, 0.25, 1];
  const [x1, y1, x2, y2] = parsed;
  const SIZE = 80;
  const PAD = 10;
  const toSvg = (nx: number, ny: number) => ({ x: PAD + nx * SIZE, y: PAD + (1 - ny) * SIZE });
  const p0 = { x: PAD, y: PAD + SIZE };
  const p3 = { x: PAD + SIZE, y: PAD };
  const c1 = toSvg(x1, y1);
  const c2 = toSvg(x2, y2);

  const dragHandle = (which: 1 | 2, e: React.MouseEvent<SVGCircleElement>) => {
    e.preventDefault();
    const svgEl = (e.currentTarget as SVGElement).closest('svg') as SVGSVGElement;
    if (!svgEl) return;
    const onMove = (ev: MouseEvent) => {
      const rect = svgEl.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (ev.clientX - rect.left - PAD) / SIZE));
      const ny = 1 - (ev.clientY - rect.top - PAD) / SIZE;
      if (which === 1) onChange(`cubic-bezier(${nx.toFixed(2)},${ny.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)})`);
      else onChange(`cubic-bezier(${x1.toFixed(2)},${y1.toFixed(2)},${nx.toFixed(2)},${ny.toFixed(2)})`);
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ background: '#161618', borderRadius: 5, padding: 6, border: '1px solid #333' }}>
      <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Curve Editor</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <svg width={SIZE + PAD * 2} height={SIZE + PAD * 2} style={{ background: '#111', borderRadius: 3, flexShrink: 0, cursor: 'crosshair', border: '1px solid #2a2a2a' }}>
          {[0.25, 0.5, 0.75].map(t => (
            <g key={t}>
              <line x1={PAD + t * SIZE} y1={PAD} x2={PAD + t * SIZE} y2={PAD + SIZE} stroke="#222" strokeWidth="0.5" />
              <line x1={PAD} y1={PAD + t * SIZE} x2={PAD + SIZE} y2={PAD + t * SIZE} stroke="#222" strokeWidth="0.5" />
            </g>
          ))}
          <line x1={p0.x} y1={p0.y} x2={c1.x} y2={c1.y} stroke="#4ec9b0" strokeWidth="1" opacity="0.6" />
          <line x1={p3.x} y1={p3.y} x2={c2.x} y2={c2.y} stroke="#9cdcfe" strokeWidth="1" opacity="0.6" />
          <path d={`M${p0.x},${p0.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p3.x},${p3.y}`} fill="none" stroke="#e5a45a" strokeWidth="1.5" />
          <circle cx={c1.x} cy={c1.y} r={4.5} fill="#4ec9b0" stroke="#fff" strokeWidth="1" style={{ cursor: 'grab' }} onMouseDown={e => dragHandle(1, e)} />
          <circle cx={c2.x} cy={c2.y} r={4.5} fill="#9cdcfe" stroke="#fff" strokeWidth="1" style={{ cursor: 'grab' }} onMouseDown={e => dragHandle(2, e)} />
          <circle cx={p0.x} cy={p0.y} r={2.5} fill="#555" />
          <circle cx={p3.x} cy={p3.y} r={2.5} fill="#555" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          {[['X1', x1, (v: number) => onChange(`cubic-bezier(${v.toFixed(2)},${y1.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)})`)],
            ['Y1', y1, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${v.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)})`)],
            ['X2', x2, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${y1.toFixed(2)},${v.toFixed(2)},${y2.toFixed(2)})`)],
            ['Y2', y2, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${y1.toFixed(2)},${x2.toFixed(2)},${v.toFixed(2)})`)]].map(([label, val, setter]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 9, color: (label as string).includes('1') ? '#4ec9b0' : '#9cdcfe', width: 16, fontWeight: 700, flexShrink: 0 }}>{label as string}</span>
              <input type="number" min="-2" max="3" step="0.01" value={(val as number).toFixed(2)}
                onChange={e => (setter as (v: number) => void)(parseFloat(e.target.value) || 0)}
                style={{ flex: 1, background: '#1a1a1c', border: '1px solid #2d2d2d', borderRadius: 3, padding: '2px 4px', fontSize: 9, color: '#ccc', outline: 'none', fontFamily: 'monospace' }}
              />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
        {EASING_NAMED.map(p => {
          const isA = value === p.value;
          return (
            <button key={p.label} onClick={() => onChange(p.value)}
              style={{ padding: '1px 6px', fontSize: 9, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                background: isA ? 'rgba(229,164,90,0.15)' : '#1a1a1c', border: `1px solid ${isA ? 'rgba(229,164,90,0.4)' : '#2d2d2d'}`,
                color: isA ? '#e5a45a' : '#777' }}>
              {p.label}
            </button>
          );
        })}
      </div>
      {value.startsWith('cubic-bezier') && (
        <div style={{ fontSize: 8, color: '#444', marginTop: 4, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      )}
    </div>
  );
}

function showDragCapture(cursor: string) {
  document.body.style.cursor = cursor;
  document.body.style.userSelect = 'none';
  const overlay = document.getElementById('__drag-capture');
  if (overlay) { overlay.style.display = 'block'; overlay.style.cursor = cursor; }
}
function hideDragCapture() {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  const overlay = document.getElementById('__drag-capture');
  if (overlay) overlay.style.display = 'none';
}

const CLICK_RUNTIME = `
(function(){
  if (window.__timelineClickWired) return; window.__timelineClickWired = true;
  document.addEventListener('click', function(e){
    var els = document.querySelectorAll('[data-tl-click]');
    els.forEach(function(el){
      if (el === e.target || el.contains(e.target)) {
        el.classList.remove('__tl-clicked');
        void el.offsetWidth;
        el.classList.add('__tl-clicked');
      }
    });
  }, true);
})();`.trim();

const SCROLL_RUNTIME = `
(function(){
  if (window.__timelineScrollWired) return; window.__timelineScrollWired = true;
  var sels = __SCROLL_SELS__;
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        entry.target.classList.remove('__tl-scrolled');
        void entry.target.offsetWidth;
        entry.target.classList.add('__tl-scrolled');
      }
    });
  }, { threshold: 0.12 });
  function tag(){
    sels.forEach(function(s){
      try { document.querySelectorAll(s).forEach(function(el){ el.setAttribute('data-tl-scroll','1'); obs.observe(el); }); } catch(e){}
    });
  }
  if (document.readyState !== 'loading') tag();
  else document.addEventListener('DOMContentLoaded', tag);
})();`.trim();

function buildAnimationCSS(tracks: Track[], custom: CustomAnimation[]): { css: string; needsClickRuntime: boolean; clickSelectors: string[]; scrollSelectors: string[] } {
  const customMap: Record<string, string> = {};
  custom.forEach(c => { customMap[c.name] = c.keyframes; });
  const usedNames = new Set(tracks.map(t => t.animation).filter(a => a && a !== 'none'));
  const keyframeBlocks = Array.from(usedNames).map(p => customMap[p] || KEYFRAMES_MAP[p] || '').filter(Boolean).join('\n');
  const clickSelectors: string[] = [];
  const scrollSelectors: string[] = [];
  const rules = tracks.filter(t => t.animation !== 'none' && t.element.trim()).map(t => {
    const iter = t.iteration === 'infinite' ? 'infinite' : parseInt(t.iteration) || 1;
    const trigger = t.trigger || 'load';
    const animLine = `animation: ${t.animation} ${t.duration}s ${t.easing} ${t.delay}s ${iter} normal both !important; will-change: transform, opacity;`;
    if (trigger === 'hover') return `${t.element}:hover { ${animLine} }`;
    if (trigger === 'click') { clickSelectors.push(t.element.trim()); return `${t.element}.__tl-clicked { ${animLine} }`; }
    if (trigger === 'scroll') { scrollSelectors.push(t.element.trim()); return `${t.element}.__tl-scrolled { ${animLine} }`; }
    return `${t.element} { ${animLine} }`;
  }).join('\n');
  return { css: `${keyframeBlocks}\n${rules}`, needsClickRuntime: clickSelectors.length > 0, clickSelectors, scrollSelectors };
}

function injectTimelineCssIntoHtml(html: string, css: string, needsClickRuntime: boolean, clickSelectors: string[], scrollSelectors: string[]) {
  let cleaned = html
    .replace(/\n?\s*<style\s+id=["']timeline-animations["'][\s\S]*?<\/style>/i, '')
    .replace(/\n?\s*<script\s+id=["']timeline-click-runtime["'][\s\S]*?<\/script>/i, '')
    .replace(/\n?\s*<script\s+id=["']timeline-scroll-runtime["'][\s\S]*?<\/script>/i, '');
  if (!css.trim() && !needsClickRuntime && scrollSelectors.length === 0) return cleaned;
  const tagClickScript = needsClickRuntime
    ? `<script id="timeline-click-runtime">\n(function(){\n  var sels = ${JSON.stringify(clickSelectors)};\n  function tag(){ sels.forEach(function(s){ try { document.querySelectorAll(s).forEach(function(el){ el.setAttribute('data-tl-click','1'); }); } catch(e){} }); }\n  if (document.readyState !== 'loading') tag(); else document.addEventListener('DOMContentLoaded', tag);\n  ${CLICK_RUNTIME}\n})();\n</script>` : '';
  const tagScrollScript = scrollSelectors.length > 0
    ? `<script id="timeline-scroll-runtime">\n${SCROLL_RUNTIME.replace('__SCROLL_SELS__', JSON.stringify(scrollSelectors))}\n</script>` : '';
  const styleBlock = css.trim() ? `<style id="timeline-animations">\n${css}\n</style>` : '';
  const block = `${styleBlock}\n${tagClickScript}\n${tagScrollScript}`;
  if (cleaned.includes('</head>')) return cleaned.replace('</head>', `${block}\n</head>`);
  return `${block}\n${cleaned}`;
}

/* ── Visual Keyframe Editor ── */
interface VisualKF {
  id: string;
  pct: number;
  opacity: string;
  translateX: string;
  translateY: string;
  scale: string;
  rotate: string;
  backgroundColor: string;
  color: string;
}

function defaultKF(pct: number): VisualKF {
  return { id: `${pct}-${Date.now()}`, pct, opacity: '', translateX: '', translateY: '', scale: '', rotate: '', backgroundColor: '', color: '' };
}

function visualKFtoCode(name: string, stops: VisualKF[]): string {
  const sorted = [...stops].sort((a, b) => a.pct - b.pct);
  const lines = sorted.map(s => {
    const parts: string[] = [];
    const transforms: string[] = [];
    if (s.translateX.trim()) transforms.push(`translateX(${s.translateX})`);
    if (s.translateY.trim()) transforms.push(`translateY(${s.translateY})`);
    if (s.scale.trim()) transforms.push(`scale(${s.scale})`);
    if (s.rotate.trim()) transforms.push(`rotate(${s.rotate})`);
    if (transforms.length) parts.push(`transform: ${transforms.join(' ')}`);
    if (s.opacity.trim()) parts.push(`opacity: ${s.opacity}`);
    if (s.backgroundColor.trim()) parts.push(`background-color: ${s.backgroundColor}`);
    if (s.color.trim()) parts.push(`color: ${s.color}`);
    const body = parts.length ? parts.join('; ') : 'opacity: 1';
    return `  ${s.pct}% { ${body}; }`;
  });
  return `@keyframes ${name || 'myAnim'} {\n${lines.join('\n')}\n}`;
}

const VKF_PROPS: { key: keyof VisualKF; label: string; placeholder: string; color: string }[] = [
  { key: 'opacity',         label: 'Opacity',       placeholder: '0 → 1',       color: '#e5a45a' },
  { key: 'translateX',      label: 'Move X',        placeholder: '0px, -20px',  color: '#4ec9b0' },
  { key: 'translateY',      label: 'Move Y',        placeholder: '0px, 30px',   color: '#4ec9b0' },
  { key: 'scale',           label: 'Scale',         placeholder: '0.8, 1.2',    color: '#9cdcfe' },
  { key: 'rotate',          label: 'Rotate',        placeholder: '0deg, 360deg',color: '#c586c0' },
  { key: 'backgroundColor', label: 'BG Color',      placeholder: '#ff5252',     color: '#f48771' },
  { key: 'color',           label: 'Text Color',    placeholder: '#ffffff',     color: '#dcdcaa' },
];

function VisualKeyframeEditor({ name, stops, onChange }: {
  name: string;
  stops: VisualKF[];
  onChange: (stops: VisualKF[]) => void;
}) {
  const addStop = () => {
    const existing = stops.map(s => s.pct);
    const candidates = [0, 25, 50, 75, 100].filter(p => !existing.includes(p));
    const pct = candidates.length ? candidates[0] : Math.min(100, Math.max(0, Math.round((stops[stops.length - 1]?.pct ?? 50) + 25)));
    onChange([...stops, defaultKF(pct)].sort((a, b) => a.pct - b.pct));
  };
  const removeStop = (id: string) => onChange(stops.filter(s => s.id !== id));
  const updateStop = (id: string, field: keyof VisualKF, val: string | number) =>
    onChange(stops.map(s => s.id === id ? { ...s, [field]: val } : s));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {stops.length === 0 && (
        <div style={{ color: '#555', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>
          No keyframes yet. Click <strong style={{ color: '#888' }}>+ Add Stop</strong> to begin.
        </div>
      )}
      {stops.map((s, idx) => (
        <div key={s.id} style={{ background: '#111', border: '1px solid #2e2e30', borderRadius: 5, overflow: 'hidden' }}>
          {/* Stop header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#18181a', borderBottom: '1px solid #252528' }}>
            <span style={{ fontSize: 9, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Stop {idx + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <input type="range" min={0} max={100} step={1} value={s.pct}
                onChange={e => updateStop(s.id, 'pct', parseInt(e.target.value))}
                style={{ flex: 1, accentColor: '#e5a45a' } as any} />
              <span style={{ fontSize: 10, color: '#e5a45a', fontWeight: 700, minWidth: 30, textAlign: 'right', fontFamily: 'monospace' }}>{s.pct}%</span>
            </div>
            <button onClick={() => removeStop(s.id)}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 2, fontSize: 11 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f88')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}>✕</button>
          </div>
          {/* Properties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '6px 8px' }}>
            {VKF_PROPS.map(p => (
              <div key={p.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 8, color: p.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</span>
                <input
                  value={(s as any)[p.key]}
                  onChange={e => updateStop(s.id, p.key, e.target.value)}
                  placeholder={p.placeholder}
                  style={{ background: '#1a1a1c', border: '1px solid #2d2d2d', borderRadius: 3, padding: '2px 5px', fontSize: 10, color: '#ccc', outline: 'none', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Generated code preview */}
      {stops.length > 0 && (
        <div style={{ background: '#0d0d0f', border: '1px solid #252528', borderRadius: 4, padding: 8 }}>
          <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Generated CSS</div>
          <pre style={{ margin: 0, fontSize: 9, color: '#dcdcaa', fontFamily: 'monospace', lineHeight: 1.5, overflow: 'auto', maxHeight: 100 }}>
            {visualKFtoCode(name, stops)}
          </pre>
        </div>
      )}
      <button onClick={addStop}
        style={{ padding: '5px', background: 'rgba(156,220,254,0.06)', border: '1px dashed rgba(156,220,254,0.2)', borderRadius: 4, color: '#9cdcfe', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
        + Add Keyframe Stop
      </button>
    </div>
  );
}

const TimelinePanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const {
    animationConfig, setAnimationConfig, selectedElement, setTimelineAnimationStyle,
    files, activeFileId, updateFileContent, showNotification, timelineState, setTimelineState, selectedSelector,
  } = useEditorStore();
  const { show: showCtx, element: ctxEl } = useContextMenu();

  const tracks = timelineState.tracks;
  const playing = timelineState.playing;
  const currentTime = timelineState.currentTime;
  const animationsApplied = timelineState.animationsApplied;
  const customAnimations = timelineState.customAnimations || [];
  const [zoom, setZoom] = useState(1);
  const [appliedMsg, setAppliedMsg] = useState(false);
  const [showPresetLibrary, setShowPresetLibrary] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomAnimation | null>(null);
  const [editingOriginalName, setEditingOriginalName] = useState<string | undefined>();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const totalDuration = Math.max(5, ...tracks.map(t => t.delay + t.duration));
  const labelWidth = 150;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const [showCurveEditor, setShowCurveEditor] = useState(false);
  const [customEditorMode, setCustomEditorMode] = useState<'visual' | 'code'>('visual');
  const [visualKFs, setVisualKFs] = useState<VisualKF[]>([]);

  const allAnimationNames = useMemo(
    () => [...customAnimations.map(c => c.name), ...ANIMATION_PRESETS.map(p => p.name)],
    [customAnimations]
  );

  const pushAnimationCSS = useCallback((css: string) => {
    setTimelineAnimationStyle('');
    requestAnimationFrame(() => { requestAnimationFrame(() => setTimelineAnimationStyle(css)); });
  }, [setTimelineAnimationStyle]);

  const persistAnimations = useCallback((built: { css: string; needsClickRuntime: boolean; clickSelectors: string[]; scrollSelectors: string[] }) => {
    const htmlFile = getTargetHtmlFile(files, activeFileId);
    if (!htmlFile) return;
    const updated = injectTimelineCssIntoHtml(htmlFile.content, built.css, built.needsClickRuntime, built.clickSelectors, built.scrollSelectors);
    if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
  }, [activeFileId, files, updateFileContent]);

  const buildPreviewCSS = useCallback((forceLoad: boolean): string => {
    const previewTracks = forceLoad ? tracks.map(t => ({ ...t, trigger: 'load' as const })) : tracks;
    return buildAnimationCSS(previewTracks, customAnimations).css;
  }, [tracks, customAnimations]);

  useEffect(() => {
    if (playing) {
      pushAnimationCSS(buildPreviewCSS(true));
      tickRef.current = setInterval(() => {
        setTimelineState(prev => {
          if (prev.currentTime >= totalDuration) return { ...prev, playing: false, currentTime: totalDuration };
          return { ...prev, currentTime: parseFloat((prev.currentTime + 0.05).toFixed(3)) };
        });
      }, 50);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing, totalDuration, pushAnimationCSS, setTimelineState, buildPreviewCSS]);

  useEffect(() => {
    if (!animationsApplied || playing) return;
    const built = buildAnimationCSS(tracks, customAnimations);
    // Only persist to the HTML file — do NOT re-push live CSS here, as that would
    // restart running animations every time a track property changes.
    persistAnimations(built);
  }, [tracks, customAnimations, animationsApplied, playing, persistAnimations]);

  const stopAndReset = () => {
    setTimelineState(prev => ({ ...prev, playing: false, currentTime: 0 }));
    pushAnimationCSS(animationsApplied ? buildAnimationCSS(tracks, customAnimations).css : '');
  };

  const startPlayback = () => { setTimelineState(prev => ({ ...prev, currentTime: 0, playing: true })); };

  const applyAnimations = () => {
    const built = buildAnimationCSS(tracks, customAnimations);
    pushAnimationCSS(built.css);
    persistAnimations(built);
    setTimelineState(prev => ({ ...prev, animationsApplied: true }));
    setAppliedMsg(true);
    showNotification(`Applied ${tracks.length} animation(s) to page`);
    setTimeout(() => setAppliedMsg(false), 1800);
  };

  const clearAnimations = () => {
    setTimelineState(prev => ({ ...prev, playing: false, currentTime: 0, animationsApplied: false }));
    setTimelineAnimationStyle('');
    persistAnimations({ css: '', needsClickRuntime: false, clickSelectors: [], scrollSelectors: [] });
    showNotification('Animations cleared');
  };

  const addTrack = useCallback(() => {
    const id = Date.now().toString();
    const label = selectedElement
      ? (selectedElement.styles?.selector || (selectedElement.id ? `#${selectedElement.id}` : selectedElement.tagName))
      : '.element';
    setTimelineState(prev => {
      const t = prev.tracks;
      const next = [...t, {
        id, element: label,
        animation: animationConfig.preset !== 'none' ? animationConfig.preset : 'fadeIn',
        duration: parseFloat(animationConfig.duration) || 1,
        delay: 0,
        color: COLORS[t.length % COLORS.length],
        easing: animationConfig.easing || 'ease',
        iteration: animationConfig.iteration || '1',
        trigger: (animationConfig.trigger || 'load') as 'load' | 'hover' | 'click',
      }];
      return { ...prev, tracks: next };
    });
    setSelectedTrackId(id);
  }, [selectedElement, animationConfig, setTimelineState]);

  const removeTrack = (id: string) => {
    setTimelineState(prev => ({ ...prev, tracks: prev.tracks.filter(tr => tr.id !== id) }));
    setSelectedTrackId(curr => curr === id ? null : curr);
  };

  const updateTrack = (id: string, update: Partial<Track>) =>
    setTimelineState(prev => ({ ...prev, tracks: prev.tracks.map(tr => tr.id === id ? { ...tr, ...update } : tr) }));

  const duplicateTrack = (track: Track) => {
    const newTrack = { ...track, id: Date.now().toString(), delay: Math.min(track.delay + 0.3, totalDuration - track.duration) };
    setTimelineState(prev => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
    setSelectedTrackId(newTrack.id);
  };

  const applyPreset = (preset: string) => {
    if (selectedTrackId) {
      const meta = PRESET_BY_NAME[preset];
      updateTrack(selectedTrackId, {
        animation: preset,
        ...(meta ? { duration: meta.defaultDuration, easing: meta.defaultEasing, iteration: meta.defaultIteration || '1' } : {}),
      });
    }
    setAnimationConfig({ preset });
  };

  const saveCustomAnimation = (anim: CustomAnimation, originalName?: string) => {
    if (!anim.name.trim() || !anim.keyframes.trim()) { showNotification('Name and keyframes required'); return; }
    setTimelineState(prev => {
      const list = prev.customAnimations || [];
      const filtered = originalName ? list.filter(c => c.name !== originalName) : list.filter(c => c.name !== anim.name);
      return { ...prev, customAnimations: [...filtered, anim] };
    });
    setEditingCustom(null);
    setEditingOriginalName(undefined);
    setShowCustomEditor(false);
    showNotification(`Saved "${anim.name}"`);
  };

  const deleteCustomAnimation = (name: string) => {
    setTimelineState(prev => ({ ...prev, customAnimations: (prev.customAnimations || []).filter(c => c.name !== name) }));
  };

  /* Drag handlers */
  const startTrackDrag = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedTrackId(trackId);
    const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
    const scaledW = contentW * zoom;
    const startX = e.clientX;
    const initTrack = tracksRef.current.find(t => t.id === trackId);
    if (!initTrack) return;
    const initDelay = initTrack.delay;
    const trackDuration = initTrack.duration;
    showDragCapture('grab');
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dT = (dx / scaledW) * totalDuration;
      const newDelay = Math.max(0, Math.min(totalDuration - trackDuration, initDelay + dT));
      setTimelineState(prev => ({
        ...prev, tracks: prev.tracks.map(tr => tr.id === trackId ? { ...tr, delay: parseFloat(newDelay.toFixed(2)) } : tr),
      }));
    };
    const onUp = () => { hideDragCapture(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration, setTimelineState]);

  const startResizeDuration = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedTrackId(trackId);
    const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
    const scaledW = contentW * zoom;
    const startX = e.clientX;
    const initTrack = tracksRef.current.find(t => t.id === trackId);
    if (!initTrack) return;
    const initDuration = initTrack.duration;
    const initDelay = initTrack.delay;
    showDragCapture('e-resize');
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dT = (dx / scaledW) * totalDuration;
      const newDur = Math.max(0.1, Math.min(totalDuration - initDelay, initDuration + dT));
      setTimelineState(prev => ({
        ...prev, tracks: prev.tracks.map(tr => tr.id === trackId ? { ...tr, duration: parseFloat(newDur.toFixed(2)) } : tr),
      }));
    };
    const onUp = () => { hideDragCapture(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration, setTimelineState]);

  const seekTo = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setTimelineState(prev => ({ ...prev, currentTime: Math.max(0, Math.min(totalDuration, pct * totalDuration)) }));
  };

  const trackContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    const triggerColors = { load: '#4ec9b0', hover: '#9cdcfe', click: '#e5a45a' } as const;
    showCtx(e, [
      { label: track.element, disabled: true },
      { label: `${track.animation} · ${track.duration}s · ${track.easing}`, disabled: true },
      { separator: true, label: '' },
      { label: 'Duplicate track', icon: '📋', shortcut: 'D', action: () => duplicateTrack(track) },
      { label: 'Reset delay to 0', icon: '↩', action: () => updateTrack(track.id, { delay: 0 }) },
      { separator: true, label: '' },
      { label: 'Trigger: Load', icon: '▶', action: () => updateTrack(track.id, { trigger: 'load' }) },
      { label: 'Trigger: Hover', icon: '◉', action: () => updateTrack(track.id, { trigger: 'hover' }) },
      { label: 'Trigger: Click', icon: '◈', action: () => updateTrack(track.id, { trigger: 'click' }) },
      { separator: true, label: '' },
      { label: 'Select animation…', icon: '✦', submenu: ANIMATION_PRESETS.slice(0, 20).map(p => ({ label: p.name, action: () => updateTrack(track.id, { animation: p.name }) })) },
      { separator: true, label: '' },
      { label: 'Delete track', icon: '🗑', danger: true, action: () => removeTrack(track.id) },
    ]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(8, z + (e.deltaY < 0 ? 0.25 : -0.25))));
    }
  };

  const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
  const scaledContentW = contentW * zoom;
  const tickInterval = zoom < 1 ? 1 : zoom < 2 ? 0.5 : zoom < 4 ? 0.25 : 0.1;
  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration + tickInterval / 2; t = parseFloat((t + tickInterval).toFixed(3))) {
    ticks.push(parseFloat(t.toFixed(3)));
  }

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  const selectedCandidates = new Set<string>(
    [
      selectedSelector?.trim() || '',
      selectedElement?.styles?.selector?.trim() || '',
      selectedElement?.id ? `#${selectedElement.id}` : '',
      selectedElement?.className
        ? `.${selectedElement.className.trim().split(/\s+/).filter(Boolean).join('.')}`
        : '',
      selectedElement?.tagName?.toLowerCase() || '',
    ].filter(Boolean)
  );

  const isTrackSelectedElement = (track: Track) => selectedCandidates.has(track.element.trim());

  useEffect(() => {
    if (selectedCandidates.size === 0) return;
    const matched = tracks.find(t => isTrackSelectedElement(t));
    if (matched) setSelectedTrackId(matched.id);
  }, [tracks, selectedSelector, selectedElement]);

  const [presetSearch, setPresetSearch] = useState('');
  const filteredPresets = (activeCategory === 'All'
    ? ANIMATION_PRESETS
    : ANIMATION_PRESETS.filter(p => p.category === activeCategory))
    .filter(p => !presetSearch.trim()
      || p.name.toLowerCase().includes(presetSearch.toLowerCase())
      || p.description.toLowerCase().includes(presetSearch.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#141416', overflow: 'hidden' }} onWheel={handleWheel}>

      {/* Header */}
      <div style={{ height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px', background: '#1e1e20', borderBottom: '1px solid #2e2e30', userSelect: 'none' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#666', marginRight: 2 }}>Timeline</span>

        <button title="Add Track" onClick={addTrack} style={hdrBtn}><FiPlus size={12} /></button>

        <div style={{ width: 1, height: 14, background: '#333', margin: '0 1px' }} />

        <button title={playing ? 'Stop' : 'Play preview'}
          onClick={() => { if (playing) stopAndReset(); else startPlayback(); }}
          style={{ ...hdrBtn, color: playing ? '#e5a45a' : '#555', background: playing ? 'rgba(229,164,90,0.1)' : 'none', borderRadius: 3 }}>
          {playing ? <FiSquare size={11} /> : <FiPlay size={11} />}
        </button>

        <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace', minWidth: 38, padding: '0 3px' }}>{currentTime.toFixed(2)}s</span>

        <button title="Reset" onClick={stopAndReset} style={hdrBtn}><FiRefreshCw size={11} /></button>

        <div style={{ width: 1, height: 14, background: '#333', margin: '0 1px' }} />

        <button title="Preset Library" onClick={() => setShowPresetLibrary(s => !s)}
          style={{ ...hdrBtn, width: 'auto', padding: '0 7px', fontSize: 10, fontWeight: 600, color: showPresetLibrary ? '#e5a45a' : '#888', background: showPresetLibrary ? 'rgba(229,164,90,0.12)' : 'none', border: `1px solid ${showPresetLibrary ? 'rgba(229,164,90,0.35)' : '#2e2e30'}`, borderRadius: 3 }}>
          Library
        </button>

        <button title="Create custom @keyframes"
          onClick={() => { setEditingCustom({ name: '', keyframes: '@keyframes myAnim {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}' }); setEditingOriginalName(undefined); setVisualKFs([defaultKF(0), defaultKF(100)]); setCustomEditorMode('visual'); setShowCustomEditor(true); }}
          style={{ ...hdrBtn, width: 'auto', padding: '0 7px', fontSize: 10, fontWeight: 600, color: '#9cdcfe', background: 'rgba(156,220,254,0.07)', border: '1px solid rgba(156,220,254,0.25)', borderRadius: 3 }}>
          + Custom
        </button>

        <button title="Apply animations to page" onClick={applyAnimations}
          style={{ ...hdrBtn, width: 'auto', padding: '0 8px', fontSize: 10, fontWeight: 600, color: appliedMsg ? '#4ec9b0' : '#e5a45a', background: appliedMsg ? 'rgba(78,201,176,0.1)' : 'rgba(229,164,90,0.1)', border: `1px solid ${appliedMsg ? 'rgba(78,201,176,0.3)' : 'rgba(229,164,90,0.28)'}`, borderRadius: 3, gap: 4, display: 'flex', alignItems: 'center' }}>
          {appliedMsg ? <><FiCheck size={10} /> Applied</> : 'Apply'}
        </button>

        <button title="Clear animations" onClick={clearAnimations} style={{ ...hdrBtn, fontSize: 11, color: '#444', width: 22 }}>↺</button>

        <div style={{ flex: 1 }} />

        <button title="Zoom Out" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} style={hdrBtn}><FiZoomOut size={12} /></button>
        <span style={{ fontSize: 10, color: '#555', minWidth: 32, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button title="Zoom In" onClick={() => setZoom(z => Math.min(8, z + 0.5))} style={hdrBtn}><FiZoomIn size={12} /></button>
        <button title="Reset Zoom" onClick={() => setZoom(1)} style={{ ...hdrBtn, fontSize: 10, color: '#666', width: 'auto', padding: '0 5px' }}>1:1</button>

        {onClose && (
          <>
            <div style={{ width: 1, height: 14, background: '#333', margin: '0 2px' }} />
            <button title="Close" onClick={onClose} style={hdrBtn}><FiX size={12} /></button>
          </>
        )}
      </div>

      {/* Preset Library */}
      {showPresetLibrary && (
        <div style={{ flexShrink: 0, maxHeight: 220, borderBottom: '1px solid #2e2e30', background: '#18181a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '5px 8px', display: 'flex', gap: 3, flexWrap: 'wrap', borderBottom: '1px solid #252528', alignItems: 'center' }}>
            {['All', ...ANIMATION_CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: '2px 8px', fontSize: 9, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  background: activeCategory === cat ? 'rgba(229,164,90,0.15)' : '#222224',
                  border: `1px solid ${activeCategory === cat ? 'rgba(229,164,90,0.45)' : '#2e2e30'}`,
                  color: activeCategory === cat ? '#e5a45a' : '#888', fontWeight: 500 }}>
                {cat}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <input value={presetSearch} onChange={e => setPresetSearch(e.target.value)} placeholder="Search…"
              style={{ background: '#111', border: '1px solid #2e2e30', borderRadius: 10, padding: '2px 8px', fontSize: 10, color: '#aaa', outline: 'none', width: 100 }} />
            <button onClick={() => setShowPresetLibrary(false)} style={hdrBtn}><FiX size={10} /></button>
          </div>
          <div style={{ overflowY: 'auto', padding: 6, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 4 }}>
            {filteredPresets.map(p => (
              <button key={p.name} onClick={() => applyPreset(p.name)} title={p.description}
                style={{ padding: '6px 8px', textAlign: 'left', background: animationConfig.preset === p.name ? 'rgba(229,164,90,0.1)' : '#222224',
                  border: `1px solid ${animationConfig.preset === p.name ? 'rgba(229,164,90,0.45)' : '#2e2e30'}`,
                  borderRadius: 4, cursor: 'pointer', color: '#aaa', display: 'flex', flexDirection: 'column', gap: 2 }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#555')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = animationConfig.preset === p.name ? 'rgba(229,164,90,0.45)' : '#2e2e30')}>
                <span style={{ fontSize: 10, fontWeight: 600, color: animationConfig.preset === p.name ? '#e5a45a' : '#ccc' }}>{p.name}</span>
                <span style={{ fontSize: 8, color: '#555', textTransform: 'uppercase' }}>{p.category}</span>
              </button>
            ))}
            {customAnimations.length > 0 && activeCategory === 'All' && (
              <>
                <div style={{ gridColumn: '1 / -1', fontSize: 9, color: '#9cdcfe', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 4 }}>Custom</div>
                {customAnimations.map(c => (
                  <div key={c.name} style={{ padding: '6px 8px', background: '#222224', border: '1px solid #2e2e30', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <button onClick={() => applyPreset(c.name)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: '#9cdcfe', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{c.name}</button>
                      <button onClick={() => { setEditingCustom(c); setEditingOriginalName(c.name); setVisualKFs([defaultKF(0), defaultKF(100)]); setCustomEditorMode('code'); setShowCustomEditor(true); }} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', padding: 2 }}><FiEdit3 size={10} /></button>
                      <button onClick={() => deleteCustomAnimation(c.name)} style={{ background: 'none', border: 'none', color: '#f88', cursor: 'pointer', padding: 2 }}><FiTrash2 size={10} /></button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Custom Animation Editor */}
      {showCustomEditor && editingCustom && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setShowCustomEditor(false); setEditingCustom(null); setEditingOriginalName(undefined); }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#1e1e20', border: '1px solid #3e3e40', borderRadius: 8, width: 'min(560px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>

            {/* Dialog Header */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #2e2e30', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiEdit3 size={13} color="#9cdcfe" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {editingCustom.name ? `Edit "${editingCustom.name}"` : 'Create Custom Animation'}
              </span>
              <div style={{ flex: 1 }} />
              {/* Mode toggle */}
              <div style={{ display: 'flex', background: '#111', borderRadius: 4, padding: 2, gap: 1 }}>
                {(['visual', 'code'] as const).map(m => (
                  <button key={m} onClick={() => {
                    if (m === 'code' && customEditorMode === 'visual' && visualKFs.length > 0) {
                      setEditingCustom({ ...editingCustom, keyframes: visualKFtoCode(editingCustom.name, visualKFs) });
                    }
                    setCustomEditorMode(m);
                  }}
                    style={{ padding: '2px 10px', fontSize: 9, fontWeight: 700, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', background: customEditorMode === m ? (m === 'visual' ? 'rgba(156,220,254,0.18)' : 'rgba(229,164,90,0.18)') : 'transparent', color: customEditorMode === m ? (m === 'visual' ? '#9cdcfe' : '#e5a45a') : '#555' }}>
                    {m === 'visual' ? '◈ Visual' : '</> Code'}
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowCustomEditor(false); setEditingCustom(null); setEditingOriginalName(undefined); }} style={hdrBtn}><FiX size={12} /></button>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
              {/* Name */}
              <div>
                <div style={{ fontSize: 9, color: '#777', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Animation Name</div>
                <input value={editingCustom.name} onChange={e => setEditingCustom({ ...editingCustom, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                  placeholder="myAwesomeAnim"
                  style={{ width: '100%', background: '#252528', border: '1px solid #2e2e30', borderRadius: 4, padding: '5px 8px', fontSize: 11, color: '#ccc', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>

              {/* Visual mode */}
              {customEditorMode === 'visual' ? (
                <div>
                  <div style={{ fontSize: 9, color: '#9cdcfe', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>◈ Keyframe Stops</span>
                    <span style={{ color: '#444', fontWeight: 400, fontSize: 8 }}>— set properties at each point in time</span>
                  </div>
                  <VisualKeyframeEditor name={editingCustom.name} stops={visualKFs} onChange={setVisualKFs} />
                </div>
              ) : (
                /* Code mode */
                <div>
                  <div style={{ fontSize: 9, color: '#777', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>@keyframes CSS</div>
                  <textarea value={editingCustom.keyframes}
                    onChange={e => setEditingCustom({ ...editingCustom, keyframes: e.target.value })}
                    rows={12}
                    style={{ width: '100%', background: '#111', border: '1px solid #2e2e30', borderRadius: 4, padding: 8, fontSize: 11, color: '#dcdcaa', outline: 'none', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                  />
                  {/* Templates */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    <span style={{ fontSize: 9, color: '#555', alignSelf: 'center' }}>Templates:</span>
                    {[
                      { label: 'Fade',   tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  from { opacity: 0; }\n  to   { opacity: 1; }\n}` },
                      { label: 'Bounce', tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-30px); }\n}` },
                      { label: 'Glow',   tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%, 100% { box-shadow: 0 0 4px #fff; }\n  50% { box-shadow: 0 0 24px #e5a45a; }\n}` },
                      { label: 'Color',  tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%   { background: #ff5252; }\n  50%  { background: #4caf50; }\n  100% { background: #ff5252; }\n}` },
                      { label: 'Morph',  tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%   { border-radius: 0; }\n  50%  { border-radius: 50%; }\n  100% { border-radius: 0; }\n}` },
                    ].map(t => (
                      <button key={t.label} onClick={() => setEditingCustom({ ...editingCustom, keyframes: t.tpl(editingCustom.name) })}
                        style={{ padding: '2px 8px', fontSize: 9, background: '#252528', border: '1px solid #2e2e30', borderRadius: 10, color: '#888', cursor: 'pointer' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '8px 12px', borderTop: '1px solid #2e2e30', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 9, color: '#444' }}>
                {customEditorMode === 'visual' ? 'Visual mode auto-generates @keyframes CSS' : 'Write raw @keyframes CSS'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setShowCustomEditor(false); setEditingCustom(null); setEditingOriginalName(undefined); }}
                  style={{ padding: '5px 12px', background: 'none', border: '1px solid #2e2e30', borderRadius: 4, color: '#777', cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                <button onClick={() => {
                  const finalAnim = customEditorMode === 'visual' && visualKFs.length > 0
                    ? { ...editingCustom, keyframes: visualKFtoCode(editingCustom.name, visualKFs) }
                    : editingCustom;
                  saveCustomAnimation(finalAnim, editingOriginalName);
                }}
                  style={{ padding: '5px 12px', background: 'rgba(78,201,176,0.12)', border: '1px solid rgba(78,201,176,0.35)', borderRadius: 4, color: '#4ec9b0', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiSave size={11} /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* Track list + ruler */}
        <div ref={timelineRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <div style={{ minWidth: labelWidth + scaledContentW, position: 'relative' }}>

            {/* Ruler */}
            <div style={{ display: 'flex', height: 22, background: '#18181a', borderBottom: '1px solid #2e2e30', position: 'sticky', top: 0, zIndex: 5 }}>
              <div style={{ width: labelWidth, flexShrink: 0, borderRight: '1px solid #2e2e30', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                <span style={{ fontSize: 8, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Element</span>
              </div>
              <div style={{ flex: 1, position: 'relative', cursor: 'pointer' }} onClick={seekTo}>
                {ticks.map((t, i) => {
                  const pct = (t / totalDuration) * 100;
                  const isMajor = Math.abs(t % 1) < 0.001;
                  const isMid = Math.abs(t % 0.5) < 0.001;
                  return (
                    <div key={i} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, borderLeft: `1px solid ${isMajor ? 'rgba(255,255,255,0.15)' : isMid ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)'}`, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                      {isMajor && <span style={{ fontSize: 8, color: '#666', paddingLeft: 2, whiteSpace: 'nowrap' }}>{t.toFixed(0)}s</span>}
                      {!isMajor && isMid && <span style={{ fontSize: 7, color: '#444', paddingLeft: 2, whiteSpace: 'nowrap' }}>.5</span>}
                    </div>
                  );
                })}
                {/* Playhead */}
                <div style={{ position: 'absolute', left: `${(currentTime / totalDuration) * 100}%`, top: 0, bottom: 0, width: 1, background: '#e5a45a', zIndex: 10, pointerEvents: 'none' }}>
                  <div style={{ width: 8, height: 8, background: '#e5a45a', borderRadius: '50%', transform: 'translate(-3.5px, -2px)' }} />
                </div>
              </div>
            </div>

            {/* Tracks */}
            {tracks.map(track => {
              const isSelected = selectedTrackId === track.id;
              const isLinked = isTrackSelectedElement(track);
              const isCustom = customAnimations.some(c => c.name === track.animation);
              const triggerColor = (track.trigger || 'load') === 'load' ? '#4ec9b0' : track.trigger === 'hover' ? '#9cdcfe' : '#e5a45a';
              return (
                <div key={track.id}
                  style={{ display: 'flex', height: TRACK_H, borderBottom: '1px solid rgba(255,255,255,0.03)', background: isSelected ? 'rgba(255,255,255,0.06)' : isLinked ? 'rgba(229,164,90,0.08)' : 'transparent', boxShadow: isLinked ? 'inset 2px 0 0 #e5a45a' : 'none', cursor: 'default' }}
                  onClick={() => setSelectedTrackId(track.id)}
                  onContextMenu={e => trackContextMenu(e, track)}>

                  {/* Label */}
                  <div style={{ width: labelWidth, flexShrink: 0, borderRight: '1px solid #2a2a2c', display: 'flex', alignItems: 'center', padding: '0 5px', gap: 4, overflow: 'hidden' }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, background: track.color, flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.element}</div>
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {isCustom && <span style={{ fontSize: 8, color: '#9cdcfe' }}>★</span>}
                        <span style={{ fontSize: 8, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.animation}</span>
                        <span style={{ padding: '0 3px', borderRadius: 6, fontSize: 7, fontWeight: 700, background: `${triggerColor}18`, color: triggerColor, textTransform: 'uppercase', flexShrink: 0 }}>
                          {(track.trigger || 'load').slice(0, 4)}
                        </span>
                      </div>
                    </div>
                    <button title="Delete" onClick={e => { e.stopPropagation(); removeTrack(track.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', padding: 2, display: 'flex', borderRadius: 2, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f88')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#333')}>
                      <FiX size={10} />
                    </button>
                  </div>

                  {/* Track bar area */}
                  <div style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
                    <div style={{ position: 'absolute', left: `${(currentTime / totalDuration) * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(229,164,90,0.2)', zIndex: 3, pointerEvents: 'none' }} />
                    {/* Track block */}
                    <div
                      title={`${track.animation} — delay: ${track.delay}s, dur: ${track.duration}s, easing: ${track.easing}`}
                      style={{ position: 'absolute', left: `${(track.delay / totalDuration) * 100}%`, width: `${(track.duration / totalDuration) * 100}%`, top: 4, bottom: 4, background: `linear-gradient(90deg, ${track.color}1a, ${track.color}44)`, border: `1px solid ${track.color}77`, borderRadius: 3, cursor: 'grab', zIndex: 2, display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 6 }}
                      onMouseDown={e => startTrackDrag(e, track.id)}>
                      <span style={{ fontSize: 8, color: track.color, padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'none', fontWeight: 600 }}>{track.animation}</span>
                      {/* Keyframe percentage markers */}
                      {[25, 50, 75].map(pct => (
                        <div key={pct} style={{ position: 'absolute', left: `${pct}%`, top: '15%', bottom: '15%', width: 1, background: `${track.color}40`, pointerEvents: 'none' }} />
                      ))}
                      {/* Start dot */}
                      <div style={{ position: 'absolute', left: -1, top: '50%', transform: 'translate(-3px, -3px)', width: 6, height: 6, background: track.color, borderRadius: '50%', pointerEvents: 'none', zIndex: 4 }} />
                      {/* Resize handle */}
                      <div title="Drag to resize duration"
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 7, cursor: 'e-resize', background: `${track.color}22`, zIndex: 3, borderLeft: `1px dashed ${track.color}55` }}
                        onMouseDown={e => { e.stopPropagation(); startResizeDuration(e, track.id); }} />
                      {/* End dot */}
                      <div style={{ position: 'absolute', right: -1, top: '50%', transform: 'translate(3px, -3px)', width: 6, height: 6, background: track.color, borderRadius: '50%', pointerEvents: 'none', zIndex: 4 }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {tracks.length === 0 && (
              <div style={{ padding: '16px 12px', fontSize: 11, color: '#444', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>No tracks. Click <strong style={{ color: '#777' }}>+</strong> to add or browse <strong style={{ color: '#e5a45a' }}>Library</strong>.</div>
              </div>
            )}
          </div>
        </div>

        {/* Track properties panel */}
        {selectedTrack && (
          <div style={{ width: 188, flexShrink: 0, borderLeft: '1px solid #2e2e30', overflowY: 'auto', background: '#18181a', padding: '6px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Track
              <button onClick={() => setShowCurveEditor(s => !s)}
                style={{ background: showCurveEditor ? 'rgba(229,164,90,0.15)' : '#1e1e20', border: `1px solid ${showCurveEditor ? 'rgba(229,164,90,0.4)' : '#2e2e30'}`, borderRadius: 3, color: showCurveEditor ? '#e5a45a' : '#666', cursor: 'pointer', padding: '1px 5px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                <MiniCurve value={selectedTrack.easing} size={14} /> Curve
              </button>
            </div>

            <PropRow label="Selector">
              <input value={selectedTrack.element} onChange={e => updateTrack(selectedTrack.id, { element: e.target.value })}
                style={trkInp} placeholder=".class, #id, tag" />
            </PropRow>

            <PropRow label="Animation">
              <select value={selectedTrack.animation} onChange={e => { updateTrack(selectedTrack.id, { animation: e.target.value }); setAnimationConfig({ preset: e.target.value }); }} style={trkSel}>
                <option value="none">none</option>
                {customAnimations.length > 0 && (
                  <optgroup label="★ Custom">{customAnimations.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</optgroup>
                )}
                {ANIMATION_CATEGORIES.map(cat => (
                  <optgroup key={cat} label={cat}>
                    {ANIMATION_PRESETS.filter(p => p.category === cat).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </PropRow>

            <PropRow label={`Dur ${selectedTrack.duration.toFixed(1)}s`}>
              <input type="range" min="0.1" max="10" step="0.1" value={selectedTrack.duration}
                onChange={e => updateTrack(selectedTrack.id, { duration: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: '#e5a45a' } as any} />
            </PropRow>

            <PropRow label={`Delay ${selectedTrack.delay.toFixed(1)}s`}>
              <input type="range" min="0" max="8" step="0.1" value={selectedTrack.delay}
                onChange={e => updateTrack(selectedTrack.id, { delay: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: '#e5a45a' } as any} />
            </PropRow>

            <PropRow label="Easing">
              <div style={{ display: 'flex', gap: 3, flex: 1, alignItems: 'center' }}>
                <MiniCurve value={selectedTrack.easing} size={22} />
                <select value={selectedTrack.easing} onChange={e => updateTrack(selectedTrack.id, { easing: e.target.value })} style={{ ...trkSel, flex: 1 }}>
                  {EASING_NAMED.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  {!EASING_NAMED.some(e => e.value === selectedTrack.easing) && (
                    <option value={selectedTrack.easing}>{selectedTrack.easing}</option>
                  )}
                </select>
              </div>
            </PropRow>

            {showCurveEditor && (
              <div style={{ marginTop: 4 }}>
                <CubicBezierEditor
                  value={selectedTrack.easing.startsWith('cubic-bezier') ? selectedTrack.easing : 'cubic-bezier(0.25,0.1,0.25,1)'}
                  onChange={v => updateTrack(selectedTrack.id, { easing: v })}
                />
              </div>
            )}

            <PropRow label="Repeat">
              <select value={selectedTrack.iteration} onChange={e => updateTrack(selectedTrack.id, { iteration: e.target.value })} style={trkSel}>
                {['1', '2', '3', '5', 'infinite'].map(v => <option key={v}>{v}</option>)}
              </select>
            </PropRow>

            <PropRow label="Trigger">
              <div style={{ display: 'flex', gap: 2, flex: 1, background: '#111', border: '1px solid #2e2e30', borderRadius: 3, padding: 2, flexWrap: 'wrap' }}>
                {(['load', 'hover', 'click', 'scroll'] as const).map(opt => {
                  const cur = selectedTrack.trigger || 'load';
                  const sel2 = cur === opt;
                  const triggerColor = { load: '#4ec9b0', hover: '#9cdcfe', click: '#e5a45a', scroll: '#c586c0' }[opt];
                  return (
                    <button key={opt} onClick={() => updateTrack(selectedTrack.id, { trigger: opt })}
                      title={opt === 'scroll' ? 'Animate when element scrolls into view (Intersection Observer)' : undefined}
                      style={{ flex: 1, padding: '2px 0', fontSize: 8, fontWeight: 600, background: sel2 ? `${triggerColor}28` : 'transparent', color: sel2 ? triggerColor : '#555', border: 'none', borderRadius: 2, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 28 }}>
                      {opt === 'scroll' ? '↕' : opt}
                    </button>
                  );
                })}
              </div>
            </PropRow>
            {(selectedTrack.trigger === 'scroll') && (
              <div style={{ fontSize: 8, color: '#c586c0', background: 'rgba(197,134,192,0.08)', border: '1px solid rgba(197,134,192,0.2)', borderRadius: 3, padding: '3px 6px', marginBottom: 4 }}>
                ↕ Plays when element enters viewport (Intersection Observer)
              </div>
            )}

            <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
              <button onClick={() => duplicateTrack(selectedTrack)}
                style={{ flex: 1, padding: '4px', background: '#1e1e20', border: '1px solid #2e2e30', borderRadius: 3, color: '#888', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <FiCopy size={9} /> Copy
              </button>
              <button onClick={() => { setSelectedTrackId(null); removeTrack(selectedTrack.id); }}
                style={{ flex: 1, padding: '4px', background: 'rgba(248,136,136,0.08)', border: '1px solid rgba(248,136,136,0.25)', borderRadius: 3, color: '#f88', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <FiTrash2 size={9} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {ctxEl}
    </div>
  );
};

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
      <span style={{ fontSize: 9, color: '#666', minWidth: 46, flexShrink: 0, lineHeight: 1.2 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>{children}</div>
    </div>
  );
}

const hdrBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 24, height: 24, background: 'none', border: 'none',
  cursor: 'pointer', color: '#555', borderRadius: 3, flexShrink: 0,
};

const trkInp: React.CSSProperties = {
  flex: 1, background: '#111', border: '1px solid #2e2e30', borderRadius: 3,
  padding: '2px 5px', fontSize: 10, color: '#bbb', outline: 'none', fontFamily: 'monospace', minWidth: 0,
};

const trkSel: React.CSSProperties = {
  flex: 1, background: '#111', border: '1px solid #2e2e30', borderRadius: 3,
  padding: '2px 5px', fontSize: 10, color: '#bbb', outline: 'none', cursor: 'pointer', minWidth: 0,
};

export default TimelinePanel;
