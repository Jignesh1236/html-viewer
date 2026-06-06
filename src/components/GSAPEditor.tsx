import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { FiCopy, FiCheck, FiChevronDown, FiChevronRight, FiPlus, FiX, FiExternalLink } from 'react-icons/fi';
import { getTargetHtmlFile, getTargetJsFile, insertBeforeClosingTag } from '../utils/projectFiles';

/* ─── Plugin definitions ─── */
interface PluginDef {
  id: string;
  name: string;
  registerAs: string;
  club: boolean;
  cdn: string;
  category: 'core' | 'plugins' | 'eases';
  desc: string;
  icon: string;
}

const BASE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/';
const CLUB_CDN = 'https://assets.codepen.io/16327/';

const PLUGIN_DEFS: PluginDef[] = [
  // Core
  { id: 'gsap', name: 'GSAP Core', registerAs: '', club: false, cdn: BASE_CDN + 'gsap.min.js', category: 'core', desc: 'Core animation engine — required for everything', icon: 'G' },
  // Plugins
  { id: 'Draggable', name: 'Draggable', registerAs: 'Draggable', club: false, cdn: BASE_CDN + 'Draggable.min.js', category: 'plugins', desc: 'Make any element draggable, spinnable, tossable', icon: '⤢' },
  { id: 'DrawSVG', name: 'DrawSVG', registerAs: 'DrawSVGPlugin', club: true, cdn: CLUB_CDN + 'DrawSVGPlugin3.min.js', category: 'plugins', desc: 'Animate SVG stroke-dashoffset for draw-on effect', icon: '✏' },
  { id: 'Easel', name: 'Easel', registerAs: 'EaselPlugin', club: false, cdn: BASE_CDN + 'EaselPlugin.min.js', category: 'plugins', desc: 'CreateJS / EaselJS canvas animation integration', icon: '🎨' },
  { id: 'Flip', name: 'Flip', registerAs: 'Flip', club: false, cdn: BASE_CDN + 'Flip.min.js', category: 'plugins', desc: 'Seamless layout transitions (FLIP technique)', icon: '⟳' },
  { id: 'GSDevTools', name: 'GSDevTools', registerAs: 'GSDevTools', club: true, cdn: CLUB_CDN + 'GSDevTools3.min.js', category: 'plugins', desc: 'Visual debugger / scrubber for GSAP animations', icon: '🛠' },
  { id: 'Inertia', name: 'Inertia', registerAs: 'InertiaPlugin', club: true, cdn: CLUB_CDN + 'InertiaPlugin.min.js', category: 'plugins', desc: 'Natural deceleration / momentum (used by Draggable)', icon: '↝' },
  { id: 'MotionPathHelper', name: 'MotionPathHelper', registerAs: 'MotionPathHelper', club: true, cdn: CLUB_CDN + 'MotionPathHelper.min.js', category: 'plugins', desc: 'GUI editor for MotionPath curves in-browser', icon: '〰' },
  { id: 'MotionPath', name: 'MotionPath', registerAs: 'MotionPathPlugin', club: false, cdn: BASE_CDN + 'MotionPathPlugin.min.js', category: 'plugins', desc: 'Animate elements along an SVG path', icon: '⤴' },
  { id: 'MorphSVG', name: 'MorphSVG', registerAs: 'MorphSVGPlugin', club: true, cdn: CLUB_CDN + 'MorphSVGPlugin3.min.js', category: 'plugins', desc: 'Morph any SVG shape into another', icon: '⬡' },
  { id: 'Observer', name: 'Observer', registerAs: 'Observer', club: false, cdn: BASE_CDN + 'Observer.min.js', category: 'plugins', desc: 'Unified scroll/touch/pointer event observer', icon: '👁' },
  { id: 'Physics2D', name: 'Physics2D', registerAs: 'Physics2DPlugin', club: true, cdn: CLUB_CDN + 'Physics2DPlugin.min.js', category: 'plugins', desc: 'Apply velocity, acceleration, friction in 2D', icon: '🌐' },
  { id: 'PhysicsProps', name: 'PhysicsProps', registerAs: 'PhysicsPropsPlugin', club: true, cdn: CLUB_CDN + 'PhysicsPropsPlugin.min.js', category: 'plugins', desc: 'Physics-based animation for any numeric property', icon: '⚛' },
  { id: 'Pixi', name: 'Pixi', registerAs: 'PixiPlugin', club: false, cdn: BASE_CDN + 'PixiPlugin.min.js', category: 'plugins', desc: 'Animate PixiJS display objects with GSAP', icon: '🎮' },
  { id: 'ScrambleText', name: 'ScrambleText', registerAs: 'ScrambleTextPlugin', club: true, cdn: CLUB_CDN + 'ScrambleTextPlugin3.min.js', category: 'plugins', desc: 'Scramble/reveal text with random characters', icon: 'S?' },
  { id: 'ScrollTrigger', name: 'ScrollTrigger', registerAs: 'ScrollTrigger', club: false, cdn: BASE_CDN + 'ScrollTrigger.min.js', category: 'plugins', desc: 'Trigger animations based on scroll position', icon: '⟳' },
  { id: 'ScrollSmoother', name: 'ScrollSmoother', registerAs: 'ScrollSmoother', club: true, cdn: CLUB_CDN + 'ScrollSmoother.min.js', category: 'plugins', desc: 'Buttery smooth native scrolling with lag effects', icon: '↕' },
  { id: 'ScrollTo', name: 'ScrollTo', registerAs: 'ScrollToPlugin', club: false, cdn: BASE_CDN + 'ScrollToPlugin.min.js', category: 'plugins', desc: 'Animate window or element scroll position', icon: '▼' },
  { id: 'SplitText', name: 'SplitText', registerAs: 'SplitText', club: true, cdn: CLUB_CDN + 'SplitText3.min.js', category: 'plugins', desc: 'Split text into chars / words / lines for animation', icon: 'Aa' },
  { id: 'Text', name: 'Text', registerAs: 'TextPlugin', club: false, cdn: BASE_CDN + 'TextPlugin.min.js', category: 'plugins', desc: 'Animate text content character by character', icon: 'T' },
  // Eases
  { id: 'RoughEase', name: 'RoughEase', registerAs: 'RoughEase', club: true, cdn: CLUB_CDN + 'EasePack3.min.js', category: 'eases', desc: 'Jagged / rough movement ease', icon: '≈' },
  { id: 'ExpoScaleEase', name: 'ExpoScaleEase', registerAs: 'ExpoScaleEase', club: false, cdn: BASE_CDN + 'EasePack.min.js', category: 'eases', desc: 'Logarithmic scale-aware easing', icon: 'e^' },
  { id: 'SlowMo', name: 'SlowMo', registerAs: 'SlowMo', club: true, cdn: CLUB_CDN + 'EasePack3.min.js', category: 'eases', desc: 'Slow in middle, fast at start and end', icon: '∿' },
  { id: 'CustomEase', name: 'CustomEase', registerAs: 'CustomEase', club: false, cdn: BASE_CDN + 'CustomEase.min.js', category: 'eases', desc: 'Draw your own ease with SVG path syntax', icon: '✏' },
  { id: 'CustomBounce', name: 'CustomBounce', registerAs: 'CustomBounce', club: true, cdn: CLUB_CDN + 'CustomBounce3.min.js', category: 'eases', desc: 'Create custom bounce eases', icon: '⌾' },
  { id: 'CustomWiggle', name: 'CustomWiggle', registerAs: 'CustomWiggle', club: true, cdn: CLUB_CDN + 'CustomWiggle3.min.js', category: 'eases', desc: 'Create wiggle/oscillation eases', icon: '≋' },
];

const LS_KEY = 'gsap-plugins-enabled-v1';

function loadEnabled(): Set<string> {
  try {
    const r = localStorage.getItem(LS_KEY);
    if (r) return new Set(JSON.parse(r));
  } catch {}
  return new Set(['gsap', 'ScrollTrigger']);
}
function saveEnabled(s: Set<string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...s])); } catch {}
}

/* ─── Build HTML snippet from enabled plugins ─── */
function buildScriptTags(enabled: Set<string>): { html: string; registerLine: string } {
  const defs = PLUGIN_DEFS.filter(p => enabled.has(p.id));
  const seen = new Set<string>();
  const scripts: string[] = [];
  defs.forEach(p => {
    if (!seen.has(p.cdn)) { seen.add(p.cdn); scripts.push(`<script src="${p.cdn}"></script>`); }
  });
  const toRegister = defs.filter(p => p.registerAs && p.id !== 'gsap').map(p => p.registerAs);
  const registerLine = toRegister.length > 0
    ? `gsap.registerPlugin(${toRegister.join(', ')});`
    : '';
  return { html: scripts.join('\n'), registerLine };
}

/* ─── Category label ─── */
const CAT_LABELS: Record<string, string> = {
  core: 'Core',
  plugins: 'Plugins',
  eases: 'Eases',
};

/* ─── Plugin Row ─── */
function PluginRow({ def, enabled, onToggle }: { def: PluginDef; enabled: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyCdn = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`<script src="${def.cdn}"></script>`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      onClick={def.id !== 'gsap' ? onToggle : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        background: enabled ? 'rgba(136,206,2,0.05)' : 'transparent',
        borderBottom: '1px solid #1e1e20',
        cursor: def.id !== 'gsap' ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (def.id !== 'gsap') (e.currentTarget as HTMLElement).style.background = enabled ? 'rgba(136,206,2,0.08)' : 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = enabled ? 'rgba(136,206,2,0.05)' : 'transparent'; }}
    >
      {/* Toggle */}
      <div style={{
        width: 28, height: 15, borderRadius: 8, flexShrink: 0,
        background: enabled ? '#88ce02' : (def.id === 'gsap' ? '#88ce02' : '#2a2a2a'),
        border: `1px solid ${enabled || def.id === 'gsap' ? '#88ce02' : '#3a3a3a'}`,
        position: 'relative', transition: 'background 0.15s',
        opacity: def.id === 'gsap' ? 0.6 : 1,
      }}>
        <div style={{
          width: 11, height: 11, borderRadius: '50%',
          background: enabled || def.id === 'gsap' ? '#fff' : '#555',
          position: 'absolute', top: 1,
          left: enabled || def.id === 'gsap' ? 14 : 1,
          transition: 'left 0.15s',
        }} />
      </div>

      {/* Icon */}
      <div style={{
        width: 22, height: 22, borderRadius: 4, flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
        background: enabled ? 'rgba(136,206,2,0.15)' : '#1e1e20',
        color: enabled ? '#88ce02' : '#555',
        border: `1px solid ${enabled ? 'rgba(136,206,2,0.3)' : '#2a2a2a'}`,
      }}>
        {def.icon}
      </div>

      {/* Name + desc */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: enabled ? '#e0e0e0' : '#888' }}>{def.name}</span>
          {def.club && (
            <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(229,164,90,0.15)', border: '1px solid rgba(229,164,90,0.35)', color: '#e5a45a', fontWeight: 700, letterSpacing: '0.04em' }}>
              CLUB
            </span>
          )}
        </div>
        <div style={{ fontSize: 9, color: '#555', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.desc}</div>
      </div>

      {/* Copy CDN */}
      <button
        onClick={copyCdn}
        title="Copy CDN script tag"
        style={{
          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: '1px solid #2a2a2a', borderRadius: 4, cursor: 'pointer',
          color: copied ? '#88ce02' : '#444', flexShrink: 0, fontSize: 10,
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#444'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLElement).style.color = copied ? '#88ce02' : '#444'; }}
      >
        {copied ? <FiCheck size={10} /> : <FiCopy size={10} />}
      </button>
    </div>
  );
}

/* ─── Code Output Panel ─── */
function CodeOutput({ enabled }: { enabled: Set<string> }) {
  const [copied, setCopied] = useState(false);
  const { html, registerLine } = buildScriptTags(enabled);
  const full = html + (registerLine ? `\n\n<script>\n${registerLine}\n</script>` : '');

  const copy = () => {
    navigator.clipboard.writeText(full).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div style={{ background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 5, margin: '8px 10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderBottom: '1px solid #1e1e20', background: '#111' }}>
        <span style={{ fontSize: 9, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>Generated HTML</span>
        <button onClick={copy} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', color: copied ? '#88ce02' : '#555', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
          {copied ? <FiCheck size={9} /> : <FiCopy size={9} />} {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '8px 10px', fontSize: 9, color: '#88ce02', fontFamily: 'monospace', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {full || '<script src="…"></script>'}
      </pre>
    </div>
  );
}

/* ─── Main Component ─── */
const GSAPEditor: React.FC = () => {
  const { files, activeFileId, updateFileContent, showNotification } = useEditorStore();
  const [enabled, setEnabled] = useState<Set<string>>(loadEnabled);
  const [showCode, setShowCode] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const htmlFile = getTargetHtmlFile(files, activeFileId);

  useEffect(() => { saveEnabled(enabled); }, [enabled]);

  const togglePlugin = (id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const applyToProject = useCallback(() => {
    if (!htmlFile) { showNotification('No HTML file found'); return; }
    const { html: scriptTags, registerLine } = buildScriptTags(enabled);
    let html = htmlFile.content;

    // Remove any existing gsap CDN scripts we manage
    PLUGIN_DEFS.forEach(p => {
      const escaped = p.cdn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`\\s*<script[^>]*src=["']${escaped}["'][^>]*><\\/script>`, 'gi'), '');
    });

    // Build new script block
    const lines = scriptTags.split('\n').filter(Boolean).map(s => `  ${s}`).join('\n');
    html = insertBeforeClosingTag(html, 'head', lines);

    // Update registerPlugin call in JS and remove stale registrations when disabled.
    const jsFile = getTargetJsFile(files, activeFileId);
    if (jsFile) {
      const cleanedJs = jsFile.content.replace(/gsap\.registerPlugin\([^)]*\);?\n?/g, '');
      const nextJs = registerLine ? `${registerLine}\n\n${cleanedJs}` : cleanedJs;
      if (nextJs !== jsFile.content) updateFileContent(jsFile.id, nextJs);
    }

    updateFileContent(htmlFile.id, html);
    setAppliedMsg(true);
    showNotification(`✦ Applied ${enabled.size} GSAP plugin(s) to HTML`);
    setTimeout(() => setAppliedMsg(false), 2500);
  }, [activeFileId, htmlFile, enabled, files, updateFileContent, showNotification]);

  const cats = ['core', 'plugins', 'eases'] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#141416', color: '#ccc', fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 12, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '8px 12px 8px', flexShrink: 0, background: '#1a1a1c', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: 'linear-gradient(135deg,#88ce02,#0ae448)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#111', flexShrink: 0 }}>G</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e5e5', lineHeight: 1 }}>GSAP Plugins</div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>Toggle plugins · auto-generates CDN scripts</div>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(136,206,2,0.12)', border: '1px solid rgba(136,206,2,0.25)', color: '#88ce02', fontWeight: 700 }}>v3.12.5</span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 10, color: '#88ce02' }}>{enabled.size} enabled</span>
          <span style={{ fontSize: 10, color: '#555' }}>·</span>
          <span style={{ fontSize: 10, color: '#666' }}>{PLUGIN_DEFS.filter(p => enabled.has(p.id) && p.club).length} club</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowCode(s => !s)}
            style={{ fontSize: 9, padding: '2px 7px', background: showCode ? 'rgba(136,206,2,0.1)' : '#1e1e20', border: `1px solid ${showCode ? 'rgba(136,206,2,0.3)' : '#2a2a2a'}`, borderRadius: 3, cursor: 'pointer', color: showCode ? '#88ce02' : '#666', fontFamily: 'inherit' }}>
            {showCode ? 'Hide' : 'Show'} Code
          </button>
        </div>
      </div>

      {/* ── Code output ── */}
      {showCode && <CodeOutput enabled={enabled} />}

      {/* ── Plugin list ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 4 }}>
        {cats.map(cat => {
          const defs = PLUGIN_DEFS.filter(p => p.category === cat);
          const isCollapsed = collapsed.has(cat);
          const activeCount = defs.filter(p => enabled.has(p.id)).length;
          return (
            <div key={cat}>
              {/* Category header */}
              <div
                onClick={() => toggleCategory(cat)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 5px', background: '#1a1a1c', borderBottom: '1px solid #2a2a2a', cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, zIndex: 2 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e1e20'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#1a1a1c'}
              >
                {isCollapsed ? <FiChevronRight size={11} color="#555" /> : <FiChevronDown size={11} color="#555" />}
                <span style={{ fontSize: 10, fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>{CAT_LABELS[cat]}</span>
                <span style={{ fontSize: 9, color: activeCount > 0 ? '#88ce02' : '#444' }}>{activeCount}/{defs.length}</span>
              </div>

              {!isCollapsed && defs.map(def => (
                <PluginRow
                  key={def.id}
                  def={def}
                  enabled={enabled.has(def.id) || def.id === 'gsap'}
                  onToggle={() => togglePlugin(def.id)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Club notice */}
      <div style={{ padding: '6px 10px', background: 'rgba(229,164,90,0.05)', borderTop: '1px solid rgba(229,164,90,0.12)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(229,164,90,0.15)', border: '1px solid rgba(229,164,90,0.3)', color: '#e5a45a', fontWeight: 700 }}>CLUB</span>
        <span style={{ fontSize: 9, color: '#666', flex: 1 }}>Club plugins need a GreenSock membership</span>
        <a href="https://gsap.com/pricing" target="_blank" rel="noreferrer" style={{ color: '#e5a45a', fontSize: 9, display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none' }}>
          gsap.com <FiExternalLink size={8} />
        </a>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #2a2a2a', flexShrink: 0, background: '#1a1a1c' }}>
        <button
          onClick={applyToProject}
          style={{
            width: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: appliedMsg ? 'rgba(78,201,176,0.12)' : 'rgba(136,206,2,0.12)',
            border: `1px solid ${appliedMsg ? 'rgba(78,201,176,0.35)' : 'rgba(136,206,2,0.35)'}`,
            borderRadius: 5, color: appliedMsg ? '#4ec9b0' : '#88ce02',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
          }}
        >
          {appliedMsg ? <><FiCheck size={12} /> Applied to HTML!</> : <><FiPlus size={12} /> Inject into HTML</>}
        </button>
        <div style={{ fontSize: 9, color: '#444', textAlign: 'center', marginTop: 5 }}>
          Adds CDN script tags to your HTML &lt;head&gt;
        </div>
      </div>

    </div>
  );
};

export default GSAPEditor;
