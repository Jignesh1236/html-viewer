import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { FileItem } from '../store/editorStore';
import {
  spawnInContainer,
  mountFilesToContainer,
  readFileFromContainer,
} from '../utils/webContainerRuntime';
import { detectProjectType } from '../utils/fileTypes';

/* ── App color palette (matches VSCode-style theme) ── */
const C = {
  bg:         '#1e1e1e',
  panel:      '#252526',
  titlebar:   '#323233',
  border:     '#3e3e3e',
  text:       '#cccccc',
  muted:      '#888888',
  dimmed:     '#555555',
  icon:       '#c5c5c5',
  amber:      '#e5a45a',
  green:      '#4ec9b0',
  blue:       '#569cd6',
  red:        '#f44747',
  hover:      'rgba(255,255,255,0.05)',
};

/* ── Types ── */
interface TermSession {
  id: number;
  name: string;
  proc: { kill: () => void; write: (d: string) => void; exit: Promise<number> } | null;
  alive: boolean;
}

let _sessId = 0;

/* ── Quick-action presets ── */
const QUICK_CMDS = [
  { label: 'npm install', cmd: 'npm install', icon: '📦' },
  { label: 'npm run dev', cmd: 'npm run dev', icon: '🚀' },
  { label: 'npm run build', cmd: 'npm run build', icon: '🔨' },
  { label: 'ls', cmd: 'ls -la', icon: '📂' },
  { label: 'pwd', cmd: 'pwd', icon: '📍' },
];

/* ── TerminalSession: one xterm.js instance ── */
interface SessionProps {
  active: boolean;
  files: FileItem[];
  mounted: boolean;
  setMounted: (v: boolean) => void;
  onFileSyncNeeded: () => void;
}

function TerminalSession({ active, files, mounted, setMounted, onFileSyncNeeded }: SessionProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const procRef = useRef<{ kill: () => void; write: (d: string) => void; exit: Promise<number> } | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const mountedOnce = useRef(false);
  const projectType = detectProjectType(files);

  /* ── Boot xterm.js ── */
  useEffect(() => {
    if (!divRef.current || mountedOnce.current) return;
    mountedOnce.current = true;

    let term: any;
    let fitAddon: any;
    let destroyed = false;
    let ro: ResizeObserver | null = null;

    (async (): Promise<void> => {
      try {
        const [xtermMod, fitMod, webLinksMod] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
        ]);

        if (destroyed) return;

        term = new xtermMod.Terminal({
          theme: {
            background: C.bg,
            foreground: C.text,
            cursor: C.amber,
            cursorAccent: C.bg,
            selectionBackground: 'rgba(229,164,90,0.2)',
            black: '#3c3c3c',
            red: C.red,
            green: C.green,
            yellow: C.amber,
            blue: C.blue,
            magenta: '#c586c0',
            cyan: '#9cdcfe',
            white: C.text,
            brightBlack: C.dimmed,
            brightRed: '#f97583',
            brightGreen: '#a8ff78',
            brightYellow: '#ffdf5d',
            brightBlue: '#79b8ff',
            brightMagenta: '#e1acff',
            brightCyan: '#b3f0ff',
            brightWhite: '#e8e8e8',
          },
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
          fontSize: 13,
          lineHeight: 1.4,
          cursorBlink: true,
          cursorStyle: 'block',
          scrollback: 5000,
          allowProposedApi: true,
          convertEol: true,
        });

        fitAddon = new fitMod.FitAddon();
        const webLinksAddon = new webLinksMod.WebLinksAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        term.open(divRef.current!);
        fitAddon.fit();

        xtermRef.current = term;
        fitRef.current = fitAddon;

        /* Welcome banner */
        term.writeln('\x1b[1;33m╔══════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[1;33m║  \x1b[1;36mWebContainer Terminal\x1b[1;33m           ║\x1b[0m');
        term.writeln('\x1b[1;33m╚══════════════════════════════════╝\x1b[0m');
        term.writeln('\x1b[90mType a command or use the quick actions above.\x1b[0m');
        term.writeln('\x1b[90mFiles are synced automatically with the editor.\x1b[0m');
        term.writeln('');

        /* Handle user input — collect line, run on Enter */
        let inputBuf = '';
        let historyBuf: string[] = [];
        let histIdx = -1;

        term.onKey(async ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
          const ev = domEvent;

          if (ev.ctrlKey && ev.key === 'c') {
            if (procRef.current) {
              procRef.current.kill();
              procRef.current = null;
              busyRef.current = false;
              setBusy(false);
            }
            term.writeln('^C');
            inputBuf = '';
            writePrompt(term);
            return;
          }

          if (ev.ctrlKey && ev.key === 'l') {
            term.clear();
            writePrompt(term);
            return;
          }

          if (busyRef.current && key !== '\x03') {
            /* In raw PTY mode, forward keystrokes to process */
            if (procRef.current) {
              procRef.current.write(key);
            }
            return;
          }

          if (ev.key === 'Enter') {
            term.writeln('');
            const cmd = inputBuf.trim();
            inputBuf = '';
            if (cmd) {
              historyBuf = [cmd, ...historyBuf.filter(c => c !== cmd)].slice(0, 100);
              histIdx = -1;
              await runCommand(cmd, term);
            } else {
              writePrompt(term);
            }
          } else if (ev.key === 'Backspace') {
            if (inputBuf.length > 0) {
              inputBuf = inputBuf.slice(0, -1);
              term.write('\b \b');
            }
          } else if (ev.key === 'ArrowUp') {
            histIdx = Math.min(histIdx + 1, historyBuf.length - 1);
            if (histIdx >= 0) {
              clearLine(term, inputBuf.length);
              inputBuf = historyBuf[histIdx];
              term.write(inputBuf);
            }
          } else if (ev.key === 'ArrowDown') {
            histIdx = Math.max(histIdx - 1, -1);
            clearLine(term, inputBuf.length);
            inputBuf = histIdx >= 0 ? historyBuf[histIdx] : '';
            term.write(inputBuf);
          } else if (ev.key === 'Tab') {
            ev.preventDefault();
          } else if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && key.length === 1) {
            inputBuf += key;
            term.write(key);
          }
        });

        writePrompt(term);

        /* ResizeObserver for fit */
        ro = new ResizeObserver(() => {
          try { fitAddon.fit(); } catch {}
        });
        if (divRef.current) ro.observe(divRef.current);
      } catch (err: any) {
        setInitError(err?.message ?? 'Failed to load terminal');
      }
    })();

    return () => {
      destroyed = true;
      if (ro) { try { ro.disconnect(); } catch {} }
      if (term) { try { term.dispose(); } catch {} }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fit when becoming active */
  useEffect(() => {
    if (active && fitRef.current) {
      setTimeout(() => { try { fitRef.current.fit(); } catch {} }, 50);
    }
  }, [active]);

  function writePrompt(term: any) {
    term.write('\r\x1b[90m$ \x1b[0m');
  }

  function clearLine(term: any, len: number) {
    if (len > 0) {
      term.write('\b'.repeat(len) + ' '.repeat(len) + '\b'.repeat(len));
    }
  }

  const ensureMounted = useCallback(async (term: any) => {
    if (mounted) return true;
    term.writeln('\x1b[33mBooting WebContainer…\x1b[0m');
    try {
      await mountFilesToContainer(files, projectType);
      setMounted(true);
      term.writeln('\x1b[32m✓ Project files mounted. Container ready.\x1b[0m');
      return true;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.toLowerCase().includes('cross-origin') || msg.toLowerCase().includes('sharedarraybuffer') || msg.toLowerCase().includes('isolated')) {
        term.writeln('\x1b[31mWebContainer requires Cross-Origin Isolation.\x1b[0m');
        term.writeln('\x1b[90mOpen the app URL directly in a browser tab (not this iframe).\x1b[0m');
        term.writeln('\x1b[90mIn Replit: click "Open in new tab" ↗ in the preview toolbar.\x1b[0m');
      } else {
        term.writeln(`\x1b[31mBoot failed: ${msg}\x1b[0m`);
      }
      return false;
    }
  }, [mounted, files, projectType, setMounted]);

  /* Commands that may modify files */
  const FILE_MUTATION_CMDS = /^(touch|mkdir|rm|mv|cp|echo|printf|tee|cat\s+>|sed\s+-i|npm|node|git|yarn|pnpm)\s/;

  const runCommand = useCallback(async (cmd: string, term: any) => {
    busyRef.current = true;
    setBusy(true);

    const ok = await ensureMounted(term);
    if (!ok) {
      busyRef.current = false;
      setBusy(false);
      writePrompt(term);
      return;
    }

    const dims = fitRef.current ? (() => { try { return { cols: (xtermRef.current as any)?.cols ?? 80, rows: (xtermRef.current as any)?.rows ?? 24 }; } catch { return { cols: 80, rows: 24 }; } })() : { cols: 80, rows: 24 };

    try {
      const proc = await spawnInContainer('sh', ['-c', cmd], (data) => {
        term.write(data);
      }, dims);
      procRef.current = proc;

      const code = await proc.exit;
      procRef.current = null;

      if (code !== 0) {
        term.writeln(`\r\n\x1b[31m[Process exited with code ${code}]\x1b[0m`);
      }

      /* Sync files back if command likely mutated FS */
      if (FILE_MUTATION_CMDS.test(cmd + ' ') || cmd.trim() === 'npm install') {
        onFileSyncNeeded();
      }
    } catch (err: any) {
      term.writeln(`\r\n\x1b[31mError: ${err?.message ?? err}\x1b[0m`);
    } finally {
      busyRef.current = false;
      setBusy(false);
      writePrompt(term);
    }
  }, [ensureMounted, onFileSyncNeeded]);

  /* Expose runCommand for quick actions */
  const runQuickCmd = useCallback((cmd: string) => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;
    if (busyRef.current) return;
    term.writeln(cmd);
    runCommand(cmd, term);
  }, [runCommand]);

  if (initError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, color: C.red, fontFamily: 'monospace', fontSize: 13, padding: 16, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 24 }}>⚠</span>
        <span style={{ fontWeight: 600 }}>Terminal init failed</span>
        <span style={{ color: C.muted, fontSize: 11, textAlign: 'center', maxWidth: 400 }}>{initError}</span>
        <span style={{ color: C.blue, fontSize: 11 }}>xterm.js requires a modern browser.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>
      {/* Quick actions */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', flexShrink: 0,
        background: C.panel, borderBottom: `1px solid ${C.border}`, overflowX: 'auto',
      }}>
        {QUICK_CMDS.map(({ label, cmd, icon }) => (
          <button
            key={cmd}
            title={cmd}
            disabled={busy}
            onClick={() => runQuickCmd(cmd)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', fontSize: 11, borderRadius: 4,
              background: busy ? 'rgba(86,156,214,0.04)' : 'rgba(86,156,214,0.08)',
              border: `1px solid ${busy ? 'rgba(86,156,214,0.1)' : 'rgba(86,156,214,0.25)'}`,
              color: busy ? C.dimmed : C.blue,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: "'JetBrains Mono', Menlo, monospace",
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!busy) { (e.currentTarget as HTMLElement).style.background = 'rgba(86,156,214,0.16)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = busy ? 'rgba(86,156,214,0.04)' : 'rgba(86,156,214,0.08)'; }}
          >
            <span>{icon}</span> {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {busy && (
          <span style={{ fontSize: 11, color: C.amber, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            running…
          </span>
        )}
        <button
          title="Clear terminal (Ctrl+L)"
          onClick={() => xtermRef.current?.clear()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: '3px 6px', borderRadius: 3, fontSize: 12, flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
        >✕ clear</button>
        <button
          title="Sync files to container"
          disabled={busy}
          onClick={async () => {
            if (!xtermRef.current) return;
            setMounted(false);
            xtermRef.current.writeln('\r\n\x1b[33mRe-mounting project files…\x1b[0m');
            await mountFilesToContainer(files, projectType);
            setMounted(true);
            xtermRef.current.writeln('\x1b[32m✓ Files synced.\x1b[0m');
            writePrompt(xtermRef.current);
          }}
          style={{
            background: busy ? 'rgba(78,201,176,0.04)' : 'rgba(78,201,176,0.08)',
            border: `1px solid ${busy ? 'rgba(78,201,176,0.1)' : 'rgba(78,201,176,0.25)'}`,
            color: busy ? C.dimmed : C.green,
            cursor: busy ? 'not-allowed' : 'pointer',
            padding: '3px 10px', borderRadius: 4, fontSize: 11,
            fontFamily: 'inherit', flexShrink: 0,
          }}
        >⟳ sync</button>
      </div>

      {/* xterm.js container */}
      <div
        ref={divRef}
        style={{
          flex: 1, overflow: 'hidden', padding: '6px 4px',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

/* ── Main component with multi-tab support ── */
const TerminalPane: React.FC = () => {
  const { files, updateFileContent } = useEditorStore();
  const projectType = detectProjectType(files);

  const [sessions, setSessions] = useState<TermSession[]>([
    { id: ++_sessId, name: 'Terminal 1', proc: null, alive: true },
  ]);
  const [activeId, setActiveId] = useState(sessions[0].id);
  const [mounted, setMounted] = useState(false);

  /* When files change in editor, mark container as needing remount */
  useEffect(() => {
    setMounted(false);
  }, [files]);

  /* Sync container FS → editor store after terminal mutates files */
  const onFileSyncNeeded = useCallback(async () => {
    const { readFileFromContainer: rfc } = await import('../utils/webContainerRuntime');
    for (const f of files) {
      if (f.type === 'image') continue;
      const path = f.folder ? `${f.folder}/${f.name}` : f.name;
      const content = await rfc(path);
      if (content !== null && content !== f.content) {
        updateFileContent(f.id, content);
      }
    }
  }, [files, updateFileContent]);

  const addSession = () => {
    const id = ++_sessId;
    const n = sessions.length + 1;
    setSessions(s => [...s, { id, name: `Terminal ${n}`, proc: null, alive: true }]);
    setActiveId(id);
  };

  const removeSession = (id: number) => {
    const remaining = sessions.filter(s => s.id !== id);
    if (remaining.length === 0) return;
    setSessions(remaining);
    if (activeId === id) setActiveId(remaining[remaining.length - 1].id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 35, flexShrink: 0,
        background: C.titlebar, borderBottom: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto', height: '100%' }}>
          {sessions.map(sess => (
            <div
              key={sess.id}
              onClick={() => setActiveId(sess.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 12px', height: '100%', cursor: 'pointer',
                background: activeId === sess.id ? C.bg : 'transparent',
                borderRight: `1px solid ${C.border}`,
                borderTop: activeId === sess.id ? `1px solid ${C.amber}` : '1px solid transparent',
                color: activeId === sess.id ? C.text : C.muted,
                fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (activeId !== sess.id) (e.currentTarget as HTMLElement).style.color = C.icon; }}
              onMouseLeave={e => { if (activeId !== sess.id) (e.currentTarget as HTMLElement).style.color = C.muted; }}
            >
              <span style={{ fontSize: 11 }}>⬡</span>
              {sess.name}
              {sessions.length > 1 && (
                <span
                  onClick={e => { e.stopPropagation(); removeSession(sess.id); }}
                  style={{ cursor: 'pointer', color: C.dimmed, fontSize: 10, marginLeft: 2, lineHeight: 1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.dimmed; }}
                  title="Close terminal"
                >✕</span>
              )}
            </div>
          ))}
        </div>
        <button
          title="New terminal"
          onClick={addSession}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
            padding: '0 12px', height: '100%', fontSize: 16, flexShrink: 0,
            display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.amber; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
        >+</button>
      </div>

      {/* Sessions */}
      {sessions.map(sess => (
        <div
          key={sess.id}
          style={{
            display: activeId === sess.id ? 'flex' : 'none',
            flexDirection: 'column', flex: 1, overflow: 'hidden',
          }}
        >
          <TerminalSession
            active={activeId === sess.id}
            files={files}
            mounted={mounted}
            setMounted={setMounted}
            onFileSyncNeeded={onFileSyncNeeded}
          />
        </div>
      ))}
    </div>
  );
};

export default TerminalPane;
