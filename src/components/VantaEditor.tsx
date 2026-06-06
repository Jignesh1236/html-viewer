import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { FiZap, FiCheck, FiCode, FiRefreshCw, FiCopy, FiChevronDown, FiExternalLink } from 'react-icons/fi';
import { getTargetHtmlFile, getTargetJsFile, insertBeforeClosingTag } from '../utils/projectFiles';

/* ─── CDNs ─── */
const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
const P5_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js';
const VANTA_BASE = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist';

/* ─── Types ─── */
type CtrlType = 'color' | 'range' | 'toggle' | 'select';
interface Ctrl {
  key: string; label: string; type: CtrlType;
  min?: number; max?: number; step?: number;
  defaultVal: any;
  options?: { label: string; value: any }[];
}
interface EffectDef {
  id: string; label: string; emoji: string;
  lib: 'three' | 'p5'; controls: Ctrl[];
  desc: string;
}

/* ─── Effect Definitions ─── */
const EFFECTS: EffectDef[] = [
  {
    id: 'NET', label: 'Net', emoji: '🕸', lib: 'three', desc: 'Connected nodes particle network',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'color', label: 'Net Color', type: 'color', defaultVal: 0xff6633 },
      { key: 'points', label: 'Points', type: 'range', min: 3, max: 20, step: 1, defaultVal: 9 },
      { key: 'maxDistance', label: 'Max Distance', type: 'range', min: 10, max: 40, step: 1, defaultVal: 20 },
      { key: 'spacing', label: 'Spacing', type: 'range', min: 5, max: 25, step: 1, defaultVal: 15 },
      { key: 'showDots', label: 'Show Dots', type: 'toggle', defaultVal: true },
      { key: 'backgroundAlpha', label: 'BG Alpha', type: 'range', min: 0, max: 1, step: 0.05, defaultVal: 1 },
    ],
  },
  {
    id: 'WAVES', label: 'Waves', emoji: '🌊', lib: 'three', desc: '3D animated ocean waves',
    controls: [
      { key: 'color', label: 'Wave Color', type: 'color', defaultVal: 0x005f8e },
      { key: 'shininess', label: 'Shininess', type: 'range', min: 0, max: 150, step: 5, defaultVal: 30 },
      { key: 'waveHeight', label: 'Wave Height', type: 'range', min: 0, max: 40, step: 1, defaultVal: 15 },
      { key: 'waveSpeed', label: 'Wave Speed', type: 'range', min: 0.25, max: 5, step: 0.25, defaultVal: 1 },
      { key: 'zoom', label: 'Zoom', type: 'range', min: 0.5, max: 2, step: 0.1, defaultVal: 1 },
    ],
  },
  {
    id: 'BIRDS', label: 'Birds', emoji: '🐦', lib: 'three', desc: 'Flocking bird simulation',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x001a2e },
      { key: 'color1', label: 'Color 1', type: 'color', defaultVal: 0xff6600 },
      { key: 'color2', label: 'Color 2', type: 'color', defaultVal: 0x00ccff },
      { key: 'birdSize', label: 'Bird Size', type: 'range', min: 0.5, max: 3, step: 0.1, defaultVal: 1 },
      { key: 'wingSpan', label: 'Wing Span', type: 'range', min: 10, max: 50, step: 1, defaultVal: 30 },
      { key: 'speedLimit', label: 'Speed', type: 'range', min: 1, max: 10, step: 0.5, defaultVal: 4 },
      { key: 'quantity', label: 'Quantity', type: 'range', min: 1, max: 10, step: 1, defaultVal: 3 },
      { key: 'backgroundAlpha', label: 'BG Alpha', type: 'range', min: 0, max: 1, step: 0.05, defaultVal: 1 },
    ],
  },
  {
    id: 'GLOBE', label: 'Globe', emoji: '🌐', lib: 'three', desc: 'Interactive 3D globe with dots',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'color', label: 'Color 1', type: 'color', defaultVal: 0xff6633 },
      { key: 'color2', label: 'Color 2', type: 'color', defaultVal: 0x0000ff },
      { key: 'size', label: 'Size', type: 'range', min: 0.3, max: 2, step: 0.1, defaultVal: 1 },
    ],
  },
  {
    id: 'FOG', label: 'Fog', emoji: '🌫', lib: 'three', desc: 'Soft foggy gradient noise',
    controls: [
      { key: 'highlightColor', label: 'Highlight', type: 'color', defaultVal: 0xff6600 },
      { key: 'midtoneColor', label: 'Midtone', type: 'color', defaultVal: 0x663300 },
      { key: 'lowlightColor', label: 'Lowlight', type: 'color', defaultVal: 0x331100 },
      { key: 'baseColor', label: 'Base', type: 'color', defaultVal: 0x000000 },
      { key: 'blurFactor', label: 'Blur', type: 'range', min: 0.1, max: 0.9, step: 0.05, defaultVal: 0.6 },
      { key: 'speed', label: 'Speed', type: 'range', min: 0.5, max: 5, step: 0.5, defaultVal: 1 },
      { key: 'zoom', label: 'Zoom', type: 'range', min: 0.5, max: 2, step: 0.1, defaultVal: 1 },
    ],
  },
  {
    id: 'CLOUDS', label: 'Clouds', emoji: '☁️', lib: 'three', desc: 'Flowing 3D cloud sky',
    controls: [
      { key: 'skyColor', label: 'Sky Color', type: 'color', defaultVal: 0x68b8d7 },
      { key: 'cloudColor', label: 'Cloud Color', type: 'color', defaultVal: 0xadc4d9 },
      { key: 'cloudShadowColor', label: 'Shadow', type: 'color', defaultVal: 0x183550 },
      { key: 'sunColor', label: 'Sun Color', type: 'color', defaultVal: 0xff9919 },
      { key: 'speed', label: 'Speed', type: 'range', min: 0, max: 3, step: 0.1, defaultVal: 1 },
      { key: 'zoom', label: 'Zoom', type: 'range', min: 0.5, max: 2, step: 0.1, defaultVal: 1 },
    ],
  },
  {
    id: 'CLOUDS2', label: 'Clouds 2', emoji: '🌤', lib: 'p5', desc: 'P5.js flat animated clouds',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'color', label: 'Cloud Color', type: 'color', defaultVal: 0xffffff },
      { key: 'speed', label: 'Speed', type: 'range', min: 0.5, max: 5, step: 0.5, defaultVal: 1 },
    ],
  },
  {
    id: 'RINGS', label: 'Rings', emoji: '💫', lib: 'three', desc: 'Hypnotic spinning rings',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'color', label: 'Ring Color', type: 'color', defaultVal: 0xff6633 },
      { key: 'backgroundAlpha', label: 'BG Alpha', type: 'range', min: 0, max: 1, step: 0.05, defaultVal: 1 },
    ],
  },
  {
    id: 'CELLS', label: 'Cells', emoji: '🔬', lib: 'p5', desc: 'Organic voronoi cell pattern',
    controls: [
      { key: 'color1', label: 'Color 1', type: 'color', defaultVal: 0x141416 },
      { key: 'color2', label: 'Color 2', type: 'color', defaultVal: 0xff6633 },
      { key: 'size', label: 'Cell Size', type: 'range', min: 1, max: 5, step: 0.5, defaultVal: 1.5 },
      { key: 'speed', label: 'Speed', type: 'range', min: 0.5, max: 5, step: 0.5, defaultVal: 1 },
    ],
  },
  {
    id: 'DOTS', label: 'Dots', emoji: '⬤', lib: 'three', desc: 'Colorful animated dot grid',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'color', label: 'Color 1', type: 'color', defaultVal: 0xff6633 },
      { key: 'color2', label: 'Color 2', type: 'color', defaultVal: 0xffffff },
      { key: 'size', label: 'Dot Size', type: 'range', min: 1, max: 10, step: 0.5, defaultVal: 3 },
      { key: 'spacing', label: 'Spacing', type: 'range', min: 10, max: 50, step: 2, defaultVal: 25 },
    ],
  },
  {
    id: 'HALO', label: 'Halo', emoji: '✨', lib: 'three', desc: 'Neon glow halo ring effect',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'baseColor', label: 'Halo Color', type: 'color', defaultVal: 0xff6633 },
      { key: 'amplitudeFactor', label: 'Amplitude', type: 'range', min: 0.1, max: 3, step: 0.1, defaultVal: 1 },
      { key: 'size', label: 'Size', type: 'range', min: 0.5, max: 3, step: 0.1, defaultVal: 1 },
    ],
  },
  {
    id: 'TOPOLOGY', label: 'Topology', emoji: '📐', lib: 'three', desc: 'Moving terrain topology lines',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'color', label: 'Line Color', type: 'color', defaultVal: 0xff6633 },
    ],
  },
  {
    id: 'TRUNK', label: 'Trunk', emoji: '🌳', lib: 'three', desc: 'Growing tree branch lines',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'color', label: 'Color', type: 'color', defaultVal: 0xff6633 },
      { key: 'spacing', label: 'Spacing', type: 'range', min: 50, max: 300, step: 10, defaultVal: 100 },
    ],
  },
  {
    id: 'RIPPLE', label: 'Ripple', emoji: '〜', lib: 'p5', desc: 'Water ripple on click',
    controls: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: 0x141416 },
      { key: 'color', label: 'Ripple Color', type: 'color', defaultVal: 0xff6633 },
      { key: 'speed', label: 'Speed', type: 'range', min: 0.5, max: 5, step: 0.5, defaultVal: 1 },
    ],
  },
];

/* ─── Helpers ─── */
function numToHex(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }
function hexToNum(h: string): number { return parseInt(h.replace('#', ''), 16); }
function buildDefaults(def: EffectDef): Record<string, any> {
  const out: Record<string, any> = {};
  def.controls.forEach(c => { out[c.key] = c.defaultVal; });
  return out;
}

function parseSelectors(html: string): string[] {
  const sel: string[] = ['body'];
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('[id]').forEach(el => sel.push(`#${(el as HTMLElement).id}`));
    const seenC = new Set<string>();
    doc.querySelectorAll('[class]').forEach(el => {
      (el as HTMLElement).className.split(/\s+/).filter(Boolean).forEach(c => {
        if (!seenC.has(c)) { seenC.add(c); sel.push(`.${c}`); }
      });
    });
    ['header', 'section', 'main', 'footer', 'div', 'nav', 'article', 'aside'].forEach(t => {
      if (doc.querySelector(t) && !sel.includes(t)) sel.push(t);
    });
  } catch {}
  return sel;
}

function buildPreviewDoc(effectId: string, props: Record<string, any>, def: EffectDef): string {
  const propsLines = def.controls.map(c => {
    const val = props[c.key] ?? c.defaultVal;
    if (c.type === 'color') return `    ${c.key}: 0x${(val as number).toString(16).padStart(6, '0')}`;
    if (c.type === 'toggle') return `    ${c.key}: ${Boolean(val)}`;
    return `    ${c.key}: ${val}`;
  }).join(',\n');

  const libScript = def.lib === 'p5'
    ? `<script src="${P5_CDN}"></script>`
    : `<script src="${THREE_CDN}"></script>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 100vw; height: 100vh; overflow: hidden; background: #141416; }
  #vanta { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="vanta"></div>
${libScript}
<script src="${VANTA_BASE}/vanta.${effectId.toLowerCase()}.min.js"></script>
<script>
(function() {
  function initVanta() {
    try {
      VANTA.${effectId}({
        el: "#vanta",
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
${propsLines}
      });
    } catch(e) {
      document.body.innerHTML = '<div style="color:#f87171;font-family:monospace;padding:20px;font-size:12px;">Preview error: ' + e.message + '</div>';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVanta);
  } else {
    initVanta();
  }
})();
</script>
</body>
</html>`;
}

function generateInitCode(effectId: string, selector: string, props: Record<string, any>, def: EffectDef): string {
  const lines = def.controls.map(c => {
    const val = props[c.key] ?? c.defaultVal;
    if (c.type === 'color') return `  ${c.key}: 0x${(val as number).toString(16).padStart(6, '0')}`;
    if (c.type === 'toggle') return `  ${c.key}: ${Boolean(val)}`;
    return `  ${c.key}: ${val}`;
  });
  return `VANTA.${effectId}({\n  el: "${selector}",\n  mouseControls: true,\n  touchControls: true,\n  gyroControls: false,\n${lines.join(',\n')}\n});`;
}

function buildInitScript(code: string): string {
  return `(function() {
  function initVanta() {
${code.split('\n').map(line => `    ${line}`).join('\n')}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVanta);
  } else {
    initVanta();
  }
})();`;
}

/* ─── Colours ─── */
const ACCENT = '#a855f7';
const ACCENT2 = '#f107a3';
const BG = '#141416';
const HDR = '#1a1a1c';
const BORDER = '#2a2a2a';
const TEXT = '#ccc';

/* ─── Main Component ─── */
const VantaEditor: React.FC = () => {
  const { files, activeFileId, updateFileContent, showNotification, selectedSelector } = useEditorStore();

  const htmlFile = getTargetHtmlFile(files, activeFileId);
  const jsFile   = getTargetJsFile(files, activeFileId);
  const selectors = useMemo(() => htmlFile ? parseSelectors(htmlFile.content) : ['body'], [htmlFile?.content]);

  const [effectId, setEffectId]       = useState('NET');
  const [selector, setSelector]       = useState('body');
  const [props, setProps]             = useState<Record<string, any>>({});
  const [showCode, setShowCode]       = useState(false);
  const [codeCopied, setCodeCopied]   = useState(false);
  const [appliedMsg, setAppliedMsg]   = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [previewKey, setPreviewKey]   = useState(0);
  const [previewSrc, setPreviewSrc]   = useState('');

  const def = useMemo(() => EFFECTS.find(e => e.id === effectId)!, [effectId]);

  /* Reset props when effect changes */
  useEffect(() => {
    setProps(buildDefaults(def));
  }, [effectId]);

  /* Rebuild preview srcdoc (debounced) */
  const previewDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (previewDebRef.current) clearTimeout(previewDebRef.current);
    previewDebRef.current = setTimeout(() => {
      setPreviewSrc(buildPreviewDoc(effectId, props, def));
    }, 300);
    return () => { if (previewDebRef.current) clearTimeout(previewDebRef.current); };
  }, [props, effectId]);

  const setProp = (key: string, value: any) => setProps(prev => ({ ...prev, [key]: value }));

  const resetProps = () => setProps(buildDefaults(def));

  /* Inject live preview into HTML (debounced) */
  const htmlDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const injectPreview = useCallback(() => {
    if (!htmlFile) return;
    if (htmlDebRef.current) clearTimeout(htmlDebRef.current);
    htmlDebRef.current = setTimeout(() => {
      const code = generateInitCode(effectId, selector, props, def);
      const libScript = def.lib === 'p5'
        ? `<script src="${P5_CDN}"></script>`
        : `<script src="${THREE_CDN}"></script>`;
      const scriptBlock = `${libScript}\n<script src="${VANTA_BASE}/vanta.${effectId.toLowerCase()}.min.js"></script>\n<script>\n${buildInitScript(code)}\n</script>`;
      let html = htmlFile.content;
      html = html.replace(/\n?<!-- vanta-preview-start -->[\s\S]*?<!-- vanta-preview-end -->/g, '');
      html = insertBeforeClosingTag(html, 'body', `\n<!-- vanta-preview-start -->\n${scriptBlock}\n<!-- vanta-preview-end -->`);
      updateFileContent(htmlFile.id, html);
    }, 800);
  }, [htmlFile, effectId, selector, props, def, updateFileContent]);

  const clearPreview = () => {
    if (!htmlFile) return;
    if (htmlDebRef.current) clearTimeout(htmlDebRef.current);
    const cleaned = htmlFile.content.replace(/\n?<!-- vanta-preview-start -->[\s\S]*?<!-- vanta-preview-end -->/g, '');
    updateFileContent(htmlFile.id, cleaned);
    showNotification('Vanta preview removed');
  };

  const applyToProject = () => {
    if (!htmlFile) { showNotification('No HTML file found'); return; }
    let html = htmlFile.content;
    html = html.replace(/\n?<!-- vanta-preview-start -->[\s\S]*?<!-- vanta-preview-end -->/g, '');
    const libScript = def.lib === 'p5' ? P5_CDN : THREE_CDN;
    const effectCdn = `${VANTA_BASE}/vanta.${effectId.toLowerCase()}.min.js`;
    if (!html.includes(libScript.split('/').pop()!)) {
      html = insertBeforeClosingTag(html, 'head', `  <script src="${libScript}"></script>`);
    }
    if (!html.includes(`vanta.${effectId.toLowerCase()}`)) {
      html = insertBeforeClosingTag(html, 'head', `  <script src="${effectCdn}"></script>`);
    }
    updateFileContent(htmlFile.id, html);
    const code = generateInitCode(effectId, selector, props, def);
    const block = `\n\n/* ── Vanta.js ${effectId} on "${selector}" ── */\ndocument.addEventListener('DOMContentLoaded', function() {\n${code}\n});`;
    if (jsFile) {
      const existing = jsFile.content;
      const marker = `/* ── Vanta.js`;
      const cut = existing.indexOf('\n\n' + marker);
      const wrapped = `\n\n/* ── Vanta.js ${effectId} on "${selector}" ── */\n${buildInitScript(code)}`;
      updateFileContent(jsFile.id, cut !== -1 ? existing.slice(0, cut) + wrapped : existing + wrapped);
    } else {
      const withScript = insertBeforeClosingTag(html, 'body', `\n<script>\n${buildInitScript(code)}\n</script>`);
      updateFileContent(htmlFile.id, withScript);
    }
    setAppliedMsg(true);
    showNotification(`✦ Vanta ${effectId} applied to "${selector}"`);
    setTimeout(() => setAppliedMsg(false), 2200);
  };

  const copyCode = () => {
    const code = generateInitCode(effectId, selector, props, def);
    navigator.clipboard.writeText(code).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500); });
  };

  const code = generateInitCode(effectId, selector, props, def);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG, color: TEXT, fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 12, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '8px 12px 7px', flexShrink: 0, background: HDR, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0 }}>V</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e5e5', lineHeight: 1 }}>Vanta.js</div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 1 }}>Animated WebGL backgrounds · vantajs.com</div>
          </div>
          <div style={{ flex: 1 }} />
          <a href="https://www.vantajs.com" target="_blank" rel="noreferrer" title="vantajs.com"
            style={{ color: '#555', display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
            <FiExternalLink size={10} /> docs
          </a>
          <button onClick={clearPreview} title="Remove preview from page"
            style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 4, cursor: 'pointer', color: '#555', padding: '2px 7px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
            <FiRefreshCw size={9} /> Clear
          </button>
          <button onClick={() => setShowCode(p => !p)}
            style={{ background: showCode ? 'rgba(168,85,247,0.12)' : 'none', border: `1px solid ${showCode ? ACCENT + '55' : '#2a2a2a'}`, borderRadius: 4, cursor: 'pointer', color: showCode ? ACCENT : '#555', padding: '2px 7px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
            <FiCode size={9} /> Code
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Live Preview (fills available space) ── */}
        <div style={{ flex: 1, position: 'relative', background: '#0a0a0c', borderBottom: `1px solid ${BORDER}`, minHeight: 120 }}>
          {previewSrc && (
            <iframe
              key={previewKey}
              srcDoc={previewSrc}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              sandbox="allow-scripts"
              title="Vanta preview"
            />
          )}
          {/* Preview label overlay */}
          <div style={{ position: 'absolute', top: 6, right: 8, display: 'flex', gap: 4, pointerEvents: 'none' }}>
            <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.6)', color: '#888', fontWeight: 600 }}>LIVE PREVIEW</span>
            <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: def.lib === 'p5' ? 'rgba(229,164,90,0.3)' : 'rgba(168,85,247,0.3)', color: def.lib === 'p5' ? '#e5a45a' : ACCENT, fontWeight: 600 }}>
              {def.lib === 'p5' ? 'p5.js' : 'three.js'}
            </span>
          </div>
          {/* Refresh preview button */}
          <button onClick={() => setPreviewKey(k => k + 1)}
            title="Restart preview"
            style={{ position: 'absolute', bottom: 6, right: 8, background: 'rgba(0,0,0,0.6)', border: '1px solid #333', borderRadius: 4, cursor: 'pointer', color: '#666', padding: '2px 5px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 2 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}>
            <FiRefreshCw size={8} />
          </button>
          {/* Inject into page button */}
          <button onClick={injectPreview}
            title="Preview in your HTML page"
            style={{ position: 'absolute', bottom: 6, right: 50, background: `rgba(168,85,247,0.15)`, border: `1px solid ${ACCENT}55`, borderRadius: 4, cursor: 'pointer', color: ACCENT, padding: '2px 7px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 2 }}>
            <FiExternalLink size={8} /> In Page
          </button>
          {/* Effect label bottom-left */}
          <div style={{ position: 'absolute', bottom: 6, left: 8, pointerEvents: 'none' }}>
            <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.6)', color: ACCENT, fontWeight: 600 }}>{def.emoji} {def.label}</span>
          </div>
        </div>

        <div style={{ padding: '10px 10px 0', overflowY: 'auto', flexShrink: 0, maxHeight: '55%' }}>

          {/* ── Target Selector ── */}
          <div style={{ marginBottom: 10, position: 'relative' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Target Element</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <button onClick={() => setSelectorOpen(p => !p)}
                  style={{ width: '100%', background: '#111', border: `1px solid ${selectorOpen ? ACCENT + '55' : BORDER}`, borderRadius: 4, padding: '5px 8px', textAlign: 'left', cursor: 'pointer', color: ACCENT, fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{selector}</span>
                  <FiChevronDown size={11} style={{ color: '#666', flexShrink: 0 }} />
                </button>
                {selectorOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1c', border: `1px solid ${BORDER}`, borderRadius: 4, zIndex: 50, maxHeight: 150, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', marginTop: 2 }}>
                    {selectors.map(s => (
                      <div key={s} onClick={() => { setSelector(s); setSelectorOpen(false); }}
                        style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', color: s === selector ? ACCENT : TEXT, background: s === selector ? '#2a1f30' : 'transparent' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#222'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = s === selector ? '#2a1f30' : 'transparent'; }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedSelector && (
                <button onClick={() => { setSelector(selectedSelector); setSelectorOpen(false); }}
                  title={`Use selected: ${selectedSelector}`}
                  style={{ padding: '5px 8px', background: 'rgba(168,85,247,0.1)', border: `1px solid ${ACCENT}44`, borderRadius: 4, cursor: 'pointer', color: ACCENT, fontSize: 9, whiteSpace: 'nowrap' }}>
                  ⊕ Use
                </button>
              )}
            </div>
          </div>

          {/* ── Controls ── */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Properties</span>
              <button onClick={resetProps} title="Reset to defaults"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: 9, display: 'flex', alignItems: 'center', gap: 2 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                <FiRefreshCw size={9} /> reset
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {def.controls.map(ctrl => {
                const val = props[ctrl.key] ?? ctrl.defaultVal;
                if (ctrl.type === 'color') {
                  const hexVal = numToHex(val as number);
                  return (
                    <div key={ctrl.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '5px 8px' }}>
                      <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 4, background: hexVal, border: '1px solid #333', cursor: 'pointer' }} onClick={() => (document.getElementById(`vc-${ctrl.key}`) as HTMLInputElement)?.click()} />
                        <input id={`vc-${ctrl.key}`} type="color" value={hexVal}
                          onChange={e => setProp(ctrl.key, hexToNum(e.target.value))}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                      </div>
                      <span style={{ flex: 1, fontSize: 11, color: '#bbb' }}>{ctrl.label}</span>
                      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#555' }}>0x{(val as number).toString(16).padStart(6, '0').toUpperCase()}</span>
                    </div>
                  );
                }
                if (ctrl.type === 'toggle') {
                  return (
                    <div key={ctrl.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '5px 8px' }}>
                      <span style={{ flex: 1, fontSize: 11, color: '#bbb' }}>{ctrl.label}</span>
                      <div onClick={() => setProp(ctrl.key, !val)}
                        style={{ width: 32, height: 17, borderRadius: 9, background: val ? ACCENT : '#2a2a2a', border: `1px solid ${val ? ACCENT : '#3a3a3a'}`, cursor: 'pointer', position: 'relative', transition: 'background 0.15s' }}>
                        <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: val ? 17 : 2, transition: 'left 0.15s' }} />
                      </div>
                      <span style={{ fontSize: 10, color: val ? ACCENT : '#444', fontWeight: 600, minWidth: 24 }}>{val ? 'ON' : 'OFF'}</span>
                    </div>
                  );
                }
                // range
                const pct = ctrl.min !== undefined && ctrl.max !== undefined ? ((val - ctrl.min) / (ctrl.max - ctrl.min)) * 100 : 0;
                return (
                  <div key={ctrl.key} style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '5px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: '#bbb' }}>{ctrl.label}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: ACCENT, background: 'rgba(168,85,247,0.1)', padding: '1px 5px', borderRadius: 3 }}>{val}</span>
                    </div>
                    <div style={{ position: 'relative', height: 4, borderRadius: 2, background: '#2a2a2a' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`, borderRadius: 2 }} />
                      <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={val}
                        onChange={e => setProp(ctrl.key, parseFloat(e.target.value))}
                        style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%', margin: 0 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: 8, color: '#444' }}>{ctrl.min}</span>
                      <span style={{ fontSize: 8, color: '#444' }}>{ctrl.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Code Panel ── */}
          {showCode && (
            <div style={{ marginBottom: 10, background: '#0d0d0f', border: `1px solid ${BORDER}`, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderBottom: `1px solid ${BORDER}`, background: '#111' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>Generated Code</span>
                <button onClick={copyCode} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', color: codeCopied ? '#88ce02' : '#555', fontSize: 9, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {codeCopied ? <><FiCheck size={8} /> Copied!</> : <><FiCopy size={8} /> Copy</>}
                </button>
              </div>
              <pre style={{ margin: 0, padding: '8px 10px', fontSize: 9, color: ACCENT, fontFamily: 'monospace', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre' }}>{code}</pre>
              <div style={{ padding: '6px 10px', borderTop: `1px solid ${BORDER}`, background: '#0d0d0f' }}>
                <div style={{ fontSize: 8, color: '#444', marginBottom: 3 }}>CDN scripts needed in your HTML:</div>
                <pre style={{ margin: 0, fontSize: 8, color: '#666', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`<script src="${def.lib === 'p5' ? P5_CDN : THREE_CDN}"></script>
<script src="${VANTA_BASE}/vanta.${effectId.toLowerCase()}.min.js"></script>`}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '8px 10px', flexShrink: 0, background: HDR, borderTop: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {def.emoji} <span style={{ color: ACCENT }}>{def.label}</span> → <span style={{ color: '#e5a45a', fontFamily: 'monospace' }}>{selector}</span>
            </div>
          </div>
          <button onClick={applyToProject}
            style={{
              padding: '6px 14px', flexShrink: 0,
              background: appliedMsg ? 'rgba(78,201,176,0.12)' : `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
              border: appliedMsg ? '1px solid rgba(78,201,176,0.35)' : '1px solid transparent',
              borderRadius: 5, cursor: 'pointer',
              color: appliedMsg ? '#4ec9b0' : '#fff',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.2s',
            }}>
            {appliedMsg ? <><FiCheck size={11} /> Applied!</> : <><FiZap size={11} /> Apply to Project</>}
          </button>
        </div>
        {selectedSelector && (
          <button
            onClick={() => {
              setSelector(selectedSelector);
              setTimeout(() => applyToProject(), 0);
            }}
            title={`Apply ${def.label} effect directly to selected element: ${selectedSelector}`}
            style={{
              width: '100%', padding: '6px 10px',
              background: 'rgba(168,85,247,0.08)',
              border: `1px solid ${ACCENT}55`,
              borderRadius: 5, cursor: 'pointer',
              color: ACCENT, fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(168,85,247,0.18)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(168,85,247,0.08)`; }}>
            <FiZap size={11} />
            Apply to Selected Element
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#e5a45a', background: 'rgba(229,164,90,0.1)', padding: '1px 5px', borderRadius: 3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedSelector}
            </span>
          </button>
        )}
      </div>

    </div>
  );
};

export default VantaEditor;
