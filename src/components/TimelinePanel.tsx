import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useContextMenu } from './ContextMenu';
import { FiPlay, FiSquare, FiPlus, FiZoomIn, FiZoomOut, FiX, FiRefreshCw } from 'react-icons/fi';

interface Track {
  id: string;
  element: string;
  animation: string;
  duration: number;
  delay: number;
  color: string;
}

const COLORS = ['#e5a45a', '#4ec9b0', '#9cdcfe', '#dcdcaa', '#c586c0', '#f44747', '#89d185'];
const PRESETS = ['none', 'fadeIn', 'slideUp', 'slideLeft', 'slideRight', 'bounce', 'pulse', 'spin', 'zoom', 'shake', 'flip'];

/* Global drag capture helpers */
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

const TimelinePanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { animationConfig, setAnimationConfig, selectedElement, setPanels } = useEditorStore();
  const { show: showCtx, element: ctxEl } = useContextMenu();

  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', element: '.hero', animation: 'fadeIn', duration: 1.2, delay: 0, color: COLORS[0] },
    { id: '2', element: 'h2', animation: 'slideUp', duration: 0.8, delay: 0.3, color: COLORS[1] },
    { id: '3', element: '.btn', animation: 'zoom', duration: 0.5, delay: 0.8, color: COLORS[2] },
    { id: '4', element: '.card', animation: 'fadeIn', duration: 0.6, delay: 1.0, color: COLORS[3] },
  ]);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const totalDuration = 5;
  const labelWidth = 140;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  /* ── Playback ── */
  useEffect(() => {
    if (playing) {
      tickRef.current = setInterval(() => {
        setCurrentTime(t => {
          if (t >= totalDuration) { setPlaying(false); return 0; }
          return parseFloat((t + 0.05).toFixed(3));
        });
      }, 50);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing, totalDuration]);

  const addTrack = useCallback(() => {
    const id = Date.now().toString();
    const label = selectedElement ? `<${selectedElement.tagName}>` : 'element';
    setTracks(t => [...t, {
      id, element: label,
      animation: animationConfig.preset || 'fadeIn',
      duration: parseFloat(animationConfig.duration) || 1,
      delay: 0,
      color: COLORS[t.length % COLORS.length],
    }]);
  }, [selectedElement, animationConfig]);

  const removeTrack = (id: string) => setTracks(t => t.filter(tr => tr.id !== id));
  const updateTrack = (id: string, update: Partial<Track>) =>
    setTracks(t => t.map(tr => tr.id === id ? { ...tr, ...update } : tr));

  /* ── Track drag (move delay) — uses ref to avoid stale closure ── */
  const startTrackDrag = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
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
      setTracks(ts => ts.map(tr => tr.id === trackId ? { ...tr, delay: parseFloat(newDelay.toFixed(2)) } : tr));
    };
    const onUp = () => {
      hideDragCapture();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration, labelWidth]);

  /* ── Track resize (duration) ── */
  const startResizeDuration = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault(); e.stopPropagation();
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
      setTracks(ts => ts.map(tr => tr.id === trackId ? { ...tr, duration: parseFloat(newDur.toFixed(2)) } : tr));
    };
    const onUp = () => {
      hideDragCapture();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration, labelWidth]);

  /* ── Click on ruler to seek ── */
  const seekTo = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setCurrentTime(Math.max(0, Math.min(totalDuration, pct * totalDuration)));
  };

  /* ── Track context menu ── */
  const trackContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    showCtx(e, [
      { label: `Track: ${track.element}`, disabled: true },
      { separator: true, label: '' },
      { label: 'Duplicate', icon: '📋', action: () => setTracks(t => [...t, { ...track, id: Date.now().toString(), delay: Math.min(track.delay + 0.2, totalDuration - track.duration) }]) },
      { label: 'Reset to start', icon: '↩️', action: () => updateTrack(track.id, { delay: 0 }) },
      { separator: true, label: '' },
      { label: '— Change Animation —', disabled: true },
      ...PRESETS.filter(p => p !== 'none').map(p => ({
        label: p, icon: track.animation === p ? '✓' : '',
        action: () => updateTrack(track.id, { animation: p })
      })),
      { separator: true, label: '' },
      { label: 'Delete track', icon: '🗑️', danger: true, action: () => removeTrack(track.id) },
    ]);
  };

  /* ── Zoom on Ctrl+scroll ── */
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(8, z + (e.deltaY < 0 ? 0.25 : -0.25))));
    }
  };

  /* ── Ruler ticks ── */
  const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
  const scaledContentW = contentW * zoom;
  const tickInterval = zoom < 1 ? 1 : zoom < 2 ? 0.5 : zoom < 4 ? 0.25 : 0.1;
  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration + tickInterval / 2; t = parseFloat((t + tickInterval).toFixed(3))) {
    ticks.push(parseFloat(t.toFixed(3)));
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a1a', overflow: 'hidden' }}
      onWheel={handleWheel}
    >
      {/* Header */}
      <div
        style={{
          height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
          padding: '0 8px', background: '#252526', borderBottom: '1px solid #3e3e3e',
          userSelect: 'none',
        }}
        onContextMenu={e => {
          e.preventDefault();
          showCtx(e, [
            { label: 'Add Track', icon: '➕', action: addTrack },
            { label: playing ? 'Stop' : 'Play', icon: playing ? '⏹' : '▶', action: () => setPlaying(!playing) },
            { separator: true, label: '' },
            { label: 'Zoom In (Ctrl+Scroll)', icon: '+', action: () => setZoom(z => Math.min(8, z + 0.5)) },
            { label: 'Zoom Out (Ctrl+Scroll)', icon: '-', action: () => setZoom(z => Math.max(0.5, z - 0.5)) },
            { label: 'Reset Zoom', icon: '↺', action: () => setZoom(1) },
            { separator: true, label: '' },
            { label: 'Clear All Tracks', icon: '🗑️', danger: true, action: () => setTracks([]) },
            { label: 'Close Timeline', icon: '✕', action: onClose },
          ]);
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#888', marginRight: 4 }}>
          Timeline
        </span>

        <button title="Add Track" onClick={addTrack} style={hdrBtn}>
          <FiPlus size={13} />
        </button>

        <div style={{ width: 1, height: 16, background: '#3e3e3e', margin: '0 2px' }} />

        <button title={playing ? 'Stop' : 'Play'} onClick={() => setPlaying(!playing)} style={{ ...hdrBtn, color: playing ? '#e5a45a' : '#666' }}>
          {playing ? <FiSquare size={12} /> : <FiPlay size={12} />}
        </button>

        <span style={{ fontSize: 11, color: '#777', fontFamily: 'monospace', minWidth: 44, padding: '0 4px' }}>
          {currentTime.toFixed(2)}s
        </span>

        <button title="Reset Playhead" onClick={() => { setCurrentTime(0); setPlaying(false); }} style={hdrBtn}>
          <FiRefreshCw size={12} />
        </button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 10, color: '#555' }}>Zoom</span>
        <button title="Zoom Out (Ctrl+Scroll)" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} style={hdrBtn}>
          <FiZoomOut size={13} />
        </button>
        <span style={{ fontSize: 11, color: '#666', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button title="Zoom In (Ctrl+Scroll)" onClick={() => setZoom(z => Math.min(8, z + 0.5))} style={hdrBtn}>
          <FiZoomIn size={13} />
        </button>
        <button title="Reset Zoom (1:1)" onClick={() => setZoom(1)} style={{ ...hdrBtn, fontSize: 10, color: '#777', width: 'auto', padding: '0 6px' }}>
          1:1
        </button>

        {onClose && (
          <>
            <div style={{ width: 1, height: 16, background: '#3e3e3e', margin: '0 4px' }} />
            <button
              title="Close Timeline"
              onClick={onClose}
              style={hdrBtn}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f88'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,80,80,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#666'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <FiX size={13} />
            </button>
          </>
        )}
      </div>

      {/* Timeline content — scrollable horizontally */}
      <div
        ref={timelineRef}
        style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
      >
        {/* Inner scrollable canvas */}
        <div style={{ minWidth: labelWidth + scaledContentW, position: 'relative' }}>

          {/* Time Ruler */}
          <div
            style={{
              display: 'flex', height: 26, background: '#1e1e1e',
              borderBottom: '1px solid #3e3e3e', position: 'sticky', top: 0, zIndex: 5,
            }}
          >
            {/* Label area */}
            <div style={{
              width: labelWidth, flexShrink: 0, borderRight: '1px solid #3e3e3e',
              display: 'flex', alignItems: 'center', padding: '0 8px',
            }}>
              <span style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Element</span>
            </div>

            {/* Ruler click area */}
            <div
              style={{ flex: 1, position: 'relative', cursor: 'pointer' }}
              onClick={seekTo}
            >
              {ticks.map((t, i) => {
                const pct = (t / totalDuration) * 100;
                const isMajor = Math.abs(t % 1) < 0.001;
                const isMid = Math.abs(t % 0.5) < 0.001;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: 0, bottom: 0,
                      borderLeft: `1px solid ${isMajor ? 'rgba(255,255,255,0.2)' : isMid ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                      display: 'flex', alignItems: 'flex-end', paddingBottom: 3,
                      pointerEvents: 'none',
                    }}
                  >
                    {isMajor && (
                      <span style={{ fontSize: 9, color: '#777', paddingLeft: 2, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                        {t.toFixed(0)}s
                      </span>
                    )}
                    {!isMajor && isMid && (
                      <span style={{ fontSize: 8, color: '#555', paddingLeft: 2, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                        .5
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Playhead */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(currentTime / totalDuration) * 100}%`,
                  top: 0, bottom: 0, width: 1,
                  background: '#e5a45a', zIndex: 10, pointerEvents: 'none',
                }}
              >
                <div style={{
                  width: 10, height: 10, background: '#e5a45a', borderRadius: '50%',
                  transform: 'translate(-4.5px, -3px)',
                }} />
              </div>
            </div>
          </div>

          {/* Tracks */}
          {tracks.map(track => {
            const isSelected = selectedTrackId === track.id;
            return (
              <div
                key={track.id}
                style={{
                  display: 'flex', height: 34, borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent',
                  cursor: 'default',
                }}
                onClick={() => setSelectedTrackId(isSelected ? null : track.id)}
                onContextMenu={e => trackContextMenu(e, track)}
              >
                {/* Label */}
                <div style={{
                  width: labelWidth, flexShrink: 0, borderRight: '1px solid #3e3e3e',
                  display: 'flex', alignItems: 'center', padding: '0 6px', gap: 5, overflow: 'hidden',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: track.color, flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.element}
                    </div>
                    <div style={{ fontSize: 9, color: '#666' }}>{track.animation} {track.duration}s</div>
                  </div>
                  <button
                    title="Delete track"
                    onClick={e => { e.stopPropagation(); removeTrack(track.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 2, display: 'flex', borderRadius: 2, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f88')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                  >
                    <FiX size={11} />
                  </button>
                </div>

                {/* Track area */}
                <div style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
                  {/* Playhead shadow across track */}
                  <div style={{
                    position: 'absolute', left: `${(currentTime / totalDuration) * 100}%`,
                    top: 0, bottom: 0, width: 1, background: 'rgba(229,164,90,0.25)', zIndex: 3, pointerEvents: 'none',
                  }} />

                  {/* Animation bar */}
                  <div
                    title={`${track.animation} — delay: ${track.delay}s, duration: ${track.duration}s\nDrag to move • Drag right edge to resize`}
                    style={{
                      position: 'absolute',
                      left: `${(track.delay / totalDuration) * 100}%`,
                      width: `${(track.duration / totalDuration) * 100}%`,
                      top: 5, bottom: 5,
                      background: `linear-gradient(90deg, ${track.color}22, ${track.color}55)`,
                      border: `1px solid ${track.color}99`,
                      borderRadius: 3, cursor: 'grab', zIndex: 2,
                      display: 'flex', alignItems: 'center', overflow: 'hidden',
                      minWidth: 6,
                    }}
                    onMouseDown={e => startTrackDrag(e, track.id)}
                  >
                    {/* Bar label */}
                    <span style={{ fontSize: 9, color: track.color, padding: '0 5px', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'none', fontWeight: 600 }}>
                      {track.animation}
                    </span>

                    {/* Left keyframe dot */}
                    <div style={{ position: 'absolute', left: -1, top: '50%', transform: 'translate(-4px, -4px)', width: 8, height: 8, background: track.color, borderRadius: '50%', pointerEvents: 'none', zIndex: 4 }} />

                    {/* Resize handle (right edge) */}
                    <div
                      title="Drag right to change duration"
                      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'e-resize', background: `${track.color}33`, zIndex: 3, borderLeft: `1px dashed ${track.color}66` }}
                      onMouseDown={e => { e.stopPropagation(); startResizeDuration(e, track.id); }}
                    />

                    {/* Right keyframe dot */}
                    <div style={{ position: 'absolute', right: -1, top: '50%', transform: 'translate(4px, -4px)', width: 8, height: 8, background: track.color, borderRadius: '50%', pointerEvents: 'none', zIndex: 4 }} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {tracks.length === 0 && (
            <div style={{ padding: '20px', fontSize: 12, color: '#555', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>No animation tracks.</div>
              <div>Select an element in Visual mode then click <strong style={{ color: '#888' }}>+</strong> to add a track.</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom control bar */}
      <div style={{
        height: 32, flexShrink: 0, borderTop: '1px solid #3e3e3e',
        background: '#252526', display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
        flexWrap: 'nowrap', overflow: 'hidden',
      }}>
        <span style={{ fontSize: 10, color: '#666', flexShrink: 0 }}>Preset:</span>
        {PRESETS.slice(0, 7).map(p => (
          <button
            key={p}
            onClick={() => setAnimationConfig({ preset: p })}
            style={{
              padding: '2px 7px', fontSize: 10, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              background: animationConfig.preset === p ? 'rgba(229,164,90,0.15)' : '#1a1a1a',
              border: `1px solid ${animationConfig.preset === p ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`,
              color: animationConfig.preset === p ? '#e5a45a' : '#777',
              fontFamily: 'inherit',
            }}
          >
            {p}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: '#3e3e3e', margin: '0 2px', flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: '#666', flexShrink: 0 }}>Duration:</span>
        <input
          value={animationConfig.duration}
          onChange={e => setAnimationConfig({ duration: e.target.value })}
          style={{
            width: 44, padding: '2px 4px', fontSize: 11, background: '#1a1a1a',
            border: '1px solid #3e3e3e', borderRadius: 3, color: '#ccc', outline: 'none', flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 10, color: '#666', flexShrink: 0 }}>Easing:</span>
        <select
          value={animationConfig.easing}
          onChange={e => setAnimationConfig({ easing: e.target.value })}
          style={{
            padding: '2px 4px', fontSize: 11, background: '#1a1a1a',
            border: '1px solid #3e3e3e', borderRadius: 3, color: '#ccc', outline: 'none', flexShrink: 0,
          }}
        >
          {['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'].map(v => <option key={v}>{v}</option>)}
        </select>
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
