import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { FileItem } from '../store/editorStore';
import {
  spawnInContainer,
  mountFilesToContainer,
  readFileFromContainer,
} from '../utils/webContainerRuntime';
import { detectProjectType } from '../utils/fileTypes';

const C = {
  bg:       '#1e1e1e',
  panel:    '#252526',
  bar:      '#2d2d2d',
  border:   '#3e3e3e',
  text:     '#cccccc',
  muted:    '#6e6e6e',
  dim:      '#444',
  amber:    '#e5a45a',
  green:    '#4ec9b0',
  blue:     '#569cd6',
  red:      '#f44747',
  cyan:     '#9cdcfe',
};

interface TermSession {
  id: number;
  name: string;
}

let _sessId = 0;

const QUICK_CMDS = [
  { label: 'npm install',   cmd: 'npm install' },
  { label: 'npm run dev',   cmd: 'npm run dev' },
  { label: 'npm run build', cmd: 'npm run build' },
  { label: 'npm start',     cmd: 'npm start' },
  { label: 'ls -la',        cmd: 'ls -la' },
  { label: 'node -v',       cmd: 'node -v' },
];

interface SessionProps {
  sessionId: number;
  active: boolean;
  files: FileItem[];
  containerMounted: boolean;
  setContainerMounted: (v: boolean) => void;
  onFileSyncNeeded: () => void;
  onReady: (write: (text: string) => void, run: (cmd: string) => void) => void;
  onUnready: () => void;
}

function TerminalSession({
  active, files, containerMounted, setContainerMounted,
  onFileSyncNeeded, onReady, onUnready,
}: SessionProps) {
  const divRef    = useRef<HTMLDivElement>(null);
  const xtermRef  = useRef<any>(null);
  const fitRef    = useRef<any>(null);
  const procRef   = useRef<{ kill: () => void; write: (d: string) => void; exit: Promise<number> } | null>(null);
  const busyRef   = useRef(false);
  const readyRef  = useRef(false);
  const [busy, setBusy]           = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const mountedOnce = useRef(false);
  const projectType = detectProjectType(files);

  const writePrompt = (term: any) => {
    term.write('\r\n\x1b[2m~/project\x1b[0m \x1b[36m❯\x1b[0m ');
  };

  const clearLine = (term: any, len: number) => {
    if (len > 0) term.write('\b'.repeat(len) + ' '.repeat(len) + '\b'.repeat(len));
  };

  const ensureMounted = useCallback(async (term: any) => {
    if (containerMounted) return true;
    term.writeln('\x1b[33m  Mounting project files into WebContainer…\x1b[0m');
    try {
      await mountFilesToContainer(files, projectType);
      setContainerMounted(true);
      term.writeln('\x1b[32m  ✓ Container ready.\x1b[0m');
      return true;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/cross-origin|sharedarraybuffer|isolated/i.test(msg)) {
        term.writeln('\x1b[31m  ✕ Cross-Origin Isolation required.\x1b[0m');
        term.writeln('\x1b[2m  Open the app in a dedicated browser tab (not inside an iframe).\x1b[0m');
      } else {
        term.writeln(`\x1b[31m  ✕ ${msg}\x1b[0m`);
      }
      return false;
    }
  }, [containerMounted, files, projectType, setContainerMounted]);

  const FILE_MUTATION_RE = /^(touch|mkdir|rm|mv|cp|echo|printf|tee|cat\s+>|sed\s+-i|npm|node|git|yarn|pnpm)\s/;

  const runCommand = useCallback(async (cmd: string, term: any) => {
    busyRef.current = true;
    setBusy(true);

    const ok = await ensureMounted(term);
    if (!ok) { busyRef.current = false; setBusy(false); writePrompt(term); return; }

    const dims = fitRef.current
      ? { cols: (xtermRef.current as any)?.cols ?? 80, rows: (xtermRef.current as any)?.rows ?? 24 }
      : { cols: 80, rows: 24 };

    try {
      const proc = await spawnInContainer('sh', ['-c', cmd], d => term.write(d), dims);
      procRef.current = proc;
      const code = await proc.exit;
      procRef.current = null;
      if (code !== 0) {
        term.write(`\r\n\x1b[31m  [exit ${code}]\x1b[0m`);
      }
      if (FILE_MUTATION_RE.test(cmd + ' ') || cmd.trim() === 'npm install') {
        onFileSyncNeeded();
      }
    } catch (err: any) {
      term.write(`\r\n\x1b[31m  Error: ${err?.message ?? err}\x1b[0m`);
    } finally {
      busyRef.current = false;
      setBusy(false);
      writePrompt(term);
    }
  }, [ensureMounted, onFileSyncNeeded]);

  const runCommandRef = useRef(runCommand);
  useEffect(() => { runCommandRef.current = runCommand; }, [runCommand]);

  const runQuickCmd = useCallback((cmd: string) => {
    const term = xtermRef.current;
    if (!term || busyRef.current) return;
    term.write(`\x1b[2m${cmd}\x1b[0m`);
    runCommandRef.current(cmd, term);
  }, []);

  const writeToTerminal = useCallback((text: string) => {
    xtermRef.current?.write(text);
  }, []);

  useEffect(() => {
    if (!divRef.current || mountedOnce.current) return;
    mountedOnce.current = true;

    let term: any;
    let fitAddon: any;
    let destroyed = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        const [xtermMod, fitMod, webLinksMod] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
        ]);

        if (destroyed) return;

        term = new xtermMod.Terminal({
          theme: {
            background:          C.bg,
            foreground:          C.text,
            cursor:              C.amber,
            cursorAccent:        C.bg,
            selectionBackground: 'rgba(229,164,90,0.18)',
            black:               '#3c3c3c',
            red:                 C.red,
            green:               C.green,
            yellow:              C.amber,
            blue:                C.blue,
            magenta:             '#c586c0',
            cyan:                C.cyan,
            white:               C.text,
            brightBlack:         '#666',
            brightRed:           '#f97583',
            brightGreen:         '#a8ff78',
            brightYellow:        '#ffdf5d',
            brightBlue:          '#79b8ff',
            brightMagenta:       '#e1acff',
            brightCyan:          '#b3f0ff',
            brightWhite:         '#e8e8e8',
          },
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
          fontSize: 13,
          lineHeight: 1.5,
          letterSpacing: 0,
          cursorBlink: true,
          cursorStyle: 'underline',
          scrollback: 8000,
          allowProposedApi: true,
          convertEol: true,
        });

        fitAddon = new fitMod.FitAddon();
        const webLinksAddon = new webLinksMod.WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        term.open(divRef.current!);
        fitAddon.fit();
        setTimeout(() => { try { fitAddon.fit(); } catch {} }, 50);

        xtermRef.current = term;
        fitRef.current   = fitAddon;

        term.writeln('\x1b[2m  WebContainer Terminal  ·  Node 20\x1b[0m');
        term.writeln('\x1b[2m  Type a command or use the quick-action bar.\x1b[0m');

        let inputBuf  = '';
        let histBuf: string[] = [];
        let histIdx   = -1;

        term.onKey(async ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
          const ev = domEvent;

          if (ev.ctrlKey && ev.key === 'c') {
            if (procRef.current) { procRef.current.kill(); procRef.current = null; }
            busyRef.current = false; setBusy(false);
            term.write('^C');
            inputBuf = '';
            writePrompt(term);
            return;
          }
          if (ev.ctrlKey && ev.key === 'l') { term.clear(); writePrompt(term); return; }

          if (busyRef.current && key !== '\x03') {
            procRef.current?.write(key);
            return;
          }

          if (ev.key === 'Enter') {
            term.writeln('');
            const cmd = inputBuf.trim();
            inputBuf = '';
            if (cmd) {
              histBuf = [cmd, ...histBuf.filter(c => c !== cmd)].slice(0, 200);
              histIdx = -1;
              await runCommand(cmd, term);
            } else {
              writePrompt(term);
            }
          } else if (ev.key === 'Backspace') {
            if (inputBuf.length > 0) { inputBuf = inputBuf.slice(0, -1); term.write('\b \b'); }
          } else if (ev.key === 'ArrowUp') {
            histIdx = Math.min(histIdx + 1, histBuf.length - 1);
            if (histIdx >= 0) { clearLine(term, inputBuf.length); inputBuf = histBuf[histIdx]; term.write(inputBuf); }
          } else if (ev.key === 'ArrowDown') {
            histIdx = Math.max(histIdx - 1, -1);
            clearLine(term, inputBuf.length);
            inputBuf = histIdx >= 0 ? histBuf[histIdx] : '';
            term.write(inputBuf);
          } else if (ev.key === 'Tab') {
            ev.preventDefault();
          } else if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && key.length === 1) {
            inputBuf += key;
            term.write(key);
          }
        });

        writePrompt(term);
        readyRef.current = true;
        onReady(writeToTerminal, runQuickCmd);

        let fitTimer: ReturnType<typeof setTimeout> | null = null;
        ro = new ResizeObserver(() => {
          if (fitTimer) clearTimeout(fitTimer);
          fitTimer = setTimeout(() => { try { fitAddon.fit(); } catch {} }, 80);
        });
        if (divRef.current) ro.observe(divRef.current.parentElement ?? divRef.current);
      } catch (err: any) {
        setInitError(err?.message ?? 'Failed to initialise terminal');
      }
    })();

    return () => {
      destroyed = true;
      readyRef.current = false;
      onUnready();
      ro?.disconnect();
      try { term?.dispose(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active && fitRef.current) setTimeout(() => { try { fitRef.current.fit(); } catch {} }, 50);
  }, [active]);

  if (initError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: C.bg, color: C.red, fontFamily: 'monospace', fontSize: 13,
        padding: 24, justifyContent: 'center', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 20 }}>✕</span>
        <span style={{ fontWeight: 600 }}>Terminal failed to initialise</span>
        <span style={{ color: C.muted, fontSize: 11, textAlign: 'center', maxWidth: 380 }}>{initError}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: C.bg }}>
      {/* Quick-action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
        background: C.bar, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        overflowX: 'auto', minHeight: 30,
      }}>
        <span style={{ fontSize: 10, color: C.muted, marginRight: 4, flexShrink: 0, fontFamily: 'monospace' }}>
          RUN
        </span>
        {QUICK_CMDS.map(({ label, cmd }) => (
          <button
            key={cmd}
            title={cmd}
            disabled={busy}
            onClick={() => runQuickCmd(cmd)}
            style={{
              padding: '2px 9px', fontSize: 11, borderRadius: 3, cursor: busy ? 'not-allowed' : 'pointer',
              background: busy ? 'transparent' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${busy ? C.dim : 'rgba(255,255,255,0.1)'}`,
              color: busy ? C.dim : C.text,
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.1s',
            }}
            onMouseEnter={e => { if (!busy) { (e.currentTarget as HTMLElement).style.borderColor = C.blue; (e.currentTarget as HTMLElement).style.color = C.blue; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = busy ? C.dim : 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = busy ? C.dim : C.text; }}
          >
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {busy && (
          <span style={{ fontSize: 10, color: C.amber, fontFamily: 'monospace', flexShrink: 0 }}>
            ● running
          </span>
        )}
        <button
          title="Ctrl+L — Clear"
          onClick={() => { xtermRef.current?.clear(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
            fontSize: 10, padding: '2px 6px', fontFamily: 'monospace', flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
        >
          clear
        </button>
        <button
          title="Re-mount project files"
          disabled={busy}
          onClick={async () => {
            if (!xtermRef.current) return;
            setContainerMounted(false);
            xtermRef.current.write('\r\n\x1b[33m  Syncing project files…\x1b[0m');
            await mountFilesToContainer(files, projectType);
            setContainerMounted(true);
            xtermRef.current.write('\r\n\x1b[32m  ✓ Files synced.\x1b[0m');
            writePrompt(xtermRef.current);
          }}
          style={{
            background: 'none', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
            color: busy ? C.dim : C.muted,
            fontSize: 10, padding: '2px 6px', fontFamily: 'monospace', flexShrink: 0,
          }}
          onMouseEnter={e => { if (!busy) (e.currentTarget as HTMLElement).style.color = C.green; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = busy ? C.dim : C.muted; }}
        >
          sync
        </button>
      </div>

      {/* xterm.js canvas — no padding on this div; xterm measures offsetWidth/offsetHeight directly */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '4px 2px', boxSizing: 'border-box', background: C.bg }}>
        <div ref={divRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
      </div>
    </div>
  );
}

const TerminalPane: React.FC = () => {
  const { files, updateFileContent, setTerminalWrite, setTerminalRunCommand } = useEditorStore();
  const projectType = detectProjectType(files);

  const [sessions, setSessions] = useState<TermSession[]>([{ id: ++_sessId, name: 'bash' }]);
  const [activeId, setActiveId]   = useState(sessions[0].id);
  const [containerMounted, setContainerMounted] = useState(false);

  const sessionFnsRef = useRef<Map<number, { write: (t: string) => void; run: (c: string) => void }>>(new Map());

  const registerStore = useCallback(() => {
    const fns = sessionFnsRef.current.get(activeId);
    if (fns) {
      setTerminalWrite(fns.write);
      setTerminalRunCommand(fns.run);
    } else {
      setTerminalWrite(null);
      setTerminalRunCommand(null);
    }
  }, [activeId, setTerminalWrite, setTerminalRunCommand]);

  useEffect(() => { registerStore(); }, [registerStore]);

  useEffect(() => {
    return () => {
      setTerminalWrite(null);
      setTerminalRunCommand(null);
    };
  }, [setTerminalWrite, setTerminalRunCommand]);

  useEffect(() => { setContainerMounted(false); }, [files]);

  const onFileSyncNeeded = useCallback(async () => {
    for (const f of files) {
      if (f.type === 'image') continue;
      const path = f.folder ? `${f.folder}/${f.name}` : f.name;
      const content = await readFileFromContainer(path);
      if (content !== null && content !== f.content) {
        updateFileContent(f.id, content);
      }
    }
  }, [files, updateFileContent]);

  const addSession = () => {
    const id = ++_sessId;
    const n = sessions.length + 1;
    setSessions(s => [...s, { id, name: `bash-${n}` }]);
    setActiveId(id);
  };

  const removeSession = (id: number) => {
    const remaining = sessions.filter(s => s.id !== id);
    if (remaining.length === 0) return;
    sessionFnsRef.current.delete(id);
    setSessions(remaining);
    if (activeId === id) setActiveId(remaining[remaining.length - 1].id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: C.bg }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 32, flexShrink: 0,
        background: C.panel, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto', height: '100%', alignItems: 'stretch' }}>
          {sessions.map(sess => {
            const isActive = activeId === sess.id;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveId(sess.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '0 14px', cursor: 'pointer', flexShrink: 0,
                  background: isActive ? C.bg : 'transparent',
                  borderRight: `1px solid ${C.border}`,
                  borderTop: `2px solid ${isActive ? C.green : 'transparent'}`,
                  color: isActive ? C.text : C.muted,
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'color 0.1s',
                }}
              >
                <span style={{ fontSize: 9, opacity: 0.6 }}>▶</span>
                {sess.name}
                {sessions.length > 1 && (
                  <span
                    onClick={e => { e.stopPropagation(); removeSession(sess.id); }}
                    style={{ cursor: 'pointer', color: C.muted, fontSize: 9, lineHeight: 1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
                    title="Close"
                  >✕</span>
                )}
              </div>
            );
          })}
        </div>
        <button
          title="New terminal"
          onClick={addSession}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, padding: '0 12px', height: '100%',
            fontSize: 16, display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
        >+</button>
      </div>

      {/* Sessions */}
      {sessions.map(sess => (
        <div
          key={sess.id}
          style={{ display: activeId === sess.id ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <TerminalSession
            sessionId={sess.id}
            active={activeId === sess.id}
            files={files}
            containerMounted={containerMounted}
            setContainerMounted={setContainerMounted}
            onFileSyncNeeded={onFileSyncNeeded}
            onReady={(write, run) => {
              sessionFnsRef.current.set(sess.id, { write, run });
              if (sess.id === activeId) {
                setTerminalWrite(write);
                setTerminalRunCommand(run);
              }
            }}
            onUnready={() => {
              sessionFnsRef.current.delete(sess.id);
              if (sess.id === activeId) {
                setTerminalWrite(null);
                setTerminalRunCommand(null);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default TerminalPane;
