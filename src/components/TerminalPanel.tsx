import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { FiTerminal, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import '@xterm/xterm/css/xterm.css';
import { wcManager, type WCStatus } from '../lib/webcontainer';
import { useContextMenu } from './ContextMenu';

const C = {
  bg: '#1e1e1e', surface: '#252526',
  border: '#3a3a3a', accent: '#4ec9b0', text: '#d4d4d4', muted: '#888',
};

const TerminalPanel: React.FC<{ onClose?: () => void }> = ({ onClose: _onClose }) => {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const [wcStatus, setWcStatus] = useState<WCStatus>(wcManager.status);
  const [shellReady, setShellReady] = useState(false);
  const [shellError, setShellError] = useState<string>('');
  const { show: showCtx, element: ctxEl } = useContextMenu();

  const sendToShell = useCallback((data: string) => {
    try { writerRef.current?.write(data); } catch {}
  }, []);

  const writeText = useCallback(async (text: string) => {
    if (!text) return;
    sendToShell(`\x1b[200~${text}\x1b[201~`);
  }, [sendToShell]);

  const startShell = useCallback(async () => {
    const term = termRef.current;
    if (!term) return;
    setShellError('');
    try {
      if (wcManager.status !== 'ready') {
        term.writeln('\x1b[33m  Booting Node.js sandbox…\x1b[0m');
        await wcManager.boot();
      }
      const proc = await wcManager.wc!.spawn('jsh', [], {
        terminal: { cols: term.cols || 80, rows: term.rows || 24 },
      });
      shellRef.current = proc;
      proc.output.pipeTo(new WritableStream({
        write(chunk) { term.write(chunk); },
      })).catch(() => {});
      const writer = proc.input.getWriter();
      writerRef.current = writer;
      term.onData(d => { try { writer.write(d); } catch {} });
      proc.exit.then(() => {
        term.writeln('\r\n\x1b[90m[shell exited — press Restart to start a new one]\x1b[0m');
        setShellReady(false);
      });
      setShellReady(true);
    } catch (e: any) {
      const msg = e?.message || 'Could not start shell.';
      setShellError(msg);
      term.writeln(`\x1b[31m  ${msg}\x1b[0m`);
    }
  }, []);

  const handleRestart = useCallback(async () => {
    try { writerRef.current?.close(); } catch {}
    try { shellRef.current?.kill(); } catch {}
    shellRef.current = null;
    writerRef.current = null;
    setShellReady(false);
    const term = termRef.current;
    if (!term) return;
    term.clear();
    term.writeln('\x1b[33m  Restarting shell…\x1b[0m');
    await startShell();
  }, [startShell]);

  const handleTerminalCtx = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const term = termRef.current;
    const selection = term?.getSelection() ?? '';
    const hasSel = selection.length > 0;

    showCtx(e, [
      { label: `jsh (Node.js sandbox)  ·  ${term?.cols ?? 0}×${term?.rows ?? 0}`, disabled: true },
      { separator: true, label: '' },
      {
        label: hasSel ? `Copy${selection.length > 24 ? '' : `: "${selection.slice(0, 24)}"`}` : 'Copy',
        icon: '📋', shortcut: 'Ctrl+Shift+C',
        disabled: !hasSel,
        action: () => { if (selection) navigator.clipboard.writeText(selection); },
      },
      {
        label: 'Paste', icon: '📥', shortcut: 'Ctrl+Shift+V',
        action: async () => {
          try {
            const text = await navigator.clipboard.readText();
            await writeText(text);
          } catch {}
        },
      },
      { label: 'Select All', icon: '🔲', shortcut: 'Ctrl+A', action: () => term?.selectAll() },
      { separator: true, label: '' },
      {
        label: 'Clear Terminal', icon: '🧹', shortcut: 'Ctrl+L',
        action: () => { term?.clear(); sendToShell('\f'); },
      },
      {
        label: 'Find…', icon: '🔍', shortcut: 'Ctrl+F',
        action: () => { try { (document as any).execCommand?.('find'); } catch {} },
      },
      { separator: true, label: '' },
      { label: 'Send Ctrl+C (interrupt)', icon: '⏹️', action: () => sendToShell('\x03') },
      { label: 'Send Ctrl+D (EOF)', icon: '🚪', action: () => sendToShell('\x04') },
      { separator: true, label: '' },
      { label: 'Restart Shell', icon: '🔄', danger: true, action: () => handleRestart() },
    ]);
  }, [showCtx, writeText, sendToShell, handleRestart]);

  useEffect(() => {
    const off = wcManager.onStatus(setWcStatus);
    return () => { off(); };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#aeafad',
        selectionBackground: 'rgba(100,160,255,0.3)',
        black: '#1e1e1e', brightBlack: '#555',
        red: '#f44747', brightRed: '#f44747',
        green: '#4ec9b0', brightGreen: '#4ec9b0',
        yellow: '#dcdcaa', brightYellow: '#dcdcaa',
        blue: '#569cd6', brightBlue: '#569cd6',
        magenta: '#c586c0', brightMagenta: '#c586c0',
        cyan: '#9cdcfe', brightCyan: '#9cdcfe',
        white: '#d4d4d4', brightWhite: '#ffffff',
      },
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      fontSize: 13, lineHeight: 1.3, cursorBlink: true, cursorStyle: 'bar',
      allowProposedApi: true, scrollback: 5000, convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.open(containerRef.current);
    termRef.current = terminal;
    fitRef.current = fitAddon;

    const tryFit = () => { try { fitAddon.fit(); } catch {} };
    setTimeout(tryFit, 50);

    const ro = new ResizeObserver(() => {
      tryFit();
      if (shellRef.current) {
        try { shellRef.current.resize({ cols: terminal.cols, rows: terminal.rows }); } catch {}
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);

    terminal.writeln('\x1b[1;36m  HTML Editor  ·  jsh shell  (Node.js + busybox in your browser)\x1b[0m');
    terminal.writeln('\x1b[90m  Try \x1b[0;33mnode --version\x1b[0;90m, \x1b[0;33mls\x1b[0;90m, \x1b[0;33mnpm install\x1b[0;90m  …\x1b[0m');
    terminal.writeln('');

    startShell();

    return () => {
      ro.disconnect();
      try { writerRef.current?.close(); } catch {}
      try { shellRef.current?.kill(); } catch {}
      shellRef.current = null;
      writerRef.current = null;
      terminal.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusColor = shellReady ? '#4ec9b0' : shellError ? '#f44747' : '#dcdcaa';
  const statusLabel = shellReady ? 'Shell ready' :
    shellError ? 'Shell error' :
    wcStatus === 'booting' ? 'Booting runtime…' :
    wcStatus === 'ready' ? 'Starting shell…' : 'Initialising…';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 32, flexShrink: 0, background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 32,
          borderTop: `2px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 12, flexShrink: 0,
        }}>
          <FiTerminal size={12} style={{ color: C.accent }} />
          <span style={{ fontWeight: 500 }}>jsh</span>
          <span style={{ color: C.muted, fontSize: 10.5 }}>— Node.js sandbox shell</span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            {!shellReady && !shellError ? (
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: `2px solid ${statusColor}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', boxShadow: shellReady ? `0 0 6px ${statusColor}` : 'none' }} />
            )}
            <span style={{ color: statusColor }}>{statusLabel}</span>
          </div>

          <button onClick={handleRestart} title="Restart shell"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: C.muted }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <FiRefreshCw size={13} />
          </button>
        </div>
      </div>

      {shellError && (
        <div style={{ flexShrink: 0, background: 'rgba(244,71,71,0.08)', borderBottom: '1px solid rgba(244,71,71,0.3)', padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}>
          <FiAlertCircle size={12} color="#f44747" />
          <span style={{ color: '#f88', flex: 1 }}>{shellError}</span>
          <button onClick={handleRestart}
            style={{ padding: '2px 10px', borderRadius: 3, border: '1px solid rgba(244,71,71,0.4)', background: 'transparent', color: '#f88', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
            Retry
          </button>
        </div>
      )}

      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: '6px 4px 4px 8px' }}
        onContextMenu={handleTerminalCtx}
      >
        <div ref={containerRef} style={{ position: 'absolute', inset: '6px 4px 4px 8px', overflow: 'hidden' }} />
      </div>

      {ctxEl}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .xterm .xterm-viewport { overflow: hidden !important; }
        .xterm .xterm-screen { padding: 0 !important; }
      `}</style>
    </div>
  );
};

export default TerminalPanel;
