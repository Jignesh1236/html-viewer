import React, { useEffect, useRef, useState } from 'react';
import { wcManager, type BootLog } from '../lib/webcontainer';

const C = {
  bg: '#0b0b0b', surface: '#141414', border: '#262626',
  fg: '#d4d4d4', dim: '#888', faint: '#555',
  ok: '#4ec9b0', warn: '#dcdcaa', err: '#f87171', cmd: '#9cdcfe',
};

const LEVEL_COLOR: Record<BootLog['level'], string> = {
  info: C.dim, ok: C.ok, warn: C.warn, err: C.err, cmd: C.cmd,
};
const LEVEL_TAG: Record<BootLog['level'], string> = {
  info: '·', ok: '✓', warn: '!', err: '✗', cmd: '$',
};

const BootProgress: React.FC<{
  done: boolean;
  failed?: boolean;
  onContinue: () => void;
  onSkip?: () => void;
  onRetry?: () => void;
}> = ({ done, failed, onContinue, onSkip, onRetry }) => {
  const [logs, setLogs] = useState<BootLog[]>(() => wcManager.getLogs());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = wcManager.onLog(line => {
      setLogs(prev => [...prev, line]);
    });
    return () => { off(); };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  // Auto-continue when boot is done (but give the user a brief moment to see "Ready ✓")
  useEffect(() => {
    if (done && !failed) {
      const t = setTimeout(onContinue, 350);
      return () => clearTimeout(t);
    }
  }, [done, failed, onContinue]);

  const last = logs[logs.length - 1];
  const headline = failed ? 'Setup failed'
    : done ? 'Ready'
    : last?.text || 'Preparing your workspace…';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.bg, color: C.fg,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #ff7a18, #af002d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'system-ui',
          }}>H</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>HTML Editor</div>
            <div style={{ fontSize: 11, color: C.dim }}>Initialising the in-browser sandbox</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!done && !failed && (
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: `2px solid ${C.ok}`, borderTopColor: 'transparent',
                animation: 'bp-spin 0.8s linear infinite',
              }} />
            )}
            <span style={{
              fontSize: 12, color: failed ? C.err : done ? C.ok : C.warn, fontWeight: 600,
              maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={headline}>{headline}</span>
          </div>
        </div>

        {/* Log area */}
        <div
          ref={scrollRef}
          style={{
            height: 360, background: '#000', border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '12px 14px', overflowY: 'auto',
            fontSize: 12, lineHeight: 1.55,
          }}
        >
          {logs.length === 0 && (
            <div style={{ color: C.faint }}>Waiting for the runtime to start…</div>
          )}
          {logs.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, color: LEVEL_COLOR[l.level] }}>
              <span style={{ color: C.faint, flexShrink: 0, width: 56 }}>
                {new Date(l.ts).toLocaleTimeString([], { hour12: false })}
              </span>
              <span style={{ flexShrink: 0, color: LEVEL_COLOR[l.level], fontWeight: 700, width: 12 }}>
                {LEVEL_TAG[l.level]}
              </span>
              <span style={{ flex: 1, wordBreak: 'break-word' }}>{l.text}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: C.dim }}>{logs.length} event{logs.length === 1 ? '' : 's'}</span>
          <div style={{ flex: 1 }} />
          {onSkip && !done && !failed && (
            <button onClick={onSkip} style={ghostBtn}>Skip & open editor</button>
          )}
          {failed && onRetry && (
            <button onClick={onRetry} style={ghostBtn}>Retry</button>
          )}
          {(done || failed) && (
            <button
              onClick={onContinue}
              style={{
                padding: '9px 22px', borderRadius: 6,
                border: `1px solid ${failed ? C.warn : C.ok}`,
                background: `${failed ? C.warn : C.ok}22`,
                color: failed ? C.warn : C.ok, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, letterSpacing: 0.5,
              }}
            >
              {failed ? 'Open editor anyway →' : 'Open Editor →'}
            </button>
          )}
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: C.faint, letterSpacing: 1 }}>
          NO DATA LEAVES YOUR BROWSER · EVERYTHING RUNS LOCALLY
        </div>
      </div>

      <style>{`@keyframes bp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 5, border: `1px solid ${C.border}`,
  background: 'transparent', color: C.dim, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
};

export default BootProgress;
