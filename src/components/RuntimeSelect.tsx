import React, { useState } from 'react';
import { setRuntime, type RuntimeKind } from '../lib/runtime';

const C = {
  bg: '#0b0b0b', surface: '#161616', border: '#262626',
  fg: '#d4d4d4', dim: '#888', accent: '#4ec9b0', amber: '#dcdcaa', blue: '#569cd6',
};

const RuntimeSelect: React.FC<{ onPick: (r: RuntimeKind) => void }> = ({ onPick }) => {
  const [hover, setHover] = useState<RuntimeKind | null>(null);

  const choose = (r: RuntimeKind) => { setRuntime(r); onPick(r); };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.bg, color: C.fg,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 880 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #ff7a18, #af002d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'system-ui',
          }}>H</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>HTML Editor</div>
            <div style={{ fontSize: 11, color: C.dim }}>Choose how Linux runs in your browser</div>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card
            badge="WEBCONTAINER"
            badgeColor={C.accent}
            title="Node.js Linux runtime"
            subtitle="WebContainer — production sandbox"
            bullets={[
              'Real Node.js v22, npm, busybox, jsh shell',
              'Proper filesystem at /home/user/project',
              'Fast: boots in under a second',
              'Live dev servers with port forwarding',
            ]}
            footer="Best for: actually building & previewing your site."
            hovered={hover === 'wc'}
            onHover={() => setHover('wc')}
            onLeave={() => setHover(null)}
            onPick={() => choose('wc')}
            accent={C.accent}
            recommended
          />
          <Card
            badge="x86 EMULATOR · EXPERIMENTAL"
            badgeColor={C.amber}
            title="Local Linux ISO"
            subtitle="v86 — full x86 emulator in JavaScript"
            bullets={[
              'Boots a real Linux ISO inside your browser',
              'Cosmetic kernel boot logs, BIOS, VGA',
              'Terminal talks to Linux over a serial port (xterm.js)',
              'Heavy: ~6 MB download, slow boot, may stall in iframes',
            ]}
            footer="Best for: trying real Linux, learning, novelty. Pick WebContainer for real work."
            hovered={hover === 'v86'}
            onHover={() => setHover('v86')}
            onLeave={() => setHover(null)}
            onPick={() => choose('v86')}
            accent={C.amber}
          />
        </div>

        <div style={{ marginTop: 22, textAlign: 'center', fontSize: 10.5, color: C.dim, letterSpacing: 1 }}>
          NO DATA LEAVES YOUR BROWSER · EVERYTHING RUNS LOCALLY
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<{
  badge: string; badgeColor: string; title: string; subtitle: string;
  bullets: string[]; footer: string; hovered: boolean; recommended?: boolean;
  onHover: () => void; onLeave: () => void; onPick: () => void; accent: string;
}> = ({ badge, badgeColor, title, subtitle, bullets, footer, hovered, recommended, onHover, onLeave, onPick, accent }) => (
  <button
    onMouseEnter={onHover} onMouseLeave={onLeave} onClick={onPick}
    style={{
      textAlign: 'left', cursor: 'pointer', padding: 18, borderRadius: 10,
      background: hovered ? '#1c1c1c' : C.surface,
      border: `1px solid ${hovered ? accent : C.border}`,
      color: C.fg, fontFamily: 'inherit',
      transition: 'all 0.15s ease', position: 'relative',
      boxShadow: hovered ? `0 0 0 1px ${accent}40, 0 8px 28px rgba(0,0,0,0.5)` : 'none',
    }}>
    {recommended && (
      <div style={{
        position: 'absolute', top: 12, right: 12, fontSize: 9.5, letterSpacing: 1,
        color: accent, border: `1px solid ${accent}66`, padding: '2px 6px', borderRadius: 3,
      }}>RECOMMENDED</div>
    )}
    <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: badgeColor, fontWeight: 700 }}>{badge}</div>
    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, color: '#fff' }}>{title}</div>
    <div style={{ fontSize: 11.5, color: C.dim, marginTop: 2 }}>{subtitle}</div>
    <ul style={{ marginTop: 14, paddingLeft: 16, fontSize: 12, lineHeight: 1.7, color: C.fg }}>
      {bullets.map(b => <li key={b}>{b}</li>)}
    </ul>
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${C.border}`, fontSize: 11, color: C.dim }}>
      {footer}
    </div>
    <div style={{
      marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 5, fontSize: 11.5, fontWeight: 600,
      background: `${accent}22`, border: `1px solid ${accent}66`, color: accent,
    }}>
      Boot this runtime →
    </div>
  </button>
);

export default RuntimeSelect;
