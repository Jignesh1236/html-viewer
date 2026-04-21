import React, { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  FiChevronDown, FiChevronRight, FiType, FiLayout, FiBox,
  FiDroplet, FiSliders, FiZap, FiCode, FiMove, FiMaximize2,
  FiEye, FiFilter, FiMousePointer, FiList, FiColumns, FiAperture,
} from 'react-icons/fi';
import { ANIMATION_PRESETS, ANIMATION_CATEGORIES, KEYFRAMES_MAP, PRESET_BY_NAME } from '../lib/animations';

/* ─── Design tokens ───────────────────────────────────────── */
const C = {
  bg:        '#1e1e1e',
  surface:   '#252526',
  surface2:  '#2d2d2d',
  border:    '#3a3a3a',
  accent:    '#e5a45a',
  accentBg:  'rgba(229,164,90,0.12)',
  accentBrd: 'rgba(229,164,90,0.35)',
  text:      '#d4d4d4',
  muted:     '#888',
  dim:       '#555',
};

const PRESET_KEYFRAMES: Record<string, string> = KEYFRAMES_MAP;

function injectPropertiesAnimationCssIntoHtml(html: string, css: string) {
  const cleaned = html.replace(/\n?\s*<style\s+id=["']properties-animations["'][\s\S]*?<\/style>/i, '');
  if (!css.trim()) return cleaned;
  const block = `<style id="properties-animations">\n${css}\n</style>`;
  if (cleaned.includes('</head>')) return cleaned.replace('</head>', `${block}\n</head>`);
  return `${block}\n${cleaned}`;
}

/* ─── Section ─────────────────────────────────────────────── */
interface SectionProps { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }
const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', cursor: 'pointer', border: 'none', outline: 'none',
          background: open ? 'rgba(255,255,255,0.03)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = open ? 'rgba(255,255,255,0.03)' : 'transparent')}
      >
        {icon && <span style={{ color: open ? C.accent : C.muted, display: 'flex', transition: 'color 0.15s' }}>{icon}</span>}
        <span style={{
          flex: 1, textAlign: 'left', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.09em', textTransform: 'uppercase',
          color: open ? C.text : C.muted,
        }}>{title}</span>
        <span style={{ color: C.dim, display: 'flex' }}>
          {open ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        </span>
      </button>
      {open && (
        <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {children}
        </div>
      )}
    </div>
  );
};

/* ─── Row ─────────────────────────────────────────────────── */
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 11, color: C.muted, width: 58, flexShrink: 0, userSelect: 'none' }}>{label}</span>
    <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>{children}</div>
  </div>
);

/* ─── Shared input style ──────────────────────────────────── */
const inputBase: React.CSSProperties = {
  flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4,
  padding: '4px 7px', fontSize: 11, color: C.text, fontFamily: 'var(--app-font-mono)',
  outline: 'none', minWidth: 0, transition: 'border-color 0.15s',
};

const selBase: React.CSSProperties = {
  ...inputBase, cursor: 'pointer', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center',
  paddingRight: 22,
};

function parseTransform(transform: string) {
  const value = transform || '';
  const rotateMatch = value.match(/rotate\((-?[\d.]+)deg\)/i);
  const scaleXMatch = value.match(/scaleX\((-?[\d.]+)\)/i);
  const scaleYMatch = value.match(/scaleY\((-?[\d.]+)\)/i);
  return {
    rotate: rotateMatch ? parseFloat(rotateMatch[1]) : 0,
    scaleX: scaleXMatch ? parseFloat(scaleXMatch[1]) : 1,
    scaleY: scaleYMatch ? parseFloat(scaleYMatch[1]) : 1,
  };
}

/* ─── BtnGroup ────────────────────────────────────────────── */
function BtnGroup({ options, value, onChange, small }: { options: string[]; value: string; onChange: (v: string) => void; small?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 2, flex: 1 }}>
      {options.map(o => {
        const active = value === o || value.startsWith(o);
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            title={o}
            style={{
              flex: 1, padding: small ? '2px 1px' : '3px 2px',
              fontSize: small ? 9 : 10, fontWeight: active ? 600 : 400,
              background: active ? C.accentBg : C.surface2,
              border: `1px solid ${active ? C.accentBrd : C.border}`,
              borderRadius: 4, cursor: 'pointer',
              color: active ? C.accent : C.muted,
              transition: 'all 0.12s',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = C.muted; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.border; }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ─── ColorInput ──────────────────────────────────────────── */
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const hex = /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#000000';
  return (
    <div style={{ display: 'flex', gap: 5, flex: 1, alignItems: 'center' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 4, border: `1px solid ${C.border}`,
          background: value || '#000', cursor: 'pointer', overflow: 'hidden',
        }}>
          <input
            type="color" value={hex}
            onChange={e => { onChange(e.target.value); setText(e.target.value); }}
            style={{ width: 40, height: 40, opacity: 0, cursor: 'pointer', position: 'absolute', top: -4, left: -4 }}
          />
        </div>
      </div>
      <input
        style={inputBase} value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => onChange(text)}
        onKeyDown={e => e.key === 'Enter' && onChange(text)}
        placeholder="#000000 or rgba(...)"
        onFocus={e => (e.target.style.borderColor = C.accentBrd)}
        onBlurCapture={e => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}

/* ─── PropInput ───────────────────────────────────────────── */
function PropInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input
      style={inputBase} value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onChange(local)}
      onKeyDown={e => e.key === 'Enter' && onChange(local)}
      placeholder={placeholder}
      onFocus={e => (e.target.style.borderColor = C.accentBrd)}
      onBlurCapture={e => (e.target.style.borderColor = C.border)}
    />
  );
}

/* ─── Chip pills ──────────────────────────────────────────── */
function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
      {options.map(o => {
        const active = value === o;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: '2px 9px', fontSize: 10, borderRadius: 20, cursor: 'pointer',
            background: active ? C.accentBg : C.surface2,
            border: `1px solid ${active ? C.accentBrd : C.border}`,
            color: active ? C.accent : C.muted, transition: 'all 0.12s',
          }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Spacer grid (margin / padding) ─────────────────────── */
function SpacingGrid({ props, getS, apply }: { props: [string, string][]; getS: (k: string) => string; apply: (p: string, v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
      {props.map(([prop, label]) => (
        <div key={prop} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PropInput value={getS(prop) || '0'} onChange={v => apply(prop, v)} placeholder="0" />
          <div style={{ fontSize: 9, color: C.dim, textAlign: 'center', userSelect: 'none' }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function parseGradient(value: string) {
  const raw = value || '';
  const type = raw.startsWith('radial-gradient') ? 'radial' : raw.startsWith('linear-gradient') ? 'linear' : 'none';
  const colorMatches = raw.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+/g) || [];
  const usableColors = colorMatches.filter(v => !['linear-gradient', 'radial-gradient', 'deg', 'circle', 'ellipse', 'at', 'center'].includes(v.toLowerCase()));
  const angleMatch = raw.match(/(-?\d+(?:\.\d+)?)deg/i);
  return {
    type,
    angle: angleMatch?.[1] || '135',
    color1: usableColors[0] || '#ff7a18',
    color2: usableColors[1] || '#af002d',
  };
}

function buildGradient(type: string, angle: string, color1: string, color2: string) {
  if (type === 'radial') return `radial-gradient(circle, ${color1}, ${color2})`;
  if (type === 'linear') return `linear-gradient(${angle || '135'}deg, ${color1}, ${color2})`;
  return 'none';
}

function GradientControls({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseGradient(value);
  const [type, setType] = useState(parsed.type);
  const [angle, setAngle] = useState(parsed.angle);
  const [color1, setColor1] = useState(parsed.color1);
  const [color2, setColor2] = useState(parsed.color2);

  useEffect(() => {
    const next = parseGradient(value);
    setType(next.type);
    setAngle(next.angle);
    setColor1(next.color1);
    setColor2(next.color2);
  }, [value]);

  const applyGradient = (next: Partial<{ type: string; angle: string; color1: string; color2: string }>) => {
    const nextType = next.type ?? type;
    const nextAngle = next.angle ?? angle;
    const nextColor1 = next.color1 ?? color1;
    const nextColor2 = next.color2 ?? color2;
    setType(nextType);
    setAngle(nextAngle);
    setColor1(nextColor1);
    setColor2(nextColor2);
    onChange(buildGradient(nextType, nextAngle, nextColor1, nextColor2));
  };

  const preview = buildGradient(type === 'none' ? 'linear' : type, angle, color1, color2);
  const presets = [
    ['Sunset', 'linear', '135', '#ff7a18', '#af002d'],
    ['Ocean', 'linear', '135', '#00c6ff', '#0072ff'],
    ['Purple', 'linear', '135', '#8e2de2', '#4a00e0'],
    ['Mint', 'linear', '135', '#00f5a0', '#00d9f5'],
    ['Fire', 'radial', '135', '#f9d423', '#ff4e50'],
    ['Dark', 'linear', '135', '#232526', '#414345'],
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 8, background: 'rgba(0,0,0,0.12)', border: `1px solid ${C.border}`, borderRadius: 6 }}>
      <div style={{ height: 34, borderRadius: 5, border: `1px solid ${C.border}`, background: type === 'none' ? C.surface2 : preview }} />
      <Row label="Type">
        <select style={selBase} value={type} onChange={e => applyGradient({ type: e.target.value })}>
          <option value="none">none</option>
          <option value="linear">linear</option>
          <option value="radial">radial</option>
        </select>
      </Row>
      {type !== 'none' && (
        <>
          <Row label="Color 1">
            <ColorInput value={color1} onChange={v => applyGradient({ color1: v })} />
          </Row>
          <Row label="Color 2">
            <ColorInput value={color2} onChange={v => applyGradient({ color2: v })} />
          </Row>
          {type === 'linear' && (
            <Row label="Angle">
              <input
                type="range" min="0" max="360" step="1" value={angle}
                style={{ flex: 1, accentColor: C.accent } as any}
                onChange={e => applyGradient({ angle: (e.target as HTMLInputElement).value })}
              />
              <span style={{ fontSize: 11, color: C.muted, width: 42, textAlign: 'right', flexShrink: 0 }}>{angle}°</span>
            </Row>
          )}
        </>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {presets.map(([label, presetType, presetAngle, presetColor1, presetColor2]) => (
          <button
            key={label}
            onClick={() => applyGradient({ type: presetType, angle: presetAngle, color1: presetColor1, color2: presetColor2 })}
            style={{
              height: 28, borderRadius: 5, border: `1px solid ${C.border}`, cursor: 'pointer',
              color: '#fff', fontSize: 9, textShadow: '0 1px 2px rgba(0,0,0,0.55)',
              background: buildGradient(presetType, presetAngle, presetColor1, presetColor2),
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Row label="Custom">
        <PropInput value={value || ''} onChange={onChange} placeholder="linear-gradient(135deg, #ff7a18, #af002d)" />
      </Row>
    </div>
  );
}

/* ─── FilterControls (filter / backdrop-filter builder) ── */
const FILTER_FUNCS: { key: string; label: string; unit: string; min: number; max: number; step: number; def: number }[] = [
  { key: 'blur',        label: 'Blur',       unit: 'px', min: 0,    max: 30,  step: 0.5, def: 0 },
  { key: 'brightness',  label: 'Bright',     unit: '%',  min: 0,    max: 200, step: 5,   def: 100 },
  { key: 'contrast',    label: 'Contrast',   unit: '%',  min: 0,    max: 200, step: 5,   def: 100 },
  { key: 'saturate',    label: 'Saturate',   unit: '%',  min: 0,    max: 300, step: 5,   def: 100 },
  { key: 'grayscale',   label: 'Grayscale',  unit: '%',  min: 0,    max: 100, step: 5,   def: 0 },
  { key: 'sepia',       label: 'Sepia',      unit: '%',  min: 0,    max: 100, step: 5,   def: 0 },
  { key: 'invert',      label: 'Invert',     unit: '%',  min: 0,    max: 100, step: 5,   def: 0 },
  { key: 'hue-rotate',  label: 'Hue°',       unit: 'deg', min: 0,   max: 360, step: 1,   def: 0 },
  { key: 'opacity',     label: 'Opacity',    unit: '%',  min: 0,    max: 100, step: 5,   def: 100 },
];

function parseFilterValue(value: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value) return out;
  const re = /(blur|brightness|contrast|saturate|grayscale|sepia|invert|hue-rotate|opacity)\(([-\d.]+)(px|%|deg)?\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    out[m[1].toLowerCase()] = parseFloat(m[2]);
  }
  return out;
}

function buildFilterValue(parts: Record<string, number>): string {
  const out: string[] = [];
  FILTER_FUNCS.forEach(f => {
    const v = parts[f.key];
    if (v === undefined || v === f.def) return;
    out.push(`${f.key}(${v}${f.unit})`);
  });
  return out.join(' ');
}

const FilterControls: React.FC<{ value: string; onChange: (v: string) => void; label: string }> = ({ value, onChange }) => {
  const parsed = parseFilterValue(value);
  const updatePart = (key: string, v: number) => {
    const next = { ...parsed, [key]: v };
    onChange(buildFilterValue(next));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6, background: 'rgba(0,0,0,0.12)', border: `1px solid ${C.border}`, borderRadius: 5 }}>
      {FILTER_FUNCS.map(f => {
        const cur = parsed[f.key] ?? f.def;
        return (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: C.muted, width: 50, flexShrink: 0 }}>{f.label}</span>
            <input type="range" min={f.min} max={f.max} step={f.step} value={cur}
              onChange={e => updatePart(f.key, parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: C.accent } as any} />
            <span style={{ fontSize: 10, color: C.text, width: 38, textAlign: 'right', fontFamily: 'monospace' }}>{cur}{f.unit}</span>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
        <button onClick={() => onChange('')} style={{ flex: 1, padding: '3px', fontSize: 9, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 3, cursor: 'pointer' }}>Reset</button>
        <button onClick={() => onChange('grayscale(100%)')} style={{ flex: 1, padding: '3px', fontSize: 9, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 3, cursor: 'pointer' }}>B&amp;W</button>
        <button onClick={() => onChange('blur(8px) brightness(120%)')} style={{ flex: 1, padding: '3px', fontSize: 9, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 3, cursor: 'pointer' }}>Glass</button>
        <button onClick={() => onChange('sepia(70%) saturate(150%)')} style={{ flex: 1, padding: '3px', fontSize: 9, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 3, cursor: 'pointer' }}>Vintage</button>
      </div>
    </div>
  );
};

/* ─── Main component ──────────────────────────────────────── */
const PropertiesPanel: React.FC<{ onClose?: () => void; hideHeader?: boolean }> = ({ hideHeader }) => {
  const {
    selectedElement,
    selectedSelector,
    applySelectedStyle,
    applySelectedContent,
    animationConfig,
    setAnimationConfig,
    files,
    updateFileContent,
    setTimelineState,
  } = useEditorStore();

  const apply = (property: string, value: string) => applySelectedStyle(property, value);
  const getS = (key: string) => selectedElement?.styles?.[key] || '';
  const [contentDraft, setContentDraft] = useState('');
  const [customCssDraft, setCustomCssDraft] = useState('');
  const [rotateDeg, setRotateDeg] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);

  useEffect(() => {
    setContentDraft(selectedElement?.innerHTML || '');
    setCustomCssDraft(selectedElement?.styles?.['inline-style'] || '');
    const parsed = parseTransform(selectedElement?.styles?.transform || '');
    setRotateDeg(parsed.rotate);
    setScaleX(parsed.scaleX);
    setScaleY(parsed.scaleY);
  }, [selectedSelector, selectedElement?.innerHTML, selectedElement?.styles]);

  const applyTransform = useCallback((next: { rotate?: number; scaleX?: number; scaleY?: number }) => {
    const r = next.rotate ?? rotateDeg;
    const sx = next.scaleX ?? scaleX;
    const sy = next.scaleY ?? scaleY;
    apply('transform', `rotate(${r}deg) scaleX(${sx}) scaleY(${sy})`);
  }, [apply, rotateDeg, scaleX, scaleY]);

  const persistPresetKeyframe = useCallback((preset: string) => {
    const keyframeCss = PRESET_KEYFRAMES[preset];
    if (!keyframeCss) return;
    const htmlFile = files.find(f => f.type === 'html');
    if (!htmlFile) return;
    const updated = injectPropertiesAnimationCssIntoHtml(htmlFile.content, keyframeCss);
    if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
  }, [files, updateFileContent]);

  const upsertTimelineTrackForSelection = useCallback((preset: string, animationValue: string) => {
    if (!selectedElement || !selectedSelector) return;
    const normalizedPreset = preset === 'none' ? '' : preset;
    if (!normalizedPreset) return;
    const selectorCandidate = selectedElement.styles?.selector || selectedSelector;
    setTimelineState(prev => {
      const idx = prev.tracks.findIndex(t => t.element.trim() === selectorCandidate.trim());
      if (idx >= 0) {
        const nextTracks = [...prev.tracks];
        nextTracks[idx] = {
          ...nextTracks[idx],
          animation: normalizedPreset,
          duration: parseFloat(animationConfig.duration) || nextTracks[idx].duration,
          delay: parseFloat(animationConfig.delay) || 0,
          easing: animationConfig.easing || nextTracks[idx].easing,
          iteration: animationConfig.iteration || nextTracks[idx].iteration,
        };
        return { ...prev, tracks: nextTracks };
      }

      const id = Date.now().toString();
      return {
        ...prev,
        tracks: [
          ...prev.tracks,
          {
            id,
            element: selectorCandidate,
            animation: normalizedPreset,
            duration: parseFloat(animationConfig.duration) || 0.6,
            delay: parseFloat(animationConfig.delay) || 0,
            color: '#e5a45a',
            easing: animationConfig.easing || 'ease',
            iteration: animationConfig.iteration || '1',
          },
        ],
      };
    });
    // Keep direct animation value applied to selected element.
    apply('animation', animationValue);
  }, [selectedElement, selectedSelector, setTimelineState, animationConfig, apply]);

  /* ── Empty state ── */
  if (!selectedElement || !selectedSelector) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {!hideHeader && (
          <div style={{
            height: 36, flexShrink: 0, display: 'flex', alignItems: 'center',
            padding: '0 12px', borderBottom: `1px solid ${C.border}`, background: C.surface,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted }}>Properties</span>
          </div>
        )}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 14, color: C.dim, padding: 28, textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: C.surface2,
            border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FiSliders size={22} color={C.muted} />
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            Switch to <strong style={{ color: C.text }}>Visual mode</strong> and<br />click an element to edit its properties
          </div>
          <div style={{
            fontSize: 10, color: C.dim, background: C.surface2,
            border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', lineHeight: 1.6,
          }}>
            Typography · Layout · Background<br />Border · Shadows · Animations
          </div>
        </div>
      </div>
    );
  }

  const tag = selectedElement.tagName;
  const elId = selectedElement.id ? `#${selectedElement.id}` : '';
  const elClass = selectedElement.className?.trim().split(/\s+/)[0] ? `.${selectedElement.className.trim().split(/\s+/)[0]}` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: C.bg }}>

      {/* ── Header ── */}
      {!hideHeader && (
        <div style={{
          height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 10px', borderBottom: `1px solid ${C.border}`, background: C.surface,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted }}>Properties</span>
          <code style={{
            fontSize: 11, color: C.accent, background: C.accentBg,
            border: `1px solid ${C.accentBrd}`, borderRadius: 4, padding: '1px 7px',
          }}>
            &lt;{tag}{elId || elClass}&gt;
          </code>
        </div>
      )}

      {/* ── Mini breadcrumb when hideHeader ── */}
      {hideHeader && (
        <div style={{
          padding: '5px 10px', background: C.accentBg, borderBottom: `1px solid ${C.border}`,
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <code style={{ fontSize: 11, color: C.accent }}>&lt;{tag}{elId}&gt;</code>
          {elClass && <span style={{ fontSize: 10, color: C.dim }}>{elClass}</span>}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Content */}
        <Section title="Content" icon={<FiCode size={12} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 1 }}>Inner HTML</div>
            <textarea
              style={{ ...inputBase, height: 60, resize: 'vertical', width: '100%', flex: 'none', fontFamily: 'var(--app-font-mono)' } as any}
              value={contentDraft}
              onChange={e => setContentDraft(e.target.value)}
              onBlur={() => applySelectedContent(contentDraft)}
              onFocus={e => (e.target.style.borderColor = C.accentBrd)}
              onBlurCapture={e => (e.target.style.borderColor = C.border)}
            />
          </div>
          <Row label="Text">
            <PropInput value={selectedElement.textContent} placeholder="Plain text" onChange={v => applySelectedContent(v)} />
          </Row>
        </Section>

        {/* Typography */}
        <Section title="Typography" icon={<FiType size={12} />}>
          <Row label="Color">
            <ColorInput value={getS('color') || '#333333'} onChange={v => apply('color', v)} />
          </Row>
          <Row label="Size">
            <PropInput value={getS('font-size') || '16px'} onChange={v => apply('font-size', v)} placeholder="16px" />
          </Row>
          <Row label="Family">
            <select style={selBase} value={getS('font-family')} onChange={e => apply('font-family', e.target.value)}>
              {['sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma'].map(f => <option key={f}>{f}</option>)}
            </select>
          </Row>
          <Row label="Weight">
            <BtnGroup options={['100', '300', '400', '600', '700', '900']} value={getS('font-weight') || '400'} onChange={v => apply('font-weight', v)} small />
          </Row>
          <Row label="Align">
            <BtnGroup options={['left', 'center', 'right', 'justify']} value={getS('text-align') || 'left'} onChange={v => apply('text-align', v)} />
          </Row>
          <Row label="Line H">
            <PropInput value={getS('line-height') || '1.6'} onChange={v => apply('line-height', v)} placeholder="1.6" />
          </Row>
          <Row label="Decor">
            <BtnGroup options={['none', 'underline', 'line-through', 'overline']} value={getS('text-decoration') || 'none'} onChange={v => apply('text-decoration', v)} small />
          </Row>
          <Row label="Case">
            <BtnGroup options={['none', 'upper', 'lower', 'capitalize']}
              value={(() => { const v = getS('text-transform') || 'none'; if (v === 'uppercase') return 'upper'; if (v === 'lowercase') return 'lower'; return v; })()}
              onChange={v => apply('text-transform', v === 'upper' ? 'uppercase' : v === 'lower' ? 'lowercase' : v)} />
          </Row>
        </Section>

        {/* Background */}
        <Section title="Background" icon={<FiDroplet size={12} />}>
          <Row label="Color">
            <ColorInput value={getS('background-color') || '#ffffff'} onChange={v => apply('background-color', v)} />
          </Row>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Gradient</div>
          <GradientControls value={getS('background-image') || ''} onChange={v => apply('background-image', v)} />
          <Row label="Image">
            <PropInput value={getS('background-image') || ''} onChange={v => apply('background-image', v)} placeholder="url(...) or gradient(...)" />
          </Row>
          <Row label="Size">
            <BtnGroup options={['auto', 'cover', 'contain']} value={getS('background-size') || 'auto'} onChange={v => apply('background-size', v)} />
          </Row>
          <Row label="Opacity">
            <input
              type="range" min="0" max="1" step="0.01"
              value={getS('opacity') || '1'}
              style={{ flex: 1, accentColor: C.accent } as any}
              onChange={e => apply('opacity', (e.target as HTMLInputElement).value)}
            />
            <span style={{ fontSize: 11, color: C.muted, width: 32, textAlign: 'right', flexShrink: 0 }}>
              {Math.round(parseFloat(getS('opacity') || '1') * 100)}%
            </span>
          </Row>
        </Section>

        {/* Layout */}
        <Section title="Layout" icon={<FiLayout size={12} />}>
          <Row label="Display">
            <BtnGroup options={['block', 'flex', 'grid', 'inline', 'none']} value={getS('display') || 'block'} onChange={v => apply('display', v)} small />
          </Row>
          <Row label="Position">
            <select style={selBase} value={getS('position') || 'static'} onChange={e => apply('position', e.target.value)}>
              {['static', 'relative', 'absolute', 'fixed', 'sticky'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {([['left', 'X'], ['top', 'Y'], ['width', 'W'], ['height', 'H']] as [string, string][]).map(([prop, label]) => (
              <div key={prop} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <PropInput value={getS(prop) || 'auto'} onChange={v => apply(prop, v)} placeholder="auto" />
                <div style={{ fontSize: 9, color: C.dim, textAlign: 'center', userSelect: 'none' }}>{label}</div>
              </div>
            ))}
          </div>
          <Row label="Overflow">
            <BtnGroup options={['visible', 'hidden', 'auto', 'scroll']} value={getS('overflow') || 'visible'} onChange={v => apply('overflow', v)} small />
          </Row>
          <Row label="Z-Index">
            <PropInput value={getS('z-index') || 'auto'} onChange={v => apply('z-index', v)} placeholder="auto" />
            <button onClick={() => apply('z-index', String((parseInt(getS('z-index') || '0') || 0) + 1))}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, cursor: 'pointer', padding: '4px 9px', fontSize: 13, flexShrink: 0 }}>+</button>
            <button onClick={() => apply('z-index', String((parseInt(getS('z-index') || '0') || 0) - 1))}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, cursor: 'pointer', padding: '4px 9px', fontSize: 13, flexShrink: 0 }}>−</button>
          </Row>
        </Section>

        {/* Flex / Grid */}
        <Section title="Flex / Grid" icon={<FiMaximize2 size={12} />} defaultOpen={false}>
          <Row label="Direction">
            <BtnGroup options={['row', 'column', 'row-rev', 'col-rev']}
              value={(() => { const v = getS('flex-direction') || 'row'; if (v === 'row-reverse') return 'row-rev'; if (v === 'column-reverse') return 'col-rev'; return v; })()}
              onChange={v => apply('flex-direction', v === 'row-rev' ? 'row-reverse' : v === 'col-rev' ? 'column-reverse' : v)} small />
          </Row>
          <Row label="Justify">
            <select style={selBase} value={getS('justify-content') || 'flex-start'} onChange={e => apply('justify-content', e.target.value)}>
              {['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Align">
            <select style={selBase} value={getS('align-items') || 'stretch'} onChange={e => apply('align-items', e.target.value)}>
              {['stretch', 'flex-start', 'center', 'flex-end', 'baseline'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Wrap">
            <BtnGroup options={['nowrap', 'wrap', 'wrap-rev']}
              value={(() => { const v = getS('flex-wrap') || 'nowrap'; return v === 'wrap-reverse' ? 'wrap-rev' : v; })()}
              onChange={v => apply('flex-wrap', v === 'wrap-rev' ? 'wrap-reverse' : v)} />
          </Row>
          <Row label="Gap">
            <PropInput value={getS('gap') || '0px'} onChange={v => apply('gap', v)} placeholder="0px" />
          </Row>
          <Row label="Grid cols">
            <PropInput value={getS('grid-template-columns') || ''} onChange={v => apply('grid-template-columns', v)} placeholder="1fr 1fr 1fr" />
          </Row>
          <Row label="Grid rows">
            <PropInput value={getS('grid-template-rows') || ''} onChange={v => apply('grid-template-rows', v)} placeholder="auto 1fr auto" />
          </Row>
        </Section>

        {/* Spacing */}
        <Section title="Spacing" icon={<FiMove size={12} />} defaultOpen={false}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>Margin</div>
          <SpacingGrid
            props={[['margin-top','↑'],['margin-right','→'],['margin-bottom','↓'],['margin-left','←']]}
            getS={getS} apply={apply}
          />
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4, marginBottom: 2 }}>Padding</div>
          <SpacingGrid
            props={[['padding-top','↑'],['padding-right','→'],['padding-bottom','↓'],['padding-left','←']]}
            getS={getS} apply={apply}
          />
        </Section>

        {/* Border */}
        <Section title="Border" icon={<FiBox size={12} />} defaultOpen={false}>
          <Row label="Width">
            <PropInput value={getS('border-width') || '0px'} onChange={v => apply('border-width', v)} placeholder="0px" />
          </Row>
          <Row label="Color">
            <ColorInput value={getS('border-color') || '#cccccc'} onChange={v => apply('border-color', v)} />
          </Row>
          <Row label="Style">
            <BtnGroup options={['none', 'solid', 'dashed', 'dotted', 'double']} value={getS('border-style') || 'none'} onChange={v => apply('border-style', v)} small />
          </Row>
          <Row label="Radius">
            <PropInput value={getS('border-radius') || '0px'} onChange={v => apply('border-radius', v)} placeholder="0px" />
          </Row>
        </Section>

        {/* Shadows */}
        <Section title="Shadows" defaultOpen={false}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>Box Shadow</div>
          <PropInput value={getS('box-shadow') || 'none'} onChange={v => apply('box-shadow', v)} placeholder="0 4px 12px rgba(0,0,0,0.2)" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
            {(['none', '0 2px 4px rgba(0,0,0,0.1)', '0 4px 12px rgba(0,0,0,0.2)', '0 8px 24px rgba(0,0,0,0.3)', '0 0 0 3px rgba(229,164,90,0.5)', 'inset 0 2px 4px rgba(0,0,0,0.2)'] as string[]).map((s, i) => (
              <button key={s} onClick={() => apply('box-shadow', s)} style={{
                fontSize: 10, padding: '3px 8px', background: C.surface2,
                border: `1px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', color: C.muted,
                transition: 'border-color 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.muted)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
              >
                {['None','Sm','Md','Lg','Glow','Inset'][i]}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 8, marginBottom: 3 }}>Text Shadow</div>
          <PropInput value={getS('text-shadow') || 'none'} onChange={v => apply('text-shadow', v)} placeholder="2px 2px 4px rgba(0,0,0,0.3)" />
        </Section>

        {/* Transform */}
        <Section title="Transform" defaultOpen={false}>
          <Row label="Rotate">
            <input type="range" min="-180" max="180" step="1" value={rotateDeg}
              style={{ flex: 1, accentColor: C.accent } as any}
              onChange={e => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                setRotateDeg(v);
                applyTransform({ rotate: v });
              }} />
          </Row>
          <Row label="Scale X">
            <input type="range" min="0.1" max="3" step="0.05" value={scaleX}
              style={{ flex: 1, accentColor: C.accent } as any}
              onChange={e => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                setScaleX(v);
                applyTransform({ scaleX: v });
              }} />
          </Row>
          <Row label="Scale Y">
            <input type="range" min="0.1" max="3" step="0.05" value={scaleY}
              style={{ flex: 1, accentColor: C.accent } as any}
              onChange={e => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                setScaleY(v);
                applyTransform({ scaleY: v });
              }} />
          </Row>
          <Row label="Custom">
            <PropInput value={getS('transform') || 'none'} onChange={v => apply('transform', v)} placeholder="rotate(45deg) scale(1.2)" />
          </Row>
        </Section>

        {/* Animation */}
        <Section title="Animation" icon={<FiZap size={12} />} defaultOpen={false}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Preset ({ANIMATION_PRESETS.length}+ available)</div>
          {ANIMATION_CATEGORIES.map(cat => (
            <details key={cat} style={{ marginBottom: 3 }}>
              <summary style={{ fontSize: 10, color: C.muted, cursor: 'pointer', padding: '3px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, userSelect: 'none' }}>{cat}</summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '3px 0 5px' }}>
                {ANIMATION_PRESETS.filter(p => p.category === cat).map(p => {
                  const active = animationConfig.preset === p.name;
                  return (
                    <button key={p.name} onClick={() => setAnimationConfig({ preset: p.name })} title={p.description}
                      style={{ padding: '2px 8px', fontSize: 10, borderRadius: 11, cursor: 'pointer',
                        background: active ? C.accentBg : C.surface2,
                        border: `1px solid ${active ? C.accentBrd : C.border}`,
                        color: active ? C.accent : C.muted }}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
          <Row label="Selected">
            <select style={selBase} value={animationConfig.preset} onChange={e => setAnimationConfig({ preset: e.target.value })}>
              <option value="none">none</option>
              {ANIMATION_CATEGORIES.map(cat => (
                <optgroup key={cat} label={cat}>
                  {ANIMATION_PRESETS.filter(p => p.category === cat).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </Row>
          <Row label="Trigger">
            <BtnGroup options={['load','hover','click']} value={animationConfig.trigger} onChange={v => setAnimationConfig({ trigger: v as any })} />
          </Row>
          <Row label="Duration">
            <PropInput value={animationConfig.duration} onChange={v => setAnimationConfig({ duration: v })} placeholder="0.6s" />
          </Row>
          <Row label="Delay">
            <PropInput value={animationConfig.delay} onChange={v => setAnimationConfig({ delay: v })} placeholder="0s" />
          </Row>
          <Row label="Easing">
            <select style={selBase} value={animationConfig.easing} onChange={e => setAnimationConfig({ easing: e.target.value })}>
              {['ease','linear','ease-in','ease-out','ease-in-out','cubic-bezier(0.68,-0.55,0.27,1.55)'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Repeat">
            <BtnGroup options={['1','2','3','infinite']} value={animationConfig.iteration} onChange={v => setAnimationConfig({ iteration: v })} />
          </Row>
          <Row label="Direction">
            <select style={selBase} value={animationConfig.direction} onChange={e => setAnimationConfig({ direction: e.target.value })}>
              {['normal','reverse','alternate','alternate-reverse'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Fill">
            <BtnGroup options={['none','forwards','backwards','both']} value={animationConfig.fillMode} onChange={v => setAnimationConfig({ fillMode: v })} small />
          </Row>
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Custom @keyframes</div>
            <textarea
              style={{ ...inputBase, width: '100%', height: 72, resize: 'none', flex: 'none' } as any}
              placeholder="@keyframes myAnim { from { opacity: 0 } to { opacity: 1 } }"
              value={animationConfig.customKeyframes}
              onChange={e => setAnimationConfig({ customKeyframes: e.target.value })}
              onFocus={e => (e.target.style.borderColor = C.accentBrd)}
              onBlurCapture={e => (e.target.style.borderColor = C.border)}
            />
          </div>
          <button
            onClick={() => {
              if (!selectedElement || animationConfig.preset === 'none') return;
              const meta = PRESET_BY_NAME[animationConfig.preset];
              const dur = parseFloat(animationConfig.duration) || meta?.defaultDuration || 0.6;
              const easing = animationConfig.easing || meta?.defaultEasing || 'ease';
              const iter = animationConfig.iteration || meta?.defaultIteration || '1';
              const fill = animationConfig.fillMode || 'both';
              const animationValue = `${animationConfig.preset} ${dur}s ${easing} ${animationConfig.delay || '0s'} ${iter} ${animationConfig.direction || 'normal'} ${fill}`;
              upsertTimelineTrackForSelection(animationConfig.preset, animationValue);
              persistPresetKeyframe(animationConfig.preset);
            }}
            style={{
              padding: '6px 12px', background: C.accentBg,
              border: `1px solid ${C.accentBrd}`, borderRadius: 5,
              cursor: 'pointer', color: C.accent, fontSize: 11,
              width: '100%', fontWeight: 600, letterSpacing: '0.03em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,164,90,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = C.accentBg)}
          >
            ▶ Apply Animation to Element
          </button>
        </Section>

        {/* Filters */}
        <Section title="Filters" icon={<FiFilter size={12} />} defaultOpen={false}>
          <FilterControls value={getS('filter') || ''} onChange={v => apply('filter', v)} label="filter" />
          <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>Backdrop Filter</div>
          <FilterControls value={getS('backdrop-filter') || ''} onChange={v => { apply('backdrop-filter', v); apply('-webkit-backdrop-filter', v); }} label="backdrop" />
          <Row label="Mix Blend">
            <select style={selBase} value={getS('mix-blend-mode') || 'normal'} onChange={e => apply('mix-blend-mode', e.target.value)}>
              {['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="BG Blend">
            <select style={selBase} value={getS('background-blend-mode') || 'normal'} onChange={e => apply('background-blend-mode', e.target.value)}>
              {['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Iso">
            <BtnGroup options={['auto','isolate']} value={getS('isolation') || 'auto'} onChange={v => apply('isolation', v)} small />
          </Row>
        </Section>

        {/* Transitions */}
        <Section title="Transitions" icon={<FiZap size={12} />} defaultOpen={false}>
          <Row label="Property">
            <select style={selBase} value={getS('transition-property') || 'all'} onChange={e => apply('transition-property', e.target.value)}>
              {['all','none','opacity','transform','color','background-color','width','height','margin','padding','border','box-shadow','filter'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Duration">
            <PropInput value={getS('transition-duration') || '0.3s'} onChange={v => apply('transition-duration', v)} placeholder="0.3s" />
          </Row>
          <Row label="Easing">
            <select style={selBase} value={getS('transition-timing-function') || 'ease'} onChange={e => apply('transition-timing-function', e.target.value)}>
              {['ease','linear','ease-in','ease-out','ease-in-out','cubic-bezier(0.68,-0.55,0.27,1.55)','cubic-bezier(0.215,0.61,0.355,1)','steps(4, end)'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Delay">
            <PropInput value={getS('transition-delay') || '0s'} onChange={v => apply('transition-delay', v)} placeholder="0s" />
          </Row>
          <Row label="Shorthand">
            <PropInput value={getS('transition') || ''} onChange={v => apply('transition', v)} placeholder="all 0.3s ease" />
          </Row>
          <Row label="Will-change">
            <select style={selBase} value={getS('will-change') || 'auto'} onChange={e => apply('will-change', e.target.value)}>
              {['auto','transform','opacity','scroll-position','contents','transform, opacity'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
        </Section>

        {/* Visibility & Interaction */}
        <Section title="Visibility / Interact" icon={<FiEye size={12} />} defaultOpen={false}>
          <Row label="Visible">
            <BtnGroup options={['visible','hidden','collapse']} value={getS('visibility') || 'visible'} onChange={v => apply('visibility', v)} small />
          </Row>
          <Row label="Display">
            <BtnGroup options={['inline','block','flex','grid','inline-block','none']} value={getS('display') || 'block'} onChange={v => apply('display', v)} small />
          </Row>
          <Row label="Pointer">
            <BtnGroup options={['auto','none']} value={getS('pointer-events') || 'auto'} onChange={v => apply('pointer-events', v)} />
          </Row>
          <Row label="Select">
            <BtnGroup options={['auto','none','text','all']} value={getS('user-select') || 'auto'} onChange={v => { apply('user-select', v); apply('-webkit-user-select', v); }} small />
          </Row>
          <Row label="Cursor">
            <select style={selBase} value={getS('cursor') || 'auto'} onChange={e => apply('cursor', e.target.value)}>
              {['auto','default','pointer','text','wait','help','move','grab','grabbing','crosshair','not-allowed','zoom-in','zoom-out','progress','context-menu','cell','vertical-text','alias','copy','no-drop','all-scroll','col-resize','row-resize','n-resize','e-resize','s-resize','w-resize','ne-resize','nw-resize','se-resize','sw-resize','ew-resize','ns-resize','nesw-resize','nwse-resize','none'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Resize">
            <BtnGroup options={['none','both','horiz','vert']}
              value={(() => { const v = getS('resize') || 'none'; return v === 'horizontal' ? 'horiz' : v === 'vertical' ? 'vert' : v; })()}
              onChange={v => apply('resize', v === 'horiz' ? 'horizontal' : v === 'vert' ? 'vertical' : v)} small />
          </Row>
          <Row label="Caret">
            <ColorInput value={getS('caret-color') || 'auto'} onChange={v => apply('caret-color', v)} />
          </Row>
          <Row label="Tap-Hi">
            <ColorInput value={getS('-webkit-tap-highlight-color') || 'transparent'} onChange={v => apply('-webkit-tap-highlight-color', v)} />
          </Row>
        </Section>

        {/* Outline / Object / Aspect */}
        <Section title="Outline & Object" icon={<FiAperture size={12} />} defaultOpen={false}>
          <Row label="O Width">
            <PropInput value={getS('outline-width') || '0px'} onChange={v => apply('outline-width', v)} placeholder="0px" />
          </Row>
          <Row label="O Style">
            <BtnGroup options={['none','solid','dashed','dotted','double']} value={getS('outline-style') || 'none'} onChange={v => apply('outline-style', v)} small />
          </Row>
          <Row label="O Color">
            <ColorInput value={getS('outline-color') || '#888'} onChange={v => apply('outline-color', v)} />
          </Row>
          <Row label="O Offset">
            <PropInput value={getS('outline-offset') || '0px'} onChange={v => apply('outline-offset', v)} placeholder="0px" />
          </Row>
          <Row label="Obj Fit">
            <BtnGroup options={['fill','contain','cover','none','scale-down']} value={getS('object-fit') || 'fill'} onChange={v => apply('object-fit', v)} small />
          </Row>
          <Row label="Obj Pos">
            <PropInput value={getS('object-position') || '50% 50%'} onChange={v => apply('object-position', v)} placeholder="50% 50%" />
          </Row>
          <Row label="Aspect">
            <PropInput value={getS('aspect-ratio') || 'auto'} onChange={v => apply('aspect-ratio', v)} placeholder="16/9" />
          </Row>
        </Section>

        {/* Clip / Mask */}
        <Section title="Clip & Mask" icon={<FiBox size={12} />} defaultOpen={false}>
          <Row label="Clip path">
            <PropInput value={getS('clip-path') || 'none'} onChange={v => apply('clip-path', v)} placeholder="circle(50%) or polygon(...)" />
          </Row>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[
              ['Circle', 'circle(50%)'],
              ['Triangle', 'polygon(50% 0, 100% 100%, 0 100%)'],
              ['Hexagon', 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'],
              ['Star', 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'],
              ['Arrow', 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)'],
              ['None', 'none'],
            ].map(([label, val]) => (
              <button key={label} onClick={() => apply('clip-path', val)}
                style={{ padding: '2px 8px', fontSize: 10, borderRadius: 11, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
          <Row label="Mask">
            <PropInput value={getS('mask-image') || 'none'} onChange={v => { apply('mask-image', v); apply('-webkit-mask-image', v); }} placeholder="url(...) or linear-gradient(...)" />
          </Row>
          <Row label="Mask Sz">
            <PropInput value={getS('mask-size') || 'auto'} onChange={v => { apply('mask-size', v); apply('-webkit-mask-size', v); }} placeholder="contain" />
          </Row>
          <Row label="Mask Rep">
            <BtnGroup options={['repeat','no-repeat','space','round']} value={getS('mask-repeat') || 'repeat'} onChange={v => { apply('mask-repeat', v); apply('-webkit-mask-repeat', v); }} small />
          </Row>
        </Section>

        {/* List */}
        <Section title="List" icon={<FiList size={12} />} defaultOpen={false}>
          <Row label="Type">
            <select style={selBase} value={getS('list-style-type') || 'disc'} onChange={e => apply('list-style-type', e.target.value)}>
              {['none','disc','circle','square','decimal','decimal-leading-zero','lower-alpha','upper-alpha','lower-roman','upper-roman','lower-greek','square'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Position">
            <BtnGroup options={['outside','inside']} value={getS('list-style-position') || 'outside'} onChange={v => apply('list-style-position', v)} />
          </Row>
          <Row label="Image">
            <PropInput value={getS('list-style-image') || 'none'} onChange={v => apply('list-style-image', v)} placeholder="url(...)" />
          </Row>
        </Section>

        {/* Columns */}
        <Section title="Columns" icon={<FiColumns size={12} />} defaultOpen={false}>
          <Row label="Count">
            <PropInput value={getS('column-count') || 'auto'} onChange={v => apply('column-count', v)} placeholder="3" />
          </Row>
          <Row label="Width">
            <PropInput value={getS('column-width') || 'auto'} onChange={v => apply('column-width', v)} placeholder="200px" />
          </Row>
          <Row label="Gap">
            <PropInput value={getS('column-gap') || 'normal'} onChange={v => apply('column-gap', v)} placeholder="20px" />
          </Row>
          <Row label="Rule W">
            <PropInput value={getS('column-rule-width') || '0'} onChange={v => apply('column-rule-width', v)} placeholder="1px" />
          </Row>
          <Row label="Rule S">
            <BtnGroup options={['none','solid','dashed','dotted']} value={getS('column-rule-style') || 'none'} onChange={v => apply('column-rule-style', v)} small />
          </Row>
          <Row label="Rule C">
            <ColorInput value={getS('column-rule-color') || '#888'} onChange={v => apply('column-rule-color', v)} />
          </Row>
          <Row label="Span">
            <BtnGroup options={['none','all']} value={getS('column-span') || 'none'} onChange={v => apply('column-span', v)} />
          </Row>
        </Section>

        {/* Scroll */}
        <Section title="Scroll" icon={<FiMousePointer size={12} />} defaultOpen={false}>
          <Row label="Behavior">
            <BtnGroup options={['auto','smooth']} value={getS('scroll-behavior') || 'auto'} onChange={v => apply('scroll-behavior', v)} />
          </Row>
          <Row label="Snap T">
            <select style={selBase} value={getS('scroll-snap-type') || 'none'} onChange={e => apply('scroll-snap-type', e.target.value)}>
              {['none','x mandatory','y mandatory','both mandatory','x proximity','y proximity'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Snap A">
            <BtnGroup options={['none','start','center','end']} value={getS('scroll-snap-align') || 'none'} onChange={v => apply('scroll-snap-align', v)} small />
          </Row>
          <Row label="Overscroll">
            <BtnGroup options={['auto','contain','none']} value={getS('overscroll-behavior') || 'auto'} onChange={v => apply('overscroll-behavior', v)} small />
          </Row>
          <Row label="Overflow X">
            <BtnGroup options={['visible','hidden','auto','scroll']} value={getS('overflow-x') || 'visible'} onChange={v => apply('overflow-x', v)} small />
          </Row>
          <Row label="Overflow Y">
            <BtnGroup options={['visible','hidden','auto','scroll']} value={getS('overflow-y') || 'visible'} onChange={v => apply('overflow-y', v)} small />
          </Row>
        </Section>

        {/* Text Effects */}
        <Section title="Text Effects" icon={<FiType size={12} />} defaultOpen={false}>
          <Row label="L Spacing">
            <PropInput value={getS('letter-spacing') || 'normal'} onChange={v => apply('letter-spacing', v)} placeholder="0.05em" />
          </Row>
          <Row label="W Spacing">
            <PropInput value={getS('word-spacing') || 'normal'} onChange={v => apply('word-spacing', v)} placeholder="0.1em" />
          </Row>
          <Row label="White Sp">
            <select style={selBase} value={getS('white-space') || 'normal'} onChange={e => apply('white-space', e.target.value)}>
              {['normal','nowrap','pre','pre-wrap','pre-line','break-spaces'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Word Brk">
            <BtnGroup options={['normal','break-all','keep-all','break-word']} value={getS('word-break') || 'normal'} onChange={v => apply('word-break', v)} small />
          </Row>
          <Row label="Overflw">
            <BtnGroup options={['normal','break-word','anywhere']}
              value={(() => { const v = getS('overflow-wrap') || 'normal'; return v; })()}
              onChange={v => apply('overflow-wrap', v)} small />
          </Row>
          <Row label="Indent">
            <PropInput value={getS('text-indent') || '0'} onChange={v => apply('text-indent', v)} placeholder="2em" />
          </Row>
          <Row label="Decor C">
            <ColorInput value={getS('text-decoration-color') || 'currentColor'} onChange={v => apply('text-decoration-color', v)} />
          </Row>
          <Row label="Decor S">
            <BtnGroup options={['solid','dashed','dotted','wavy','double']} value={getS('text-decoration-style') || 'solid'} onChange={v => apply('text-decoration-style', v)} small />
          </Row>
          <Row label="Decor T">
            <PropInput value={getS('text-decoration-thickness') || 'auto'} onChange={v => apply('text-decoration-thickness', v)} placeholder="2px" />
          </Row>
          <Row label="Underln">
            <PropInput value={getS('text-underline-offset') || 'auto'} onChange={v => apply('text-underline-offset', v)} placeholder="3px" />
          </Row>
          <Row label="WritingM">
            <select style={selBase} value={getS('writing-mode') || 'horizontal-tb'} onChange={e => apply('writing-mode', e.target.value)}>
              {['horizontal-tb','vertical-rl','vertical-lr'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Direction">
            <BtnGroup options={['ltr','rtl']} value={getS('direction') || 'ltr'} onChange={v => apply('direction', v)} />
          </Row>
        </Section>

        {/* Transform Advanced */}
        <Section title="Transform Origin / 3D" defaultOpen={false}>
          <Row label="Origin">
            <PropInput value={getS('transform-origin') || 'center'} onChange={v => apply('transform-origin', v)} placeholder="center / 50% 50%" />
          </Row>
          <Row label="Style">
            <BtnGroup options={['flat','preserve-3d']}
              value={(() => { const v = getS('transform-style') || 'flat'; return v === 'preserve-3d' ? 'preserve-3d' : 'flat'; })()}
              onChange={v => apply('transform-style', v)} small />
          </Row>
          <Row label="Perspect">
            <PropInput value={getS('perspective') || 'none'} onChange={v => apply('perspective', v)} placeholder="800px" />
          </Row>
          <Row label="P Origin">
            <PropInput value={getS('perspective-origin') || '50% 50%'} onChange={v => apply('perspective-origin', v)} placeholder="50% 50%" />
          </Row>
          <Row label="Backface">
            <BtnGroup options={['visible','hidden']} value={getS('backface-visibility') || 'visible'} onChange={v => apply('backface-visibility', v)} />
          </Row>
        </Section>

        {/* Custom CSS */}
        <Section title="Custom CSS" icon={<FiCode size={12} />} defaultOpen={false}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Paste CSS property:value pairs</div>
          <textarea
            style={{ ...inputBase, width: '100%', height: 88, resize: 'none', flex: 'none' } as any}
            placeholder={'color: red;\nbackground: blue;\nfont-size: 20px;'}
            value={customCssDraft}
            onChange={e => setCustomCssDraft(e.target.value)}
            onBlur={() => {
              customCssDraft.split(';').map(r => r.trim()).filter(Boolean).forEach(rule => {
                const [prop, ...vals] = rule.split(':');
                if (prop && vals.length) apply(prop.trim(), vals.join(':').trim());
              });
            }}
            onFocus={e => (e.target.style.borderColor = C.accentBrd)}
            onBlurCapture={e => (e.target.style.borderColor = C.border)}
          />
        </Section>

      </div>
    </div>
  );
};

export default PropertiesPanel;
