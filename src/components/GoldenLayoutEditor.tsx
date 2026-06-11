import React, {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState,
} from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { GoldenLayout, LayoutConfig } from 'golden-layout';
import type { ComponentContainer } from 'golden-layout';

import FilePanel from './FilePanel';
import CodeEditor from './CodeEditor';
import PreviewPane from './PreviewPane';
import VisualEditor from './VisualEditor';
import PropertiesPanel from './PropertiesPanel';
import TimelinePanel from './TimelinePanel';
import AnimPresetsPanel from './AnimPresetsPanel';
import AnimConfigSubPanel from './AnimConfigSubPanel';
import AnimTracksSubPanel from './AnimTracksSubPanel';
import ConsolePanel from './ConsolePanel';
import EventListenersPanel from './EventListenersPanel';
import OGLShaderEditor from './OGLShaderEditor';
import VantaEditor from './VantaEditor';
import { setGlSectionOpener } from '../lib/propSectionBridge';
import { setFileEditorOpener } from '../lib/fileEditorBridge';
import { deleteCookie, getCookie, setCookie } from '../utils/cookies';

export type PanelType = 'files' | 'code' | 'file-editor' | 'preview' | 'properties' | 'timeline' | 'events' | 'console' | 'anim-presets' | 'anim-config' | 'anim-tracks' | 'vanta-editor' | 'ogl-editor' | 'prop-section';
export type Mode = 'code' | 'split' | 'visual';

export interface GoldenLayoutEditorHandle {
  addPanel: (type: PanelType) => void;
  focusOrAddPanel: (type: PanelType) => void;
  resetLayout: () => void;
  getOpenPanels: () => PanelType[];
}

/* ─── Layout Presets ─── */
function getCodeLayout(): LayoutConfig {
  return {
    root: {
      type: 'row',
      content: [
        {
          type: 'component', componentType: 'files',
          title: 'Explorer', width: 17,
        },
        {
          type: 'stack', width: 83,
          content: [
            { type: 'component', componentType: 'console', title: 'Console' },
          ],
        },
      ],
    },
    settings: { showPopoutIcon: false, showMaximiseIcon: true, showCloseIcon: true },
    dimensions: { borderWidth: 4, headerHeight: 28 },
  };
}

function getSplitLayout(): LayoutConfig {
  return {
    root: {
      type: 'row',
      content: [
        { type: 'component', componentType: 'files', title: 'Explorer', width: 17 },
        {
          type: 'stack', width: 48,
          content: [
            { type: 'component', componentType: 'console', title: 'Console' },
          ],
        },
        { type: 'component', componentType: 'preview', title: 'Preview', width: 35 },
      ],
    },
    settings: { showPopoutIcon: false, showMaximiseIcon: true, showCloseIcon: true },
    dimensions: { borderWidth: 4, headerHeight: 28 },
  };
}

function getVisualLayout(): LayoutConfig {
  return {
    root: {
      type: 'row',
      content: [
        {
          type: 'stack', width: 18,
          content: [
            { type: 'component', componentType: 'anim-presets', title: 'Anim Presets' },
            { type: 'component', componentType: 'anim-config', title: 'Anim Config' },
            { type: 'component', componentType: 'anim-tracks', title: 'Anim Tracks' },
          ],
        },
        {
          type: 'column', width: 56,
          content: [
            { type: 'component', componentType: 'preview', title: 'Visual Editor', height: 75 },
            { type: 'component', componentType: 'timeline', title: 'Timeline', height: 25 },
          ],
        },
        {
          type: 'stack', width: 26,
          content: [
            { type: 'component', componentType: 'properties', title: 'Properties' },
            { type: 'component', componentType: 'events', title: 'Events' },
          ],
        },
      ],
    },
    settings: { showPopoutIcon: false, showMaximiseIcon: true, showCloseIcon: true },
    dimensions: { borderWidth: 4, headerHeight: 28 },
  };
}

function getLayout(mode: Mode): LayoutConfig {
  if (mode === 'code')   return getCodeLayout();
  if (mode === 'visual') return getVisualLayout();
  return getSplitLayout();
}

const PANEL_TITLES: Record<PanelType, string> = {
  files: 'Explorer', code: 'Code Editor', 'file-editor': 'Editor', preview: 'Preview',
  properties: 'Properties', timeline: 'Timeline',
  events: 'Events', console: 'Console',
  'anim-presets': 'Anim Presets', 'anim-config': 'Anim Config', 'anim-tracks': 'Anim Tracks',
  'vanta-editor': 'Vanta JS', 'ogl-editor': 'OGL Shader FX',
  'prop-section': 'Property Group',
};

const COOKIE_LAYOUT_MAX_LENGTH = 3600;
const PANEL_TYPES: readonly PanelType[] = [
  'files', 'code', 'file-editor', 'preview', 'properties', 'timeline', 'events', 'console',
  'anim-presets', 'anim-config', 'anim-tracks', 'vanta-editor', 'ogl-editor', 'prop-section',
];

function isPanelType(value: unknown): value is PanelType {
  return typeof value === 'string' && PANEL_TYPES.includes(value as PanelType);
}

function getPanelTypeFromItem(item: any): PanelType | undefined {
  // Safer detection using standard Golden Layout v2 componentType first
  const candidates = [
    item?.componentType,
    item?.container?.componentType,
    item?._myType,
    item?.container?._myType,
  ];
  return candidates.find(isPanelType);
}

/* ─── Panel Renderer ─── */
function renderPanelContent(type: PanelType, mode: Mode, sectionTitle?: string): React.ReactElement {
  switch (type) {
    case 'files':
      return <FilePanel hideHeader />;
    case 'code':
      return <CodeEditor />;
    case 'preview':
      return mode === 'visual' ? <VisualEditor /> : <PreviewPane />;
    case 'properties':
      return <PropertiesPanel hideHeader />;
    case 'timeline':
      return <TimelinePanel />;
    case 'events':
      return <EventListenersPanel />;
    case 'console':
      return <ConsolePanel />;
    case 'anim-presets':
      return <AnimPresetsPanel />;
    case 'anim-config':
      return <AnimConfigSubPanel />;
    case 'anim-tracks':
      return <AnimTracksSubPanel />;
    case 'vanta-editor':
      return <VantaEditor />;
    case 'ogl-editor':
      return <OGLShaderEditor />;
    case 'prop-section':
      return <PropertiesPanel hideHeader singleSection={sectionTitle || ''} />;
  }
}

/* ─── Main Component ─── */
interface GoldenLayoutEditorProps {
  mode: Mode;
  onPanelsChange?: (openPanels: PanelType[]) => void;
}

const GoldenLayoutEditor = forwardRef<GoldenLayoutEditorHandle, GoldenLayoutEditorProps>(
  ({ mode, onPanelsChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const glRef = useRef<GoldenLayout | null>(null);
    const rootsRef = useRef<Map<ComponentContainer, ReactDOMClient.Root>>(new Map());
    const modeRef = useRef<Mode>(mode);
    const [resetKey, setResetKey] = useState(0);
    const onPanelsChangeRef = useRef(onPanelsChange);
    useEffect(() => { onPanelsChangeRef.current = onPanelsChange; }, [onPanelsChange]);

    const getOpenPanelTypes = useCallback((): PanelType[] => {
      const gl = glRef.current as any;
      if (!gl) return [];
      const found: PanelType[] = [];
      try {
        gl.getAllContentItems?.().forEach((item: any) => {
          const ct = getPanelTypeFromItem(item);
          if (ct && !found.includes(ct)) found.push(ct);
        });
      } catch {}
      return found;
    }, []);

    const notifyPanelsChange = useCallback(() => {
      onPanelsChangeRef.current?.(getOpenPanelTypes());
    }, [getOpenPanelTypes]);

    useEffect(() => { modeRef.current = mode; }, [mode]);

    /* ── localStorage helpers (GoldenLayout v2 API) — component scope ── */
    const LS_KEY = useCallback((m: Mode) => `gl-layout-v5-${m}`, []);

    const saveLayoutState = useCallback((gl: GoldenLayout, m: Mode) => {
      try {
        const resolved = gl.saveLayout();
        const config = LayoutConfig.fromResolved(resolved);
        if (!config.root) return;
        const serialized = JSON.stringify(config);
        const key = LS_KEY(m);
        localStorage.setItem(key, serialized);
        if (encodeURIComponent(serialized).length <= COOKIE_LAYOUT_MAX_LENGTH) {
          setCookie(key, serialized);
        } else {
          deleteCookie(key);
        }
      } catch {}
    }, [LS_KEY]);

    const loadLayoutState = useCallback((m: Mode): LayoutConfig | null => {
      try {
        const key = LS_KEY(m);
        const raw = localStorage.getItem(key) || getCookie(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LayoutConfig;
        if (!parsed.root) {
          localStorage.removeItem(key);
          deleteCookie(key);
          return null;
        }
        return parsed;
      } catch { return null; }
    }, [LS_KEY]);

    const mountPanel = useCallback((type: PanelType, container: ComponentContainer) => {
      const el = container.element as HTMLElement;
      el.style.cssText = 'height:100%;width:100%;overflow:hidden;position:relative;';
      const root = ReactDOMClient.createRoot(el);
      root.render(renderPanelContent(type, modeRef.current));
      rootsRef.current.set(container, root);
    }, []);

    /* ── Re-render all roots when mode changes (so panels get the right content) ── */
    useEffect(() => {
      rootsRef.current.forEach((root, container) => {
        // find the type from the component type stored in the container
        const compType = (container as any)._myType as PanelType | undefined
          ?? (container as any)._initialState?.componentType as PanelType | undefined
          ?? detectType(container);
        if (!compType) return;
        // file-editor panels re-render with their bound fileId
        if (compType === 'file-editor') {
          const fileId = (container as any)._fileId as string | undefined ?? '';
          root.render(<CodeEditor fileId={fileId} />);
          return;
        }
        // prop-section panels preserve their sectionTitle across re-renders
        const sectionTitle = compType === 'prop-section'
          ? ((container as any)._sectionTitle as string | undefined) ?? ''
          : undefined;
        root.render(renderPanelContent(compType, mode, sectionTitle));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    function detectType(container: ComponentContainer): PanelType | undefined {
      const titleLc = (container.title || '').toLowerCase();
      return PANEL_TYPES.find(t => titleLc.includes(t));
    }

    function unmountContainerRoot(container?: ComponentContainer) {
      if (!container) return;
      const root = rootsRef.current.get(container);
      if (!root) return;
      try { root.unmount(); } catch {}
      rootsRef.current.delete(container);
    }

    /* ── Initialize GoldenLayout ── */
    useEffect(() => {
      if (!containerRef.current) return;
      const layoutMode = mode;
      modeRef.current = layoutMode;

      /* Destroy existing instance */
      if (glRef.current) {
        try { glRef.current.destroy(); } catch {}
        glRef.current = null;
        rootsRef.current.forEach(r => { try { r.unmount(); } catch {} });
        rootsRef.current.clear();
      }

      const gl = new GoldenLayout(containerRef.current);
      glRef.current = gl;

      const TYPES: PanelType[] = ['files', 'code', 'preview', 'properties', 'timeline', 'events', 'console', 'anim-presets', 'anim-config', 'anim-tracks', 'vanta-editor', 'ogl-editor'];
      TYPES.forEach(type => {
        gl.registerComponentFactoryFunction(type, (container) => {
          (container as any)._myType = type;
          mountPanel(type, container);
        });
      });

      /* ── file-editor: per-file GL panel opened from Explorer ── */
      gl.registerComponentFactoryFunction('file-editor', (container, state) => {
        const fileId = (state as { fileId?: string })?.fileId || '';
        (container as any)._myType = 'file-editor';
        (container as any)._fileId = fileId;
        const el = container.element as HTMLElement;
        el.style.cssText = 'height:100%;width:100%;overflow:hidden;position:relative;';
        const root = ReactDOMClient.createRoot(el);
        root.render(<CodeEditor fileId={fileId} />);
        rootsRef.current.set(container, root);
      });

      /* ── prop-section: individual property group opened from Properties panel ── */
      gl.registerComponentFactoryFunction('prop-section', (container, state) => {
        const sectionTitle = (state as { sectionTitle?: string })?.sectionTitle || '';
        (container as any)._myType = 'prop-section';
        (container as any)._sectionTitle = sectionTitle;
        const el = container.element as HTMLElement;
        el.style.cssText = 'height:100%;width:100%;overflow:auto;position:relative;background:#1a1a1e;';
        const root = ReactDOMClient.createRoot(el);
        root.render(<PropertiesPanel hideHeader singleSection={sectionTitle} />);
        rootsRef.current.set(container, root);
      });

      /* ── Register bridge so Explorer files open as separate GL panels ── */
      setFileEditorOpener((fileId: string, fileName: string) => {
        try {
          // Check if panel for this file already exists → focus it
          let focused = false;
          (gl as any).getAllContentItems().forEach((item: any) => {
            if (!focused && item.type === 'component') {
              const storedId = (item as any)._fileId ?? item.container?._fileId;
              const stateId = item.container?.componentState?.fileId;
              if (storedId === fileId || stateId === fileId) {
                focused = true;
                try { (item as any).parent?.setActiveContentItem?.(item); } catch {}
              }
            }
          });
          if (focused) return;

          // Find the center stack (first stack that isn't the files panel's parent)
          let added = false;
          (gl as any).getAllContentItems().forEach((item: any) => {
            if (!added && item.type === 'stack') {
              // Skip stacks that only contain the 'files' component
              const childTypes: string[] = [];
              try {
                (item.contentItems || []).forEach((c: any) => {
                  const ct = (c as any)._myType ?? c.componentType ?? c.container?._myType;
                  if (ct) childTypes.push(ct);
                });
              } catch {}
              if (childTypes.length === 1 && childTypes[0] === 'files') return;

              try {
                (item as any).addItem({
                  type: 'component', componentType: 'file-editor',
                  componentState: { fileId },
                  title: fileName,
                });
                added = true;
              } catch {
                try {
                  (item as any).addChild({
                    type: 'component', componentType: 'file-editor',
                    componentState: { fileId },
                    title: fileName,
                  });
                  added = true;
                } catch {}
              }
            }
          });
          if (!added) {
            gl.addComponent('file-editor', { fileId }, fileName);
          }
        } catch (e) {
          console.warn('openFileInGLPanel failed:', e);
        }
      });

      /* ── Register bridge so PropertiesPanel sections can open in GL ── */
      setGlSectionOpener((title: string) => {
        try {
          let added = false;
          (gl as any).getAllContentItems().forEach((item: any) => {
            if (!added && item.type === 'stack') {
              try {
                (item as any).addItem({
                  type: 'component', componentType: 'prop-section',
                  componentState: { sectionTitle: title },
                  title: `⊞ ${title}`,
                });
                added = true;
              } catch {
                try {
                  (item as any).addChild({
                    type: 'component', componentType: 'prop-section',
                    componentState: { sectionTitle: title },
                    title: `⊞ ${title}`,
                  });
                  added = true;
                } catch {}
              }
            }
          });
          if (!added) {
            gl.addComponent('prop-section', { sectionTitle: title }, `⊞ ${title}`);
          }
        } catch (e) {
          console.warn('openSectionInGL failed:', e);
        }
      });

      /* Try loading saved layout from localStorage, fall back to preset */
      const savedLayout = loadLayoutState(layoutMode);
      try {
        gl.loadLayout(savedLayout ?? getLayout(layoutMode));
      } catch (e) {
        console.warn('GL loadLayout failed, using default:', e);
        try { gl.loadLayout(getLayout(layoutMode)); } catch {
          gl.loadLayout(getSplitLayout());
        }
      }

      /* ── Inject CSS: active tab highlight at BOTTOM border ── */
      const styleId = 'gl-tab-bottom-highlight';
      let glStyle = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!glStyle) {
        glStyle = document.createElement('style');
        glStyle.id = styleId;
        document.head.appendChild(glStyle);
      }
      glStyle.textContent = `
        .lm_header .lm_tab { border-top: 2px solid transparent !important; border-bottom: none !important; }
        .lm_header .lm_tab.lm_active { border-top: 2px solid transparent !important; border-bottom: none !important; }
      `;

      /* Auto-save on every state change (debounced to avoid excessive writes) */
      let isDestroying = false;
      let saveTimer: ReturnType<typeof setTimeout> | null = null;
      const flushLayoutState = (force = false) => {
        if (isDestroying && !force) return;
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        saveLayoutState(gl, layoutMode);
      };
      const onStateChanged = () => {
        if (isDestroying) return;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          if (isDestroying) return;
          saveTimer = null;
          saveLayoutState(gl, layoutMode);
        }, 300);
      };
      try {
        (gl as any).on('stateChanged', onStateChanged);
        (gl as any).on?.('resize', onStateChanged);
      } catch {}

      /* Notify after layout loads */
      setTimeout(() => notifyPanelsChange(), 100);

      /* Listen for panel add/remove to keep menu in sync */
      try {
        (gl as any).on?.('itemDestroyed', (item: any) => {
          unmountContainerRoot(item?.container);
          flushLayoutState();
          if (!isDestroying) setTimeout(notifyPanelsChange, 50);
        });
        (gl as any).on?.('itemCreated', () => {
          onStateChanged();
          if (!isDestroying) setTimeout(notifyPanelsChange, 50);
        });
      } catch {}

      /* ── ResizeObserver: keeps GL in sync with container size (fixes fullscreen glitch) ── */
      const ro = new ResizeObserver(() => {
        try { (gl as any).updateSize?.(); } catch {}
      });
      ro.observe(containerRef.current);

      return () => {
        flushLayoutState(true);
        isDestroying = true;
        setGlSectionOpener(null);
        setFileEditorOpener(null);
        ro.disconnect();
        try { gl.destroy(); } catch {}
        if (glRef.current === gl) glRef.current = null;
        rootsRef.current.forEach(r => { try { r.unmount(); } catch {} });
        rootsRef.current.clear();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, resetKey]);

    /* ── Imperative handle ── */
    useImperativeHandle(ref, () => ({
      resetLayout() {
        /* Clear saved state so default preset loads on reinit */
        try {
          const key = LS_KEY(modeRef.current);
          localStorage.removeItem(key);
          deleteCookie(key);
        } catch {}
        setResetKey(k => k + 1);
      },
      addPanel(type: PanelType) {
        const gl = glRef.current;
        if (!gl) return;
        try {
          (gl as any).addComponentAsColumn(type, {}, PANEL_TITLES[type]);
        } catch (e) {
          console.warn('addPanel failed:', e);
        }
      },
      focusOrAddPanel(type: PanelType) {
        const gl = glRef.current;
        if (!gl) return;
        /* Check if already in layout — focus it */
        let found = false;
        try {
          (gl as any).getAllContentItems().forEach((item: any) => {
            const ct = getPanelTypeFromItem(item);
            if (ct === type) {
              found = true;
              try { (item as any).parent?.setActiveContentItem?.(item); } catch {}
            }
          });
        } catch {}
        if (found) return;
        /* Not found — add it to the first available stack, else to root */
        try {
          let added = false;
          (gl as any).getAllContentItems().forEach((item: any) => {
            if (!added && item.type === 'stack') {
              try {
                (item as any).addItem({ type: 'component', componentType: type, title: PANEL_TITLES[type] });
                added = true;
              } catch {
                try {
                  (item as any).addChild({ type: 'component', componentType: type, title: PANEL_TITLES[type] });
                  added = true;
                } catch {}
              }
            }
          });
          if (!added) {
            gl.addComponent(type, {}, PANEL_TITLES[type]);
          }
        } catch (e) {
          console.warn('focusOrAddPanel failed:', e);
        }
        setTimeout(notifyPanelsChange, 100);
      },
      getOpenPanels() {
        return getOpenPanelTypes();
      },
    }));

    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />
    );
  }
);

GoldenLayoutEditor.displayName = 'GoldenLayoutEditor';
export default GoldenLayoutEditor;
