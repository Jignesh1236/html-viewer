import React, { useEffect, useMemo, useState } from 'react';
import { LANGUAGES, type LanguageId, getLanguages, setLanguages, markLanguagesPicked } from '../lib/languages';
import { wcManager, type WCStatus } from '../lib/webcontainer';

const C = {
  bg: '#0b0b0b', surface: '#161616', surface2: '#1c1c1c', border: '#262626',
  fg: '#d4d4d4', dim: '#888', faint: '#555',
  accent: '#4ec9b0', amber: '#dcdcaa', blue: '#569cd6', red: '#f87171',
};

const STATUS_COLOR: Record<string, string> = {
  full: C.accent,
  experimental: C.amber,
  compiled: C.blue,
};

const LanguageSelect: React.FC<{ onContinue: () => void }> = ({ onContinue }) => {
  const [selected, setSelected] = useState<Set<LanguageId>>(() => getLanguages());
  const [wcStatus, setWcStatus] = useState<WCStatus>(wcManager.status);

  // Boot the runtime quietly in the background while the user picks languages,
  // so the editor opens with a working terminal as soon as they hit Continue.
  useEffect(() => {
    const off = wcManager.onStatus(setWcStatus);
    if (wcManager.status === 'idle') wcManager.boot().catch(() => {});
    return () => { off(); };
  }, []);

  const toggle = (id: LanguageId) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(LANGUAGES.map(l => l.id)));
  const onlyDefaults = () => setSelected(new Set(LANGUAGES.filter(l => l.defaultEnabled).map(l => l.id)));

  const handleContinue = () => {
    setLanguages(selected);
    markLanguagesPicked();
    onContinue();
  };

  const runtimeLabel = useMemo(() => ({
    idle:    { dot: C.faint,  text: 'Initialising runtime…' },
    booting: { dot: C.amber,  text: 'Booting Node.js sandbox…' },
    ready:   { dot: C.accent, text: 'Runtime ready' },
    error:   { dot: C.red,    text: 'Runtime unavailable — editor still works' },
  }[wcStatus]), [wcStatus]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.bg, color: C.fg,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflow: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 880 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #ff7a18, #af002d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'system-ui',
          }}>H</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>HTML Editor</div>
            <div style={{ fontSize: 11, color: C.dim }}>Choose which languages this workspace will support</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.dim }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: runtimeLabel.dot,
              boxShadow: wcStatus === 'ready' ? `0 0 6px ${runtimeLabel.dot}` : 'none',
            }} />
            {runtimeLabel.text}
          </div>
        </div>

        {/* Table-style header */}
        <div style={{
          marginTop: 22, display: 'grid',
          gridTemplateColumns: '32px 1.2fr 0.9fr 1.1fr',
          gap: 0, padding: '8px 14px', background: C.surface2,
          border: `1px solid ${C.border}`, borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          fontSize: 10, letterSpacing: 1.2, color: C.dim, fontWeight: 700,
        }}>
          <div></div>
          <div>LANGUAGE</div>
          <div>SUPPORT STATUS</div>
          <div>PRIMARY MECHANISM</div>
        </div>

        {/* Rows */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '0 0 8px 8px', overflow: 'hidden',
        }}>
          {LANGUAGES.map((l, i) => {
            const isOn = selected.has(l.id);
            const color = STATUS_COLOR[l.status];
            return (
              <button
                key={l.id}
                onClick={() => toggle(l.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '32px 1.2fr 0.9fr 1.1fr',
                  width: '100%', padding: '14px',
                  alignItems: 'flex-start', textAlign: 'left',
                  background: isOn ? 'rgba(78,201,176,0.06)' : 'transparent',
                  border: 'none',
                  borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                  borderLeft: `3px solid ${isOn ? color : 'transparent'}`,
                  cursor: 'pointer', color: C.fg, fontFamily: 'inherit',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isOn) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.025)'; }}
                onMouseLeave={e => { if (!isOn) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 18, height: 18, borderRadius: 4, marginTop: 2,
                  border: `1.5px solid ${isOn ? color : '#444'}`,
                  background: isOn ? color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.12s',
                }}>
                  {isOn && <span style={{ color: '#0b0b0b', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>

                {/* Language */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{l.name}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: C.dim, lineHeight: 1.5 }}>{l.description}</div>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {l.examples.slice(0, 5).map(ex => (
                      <span key={ex} style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 3,
                        background: 'rgba(255,255,255,0.04)', color: C.dim,
                        border: '1px solid #2a2a2a',
                      }}>{ex}</span>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 2 }}>
                  <span style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 3,
                    color, background: `${color}1f`, border: `1px solid ${color}55`,
                    fontWeight: 600, letterSpacing: 0.4,
                  }}>{l.statusLabel}</span>
                </div>

                {/* Mechanism */}
                <div style={{ fontSize: 12, color: C.fg, paddingTop: 4 }}>
                  {l.mechanism}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer / actions */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onlyDefaults} style={ghostBtn}>Defaults</button>
          <button onClick={selectAll} style={ghostBtn}>Select all</button>
          <button onClick={() => setSelected(new Set())} style={ghostBtn}>Clear</button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: C.dim }}>
            {selected.size} of {LANGUAGES.length} selected
          </span>
          <button onClick={handleContinue} style={{
            padding: '9px 22px', borderRadius: 6, border: `1px solid ${C.accent}`,
            background: `${C.accent}22`, color: C.accent, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, letterSpacing: 0.5,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${C.accent}33`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${C.accent}22`; }}>
            Open Editor →
          </button>
        </div>

        <div style={{
          marginTop: 14, padding: '10px 14px', background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 6,
          fontSize: 11, color: C.dim, lineHeight: 1.6,
        }}>
          <strong style={{ color: C.fg }}>Heads up:</strong> the terminal &amp; runtime always run inside your browser
          (Node.js sandbox) — nothing is uploaded to a server. You can change these selections later from the menu.
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 10, color: C.faint, letterSpacing: 1 }}>
          NO DATA LEAVES YOUR BROWSER · EVERYTHING RUNS LOCALLY
        </div>
      </div>
    </div>
  );
};

const ghostBtn: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 5, border: `1px solid ${C.border}`,
  background: 'transparent', color: C.dim, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
};

export default LanguageSelect;
