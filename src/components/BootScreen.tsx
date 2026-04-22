import React, { useEffect, useRef, useState } from 'react';
import {
  bootV86, getBootStatus, getBootProgress, getBootLog, getBootError,
  onBootStatus, onBootProgress, onBootLog, BOOT_FILE_COUNT,
  type BootStatus, type ProgressState,
} from '../lib/v86Boot';
import { wcManager, type WCStatus } from '../lib/webcontainer';
import type { RuntimeKind } from '../lib/runtime';

const C = {
  bg: '#0b0b0b', fg: '#d4d4d4', dim: '#888', accent: '#4ec9b0',
  amber: '#dcdcaa', red: '#f87171', blue: '#569cd6', surface: '#161616',
};

function pushExtraLog(setter: React.Dispatch<React.SetStateAction<string[]>>, line: string) {
  setter(prev => [...prev.slice(-200), line]);
}

const BootScreen: React.FC<{ onReady: () => void; runtime?: RuntimeKind; onCancel?: () => void }> = ({ onReady, runtime = 'wc', onCancel }) => {
  const useV86 = runtime === 'v86';
  const useWC = runtime === 'wc';
  const [status, setStatus] = useState<BootStatus>(getBootStatus());
  const [progress, setProgress] = useState<ProgressState>(getBootProgress());
  const [logs, setLogs] = useState<string[]>(getBootLog());
  const [wcStatus, setWcStatus] = useState<WCStatus>(wcManager.status);
  const [wcInstalled, setWcInstalled] = useState<'pending' | 'installing' | 'ready' | 'error'>('pending');
  const [nodeVersion, setNodeVersion] = useState<string>('');
  const wcStartedRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off1 = onBootStatus(setStatus);
    const off2 = onBootProgress(setProgress);
    const off3 = onBootLog(line => setLogs(prev => [...prev.slice(-200), line]));
    if (useV86 && getBootStatus() === 'idle') bootV86();
    return () => { off1(); off2(); off3(); };
  }, [useV86]);

  // Boot WebContainer (real Linux + Node.js) in parallel with the cosmetic v86 boot.
  useEffect(() => {
    const offWc = wcManager.onStatus(setWcStatus);
    if (!useWC) { return () => { offWc(); }; }
    if (!wcStartedRef.current) {
      wcStartedRef.current = true;
      (async () => {
        pushExtraLog(setLogs, '');
        pushExtraLog(setLogs, '[init] Bringing up Linux runtime (WebContainer)…');
        try {
          await wcManager.boot();
          pushExtraLog(setLogs, '[init] Linux runtime online.');
          setWcInstalled('installing');
          // Detect Node.js version
          try {
            const proc = await wcManager.spawn('node', ['--version']);
            let v = '';
            proc.output.pipeTo(new WritableStream({ write(chunk) { v += chunk; } }));
            await proc.exit;
            const ver = v.trim().replace(/[^v0-9.]/g, '');
            if (ver) {
              setNodeVersion(ver);
              pushExtraLog(setLogs, `[node] Node.js ${ver} ready.`);
            }
          } catch (e: any) {
            pushExtraLog(setLogs, `[node] version check failed: ${e?.message || e}`);
          }
          // Ensure a /home/user/project workspace exists and the editor files are mounted into it.
          try {
            await wcManager.wc?.fs.mkdir('/home/user/project', { recursive: true });
            pushExtraLog(setLogs, '[fs] /home/user/project ready.');
          } catch {}
          setWcInstalled('ready');
          pushExtraLog(setLogs, '[init] Setup complete. Opening editor…');
        } catch (e: any) {
          pushExtraLog(setLogs, `[init] WebContainer boot failed: ${e?.message || e}`);
          setWcInstalled('error');
        }
      })();
    }
    return () => { offWc(); };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs.length]);

  // Only enter the editor once the real Linux runtime is up (or it has clearly failed).
  // The cosmetic v86 boot is not gating — it can keep running in the background.
  useEffect(() => {
    if (useWC && wcInstalled === 'ready') {
      const t = setTimeout(onReady, 500);
      return () => clearTimeout(t);
    }
    if (useV86 && status === 'ready') {
      const t = setTimeout(onReady, 600);
      return () => clearTimeout(t);
    }
    // v86 is cosmetic — once the kernel image is loaded and the emulator has started
    // ('booting'), we open the editor after a brief delay even if 'emulator-ready'
    // never fires (it can be unreliable across v86 builds).
    if (useV86 && status === 'booting') {
      const t = setTimeout(onReady, 2500);
      return () => clearTimeout(t);
    }
    if (useWC && wcInstalled === 'error') {
      const t = setTimeout(onReady, 4000);
      return () => clearTimeout(t);
    }
    if (useV86 && status === 'error') {
      const t = setTimeout(onReady, 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [wcInstalled, status, onReady, useWC, useV86]);

  const pct = progress.total > 0
    ? Math.round((progress.loaded / progress.total) * 100)
    : 0;
  const v86Pct = Math.min(100, Math.round(((progress.fileIndex + (pct / 100)) / Math.max(1, progress.totalFiles || BOOT_FILE_COUNT)) * 100));
  const wcPct = wcInstalled === 'ready' ? 100 : wcInstalled === 'installing' ? 80 : wcStatus === 'booting' ? 50 : wcStatus === 'ready' ? 70 : 5;
  const overallPct = useV86 && useWC ? Math.round((v86Pct * 0.4) + (wcPct * 0.6)) : useV86 ? v86Pct : wcPct;
  const error = status === 'error' ? getBootError() : '';
  const wcError = wcInstalled === 'error';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: `radial-gradient(circle at 50% 30%, #18181b 0%, #050505 100%)`,
      color: C.fg, fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', monospace",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflow: 'hidden',
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)',
        mixBlendMode: 'overlay',
      }} />

      <div style={{ width: '100%', maxWidth: 720, position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(229,76,38,0.25)', overflow: 'hidden',
          }}>
            <img src="/favicon.svg" alt="" style={{ width: 38, height: 38, display: 'block' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>HTML Editor — Linux Environment</div>
            <div style={{ fontSize: 11, color: C.dim }}>
              {useV86 ? 'Booting in-browser Linux ISO (v86 · x86 emulator)' : 'Bringing up Linux runtime (WebContainer · Node.js)'}
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              title="Cancel and choose a different runtime"
              style={{
                background: 'transparent', border: `1px solid ${C.dim}55`, color: C.dim,
                padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = `${C.red}66`; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.dim; e.currentTarget.style.borderColor = `${C.dim}55`; }}>
              ← Cancel
            </button>
          )}
        </div>

        {/* Boot log */}
        <div ref={logRef} style={{
          background: C.surface, border: '1px solid #2a2a2a', borderRadius: 8,
          padding: '12px 14px', height: 220, overflowY: 'auto', fontSize: 11.5,
          lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)',
        }}>
          {logs.map((l, i) => {
            const isErr = /^ERROR/i.test(l);
            const isOk  = /\bok\b/.test(l);
            const color = isErr ? C.red : isOk ? C.accent : l.startsWith('[') ? C.blue : l.startsWith('Replit') ? C.amber : C.fg;
            return <div key={i} style={{ color }}>{l || '\u00A0'}</div>;
          })}
          {(status === 'loading' || status === 'booting') && (
            <div style={{ color: C.amber, marginTop: 4 }}>
              <span className="boot-cursor">▊</span>
            </div>
          )}
        </div>

        {/* Stage 1: x86 Linux emulator (cosmetic) */}
        {useV86 && <Stage
          label={`Linux kernel & BIOS  (${status === 'loading' ? `${progress.fileIndex + 1}/${progress.totalFiles || BOOT_FILE_COUNT}` : 'images'})`}
          detail={
            status === 'loading' ? `${progress.file || 'downloading…'}  ·  ${(progress.loaded / 1024).toFixed(0)} / ${(progress.total / 1024).toFixed(0)} KB` :
            status === 'booting' ? 'Booting kernel…' :
            status === 'ready' ? 'Ready' :
            status === 'error' ? (error || 'failed') : 'queued'
          }
          pct={v86Pct}
          state={status === 'error' ? 'error' : status === 'ready' ? 'done' : status === 'idle' ? 'pending' : 'active'}
        />}

        {/* Stage 2: WebContainer (real Linux runtime) */}
        {useWC && <Stage
          label="Linux runtime  (WebContainer · Node.js)"
          detail={
            wcInstalled === 'ready' ? `Node.js ${nodeVersion || 'latest'} ready` :
            wcInstalled === 'installing' ? 'Setting up Node.js & filesystem…' :
            wcStatus === 'booting' ? 'Booting WebContainer…' :
            wcInstalled === 'error' ? 'WebContainer unavailable in this iframe' : 'queued'
          }
          pct={wcPct}
          state={wcInstalled === 'error' ? 'error' : wcInstalled === 'ready' ? 'done' : wcStatus === 'idle' ? 'pending' : 'active'}
        />}

        {/* Overall progress */}
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 6, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${overallPct}%`,
              background: wcError
                ? 'linear-gradient(90deg, #f44747, #f87171)'
                : 'linear-gradient(90deg, #4ec9b0, #569cd6, #dcdcaa)',
              transition: 'width 0.25s ease',
              boxShadow: '0 0 8px rgba(78,201,176,0.4)',
            }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: C.dim, display: 'flex', justifyContent: 'space-between' }}>
            <span>Overall: {overallPct}%</span>
            <span>{wcInstalled === 'ready' ? 'Opening editor…' : 'Please wait — full setup in progress'}</span>
          </div>
        </div>

        {/* WebContainer error fallback */}
        {wcError && (
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 6,
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
          }}>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginBottom: 4 }}>
              Linux runtime could not start.
            </div>
            <div style={{ fontSize: 11.5, color: '#bbb', lineHeight: 1.55 }}>
              The Node.js sandbox failed to boot in this preview frame. You can still use the editor — the terminal & shell features will be limited.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={onReady} style={btn(C.amber)}>Continue without Linux</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 10, color: '#444', letterSpacing: '0.06em' }}>
          NO DATA LEAVES YOUR BROWSER  ·  EVERYTHING RUNS LOCALLY
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
        .boot-cursor { animation: blink 1s steps(1) infinite; color: ${C.accent}; }
      `}</style>
    </div>
  );
};

const Stage: React.FC<{ label: string; detail: string; pct: number; state: 'pending' | 'active' | 'done' | 'error' }> = ({ label, detail, pct, state }) => {
  const color = state === 'error' ? '#f87171' : state === 'done' ? '#4ec9b0' : state === 'active' ? '#dcdcaa' : '#666';
  const icon = state === 'done' ? '✔' : state === 'error' ? '✕' : state === 'active' ? '▶' : '·';
  return (
    <div style={{ marginTop: 12, padding: '8px 12px', background: '#141414', border: '1px solid #232323', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
        <span style={{ color, width: 14, textAlign: 'center', fontWeight: 700 }}>{icon}</span>
        <span style={{ color: '#ddd', fontWeight: 600 }}>{label}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: '#777', fontSize: 10.5 }}>{state === 'done' ? '100%' : state === 'pending' ? '—' : `${pct}%`}</span>
      </div>
      <div style={{ marginTop: 6, marginLeft: 22, fontSize: 10.5, color: '#888', lineHeight: 1.45, wordBreak: 'break-word' }}>{detail}</div>
      <div style={{ marginTop: 6, marginLeft: 22, height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.25s ease' }} />
      </div>
    </div>
  );
};

function btn(color: string): React.CSSProperties {
  return {
    background: `${color}22`, border: `1px solid ${color}55`, color,
    padding: '6px 14px', borderRadius: 5, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600,
  };
}

export default BootScreen;
