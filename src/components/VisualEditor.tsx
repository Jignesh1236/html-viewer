import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useContextMenu } from './ContextMenu';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Handle = typeof HANDLES[number];
const CURSOR: Record<Handle, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
};

function getHandlePos(h: Handle, r: { left: number; top: number; width: number; height: number }) {
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const mx: Record<Handle, number> = { nw: r.left, n: cx, ne: r.left + r.width, e: r.left + r.width, se: r.left + r.width, s: cx, sw: r.left, w: r.left };
  const my: Record<Handle, number> = { nw: r.top, n: r.top, ne: r.top, e: cy, se: r.top + r.height, s: r.top + r.height, sw: r.top + r.height, w: cy };
  return { x: mx[h], y: my[h] };
}

const SKIP_TAGS = new Set(['html', 'head', 'body', 'script', 'style', 'meta', 'link', 'title', 'base', 'noscript']);

const STYLE_PROPS = [
  'color', 'background-color', 'background', 'font-size', 'font-weight', 'font-family',
  'text-align', 'text-decoration', 'text-transform', 'line-height', 'letter-spacing',
  'display', 'position', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-color', 'border-style', 'border-radius',
  'box-shadow', 'text-shadow', 'opacity', 'z-index', 'overflow',
  'left', 'top', 'right', 'bottom', 'flex-direction', 'justify-content', 'align-items', 'gap',
  'grid-template-columns', 'grid-template-rows', 'transform', 'transition', 'animation',
  'flex-wrap', 'background-size', 'background-image', 'background-position',
];

function cssEscape(value: string) {
  return value.replace(/["\\#.:,[\]>+~*^$|= !]/g, '\\$&');
}

function elementSelector(el: HTMLElement) {
  if (el.id) return `#${cssEscape(el.id)}`;
  const parts: string[] = [];
  let node: HTMLElement | null = el;
  while (node && node.parentElement && node.tagName.toLowerCase() !== 'body') {
    const tag = node.tagName.toLowerCase();
    const siblings = Array.from(node.parentElement.children).filter(child => child.tagName === node!.tagName);
    const index = siblings.indexOf(node) + 1;
    parts.unshift(`${tag}:nth-of-type(${Math.max(1, index)})`);
    node = node.parentElement;
  }
  return parts.join(' > ') || el.tagName.toLowerCase();
}

function shortSelector(el: HTMLElement) {
  if (el.id) return `#${cssEscape(el.id)}`;
  const classList = Array.from(el.classList).filter(Boolean);
  if (classList.length) return `.${classList.map(cssEscape).join('.')}`;
  return elementSelector(el);
}

function collectStyles(el: HTMLElement, win?: Window | null) {
  const cs = win?.getComputedStyle(el);
  const styles: Record<string, string> = {};
  STYLE_PROPS.forEach(p => { styles[p] = cs?.getPropertyValue(p) || ''; });
  styles['inline-style'] = el.getAttribute('style') || '';
  styles['selector'] = shortSelector(el);
  return styles;
}

/* ── Global drag-capture helpers (shared with App.tsx resizer) ── */
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

const VisualEditor: React.FC = () => {
  const {
    files,
    updateFileContent,
    setSelectedElement,
    addConsoleEntry,
    timelineAnimationStyle,
    setSelectedSelector,
    setVisualBridge,
    selectedSelector,
  } = useEditorStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const animStyleRef = useRef(timelineAnimationStyle);
  const selectedSelectorRef = useRef<string | null>(null);
  const pendingSelectorRef = useRef<string | null>(null);
  const [selEl, setSelEl] = useState<HTMLElement | null>(null);
  const [hovEl, setHovEl] = useState<HTMLElement | null>(null);
  const [iframeOff, setIframeOff] = useState({ left: 0, top: 0 });
  const iframeOffRef = useRef({ left: 0, top: 0 });
  const hovElRef = useRef<HTMLElement | null>(null);
  const selElRef = useRef<HTMLElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [tick, setTick] = useState(0);
  const [activeOp, setActiveOp] = useState<'move' | Handle | 'rotate' | null>(null);
  const { show: showCtx, element: ctxEl } = useContextMenu();
  const eventsCleanupRef = useRef<null | (() => void)>(null);
  const [interaction, setInteraction] = useState<'select' | 'interact'>('select');

  useEffect(() => { iframeOffRef.current = iframeOff; }, [iframeOff]);
  useEffect(() => { hovElRef.current = hovEl; }, [hovEl]);
  useEffect(() => { selElRef.current = selEl; }, [selEl]);
  useEffect(() => {
    return () => {
      eventsCleanupRef.current?.();
      eventsCleanupRef.current = null;
    };
  }, []);

  /* ── Build srcdoc ── */
  const buildSrcDoc = useCallback(() => {
    const htmlFile = files.find(f => f.type === 'html');
    if (!htmlFile) return '<html><body style="padding:40px;font-family:sans-serif;color:#999">No HTML file</body></html>';
    let html = htmlFile.content;
    files.filter(f => f.type === 'css').forEach(css => {
      const tag = `<style data-src="${css.name}">${css.content}</style>`;
      const re = new RegExp(`<link[^>]*href=["']${css.name.replace('.', '\\.')}["'][^>]*/?>`, 'gi');
      if (re.test(html)) {
        html = html.replace(re, tag);
      } else if (html.toLowerCase().includes('</head>')) {
        html = html.replace(/<\/head>/i, `${tag}\n</head>`);
      } else {
        html = `${tag}\n${html}`;
      }
    });
    files.filter(f => f.type === 'image' && f.url).forEach(img => {
      const esc = img.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`(src|href)=["']${esc}["']`, 'gi'), `$1="${img.url}"`);
    });
    const editorCss = `<style>
*{cursor:${interaction === 'select' ? 'crosshair' : 'default'}!important;user-select:${interaction === 'select' ? 'none' : 'auto'}!important}
</style>`;
    if (html.toLowerCase().includes('</head>')) {
      html = html.replace(/<\/head>/i, `${editorCss}</head>`);
    } else {
      html = `${editorCss}\n${html}`;
    }
    return html;
  }, [files, interaction]);

  /* ── Reload iframe ── */
  useEffect(() => {
    if (iframeRef.current) {
      const selector = selectedSelectorRef.current;
      pendingSelectorRef.current = selector;
      iframeRef.current.srcdoc = buildSrcDoc();
      setHovEl(null);
      if (!selector) {
        setSelEl(null);
        setSelectedElement(null);
        setSelectedSelector(null);
      }
    }
  }, [buildSrcDoc, setSelectedSelector, setSelectedElement]);

  /* ── Track iframe offset ── */
  useEffect(() => {
    const update = () => {
      const r = iframeRef.current?.getBoundingClientRect();
      if (r) setIframeOff({ left: r.left, top: r.top });
    };
    update();
    const ro = new ResizeObserver(update);
    if (iframeRef.current) ro.observe(iframeRef.current);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, []);

  /* ── Overlay rects ── */
  const getSelOverlay = useCallback(() => {
    if (!selEl?.isConnected) return null;
    const r = selEl.getBoundingClientRect();
    return { left: iframeOff.left + r.left, top: iframeOff.top + r.top, width: r.width, height: r.height };
  }, [selEl, iframeOff, tick]);

  const getHovOverlay = useCallback(() => {
    if (!hovEl?.isConnected || hovEl === selEl) return null;
    const r = hovEl.getBoundingClientRect();
    return { left: iframeOff.left + r.left, top: iframeOff.top + r.top, width: r.width, height: r.height };
  }, [hovEl, selEl, iframeOff, tick]);

  const serializeDoc = (doc: Document) => {
    const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '';
    return `${doctype}\n${doc.documentElement.outerHTML}`;
  };

  const resolveSourceElement = (doc: Document, selector: string, el: HTMLElement): HTMLElement | null => {
    const bySelector = doc.querySelector(selector) as HTMLElement | null;
    if (bySelector) return bySelector;
    if (el.id) {
      const byId = doc.getElementById(el.id) as HTMLElement | null;
      if (byId) return byId;
    }
    const classList = Array.from(el.classList).filter(Boolean);
    if (classList.length > 0) {
      const byClass = doc.querySelector(`.${classList.map(cssEscape).join('.')}`) as HTMLElement | null;
      if (byClass) return byClass;
    }
    return null;
  };

  const updateHtmlSourceForElement = useCallback((el: HTMLElement, applyChange: (target: HTMLElement) => void) => {
    const htmlFile = files.find(f => f.type === 'html');
    if (!htmlFile) return;
    const selector = elementSelector(el);
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(htmlFile.content, 'text/html');
    const target = resolveSourceElement(parsedDoc, selector, el);
    if (!target) return;
    applyChange(target);
    const updated = serializeDoc(parsedDoc);
    if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
  }, [files, updateFileContent]);

  const syncToSource = useCallback((el: HTMLElement) => {
    const style = el.getAttribute('style') || '';
    updateHtmlSourceForElement(el, (target) => {
      if (style) target.setAttribute('style', style);
      else target.removeAttribute('style');
    });
  }, [updateHtmlSourceForElement]);

  const syncContentToSource = useCallback((el: HTMLElement) => {
    updateHtmlSourceForElement(el, (target) => {
      target.innerHTML = el.innerHTML;
    });
  }, [updateHtmlSourceForElement]);

  const refreshSelectedSnapshot = useCallback((el: HTMLElement) => {
    const iframe = iframeRef.current;
    const prev = useEditorStore.getState().selectedElement;
    if (!prev) return;
    setSelectedElement({
      ...prev,
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      className: el.className || '',
      styles: collectStyles(el, iframe?.contentWindow),
      innerHTML: el.innerHTML,
      textContent: el.textContent || '',
    });
  }, [setSelectedElement]);

  const getSelectedDomEl = useCallback((): HTMLElement | null => {
    const current = selElRef.current;
    if (current?.isConnected) return current;
    const doc = iframeRef.current?.contentDocument;
    const selector = selectedSelectorRef.current || selectedSelector;
    if (!doc || !selector) return null;
    const el = doc.querySelector(selector) as HTMLElement | null;
    if (el && !SKIP_TAGS.has(el.tagName.toLowerCase())) return el;
    return null;
  }, [selectedSelector]);

  /* ── Keep animStyleRef current ── */
  useEffect(() => { animStyleRef.current = timelineAnimationStyle; }, [timelineAnimationStyle]);

  /* ── Register Visual bridge (store actions -> iframe DOM) ── */
  useEffect(() => {
    setVisualBridge({
      applyStyle: (property, value) => {
        const el = getSelectedDomEl();
        if (!el) return;
        el.style.setProperty(property, value);
        setTick(t => t + 1);
        refreshSelectedSnapshot(el);
        syncToSource(el);
      },
      applyContent: (html) => {
        const el = getSelectedDomEl();
        if (!el) return;
        el.innerHTML = html;
        setTick(t => t + 1);
        refreshSelectedSnapshot(el);
        syncContentToSource(el);
      },
    });
    return () => setVisualBridge(null);
  }, [getSelectedDomEl, refreshSelectedSnapshot, setVisualBridge, syncContentToSource, syncToSource]);

  /* ── Helper: inject timeline animation styles into iframe doc ── */
  const injectAnimStyle = useCallback((doc: Document, css: string) => {
    let styleEl = doc.getElementById('__timeline-anim-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = '__timeline-anim-style';
      doc.head?.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, []);

  /* ── Inject timeline animation styles into iframe ── */
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    injectAnimStyle(doc, timelineAnimationStyle);
  }, [timelineAnimationStyle, tick, injectAnimStyle]);

  /* ── Select element ── */
  const selectElement = useCallback((el: HTMLElement) => {
    const selector = elementSelector(el);
    selectedSelectorRef.current = selector;
    setSelectedSelector(selector);
    setSelEl(el);
    setHovEl(null);
    setTick(t => t + 1);

    const iframe = iframeRef.current;
    const cs = iframe?.contentWindow?.getComputedStyle(el) ?? {} as CSSStyleDeclaration;

    const tr = (cs as any).transform || 'none';
    let rot = 0;
    if (tr !== 'none') {
      const m = tr.match(/matrix\((-?[\d.]+),\s*(-?[\d.]+)/);
      if (m) rot = Math.round(Math.atan2(parseFloat(m[2]), parseFloat(m[1])) * (180 / Math.PI));
    }
    setRotation(rot);

    const styles = collectStyles(el, iframe?.contentWindow);

    setSelectedElement({
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      className: el.className || '',
      styles,
      innerHTML: el.innerHTML,
      textContent: el.textContent || '',
    });

    addConsoleEntry({
      type: 'info',
      message: `Selected <${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''}>`,
      timestamp: new Date(),
    });
  }, [setSelectedSelector, setSelectedElement, addConsoleEntry]);

  /* ── Attach iframe events ── */
  const attachEvents = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    /* Re-inject timeline animations after iframe reloads */
    if (animStyleRef.current) injectAnimStyle(doc, animStyleRef.current);

    const pendingSelector = pendingSelectorRef.current;
    if (pendingSelector) {
      pendingSelectorRef.current = null;
      const restored = doc.querySelector(pendingSelector) as HTMLElement | null;
      if (restored && !SKIP_TAGS.has(restored.tagName.toLowerCase())) {
        setTimeout(() => selectElement(restored), 0);
      } else {
        selectedSelectorRef.current = null;
        setSelEl(null);
        setSelectedElement(null);
      }
    }

    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || SKIP_TAGS.has(target.tagName.toLowerCase())) { setHovEl(null); return; }
      if (target !== hovElRef.current) setHovEl(target);
    };

    const onClick = (e: MouseEvent) => {
      if (interaction === 'select') {
        e.preventDefault(); e.stopPropagation();
      } else {
        return;
      }
      const target = e.target as HTMLElement;
      if (!target || SKIP_TAGS.has(target.tagName.toLowerCase())) {
        selectedSelectorRef.current = null;
        setSelEl(null); setSelectedElement(null); setSelectedSelector(null); return;
      }
      selectElement(target);
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      const target = e.target as HTMLElement;
      if (!target || SKIP_TAGS.has(target.tagName.toLowerCase())) return;
      const off = iframeOffRef.current;
      const screenX = off.left + e.clientX;
      const screenY = off.top + e.clientY;

      const fakeEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: screenX,
        clientY: screenY,
      } as React.MouseEvent;

      showCtx(fakeEvent, [
        { label: `Select <${target.tagName.toLowerCase()}>`, icon: '🖱️', action: () => selectElement(target) },
        { separator: true, label: '' },
        { label: 'Copy element HTML', icon: '📋', action: () => { navigator.clipboard.writeText(target.outerHTML); } },
        { label: 'Copy styles', icon: '🎨', action: () => { navigator.clipboard.writeText(target.getAttribute('style') || ''); } },
        { separator: true, label: '' },
        { label: 'Reset styles', icon: '↺', action: () => { target.removeAttribute('style'); setTick(t => t + 1); syncToSource(target); } },
        { label: 'Hide element', icon: '👁️', action: () => { target.style.display = 'none'; setTick(t => t + 1); syncToSource(target); } },
        { separator: true, label: '' },
        { label: 'Select parent', icon: '⬆️', action: () => {
            const parent = target.parentElement;
            if (parent && !SKIP_TAGS.has(parent.tagName.toLowerCase())) selectElement(parent);
          }
        },
      ]);
    };

    doc.addEventListener('mousemove', onMove);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('contextmenu', onContextMenu, true);
    return () => {
      doc.removeEventListener('mousemove', onMove);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [injectAnimStyle, interaction, selectElement, setSelectedSelector, setSelectedElement, showCtx, syncToSource]);

  /* ── Drag move / resize ── */
  const dragRef = useRef<{
    type: 'move' | Handle;
    startX: number; startY: number;
    initLeft: number; initTop: number; initW: number; initH: number;
    el: HTMLElement;
  } | null>(null);

  const startDrag = useCallback((type: 'move' | Handle, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!selEl?.isConnected) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const cs = win.getComputedStyle(selEl);
    const r = selEl.getBoundingClientRect();
    dragRef.current = {
      type,
      startX: e.clientX, startY: e.clientY,
      initLeft: parseFloat(cs.left) || 0,
      initTop: parseFloat(cs.top) || 0,
      initW: r.width, initH: r.height,
      el: selEl,
    };
    const cursor = type === 'move' ? 'move' : CURSOR[type as Handle] || 'default';
    showDragCapture(cursor);
    setActiveOp(type);
  }, [selEl]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !d.el.isConnected) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const { el, type, initLeft, initTop, initW, initH } = d;

      if (type === 'move') {
        el.style.position = el.style.position || 'relative';
        el.style.left = (initLeft + dx) + 'px';
        el.style.top = (initTop + dy) + 'px';
      } else if (type === 'se') {
        el.style.width = Math.max(20, initW + dx) + 'px';
        el.style.height = Math.max(20, initH + dy) + 'px';
      } else if (type === 'e') {
        el.style.width = Math.max(20, initW + dx) + 'px';
      } else if (type === 's') {
        el.style.height = Math.max(20, initH + dy) + 'px';
      } else if (type === 'n') {
        el.style.height = Math.max(20, initH - dy) + 'px';
        el.style.top = (initTop + dy) + 'px';
      } else if (type === 'w') {
        el.style.width = Math.max(20, initW - dx) + 'px';
        el.style.left = (initLeft + dx) + 'px';
      } else if (type === 'sw') {
        el.style.width = Math.max(20, initW - dx) + 'px';
        el.style.left = (initLeft + dx) + 'px';
        el.style.height = Math.max(20, initH + dy) + 'px';
      } else if (type === 'nw') {
        el.style.width = Math.max(20, initW - dx) + 'px';
        el.style.height = Math.max(20, initH - dy) + 'px';
        el.style.left = (initLeft + dx) + 'px';
        el.style.top = (initTop + dy) + 'px';
      } else if (type === 'ne') {
        el.style.width = Math.max(20, initW + dx) + 'px';
        el.style.height = Math.max(20, initH - dy) + 'px';
        el.style.top = (initTop + dy) + 'px';
      }
      setTick(t => t + 1);
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      hideDragCapture();
      setActiveOp(null);
      if (d.el.isConnected) syncToSource(d.el);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [syncToSource]);

  /* ── Rotation drag ── */
  const rotRef = useRef<{ cx: number; cy: number; startAngle: number; initRot: number; el: HTMLElement } | null>(null);

  const startRotate = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const OR = getSelOverlay();
    if (!OR || !selEl?.isConnected) return;
    const cx = OR.left + OR.width / 2;
    const cy = OR.top + OR.height / 2;
    rotRef.current = {
      cx, cy,
      startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI),
      initRot: rotation,
      el: selEl,
    };
    showDragCapture('crosshair');
    setActiveOp('rotate');
  }, [selEl, rotation, getSelOverlay]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = rotRef.current;
      if (!d || !d.el.isConnected) return;
      const angle = Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * (180 / Math.PI);
      const newRot = d.initRot + (angle - d.startAngle);
      d.el.style.transform = `rotate(${newRot}deg)`;
      setRotation(Math.round(newRot));
      setTick(t => t + 1);
    };
    const onUp = () => {
      if (!rotRef.current) return;
      const { el } = rotRef.current;
      rotRef.current = null;
      hideDragCapture();
      setActiveOp(null);
      if (el.isConnected) syncToSource(el);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [syncToSource]);

  const OR = getSelOverlay();
  const HR = getHovOverlay();
  const isDragging = activeOp !== null;

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#2d2d2d', display: 'flex', flexDirection: 'column' }}>

      {/* Hint bar */}
      <div style={{
        height: 28, flexShrink: 0, background: 'rgba(26,26,26,0.9)', borderBottom: '1px solid #3e3e3e',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 16, zIndex: 5,
      }}>
        <span style={{ fontSize: 11, color: '#777' }}>
          {selEl
            ? `<${selEl.tagName.toLowerCase()}${selEl.id ? '#' + selEl.id : ''}> — Drag to move • Handles to resize • ○ to rotate • Right-click for options`
            : 'Click any element to select it — Right-click for context menu'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setInteraction(m => m === 'select' ? 'interact' : 'select')}
            style={{
              background: 'none',
              border: '1px solid #444',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 10,
              color: interaction === 'select' ? '#e5a45a' : '#7ab8f5',
              padding: '1px 8px',
              fontFamily: 'inherit',
            }}
            title={interaction === 'select' ? 'Selection mode: clicks select elements' : 'Interact mode: clicks interact with page'}
          >
            {interaction === 'select' ? 'Select' : 'Interact'}
          </button>
        {selEl && (
          <button
            onClick={() => {
              selectedSelectorRef.current = null;
              setSelEl(null);
              setHovEl(null);
              setSelectedElement(null);
              setSelectedSelector(null);
            }}
            style={{
              background: 'none', border: '1px solid #444', borderRadius: 3,
              cursor: 'pointer', fontSize: 10, color: '#888', padding: '1px 8px', fontFamily: 'inherit',
            }}
          >
            Deselect (Esc)
          </button>
        )}
        </div>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        title="Visual Editor"
        onLoad={() => {
          eventsCleanupRef.current?.();
          const cleanup = attachEvents();
          eventsCleanupRef.current = typeof cleanup === 'function' ? cleanup : null;
        }}
        sandbox="allow-scripts allow-same-origin"
        style={{ flex: 1, border: 'none', background: '#fff' }}
      />

      {/* Hover outline — hidden while dragging */}
      {HR && !isDragging && (
        <div style={{
          position: 'fixed', zIndex: 50, pointerEvents: 'none',
          left: HR.left, top: HR.top, width: HR.width, height: HR.height,
          outline: '1px dashed rgba(229,164,90,0.35)',
        }} />
      )}

      {/* Selection overlay */}
      {OR && selEl && (
        <>
          {/* Move overlay */}
          <div
            style={{
              position: 'fixed', zIndex: 51,
              left: OR.left, top: OR.top, width: OR.width, height: OR.height,
              outline: '2px solid #e5a45a',
              cursor: isDragging && activeOp === 'move' ? 'move' : 'move',
            }}
            onMouseDown={e => startDrag('move', e)}
            onContextMenu={e => {
              e.preventDefault();
              showCtx(e, [
                { label: selEl.outerHTML.slice(0, 50) + '…', disabled: true },
                { separator: true, label: '' },
                { label: 'Copy HTML', icon: '📋', action: () => navigator.clipboard.writeText(selEl.outerHTML) },
                { label: 'Copy inline style', icon: '🎨', action: () => navigator.clipboard.writeText(selEl.getAttribute('style') || '') },
                { separator: true, label: '' },
                { label: 'Reset styles', icon: '↺', action: () => { selEl.removeAttribute('style'); setTick(t => t + 1); syncToSource(selEl); } },
                { label: 'Delete element', icon: '🗑️', danger: true, action: () => {
                    updateHtmlSourceForElement(selEl, (target) => {
                      target.remove();
                    });
                    selEl.remove();
                    selectedSelectorRef.current = null;
                    setSelEl(null);
                    setSelectedElement(null);
                    setSelectedSelector(null);
                  }
                },
                { separator: true, label: '' },
                { label: 'Deselect', icon: '✕', action: () => { selectedSelectorRef.current = null; setSelEl(null); setSelectedElement(null); } },
              ]);
            }}
          />

          {/* Tag label */}
          <div style={{
            position: 'fixed', zIndex: 55, pointerEvents: 'none',
            left: OR.left, top: Math.max(0, OR.top - 20),
            background: '#e5a45a', color: '#1a1a1a',
            fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
            padding: '1px 7px 2px', borderRadius: '3px 3px 0 0', whiteSpace: 'nowrap',
          }}>
            &lt;{selEl.tagName.toLowerCase()}{selEl.id ? '#' + selEl.id : ''}&gt;
            {' '}{Math.round(OR.width)}×{Math.round(OR.height)}
            {rotation !== 0 && ` ${rotation}°`}
          </div>

          {/* Resize handles — larger 12×12 for easier grabbing */}
          {HANDLES.map(h => {
            const pos = getHandlePos(h, OR);
            return (
              <div
                key={h}
                style={{
                  position: 'fixed', zIndex: 54,
                  left: pos.x - 6, top: pos.y - 6,
                  width: 12, height: 12,
                  background: '#1e1e1e', border: '2px solid #e5a45a', borderRadius: 2,
                  cursor: CURSOR[h],
                  boxSizing: 'border-box',
                }}
                onMouseDown={e => { e.stopPropagation(); startDrag(h, e); }}
              />
            );
          })}

          {/* Rotate handle */}
          <div
            title="Drag to rotate"
            style={{
              position: 'fixed', zIndex: 54,
              left: OR.left + OR.width / 2 - 8,
              top: OR.top - 38,
              width: 16, height: 16,
              background: '#1e1e1e', border: '2px solid #e5a45a',
              borderRadius: '50%', cursor: 'crosshair',
              boxSizing: 'border-box',
            }}
            onMouseDown={startRotate}
          />
          <div style={{
            position: 'fixed', zIndex: 52, pointerEvents: 'none',
            left: OR.left + OR.width / 2 - 0.5, top: Math.max(0, OR.top - 22),
            width: 1, height: 22, background: 'rgba(229,164,90,0.5)',
          }} />

          {/* Live dimensions during drag */}
          {isDragging && (
            <div style={{
              position: 'fixed', zIndex: 60, pointerEvents: 'none',
              left: OR.left + OR.width / 2, top: OR.top + OR.height + 8,
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.85)', color: '#ccc',
              fontSize: 11, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 3,
              whiteSpace: 'nowrap',
            }}>
              {activeOp === 'rotate'
                ? `${rotation}°`
                : `${Math.round(OR.width)} × ${Math.round(OR.height)}`}
            </div>
          )}
        </>
      )}

      {ctxEl}
    </div>
  );
};

export default VisualEditor;
