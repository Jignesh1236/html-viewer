import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useContextMenu } from './ContextMenu';
import LayersPanel from './LayersPanel';
import ElementsPalette, { PaletteItem } from './ElementsPalette';
import {
  FiBox, FiGrid, FiLayers, FiMaximize2, FiMonitor,
  FiMousePointer, FiSmartphone, FiTablet, FiX,
} from 'react-icons/fi';
import { buildStaticPreviewHtml } from '../utils/previewEngine';
import { detectProjectType, projectTypeLabel } from '../utils/fileTypes';

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
const GRID = 8;

/** Stable node handle for source sync (avoids ambiguous nth-of-type selectors). */
const VI_ATTR = 'data-vi-id';

const VE = {
  bg: '#1e1e1e',
  surface: '#252526',
  border: '#3a3a3a',
  borderHi: '#3e3e3e',
  accent: '#e5a45a',
  accentBg: 'rgba(229,164,90,0.15)',
  accentBrd: 'rgba(229,164,90,0.45)',
  blue: '#7ab8f5',
  blueBg: 'rgba(100,160,255,0.15)',
  blueBrd: 'rgba(100,160,255,0.4)',
  text: '#ccc',
  dim: '#888',
  muted: '#666',
  canvas: '#2a2a2a',
} as const;

function newViId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `vi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

function cssEscapeAttr(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function ensureViNodeId(el: HTMLElement) {
  if (!el.getAttribute(VI_ATTR)) el.setAttribute(VI_ATTR, newViId());
}

/** After cloneNode(true), give the whole subtree fresh ids so selectors stay unique. */
function regenerateViIdsSubtree(root: HTMLElement) {
  const all = [root, ...Array.from(root.querySelectorAll('*'))] as HTMLElement[];
  for (const e of all) e.setAttribute(VI_ATTR, newViId());
}

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
  '-webkit-background-clip', '-webkit-text-fill-color', 'background-clip', 'border-image-source', 'border-image-slice',
];

function snap(v: number) { return Math.round(v / GRID) * GRID; }

function cssEscape(value: string) {
  return value.replace(/["\\#.:,[\]>+~*^$|= !]/g, '\\$&');
}

function elementSelector(el: HTMLElement) {
  if (el.id) return `#${cssEscape(el.id)}`;
  const vi = el.getAttribute(VI_ATTR);
  if (vi) return `[${VI_ATTR}="${cssEscapeAttr(vi)}"]`;
  const parts: string[] = [];
  let node: HTMLElement | null = el;
  while (node && node.tagName.toLowerCase() !== 'body') {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    const tag = node.tagName.toLowerCase();
    const nodeTagName = node.tagName;
    const siblings = Array.from(parent.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .filter(child => child.tagName === nodeTagName);
    const index = siblings.indexOf(node) + 1;
    parts.unshift(`${tag}:nth-of-type(${Math.max(1, index)})`);
    node = parent;
  }
  if (parts.length === 0) return 'body';
  return `body > ${parts.join(' > ')}`;
}

function shortSelector(el: HTMLElement) {
  if (el.id) return `#${cssEscape(el.id)}`;
  const vi = el.getAttribute(VI_ATTR);
  if (vi) return `[${VI_ATTR}="${cssEscapeAttr(vi)}"]`;
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

function buildBreadcrumb(el: HTMLElement): HTMLElement[] {
  const path: HTMLElement[] = [];
  let node: HTMLElement | null = el;
  while (node && node.tagName) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'html') break;
    path.unshift(node);
    node = node.parentElement;
  }
  return path;
}

function breadcrumbLabel(el: HTMLElement) {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const cls = Array.from(el.classList).filter(Boolean);
  if (cls.length) return `${tag}.${cls[0]}`;
  return tag;
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

type PreviewSize = 'full' | 'desktop' | 'tablet' | 'mobile';
const PREVIEW_WIDTHS: Record<PreviewSize, number | undefined> = {
  full: undefined, desktop: 1280, tablet: 768, mobile: 375,
};
const DRAG_THRESHOLD_PX = 3;

function findSelectableFallback(start: HTMLElement | null): HTMLElement | null {
  let node = start;
  while (node) {
    if (!SKIP_TAGS.has(node.tagName.toLowerCase())) return node;
    node = node.parentElement;
  }
  return null;
}

const VisualEditor: React.FC = () => {
  const {
    files, updateFileContent, setSelectedElement, addConsoleEntry,
    timelineAnimationStyle, setSelectedSelector, setVisualBridge, selectedSelector,
    showNotification,
  } = useEditorStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [srcDoc, setSrcDoc] = useState<string>('');
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animStyleRef = useRef(timelineAnimationStyle);
  const selectedSelectorRef = useRef<string | null>(null);
  const selectedViIdRef = useRef<string | null>(null);
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

  // Multi-select
  const [multiSel, setMultiSel] = useState<Set<HTMLElement>>(new Set());
  const multiSelRef = useRef<Set<HTMLElement>>(new Set());

  // Responsive preview
  const [previewSize, setPreviewSize] = useState<PreviewSize>('full');

  // Panels visibility
  const [showLayers, setShowLayers] = useState(true);
  const [showPalette, setShowPalette] = useState(true);

  // Drag from palette
  const [paletteDropping, setPaletteDropping] = useState(false);
  const [isDraggingFromPalette, setIsDraggingFromPalette] = useState(false);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; html: string; label: string } | null>(null);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number } | null>(null);
  const pendingInsertRef = useRef<string | null>(null);

  // iframe doc ref for layers
  const [iframeDoc, setIframeDoc] = useState<Document | null>(null);

  useEffect(() => { iframeOffRef.current = iframeOff; }, [iframeOff]);
  useEffect(() => { hovElRef.current = hovEl; }, [hovEl]);
  useEffect(() => { selElRef.current = selEl; }, [selEl]);
  useEffect(() => { multiSelRef.current = multiSel; }, [multiSel]);
  useEffect(() => {
    return () => { eventsCleanupRef.current?.(); eventsCleanupRef.current = null; };
  }, []);

  /* ── Build srcdoc ── */
  const buildSrcDoc = useCallback(() => {
    const editorCss = `<style>
*{cursor:${interaction === 'select' ? 'crosshair' : 'default'}!important;user-select:${interaction === 'select' ? 'none' : 'auto'}!important}
</style>`;
    return buildStaticPreviewHtml(files, {
      editorCss,
      includeBridge: false,
      fallbackHtml: '<html><body style="padding:40px;font-family:sans-serif;color:#999">No HTML file</body></html>',
    });
  }, [files, interaction]);

  const scheduleRebuild = useCallback(() => {
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    rebuildTimerRef.current = setTimeout(() => { setSrcDoc(buildSrcDoc()); }, 80);
  }, [buildSrcDoc]);

  useEffect(() => {
    scheduleRebuild();
    return () => { if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current); };
  }, [scheduleRebuild]);

  useEffect(() => {
    const prev = prevFilesRef.current;
    const curr = files;
    prevFilesRef.current = curr;
    const doc = iframeRef.current?.contentDocument;
    const iframeLoaded = !!doc?.body;
    const prevHtml = prev.find(f => f.type === 'html')?.content ?? '';
    const currHtml = curr.find(f => f.type === 'html')?.content ?? '';
    const prevJs = prev.find(f => f.type === 'js')?.content ?? '';
    const currJs = curr.find(f => f.type === 'js')?.content ?? '';
    const htmlChanged = prevHtml !== currHtml;
    const jsChanged = prevJs !== currJs;
    if (!htmlChanged && !jsChanged && iframeLoaded && doc) {
      let allFound = true;
      curr.filter(f => f.type === 'css').forEach(css => {
        const prevCss = prev.find(f => f.id === css.id);
        if (prevCss?.content === css.content) return;
        const styleEl = (doc.querySelector(`style[data-src="${css.id}"]`) ?? doc.querySelector(`style[data-src="${css.name}"]`)) as HTMLStyleElement | null;
        if (styleEl) { styleEl.textContent = css.content; } else { allFound = false; }
      });
      if (allFound) return;
    }
    const selector = selectedSelectorRef.current;
    pendingSelectorRef.current = selector;
    scheduleRebuild();
    setHovEl(null);
    if (!selector) { selectedViIdRef.current = null; setSelEl(null); setSelectedElement(null); setSelectedSelector(null); }
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
    const vi = el.getAttribute(VI_ATTR);
    if (vi) {
      const byVi = doc.querySelector(`[${VI_ATTR}="${cssEscapeAttr(vi)}"]`) as HTMLElement | null;
      if (byVi) return byVi;
    }
    const bySelector = doc.querySelector(selector) as HTMLElement | null;
    if (bySelector) return bySelector;
    if (el.id) { const byId = doc.getElementById(el.id) as HTMLElement | null; if (byId) return byId; }
    const classList = Array.from(el.classList).filter(Boolean);
    if (classList.length > 0) {
      const byClass = doc.querySelector(`.${classList.map(cssEscape).join('.')}`) as HTMLElement | null;
      if (byClass) return byClass;
    }
    return null;
  };

  const updateHtmlWithMutation = useCallback((mutate: (parsedDoc: Document, htmlFileId: string) => boolean | void) => {
    const htmlFile = files.find(f => f.type === 'html');
    if (!htmlFile) return false;
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(htmlFile.content, 'text/html');
    const changed = mutate(parsedDoc, htmlFile.id);
    if (changed === false) return false;
    const updated = serializeDoc(parsedDoc);
    if (updated === htmlFile.content) return false;
    updateFileContent(htmlFile.id, updated);
    return true;
  }, [files, updateFileContent]);

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
    updateHtmlSourceForElement(el, (target) => { target.innerHTML = el.innerHTML; });
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

  const commitElementMutation = useCallback((el: HTMLElement | null, mutate: (target: HTMLElement) => void, toast?: string) => {
    if (!el?.isConnected) return;
    mutate(el);
    setTick(t => t + 1);
    refreshSelectedSnapshot(el);
    syncToSource(el);
    if (toast) showNotification(toast);
  }, [refreshSelectedSnapshot, showNotification, syncToSource]);

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

  useEffect(() => { animStyleRef.current = timelineAnimationStyle; }, [timelineAnimationStyle]);

  useEffect(() => {
    setVisualBridge({
      applyStyle: (property, value) => {
        const el = getSelectedDomEl();
        if (!el) return;
        el.style.setProperty(property, value);
        // Apply same style to every multi-selected element
        for (const mel of multiSelRef.current) {
          if (mel.isConnected && mel !== el) {
            mel.style.setProperty(property, value);
            syncToSource(mel);
          }
        }
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

  const injectAnimStyle = useCallback((doc: Document, css: string) => {
    let styleEl = doc.getElementById('__timeline-anim-style') as HTMLStyleElement | null;
    if (!styleEl) { styleEl = doc.createElement('style'); styleEl.id = '__timeline-anim-style'; doc.head?.appendChild(styleEl); }
    styleEl.textContent = css;
  }, []);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    injectAnimStyle(doc, timelineAnimationStyle);
  }, [timelineAnimationStyle, tick, injectAnimStyle]);

  /* ── Select element ── */
  const selectElement = useCallback((el: HTMLElement, addToMulti = false) => {
    if (addToMulti) {
      setMultiSel(prev => {
        const next = new Set(prev);
        if (next.has(el)) { next.delete(el); } else { next.add(el); }
        return next;
      });
    } else {
      setMultiSel(new Set());
    }

    const selector = elementSelector(el);
    selectedViIdRef.current = el.getAttribute(VI_ATTR);
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
      id: el.id, className: el.className || '',
      styles, innerHTML: el.innerHTML, textContent: el.textContent || '',
    });

    addConsoleEntry({
      type: 'info',
      message: `Selected <${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''}>`,
      timestamp: new Date(),
    });
  }, [setSelectedSelector, setSelectedElement, addConsoleEntry]);

  /* ── Duplicate element ── */
  const duplicateElement = useCallback((el: HTMLElement) => {
    const selector = elementSelector(el);
    const changed = updateHtmlWithMutation((parsedDoc) => {
      const target = resolveSourceElement(parsedDoc, selector, el);
      if (!target) return false;
      const clone = target.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      regenerateViIdsSubtree(clone);
      target.after(clone);
      return true;
    });
    if (!changed) return;
    // Also clone in live DOM
    const liveClone = el.cloneNode(true) as HTMLElement;
    liveClone.removeAttribute('id');
    regenerateViIdsSubtree(liveClone);
    el.after(liveClone);
    setTick(t => t + 1);
    showNotification('Element duplicated');
  }, [showNotification, updateHtmlWithMutation]);

  /* ── Insert HTML at body (palette) ── */
  const insertHtmlAtBody = useCallback((html: string) => {
    let insertedTag = '';
    const changed = updateHtmlWithMutation((parsedDoc) => {
      // If an element is selected, insert after it; otherwise append to body
      const selEl = selElRef.current;
      let targetEl: HTMLElement | null = null;
      if (selEl?.isConnected) {
        const selector = elementSelector(selEl);
        targetEl = resolveSourceElement(parsedDoc, selector, selEl);
      }
      const temp = parsedDoc.createElement('div');
      temp.innerHTML = html;
      const newEl = temp.firstElementChild as HTMLElement;
      if (!newEl) return false;
      ensureViNodeId(newEl);
      insertedTag = newEl.tagName.toLowerCase();
      if (targetEl && targetEl.parentElement) targetEl.after(newEl);
      else parsedDoc.body.appendChild(newEl);
      return true;
    });
    if (changed && insertedTag) showNotification(`Inserted <${insertedTag}>`);
  }, [showNotification, updateHtmlWithMutation]);

  const insertHtmlAtPoint = useCallback((html: string, clientX: number, clientY: number) => {
    let insertedTag = '';
    const changed = updateHtmlWithMutation((parsedDoc) => {
      const temp = parsedDoc.createElement('div');
      temp.innerHTML = html;
      const newEl = temp.firstElementChild as HTMLElement;
      if (!newEl) return false;
      ensureViNodeId(newEl);
      const off = iframeOffRef.current;
      const win = iframeRef.current?.contentWindow;
      const x = Math.max(0, Math.round(clientX - off.left + (win?.scrollX || 0)));
      const y = Math.max(0, Math.round(clientY - off.top + (win?.scrollY || 0)));
      const inline = newEl.getAttribute('style') || '';
      const separator = inline.trim() && !inline.trim().endsWith(';') ? '; ' : '';
      newEl.setAttribute('style', `${inline}${separator}position:absolute;left:${x}px;top:${y}px;`);
      insertedTag = newEl.tagName.toLowerCase();
      parsedDoc.body.appendChild(newEl);
      return true;
    });
    if (changed && insertedTag) showNotification(`Inserted <${insertedTag}> near cursor`);
  }, [showNotification, updateHtmlWithMutation]);

  /* ── Reorder element in DOM (layers panel move) ── */
  const moveElementInDom = useCallback((el: HTMLElement, dir: 'up' | 'down') => {
    const selector = elementSelector(el);
    updateHtmlWithMutation((parsedDoc) => {
      const target = resolveSourceElement(parsedDoc, selector, el);
      if (!target || !target.parentElement) return false;
      const parent = target.parentElement;
      const siblings = Array.from(parent.children);
      const idx = siblings.indexOf(target);
      if (dir === 'up' && idx > 0) parent.insertBefore(target, siblings[idx - 1]);
      else if (dir === 'down' && idx < siblings.length - 1) parent.insertBefore(siblings[idx + 1], target);
      else return false;
      return true;
    });
  }, [updateHtmlWithMutation]);

  const reorderElementInDom = useCallback((draggedEl: HTMLElement, targetEl: HTMLElement, position: 'before' | 'inside' | 'after') => {
    if (draggedEl === targetEl || draggedEl.contains(targetEl) || targetEl.tagName.toLowerCase() === 'html') return;
    const draggedSelector = elementSelector(draggedEl);
    const targetSelector = elementSelector(targetEl);
    const changed = updateHtmlWithMutation((parsedDoc) => {
      const sourceDragged = parsedDoc.querySelector(draggedSelector) as HTMLElement | null;
      const sourceTarget = parsedDoc.querySelector(targetSelector) as HTMLElement | null;
      if (!sourceDragged || !sourceTarget || sourceDragged === sourceTarget || sourceDragged.contains(sourceTarget)) return false;
      if (position === 'inside') sourceTarget.appendChild(sourceDragged);
      else if (sourceTarget.parentElement) {
        if (position === 'before') sourceTarget.parentElement.insertBefore(sourceDragged, sourceTarget);
        else sourceTarget.parentElement.insertBefore(sourceDragged, sourceTarget.nextSibling);
      }
      return true;
    });
    if (!changed) return;
    if (draggedEl.isConnected && targetEl.isConnected) {
      if (position === 'inside') targetEl.appendChild(draggedEl);
      else if (targetEl.parentElement) {
        if (position === 'before') targetEl.parentElement.insertBefore(draggedEl, targetEl);
        else targetEl.parentElement.insertBefore(draggedEl, targetEl.nextSibling);
      }
      setTick(t => t + 1);
      selectElement(draggedEl);
    }
    showNotification('Layer reordered');
  }, [showNotification, selectElement, updateHtmlWithMutation]);

  /* ── Z-index helpers ── */
  const bringToFront = useCallback((el: HTMLElement) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const allEls = Array.from(doc.querySelectorAll('*')) as HTMLElement[];
    const maxZ = allEls.reduce((m, e) => {
      const z = parseInt(e.style.zIndex || '0', 10);
      return isNaN(z) ? m : Math.max(m, z);
    }, 0);
    el.style.zIndex = String(maxZ + 10);
    el.style.position = el.style.position || 'relative';
    setTick(t => t + 1);
    syncToSource(el);
    showNotification('Brought to front');
  }, [syncToSource, showNotification]);

  const sendToBack = useCallback((el: HTMLElement) => {
    el.style.zIndex = '0';
    el.style.position = el.style.position || 'relative';
    setTick(t => t + 1);
    syncToSource(el);
    showNotification('Sent to back');
  }, [syncToSource, showNotification]);

  /* ── Attach iframe events ── */
  const attachEvents = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const win = iframeRef.current?.contentWindow ?? doc.defaultView;
    if (animStyleRef.current) injectAnimStyle(doc, animStyleRef.current);
    setIframeDoc(doc);

    const pendingSelector = pendingSelectorRef.current;
    if (pendingSelector) {
      pendingSelectorRef.current = null;
      const restoredByVi = selectedViIdRef.current
        ? (doc.querySelector(`[${VI_ATTR}="${cssEscapeAttr(selectedViIdRef.current)}"]`) as HTMLElement | null)
        : null;
      const restored = restoredByVi ?? (doc.querySelector(pendingSelector) as HTMLElement | null);
      if (restored && !SKIP_TAGS.has(restored.tagName.toLowerCase())) {
        setTimeout(() => selectElement(restored), 0);
      } else {
        const selectedNow = selElRef.current;
        const fallback = findSelectableFallback(selectedNow?.parentElement ?? null);
        if (fallback) setTimeout(() => selectElement(fallback), 0);
        else {
          selectedSelectorRef.current = null;
          selectedViIdRef.current = null;
          setSelEl(null);
          setSelectedElement(null);
        }
      }
    }

    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || SKIP_TAGS.has(target.tagName.toLowerCase())) { setHovEl(null); return; }
      if (target !== hovElRef.current) setHovEl(target);
    };

    const onClick = (e: MouseEvent) => {
      if (interaction === 'select') { e.preventDefault(); e.stopPropagation(); }
      else { return; }
      const target = e.target as HTMLElement;
      if (!target || SKIP_TAGS.has(target.tagName.toLowerCase())) {
        selectedSelectorRef.current = null;
        selectedViIdRef.current = null;
        setSelEl(null); setSelectedElement(null); setSelectedSelector(null);
        setMultiSel(new Set());
        return;
      }
      selectElement(target, e.shiftKey);
    };

    const onDblClick = (e: MouseEvent) => {
      if (interaction !== 'select') return;
      const target = e.target as HTMLElement;
      if (!target || SKIP_TAGS.has(target.tagName.toLowerCase())) return;
      // Make element editable inline
      target.setAttribute('contenteditable', 'true');
      target.focus();
      target.style.outline = '2px solid #7ab8f5';
      const onBlur = () => {
        target.removeAttribute('contenteditable');
        target.style.outline = '';
        target.removeEventListener('blur', onBlur);
        // Sync content
        syncContentToSource(target);
        setTick(t => t + 1);
        showNotification('Text updated');
      };
      target.addEventListener('blur', onBlur);
      e.preventDefault(); e.stopPropagation();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      const target = e.target as HTMLElement;
      if (!target || SKIP_TAGS.has(target.tagName.toLowerCase())) return;
      const off = iframeOffRef.current;
      const screenX = off.left + e.clientX;
      const screenY = off.top + e.clientY;
      const fakeEvent = {
        preventDefault: () => {}, stopPropagation: () => {},
        clientX: screenX, clientY: screenY,
      } as React.MouseEvent;
      showCtx(fakeEvent, [
        { label: `<${target.tagName.toLowerCase()}${target.id ? '#' + target.id : ''}>`, disabled: true },
        { separator: true, label: '' },
        { label: 'Select', icon: '↖', action: () => selectElement(target) },
        { label: 'Duplicate', icon: '⧉', action: () => duplicateElement(target) },
        { separator: true, label: '' },
        { label: 'Bring to Front', icon: '⬆', action: () => bringToFront(target) },
        { label: 'Send to Back', icon: '⬇', action: () => sendToBack(target) },
        { separator: true, label: '' },
        { label: 'Copy HTML', icon: '<>', action: () => { navigator.clipboard.writeText(target.outerHTML); } },
        { label: 'Copy styles', icon: 'CSS', action: () => { navigator.clipboard.writeText(target.getAttribute('style') || ''); } },
        { separator: true, label: '' },
        { label: 'Reset styles', icon: '↺', action: () => { target.removeAttribute('style'); setTick(t => t + 1); syncToSource(target); } },
        { label: 'Hide element', icon: '◌', action: () => { target.style.display = 'none'; setTick(t => t + 1); syncToSource(target); } },
        { label: 'Delete element', icon: '⌫', danger: true, action: () => {
            updateHtmlSourceForElement(target, t => t.remove());
            target.remove();
            selectedSelectorRef.current = null;
            selectedViIdRef.current = null;
            setSelEl(null); setSelectedElement(null); setSelectedSelector(null);
          }
        },
        { separator: true, label: '' },
        { label: 'Select parent', icon: '↑', action: () => {
            const parent = target.parentElement;
            if (parent && !SKIP_TAGS.has(parent.tagName.toLowerCase())) selectElement(parent);
          }
        },
      ]);
    };

    const onIframeScrollOrResize = () => { setTick(t => t + 1); };

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
  }, [injectAnimStyle, interaction, selectElement, duplicateElement, bringToFront, sendToBack, setSelectedSelector, setSelectedElement, showCtx, syncToSource, syncContentToSource, updateHtmlSourceForElement, showNotification]);

  /* ── Drag move / resize ── */
  const dragRef = useRef<{
    type: 'move' | Handle;
    startX: number; startY: number;
    initLeft: number; initTop: number; initW: number; initH: number;
    el: HTMLElement;
    multiEls: { el: HTMLElement; initLeft: number; initTop: number }[];
    moved: boolean;
  } | null>(null);

  const startDrag = useCallback((type: 'move' | Handle, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = getSelectedDomEl();
    if (!el?.isConnected) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const cs = win.getComputedStyle(el);
    const r = el.getBoundingClientRect();

    // Capture multi-select positions
    const multiEls = Array.from(multiSelRef.current)
      .filter(mel => mel !== el && mel.isConnected)
      .map(mel => {
        const mcs = win.getComputedStyle(mel);
        return { el: mel, initLeft: parseFloat(mcs.left) || 0, initTop: parseFloat(mcs.top) || 0 };
      });

    dragRef.current = {
      type,
      startX: e.clientX, startY: e.clientY,
      initLeft: parseFloat(cs.left) || 0,
      initTop: parseFloat(cs.top) || 0,
      initW: r.width, initH: r.height,
      el,
      multiEls,
      moved: false,
    };
    const cursor = type === 'move' ? 'move' : CURSOR[type as Handle] || 'default';
    showDragCapture(cursor);
    setActiveOp(type);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !d.el.isConnected) return;
      let dx = e.clientX - d.startX;
      let dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      const useSnap = e.shiftKey;
      const { el, type, initLeft, initTop, initW, initH } = d;

      if (type === 'move') {
        let newLeft = Math.max(0, initLeft + dx);
        let newTop = Math.max(0, initTop + dy);
        if (useSnap) { newLeft = snap(newLeft); newTop = snap(newTop); }
        el.style.position = el.style.position || 'relative';
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
        // Move multi-selected elements together
        for (const { el: mel, initLeft: ml, initTop: mt } of d.multiEls) {
          mel.style.position = mel.style.position || 'relative';
          const nextLeft = Math.max(0, useSnap ? snap(ml + dx) : ml + dx);
          const nextTop = Math.max(0, useSnap ? snap(mt + dy) : mt + dy);
          mel.style.left = nextLeft + 'px';
          mel.style.top = nextTop + 'px';
        }
      } else {
        if (useSnap) { dx = snap(dx); dy = snap(dy); }
        if (type === 'se') { el.style.width = Math.max(20, initW + dx) + 'px'; el.style.height = Math.max(20, initH + dy) + 'px'; }
        else if (type === 'e') { el.style.width = Math.max(20, initW + dx) + 'px'; }
        else if (type === 's') { el.style.height = Math.max(20, initH + dy) + 'px'; }
        else if (type === 'n') { el.style.height = Math.max(20, initH - dy) + 'px'; el.style.top = Math.max(0, initTop + dy) + 'px'; }
        else if (type === 'w') { el.style.width = Math.max(20, initW - dx) + 'px'; el.style.left = Math.max(0, initLeft + dx) + 'px'; }
        else if (type === 'sw') { el.style.width = Math.max(20, initW - dx) + 'px'; el.style.left = Math.max(0, initLeft + dx) + 'px'; el.style.height = Math.max(20, initH + dy) + 'px'; }
        else if (type === 'nw') { el.style.width = Math.max(20, initW - dx) + 'px'; el.style.height = Math.max(20, initH - dy) + 'px'; el.style.left = Math.max(0, initLeft + dx) + 'px'; el.style.top = Math.max(0, initTop + dy) + 'px'; }
        else if (type === 'ne') { el.style.width = Math.max(20, initW + dx) + 'px'; el.style.height = Math.max(20, initH - dy) + 'px'; el.style.top = Math.max(0, initTop + dy) + 'px'; }
      }
      setTick(t => t + 1);
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      hideDragCapture();
      setActiveOp(null);
      if (!d.moved) return;
      if (d.el.isConnected) syncToSource(d.el);
      for (const { el } of d.multiEls) { if (el.isConnected) syncToSource(el); }
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
    const el = selElRef.current;
    if (!OR || !el?.isConnected) return;
    const cx = OR.left + OR.width / 2;
    const cy = OR.top + OR.height / 2;
    rotRef.current = {
      cx, cy,
      startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI),
      initRot: rotation, el,
    };
    showDragCapture('crosshair');
    setActiveOp('rotate');
  }, [rotation, getSelOverlay]);

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

  const previewW = PREVIEW_WIDTHS[previewSize];
  const projectType = detectProjectType(files);

  /* Breadcrumb path */
  const breadcrumb = selEl ? buildBreadcrumb(selEl) : [];

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: VE.bg, display: 'flex', flexDirection: 'column' }}>

      {/* ── Top toolbar ── */}
      <div style={{
        height: 34, flexShrink: 0, background: VE.surface,
        borderBottom: `1px solid ${VE.borderHi}`,
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, zIndex: 5,
        flexWrap: 'nowrap', overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 6, borderRight: `1px solid ${VE.border}` }}>
          <span style={{ fontSize: 10, color: VE.muted }}>Panels</span>
          <button
          title="Toggle Layers panel"
          onClick={() => setShowLayers(l => !l)}
          style={{ background: showLayers ? VE.blueBg : 'transparent', border: `1px solid ${showLayers ? VE.blueBrd : VE.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 10, color: showLayers ? VE.blue : VE.muted, padding: '2px 8px', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1 }}
        >
          <FiLayers size={12} /> Layers
        </button>
        <button
          title="Toggle Elements palette"
          onClick={() => setShowPalette(p => !p)}
          style={{ background: showPalette ? VE.blueBg : 'transparent', border: `1px solid ${showPalette ? VE.blueBrd : VE.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 10, color: showPalette ? VE.blue : VE.muted, padding: '2px 8px', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1 }}
        >
          <FiGrid size={12} /> Elements
        </button>
        </div>

        {/* Responsive viewport buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 6, borderRight: `1px solid ${VE.border}` }}>
          <span style={{ fontSize: 10, color: VE.dim, flexShrink: 0 }}>Preview</span>
          {([
          { key: 'mobile', icon: <FiSmartphone size={11} />, label: '375', title: 'Mobile (375px)' },
          { key: 'tablet', icon: <FiTablet size={11} />, label: '768', title: 'Tablet (768px)' },
          { key: 'desktop', icon: <FiMonitor size={11} />, label: '1280', title: 'Desktop (1280px)' },
          { key: 'full', icon: <FiMaximize2 size={11} />, label: 'Full', title: 'Full width' },
        ] as const).map(btn => (
          <button key={btn.key} title={btn.title} onClick={() => setPreviewSize(btn.key)}
            style={{
              background: previewSize === btn.key ? VE.accentBg : 'transparent',
              border: `1px solid ${previewSize === btn.key ? VE.accentBrd : VE.border}`,
              borderRadius: 4, cursor: 'pointer', fontSize: 10,
              color: previewSize === btn.key ? VE.accent : VE.dim,
              padding: '2px 8px', fontFamily: 'inherit', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            {btn.icon}{btn.label}
          </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 10, color: projectType === 'static' ? VE.dim : VE.accent,
          border: `1px solid ${projectType === 'static' ? VE.border : VE.accentBrd}`,
          borderRadius: 10, padding: '1px 7px', flexShrink: 0,
        }}>
          {projectTypeLabel(projectType)}
        </span>

        {/* Mode toggle */}
        <button
          onClick={() => setInteraction(m => m === 'select' ? 'interact' : 'select')}
          style={{
            background: VE.surface, border: `1px solid ${VE.border}`, borderRadius: 4, cursor: 'pointer',
            fontSize: 10, color: interaction === 'select' ? VE.accent : VE.blue,
            padding: '2px 8px', fontFamily: 'inherit', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1,
          }}
          title={interaction === 'select' ? 'Switch to Interact mode (lets page events fire)' : 'Switch to Select mode (click to select elements)'}
        >
          {interaction === 'select' ? <><FiMousePointer size={11} /> Select</> : <><FiBox size={11} /> Interact</>}
        </button>
        <span style={{ fontSize: 10, color: selEl ? VE.accent : VE.muted, flexShrink: 0 }}>
          {selEl ? `Selected ${multiSel.size > 0 ? multiSel.size + 1 : 1}` : 'No selection'}
        </span>

        {selEl && (
          <button
            onClick={() => {
              selectedSelectorRef.current = null;
              selectedViIdRef.current = null;
              setSelEl(null); setHovEl(null);
              setSelectedElement(null); setSelectedSelector(null);
              setMultiSel(new Set());
            }}
            style={{ background: 'transparent', border: `1px solid ${VE.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 10, color: VE.dim, padding: '2px 8px', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1 }}
          >
            <FiX size={11} /> Deselect
          </button>
        )}
      </div>

      {/* ── Main editor area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Layers panel */}
        {showLayers && (
          <div style={{ width: 176, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${VE.border}` }}>
            <LayersPanel
              iframeDoc={iframeDoc}
              selectedEl={selEl}
              multiSel={multiSel}
              tick={tick}
              onSelect={(el, shift) => selectElement(el, shift)}
              onMove={moveElementInDom}
              onReorder={reorderElementInDom}
            />
          </div>
        )}

        {/* Iframe area */}
        <div
          style={{ flex: 1, overflow: previewW ? 'auto' : 'hidden', position: 'relative', background: VE.canvas, display: 'flex', justifyContent: 'center' }}
        >
          <iframe
            ref={iframeRef}
            title="Visual Editor"
            onLoad={() => {
              setInteraction('select');
              eventsCleanupRef.current?.();
              const cleanup = attachEvents();
              eventsCleanupRef.current = typeof cleanup === 'function' ? cleanup : null;
            }}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin"
            style={{
              border: 'none', background: '#fff',
              width: previewW ? previewW + 'px' : '100%',
              height: '100%',
              flexShrink: 0,
              boxShadow: previewW ? '0 0 30px rgba(0,0,0,0.5)' : 'none',
            }}
          />

          {/* Drop zone overlay — shows on top of iframe when dragging from palette, capturing drop events */}
          {isDraggingFromPalette && (
            <div
              style={{
                position: 'absolute', inset: 0, zIndex: 200,
                border: `3px dashed ${paletteDropping ? '#e5a45a' : 'rgba(229,164,90,0.4)'}`,
                background: paletteDropping ? 'rgba(229,164,90,0.08)' : 'rgba(229,164,90,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.1s',
              }}
              onDragOver={e => {
                e.preventDefault();
                setPaletteDropping(true);
                setDragGhost(prev => prev ? { ...prev, x: e.clientX + 14, y: e.clientY + 14 } : null);
                const rect = e.currentTarget.getBoundingClientRect();
                setDropPreview({
                  x: Math.max(16, Math.min(rect.width - 16, e.clientX - rect.left)),
                  y: Math.max(14, Math.min(rect.height - 14, e.clientY - rect.top)),
                });
              }}
              onDragLeave={() => { setPaletteDropping(false); setDropPreview(null); }}
              onDrop={e => {
                e.preventDefault();
                setPaletteDropping(false);
                const html = e.dataTransfer.getData('text/html-element');
                if (html) insertHtmlAtPoint(html, e.clientX, e.clientY);
                setIsDraggingFromPalette(false);
                setDragGhost(null);
                setDropPreview(null);
              }}
            >
              <div style={{
                background: '#e5a45a', color: '#1a1a1a', padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                opacity: paletteDropping ? 1 : 0.7, transition: 'opacity 0.1s',
              }}>
                {paletteDropping ? 'Release to insert element' : 'Drag here to insert element'}
              </div>
              {dragGhost && (
                <div style={{
                  position: 'fixed',
                  left: dragGhost.x,
                  top: dragGhost.y,
                  zIndex: 220,
                  maxWidth: 260,
                  pointerEvents: 'none',
                  transform: 'scale(0.92)',
                  transformOrigin: 'top left',
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(229,164,90,0.9)',
                  borderRadius: 8,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                  padding: 8,
                  color: '#111',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#8a5a1e', marginBottom: 5 }}>{dragGhost.label}</div>
                  <div dangerouslySetInnerHTML={{ __html: dragGhost.html }} />
                </div>
              )}
              {dropPreview && (
                <>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: dropPreview.y,
                    borderTop: '2px dashed rgba(229,164,90,0.85)',
                    zIndex: 215,
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: dropPreview.x - 8,
                    top: dropPreview.y - 8,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: '2px solid rgba(229,164,90,0.95)',
                    background: 'rgba(0,0,0,0.35)',
                    zIndex: 216,
                    pointerEvents: 'none',
                  }} />
                </>
              )}
            </div>
          )}

          {/* Hover outline */}
          {HR && !isDragging && (
            <div style={{
              position: 'fixed', zIndex: 50, pointerEvents: 'none',
              left: HR.left, top: HR.top, width: HR.width, height: HR.height,
              outline: '1px dashed rgba(229,164,90,0.35)',
            }} />
          )}

          {/* Multi-select outlines */}
          {Array.from(multiSel).map((el, i) => {
            if (!el.isConnected || el === selEl) return null;
            const r = el.getBoundingClientRect();
            return (
              <div key={i} style={{
                position: 'fixed', zIndex: 49, pointerEvents: 'none',
                left: iframeOff.left + r.left, top: iframeOff.top + r.top,
                width: r.width, height: r.height,
                outline: '2px solid #64a0ff',
              }} />
            );
          })}

          {/* Selection overlay */}
          {OR && selEl && (
            <>
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
                    { label: 'Duplicate', icon: '⧉', action: () => duplicateElement(selEl) },
                    { label: 'Bring to Front', icon: '⬆', action: () => bringToFront(selEl) },
                    { label: 'Send to Back', icon: '⬇', action: () => sendToBack(selEl) },
                    { separator: true, label: '' },
                    { label: 'Copy HTML', icon: '<>', action: () => navigator.clipboard.writeText(selEl.outerHTML) },
                    { label: 'Copy inline style', icon: 'CSS', action: () => navigator.clipboard.writeText(selEl.getAttribute('style') || '') },
                    { separator: true, label: '' },
                    { label: 'Reset styles', icon: '↺', action: () => commitElementMutation(selEl, (target) => target.removeAttribute('style')) },
                    { label: 'Delete element', icon: '⌫', danger: true, action: () => {
                        updateHtmlSourceForElement(selEl, (target) => { target.remove(); });
                        selEl.remove();
                        selectedSelectorRef.current = null;
                        selectedViIdRef.current = null;
                        setSelEl(null); setSelectedElement(null); setSelectedSelector(null);
                      }
                    },
                    { separator: true, label: '' },
                    { label: 'Deselect', icon: '✕', action: () => { selectedSelectorRef.current = null; selectedViIdRef.current = null; setSelEl(null); setSelectedElement(null); setMultiSel(new Set()); } },
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

              {/* Resize handles */}
              {HANDLES.map(h => {
                const pos = getHandlePos(h, OR);
                return (
                  <div
                    key={h}
                    style={{
                      position: 'fixed', zIndex: 54,
                      left: pos.x - 6, top: pos.y - 6, width: 12, height: 12,
                      background: '#1e1e1e', border: '2px solid #e5a45a', borderRadius: 2,
                      cursor: CURSOR[h], boxSizing: 'border-box',
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
                  left: OR.left + OR.width / 2 - 8, top: OR.top - 38,
                  width: 16, height: 16,
                  background: '#1e1e1e', border: '2px solid #e5a45a',
                  borderRadius: '50%', cursor: 'crosshair', boxSizing: 'border-box',
                }}
                onMouseDown={startRotate}
              />
              <div style={{
                position: 'fixed', zIndex: 52, pointerEvents: 'none',
                left: OR.left + OR.width / 2 - 0.5, top: Math.max(0, OR.top - 22),
                width: 1, height: 22, background: 'rgba(229,164,90,0.5)',
              }} />

              {/* Live dimensions */}
              {isDragging && (
                <div style={{
                  position: 'fixed', zIndex: 60, pointerEvents: 'none',
                  left: OR.left + OR.width / 2, top: OR.top + OR.height + 8,
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.85)', color: '#ccc',
                  fontSize: 11, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 3, whiteSpace: 'nowrap',
                }}>
                  {activeOp === 'rotate'
                    ? `${rotation}°`
                    : `${Math.round(OR.width)} × ${Math.round(OR.height)}${dragRef.current && (dragRef.current.type === 'move' || HANDLES.includes(dragRef.current.type as Handle)) ? ' (Shift=snap to 8px)' : ''}`
                  }
                </div>
              )}
            </>
          )}
        </div>

        {/* Elements palette */}
        {showPalette && (
          <div style={{ width: 176, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${VE.border}` }}>
            <ElementsPalette
            onInsert={insertHtmlAtBody}
            onDragStart={(item: PaletteItem) => {
              setIsDraggingFromPalette(true);
              setDragGhost({ x: 0, y: 0, html: item.defaultHtml, label: item.label });
            }}
            onDragEnd={() => { setIsDraggingFromPalette(false); setPaletteDropping(false); setDragGhost(null); setDropPreview(null); }}
          />
          </div>
        )}
      </div>

      {/* ── Breadcrumb bar ── */}
      <div style={{
        height: 26, flexShrink: 0, background: VE.surface, borderTop: `1px solid ${VE.border}`,
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 0,
        overflow: 'hidden', zIndex: 5,
      }}>
        <span style={{ fontSize: 10, color: VE.muted, marginRight: 6, flexShrink: 0 }}>
          {interaction === 'select' ? 'Select Mode' : 'Interact Mode'}
        </span>
        {breadcrumb.length > 0 ? (
          breadcrumb.map((el, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ fontSize: 10, color: VE.border, margin: '0 4px' }}>›</span>}
              <button
                onClick={() => selectElement(el)}
                title={`Select <${breadcrumbLabel(el)}>`}
                style={{
                  background: el === selEl ? VE.accentBg : 'transparent',
                  border: 'none', cursor: 'pointer', fontSize: 10, fontFamily: 'monospace',
                  color: el === selEl ? VE.accent : VE.dim,
                  padding: '0 4px', borderRadius: 3,
                  fontWeight: el === selEl ? 700 : 400,
                }}
              >
                {breadcrumbLabel(el)}
              </button>
            </React.Fragment>
          ))
        ) : (
          <span style={{ fontSize: 10, color: VE.muted }}>
            {selEl ? '' : 'Click any element to select • Shift+click to multi-select • Double-click to edit text • Shift+drag to snap to 8px grid'}
          </span>
        )}
      </div>

      {ctxEl}
    </div>
  );
};

export default VisualEditor;
