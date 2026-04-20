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
  bg:       '#0d1117',
  panel:    '#161b22',
  bar:      '#21262d',
  border:   '#30363d',
  text:     '#c9d1d9',
  muted:    '#6e7681',
  dim:      '#3d444d',
  amber:    '#e3b341',
  green:    '#3fb950',
  blue:     '#58a6ff',
  red:      '#f85149',
  cyan:     '#79c0ff',
  purple:   '#bc8cff',
  orange:   '#ffa657',
};

interface TermSession {
  id: number;
  name: string;
}

let _sessId = 0;

type CmdCategory = 'npm' | 'git' | 'files';

interface QuickCmd {
  label: string;
  cmd: string;
  category: CmdCategory;
  icon?: string;
}

const QUICK_CMDS: QuickCmd[] = [
  { label: 'install',     cmd: 'npm install',       category: 'npm',   icon: '↓' },
  { label: 'dev',         cmd: 'npm run dev',        category: 'npm',   icon: '▶' },
  { label: 'build',       cmd: 'npm run build',      category: 'npm',   icon: '⬡' },
  { label: 'start',       cmd: 'npm start',          category: 'npm',   icon: '▷' },
  { label: 'test',        cmd: 'npm test',           category: 'npm',   icon: '✓' },
  { label: 'status',      cmd: 'git status',         category: 'git',   icon: '◉' },
  { label: 'add .',       cmd: 'git add .',          category: 'git',   icon: '+' },
  { label: 'log',         cmd: 'git log --oneline -10', category: 'git', icon: '◎' },
  { label: 'diff',        cmd: 'git diff',           category: 'git',   icon: '~' },
  { label: 'pull',        cmd: 'git pull',           category: 'git',   icon: '⇓' },
  { label: 'push',        cmd: 'git push',           category: 'git',   icon: '⇑' },
  { label: 'branch',      cmd: 'git branch -a',      category: 'git',   icon: '⎇' },
  { label: 'init',        cmd: 'git init',           category: 'git',   icon: '✦' },
  { label: 'ls',          cmd: 'ls -la',             category: 'files', icon: '⊞' },
  { label: 'pwd',         cmd: 'pwd',                category: 'files', icon: '⌂' },
  { label: 'tree',        cmd: 'find . -not -path "*/node_modules/*" -not -path "*/.git/*" | head -40', category: 'files', icon: '⊳' },
  { label: 'node -v',     cmd: 'node -v',            category: 'files', icon: '⬡' },
];

const CATEGORY_COLORS: Record<CmdCategory, { fg: string; bg: string; border: string; label: string }> = {
  npm:   { fg: C.green,  bg: 'rgba(63,185,80,0.08)',   border: 'rgba(63,185,80,0.25)',  label: 'NPM' },
  git:   { fg: C.orange, bg: 'rgba(255,166,87,0.08)',  border: 'rgba(255,166,87,0.25)', label: 'GIT' },
  files: { fg: C.cyan,   bg: 'rgba(121,192,255,0.08)', border: 'rgba(121,192,255,0.25)',label: 'SH' },
};

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

const FILE_MUTATION_RE = /^\s*(touch|mkdir|rm|mv|cp|echo|printf|tee|cat\s*>|sed\s+-i|npm|node|git|yarn|pnpm)\s/;

function TerminalSession({
  active, files, containerMounted, setContainerMounted,
  onFileSyncNeeded, onReady, onUnready,
}: SessionProps) {
  const divRef       = useRef<HTMLDivElement>(null);
  const xtermRef     = useRef<any>(null);
  const fitRef       = useRef<any>(null);
  const shellRef     = useRef<{ kill: () => void; write: (d: string) => void; exit: Promise<number> } | null>(null);
  const readyRef     = useRef(false);
  const [initError, setInitError] = useState<string | null>(null);
  const mountedOnce  = useRef(false);
  const projectType  = detectProjectType(files);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSyncIfMutating = useCallback((cmd: string) => {
    if (FILE_MUTATION_RE.test(cmd)) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => { onFileSyncNeeded(); }, 1200);
    }
  }, [onFileSyncNeeded]);

  const writeToTerminal = useCallback((text: string) => {
    xtermRef.current?.write(text);
  }, []);

  const runQuickCmd = useCallback((cmd: string) => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.write(cmd + '\r');
    scheduleSyncIfMutating(cmd);
  }, [scheduleSyncIfMutating]);

  useEffect(() => {
    if (!divRef.current || mountedOnce.current) return;
    mountedOnce.current = true;

    let term: any;
    let fitAddon: any;
    let destroyed = false;
    let ro: ResizeObserver | null = null;
    let fitTimer: ReturnType<typeof setTimeout> | null = null;

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
            selectionBackground: 'rgba(58,105,163,0.35)',
            black:               '#21262d',
            red:                 C.red,
            green:               C.green,
            yellow:              C.amber,
            blue:                C.blue,
            magenta:             C.purple,
            cyan:                C.cyan,
            white:               C.text,
            brightBlack:         '#6e7681',
            brightRed:           '#ffa198',
            brightGreen:         '#56d364',
            brightYellow:        '#e3b341',
            brightBlue:          '#79c0ff',
            brightMagenta:       '#d2a8ff',
            brightCyan:          '#b3f0ff',
            brightWhite:         '#e6edf3',
          },
          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace",
          fontSize: 13,
          lineHeight: 1.55,
          letterSpacing: 0.3,
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 5000,
          allowProposedApi: true,
          convertEol: true,
          fastScrollModifier: 'alt',
          macOptionIsMeta: true,
          smoothScrollDuration: 100,
        });

        fitAddon = new fitMod.FitAddon();
        const webLinksAddon = new webLinksMod.WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        term.open(divRef.current!);

        requestAnimationFrame(() => { try { fitAddon.fit(); } catch {} });

        xtermRef.current = term;
        fitRef.current   = fitAddon;

        /* ── Mount project files ── */
        term.writeln('\x1b[2m  Mounting project files…\x1b[0m');
        try {
          await mountFilesToContainer(files, projectType);
          setContainerMounted(true);
          term.writeln('\x1b[2m  ✓ Files mounted · WebContainer Node 20\x1b[0m\r\n');
        } catch (e: any) {
          const msg = String(e?.message ?? e);
          if (/cross-origin|sharedarraybuffer|isolated/i.test(msg)) {
            term.writeln('\x1b[31m  ✕ Cross-Origin Isolation required\x1b[0m');
            term.writeln('\x1b[2m  Open in a standalone browser tab for terminal support\x1b[0m');
          } else {
            term.writeln(`\x1b[31m  ✕ ${msg}\x1b[0m`);
          }
        }

        if (destroyed) return;

        const dims = {
          cols: term.cols ?? 80,
          rows: term.rows ?? 24,
        };

        /* ── Spawn persistent interactive shell (jsh) ── */
        const shell = await spawnInContainer('jsh', [], d => term.write(d), dims);
        shellRef.current = shell;

        /* ── Pipe all xterm input → shell stdin ── */
        term.onData((data: string) => {
          shellRef.current?.write(data);
        });

        /* ── Resize shell when terminal resizes ── */
        term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
          (shellRef.current as any)?.resize?.({ cols, rows });
        });

        readyRef.current = true;
        onReady(writeToTerminal, runQuickCmd);

        ro = new ResizeObserver(() => {
          if (fitTimer) clearTimeout(fitTimer);
          fitTimer = setTimeout(() => {
            if (!destroyed) {
              requestAnimationFrame(() => {
                try {
                  fitAddon.fit();
                } catch {}
              });
            }
          }, 120);
        });
        const watchEl = divRef.current?.parentElement ?? divRef.current;
        if (watchEl) ro.observe(watchEl);

        shell.exit.then(() => {
          if (!destroyed) term.writeln('\r\n\x1b[2m  Shell exited\x1b[0m');
        }).catch(() => {});

      } catch (err: any) {
        setInitError(err?.message ?? 'Failed to initialise terminal');
      }
    })();

    return () => {
      destroyed = true;
      if (fitTimer) clearTimeout(fitTimer);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      readyRef.current = false;
      shellRef.current?.kill();
      shellRef.current = null;
      onUnready();
      ro?.disconnect();
      try { term?.dispose(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active && fitRef.current) {
      requestAnimationFrame(() => { try { fitRef.current.fit(); } catch {} });
    }
  }, [active]);

  if (initError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: C.bg, color: C.red, fontFamily: 'monospace', fontSize: 13,
        padding: 24, justifyContent: 'center', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 22, opacity: 0.8 }}>⚠</span>
        <span style={{ fontWeight: 600 }}>Terminal init failed</span>
        <span style={{ color: C.muted, fontSize: 11, textAlign: 'center', maxWidth: 380 }}>{initError}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: C.bg }}>
      <div ref={divRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '4px 4px 0', boxSizing: 'border-box' }} />
    </div>
  );
}

const TerminalPane: React.FC = () => {
  const { files, updateFileContent, setTerminalWrite, setTerminalRunCommand } = useEditorStore();
  const projectType = detectProjectType(files);

  const [sessions, setSessions] = useState<TermSession[]>([{ id: ++_sessId, name: 'bash' }]);
  const [activeId, setActiveId]   = useState(sessions[0].id);
  const [containerMounted, setContainerMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CmdCategory>('npm');

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

  const runQuick = (cmd: string) => {
    const fns = sessionFnsRef.current.get(activeId);
    fns?.run(cmd);
  };

  const filteredCmds = QUICK_CMDS.filter(c => c.category === activeCategory);
  const catCfg = CATEGORY_COLORS[activeCategory];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: C.bg }}>

      {/* ── Top bar: tabs + controls ── */}
      <div style={{
        display: 'flex', alignItems: 'stretch', height: 33, flexShrink: 0,
        background: C.panel, borderBottom: `1px solid ${C.border}`,
      }}>
        {/* Session tabs */}
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto', alignItems: 'stretch' }}>
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
                  borderBottom: `2px solid ${isActive ? C.green : 'transparent'}`,
                  color: isActive ? C.text : C.muted,
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'color 0.1s, border-color 0.15s',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 9, color: isActive ? C.green : C.muted }}>$</span>
                {sess.name}
                {sessions.length > 1 && (
                  <span
                    onClick={e => { e.stopPropagation(); removeSession(sess.id); }}
                    style={{ cursor: 'pointer', color: C.muted, fontSize: 9, lineHeight: 1, padding: '1px 2px', borderRadius: 2 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
                    title="Close tab"
                  >✕</span>
                )}
              </div>
            );
          })}
        </div>

        {/* New tab + sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderLeft: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            title="New terminal"
            onClick={addSession}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, padding: '0 11px', height: '100%',
              fontSize: 17, display: 'flex', alignItems: 'center',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
          >+</button>
          <button
            title="Sync project files to container"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, padding: '0 11px', height: '100%',
              fontSize: 11, display: 'flex', alignItems: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'color 0.1s',
            }}
            onClick={async () => {
              const fns = sessionFnsRef.current.get(activeId);
              if (!fns) return;
              fns.write('\r\n\x1b[33m  Syncing…\x1b[0m');
              await mountFilesToContainer(files, projectType);
              setContainerMounted(true);
              fns.write('\r\n\x1b[32m  ✓ Synced\x1b[0m\r\n\x1b[38;2;88;166;255m❯\x1b[0m ');
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.cyan; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
          >⟳</button>
        </div>
      </div>

      {/* ── Quick command bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: C.bar, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0, minHeight: 32,
      }}>
        {/* Category toggles */}
        {(['npm', 'git', 'files'] as CmdCategory[]).map(cat => {
          const cfg = CATEGORY_COLORS[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0 12px', height: 32, border: 'none', cursor: 'pointer',
                background: isActive ? cfg.bg : 'transparent',
                borderRight: `1px solid ${C.border}`,
                borderBottom: `2px solid ${isActive ? cfg.fg : 'transparent'}`,
                color: isActive ? cfg.fg : C.muted,
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700, letterSpacing: '0.08em',
                transition: 'all 0.12s', flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = cfg.fg; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = C.muted; }}
            >
              {cfg.label}
            </button>
          );
        })}

        {/* Commands for active category */}
        <div style={{ display: 'flex', gap: 3, padding: '0 8px', overflowX: 'auto', flex: 1, alignItems: 'center' }}>
          {filteredCmds.map(({ label, cmd, icon }) => (
            <button
              key={cmd}
              title={cmd}
              onClick={() => runQuick(cmd)}
              style={{
                padding: '3px 9px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                background: catCfg.bg,
                border: `1px solid ${catCfg.border}`,
                color: catCfg.fg,
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: 'nowrap', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = catCfg.bg.replace('0.08', '0.18');
                el.style.borderColor = catCfg.fg;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = catCfg.bg;
                el.style.borderColor = catCfg.border;
              }}
            >
              {icon && <span style={{ fontSize: 9, opacity: 0.8 }}>{icon}</span>}
              {label}
            </button>
          ))}
        </div>

        {/* Clear */}
        <button
          title="Clear (Ctrl+L)"
          onClick={() => {
            const fns = sessionFnsRef.current.get(activeId);
            if (fns) {
              const term = (sessionFnsRef.current as any)._termRef?.[activeId];
              fns.write('\x1b[2J\x1b[H');
            }
            const allSessions = Array.from(sessionFnsRef.current.entries());
            const current = allSessions.find(([id]) => id === activeId);
            if (current) current[1].write('\x1b[2J\x1b[H\x1b[38;2;88;166;255m❯\x1b[0m ');
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: 10, padding: '0 10px', height: 32,
            fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
            borderLeft: `1px solid ${C.border}`,
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
        >clr</button>
      </div>

      {/* ── Terminal sessions ── */}
      {sessions.map(sess => (
        <div
          key={sess.id}
          style={{
            display: activeId === sess.id ? 'flex' : 'none',
            flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden',
          }}
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
