import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { FiPlay, FiSquare, FiPlus, FiZoomIn, FiZoomOut, FiX, FiRefreshCw, FiCheck, FiChevronDown, FiChevronRight, FiCode, FiDownload, FiCopy } from 'react-icons/fi';
import { getTargetHtmlFile, getTargetJsFile, insertBeforeClosingTag } from '../utils/projectFiles';

/* ─── Types ─── */
export interface GSAPTrack {
  id: string;
  selector: string;
  color: string;
  duration: number;
  delay: number;
  type: 'to' | 'from' | 'fromTo';
  ease: string;
  // Animated props (to / from values as strings, blank = skip)
  opacity: string;    fromOpacity: string;
  x: string;         fromX: string;
  y: string;         fromY: string;
  scale: string;     fromScale: string;
  rotation: string;  fromRotation: string;
  // ScrollTrigger
  useScrollTrigger: boolean;
  stTrigger: string;
  stStart: string;
  stEnd: string;
  stScrub: boolean;
  stScrubAmount: number;
  stPin: boolean;
  stMarkers: boolean;
  stOnce: boolean;
  stToggleActions: string;
}

const COLORS = ['#88ce02', '#4ec9b0', '#e5a45a', '#9cdcfe', '#c586c0', '#f44747', '#dcdcaa'];
const TRACK_H = 28;
const LABEL_W = 160;
const GSAP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
const ST_CDN   = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js';
const LS_KEY   = 'gsap-timeline-tracks-v1';

const EASE_OPTIONS = ['none','power1.out','power2.out','power3.out','power4.out','power1.inOut','power2.inOut','back.out(1.7)','bounce.out','elastic.out(1,0.3)','circ.out','expo.out','sine.out','sine.inOut'];
const TOGGLE_ACTIONS = ['play none none none','play none none reverse','restart none none reset','play pause resume reverse'];

const defaultTrack = (overrides?: Partial<GSAPTrack>): GSAPTrack => ({
  id: Date.now().toString(), selector: '.element', color: COLORS[0],
  duration: 0.8, delay: 0, type: 'from', ease: 'power2.out',
  opacity: '0', fromOpacity: '', x: '', fromX: '',
  y: '50', fromY: '', scale: '', fromScale: '',
  rotation: '', fromRotation: '',
  useScrollTrigger: false, stTrigger: '', stStart: 'top 80%', stEnd: 'bottom 20%',
  stScrub: false, stScrubAmount: 1, stPin: false, stMarkers: false, stOnce: false,
  stToggleActions: 'play none none none',
  ...overrides,
});

function loadTracks(): GSAPTrack[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [
      defaultTrack({ id: '1', selector: '.hero', color: COLORS[0], opacity: '0', y: '60', delay: 0 }),
      defaultTrack({ id: '2', selector: 'h2', color: COLORS[1], opacity: '0', y: '30', delay: 0.3 }),
      defaultTrack({ id: '3', selector: '.btn', color: COLORS[2], opacity: '0', scale: '0.8', delay: 0.7 }),
    ];
    return JSON.parse(raw);
  } catch { return []; }
}

/* ─── Parse GSAP calls from JS code ─── */
function parseTracksFromJS(jsCode: string, existingCount: number): GSAPTrack[] {
  const tracks: GSAPTrack[] = [];
  // Match gsap.to / gsap.from / gsap.fromTo calls
  const re = /gsap\.(to|from|fromTo)\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  let idx = existingCount;
  while ((m = re.exec(jsCode)) !== null) {
    const type = m[1] as 'to' | 'from' | 'fromTo';
    const selector = m[2];
    const propsStr = m[3];
    const getProp = (key: string) => {
      const r = new RegExp(`\\b${key}\\s*:\\s*([\\d.-]+)`, 'i');
      const match = propsStr.match(r);
      return match ? match[1] : '';
    };
    const getStrProp = (key: string) => {
      const r = new RegExp(`\\b${key}\\s*:\\s*["']?([^"',\\n}]+)["']?`, 'i');
      const match = propsStr.match(r);
      return match ? match[1].trim() : '';
    };
    const hasST = /scrollTrigger/i.test(propsStr);
    const track: GSAPTrack = {
      ...defaultTrack(),
      id: `parsed-${Date.now()}-${idx}`,
      selector,
      type,
      color: COLORS[idx % COLORS.length],
      opacity: getProp('opacity'),
      x: getProp('x'),
      y: getProp('y'),
      scale: getProp('scale'),
      rotation: getProp('rotation'),
      duration: parseFloat(getProp('duration') || '0.8'),
      delay: parseFloat(getProp('delay') || '0'),
      ease: getStrProp('ease') || 'power2.out',
      useScrollTrigger: hasST,
      stStart: getStrProp('start') || 'top 80%',
      stEnd: getStrProp('end') || 'bottom 20%',
    };
    tracks.push(track);
    idx++;
  }
  return tracks;
}
function saveTracks(t: GSAPTrack[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(t)); } catch {}
}

/* ─── Code gen ─── */
function trackToCode(t: GSAPTrack): string {
  const toProps: string[] = [];
  const fromProps: string[] = [];

  const push = (arr: string[], key: string, val: string) => {
    const v = val.trim();
    if (!v) return;
    const isNum = /^-?[\d.]+$/.test(v);
    arr.push(`    ${key}: ${isNum ? v : `"${v}"`}`);
  };

  if (t.type === 'from' || t.type === 'to') {
    const arr = t.type === 'from' ? fromProps : toProps;
    push(arr, 'opacity', t.opacity);
    push(arr, 'x', t.x);
    push(arr, 'y', t.y);
    push(arr, 'scale', t.scale);
    push(arr, 'rotation', t.rotation);
  } else {
    push(fromProps, 'opacity', t.fromOpacity || t.opacity);
    push(fromProps, 'x', t.fromX || t.x);
    push(fromProps, 'y', t.fromY || t.y);
    push(fromProps, 'scale', t.fromScale || t.scale);
    push(fromProps, 'rotation', t.fromRotation || t.rotation);
    push(toProps, 'opacity', t.opacity);
    push(toProps, 'x', t.x);
    push(toProps, 'y', t.y);
    push(toProps, 'scale', t.scale);
    push(toProps, 'rotation', t.rotation);
  }

  const common = [
    `    duration: ${t.duration}`,
    `    ease: "${t.ease}"`,
    ...(t.delay > 0 && !t.useScrollTrigger ? [`    delay: ${t.delay}`] : []),
  ];

  if (t.useScrollTrigger) {
    const stLines = [
      `      trigger: "${t.stTrigger || t.selector}"`,
      `      start: "${t.stStart}"`,
      `      end: "${t.stEnd}"`,
      ...(t.stScrub ? [`      scrub: ${t.stScrubAmount}`] : [`      toggleActions: "${t.stToggleActions}"`]),
      ...(t.stPin ? ['      pin: true'] : []),
      ...(t.stMarkers ? ['      markers: true'] : []),
      ...(t.stOnce ? ['      once: true'] : []),
    ];
    common.push(`    scrollTrigger: {\n${stLines.join(',\n')}\n    }`);
  }

  if (t.type === 'fromTo') {
    return `gsap.fromTo("${t.selector}",\n  {\n${fromProps.join(',\n') || '    opacity: 0'}\n  },\n  {\n${[...toProps, ...common].join(',\n')}\n  }\n);`;
  }
  const props = t.type === 'from' ? [...fromProps, ...common] : [...toProps, ...common];
  return `gsap.${t.type}("${t.selector}", {\n${props.join(',\n') || '    opacity: 1'}\n});`;
}

function buildFullCode(tracks: GSAPTrack[]): { js: string; needsST: boolean } {
  const needsST = tracks.some(t => t.useScrollTrigger);
  const parts = tracks.filter(t => t.selector.trim()).map(t => trackToCode(t));
  const header = needsST ? 'gsap.registerPlugin(ScrollTrigger);\n\n' : '';
  return { js: header + parts.join('\n\n'), needsST };
}

/* ─── Drag capture ─── */
function showDrag(cursor: string) { document.body.style.cursor = cursor; document.body.style.userSelect = 'none'; }
function hideDrag() { document.body.style.cursor = ''; document.body.style.userSelect = ''; }

const hdrBtn: React.CSSProperties = {
  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', borderRadius: 3, cursor: 'pointer', background: 'none', color: '#555', flexShrink: 0,
};

/* ─── Selector dropdown ─── */
function parseSelectors(html: string): string[] {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const s = new Set<string>();
    doc.querySelectorAll('[id]').forEach(el => el.id && s.add(`#${el.id}`));
    doc.querySelectorAll('[class]').forEach(el => el.classList.forEach(c => { if (c && !c.startsWith('__') && c.length > 0) s.add(`.${c}`); }));
    ['header','nav','main','footer','section','article','aside','h1','h2','h3','h4','h5','p','a','button','ul','ol','li','img','video','canvas','form','input','span','div'].forEach(tag => {
      if (doc.querySelector(tag)) s.add(tag);
    });
    return Array.from(s);
  } catch { return []; }
}

function SelectorInput({ value, onChange, selectors, selectedSelector }: { value: string; onChange: (v: string) => void; selectors: string[]; selectedSelector: string | null }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const filtered = selectors.filter(s => !search || s.toLowerCase().includes(search.toLowerCase())).slice(0, 40);
  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder=".element"
          style={{ flex: 1, background: '#111', border: '1px solid #333', borderRadius: 3, padding: '3px 6px', fontSize: 11, color: '#ccc', outline: 'none', fontFamily: 'monospace' }} />
        <button onClick={() => setOpen(o => !o)} title="Pick selector"
          style={{ ...hdrBtn, width: 22, height: 22, background: open ? 'rgba(136,206,2,0.15)' : '#1a1a1a', border: '1px solid #333', color: open ? '#88ce02' : '#666' }}>
          <FiChevronDown size={10} />
        </button>
        {selectedSelector && (
          <button onClick={() => onChange(selectedSelector)} title={`Use: ${selectedSelector}`}
            style={{ ...hdrBtn, width: 22, height: 22, background: 'rgba(78,201,176,0.1)', border: '1px solid rgba(78,201,176,0.3)', color: '#4ec9b0', fontSize: 9, fontFamily: 'inherit' }}>
            ⊕
          </button>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, marginTop: 2, maxHeight: 180, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search selectors…"
            style={{ width: '100%', background: '#111', border: 'none', borderBottom: '1px solid #2a2a2a', padding: '5px 8px', fontSize: 10, color: '#ccc', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ overflowY: 'auto', maxHeight: 135 }}>
            {filtered.map(s => (
              <div key={s} onClick={() => { onChange(s); setOpen(false); setSearch(''); }}
                style={{ padding: '4px 8px', fontSize: 11, color: s === value ? '#88ce02' : '#aaa', cursor: 'pointer', fontFamily: 'monospace', background: s === value ? 'rgba(136,206,2,0.08)' : 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = s === value ? 'rgba(136,206,2,0.08)' : 'transparent')}>
                {s}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '8px', fontSize: 10, color: '#555', textAlign: 'center' }}>No selectors found</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Track Editor (inline) ─── */
function TrackEditor({ track, onUpdate, selectors, selectedSelector }: { track: GSAPTrack; onUpdate: (p: Partial<GSAPTrack>) => void; selectors: string[]; selectedSelector: string | null }) {
  const inp: React.CSSProperties = { width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 3, padding: '3px 6px', fontSize: 10, color: '#ccc', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'monospace' };
  const lbl: React.CSSProperties = { fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 2 };
  const row: React.CSSProperties = { display: 'grid', gap: 8, marginBottom: 8 };

  return (
    <div style={{ padding: '10px 12px', background: '#161618', borderTop: '1px solid #2a2a2a' }}>
      {/* Selector + Type + Ease */}
      <div style={{ ...row, gridTemplateColumns: '1fr auto auto' }}>
        <div>
          <div style={lbl}>Selector</div>
          <SelectorInput value={track.selector} onChange={v => onUpdate({ selector: v })} selectors={selectors} selectedSelector={selectedSelector} />
        </div>
        <div>
          <div style={lbl}>Type</div>
          <select value={track.type} onChange={e => onUpdate({ type: e.target.value as GSAPTrack['type'] })}
            style={{ ...inp, width: 80 }}>
            <option value="from">from()</option>
            <option value="to">to()</option>
            <option value="fromTo">fromTo()</option>
          </select>
        </div>
        <div>
          <div style={lbl}>Ease</div>
          <select value={track.ease} onChange={e => onUpdate({ ease: e.target.value })} style={{ ...inp, width: 130 }}>
            {EASE_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Props */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
          {track.type === 'fromTo' ? 'FROM values' : track.type === 'from' ? 'FROM values (start state)' : 'TO values (end state)'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
          {[['opacity','Opacity',track.opacity,'opacity'],['x','X (px)',track.x,'x'],['y','Y (px)',track.y,'y'],['scale','Scale',track.scale,'scale'],['rotation','Rotation',track.rotation,'rotation']].map(([k, label, val]) => (
            <div key={k as string}>
              <div style={lbl}>{label}</div>
              <input value={val as string} onChange={e => onUpdate({ [k as string]: e.target.value } as any)}
                placeholder="—" style={inp} />
            </div>
          ))}
        </div>
      </div>

      {/* To values for fromTo */}
      {track.type === 'fromTo' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>TO values (end state)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
            {[['fromOpacity','Opacity',track.fromOpacity],['fromX','X (px)',track.fromX],['fromY','Y (px)',track.fromY],['fromScale','Scale',track.fromScale],['fromRotation','Rotation',track.fromRotation]].map(([k, label, val]) => (
              <div key={k as string}>
                <div style={lbl}>{label}</div>
                <input value={val as string} onChange={e => onUpdate({ [k as string]: e.target.value } as any)}
                  placeholder="—" style={inp} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ScrollTrigger toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: track.useScrollTrigger ? 8 : 0, padding: '5px 0', borderTop: '1px solid #222' }}>
        <div style={{ width: 26, height: 14, borderRadius: 7, background: track.useScrollTrigger ? '#88ce02' : '#333', border: `1px solid ${track.useScrollTrigger ? '#88ce02' : '#444'}`, position: 'relative', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => onUpdate({ useScrollTrigger: !track.useScrollTrigger })}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: track.useScrollTrigger ? '#fff' : '#666', position: 'absolute', top: 1, left: track.useScrollTrigger ? 13 : 1, transition: 'left 0.15s' }} />
        </div>
        <span style={{ fontSize: 10, color: track.useScrollTrigger ? '#88ce02' : '#666', fontWeight: 600 }}>ScrollTrigger</span>
      </div>

      {track.useScrollTrigger && (
        <div style={{ background: 'rgba(136,206,2,0.05)', border: '1px solid rgba(136,206,2,0.15)', borderRadius: 5, padding: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
            <div>
              <div style={lbl}>Trigger el. (blank=target)</div>
              <SelectorInput value={track.stTrigger} onChange={v => onUpdate({ stTrigger: v })} selectors={selectors} selectedSelector={selectedSelector} />
            </div>
            <div>
              <div style={lbl}>Start</div>
              <input value={track.stStart} onChange={e => onUpdate({ stStart: e.target.value })} placeholder="top 80%" style={inp} />
            </div>
            <div>
              <div style={lbl}>End</div>
              <input value={track.stEnd} onChange={e => onUpdate({ stEnd: e.target.value })} placeholder="bottom 20%" style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
            {[['stScrub','Scrub'],['stPin','Pin'],['stMarkers','Markers'],['stOnce','Once']].map(([key, label]) => (
              <label key={key as string} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={track[key as keyof GSAPTrack] as boolean}
                  onChange={e => onUpdate({ [key as string]: e.target.checked } as any)}
                  style={{ accentColor: '#88ce02', cursor: 'pointer' }} />
                <span style={{ fontSize: 10, color: '#aaa' }}>{label}</span>
              </label>
            ))}
            {track.stScrub && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: '#666' }}>Smooth:</span>
                <input type="number" value={track.stScrubAmount} onChange={e => onUpdate({ stScrubAmount: parseFloat(e.target.value) || 1 })}
                  min={0} max={10} step={0.5} style={{ ...inp, width: 40 }} />
              </div>
            )}
          </div>
          {!track.stScrub && (
            <div>
              <div style={lbl}>Toggle Actions</div>
              <select value={track.stToggleActions} onChange={e => onUpdate({ stToggleActions: e.target.value })} style={inp}>
                {TOGGLE_ACTIONS.map(ta => <option key={ta} value={ta}>{ta}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
const GSAPTimeline: React.FC = () => {
  const { files, activeFileId, updateFileContent, showNotification, refreshPreview, selectedSelector } = useEditorStore();
  const [tracks, setTracks] = useState<GSAPTrack[]>(loadTracks);
  const [zoom, setZoom] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appliedMsg, setAppliedMsg] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const htmlFile = getTargetHtmlFile(files, activeFileId);
  const jsFile = getTargetJsFile(files, activeFileId);
  const selectors = htmlFile ? parseSelectors(htmlFile.content) : [];
  const totalDuration = Math.max(5, ...tracks.map(t => t.delay + t.duration + 0.2));

  /* Live generated code */
  const generatedCode = useMemo(() => buildFullCode(tracks).js, [tracks]);

  const importFromJS = useCallback(() => {
    if (!jsFile) { showNotification('No JS file found'); return; }
    const parsed = parseTracksFromJS(jsFile.content, tracks.length);
    if (parsed.length === 0) { showNotification('No gsap.to/from/fromTo calls found in JS'); return; }
    setTracks(prev => {
      const existing = new Set(prev.map(t => t.selector + t.type));
      const newOnes = parsed.filter(p => !existing.has(p.selector + p.type));
      return [...prev, ...newOnes];
    });
    showNotification(`✦ Imported ${parsed.length} animation(s) from JS`);
  }, [jsFile, tracks.length, showNotification]);

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500);
    });
  };

  useEffect(() => { saveTracks(tracks); }, [tracks]);

  const updateTrack = (id: string, patch: Partial<GSAPTrack>) =>
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  const removeTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const addTrack = () => {
    const t = defaultTrack({ id: Date.now().toString(), color: COLORS[tracks.length % COLORS.length], delay: 0 });
    setTracks(prev => [...prev, t]);
    setSelectedId(t.id);
  };

  /* Play/stop */
  useEffect(() => {
    if (playing) {
      tickRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const next = parseFloat((prev + 0.05).toFixed(3));
          if (next >= totalDuration) { setPlaying(false); return totalDuration; }
          return next;
        });
      }, 50);
      /* Inject GSAP code into HTML for live preview */
      if (htmlFile) {
        const { js, needsST } = buildFullCode(tracks);
        let html = htmlFile.content;
        html = html.replace(/\n?<!-- gsap-tl-preview-start -->[\s\S]*?<!-- gsap-tl-preview-end -->/g, '');
        const hasGsap = html.includes('gsap.min.js');
        const hasST = html.includes('ScrollTrigger.min.js');
        const cdns = [
          !hasGsap ? `<script src="${GSAP_CDN}"></script>` : '',
          needsST && !hasST ? `<script src="${ST_CDN}"></script>` : '',
        ].filter(Boolean).join('\n  ');
        const preview = `\n<!-- gsap-tl-preview-start -->\n  ${cdns}\n  <script>\n${js}\n  </script>\n<!-- gsap-tl-preview-end -->`;
        html = insertBeforeClosingTag(html, 'body', preview);
        updateFileContent(htmlFile.id, html);
      }
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
      /* Remove preview injection */
      if (htmlFile) {
        const cleaned = htmlFile.content.replace(/\n?<!-- gsap-tl-preview-start -->[\s\S]*?<!-- gsap-tl-preview-end -->/g, '');
        if (cleaned !== htmlFile.content) updateFileContent(htmlFile.id, cleaned);
      }
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (playing && htmlFile) {
        const cleaned = htmlFile.content.replace(/\n?<!-- gsap-tl-preview-start -->[\s\S]*?<!-- gsap-tl-preview-end -->/g, '');
        if (cleaned !== htmlFile.content) updateFileContent(htmlFile.id, cleaned);
      }
    };
  }, [playing, htmlFile, tracks, updateFileContent]);

  const stopAndReset = () => { setPlaying(false); setCurrentTime(0); };

  const applyToProject = () => {
    const { js, needsST } = buildFullCode(tracks);
    if (!jsFile) { showNotification('No JS file found — create a script.js first'); return; }
    let html = htmlFile?.content || '';
    let htmlChanged = false;
    if (htmlFile) {
      if (!html.includes('gsap.min.js')) {
        html = insertBeforeClosingTag(html, 'head', `  <script src="${GSAP_CDN}"></script>`);
        htmlChanged = true;
      }
      if (needsST && !html.includes('ScrollTrigger.min.js')) {
        html = insertBeforeClosingTag(html, 'head', `  <script src="${ST_CDN}"></script>`);
        htmlChanged = true;
      }
      if (htmlChanged) updateFileContent(htmlFile.id, html);
    }
    const block = `\n\n/* gsap-timeline-start */\n${js}\n/* gsap-timeline-end */\n`;
    const cleanedJs = jsFile.content.replace(/\n?\/\* gsap-timeline-start \*\/[\s\S]*?\/\* gsap-timeline-end \*\/\n?/g, '').trimEnd();
    updateFileContent(jsFile.id, `${cleanedJs}${block}`);
    setAppliedMsg(true);
    showNotification(`✦ Applied ${tracks.length} GSAP animation(s) to project`);
    setTimeout(() => setAppliedMsg(false), 2000);
  };

  /* Drag track bar */
  const startDrag = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedId(id);
    const contentW = (timelineRef.current?.clientWidth || 600) - LABEL_W;
    const scaledW = contentW * zoom;
    const startX = e.clientX;
    const init = tracksRef.current.find(t => t.id === id);
    if (!init) return;
    const initDelay = init.delay;
    showDrag('grab');
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dT = (dx / scaledW) * totalDuration;
      const newDelay = Math.max(0, Math.min(totalDuration - init.duration, initDelay + dT));
      setTracks(prev => prev.map(t => t.id === id ? { ...t, delay: parseFloat(newDelay.toFixed(2)) } : t));
    };
    const onUp = () => { hideDrag(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration]);

  const startResize = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    const contentW = (timelineRef.current?.clientWidth || 600) - LABEL_W;
    const scaledW = contentW * zoom;
    const startX = e.clientX;
    const init = tracksRef.current.find(t => t.id === id);
    if (!init) return;
    showDrag('e-resize');
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dT = (dx / scaledW) * totalDuration;
      const newDur = Math.max(0.1, Math.min(totalDuration - init.delay, init.duration + dT));
      setTracks(prev => prev.map(t => t.id === id ? { ...t, duration: parseFloat(newDur.toFixed(2)) } : t));
    };
    const onUp = () => { hideDrag(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration]);

  const seekTo = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(parseFloat((pct * totalDuration).toFixed(3)));
  };

  /* Ticks */
  const contentW = (timelineRef.current?.clientWidth || 600) - LABEL_W;
  const scaledW = contentW * zoom;
  const tickInterval = zoom < 1 ? 1 : zoom < 2 ? 0.5 : zoom < 4 ? 0.25 : 0.1;
  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration + tickInterval / 2; t = parseFloat((t + tickInterval).toFixed(3))) ticks.push(parseFloat(t.toFixed(3)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#141416', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif" }}
      onWheel={e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(z => Math.max(0.4, Math.min(8, z + (e.deltaY < 0 ? 0.25 : -0.25)))); } }}>

      {/* ── Header ── */}
      <div style={{ height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px', background: '#1e1e20', borderBottom: '1px solid #2e2e30', userSelect: 'none' }}>
        <div style={{ width: 16, height: 16, borderRadius: 3, background: 'linear-gradient(135deg,#88ce02,#0ae448)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#111', marginRight: 3, flexShrink: 0 }}>G</div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#666', marginRight: 2 }}>GSAP Timeline</span>

        <button title="Add Track" onClick={addTrack} style={hdrBtn}><FiPlus size={12} /></button>
        <div style={{ width: 1, height: 14, background: '#333', margin: '0 1px' }} />

        <button title={playing ? 'Stop' : 'Play (preview in page)'}
          onClick={() => { if (playing) stopAndReset(); else { setCurrentTime(0); setPlaying(true); } }}
          style={{ ...hdrBtn, color: playing ? '#88ce02' : '#555', background: playing ? 'rgba(136,206,2,0.1)' : 'none', borderRadius: 3 }}>
          {playing ? <FiSquare size={11} /> : <FiPlay size={11} />}
        </button>
        <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace', minWidth: 38, padding: '0 3px' }}>{currentTime.toFixed(2)}s</span>
        <button title="Reset" onClick={stopAndReset} style={hdrBtn}><FiRefreshCw size={11} /></button>

        <div style={{ width: 1, height: 14, background: '#333', margin: '0 1px' }} />

        <button onClick={applyToProject}
          style={{ ...hdrBtn, width: 'auto', padding: '0 8px', fontSize: 10, fontWeight: 600, color: appliedMsg ? '#4ec9b0' : '#88ce02', background: appliedMsg ? 'rgba(78,201,176,0.1)' : 'rgba(136,206,2,0.12)', border: `1px solid ${appliedMsg ? 'rgba(78,201,176,0.3)' : 'rgba(136,206,2,0.3)'}`, borderRadius: 3 }}>
          {appliedMsg ? <><FiCheck size={10} style={{ marginRight: 3 }} />Applied</> : 'Apply'}
        </button>

        <button onClick={importFromJS} title="Import from JS file"
          style={{ ...hdrBtn, width: 'auto', padding: '0 7px', fontSize: 10, color: '#9cdcfe', background: 'rgba(156,220,254,0.08)', border: '1px solid rgba(156,220,254,0.2)', borderRadius: 3 }}>
          <FiDownload size={10} style={{ marginRight: 3 }} />JS
        </button>

        <div style={{ width: 1, height: 14, background: '#333', margin: '0 1px' }} />

        <button onClick={() => setShowCodePanel(s => !s)} title="Toggle code panel"
          style={{ ...hdrBtn, color: showCodePanel ? '#e5a45a' : '#555', background: showCodePanel ? 'rgba(229,164,90,0.1)' : 'none', border: showCodePanel ? '1px solid rgba(229,164,90,0.25)' : '1px solid transparent', borderRadius: 3 }}>
          <FiCode size={11} />
        </button>

        <div style={{ flex: 1 }} />
        <button title="Zoom Out" onClick={() => setZoom(z => Math.max(0.4, z - 0.5))} style={hdrBtn}><FiZoomOut size={12} /></button>
        <span style={{ fontSize: 10, color: '#555', minWidth: 32, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button title="Zoom In" onClick={() => setZoom(z => Math.min(8, z + 0.5))} style={hdrBtn}><FiZoomIn size={12} /></button>
        <button onClick={() => setZoom(1)} style={{ ...hdrBtn, fontSize: 10, color: '#666', width: 'auto', padding: '0 5px' }}>1:1</button>
      </div>

      {/* ── Main track area ── */}
      <div ref={timelineRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative', minHeight: 0 }}>
        <div style={{ minWidth: LABEL_W + scaledW, position: 'relative' }}>

          {/* Ruler */}
          <div style={{ display: 'flex', height: 22, background: '#18181a', borderBottom: '1px solid #2e2e30', position: 'sticky', top: 0, zIndex: 5 }}>
            <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid #2e2e30', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              <span style={{ fontSize: 8, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Element</span>
            </div>
            <div style={{ flex: 1, position: 'relative', cursor: 'pointer' }} onClick={seekTo}>
              {ticks.map((t, i) => {
                const pct = (t / totalDuration) * 100;
                const isMajor = Math.abs(t % 1) < 0.001;
                const isMid = !isMajor && Math.abs(t % 0.5) < 0.001;
                return (
                  <div key={i} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, borderLeft: `1px solid ${isMajor ? 'rgba(255,255,255,0.15)' : isMid ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)'}`, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                    {isMajor && <span style={{ fontSize: 8, color: '#666', paddingLeft: 2, whiteSpace: 'nowrap' }}>{t.toFixed(0)}s</span>}
                    {isMid && <span style={{ fontSize: 7, color: '#444', paddingLeft: 1, whiteSpace: 'nowrap' }}>.5</span>}
                  </div>
                );
              })}
              {/* Playhead */}
              <div style={{ position: 'absolute', left: `${(currentTime / totalDuration) * 100}%`, top: 0, bottom: 0, width: 1, background: '#88ce02', zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#88ce02', position: 'absolute', top: -1, left: -3 }} />
              </div>
            </div>
          </div>

          {/* Tracks */}
          {tracks.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#444', fontSize: 12 }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>◈</div>
              No tracks. Click <strong style={{ color: '#88ce02' }}>+</strong> to add a GSAP animation track.
            </div>
          )}

          {tracks.map((track) => {
            const isSelected = selectedId === track.id;
            const barLeft = (track.delay / totalDuration) * 100;
            const barWidth = (track.duration / totalDuration) * 100;
            const playPos = playing ? ((currentTime - track.delay) / track.duration) * 100 : -1;

            return (
              <div key={track.id} style={{ borderBottom: '1px solid #1e1e20' }}>
                {/* Track row */}
                <div style={{ display: 'flex', height: TRACK_H, background: isSelected ? '#1e2020' : 'transparent', cursor: 'pointer' }}
                  onClick={() => setSelectedId(isSelected ? null : track.id)}>
                  {/* Label */}
                  <div style={{ width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', borderRight: '1px solid #2e2e30', overflow: 'hidden' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: track.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: isSelected ? '#ccc' : '#888', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {track.selector || '.element'}
                    </span>
                    {track.useScrollTrigger && <span style={{ fontSize: 8, color: '#88ce02', flexShrink: 0 }}>⊛</span>}
                    <span style={{ fontSize: 8, color: '#555', flexShrink: 0 }}>{isSelected ? '▲' : '▼'}</span>
                    <button onClick={e => { e.stopPropagation(); removeTrack(track.id); }}
                      style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2, fontSize: 10, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f88')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                      <FiX size={10} />
                    </button>
                  </div>

                  {/* Timeline area */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    {/* Bar */}
                    <div
                      style={{ position: 'absolute', left: `${barLeft}%`, width: `${barWidth}%`, top: 4, height: TRACK_H - 8, background: `${track.color}33`, border: `1px solid ${track.color}88`, borderRadius: 3, cursor: 'grab', minWidth: 6, overflow: 'hidden' }}
                      onMouseDown={e => startDrag(e, track.id)}>
                      {/* Progress overlay while playing */}
                      {playing && playPos >= 0 && playPos <= 100 && (
                        <div style={{ position: 'absolute', left: 0, top: 0, width: `${playPos}%`, height: '100%', background: `${track.color}55` }} />
                      )}
                      {/* Label inside bar */}
                      <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: track.color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '80%', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
                        {track.type} · {track.duration}s
                      </span>
                      {/* Resize handle */}
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'e-resize', background: `${track.color}44` }}
                        onMouseDown={e => { e.stopPropagation(); startResize(e, track.id); }} />
                    </div>
                  </div>
                </div>

                {/* Expanded editor */}
                {isSelected && (
                  <TrackEditor track={track} onUpdate={p => updateTrack(track.id, p)} selectors={selectors} selectedSelector={selectedSelector} />
                )}
              </div>
            );
          })}

          {/* Bottom spacer for overflow */}
          <div style={{ height: 20 }} />
        </div>
      </div>

      {/* ── Code panel ── */}
      {showCodePanel && (
        <div style={{ flexShrink: 0, borderTop: '2px solid rgba(229,164,90,0.3)', background: '#0d0d0f', maxHeight: 200, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#111', borderBottom: '1px solid #1e1e20' }}>
            <FiCode size={10} color="#e5a45a" />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>Generated Code (Live)</span>
            <span style={{ fontSize: 9, color: '#444' }}>{tracks.length} tracks</span>
            <button onClick={copyCode}
              style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', color: codeCopied ? '#88ce02' : '#555', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
              {codeCopied ? <><FiCheck size={8} /> Copied!</> : <><FiCopy size={8} /> Copy</>}
            </button>
          </div>
          <pre style={{ margin: 0, padding: '8px 12px', fontSize: 9, color: '#9cdcfe', fontFamily: 'monospace', lineHeight: 1.7, overflowY: 'auto', overflowX: 'auto', flex: 1, whiteSpace: 'pre' }}>
            {generatedCode || '// Add tracks above to generate code'}
          </pre>
        </div>
      )}

      {/* ── Status bar ── */}
      <div style={{ height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', background: '#18181a', borderTop: '1px solid #2a2a2a', fontSize: 10, color: '#555' }}>
        <span>{tracks.length} tracks</span>
        <span>·</span>
        <span>{totalDuration.toFixed(1)}s total</span>
        <span>·</span>
        <span>{tracks.filter(t => t.useScrollTrigger).length} scroll triggers</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#444' }}>Drag bars to adjust timing · Ctrl+scroll to zoom</span>
      </div>
    </div>
  );
};

export default GSAPTimeline;
