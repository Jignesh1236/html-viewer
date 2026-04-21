import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useContextMenu } from './ContextMenu';
import { FiPlay, FiSquare, FiPlus, FiZoomIn, FiZoomOut, FiX, FiRefreshCw, FiCheck, FiEdit3, FiTrash2, FiSave } from 'react-icons/fi';
import { ANIMATION_PRESETS, ANIMATION_CATEGORIES, KEYFRAMES_MAP, PRESET_BY_NAME } from '../lib/animations';

type Track = import('../store/editorStore').TimelineTrack;
type CustomAnimation = import('../store/editorStore').CustomAnimation;

const COLORS = ['#e5a45a', '#4ec9b0', '#9cdcfe', '#dcdcaa', '#c586c0', '#f44747', '#89d185'];

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

function buildAnimationCSS(tracks: Track[], custom: CustomAnimation[]): string {
  const customMap: Record<string, string> = {};
  custom.forEach(c => { customMap[c.name] = c.keyframes; });
  const usedNames = new Set(tracks.map(t => t.animation).filter(a => a && a !== 'none'));
  const keyframeBlocks = Array.from(usedNames)
    .map(p => customMap[p] || KEYFRAMES_MAP[p] || '')
    .filter(Boolean).join('\n');
  const rules = tracks
    .filter(t => t.animation !== 'none' && t.element.trim())
    .map(t => {
      const iter = t.iteration === 'infinite' ? 'infinite' : parseInt(t.iteration) || 1;
      return `${t.element} { animation: ${t.animation} ${t.duration}s ${t.easing} ${t.delay}s ${iter} normal both !important; will-change: transform, opacity; }`;
    })
    .join('\n');
  return `${keyframeBlocks}\n${rules}`;
}

function injectTimelineCssIntoHtml(html: string, css: string) {
  const cleaned = html.replace(/\n?\s*<style\s+id=["']timeline-animations["'][\s\S]*?<\/style>/i, '');
  if (!css.trim()) return cleaned;
  const block = `<style id="timeline-animations">\n${css}\n</style>`;
  if (cleaned.includes('</head>')) return cleaned.replace('</head>', `${block}\n</head>`);
  return `${block}\n${cleaned}`;
}

const TimelinePanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const {
    animationConfig,
    setAnimationConfig,
    selectedElement,
    setTimelineAnimationStyle,
    files,
    updateFileContent,
    showNotification,
    timelineState,
    setTimelineState,
    selectedSelector,
  } = useEditorStore();
  const { show: showCtx, element: ctxEl } = useContextMenu();

  const tracks = timelineState.tracks;
  const playing = timelineState.playing;
  const currentTime = timelineState.currentTime;
  const animationsApplied = timelineState.animationsApplied;
  const customAnimations = timelineState.customAnimations || [];
  const [zoom, setZoom] = useState(1);
  const [appliedMsg, setAppliedMsg] = useState(false);
  const [showPresetLibrary, setShowPresetLibrary] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomAnimation | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const totalDuration = Math.max(5, ...tracks.map(t => t.delay + t.duration));
  const labelWidth = 160;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const allAnimationNames = useMemo(
    () => [...customAnimations.map(c => c.name), ...ANIMATION_PRESETS.map(p => p.name)],
    [customAnimations]
  );

  const pushAnimationCSS = useCallback((css: string) => {
    setTimelineAnimationStyle('');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTimelineAnimationStyle(css));
    });
  }, [setTimelineAnimationStyle]);

  const persistAnimations = useCallback((css: string) => {
    const htmlFile = files.find(f => f.type === 'html');
    if (!htmlFile) return;
    const updated = injectTimelineCssIntoHtml(htmlFile.content, css);
    if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
  }, [files, updateFileContent]);

  useEffect(() => {
    if (playing) {
      const css = buildAnimationCSS(tracks, customAnimations);
      pushAnimationCSS(css);

      tickRef.current = setInterval(() => {
        setTimelineState(prev => {
          if (prev.currentTime >= totalDuration) {
            return { ...prev, playing: false, currentTime: totalDuration };
          }
          return { ...prev, currentTime: parseFloat((prev.currentTime + 0.05).toFixed(3)) };
        });
      }, 50);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing, tracks, customAnimations, totalDuration, pushAnimationCSS, setTimelineState]);

  useEffect(() => {
    if (!animationsApplied || playing) return;
    const css = buildAnimationCSS(tracks, customAnimations);
    pushAnimationCSS(css);
    persistAnimations(css);
  }, [tracks, customAnimations, animationsApplied, playing, pushAnimationCSS, persistAnimations]);

  const stopAndReset = () => {
    setTimelineState(prev => ({ ...prev, playing: false, currentTime: 0 }));
    pushAnimationCSS(animationsApplied ? buildAnimationCSS(tracks, customAnimations) : '');
  };

  const startPlayback = () => {
    setTimelineState(prev => ({ ...prev, currentTime: 0, playing: true }));
  };

  const applyAnimations = () => {
    const css = buildAnimationCSS(tracks, customAnimations);
    pushAnimationCSS(css);
    persistAnimations(css);
    setTimelineState(prev => ({ ...prev, animationsApplied: true }));
    setAppliedMsg(true);
    showNotification('Timeline animations applied to page');
    setTimeout(() => setAppliedMsg(false), 1800);
  };

  const clearAnimations = () => {
    setTimelineState(prev => ({ ...prev, playing: false, currentTime: 0, animationsApplied: false }));
    setTimelineAnimationStyle('');
    persistAnimations('');
    showNotification('Timeline animations cleared');
  };

  const addTrack = useCallback(() => {
    const id = Date.now().toString();
    const label = selectedElement ? (selectedElement.styles?.selector || (selectedElement.id ? `#${selectedElement.id}` : selectedElement.tagName)) : '.element';
    setTimelineState(prev => {
      const t = prev.tracks;
      const next = [...t, {
        id, element: label,
        animation: animationConfig.preset !== 'none' ? animationConfig.preset : 'fadeIn',
        duration: parseFloat(animationConfig.duration) || 1,
        delay: 0,
        color: COLORS[t.length % COLORS.length],
        easing: animationConfig.easing || 'ease',
        iteration: animationConfig.iteration || '1',
      }];
      return { ...prev, tracks: next };
    });
    setSelectedTrackId(id);
  }, [selectedElement, animationConfig, setTimelineState]);

  const removeTrack = (id: string) => {
    setTimelineState(prev => ({ ...prev, tracks: prev.tracks.filter(tr => tr.id !== id) }));
    setSelectedTrackId(curr => curr === id ? null : curr);
  };
  const updateTrack = (id: string, update: Partial<Track>) =>
    setTimelineState(prev => ({
      ...prev,
      tracks: prev.tracks.map(tr => tr.id === id ? { ...tr, ...update } : tr),
    }));

  const applyPreset = (preset: string) => {
    if (selectedTrackId) {
      const meta = PRESET_BY_NAME[preset];
      updateTrack(selectedTrackId, {
        animation: preset,
        ...(meta ? { duration: meta.defaultDuration, easing: meta.defaultEasing, iteration: meta.defaultIteration || '1' } : {}),
      });
    }
    setAnimationConfig({ preset });
  };

  /* ── Custom animation CRUD ── */
  const saveCustomAnimation = (anim: CustomAnimation, originalName?: string) => {
    if (!anim.name.trim() || !anim.keyframes.trim()) {
      showNotification('Custom animation needs a name and keyframes');
      return;
    }
    setTimelineState(prev => {
      const list = prev.customAnimations || [];
      const filtered = originalName ? list.filter(c => c.name !== originalName) : list.filter(c => c.name !== anim.name);
      return { ...prev, customAnimations: [...filtered, anim] };
    });
    setEditingCustom(null);
    setShowCustomEditor(false);
    showNotification(`Custom animation "${anim.name}" saved`);
  };

  const deleteCustomAnimation = (name: string) => {
    setTimelineState(prev => ({
      ...prev,
      customAnimations: (prev.customAnimations || []).filter(c => c.name !== name),
    }));
    showNotification(`Deleted "${name}"`);
  };

  /* ── Drag handlers ── */
  const startTrackDrag = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedTrackId(trackId);
    const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
    const scaledW = contentW * zoom;
    const startX = e.clientX;
    const initTrack = tracksRef.current.find(t => t.id === trackId);
    if (!initTrack) return;
    const initDelay = initTrack.delay;
    const trackDuration = initTrack.duration;
    showDragCapture('grab');
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dT = (dx / scaledW) * totalDuration;
      const newDelay = Math.max(0, Math.min(totalDuration - trackDuration, initDelay + dT));
      setTimelineState(prev => ({
        ...prev,
        tracks: prev.tracks.map(tr => tr.id === trackId ? { ...tr, delay: parseFloat(newDelay.toFixed(2)) } : tr),
      }));
    };
    const onUp = () => { hideDragCapture(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration, setTimelineState]);

  const startResizeDuration = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedTrackId(trackId);
    const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
    const scaledW = contentW * zoom;
    const startX = e.clientX;
    const initTrack = tracksRef.current.find(t => t.id === trackId);
    if (!initTrack) return;
    const initDuration = initTrack.duration;
    const initDelay = initTrack.delay;
    showDragCapture('e-resize');
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dT = (dx / scaledW) * totalDuration;
      const newDur = Math.max(0.1, Math.min(totalDuration - initDelay, initDuration + dT));
      setTimelineState(prev => ({
        ...prev,
        tracks: prev.tracks.map(tr => tr.id === trackId ? { ...tr, duration: parseFloat(newDur.toFixed(2)) } : tr),
      }));
    };
    const onUp = () => { hideDragCapture(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration, setTimelineState]);

  const seekTo = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setTimelineState(prev => ({ ...prev, currentTime: Math.max(0, Math.min(totalDuration, pct * totalDuration)) }));
  };

  const trackContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    showCtx(e, [
      { label: `Track: ${track.element}`, disabled: true },
      { separator: true, label: '' },
      { label: 'Duplicate', icon: '📋', action: () => setTimelineState(prev => ({ ...prev, tracks: [...prev.tracks, { ...track, id: Date.now().toString(), delay: Math.min(track.delay + 0.2, totalDuration - track.duration) }] })) },
      { label: 'Reset to start', icon: '↩️', action: () => updateTrack(track.id, { delay: 0 }) },
      { separator: true, label: '' },
      { label: 'Delete track', icon: '🗑️', danger: true, action: () => removeTrack(track.id) },
    ]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(8, z + (e.deltaY < 0 ? 0.25 : -0.25))));
    }
  };

  const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
  const scaledContentW = contentW * zoom;
  const tickInterval = zoom < 1 ? 1 : zoom < 2 ? 0.5 : zoom < 4 ? 0.25 : 0.1;
  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration + tickInterval / 2; t = parseFloat((t + tickInterval).toFixed(3))) {
    ticks.push(parseFloat(t.toFixed(3)));
  }

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  const selectedCandidates = new Set<string>(
    [
      selectedSelector?.trim() || '',
      selectedElement?.styles?.selector?.trim() || '',
      selectedElement?.id ? `#${selectedElement.id}` : '',
      selectedElement?.className
        ? `.${selectedElement.className.trim().split(/\s+/).filter(Boolean).join('.')}`
        : '',
      selectedElement?.tagName?.toLowerCase() || '',
    ].filter(Boolean)
  );

  const isTrackSelectedElement = (track: Track) => selectedCandidates.has(track.element.trim());

  useEffect(() => {
    if (selectedCandidates.size === 0) return;
    const matched = tracks.find(t => isTrackSelectedElement(t));
    if (matched) setSelectedTrackId(matched.id);
  }, [tracks, selectedSelector, selectedElement]);

  const filteredPresets = activeCategory === 'All'
    ? ANIMATION_PRESETS
    : ANIMATION_PRESETS.filter(p => p.category === activeCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a1a', overflow: 'hidden' }} onWheel={handleWheel}>

      {/* ── Header ── */}
      <div
        style={{ height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', background: '#252526', borderBottom: '1px solid #3e3e3e', userSelect: 'none' }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#888', marginRight: 2 }}>Timeline</span>

        <button title="Add Track (uses selected element)" onClick={addTrack} style={hdrBtn}>
          <FiPlus size={13} />
        </button>

        <div style={{ width: 1, height: 16, background: '#3e3e3e', margin: '0 2px' }} />

        <button
          title={playing ? 'Stop' : 'Play — previews animations on page'}
          onClick={() => { if (playing) stopAndReset(); else startPlayback(); }}
          style={{ ...hdrBtn, color: playing ? '#e5a45a' : '#666', background: playing ? 'rgba(229,164,90,0.12)' : 'none', borderRadius: 4 }}
        >
          {playing ? <FiSquare size={12} /> : <FiPlay size={12} />}
        </button>

        <span style={{ fontSize: 11, color: '#777', fontFamily: 'monospace', minWidth: 44, padding: '0 4px' }}>
          {currentTime.toFixed(2)}s
        </span>

        <button title="Reset Playhead" onClick={stopAndReset} style={hdrBtn}>
          <FiRefreshCw size={12} />
        </button>

        <div style={{ width: 1, height: 16, background: '#3e3e3e', margin: '0 2px' }} />

        <button
          title="Browse 50+ pre-built animations"
          onClick={() => setShowPresetLibrary(s => !s)}
          style={{
            ...hdrBtn, width: 'auto', padding: '0 8px', fontSize: 10, fontWeight: 600,
            color: showPresetLibrary ? '#e5a45a' : '#999',
            background: showPresetLibrary ? 'rgba(229,164,90,0.15)' : 'none',
            border: `1px solid ${showPresetLibrary ? 'rgba(229,164,90,0.4)' : '#3e3e3e'}`,
            borderRadius: 4,
          }}
        >Library ({ANIMATION_PRESETS.length})</button>

        <button
          title="Create your own custom animation with @keyframes"
          onClick={() => { setEditingCustom({ name: '', keyframes: '@keyframes myAnim {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}' }); setShowCustomEditor(true); }}
          style={{
            ...hdrBtn, width: 'auto', padding: '0 8px', fontSize: 10, fontWeight: 600,
            color: '#9cdcfe',
            background: 'rgba(156,220,254,0.08)',
            border: '1px solid rgba(156,220,254,0.3)',
            borderRadius: 4, gap: 4, display: 'flex', alignItems: 'center',
          }}
        ><FiPlus size={11} /> Custom</button>

        <button
          title="Apply all animations to page now"
          onClick={applyAnimations}
          style={{
            ...hdrBtn, width: 'auto', padding: '0 8px', fontSize: 10, fontWeight: 600,
            color: appliedMsg ? '#4ec9b0' : '#e5a45a',
            background: appliedMsg ? 'rgba(78,201,176,0.1)' : 'rgba(229,164,90,0.1)',
            border: `1px solid ${appliedMsg ? 'rgba(78,201,176,0.3)' : 'rgba(229,164,90,0.3)'}`,
            borderRadius: 4, gap: 4, display: 'flex', alignItems: 'center',
          }}
        >
          {appliedMsg ? <><FiCheck size={11} /> Applied!</> : <>Apply to Page</>}
        </button>

        <button
          title="Clear animations from page"
          onClick={clearAnimations}
          style={{ ...hdrBtn, fontSize: 10, color: '#555', width: 'auto', padding: '0 4px' }}
        >↺</button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 10, color: '#555' }}>Zoom</span>
        <button title="Zoom Out" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} style={hdrBtn}><FiZoomOut size={13} /></button>
        <span style={{ fontSize: 11, color: '#666', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button title="Zoom In" onClick={() => setZoom(z => Math.min(8, z + 0.5))} style={hdrBtn}><FiZoomIn size={13} /></button>
        <button title="Reset Zoom" onClick={() => setZoom(1)} style={{ ...hdrBtn, fontSize: 10, color: '#777', width: 'auto', padding: '0 6px' }}>1:1</button>

        {onClose && (
          <>
            <div style={{ width: 1, height: 16, background: '#3e3e3e', margin: '0 4px' }} />
            <button title="Close Timeline" onClick={onClose} style={hdrBtn}><FiX size={13} /></button>
          </>
        )}
      </div>

      {/* ── Preset Library Panel ── */}
      {showPresetLibrary && (
        <div style={{ flexShrink: 0, maxHeight: 260, borderBottom: '1px solid #3e3e3e', background: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 10px', display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid #2d2d2d', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#666', marginRight: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Categories:</span>
            {['All', ...ANIMATION_CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '2px 9px', fontSize: 10, borderRadius: 11, cursor: 'pointer',
                  background: activeCategory === cat ? 'rgba(229,164,90,0.18)' : '#252526',
                  border: `1px solid ${activeCategory === cat ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`,
                  color: activeCategory === cat ? '#e5a45a' : '#999', fontWeight: 500,
                }}
              >{cat}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowPresetLibrary(false)} style={hdrBtn}><FiX size={11} /></button>
          </div>
          <div style={{ overflowY: 'auto', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
            {filteredPresets.map(p => (
              <button
                key={p.name}
                onClick={() => applyPreset(p.name)}
                title={p.description}
                style={{
                  padding: '8px 10px', textAlign: 'left',
                  background: animationConfig.preset === p.name ? 'rgba(229,164,90,0.12)' : '#252526',
                  border: `1px solid ${animationConfig.preset === p.name ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`,
                  borderRadius: 5, cursor: 'pointer', color: '#ccc',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#666')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = animationConfig.preset === p.name ? 'rgba(229,164,90,0.5)' : '#3e3e3e')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: animationConfig.preset === p.name ? '#e5a45a' : '#ddd' }}>{p.name}</span>
                  <span style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.category}</span>
                </div>
                <span style={{ fontSize: 9, color: '#888', lineHeight: 1.35, whiteSpace: 'normal' }}>{p.description}</span>
              </button>
            ))}
            {customAnimations.length > 0 && activeCategory === 'All' && (
              <>
                <div style={{ gridColumn: '1 / -1', fontSize: 10, color: '#9cdcfe', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 6 }}>Your Custom Animations</div>
                {customAnimations.map(c => (
                  <div key={c.name}
                    style={{
                      padding: '8px 10px',
                      background: animationConfig.preset === c.name ? 'rgba(156,220,254,0.12)' : '#252526',
                      border: `1px solid ${animationConfig.preset === c.name ? 'rgba(156,220,254,0.5)' : '#3e3e3e'}`,
                      borderRadius: 5, color: '#ccc', display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => applyPreset(c.name)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: '#9cdcfe', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{c.name}</button>
                      <button onClick={() => { setEditingCustom(c); setShowCustomEditor(true); }} title="Edit" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 2 }}><FiEdit3 size={11} /></button>
                      <button onClick={() => deleteCustomAnimation(c.name)} title="Delete" style={{ background: 'none', border: 'none', color: '#f88', cursor: 'pointer', padding: 2 }}><FiTrash2 size={11} /></button>
                    </div>
                    <span style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Custom Animation Editor Modal ── */}
      {showCustomEditor && editingCustom && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setShowCustomEditor(false); setEditingCustom(null); }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#1e1e1e', border: '1px solid #3e3e3e', borderRadius: 8, width: 'min(560px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #3e3e3e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiEdit3 size={14} color="#9cdcfe" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {editingCustom.name ? `Edit "${editingCustom.name}"` : 'Create Custom Animation'}
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setShowCustomEditor(false); setEditingCustom(null); }} style={hdrBtn}><FiX size={13} /></button>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              <div>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Animation Name</div>
                <input
                  value={editingCustom.name}
                  onChange={e => setEditingCustom({ ...editingCustom, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                  placeholder="myAwesomeAnim"
                  style={{ width: '100%', background: '#252526', border: '1px solid #3e3e3e', borderRadius: 4, padding: '6px 9px', fontSize: 12, color: '#ccc', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 9, color: '#666', marginTop: 3 }}>Letters, numbers, dash and underscore only.</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>@keyframes Definition</div>
                <textarea
                  value={editingCustom.keyframes}
                  onChange={e => setEditingCustom({ ...editingCustom, keyframes: e.target.value })}
                  placeholder={`@keyframes ${editingCustom.name || 'myAnim'} {\n  from { opacity: 0; transform: scale(0.5); }\n  to   { opacity: 1; transform: scale(1); }\n}`}
                  rows={12}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #3e3e3e', borderRadius: 4, padding: 10, fontSize: 11, color: '#dcdcaa', outline: 'none', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
                <div style={{ fontSize: 9, color: '#666', marginTop: 3, lineHeight: 1.5 }}>
                  Use percentages or <code style={{ color: '#9cdcfe' }}>from / to</code>. The <code style={{ color: '#9cdcfe' }}>@keyframes</code> name should match the Animation Name above.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: '#666', alignSelf: 'center', marginRight: 4 }}>Quick insert:</span>
                {[
                  { label: 'Fade', tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  from { opacity: 0; }\n  to   { opacity: 1; }\n}` },
                  { label: 'Bounce', tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-30px); }\n}` },
                  { label: 'Glow', tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%, 100% { box-shadow: 0 0 4px #fff; }\n  50% { box-shadow: 0 0 24px #fff; }\n}` },
                  { label: 'Color', tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%   { background-color: #ff5252; }\n  50%  { background-color: #4caf50; }\n  100% { background-color: #ff5252; }\n}` },
                ].map(t => (
                  <button key={t.label} onClick={() => setEditingCustom({ ...editingCustom, keyframes: t.tpl(editingCustom.name) })}
                    style={{ padding: '3px 9px', fontSize: 10, background: '#252526', border: '1px solid #3e3e3e', borderRadius: 11, color: '#999', cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid #3e3e3e', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowCustomEditor(false); setEditingCustom(null); }}
                style={{ padding: '6px 14px', background: 'none', border: '1px solid #3e3e3e', borderRadius: 4, color: '#888', cursor: 'pointer', fontSize: 11 }}>
                Cancel
              </button>
              <button onClick={() => saveCustomAnimation(editingCustom, editingCustom.name && customAnimations.find(c => c.name === editingCustom.name) ? editingCustom.name : undefined)}
                style={{ padding: '6px 14px', background: 'rgba(78,201,176,0.15)', border: '1px solid rgba(78,201,176,0.4)', borderRadius: 4, color: '#4ec9b0', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FiSave size={11} /> Save Animation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main area: track list + properties ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        <div ref={timelineRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <div style={{ minWidth: labelWidth + scaledContentW, position: 'relative' }}>

            <div style={{ display: 'flex', height: 26, background: '#1e1e1e', borderBottom: '1px solid #3e3e3e', position: 'sticky', top: 0, zIndex: 5 }}>
              <div style={{ width: labelWidth, flexShrink: 0, borderRight: '1px solid #3e3e3e', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                <span style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Element / Selector</span>
              </div>
              <div style={{ flex: 1, position: 'relative', cursor: 'pointer' }} onClick={seekTo}>
                {ticks.map((t, i) => {
                  const pct = (t / totalDuration) * 100;
                  const isMajor = Math.abs(t % 1) < 0.001;
                  const isMid = Math.abs(t % 0.5) < 0.001;
                  return (
                    <div key={i} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, borderLeft: `1px solid ${isMajor ? 'rgba(255,255,255,0.2)' : isMid ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`, display: 'flex', alignItems: 'flex-end', paddingBottom: 3, pointerEvents: 'none' }}>
                      {isMajor && <span style={{ fontSize: 9, color: '#777', paddingLeft: 2, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{t.toFixed(0)}s</span>}
                      {!isMajor && isMid && <span style={{ fontSize: 8, color: '#555', paddingLeft: 2, pointerEvents: 'none', whiteSpace: 'nowrap' }}>.5</span>}
                    </div>
                  );
                })}
                <div style={{ position: 'absolute', left: `${(currentTime / totalDuration) * 100}%`, top: 0, bottom: 0, width: 1, background: '#e5a45a', zIndex: 10, pointerEvents: 'none' }}>
                  <div style={{ width: 10, height: 10, background: '#e5a45a', borderRadius: '50%', transform: 'translate(-4.5px, -3px)' }} />
                </div>
              </div>
            </div>

            {tracks.map(track => {
              const isSelected = selectedTrackId === track.id;
              const isLinkedToSelectedElement = isTrackSelectedElement(track);
              const isCustom = customAnimations.some(c => c.name === track.animation);
              return (
                <div
                  key={track.id}
                  style={{
                    display: 'flex',
                    height: 36,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isSelected
                      ? 'rgba(255,255,255,0.08)'
                      : isLinkedToSelectedElement
                        ? 'rgba(229,164,90,0.12)'
                        : 'transparent',
                    boxShadow: isLinkedToSelectedElement ? 'inset 2px 0 0 #e5a45a' : 'none',
                    cursor: 'default',
                  }}
                  onClick={() => setSelectedTrackId(track.id)}
                  onContextMenu={e => trackContextMenu(e, track)}
                >
                  <div style={{ width: labelWidth, flexShrink: 0, borderRight: '1px solid #3e3e3e', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 5, overflow: 'hidden' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: track.color, flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.element}</div>
                      <div style={{ fontSize: 9, color: '#666' }}>
                        {isCustom && <span style={{ color: '#9cdcfe', marginRight: 3 }}>★</span>}
                        {track.animation} {track.duration}s +{track.delay}s
                      </div>
                    </div>
                    <button title="Delete track" onClick={e => { e.stopPropagation(); removeTrack(track.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 2, display: 'flex', borderRadius: 2, flexShrink: 0 }}>
                      <FiX size={11} />
                    </button>
                  </div>

                  <div style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
                    <div style={{ position: 'absolute', left: `${(currentTime / totalDuration) * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(229,164,90,0.25)', zIndex: 3, pointerEvents: 'none' }} />
                    <div
                      title={`${track.animation} — delay: ${track.delay}s, duration: ${track.duration}s\nDrag to move • Drag right edge to resize duration`}
                      style={{ position: 'absolute', left: `${(track.delay / totalDuration) * 100}%`, width: `${(track.duration / totalDuration) * 100}%`, top: 5, bottom: 5, background: `linear-gradient(90deg, ${track.color}22, ${track.color}55)`, border: `1px solid ${track.color}99`, borderRadius: 3, cursor: 'grab', zIndex: 2, display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 6 }}
                      onMouseDown={e => startTrackDrag(e, track.id)}
                    >
                      <span style={{ fontSize: 9, color: track.color, padding: '0 5px', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'none', fontWeight: 600 }}>{track.animation}</span>
                      <div style={{ position: 'absolute', left: -1, top: '50%', transform: 'translate(-4px, -4px)', width: 8, height: 8, background: track.color, borderRadius: '50%', pointerEvents: 'none', zIndex: 4 }} />
                      <div title="Drag right to change duration" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'e-resize', background: `${track.color}33`, zIndex: 3, borderLeft: `1px dashed ${track.color}66` }} onMouseDown={e => { e.stopPropagation(); startResizeDuration(e, track.id); }} />
                      <div style={{ position: 'absolute', right: -1, top: '50%', transform: 'translate(4px, -4px)', width: 8, height: 8, background: track.color, borderRadius: '50%', pointerEvents: 'none', zIndex: 4 }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {tracks.length === 0 && (
              <div style={{ padding: '20px', fontSize: 12, color: '#555', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>No animation tracks.</div>
                <div>Click <strong style={{ color: '#888' }}>+</strong> to add a track, or browse <strong style={{ color: '#e5a45a' }}>Library</strong> for {ANIMATION_PRESETS.length}+ pre-built animations.</div>
              </div>
            )}
          </div>
        </div>

        {selectedTrack && (
          <div style={{ width: 200, flexShrink: 0, borderLeft: '1px solid #3e3e3e', overflowY: 'auto', background: '#1e1e1e', padding: '8px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Track Properties</div>

            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>CSS Selector</div>
              <input
                value={selectedTrack.element}
                onChange={e => updateTrack(selectedTrack.id, { element: e.target.value })}
                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #3e3e3e', borderRadius: 3, padding: '3px 6px', fontSize: 11, color: '#ccc', outline: 'none', boxSizing: 'border-box' }}
                placeholder=".classname, #id, tag"
              />
            </div>

            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>Animation</div>
              <select value={selectedTrack.animation} onChange={e => { updateTrack(selectedTrack.id, { animation: e.target.value }); setAnimationConfig({ preset: e.target.value }); }}
                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #3e3e3e', borderRadius: 3, padding: '3px 6px', fontSize: 11, color: '#ccc', outline: 'none' }}>
                <option value="none">none</option>
                {customAnimations.length > 0 && (
                  <optgroup label="★ Custom">
                    {customAnimations.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </optgroup>
                )}
                {ANIMATION_CATEGORIES.map(cat => (
                  <optgroup key={cat} label={cat}>
                    {ANIMATION_PRESETS.filter(p => p.category === cat).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>Duration: {selectedTrack.duration.toFixed(1)}s</div>
              <input type="range" min="0.1" max="10" step="0.1" value={selectedTrack.duration}
                onChange={e => updateTrack(selectedTrack.id, { duration: parseFloat(e.target.value) })}
                style={{ width: '100%' }} />
            </div>

            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>Delay: {selectedTrack.delay.toFixed(1)}s</div>
              <input type="range" min="0" max="8" step="0.1" value={selectedTrack.delay}
                onChange={e => updateTrack(selectedTrack.id, { delay: parseFloat(e.target.value) })}
                style={{ width: '100%' }} />
            </div>

            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>Easing</div>
              <select value={selectedTrack.easing} onChange={e => updateTrack(selectedTrack.id, { easing: e.target.value })}
                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #3e3e3e', borderRadius: 3, padding: '3px 6px', fontSize: 11, color: '#ccc', outline: 'none' }}>
                {['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.68,-0.55,0.27,1.55)', 'cubic-bezier(0.215,0.61,0.355,1)', 'steps(4, end)', 'steps(10, end)'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>Repeat</div>
              <select value={selectedTrack.iteration} onChange={e => updateTrack(selectedTrack.id, { iteration: e.target.value })}
                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #3e3e3e', borderRadius: 3, padding: '3px 6px', fontSize: 11, color: '#ccc', outline: 'none' }}>
                {['1', '2', '3', '5', '10', 'infinite'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            <button
              onClick={() => { setSelectedTrackId(null); removeTrack(selectedTrack.id); }}
              style={{ width: '100%', padding: '4px', background: 'rgba(248,136,136,0.1)', border: '1px solid rgba(248,136,136,0.3)', borderRadius: 3, color: '#f88', fontSize: 10, cursor: 'pointer' }}
            >Delete Track</button>
          </div>
        )}
      </div>

      <div style={{ height: 32, flexShrink: 0, borderTop: '1px solid #3e3e3e', background: '#252526', display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', flexWrap: 'nowrap', overflow: 'hidden' }}>
        <span style={{ fontSize: 10, color: '#666', flexShrink: 0 }}>Quick:</span>
        {['fadeIn', 'slideUp', 'bounce', 'pulse', 'zoom', 'spin', 'shake', 'flip'].map(p => (
          <button key={p} onClick={() => applyPreset(p)}
            style={{ padding: '2px 7px', fontSize: 10, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: animationConfig.preset === p ? 'rgba(229,164,90,0.15)' : '#1a1a1a', border: `1px solid ${animationConfig.preset === p ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`, color: animationConfig.preset === p ? '#e5a45a' : '#777', fontFamily: 'inherit' }}>
            {p}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: animationsApplied ? '#4ec9b0' : '#444' }}>
          {tracks.length} tracks • {ANIMATION_PRESETS.length} presets • {customAnimations.length} custom • {animationsApplied ? 'applied' : 'not applied'}
        </span>
      </div>

      {ctxEl}
    </div>
  );
};

const hdrBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, background: 'none', border: 'none',
  cursor: 'pointer', color: '#666', borderRadius: 4, flexShrink: 0,
};

export default TimelinePanel;
