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
  'flex-wrap', 'background-size', 'background-image', 'background-position', 'background-repeat',
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

function toolbarBtn(variant: 'neutral' | 'danger' | 'primary' = 'neutral'): React.CSSProperties {
  const bg = variant === 'danger' ? '#3a1f1f' : variant === 'primary' ? '#3b3015' : '#2a2a2a';
  const border = variant === 'danger' ? '#a04040' : variant === 'primary' ? '#e5a45a' : '#3e3e3e';
  const color = variant === 'danger' ? '#ff8a8a' : variant === 'primary' ? '#e5a45a' : '#cfcfcf';
  return {
    background: bg,
    color,
    border: `1px solid ${border}`,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    padding: '4px 9px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    lineHeight: 1.2,
    transition: 'background 120ms, border-color 120ms',
  };
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
  const [srcDoc, setSrcDoc] = useState<string>('');
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animStyleRef = useRef(timelineAnimationStyle);
  const selectedSelectorRef = useRef<string | null>(null);
  const pendingSelectorRef = useRef<string | null>(null);
  const prevFilesRef = useRef(files);
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
    const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    files.filter(f => f.type === 'css').forEach(css => {
      const tag = `<style data-src="${css.id}">${css.content}</style>`;
      const refs = [css.name, ...(css.id !== css.name ? [css.id] : [])];
      let matched = false;
      for (const ref of refs) {
        const re = new RegExp(`<link[^>]*href=["']${escRe(ref)}["'][^>]*/?>`, 'gi');
        if (re.test(html)) { html = html.replace(re, tag); matched = true; break; }
      }
      if (!matched) {
        if (html.toLowerCase().includes('</head>')) { html = html.replace(/<\/head>/i, `${tag}\n</head>`); }
        else { html = `${tag}\n${html}`; }
      }
    });
    // Inject JS (so pages that rely on scripts don't render blank in Visual mode)
    files.filter(f => f.type === 'js').forEach(js => {
      const tag = `<script data-src="${js.id}">\n${js.content}\n<\/script>`;
      const refs = [js.name, ...(js.id !== js.name ? [js.id] : [])];
      let matched = false;
      for (const ref of refs) {
        const re = new RegExp(`<script[^>]*src=["']${escRe(ref)}["'][^>]*><\\/script>`, 'gi');
        if (re.test(html)) { html = html.replace(re, tag); matched = true; break; }
      }
      if (!matched) {
        if (html.toLowerCase().includes('</body>')) html = html.replace(/<\/body>/i, `${tag}\n</body>`);
        else html = `${html}\n${tag}`;
      }
    });
    files.filter(f => f.type === 'image' && f.url).forEach(img => {
      const refs = [img.name, ...(img.id !== img.name ? [img.id] : [])];
      for (const ref of refs) {
        html = html.replace(new RegExp(`(src|href)=["']${escRe(ref)}["']`, 'gi'), `$1="${img.url}"`);
      }
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

  const scheduleRebuild = useCallback(() => {
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    rebuildTimerRef.current = setTimeout(() => {
      setSrcDoc(buildSrcDoc());
    }, 80);
  }, [buildSrcDoc]);

  useEffect(() => {
    scheduleRebuild();
    return () => {
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    };
  }, [scheduleRebuild]);

  /* ── Reload iframe (smart: CSS-only → inject; HTML/JS → full reload) ── */
  useEffect(() => {
    const prev = prevFilesRef.current;
    const curr = files;
    prevFilesRef.current = curr;

    const doc = iframeRef.current?.contentDocument;
    const iframeLoaded = !!doc?.body;

    const prevHtml = prev.find(f => f.type === 'html')?.content ?? '';
    const currHtml = curr.find(f => f.type === 'html')?.content ?? '';
    const prevJs   = prev.find(f => f.type === 'js')?.content ?? '';
    const currJs   = curr.find(f => f.type === 'js')?.content ?? '';

    const htmlChanged = prevHtml !== currHtml;
    const jsChanged   = prevJs   !== currJs;

    if (!htmlChanged && !jsChanged && iframeLoaded && doc) {
      let allFound = true;
      curr.filter(f => f.type === 'css').forEach(css => {
        const prevCss = prev.find(f => f.id === css.id);
        if (prevCss?.content === css.content) return;
        const styleEl = (doc.querySelector(`style[data-src="${css.id}"]`) ?? doc.querySelector(`style[data-src="${css.name}"]`)) as HTMLStyleElement | null;
        if (styleEl) {
          styleEl.textContent = css.content;
        } else {
          allFound = false;
        }
      });
      if (allFound) return;
    }

    const selector = selectedSelectorRef.current;
    pendingSelectorRef.current = selector;
    scheduleRebuild();
    setHovEl(null);
    if (!selector) {
      setSelEl(null);
      setSelectedElement(null);
      setSelectedSelector(null);
    }
  }, [files, interaction, scheduleRebuild, setSelectedSelector, setSelectedElement]);

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
    const win = iframeRef.current?.contentWindow ?? doc.defaultView;
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

    const onIframeScrollOrResize = () => {
      // Recompute overlay positions when the iframe document scrolls/relayouts.
      setTick(t => t + 1);
    };

    doc.addEventListener('mousemove', onMove);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('contextmenu', onContextMenu, true);
    doc.addEventListener('scroll', onIframeScrollOrResize, true);
    win?.addEventListener('resize', onIframeScrollOrResize);
    return () => {
      doc.removeEventListener('mousemove', onMove);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('contextmenu', onContextMenu, true);
      doc.removeEventListener('scroll', onIframeScrollOrResize, true);
      win?.removeEventListener('resize', onIframeScrollOrResize);
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

      {/* Toolbar */}
      <div style={{
        height: 38, flexShrink: 0,
        background: 'linear-gradient(180deg,#252526 0%,#1f1f1f 100%)',
        borderBottom: '1px solid #3e3e3e',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, zIndex: 5,
        boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset',
      }}>
        {/* Mode toggle (segmented control) */}
        <div style={{
          display: 'inline-flex', background: '#1a1a1a', border: '1px solid #3a3a3a',
          borderRadius: 5, padding: 2, gap: 2,
        }}>
          {(['select', 'interact'] as const).map(m => {
            const active = interaction === m;
            return (
              <button
                key={m}
                onClick={() => setInteraction(m)}
                title={m === 'select' ? 'Selection mode — click to select elements' : 'Interact mode — clicks pass through to the page'}
                style={{
                  background: active ? (m === 'select' ? '#e5a45a' : '#3b82f6') : 'transparent',
                  color: active ? '#1a1a1a' : '#aaa',
                  border: 'none', borderRadius: 3,
                  fontSize: 11, fontWeight: 600,
                  padding: '4px 12px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'background 120ms, color 120ms',
                }}
              >
                <span style={{ fontSize: 12, lineHeight: 1 }}>{m === 'select' ? '⤢' : '☞'}</span>
                {m === 'select' ? 'Select' : 'Interact'}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: '#3a3a3a' }} />

        {/* Status / hint */}
        <span style={{ fontSize: 12, color: selEl ? '#ddd' : '#888', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selEl ? (
            <>
              <span style={{
                display: 'inline-block', background: '#e5a45a22', color: '#e5a45a',
                fontFamily: 'Menlo,Consolas,monospace', fontSize: 11,
                padding: '2px 7px', borderRadius: 3, marginRight: 8, fontWeight: 600,
              }}>
                &lt;{selEl.tagName.toLowerCase()}{selEl.id ? '#' + selEl.id : ''}&gt;
              </span>
              <span style={{ color: '#888' }}>
                Drag to move · handles to resize · ○ to rotate · right-click for options
              </span>
            </>
          ) : (
            <>
              <span style={{ color: '#999' }}>Click any element to select</span>
              <span style={{ color: '#555', margin: '0 8px' }}>·</span>
              <span style={{ color: '#666' }}>Right-click for context menu</span>
            </>
          )}
        </span>

        {/* Right-side actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {selEl && (
            <>
              <button
                onClick={() => {
                  selEl.removeAttribute('style');
                  setTick(t => t + 1);
                  syncToSource(selEl);
                }}
                title="Reset inline styles on the selected element"
                style={toolbarBtn('neutral')}
              >
                ↺ Reset
              </button>
              <button
                onClick={() => {
                  updateHtmlSourceForElement(selEl, (target) => target.remove());
                  selEl.remove();
                  selectedSelectorRef.current = null;
                  setSelEl(null);
                  setSelectedElement(null);
                  setSelectedSelector(null);
                }}
                title="Delete the selected element"
                style={toolbarBtn('danger')}
              >
                🗑 Delete
              </button>
              <button
                onClick={() => {
                  selectedSelectorRef.current = null;
                  setSelEl(null);
                  setHovEl(null);
                  setSelectedElement(null);
                  setSelectedSelector(null);
                }}
                title="Deselect (Esc)"
                style={toolbarBtn('neutral')}
              >
                ✕ Deselect
              </button>
            </>
          )}
        </div>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        title="Visual Editor"
        onLoad={() => {
          // Ensure a predictable default: selection mode works immediately after reloads.
          setInteraction('select');
          eventsCleanupRef.current?.();
          const cleanup = attachEvents();
          eventsCleanupRef.current = typeof cleanup === 'function' ? cleanup : null;
        }}
        srcDoc={srcDoc}
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
