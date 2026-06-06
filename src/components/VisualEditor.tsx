import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEditorStore } from '../store/editorStore';
import { useContextMenu } from './ContextMenu';
import { buildProjectHtml, getTargetHtmlFile, getTargetJsFile, insertBeforeClosingTag } from '../utils/projectFiles';

/* ─────────────── constants ─────────────── */
const SKIP_TAGS = new Set(['html','head','body','script','style','meta','link','title','base','noscript']);
const MAX_VISUAL_HISTORY = 120;

const STYLE_PROPS = [
  'color','font-size','font-weight','font-family','font-style',
  'text-align','text-decoration','text-transform','text-shadow',
  'line-height','letter-spacing','word-spacing','word-break',
  'overflow-wrap','white-space','writing-mode','direction',
  'background-color','background','background-image','background-size',
  'background-position','background-repeat','background-clip',
  'display','position','width','height','min-width','min-height','max-width','max-height',
  'margin','margin-top','margin-right','margin-bottom','margin-left',
  'padding','padding-top','padding-right','padding-bottom','padding-left',
  'left','top','right','bottom','inset','z-index','overflow','overflow-x','overflow-y',
  'box-sizing','visibility','aspect-ratio','object-fit','object-position',
  'border','border-width','border-color','border-style','border-radius',
  'border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius',
  'outline-width','outline-color','outline-style','outline-offset',
  'box-shadow','opacity',
  'flex-direction','flex-wrap','justify-content','align-items','align-self','align-content',
  'gap','row-gap','column-gap','flex-grow','flex-shrink','flex-basis','order',
  'grid-template-columns','grid-template-rows','grid-auto-flow','grid-column','grid-row',
  'place-items','place-content',
  'transform','transform-origin','transform-style','perspective',
  'transition','animation','will-change',
  'filter','backdrop-filter','mix-blend-mode','clip-path',
  'cursor','pointer-events','user-select','resize','touch-action',
  'list-style-type','list-style-position',
  'scroll-behavior','scroll-snap-type','scroll-snap-align',
  'accent-color',
];

/* ─────────────── helpers ─────────────── */
function cssEscape(v: string) { return v.replace(/["\\#.:,[\]>+~*^$|= !]/g, '\\$&'); }

function elementSelector(el: HTMLElement): string {
  if (el.id) return `#${cssEscape(el.id)}`;
  const parts: string[] = [];
  let node: HTMLElement | null = el;
  while (node && node.parentElement && node.tagName.toLowerCase() !== 'body') {
    const tag = node.tagName.toLowerCase();
    const siblings = Array.from(node.parentElement.children).filter(c => c.tagName === node!.tagName);
    const idx = siblings.indexOf(node) + 1;
    parts.unshift(`${tag}:nth-of-type(${Math.max(1, idx)})`);
    node = node.parentElement;
  }
  return parts.join(' > ') || el.tagName.toLowerCase();
}

function shortSelector(el: HTMLElement): string {
  if (el.id) return `#${cssEscape(el.id)}`;
  const cl = Array.from(el.classList).filter(Boolean);
  if (cl.length) return `.${cl.map(cssEscape).join('.')}`;
  return elementSelector(el);
}

function collectStyles(el: HTMLElement, win?: Window | null): Record<string, string> {
  const cs = win?.getComputedStyle(el);
  const styles: Record<string, string> = {};
  STYLE_PROPS.forEach(p => { styles[p] = el.style.getPropertyValue(p) || cs?.getPropertyValue(p) || ''; });
  styles['inline-style'] = el.getAttribute('style') || '';
  styles['selector'] = shortSelector(el);
  return styles;
}

function parseHoverRules(cssText: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {};
  const re = /([^{]+)\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(cssText)) !== null) {
    const sel = m[1].trim().replace(':hover', '').trim();
    const props: Record<string, string> = {};
    m[2].split(';').forEach(pair => {
      const i = pair.indexOf(':');
      if (i < 0) return;
      const k = pair.slice(0, i).trim().toLowerCase();
      const v = pair.slice(i + 1).trim();
      if (k && v) props[k] = v;
    });
    if (Object.keys(props).length) rules[sel] = props;
  }
  return rules;
}

function serializeHoverRules(rules: Record<string, Record<string, string>>): string {
  return Object.entries(rules)
    .map(([sel, props]) => `${sel}:hover { ${Object.entries(props).map(([k,v]) => `${k}: ${v}`).join('; ')} }`)
    .join('\n');
}

function declarationMap(style: CSSStyleDeclaration): Record<string, string> {
  const props: Record<string, string> = {};
  for (let i = 0; i < style.length; i += 1) {
    const prop = style.item(i);
    const value = style.getPropertyValue(prop);
    if (prop && value) props[prop.toLowerCase()] = value.trim();
  }
  return props;
}

function pseudoKey(selector: string, pseudo: string): string {
  return pseudo.startsWith('@media') ? `${pseudo}|||${selector}` : `${selector}${pseudo}`;
}

function readPseudoRuleMap(styleEl: HTMLStyleElement | null): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  const rules = styleEl?.sheet?.cssRules;
  if (!rules) return out;

  Array.from(rules).forEach(rule => {
    if (rule.type === CSSRule.STYLE_RULE) {
      const styleRule = rule as CSSStyleRule;
      out[styleRule.selectorText.trim()] = declarationMap(styleRule.style);
    } else if (rule.type === CSSRule.MEDIA_RULE) {
      const mediaRule = rule as CSSMediaRule;
      Array.from(mediaRule.cssRules).forEach(inner => {
        if (inner.type !== CSSRule.STYLE_RULE) return;
        const styleRule = inner as CSSStyleRule;
        out[`@media ${mediaRule.conditionText}|||${styleRule.selectorText.trim()}`] = declarationMap(styleRule.style);
      });
    }
  });

  return out;
}

function serializePseudoRuleMap(rules: Record<string, Record<string, string>>): string {
  return Object.entries(rules)
    .filter(([, props]) => Object.keys(props).length > 0)
    .map(([key, props]) => {
      const decl = Object.entries(props).map(([k, v]) => `${k}: ${v};`).join(' ');
      const [media, selector] = key.split('|||');
      return selector ? `${media} { ${selector} { ${decl} } }` : `${key} { ${decl} }`;
    })
    .join('\n');
}

function collectHoverStyles(el: HTMLElement): Record<string, string> {
  const sEl = el.ownerDocument?.getElementById('__tl-hover-rules') as HTMLStyleElement | null;
  return parseHoverRules(sEl?.textContent || '')[elementSelector(el)] || {};
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return el.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getRotateDeg(el: HTMLElement, win: Window | null | undefined): number {
  const tx = win?.getComputedStyle(el).transform || 'none';
  if (tx === 'none') return 0;
  const m = tx.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const [a, b] = m[1].split(',').map(Number);
  return Math.round(Math.atan2(b, a) * 180 / Math.PI);
}

/* ─────────────── SelectionOverlay ─────────────── */
const HANDLES = ['nw','n','ne','e','se','s','sw','w'] as const;
type Handle = typeof HANDLES[number];
type VisualHistoryEntry = {
  fileId: string;
  before: string;
  after: string;
  selector: string | null;
};

const HANDLE_CURSORS: Record<Handle, string> = {
  nw: 'nw-resize', n: 'n-resize',  ne: 'ne-resize',
  e:  'e-resize',  se: 'se-resize', s:  's-resize',
  sw: 'sw-resize', w:  'w-resize',
};

const ACCENT = '#e5a45a';
const HW = 10; // handle width/height px
const MOVE_HANDLE_SIZE = 28;
const MOVE_HANDLE_GAP = 8;
const ROT_OFF = 22; // rotation handle offset above element

interface SelectionOverlayProps {
  selEl: HTMLElement;
  iframe: HTMLIFrameElement;
  onCommit: () => void;
  refreshTick: number;
}

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ selEl, iframe, onCommit, refreshTick }) => {
  const [dragTick, setDragTick] = useState(0);

  if (!selEl.isConnected) return null;

  const ifrRect = iframe.getBoundingClientRect();
  const elRect  = selEl.getBoundingClientRect(); // viewport-relative inside the iframe

  /* Convert to outer-document viewport coords */
  const vr = {
    left:   ifrRect.left + elRect.left,
    top:    ifrRect.top  + elRect.top,
    width:  elRect.width,
    height: elRect.height,
  };

  const ifrWin = iframe.contentWindow;
  const rotateDeg = getRotateDeg(selEl, ifrWin);

  /* ---------- pointer-down handler ---------- */
  const startInteraction = (e: React.PointerEvent<HTMLElement>, type: 'move' | Handle | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}

    const sx = e.clientX;
    const sy = e.clientY;
    const dragTarget = e.currentTarget;
    const pointerId = e.pointerId;
    const previousIframePointerEvents = iframe.style.pointerEvents;

    /* Snapshot element state */
    const cs = ifrWin?.getComputedStyle(selEl);
    const initLeft   = parseFloat(selEl.style.left   || cs?.left   || '0') || 0;
    const initTop    = parseFloat(selEl.style.top    || cs?.top    || '0') || 0;
    const initWidth  = parseFloat(selEl.style.width  || cs?.width  || '0') || elRect.width;
    const initHeight = parseFloat(selEl.style.height || cs?.height || '0') || elRect.height;
    const initRotate = rotateDeg;

    /* Rotation: start angle from element center */
    const cx = ifrRect.left + elRect.left + elRect.width  / 2;
    const cy = ifrRect.top  + elRect.top  + elRect.height / 2;
    const startAngle = Math.atan2(sy - cy, sx - cx);

    /* Cursor */
    const cur = type === 'move' ? 'move' : type === 'rotate' ? 'crosshair' : HANDLE_CURSORS[type as Handle];
    document.body.style.cursor = cur;
    document.body.style.userSelect = 'none';
    iframe.style.pointerEvents = 'none';

    let prepared = false;
    let moved = false;

    const prepareElementForLayoutDrag = () => {
      if (prepared) return;
      prepared = true;
      if (type !== 'rotate' && cs?.display === 'inline' && !selEl.style.display) {
        selEl.style.display = 'inline-block';
      }
      if ((type === 'move' || type.includes('w') || type.includes('n')) && (!selEl.style.position || selEl.style.position === 'static')) {
        selEl.style.position = 'relative';
      }
    };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) moved = true;

      if (type === 'move') {
        prepareElementForLayoutDrag();
        selEl.style.left = (initLeft + dx) + 'px';
        selEl.style.top  = (initTop  + dy) + 'px';

      } else if (type === 'rotate') {
        const curAngle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        const delta    = (curAngle - startAngle) * 180 / Math.PI;
        const newRot   = initRotate + delta;
        const base     = (selEl.style.transform || '').replace(/rotate\([^)]+\)/g, '').trim();
        selEl.style.transform = (base ? base + ' ' : '') + `rotate(${newRot.toFixed(1)}deg)`;

      } else {
        prepareElementForLayoutDrag();
        /* Resize — compute new dims & position */
        let newW = initWidth, newH = initHeight, newL = initLeft, newT = initTop;

        if (type.includes('e')) newW = Math.max(10, initWidth  + dx);
        if (type.includes('s')) newH = Math.max(10, initHeight + dy);
        if (type.includes('w')) { newW = Math.max(10, initWidth  - dx); newL = initLeft + (initWidth  - newW); }
        if (type.includes('n')) { newH = Math.max(10, initHeight - dy); newT = initTop  + (initHeight - newH); }

        selEl.style.width  = newW + 'px';
        selEl.style.height = newH + 'px';

        /* Only update position if a west/north handle was dragged */
        if (type.includes('w') || type.includes('n')) {
          if (type.includes('w')) selEl.style.left = newL + 'px';
          if (type.includes('n')) selEl.style.top  = newT + 'px';
        }
      }

      setDragTick(t => t + 1);
    };

    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      iframe.style.pointerEvents = previousIframePointerEvents;
      try { dragTarget.releasePointerCapture(pointerId); } catch {}
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (moved || prepared) onCommit();
      setDragTick(t => t + 1);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  /* Re-read rects after every drag tick or parent refresh */
  void dragTick; void refreshTick;

  /* Handle positions (centre of each handle square) */
  const hp: Record<Handle, { left: number; top: number }> = {
    nw: { left: vr.left - HW / 2,              top: vr.top - HW / 2 },
    n:  { left: vr.left + vr.width / 2 - HW/2, top: vr.top - HW / 2 },
    ne: { left: vr.left + vr.width - HW / 2,   top: vr.top - HW / 2 },
    e:  { left: vr.left + vr.width - HW / 2,   top: vr.top + vr.height / 2 - HW / 2 },
    se: { left: vr.left + vr.width - HW / 2,   top: vr.top + vr.height - HW / 2 },
    s:  { left: vr.left + vr.width / 2 - HW/2, top: vr.top + vr.height - HW / 2 },
    sw: { left: vr.left - HW / 2,              top: vr.top + vr.height - HW / 2 },
    w:  { left: vr.left - HW / 2,              top: vr.top + vr.height / 2 - HW / 2 },
  };
  const moveHandleTop = vr.top > MOVE_HANDLE_SIZE + MOVE_HANDLE_GAP + 4
    ? vr.top - MOVE_HANDLE_SIZE - MOVE_HANDLE_GAP
    : vr.top + 6;
  const moveHandleLeft = clampNumber(
    vr.left + vr.width / 2 - MOVE_HANDLE_SIZE / 2,
    4,
    window.innerWidth - MOVE_HANDLE_SIZE - 4,
  );

  return createPortal(
    <>
      {/* Selection border / drag-to-move zone */}
      <div
        onPointerDown={e => startInteraction(e, 'move')}
        style={{
          position: 'fixed', left: vr.left, top: vr.top,
          width: vr.width, height: vr.height,
          outline: `1.5px solid ${ACCENT}`,
          boxSizing: 'border-box',
          cursor: 'move', zIndex: 9000, pointerEvents: 'auto',
          background: 'rgba(229,164,90,0.02)',
          touchAction: 'none',
        }}
      />

      <div
        onPointerDown={e => startInteraction(e, 'move')}
        title="Drag to move selected element"
        style={{
          position: 'fixed',
          left: moveHandleLeft,
          top: moveHandleTop,
          width: MOVE_HANDLE_SIZE,
          height: MOVE_HANDLE_SIZE,
          zIndex: 9002,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 4px)',
          gridTemplateRows: 'repeat(2, 4px)',
          gap: 3,
          alignContent: 'center',
          justifyContent: 'center',
          borderRadius: 5,
          border: `1px solid ${ACCENT}`,
          background: 'rgba(17,17,20,0.96)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
          cursor: 'grab',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            style={{ width: 4, height: 4, borderRadius: 4, background: ACCENT, opacity: 0.9 }}
          />
        ))}
      </div>

      {/* 8 resize handles */}
      {HANDLES.map(h => (
        <div
          key={h}
          onPointerDown={e => startInteraction(e, h)}
          style={{
            position: 'fixed',
            left: hp[h].left, top: hp[h].top,
            width: HW, height: HW,
            background: '#111114',
            border: `2px solid ${ACCENT}`,
            borderRadius: 2,
            cursor: HANDLE_CURSORS[h],
            zIndex: 9001, pointerEvents: 'auto',
            touchAction: 'none',
          }}
        />
      ))}

      {/* Rotation stem */}
      <div style={{
        position: 'fixed',
        left: vr.left + vr.width / 2 - 0.5,
        top:  vr.top - ROT_OFF,
        width: 1, height: ROT_OFF,
        background: ACCENT,
        zIndex: 9000, pointerEvents: 'none',
      }} />

      {/* Rotation handle */}
      <div
        onPointerDown={e => startInteraction(e, 'rotate')}
        title="Rotate"
        style={{
          position: 'fixed',
          left: vr.left + vr.width / 2 - 7,
          top:  vr.top - ROT_OFF - 14,
          width: 14, height: 14,
          borderRadius: '50%',
          background: '#111114',
          border: `2px solid ${ACCENT}`,
          cursor: 'crosshair',
          zIndex: 9001, pointerEvents: 'auto',
          touchAction: 'none',
        }}
      />

      {/* Size badge */}
      <div style={{
        position: 'fixed',
        left: vr.left, top: vr.top + vr.height + 6,
        zIndex: 9001, pointerEvents: 'none',
        background: 'rgba(14,14,17,0.9)', border: '1px solid #2e2e32',
        borderRadius: 4, padding: '1px 6px',
        fontSize: 9, fontFamily: 'monospace', color: '#888', whiteSpace: 'nowrap',
      }}>
        {Math.round(elRect.width)} × {Math.round(elRect.height)}
        {rotateDeg !== 0 && ` · ${rotateDeg}°`}
      </div>
    </>,
    document.body,
  );
};

/* ─────────────── QuickToolbar ─────────────── */
interface QuickToolbarProps {
  selEl: HTMLElement;
  ifrRect: DOMRect;
  elRect: DOMRect;
  win?: Window | null;
  onApply: (prop: string, value: string) => void;
}

const QuickToolbar: React.FC<QuickToolbarProps> = ({ selEl, ifrRect, elRect, win, onApply }) => {
  const cs = win?.getComputedStyle(selEl);
  const rawRadius  = selEl.style.borderRadius || cs?.borderRadius  || '0';
  const rawOpacity = selEl.style.opacity      || cs?.opacity       || '1';
  const rawBg      = selEl.style.backgroundColor || cs?.backgroundColor || '';
  const rawColor   = selEl.style.color           || cs?.color           || '';
  const rawFontSize = parseFloat(cs?.fontSize || '14');

  const [radius,  setRadius]  = useState(parseFloat(rawRadius)  || 0);
  const [opacity, setOpacity] = useState(Math.round((parseFloat(rawOpacity) || 1) * 100));

  useEffect(() => { setRadius(parseFloat(rawRadius)   || 0); },                               [rawRadius]);
  useEffect(() => { setOpacity(Math.round((parseFloat(rawOpacity) || 1) * 100)); }, [rawOpacity]);

  const toolTop  = ifrRect.top  + elRect.top - 50;
  const toolLeft = ifrRect.left + elRect.left;
  const finalTop  = toolTop < 6 ? ifrRect.top + elRect.top + elRect.height + 8 : toolTop;
  const finalLeft = Math.max(4, Math.min(toolLeft, window.innerWidth - 470));

  const toHex = (color: string) => {
    if (!color) return '#000000';
    if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color.slice(0, 7);
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }
    return '#000000';
  };

  const isBold = cs?.fontWeight === '700' || cs?.fontWeight === 'bold';
  const sep = <div style={{ width: 1, height: 16, background: '#2e2e32', flexShrink: 0 }} />;
  const lbl = (s: string) => <span style={{ fontSize: 9, color: '#555', flexShrink: 0 }}>{s}</span>;

  return createPortal(
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: finalTop, left: finalLeft, zIndex: 9100,
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#111114', border: '1px solid #2e2e32',
        borderRadius: 8, padding: '5px 10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
        userSelect: 'none', whiteSpace: 'nowrap', maxWidth: 490,
      }}
    >
      {/* Tag label */}
      <span style={{ fontSize: 10, color: ACCENT, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>
        &lt;{selEl.tagName.toLowerCase()}{selEl.id ? '#' + selEl.id : ''}&gt;
      </span>

      {sep}

      {/* Text color */}
      <label style={{ display:'flex', alignItems:'center', gap:3, cursor:'pointer', flexShrink:0 }} title="Text color">
        {lbl('T')}
        <div style={{ width:18, height:18, borderRadius:3, border:'1px solid #333', overflow:'hidden', position:'relative', background: rawColor || '#fff' }}>
          <input type="color" value={toHex(rawColor)} onChange={e => onApply('color', e.target.value)}
            style={{ position:'absolute', top:-4, left:-4, width:26, height:26, opacity:0, cursor:'pointer' }} />
        </div>
      </label>

      {/* BG color */}
      <label style={{ display:'flex', alignItems:'center', gap:3, cursor:'pointer', flexShrink:0 }} title="Background">
        {lbl('BG')}
        <div style={{ width:18, height:18, borderRadius:3, border:'1px solid #333', overflow:'hidden', position:'relative', background: rawBg || undefined, backgroundImage: !rawBg ? 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%)' : undefined, backgroundSize:'8px 8px' }}>
          <input type="color" value={toHex(rawBg)} onChange={e => onApply('background-color', e.target.value)}
            style={{ position:'absolute', top:-4, left:-4, width:26, height:26, opacity:0, cursor:'pointer' }} />
        </div>
      </label>

      {sep}

      {/* Border radius */}
      <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
        {lbl('⌒')}
        <input type="range" min={0} max={999} step={1} value={radius}
          onChange={e => { const v = Number(e.target.value); setRadius(v); onApply('border-radius', v+'px'); }}
          style={{ width:60, accentColor: ACCENT } as React.CSSProperties} />
        <span style={{ fontSize:9, color:'#888', minWidth:28, textAlign:'right' }}>{radius}px</span>
      </div>

      {/* Opacity */}
      <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
        {lbl('α')}
        <input type="range" min={0} max={100} step={1} value={opacity}
          onChange={e => { const v = Number(e.target.value); setOpacity(v); onApply('opacity', (v/100).toFixed(2)); }}
          style={{ width:50, accentColor: ACCENT } as React.CSSProperties} />
        <span style={{ fontSize:9, color:'#888', minWidth:24, textAlign:'right' }}>{opacity}%</span>
      </div>

      {sep}

      {/* Font size */}
      <button onClick={() => onApply('font-size', Math.max(8, rawFontSize-2)+'px')} title="Smaller" style={TB}>−</button>
      <span style={{ fontSize:9, color:'#888', minWidth:26, textAlign:'center' }}>{Math.round(rawFontSize)}px</span>
      <button onClick={() => onApply('font-size', (rawFontSize+2)+'px')} title="Larger"  style={TB}>+</button>

      {/* Bold */}
      <button
        onClick={() => onApply('font-weight', isBold ? '400' : '700')} title="Bold"
        style={{ ...TB, fontWeight:700, color: isBold ? ACCENT : '#555',
          background: isBold ? 'rgba(229,164,90,0.12)' : 'none',
          borderColor: isBold ? 'rgba(229,164,90,0.3)' : '#2e2e32' }}
      >B</button>
    </div>,
    document.body,
  );
};

const TB: React.CSSProperties = {
  background:'none', border:'1px solid #2e2e32', borderRadius:4,
  color:'#666', cursor:'pointer', fontSize:11,
  width:22, height:22, display:'flex', alignItems:'center',
  justifyContent:'center', flexShrink:0, padding:0,
};

/* ═══════════════════════════════════════════════════════════════ */
/*  VisualEditor                                                   */
/* ═══════════════════════════════════════════════════════════════ */
const VisualEditor: React.FC = () => {
  const {
    files, activeFileId,
    setSelectedElement, timelineAnimationStyle,
    setSelectedSelector, setVisualBridge, selectedSelector,
  } = useEditorStore();

  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const animStyleRef  = useRef(timelineAnimationStyle);
  const selElRef      = useRef<HTMLElement | null>(null);
  const hovElRef      = useRef<HTMLElement | null>(null);
  const selectedSelectorRef = useRef<string | null>(null);
  const pendingSelectorRef  = useRef<string | null>(null);
  const prevFilesRef        = useRef(files);
  const eventsCleanupRef    = useRef<null | (() => void)>(null);
  const rebuildTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRebuildRef      = useRef(0);
  const undoStackRef        = useRef<VisualHistoryEntry[]>([]);
  const redoStackRef        = useRef<VisualHistoryEntry[]>([]);

  const [srcDoc, setSrcDoc]       = useState('');
  const [selEl,  setSelEl]        = useState<HTMLElement | null>(null);
  const [hovEl,  setHovEl]        = useState<HTMLElement | null>(null);
  const [hovRect,setHovRect]      = useState<DOMRect | null>(null);
  const [ifrRect,setIfrRect]      = useState<DOMRect | null>(null);
  const [elRect, setElRect]       = useState<DOMRect | null>(null);
  const [tick,   setTick]         = useState(0);
  const [interaction, setInteraction] = useState<'select'|'interact'>('select');
  const [isEditingText, setIsEditingText] = useState(false);
  const [showQuickBar, setShowQuickBar]   = useState(false);

  const { show: showCtx } = useContextMenu();

  useEffect(() => { selElRef.current = selEl; }, [selEl]);
  useEffect(() => { hovElRef.current = hovEl; }, [hovEl]);
  useEffect(() => { animStyleRef.current = timelineAnimationStyle; }, [timelineAnimationStyle]);
  useEffect(() => () => { eventsCleanupRef.current?.(); }, []);

  /* ── track iframe position ── */
  useEffect(() => {
    const update = () => {
      const r = iframeRef.current?.getBoundingClientRect();
      if (r) setIfrRect(r);
    };
    update();
    const ro = new ResizeObserver(update);
    if (iframeRef.current) ro.observe(iframeRef.current);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  /* ── keep elRect fresh ── */
  useEffect(() => {
    if (!selEl?.isConnected) { setElRect(null); return; }
    const r = selEl.getBoundingClientRect();
    setElRect(r);
  }, [selEl, tick]);

  /* ── animation styles ── */
  const injectAnimStyle = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    let el = doc.getElementById('__timeline-anim-style') as HTMLStyleElement | null;
    if (!el) { el = doc.createElement('style'); el.id = '__timeline-anim-style'; doc.head?.appendChild(el); }
    el.textContent = animStyleRef.current || '';
  }, []);

  /* ── source helpers ── */
  const serializeDoc = (doc: Document) =>
    (doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '') + '\n' + doc.documentElement.outerHTML;

  const resolveTarget = (doc: Document, sel: string, el: HTMLElement): HTMLElement | null => {
    const byS = doc.querySelector(sel) as HTMLElement | null;
    if (byS) return byS;
    if (el.id) return doc.getElementById(el.id);
    const cl = Array.from(el.classList);
    if (cl.length) return doc.querySelector(`.${cl.map(cssEscape).join('.')}`) as HTMLElement | null;
    const all = doc.querySelectorAll(el.tagName.toLowerCase());
    return all.length === 1 ? all[0] as HTMLElement : null;
  };

  const pushVisualHistory = useCallback((entry: VisualHistoryEntry) => {
    if (entry.before === entry.after) return;
    undoStackRef.current = [...undoStackRef.current, entry].slice(-MAX_VISUAL_HISTORY);
    redoStackRef.current = [];
  }, []);

  const updateSource = useCallback((el: HTMLElement, fn: (t: HTMLElement) => void) => {
    const state = useEditorStore.getState();
    const htmlFile = getTargetHtmlFile(state.files, state.activeFileId);
    if (!htmlFile) return;
    const sel    = elementSelector(el);
    const parsed = new DOMParser().parseFromString(htmlFile.content, 'text/html');
    const t      = resolveTarget(parsed, sel, el);
    if (!t) return;
    fn(t);
    const updated = serializeDoc(parsed);
    if (updated !== htmlFile.content) {
      pushVisualHistory({ fileId: htmlFile.id, before: htmlFile.content, after: updated, selector: selectedSelectorRef.current || sel });
      state.updateFileContent(htmlFile.id, updated);
    }
  }, [pushVisualHistory]);

  const runVisualHistory = useCallback((direction: 'undo' | 'redo') => {
    const source = direction === 'undo' ? undoStackRef.current : redoStackRef.current;
    const entry = source[source.length - 1];
    if (!entry) return false;

    const state = useEditorStore.getState();
    const file = state.files.find(f => f.id === entry.fileId);
    if (!file) return false;

    if (direction === 'undo') {
      undoStackRef.current = undoStackRef.current.slice(0, -1);
      redoStackRef.current = [...redoStackRef.current, entry].slice(-MAX_VISUAL_HISTORY);
    } else {
      redoStackRef.current = redoStackRef.current.slice(0, -1);
      undoStackRef.current = [...undoStackRef.current, entry].slice(-MAX_VISUAL_HISTORY);
    }

    const nextContent = direction === 'undo' ? entry.before : entry.after;
    selectedSelectorRef.current = entry.selector;
    pendingSelectorRef.current = entry.selector;
    setSelectedSelector(entry.selector);
    setSelEl(null);
    setHovEl(null);
    setSelectedElement(null);
    state.updateFileContent(entry.fileId, nextContent);
    setTick(t => t + 1);
    return true;
  }, [setSelectedElement, setSelectedSelector]);

  const handleVisualUndoRedoKey = useCallback((e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || isEditableEventTarget(e.target)) return false;

    const key = e.key.toLowerCase();
    const undo = key === 'z' && !e.shiftKey;
    const redo = key === 'y' || (key === 'z' && e.shiftKey);
    if (!undo && !redo) return false;

    e.preventDefault();
    e.stopPropagation();
    runVisualHistory(undo ? 'undo' : 'redo');
    return true;
  }, [runVisualHistory]);

  const syncToSource = useCallback((el: HTMLElement) => {
    const style    = el.getAttribute('style') || '';
    const hoverCss = (el.ownerDocument?.getElementById('__tl-hover-rules') as HTMLStyleElement | null)?.textContent || '';
    const pseudoCss = (el.ownerDocument?.getElementById('__tl-pseudo-rules') as HTMLStyleElement | null)?.textContent || '';
    updateSource(el, t => {
      if (style) t.setAttribute('style', style); else t.removeAttribute('style');
      let hs = t.ownerDocument.getElementById('__tl-hover-rules') as HTMLStyleElement | null;
      if (!hs && hoverCss) { hs = t.ownerDocument.createElement('style'); hs.id = '__tl-hover-rules'; t.ownerDocument.head.appendChild(hs); }
      if (hs) { if (hoverCss) hs.textContent = hoverCss; else hs.remove(); }
      let ps = t.ownerDocument.getElementById('__tl-pseudo-rules') as HTMLStyleElement | null;
      if (!ps && pseudoCss) { ps = t.ownerDocument.createElement('style'); ps.id = '__tl-pseudo-rules'; t.ownerDocument.head.appendChild(ps); }
      if (ps) { if (pseudoCss) ps.textContent = pseudoCss; else ps.remove(); }
    });
  }, [updateSource]);

  const refreshSnapshot = useCallback((el: HTMLElement) => {
    const prev = useEditorStore.getState().selectedElement;
    if (!prev) return;
    setSelectedElement({
      ...prev,
      tagName: el.tagName.toLowerCase(), id: el.id,
      className: el.className || '',
      styles: collectStyles(el, iframeRef.current?.contentWindow),
      hoverStyles: collectHoverStyles(el),
      innerHTML: el.innerHTML, textContent: el.textContent || '',
    });
  }, [setSelectedElement]);

  const getSelDomEl = useCallback((): HTMLElement | null => {
    const cur = selElRef.current;
    if (cur?.isConnected) return cur;
    const doc = iframeRef.current?.contentDocument;
    const sel = selectedSelectorRef.current || selectedSelector;
    if (!doc || !sel) return null;
    const el = doc.querySelector(sel) as HTMLElement | null;
    return el && !SKIP_TAGS.has(el.tagName.toLowerCase()) ? el : null;
  }, [selectedSelector]);

  const applyStyle = useCallback((el: HTMLElement, prop: string, val: string) => {
    if (val === '') el.style.removeProperty(prop); else el.style.setProperty(prop, val);
    setTick(t => t + 1);
    refreshSnapshot(el);
    syncToSource(el);
  }, [refreshSnapshot, syncToSource]);

  /* ── visual bridge ── */
  useEffect(() => {
    setVisualBridge({
      applyStyle: (prop, val) => { const el = getSelDomEl(); if (el) applyStyle(el, prop, val); },
      applyHoverStyle: (prop, val) => {
        const el = getSelDomEl(); if (!el) return;
        const doc = el.ownerDocument;
        let sEl = doc.getElementById('__tl-hover-rules') as HTMLStyleElement | null;
        if (!sEl) { sEl = doc.createElement('style'); sEl.id = '__tl-hover-rules'; doc.head.appendChild(sEl); }
        const sel  = elementSelector(el);
        const rules = parseHoverRules(sEl.textContent || '');
        const cur   = rules[sel] || {};
        const k = prop.toLowerCase();
        if (val === '') delete cur[k]; else cur[k] = val;
        rules[sel] = cur;
        if (!Object.keys(cur).length) delete rules[sel];
        sEl.textContent = serializeHoverRules(rules);
        setTick(t => t + 1);
        refreshSnapshot(el);
        syncToSource(el);
      },
      applyPseudoStyle: (pseudo, prop, val) => {
        const el = getSelDomEl(); if (!el) return;
        const doc = el.ownerDocument;
        let sEl = doc.getElementById('__tl-pseudo-rules') as HTMLStyleElement | null;
        if (!sEl) { sEl = doc.createElement('style'); sEl.id = '__tl-pseudo-rules'; doc.head.appendChild(sEl); }
        const rules = readPseudoRuleMap(sEl);
        const key = pseudoKey(elementSelector(el), pseudo);
        const cur = rules[key] || {};
        const k = prop.toLowerCase();
        if (val === '') delete cur[k]; else cur[k] = val;
        rules[key] = cur;
        if (!Object.keys(cur).length) delete rules[key];
        sEl.textContent = serializePseudoRuleMap(rules);
        setTick(t => t + 1);
        refreshSnapshot(el);
        syncToSource(el);
      },
      collectPseudoStyles: (pseudo) => {
        const el = getSelDomEl(); if (!el) return {};
        const sEl = el.ownerDocument.getElementById('__tl-pseudo-rules') as HTMLStyleElement | null;
        return readPseudoRuleMap(sEl)[pseudoKey(elementSelector(el), pseudo)] || {};
      },
      applyContent: (html) => {
        const el = getSelDomEl(); if (!el) return;
        el.innerHTML = html;
        updateSource(el, t => { t.innerHTML = html; });
      },
      setHoverPreview: () => {},
    });
  }, [setVisualBridge, getSelDomEl, applyStyle, refreshSnapshot, syncToSource, updateSource]);

  /* ── select element ── */
  const selectElement = useCallback((el: HTMLElement) => {
    const sel = shortSelector(el);
    selectedSelectorRef.current = sel;
    setSelEl(el);
    setHovEl(null);
    setShowQuickBar(true);
    setSelectedSelector(sel);
    setSelectedElement({
      tagName: el.tagName.toLowerCase(), id: el.id,
      className: el.className || '',
      styles: collectStyles(el, iframeRef.current?.contentWindow),
      hoverStyles: collectHoverStyles(el),
      innerHTML: el.innerHTML, textContent: el.textContent || '',
    });
  }, [setSelectedElement, setSelectedSelector]);

  /* ── build srcDoc ── */
  const buildSrcDoc = useCallback(() => {
    const htmlFile = getTargetHtmlFile(files, activeFileId);
    if (!htmlFile) return '<html><body style="padding:40px;font-family:sans-serif;color:#999">No HTML file</body></html>';
    let html = buildProjectHtml(files, htmlFile);
    const editorCss = `<style>*{cursor:${interaction === 'select' ? 'crosshair' : 'default'}!important;user-select:${interaction === 'select' ? 'none' : 'auto'}!important}</style>`;
    return insertBeforeClosingTag(html, 'head', editorCss);
  }, [files, activeFileId, interaction]);

  const scheduleRebuild = useCallback(() => {
    const now = Date.now();
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    const delay = (now - lastRebuildRef.current) < 100 ? 100 : 50;
    rebuildTimerRef.current = setTimeout(() => {
      lastRebuildRef.current = Date.now();
      setSrcDoc(buildSrcDoc());
    }, delay);
  }, [buildSrcDoc]);

  useEffect(() => { scheduleRebuild(); return () => { if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current); }; }, [scheduleRebuild]);

  useEffect(() => {
    const prev = prevFilesRef.current;
    prevFilesRef.current = files;
    const doc      = iframeRef.current?.contentDocument;
    const loaded   = !!doc?.body;
    const phChanged = getTargetHtmlFile(prev, activeFileId)?.content !== getTargetHtmlFile(files, activeFileId)?.content;
    const pjChanged = getTargetJsFile(prev, activeFileId)?.content !== getTargetJsFile(files, activeFileId)?.content;

    if (!phChanged && !pjChanged && loaded && doc) {
      let allFound = true;
      files.filter(f => f.type === 'css').forEach(css => {
        const prevCss = prev.find(f => f.id === css.id);
        if (prevCss?.content === css.content) return;
        const sEl = doc.querySelector(`style[data-src="${css.id}"]`) as HTMLStyleElement | null;
        if (sEl) sEl.textContent = css.content; else allFound = false;
      });
      if (allFound) return;
    }

    pendingSelectorRef.current = selectedSelectorRef.current;
    scheduleRebuild();
    setHovEl(null);
    if (!selectedSelectorRef.current) { setSelEl(null); setSelectedElement(null); setSelectedSelector(null); }
  }, [activeFileId, files, scheduleRebuild, setSelectedSelector, setSelectedElement]);

  /* ── attach iframe events ── */
  const attachEvents = useCallback(() => {
    const iframe = iframeRef.current;
    const doc    = iframe?.contentDocument;
    const win    = iframe?.contentWindow;
    if (!doc || !win) return;
    injectAnimStyle();

    const onMove = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || SKIP_TAGS.has(t.tagName.toLowerCase())) { setHovEl(null); setHovRect(null); return; }
      if (t !== hovElRef.current) { setHovEl(t); setHovRect(t.getBoundingClientRect()); }
    };

    const onClick = (e: MouseEvent) => {
      if (interaction !== 'select') return;
      e.preventDefault(); e.stopPropagation();
      const t = e.target as HTMLElement | null;
      if (!t || SKIP_TAGS.has(t.tagName.toLowerCase())) return;
      selectElement(t);
    };

    const onDblClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      e.preventDefault(); e.stopPropagation();
      selectElement(t);

      const noText = ['img','br','hr','input','select','textarea','canvas','video','audio'];
      if (noText.includes(t.tagName.toLowerCase()) || !t.textContent?.trim()) return;

      setIsEditingText(true);
      setShowQuickBar(false);
      t.contentEditable = 'true';
      t.style.cursor = 'text';
      t.focus();

      const saved = t.innerHTML;
      let done = false;
      const commit = () => {
        if (done) return;
        done = true;
        t.contentEditable = 'false';
        t.style.removeProperty('cursor');
        setIsEditingText(false);
        setShowQuickBar(true);
        if (t.innerHTML !== saved) updateSource(t, tgt => { tgt.innerHTML = t.innerHTML; });
      };
      t.addEventListener('blur', () => setTimeout(commit, 50), { once: true });
      t.addEventListener('keydown', (ev: KeyboardEvent) => { if (ev.key === 'Escape') { t.innerHTML = saved; commit(); } }, { once: true });
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const t = e.target as HTMLElement | null;
      if (!t || SKIP_TAGS.has(t.tagName.toLowerCase())) return;

      const qa = (prop: string, val: string) => {
        t.style.setProperty(prop, val);
        setTick(t2 => t2 + 1);
        syncToSource(t);
        if (t === selElRef.current) refreshSnapshot(t);
      };

      const COLORS = ['#ffffff','#000000','#e5a45a','#4a9eff','#e74c3c','#2ecc71','#9b59b6','#f39c12','transparent'];
      const FONTS  = ['sans-serif','serif','monospace','Arial','Georgia','Courier New','Verdana'];
      const SIZES  = ['10px','12px','14px','16px','18px','20px','24px','32px','48px','64px'];

      showCtx(e as unknown as React.MouseEvent, [
        { label: `<${t.tagName.toLowerCase()}${t.id ? '#'+t.id : ''}>`, disabled: true },
        { separator: true, label: '' },
        { label: 'Edit text inline', icon:'✏️', action: () => t.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})) },
        { separator: true, label: '' },
        { label:'Text color',  icon:'🎨', submenu: COLORS.map(c => ({ label:c, swatch:c, action:() => qa('color',c) })) },
        { label:'Background',  icon:'🖌️', submenu: COLORS.map(c => ({ label:c, swatch:c, action:() => qa('background-color',c) })) },
        { label:'Font family', icon:'🔤', submenu: FONTS.map(f => ({ label:f, action:() => qa('font-family',f) })) },
        { label:'Font size',   icon:'📏', submenu: [
          { label:'+ Larger',  action:() => qa('font-size', (parseFloat(win.getComputedStyle(t).fontSize||'14')+2)+'px') },
          { label:'− Smaller', action:() => qa('font-size', Math.max(8,parseFloat(win.getComputedStyle(t).fontSize||'14')-2)+'px') },
          { separator:true, label:'' },
          ...SIZES.map(s => ({ label:s, action:() => qa('font-size',s) })),
        ]},
        { separator: true, label: '' },
        { label:'Toggle Bold',      action:() => { const fw = win.getComputedStyle(t).fontWeight; qa('font-weight', fw==='700'||fw==='bold'?'400':'700'); } },
        { label:'Toggle Italic',    action:() => { const fi = win.getComputedStyle(t).fontStyle; qa('font-style', fi==='italic'?'normal':'italic'); } },
        { label:'Toggle Underline', action:() => { const td = win.getComputedStyle(t).textDecoration; qa('text-decoration', td.includes('underline')?'none':'underline'); } },
        { separator: true, label: '' },
        { label:'Copy HTML',    icon:'📋', action:() => navigator.clipboard.writeText(t.outerHTML) },
        { label:'Copy styles',  icon:'🎨', action:() => navigator.clipboard.writeText(t.getAttribute('style')||'') },
        { label:'Reset styles', icon:'↺',  danger:true, action:() => { t.removeAttribute('style'); setTick(t2=>t2+1); syncToSource(t); } },
        { label:'Hide element', icon:'👁️', action:() => qa('display','none') },
        { label:'Delete',       icon:'🗑️', danger:true, action:() => {
          updateSource(t, tgt => tgt.remove()); t.remove();
          selectedSelectorRef.current = null;
          setSelEl(null); setSelectedElement(null); setSelectedSelector(null); setShowQuickBar(false);
        }},
        { separator: true, label: '' },
        { label:'Select parent', icon:'⬆️', action:() => {
          const p = t.parentElement;
          if (p && !SKIP_TAGS.has(p.tagName.toLowerCase())) selectElement(p);
        }},
      ]);
    };

    const onScroll = () => setTick(t => t + 1);

    doc.addEventListener('mousemove',    onMove);
    doc.addEventListener('click',        onClick,       true);
    doc.addEventListener('dblclick',     onDblClick,    true);
    doc.addEventListener('contextmenu',  onContextMenu, true);
    doc.addEventListener('keydown',      handleVisualUndoRedoKey, true);
    doc.addEventListener('scroll',       onScroll,      true);
    win.addEventListener('resize',       onScroll);

    return () => {
      doc.removeEventListener('mousemove',   onMove);
      doc.removeEventListener('click',       onClick,       true);
      doc.removeEventListener('dblclick',    onDblClick,    true);
      doc.removeEventListener('contextmenu', onContextMenu, true);
      doc.removeEventListener('keydown',     handleVisualUndoRedoKey, true);
      doc.removeEventListener('scroll',      onScroll,      true);
      win.removeEventListener('resize',      onScroll);
    };
  }, [interaction, selectElement, syncToSource, refreshSnapshot, updateSource, injectAnimStyle, showCtx, handleVisualUndoRedoKey]);

  /* ── Escape ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (handleVisualUndoRedoKey(e)) return;
      if (e.key === 'Escape' && !isEditingText) {
        selectedSelectorRef.current = null;
        setSelEl(null); setHovEl(null);
        setSelectedElement(null); setSelectedSelector(null);
        setShowQuickBar(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isEditingText, setSelectedElement, setSelectedSelector, handleVisualUndoRedoKey]);

  /* ── Hover overlay ── */
  const HR = ifrRect && hovRect && hovEl && hovEl !== selEl ? {
    left:   ifrRect.left + hovRect.left,
    top:    ifrRect.top  + hovRect.top,
    width:  hovRect.width,
    height: hovRect.height,
  } : null;

  /* ─────────── render ─────────── */
  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', background:'#141417', display:'flex', flexDirection:'column' }}>

      {/* ── Compact Toolbar ── */}
      <div style={{ height:30, flexShrink:0, background:'#0e0e11', borderBottom:'1px solid #1e1e22', display:'flex', alignItems:'center', padding:'0 8px', gap:4, zIndex:10 }}>
        <div style={{ flex:1, overflow:'hidden', display:'flex', alignItems:'center', gap:3, minWidth:0 }}>
          {selEl ? (
            (() => {
              const path: HTMLElement[] = [];
              let c: HTMLElement | null = selEl;
              while (c && c.tagName.toLowerCase() !== 'body') { path.unshift(c); c = c.parentElement; }
              return path.map((el, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ color:'#333', fontSize:9 }}>›</span>}
                  <button onClick={() => selectElement(el)} style={{
                    background:'none', border:'none', cursor:'pointer', padding:'0 2px',
                    color: i === path.length-1 ? ACCENT : '#555',
                    fontSize:10, fontFamily:'monospace', lineHeight:1,
                  }}>
                    {el.tagName.toLowerCase()}{el.id ? '#'+el.id : ''}
                  </button>
                </React.Fragment>
              ));
            })()
          ) : (
            <span style={{ fontSize:10, color:'#444' }}>
              Click to select · Double-click to edit · Right-click for menu
            </span>
          )}
        </div>

        <div style={{ display:'flex', gap:3, flexShrink:0 }}>
          {selEl && (
            <button onClick={() => setShowQuickBar(s => !s)} title="Quick style editor"
              style={{ ...TBAR, background: showQuickBar ? 'rgba(229,164,90,0.1)' : 'none',
                border:`1px solid ${showQuickBar ? 'rgba(229,164,90,0.25)' : '#1e1e22'}`,
                color: showQuickBar ? ACCENT : '#555' }}
            >⚙ Edit</button>
          )}
          <button
            onClick={() => setInteraction(m => m === 'select' ? 'interact' : 'select')}
            style={{ ...TBAR,
              background: interaction === 'select' ? 'rgba(229,164,90,0.08)' : 'rgba(122,184,245,0.08)',
              border:`1px solid ${interaction === 'select' ? 'rgba(229,164,90,0.2)' : 'rgba(122,184,245,0.2)'}`,
              color: interaction === 'select' ? ACCENT : '#7ab8f5' }}
          >{interaction === 'select' ? '⊹ Select' : '⊕ Interact'}</button>
          {selEl && (
            <button onClick={() => {
              selectedSelectorRef.current = null;
              setSelEl(null); setHovEl(null);
              setSelectedElement(null); setSelectedSelector(null); setShowQuickBar(false);
            }} title="Deselect (Esc)" style={{ ...TBAR, color:'#444' }}>✕</button>
          )}
        </div>
      </div>

      {/* ── Preview ── */}
      <div ref={wrapRef} style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <iframe
          ref={iframeRef}
          title="Visual Editor"
          onLoad={() => {
            setInteraction('select');
            eventsCleanupRef.current?.();
            const cleanup = attachEvents();
            eventsCleanupRef.current = typeof cleanup === 'function' ? cleanup : null;

            const pending = pendingSelectorRef.current;
            if (pending) {
              pendingSelectorRef.current = null;
              setTimeout(() => {
                const doc   = iframeRef.current?.contentDocument;
                const found = doc?.querySelector(pending) as HTMLElement | null;
                if (found && !SKIP_TAGS.has(found.tagName.toLowerCase())) selectElement(found);
              }, 50);
            }
          }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          srcDoc={srcDoc}
          sandbox="allow-same-origin"
          style={{ width:'100%', height:'100%', border:'none', background:'#fff', display:'block' }}
        />

        {/* Hover highlight */}
        {HR && !isEditingText && (
          <div style={{
            position:'fixed', left:HR.left, top:HR.top, width:HR.width, height:HR.height,
            outline:'1.5px dashed rgba(229,164,90,0.4)',
            pointerEvents:'none', zIndex:8990, boxSizing:'border-box',
          }}>
            <div style={{
              position:'absolute', top:-17, left:0,
              background:'rgba(229,164,90,0.9)', color:'#1a1a1a',
              fontSize:9, fontFamily:'monospace', fontWeight:600,
              padding:'1px 5px', borderRadius:'3px 3px 3px 0',
              whiteSpace:'nowrap', pointerEvents:'none',
            }}>
              &lt;{hovEl!.tagName.toLowerCase()}{hovEl!.id ? '#'+hovEl!.id : ''}&gt;
              {' '}{Math.round(HR.width)}×{Math.round(HR.height)}
            </div>
          </div>
        )}
      </div>

      {/* ── Selection overlay (drag / resize / rotate) ── */}
      {selEl?.isConnected && iframeRef.current && !isEditingText && (
        <SelectionOverlay
          selEl={selEl}
          iframe={iframeRef.current}
          refreshTick={tick}
          onCommit={() => {
            const el = selElRef.current;
            if (!el?.isConnected) return;
            syncToSource(el);
            refreshSnapshot(el);
            setTick(t => t + 1);
          }}
        />
      )}

      {/* ── Floating Quick Edit Bar ── */}
      {showQuickBar && selEl?.isConnected && ifrRect && elRect && !isEditingText && (
        <QuickToolbar
          selEl={selEl}
          ifrRect={ifrRect}
          elRect={elRect}
          win={iframeRef.current?.contentWindow}
          onApply={(prop, val) => {
            applyStyle(selEl, prop, val);
            setTick(t => t + 1);
          }}
        />
      )}
    </div>
  );
};

const TBAR: React.CSSProperties = {
  background:'none', border:'1px solid #1e1e22',
  borderRadius:4, cursor:'pointer', fontSize:9,
  padding:'2px 7px', fontFamily:'inherit', color:'#555',
};

export default VisualEditor;
