import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useContextMenu } from './ContextMenu';
import LayoutBuilder, { LayoutConfig } from './LayoutBuilder';

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
  // Typography
  'color', 'font-size', 'font-weight', 'font-family', 'font-style',
  'text-align', 'text-decoration', 'text-decoration-color', 'text-decoration-style',
  'text-decoration-thickness', 'text-underline-offset', 'text-transform', 'text-indent',
  'text-shadow', 'line-height', 'letter-spacing', 'word-spacing', 'word-break',
  'overflow-wrap', 'white-space', 'writing-mode', 'direction', 'caret-color',
  // Background
  'background-color', 'background', 'background-image', 'background-size',
  'background-position', 'background-repeat', 'background-clip', 'background-blend-mode',
  // Layout / box
  'display', 'position', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'left', 'top', 'right', 'bottom', 'inset', 'z-index', 'overflow', 'overflow-x', 'overflow-y',
  'box-sizing', 'visibility', 'aspect-ratio', 'object-fit', 'object-position',
  // Border / outline
  'border', 'border-width', 'border-color', 'border-style', 'border-radius',
  'outline-width', 'outline-color', 'outline-style', 'outline-offset',
  // Shadow / opacity
  'box-shadow', 'opacity',
  // Flex / grid
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self', 'align-content',
  'gap', 'row-gap', 'column-gap', 'flex-grow', 'flex-shrink', 'flex-basis', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-column', 'grid-row',
  'place-items', 'place-content',
  // Transform / animation
  'transform', 'transform-origin', 'transform-style', 'perspective', 'perspective-origin',
  'backface-visibility', 'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay', 'animation', 'will-change',
  // Filter / blend / clip
  'filter', 'backdrop-filter', 'mix-blend-mode', 'isolation', 'clip-path',
  'mask-image', 'mask-size', 'mask-repeat',
  // Interaction / cursor
  'cursor', 'pointer-events', 'user-select', 'resize', 'touch-action', '-webkit-tap-highlight-color',
  // List / columns
  'list-style-type', 'list-style-position', 'list-style-image',
  'column-count', 'column-width', 'column-gap', 'column-rule-width', 'column-rule-style',
  'column-rule-color', 'column-span',
  // Scroll / snap
  'scroll-behavior', 'scroll-snap-type', 'scroll-snap-align', 'overscroll-behavior',
  'scroll-margin-top', 'scroll-padding-top',
  // Misc
  'accent-color', 'color-scheme', 'scrollbar-width', 'scrollbar-color',
  'content-visibility', 'contain',
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
  const inlineDecl = el.style;
  const styles: Record<string, string> = {};
  STYLE_PROPS.forEach(p => {
    const inlineVal = inlineDecl.getPropertyValue(p);
    styles[p] = inlineVal || cs?.getPropertyValue(p) || '';
  });
  styles['inline-style'] = el.getAttribute('style') || '';
  styles['selector'] = shortSelector(el);
  return styles;
}

/* ── Hover-style helpers ────────────────────────────────────── */
function parseStyleString(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!s) return out;
  s.split(';').forEach(pair => {
    const idx = pair.indexOf(':');
    if (idx < 0) return;
    const key = pair.slice(0, idx).trim().toLowerCase();
    const val = pair.slice(idx + 1).trim();
    if (key && val) out[key] = val;
  });
  return out;
}

function serializeStyleObject(o: Record<string, string>): string {
  return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ');
}

function collectHoverStyles(el: HTMLElement): Record<string, string> {
  const doc = el.ownerDocument;
  const styleEl = doc?.getElementById('__tl-hover-rules') as HTMLStyleElement | null;
  const cssText = styleEl?.textContent || '';
  const selector = elementSelector(el);
  const rules = parseHoverRules(cssText);
  return rules[selector] || {};
}

function parseHoverRules(cssText: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {};
  if (!cssText) return rules;

  const regex = /([^{]+)\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(cssText)) !== null) {
    const selector = match[1].trim().replace(':hover', '').trim();
    const styles = parseStyleString(match[2]);
    if (Object.keys(styles).length > 0) {
      rules[selector] = styles;
    }
  }
  return rules;
}

function serializeHoverRules(rules: Record<string, Record<string, string>>): string {
  return Object.entries(rules)
    .map(([selector, styles]) => `${selector}:hover { ${serializeStyleObject(styles)} }`)
    .join('\n');
}

const HOVER_PREVIEW_CLASS = '__tl-hover-preview';

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
    activeFileId,
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
  const lastRebuildTimeRef = useRef(0);
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
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(8);
  const [showLayoutBuilder, setShowLayoutBuilder] = useState(false);

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
    // Use the active file if it's HTML, otherwise find the first HTML file
    const activeFile = files.find(f => f.id === activeFileId && f.type === 'html');
    const htmlFile = activeFile || files.find(f => f.type === 'html');
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
    const now = Date.now();
    const timeSinceLastRebuild = now - lastRebuildTimeRef.current;
    const MIN_REBUILD_INTERVAL = 100; // Minimum 100ms between rebuilds

    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);

    // If recently rebuilt, wait longer before next rebuild
    const delay = timeSinceLastRebuild < MIN_REBUILD_INTERVAL ? MIN_REBUILD_INTERVAL : 50;

    rebuildTimerRef.current = setTimeout(() => {
      lastRebuildTimeRef.current = Date.now();
      setSrcDoc(buildSrcDoc());
    }, delay);
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
    const classList = Array.from(el.classList).filter(c => c !== HOVER_PREVIEW_CLASS);
    if (classList.length > 0) {
      const byClass = doc.querySelector(`.${classList.map(cssEscape).join('.')}`) as HTMLElement | null;
      if (byClass) return byClass;
    }
    // Fallback: try to find by tag name and position if no other identifier
    const allTags = doc.querySelectorAll(el.tagName.toLowerCase());
    if (allTags.length === 1) return allTags[0] as HTMLElement;
    return null;
  };

  const updateHtmlSourceForElement = useCallback((el: HTMLElement, applyChange: (target: HTMLElement) => void) => {
    // Use the active file if it's HTML, otherwise find the first HTML file
    const activeFile = files.find(f => f.id === activeFileId && f.type === 'html');
    const htmlFile = activeFile || files.find(f => f.type === 'html');
    if (!htmlFile) return;
    const selector = elementSelector(el);
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(htmlFile.content, 'text/html');
    const target = resolveSourceElement(parsedDoc, selector, el);
    if (!target) return;
    applyChange(target);
    const updated = serializeDoc(parsedDoc);
    if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
  }, [files, activeFileId, updateFileContent]);

  const syncToSource = useCallback((el: HTMLElement) => {
    const style = el.getAttribute('style') || '';
    const doc = el.ownerDocument;
    const styleEl = doc?.getElementById('__tl-hover-rules') as HTMLStyleElement | null;
    const hoverCss = styleEl?.textContent || '';

    updateHtmlSourceForElement(el, (target) => {
      if (style) target.setAttribute('style', style);
      else target.removeAttribute('style');

      // Sync hover style block to source
      let hoverStyleEl = target.ownerDocument.getElementById('__tl-hover-rules') as HTMLStyleElement | null;
      if (!hoverStyleEl && hoverCss) {
        hoverStyleEl = target.ownerDocument.createElement('style');
        hoverStyleEl.id = '__tl-hover-rules';
        target.ownerDocument.head.appendChild(hoverStyleEl);
      }

      if (hoverStyleEl) {
        if (hoverCss) {
          hoverStyleEl.textContent = hoverCss;
        } else {
          hoverStyleEl.remove();
        }
      }
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
      className: (el.className || '').replace(HOVER_PREVIEW_CLASS, '').trim(),
      styles: collectStyles(el, iframe?.contentWindow),
      hoverStyles: collectHoverStyles(el),
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
        if (value === '') el.style.removeProperty(property);
        else el.style.setProperty(property, value);
        setTick(t => t + 1);
        refreshSelectedSnapshot(el);
        syncToSource(el);
      },
      applyHoverStyle: (property, value) => {
        const el = getSelectedDomEl();
        if (!el) return;
        const key = property.toLowerCase();
        const doc = el.ownerDocument;
        if (!doc) return;

        // Get or create the hover style block
        let styleEl = doc.getElementById('__tl-hover-rules') as HTMLStyleElement | null;
        if (!styleEl) {
          styleEl = doc.createElement('style');
          styleEl.id = '__tl-hover-rules';
          doc.head.appendChild(styleEl);
        }

        // Generate selector for the element
        const selector = elementSelector(el);

        // Parse existing rules
        const rules = parseHoverRules(styleEl.textContent || '');
        const cur = rules[selector] || {};

        // Update the property
        if (value === '') delete cur[key];
        else cur[key] = value;

        // Rebuild the rules
        rules[selector] = cur;
        if (Object.keys(cur).length === 0) {
          delete rules[selector];
        }

        // Serialize back to CSS
        const cssText = serializeHoverRules(rules);
        styleEl.textContent = cssText;

        // Apply preview class so user sees the hover state immediately
        if (Object.keys(cur).length > 0 && useEditorStore.getState().hoverEditMode) {
          el.classList.add(HOVER_PREVIEW_CLASS);
        } else {
          el.classList.remove(HOVER_PREVIEW_CLASS);
        }

        setTick(t => t + 1);
        refreshSelectedSnapshot(el);
        syncToSource(el);
      },
      setHoverPreview: (on) => {
        const el = getSelectedDomEl();
        if (!el) return;
        const doc = el.ownerDocument;
        if (!doc) return;
        const styleEl = doc.getElementById('__tl-hover-rules') as HTMLStyleElement | null;
        const cssText = styleEl?.textContent || '';
        const selector = elementSelector(el);
        const rules = parseHoverRules(cssText);
        const hasHoverStyles = rules[selector] && Object.keys(rules[selector]).length > 0;

        if (on && hasHoverStyles) el.classList.add(HOVER_PREVIEW_CLASS);
        else el.classList.remove(HOVER_PREVIEW_CLASS);
        setTick(t => t + 1);
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

    // Remove hover-preview from previously-selected element to avoid stale styling
    const prevSel = selElRef.current;
    if (prevSel && prevSel !== el) prevSel.classList.remove(HOVER_PREVIEW_CLASS);

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

    // If hover edit mode is on AND element has hover styles → show preview
    const hoverEditMode = useEditorStore.getState().hoverEditMode;
    if (hoverEditMode && el.getAttribute('data-tl-hover-style')) {
      el.classList.add(HOVER_PREVIEW_CLASS);
    }

    const styles = collectStyles(el, iframe?.contentWindow);
    const hoverStyles = collectHoverStyles(el);

    setSelectedElement({
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      className: (el.className || '').replace(HOVER_PREVIEW_CLASS, '').trim(),
      styles,
      hoverStyles,
      innerHTML: el.innerHTML,
      textContent: el.textContent || '',
    });

    addConsoleEntry({
      type: 'info',
      message: `Selected <${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.replace(HOVER_PREVIEW_CLASS, '').trim().split(/\s+/).filter(Boolean).join('.') : ''}>`,
      timestamp: new Date(),
    });
  }, [setSelectedSelector, setSelectedElement, addConsoleEntry]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or contenteditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selElRef.current) {
        e.preventDefault();
        const el = selElRef.current;
        const parent = el.parentElement;
        if (parent && !SKIP_TAGS.has(parent.tagName.toLowerCase())) {
          el.remove();
          setSelEl(null);
          setSelectedElement(null);
          setSelectedSelector(null);
          syncContentToSource(parent);
          addConsoleEntry({
            type: 'info',
            message: `Deleted <${el.tagName.toLowerCase()}>`,
            timestamp: new Date(),
          });
        }
      }

      // Duplicate element (Ctrl+D / Cmd+D)
      if (modifier && e.key === 'd' && selElRef.current) {
        e.preventDefault();
        const el = selElRef.current;
        const clone = el.cloneNode(true) as HTMLElement;
        el.parentElement?.insertBefore(clone, el.nextSibling);
        selectElement(clone);
        syncContentToSource(el.parentElement!);
        addConsoleEntry({
          type: 'info',
          message: `Duplicated <${el.tagName.toLowerCase()}>`,
          timestamp: new Date(),
        });
      }

      // Copy element (Ctrl+C / Cmd+C)
      if (modifier && e.key === 'c' && selElRef.current) {
        e.preventDefault();
        const el = selElRef.current;
        navigator.clipboard.writeText(el.outerHTML);
        addConsoleEntry({
          type: 'info',
          message: `Copied <${el.tagName.toLowerCase()}> HTML`,
          timestamp: new Date(),
        });
      }

      // Paste element (Ctrl+V / Cmd+V)
      if (modifier && e.key === 'v') {
        // Let the default paste behavior handle it in contenteditable areas
        // For visual editor, we could implement custom paste logic
      }

      // Deselect (Escape)
      if (e.key === 'Escape' && selElRef.current) {
        e.preventDefault();
        setSelEl(null);
        setSelectedElement(null);
        setSelectedSelector(null);
        addConsoleEntry({
          type: 'info',
          message: 'Deselected element',
          timestamp: new Date(),
        });
      }

      // Move selected element with arrow keys
      if (selElRef.current && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const el = selElRef.current;
        const step = e.shiftKey ? 10 : 1;
        const currentLeft = parseFloat(el.style.left) || 0;
        const currentTop = parseFloat(el.style.top) || 0;

        switch (e.key) {
          case 'ArrowUp':
            el.style.top = (currentTop - step) + 'px';
            break;
          case 'ArrowDown':
            el.style.top = (currentTop + step) + 'px';
            break;
          case 'ArrowLeft':
            el.style.left = (currentLeft - step) + 'px';
            break;
          case 'ArrowRight':
            el.style.left = (currentLeft + step) + 'px';
            break;
        }
        setTick((t: number) => t + 1);
        syncToSource(el);
      }

      // Toggle interaction mode (Ctrl+I / Cmd+I)
      if (modifier && e.key === 'i') {
        e.preventDefault();
        setInteraction((prev: 'select' | 'interact') => prev === 'select' ? 'interact' : 'select');
        addConsoleEntry({
          type: 'info',
          message: `Switched to ${interaction === 'select' ? 'interact' : 'select'} mode`,
          timestamp: new Date(),
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedElement, setSelectedSelector, syncToSource, syncContentToSource, selectElement, addConsoleEntry, interaction]);

  /* ── Helper: insert component from drag-drop ── */
  const insertComponent = useCallback((component: any) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Create a temporary div to parse the HTML
    const tempDiv = doc.createElement('div');
    tempDiv.innerHTML = component.html;
    const newElement = tempDiv.firstElementChild as HTMLElement;
    if (!newElement) return;

    // Find insertion point (body or selected element)
    const selectedEl = getSelectedDomEl();
    const insertionPoint = selectedEl || doc.body;

    // Insert the element
    insertionPoint.appendChild(newElement);

    // Inject component CSS if present
    if (component.css) {
      let compStyleEl = doc.getElementById('__component-styles') as HTMLStyleElement | null;
      if (!compStyleEl) {
        compStyleEl = doc.createElement('style');
        compStyleEl.id = '__component-styles';
        doc.head?.appendChild(compStyleEl);
      }
      compStyleEl.textContent += '\n' + component.css;
    }

    // Select the new element
    selectElement(newElement);

    // Sync to source
    syncContentToSource(insertionPoint);

    setTick(t => t + 1);
  }, [getSelectedDomEl, selectElement, syncContentToSource]);

  /* ── Apply layout configuration to selected element ── */
  const applyLayout = useCallback((config: LayoutConfig) => {
    const el = getSelectedDomEl();
    if (!el) return;

    if (config.type === 'grid' && config.grid) {
      el.style.display = 'grid';
      el.style.gridTemplateColumns = config.grid.columns;
      el.style.gridTemplateRows = config.grid.rows;
      el.style.gap = config.grid.gap;
    } else if (config.type === 'flex' && config.flex) {
      el.style.display = 'flex';
      el.style.flexDirection = config.flex.direction;
      el.style.flexWrap = config.flex.wrap;
      el.style.justifyContent = config.flex.justifyContent;
      el.style.alignItems = config.flex.alignItems;
      el.style.gap = config.flex.gap;
    }

    setTick(t => t + 1);
    refreshSelectedSnapshot(el);
    syncToSource(el);
  }, [getSelectedDomEl, refreshSelectedSnapshot, syncToSource]);

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
        // Allow clicks within currently editing element to bubble through.
        const tgt = e.target as HTMLElement;
        if (tgt && tgt.closest('[data-tl-inline-edit="1"]')) return;
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

    const onDblClick = (e: MouseEvent) => {
      if (interaction !== 'select') return;
      const target = e.target as HTMLElement;
      if (!target || SKIP_TAGS.has(target.tagName.toLowerCase())) return;
      // Allow inline edit on any element that has *some* visible text. For
      // containers with mixed children, contenteditable still works fine —
      // the user can edit the text portions in place.
      const hasText = (target.textContent || '').trim().length > 0;
      if (!hasText) return;
      e.preventDefault(); e.stopPropagation();

      target.setAttribute('data-tl-inline-edit', '1');
      target.setAttribute('contenteditable', 'true');
      const savedOutline = target.style.outline;
      const savedBoxShadow = target.style.boxShadow;
      target.style.outline = '2px dashed #e5a45a';
      target.style.outlineOffset = '2px';
      target.style.cursor = 'text';

      // Focus and select text.
      target.focus();
      try {
        const sel = doc.getSelection();
        const range = doc.createRange();
        range.selectNodeContents(target);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {}

      const finish = (commit: boolean) => {
        target.removeAttribute('contenteditable');
        target.removeAttribute('data-tl-inline-edit');
        target.style.outline = savedOutline;
        target.style.cursor = '';
        target.removeEventListener('blur', onBlur);
        target.removeEventListener('keydown', onKey);
        if (commit) {
          syncContentToSource(target);
          refreshSelectedSnapshot(target);
        }
        setTick(t => t + 1);
      };
      const onBlur = () => finish(true);
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          target.style.boxShadow = savedBoxShadow;
          finish(false);
          target.blur();
        } else if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault();
          finish(true);
          target.blur();
        }
      };
      target.addEventListener('blur', onBlur);
      target.addEventListener('keydown', onKey);
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

      const quickApply = (prop: string, value: string) => {
        target.style.setProperty(prop, value);
        setTick(t => t + 1);
        syncToSource(target);
      };
      const targetView = target.ownerDocument?.defaultView ?? window;
      const toggleStyle = (prop: string, onVal: string, offVal: string) => {
        const cur = target.style.getPropertyValue(prop) || targetView.getComputedStyle(target).getPropertyValue(prop);
        quickApply(prop, cur && cur.trim() === onVal ? offVal : onVal);
      };
      const bumpFontSize = (delta: number) => {
        const cs = targetView.getComputedStyle(target);
        const cur = parseFloat(cs.fontSize) || 16;
        quickApply('font-size', Math.max(6, cur + delta) + 'px');
      };

      const COLORS: { name: string; value: string }[] = [
        { name: 'Black', value: '#000000' }, { name: 'White', value: '#ffffff' },
        { name: 'Red', value: '#ef4444' }, { name: 'Orange', value: '#f97316' },
        { name: 'Yellow', value: '#facc15' }, { name: 'Green', value: '#22c55e' },
        { name: 'Teal', value: '#14b8a6' }, { name: 'Blue', value: '#3b82f6' },
        { name: 'Indigo', value: '#6366f1' }, { name: 'Purple', value: '#a855f7' },
        { name: 'Pink', value: '#ec4899' }, { name: 'Gray', value: '#6b7280' },
        { name: 'Slate', value: '#1e293b' }, { name: 'Transparent', value: 'transparent' },
      ];
      const GRADIENTS: { name: string; value: string }[] = [
        { name: 'Sunset',  value: 'linear-gradient(135deg, #ff7a18, #af002d)' },
        { name: 'Ocean',   value: 'linear-gradient(135deg, #00c6ff, #0072ff)' },
        { name: 'Purple',  value: 'linear-gradient(135deg, #8e2de2, #4a00e0)' },
        { name: 'Mint',    value: 'linear-gradient(135deg, #00f5a0, #00d9f5)' },
        { name: 'Fire',    value: 'radial-gradient(circle, #f9d423, #ff4e50)' },
        { name: 'Dark',    value: 'linear-gradient(135deg, #232526, #414345)' },
        { name: 'Peach',   value: 'linear-gradient(135deg, #ffecd2, #fcb69f)' },
        { name: 'Aqua',    value: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
      ];
      const FONTS = ['sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact'];
      const SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px', '48px', '64px', '80px', '96px'];
      const WEIGHTS = ['100', '300', '400', '500', '600', '700', '800', '900'];
      const ALIGNS = ['left', 'center', 'right', 'justify'];

      showCtx(fakeEvent, [
        { label: `Select <${target.tagName.toLowerCase()}>`, icon: '🖱️', action: () => selectElement(target) },
        { label: 'Edit text inline', icon: '✏️', action: () => {
            // Programmatic dblclick to trigger inline edit
            const ev = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
            target.dispatchEvent(ev);
          },
        },
        { separator: true, label: '' },

        { label: 'Quick: Color', icon: '🎨', submenu: [
            ...COLORS.map(c => ({ label: c.name, swatch: c.value, action: () => quickApply('color', c.value) })),
            { separator: true, label: '' },
            { label: 'Text gradient', icon: '🌈', submenu: GRADIENTS.map(g => ({
                label: g.name, swatch: g.value, action: () => {
                  target.style.backgroundImage = g.value;
                  target.style.setProperty('-webkit-background-clip', 'text');
                  target.style.backgroundClip = 'text';
                  target.style.setProperty('-webkit-text-fill-color', 'transparent');
                  target.style.color = 'transparent';
                  setTick(t => t + 1);
                  syncToSource(target);
                },
              })),
            },
          ],
        },
        { label: 'Quick: Background', icon: '🖌️', submenu: [
            ...COLORS.map(c => ({ label: c.name, swatch: c.value, action: () => { quickApply('background-color', c.value); quickApply('background-image', 'none'); } })),
            { separator: true, label: '' },
            ...GRADIENTS.map(g => ({ label: g.name, swatch: g.value, action: () => quickApply('background-image', g.value) })),
          ],
        },
        { label: 'Quick: Font', icon: '🔤', submenu: FONTS.map(f => ({
            label: f, action: () => quickApply('font-family', f),
          })),
        },
        { label: 'Quick: Size', icon: '📏', submenu: [
            { label: '+ Larger',  icon: '➕', action: () => bumpFontSize(2) },
            { label: '− Smaller', icon: '➖', action: () => bumpFontSize(-2) },
            { separator: true, label: '' },
            ...SIZES.map(s => ({ label: s, action: () => quickApply('font-size', s) })),
          ],
        },
        { label: 'Quick: Weight', icon: '🅱️', submenu: WEIGHTS.map(w => ({
            label: w, action: () => quickApply('font-weight', w),
          })),
        },
        { label: 'Quick: Align', icon: '☰', submenu: ALIGNS.map(a => ({
            label: a, action: () => quickApply('text-align', a),
          })),
        },
        { separator: true, label: '' },
        { label: 'Toggle Bold',      icon: 'B', shortcut: '⌘B', action: () => toggleStyle('font-weight', '700', '400') },
        { label: 'Toggle Italic',    icon: 'I', shortcut: '⌘I', action: () => toggleStyle('font-style', 'italic', 'normal') },
        { label: 'Toggle Underline', icon: 'U', shortcut: '⌘U', action: () => toggleStyle('text-decoration', 'underline', 'none') },
        { separator: true, label: '' },
        { label: 'Copy element HTML', icon: '📋', action: () => { navigator.clipboard.writeText(target.outerHTML); } },
        { label: 'Copy styles',       icon: '🧩', action: () => { navigator.clipboard.writeText(target.getAttribute('style') || ''); } },
        { separator: true, label: '' },
        { label: 'Reset styles', icon: '↺', danger: true, action: () => { target.removeAttribute('style'); setTick(t => t + 1); syncToSource(target); } },
        { label: 'Hide element', icon: '👁️', action: () => { target.style.display = 'none'; setTick(t => t + 1); syncToSource(target); } },
        { separator: true, label: '' },
        { label: 'Select parent', icon: '⬆️', action: () => {
            const parent = target.parentElement;
            if (parent && !SKIP_TAGS.has(parent.tagName.toLowerCase())) selectElement(parent);
          },
        },
      ]);
    };

    const onIframeScrollOrResize = () => {
      // Recompute overlay positions when the iframe document scrolls/relayouts.
      setTick(t => t + 1);
    };

    doc.addEventListener('mousemove', onMove);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('dblclick', onDblClick, true);
    doc.addEventListener('contextmenu', onContextMenu, true);
    doc.addEventListener('scroll', onIframeScrollOrResize, true);
    win?.addEventListener('resize', onIframeScrollOrResize);
    return () => {
      doc.removeEventListener('mousemove', onMove);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('dblclick', onDblClick, true);
      doc.removeEventListener('contextmenu', onContextMenu, true);
      doc.removeEventListener('scroll', onIframeScrollOrResize, true);
      win?.removeEventListener('resize', onIframeScrollOrResize);
    };
  }, [injectAnimStyle, interaction, selectElement, setSelectedSelector, setSelectedElement, showCtx, syncToSource, syncContentToSource, refreshSelectedSnapshot]);

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
      let dx = e.clientX - d.startX;
      let dy = e.clientY - d.startY;
      const { el, type, initLeft, initTop, initW, initH } = d;

      // Apply snap-to-grid if enabled
      if (snapToGrid) {
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
      }

      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        if (type === 'move') {
          el.style.position = el.style.position || 'relative';
          el.style.left = (initLeft + dx) + 'px';
          el.style.top = (initTop + dy) + 'px';
        } else if (type === 'se') {
          // Shift key locks aspect ratio
          if (e.shiftKey) {
            const aspect = initW / initH;
            const newW = Math.max(20, initW + dx);
            const newH = newW / aspect;
            el.style.width = newW + 'px';
            el.style.height = newH + 'px';
          } else {
            el.style.width = Math.max(20, initW + dx) + 'px';
            el.style.height = Math.max(20, initH + dy) + 'px';
          }
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
      });
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
  }, [syncToSource, snapToGrid, gridSize]);

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

      {/* Hint bar with breadcrumb */}
      <div style={{
        height: 28, flexShrink: 0, background: 'rgba(26,26,26,0.9)', borderBottom: '1px solid #3e3e3e',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 16, zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
          {selEl ? (
            <>
              <span style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>
                {(() => {
                  const path: HTMLElement[] = [];
                  let current: HTMLElement | null = selEl;
                  while (current && current.tagName.toLowerCase() !== 'body') {
                    path.unshift(current);
                    current = current.parentElement;
                  }
                  return path.map((el, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span style={{ color: '#555' }}> › </span>}
                      <span
                        style={{
                          color: i === path.length - 1 ? '#e5a45a' : '#888',
                          cursor: 'pointer',
                          fontSize: 10,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectElement(el);
                        }}
                      >
                        {el.tagName.toLowerCase()}{el.id ? '#' + el.id : ''}
                      </span>
                    </React.Fragment>
                  ));
                })()}
              </span>
              <span style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>
                — Drag • Resize • Rotate • Double-click to edit
              </span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: '#777' }}>
              Click any element to select • Double-click text to edit inline • Right-click for menu
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setShowAlignmentGuides(!showAlignmentGuides)}
            style={{
              background: showAlignmentGuides ? 'rgba(229,164,90,0.15)' : 'none',
              border: showAlignmentGuides ? 'rgba(229,164,90,0.4)' : '#444',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 10,
              color: showAlignmentGuides ? '#e5a45a' : '#888',
              padding: '1px 8px',
              fontFamily: 'inherit',
            }}
            title="Toggle alignment guides"
          >
            Guides
          </button>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            style={{
              background: snapToGrid ? 'rgba(229,164,90,0.15)' : 'none',
              border: snapToGrid ? 'rgba(229,164,90,0.4)' : '#444',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 10,
              color: snapToGrid ? '#e5a45a' : '#888',
              padding: '1px 8px',
              fontFamily: 'inherit',
            }}
            title="Toggle snap-to-grid"
          >
            Grid
          </button>
          <button
            onClick={() => setShowLayoutBuilder(!showLayoutBuilder)}
            style={{
              background: showLayoutBuilder ? 'rgba(229,164,90,0.15)' : 'none',
              border: showLayoutBuilder ? 'rgba(229,164,90,0.4)' : '#444',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 10,
              color: showLayoutBuilder ? '#e5a45a' : '#888',
              padding: '1px 8px',
              fontFamily: 'inherit',
            }}
            title="Open layout builder"
          >
            Layout
          </button>
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
          // Ensure a predictable default: selection mode works immediately after reloads.
          setInteraction('select');
          eventsCleanupRef.current?.();
          const cleanup = attachEvents();
          eventsCleanupRef.current = typeof cleanup === 'function' ? cleanup : null;
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const componentData = e.dataTransfer.getData('component');
          if (componentData) {
            try {
              const component = JSON.parse(componentData);
              insertComponent(component);
            } catch (err) {
              console.error('Failed to parse component data:', err);
            }
          }
        }}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin"
        style={{ flex: 1, border: 'none', background: '#fff' }}
      />

      {/* Hover outline — hidden while dragging */}
      {HR && !isDragging && (
        <>
          <div style={{
            position: 'fixed', zIndex: 50, pointerEvents: 'none',
            left: HR.left, top: HR.top, width: HR.width, height: HR.height,
            outline: '2px dashed rgba(229,164,90,0.5)',
            transition: 'outline 0.15s ease',
          }} />
          {/* Hover tag label */}
          <div style={{
            position: 'fixed', zIndex: 55, pointerEvents: 'none',
            left: HR.left, top: Math.max(0, HR.top - 20),
            background: 'rgba(229,164,90,0.9)', color: '#1a1a1a',
            fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
            padding: '2px 6px', borderRadius: '3px', whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            &lt;{hovEl.tagName.toLowerCase()}{hovEl.id ? '#' + hovEl.id : ''}{hovEl.className ? '.' + hovEl.className.split(' ').slice(0, 2).join('.') : ''}&gt;
          </div>
        </>
      )}

      {/* Selection overlay */}
      {OR && selEl && (
        <>
          {/* Move overlay with glow effect */}
          <div
            style={{
              position: 'fixed', zIndex: 51,
              left: OR.left, top: OR.top, width: OR.width, height: OR.height,
              outline: '2px solid #e5a45a',
              outlineOffset: '0px',
              boxShadow: '0 0 0 1px rgba(229,164,90,0.3), 0 0 8px rgba(229,164,90,0.2)',
              cursor: isDragging && activeOp === 'move' ? 'move' : 'move',
              transition: 'box-shadow 0.2s ease, outline 0.2s ease',
            }}
            onMouseDown={e => startDrag('move', e)}
            onContextMenu={e => {
              e.preventDefault();
              showCtx(e, [
                { label: selEl.outerHTML.slice(0, 50) + '…', disabled: true },
                { separator: true, label: '' },
                { label: 'Duplicate', icon: '📋', action: () => {
                    const clone = selEl.cloneNode(true) as HTMLElement;
                    selEl.parentNode?.insertBefore(clone, selEl.nextSibling);
                    syncToSource(selEl);
                    selectElement(clone);
                  }
                },
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

          {/* Enhanced tag label with class names */}
          <div style={{
            position: 'fixed', zIndex: 55, pointerEvents: 'none',
            left: OR.left, top: Math.max(0, OR.top - 22),
            background: 'linear-gradient(135deg, #e5a45a 0%, #d4943e 100%)',
            color: '#1a1a1a',
            fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
            padding: '3px 8px', borderRadius: '4px 4px 0 0', whiteSpace: 'nowrap',
            boxShadow: '0 2px 12px rgba(229,164,90,0.4)',
          }}>
            &lt;{selEl.tagName.toLowerCase()}{selEl.id ? '#' + selEl.id : ''}{selEl.className ? '.' + selEl.className.split(' ').slice(0, 2).join('.') : ''}&gt;
            {rotation !== 0 ? (
              <React.Fragment>
                <span style={{ opacity: 0.7, marginLeft: 6, fontSize: 9 }}>
                  {Math.round(OR.width)}×{Math.round(OR.height)}
                </span>
                <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 9 }}>{rotation}°</span>
              </React.Fragment>
            ) : (
              <span style={{ opacity: 0.7, marginLeft: 6, fontSize: 9 }}>
                {Math.round(OR.width)}×{Math.round(OR.height)}
              </span>
            )}
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

      {/* Layout Builder */}
      {showLayoutBuilder && (
        <LayoutBuilder
          onApplyLayout={applyLayout}
          onClose={() => setShowLayoutBuilder(false)}
        />
      )}
    </div>
  );
};

export default VisualEditor;
