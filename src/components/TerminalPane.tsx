import React, { useRef, useEffect, useCallback, useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { useEditorStore } from '../store/editorStore';
import type { FileItem } from '../store/editorStore';
import {
  spawnInContainer,
  mountFilesToContainer,
  fullScanContainerFS,
} from '../utils/webContainerRuntime';
import { getFileTypeForName, detectProjectType } from '../utils/fileTypes';
import {
  FiPlus, FiTrash2, FiSearch, FiColumns, FiZoomIn, FiZoomOut,
  FiRefreshCw, FiChevronUp, FiChevronDown, FiX,
} from 'react-icons/fi';

/* ─── Theme — matches the VS Code–style app palette ─── */
const C = {
  bg:       '#1e1e1e',
  panel:    '#252526',
  bar:      '#2d2d2d',
  border:   '#3e3e3e',
  text:     '#cccccc',
  muted:    '#888888',
  dim:      '#555555',
  amber:    '#e5a45a',
  green:    '#4ec9b0',
  blue:     '#569cd6',
  red:      '#f44747',
  cyan:     '#9cdcfe',
  purple:   '#c586c0',
  orange:   '#ce9178',
};

/* ─── Types ─── */
interface TermSession { id: number; name: string; }
interface TermCtxMenu { x: number; y: number; hasSelection: boolean; }

let _sessId = 0;
const FILE_MUTATION_RE = /^\s*(touch|mkdir|rm|mv|cp|echo|printf|tee|cat\s*>|sed\s+-i|npm|node|git|yarn|pnpm)\s/;

/* ─── Quick Commands ─── */
type CmdCategory = 'npm' | 'git' | 'files';
const QUICK_CMDS = [
  { label: 'install', cmd: 'npm install',                   category: 'npm'   as CmdCategory, icon: '↓' },
  { label: 'dev',     cmd: 'npm run dev',                   category: 'npm'   as CmdCategory, icon: '▶' },
  { label: 'build',   cmd: 'npm run build',                 category: 'npm'   as CmdCategory, icon: '⬡' },
  { label: 'start',   cmd: 'npm start',                     category: 'npm'   as CmdCategory, icon: '▷' },
  { label: 'test',    cmd: 'npm test',                      category: 'npm'   as CmdCategory, icon: '✓' },
  { label: 'status',  cmd: 'git status',                    category: 'git'   as CmdCategory, icon: '◉' },
  { label: 'add .',   cmd: 'git add .',                     category: 'git'   as CmdCategory, icon: '+' },
  { label: 'log',     cmd: 'git log --oneline -10',         category: 'git'   as CmdCategory, icon: '◎' },
  { label: 'diff',    cmd: 'git diff',                      category: 'git'   as CmdCategory, icon: '~' },
  { label: 'pull',    cmd: 'git pull',                      category: 'git'   as CmdCategory, icon: '⇓' },
  { label: 'push',    cmd: 'git push',                      category: 'git'   as CmdCategory, icon: '⇑' },
  { label: 'branch',  cmd: 'git branch -a',                 category: 'git'   as CmdCategory, icon: '⎇' },
  { label: 'ls',      cmd: 'ls -la',                        category: 'files' as CmdCategory, icon: '⊞' },
  { label: 'pwd',     cmd: 'pwd',                           category: 'files' as CmdCategory, icon: '⌂' },
  { label: 'tree',    cmd: 'find . -not -path "*/node_modules/*" -not -path "*/.git/*" | head -40', category: 'files' as CmdCategory, icon: '⊳' },
  { label: 'node -v', cmd: 'node -v',                       category: 'files' as CmdCategory, icon: '⬡' },
];
const CAT_CFG: Record<CmdCategory, { fg: string; bg: string; border: string; label: string }> = {
  npm:   { fg: C.green,  bg: 'rgba(63,185,80,0.08)',   border: 'rgba(63,185,80,0.25)',   label: 'NPM' },
  git:   { fg: C.orange, bg: 'rgba(255,166,87,0.08)',  border: 'rgba(255,166,87,0.25)',  label: 'GIT' },
  files: { fg: C.cyan,   bg: 'rgba(121,192,255,0.08)', border: 'rgba(121,192,255,0.25)', label: 'SH'  },
};

/* ─── Session props ─── */
interface SessionProps {
  sessionId: number;
  active: boolean;
  files: FileItem[];
  containerMounted: boolean;
  setContainerMounted: (v: boolean) => void;
  onFileSyncNeeded: () => void;
  onReady: (write: (t: string) => void, run: (c: string) => void, xterm: () => any) => void;
  onUnready: () => void;
  fontSize: number;
  showFind: boolean;
  onCloseFind: () => void;
}

/* ════════════════════════════════════════════════════════════
   TerminalSession — one xterm instance + find bar + ctx menu
   ════════════════════════════════════════════════════════════ */
function TerminalSession({
  active, files, containerMounted, setContainerMounted,
  onFileSyncNeeded, onReady, onUnready,
  fontSize, showFind, onCloseFind,
}: SessionProps) {
  const divRef       = useRef<HTMLDivElement>(null);
  const xtermRef     = useRef<any>(null);
  const fitRef       = useRef<any>(null);
  const searchRef    = useRef<any>(null);
  const shellRef     = useRef<{ kill: () => void; write: (d: string) => void; exit: Promise<number> } | null>(null);
  const readyRef     = useRef(false);
  const mountedOnce  = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmdLinesRef  = useRef<number[]>([]);    // scrollback line numbers for each command
  const currentLineRef = useRef(0);

  const [initError, setInitError]     = useState<string | null>(null);
  const [ctxMenu, setCtxMenu]         = useState<TermCtxMenu | null>(null);
  const [findQuery, setFindQuery]     = useState('');
  const [findMatchIdx, setFindMatchIdx] = useState(0);
  const [findMatchTotal, setFindMatchTotal] = useState(0);
  const [findCase, setFindCase]       = useState(false);
  const [findRegex, setFindRegex]     = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  /* ── find helpers ── */
  const doFind = useCallback((q: string, forward = true, cs = findCase, rx = findRegex) => {
    const s = searchRef.current;
    if (!s || !q) return;
    const opts = { caseSensitive: cs, regex: rx, incremental: false };
    const found = forward ? s.findNext(q, opts) : s.findPrevious(q, opts);
    if (found) {
      setFindMatchIdx(prev => forward ? prev + 1 : Math.max(1, prev - 1));
    }
  }, [findCase, findRegex]);

  /* Run when showFind opens */
  useEffect(() => {
    if (showFind) {
      setTimeout(() => findInputRef.current?.focus(), 30);
    } else {
      searchRef.current?.clearDecorations?.();
      setFindQuery('');
      setFindMatchIdx(0);
      setFindMatchTotal(0);
    }
  }, [showFind]);

  /* ── font size sync ── */
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      try { fitRef.current?.fit(); } catch {}
    }
  }, [fontSize]);

  const scheduleSyncIfMutating = useCallback((cmd: string) => {
    if (!FILE_MUTATION_RE.test(cmd)) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    // npm install / yarn / pnpm can take 20–60 s, so poll more generously
    const isInstall = /npm\s+install|yarn(\s+install)?|pnpm\s+install/.test(cmd);
    const delay = isInstall ? 45_000 : 2_000;
    syncTimerRef.current = setTimeout(() => { onFileSyncNeeded(); }, delay);
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

  const getXterm = useCallback(() => xtermRef.current, []);

  /* ── xterm init ── */
  useEffect(() => {
    if (!divRef.current || mountedOnce.current) return;
    mountedOnce.current = true;

    let term: any;
    let fitAddon: any;
    let searchAddon: any;
    let destroyed = false;
    let ro: ResizeObserver | null = null;
    let fitTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const [xtermMod, fitMod, webLinksMod, searchMod] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
          import('@xterm/addon-search'),
        ]);

        if (destroyed) return;

        term = new xtermMod.Terminal({
          theme: {
            background:           C.bg,
            foreground:           C.text,
            cursor:               C.amber,
            cursorAccent:         C.bg,
            selectionBackground:  'rgba(38,79,120,0.5)',
            selectionForeground:  '#ffffff',
            black:                '#3e3e3e',
            red:                  '#f44747',
            green:                '#4ec9b0',
            yellow:               '#e5a45a',
            blue:                 '#569cd6',
            magenta:              '#c586c0',
            cyan:                 '#9cdcfe',
            white:                '#cccccc',
            brightBlack:          '#888888',
            brightRed:            '#f48771',
            brightGreen:          '#89d185',
            brightYellow:         '#dcdcaa',
            brightBlue:           '#75beff',
            brightMagenta:        '#d7ba7d',
            brightCyan:           '#b5cea8',
            brightWhite:          '#e6edf3',
          },
          fontFamily:         "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace",
          fontSize,
          lineHeight:         1.55,
          letterSpacing:      0.3,
          cursorBlink:        true,
          cursorStyle:        'bar',
          scrollback:         10000,
          allowProposedApi:   true,
          convertEol:         true,
          macOptionIsMeta:    true,
          smoothScrollDuration: 80,
          scrollSensitivity:  3,
          overviewRulerWidth: 15,
        });

        fitAddon    = new fitMod.FitAddon();
        searchAddon = new searchMod.SearchAddon();
        const webLinksAddon = new webLinksMod.WebLinksAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(searchAddon);
        term.loadAddon(webLinksAddon);
        term.open(divRef.current!);

        requestAnimationFrame(() => { try { fitAddon.fit(); } catch {} });

        xtermRef.current  = term;
        fitRef.current    = fitAddon;
        searchRef.current = searchAddon;

        /* ── Shell integration: track command line positions ── */
        term.onData((data: string) => {
          if (data === '\r' || data === '\n') {
            // User pressed Enter — record current row as a command start
            const row = (term as any).buffer?.active?.cursorY ?? 0;
            const baseY = (term as any).buffer?.active?.baseY ?? 0;
            cmdLinesRef.current.push(baseY + row);
          }
        });

        /* ── Mount project files ── */
        term.writeln('\x1b[2m  Mounting project files…\x1b[0m');
        const projectType = detectProjectType(files);
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

        const dims = { cols: term.cols ?? 80, rows: term.rows ?? 24 };
        const shell = await spawnInContainer('jsh', [], d => term.write(d), dims);
        shellRef.current = shell;

        /* ── Pipe input → shell ── */
        term.onData((data: string) => {
          shellRef.current?.write(data);
        });

        term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
          (shellRef.current as any)?.resize?.({ cols, rows });
        });

        readyRef.current = true;
        onReady(writeToTerminal, runQuickCmd, getXterm);

        ro = new ResizeObserver(() => {
          if (fitTimer) clearTimeout(fitTimer);
          fitTimer = setTimeout(() => {
            if (!destroyed) requestAnimationFrame(() => { try { fitAddon.fit(); } catch {} });
          }, 100);
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

  /* ── Context menu handlers ── */
  const closeCtxMenu   = useCallback(() => setCtxMenu(null), []);
  const handleCopy     = useCallback(() => {
    const sel = xtermRef.current?.getSelection();
    if (sel) navigator.clipboard.writeText(sel).catch(() => {});
    closeCtxMenu();
  }, [closeCtxMenu]);
  const handlePaste    = useCallback(() => {
    navigator.clipboard.readText().then(t => { if (t) shellRef.current?.write(t); }).catch(() => {});
    closeCtxMenu();
  }, [closeCtxMenu]);
  const handleSelectAll = useCallback(() => {
    xtermRef.current?.selectAll();
    closeCtxMenu();
  }, [closeCtxMenu]);
  const handleClear    = useCallback(() => {
    xtermRef.current?.clear();
    cmdLinesRef.current = [];
    closeCtxMenu();
  }, [closeCtxMenu]);
  const handleScrollTop = useCallback(() => {
    xtermRef.current?.scrollToTop();
    closeCtxMenu();
  }, [closeCtxMenu]);
  const handleScrollBot = useCallback(() => {
    xtermRef.current?.scrollToBottom();
    closeCtxMenu();
  }, [closeCtxMenu]);
  const handlePrevCmd  = useCallback(() => {
    const lines = cmdLinesRef.current;
    const buf   = xtermRef.current?.buffer?.active;
    if (!lines.length || !buf) { closeCtxMenu(); return; }
    const cur = buf.baseY + buf.viewportY;
    const prev = [...lines].reverse().find(l => l < cur - 1);
    if (prev !== undefined) xtermRef.current.scrollToLine(Math.max(0, prev - 1));
    closeCtxMenu();
  }, [closeCtxMenu]);
  const handleNextCmd  = useCallback(() => {
    const lines = cmdLinesRef.current;
    const buf   = xtermRef.current?.buffer?.active;
    if (!lines.length || !buf) { closeCtxMenu(); return; }
    const cur = buf.baseY + buf.viewportY;
    const next = lines.find(l => l > cur + 1);
    if (next !== undefined) xtermRef.current.scrollToLine(next);
    closeCtxMenu();
  }, [closeCtxMenu]);

  if (initError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, color: C.red, fontFamily: 'monospace', fontSize: 13, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>⚠</span>
        <span style={{ fontWeight: 600 }}>Terminal init failed</span>
        <span style={{ color: C.muted, fontSize: 11, textAlign: 'center', maxWidth: 380 }}>{initError}</span>
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: C.bg, position: 'relative' }}
      onClick={closeCtxMenu}
    >
      {/* ── Find bar ── */}
      {showFind && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
          background: C.bar, borderBottom: `1px solid ${C.border}`, flexShrink: 0, zIndex: 10,
        }}>
          <FiSearch size={12} color={C.muted} />
          <input
            ref={findInputRef}
            value={findQuery}
            onChange={e => {
              setFindQuery(e.target.value);
              setFindMatchIdx(0);
              if (e.target.value) doFind(e.target.value, true, findCase, findRegex);
              else searchRef.current?.clearDecorations?.();
            }}
            onKeyDown={e => {
              if (e.key === 'Enter')   doFind(findQuery, !e.shiftKey);
              if (e.key === 'Escape') onCloseFind();
            }}
            placeholder="Find in terminal…"
            spellCheck={false}
            style={{
              flex: 1, background: '#0d1117', border: `1px solid ${C.border}`,
              borderRadius: 4, color: C.text, fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace", padding: '3px 8px',
              outline: 'none', minWidth: 0,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = C.blue)}
            onBlur={e => (e.currentTarget.style.borderColor = C.border)}
          />
          {/* Case / Regex toggles */}
          {([
            { label: 'Aa', title: 'Match Case', active: findCase,  set: () => { const v = !findCase; setFindCase(v); if (findQuery) doFind(findQuery, true, v, findRegex); } },
            { label: '.*', title: 'Use Regex',  active: findRegex, set: () => { const v = !findRegex; setFindRegex(v); if (findQuery) doFind(findQuery, true, findCase, v); } },
          ] as const).map(t => (
            <button key={t.label} title={t.title} onClick={t.set} style={{
              padding: '2px 6px', borderRadius: 3, border: `1px solid ${t.active ? C.blue : C.border}`,
              background: t.active ? 'rgba(88,166,255,0.15)' : 'transparent',
              color: t.active ? C.blue : C.muted, fontSize: 10, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
            }}>{t.label}</button>
          ))}
          <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap', minWidth: 40, textAlign: 'center' }}>
            {findQuery && (findMatchTotal > 0 ? `${findMatchIdx}/${findMatchTotal}` : 'No results')}
          </span>
          <button title="Previous match (Shift+Enter)" onClick={() => doFind(findQuery, false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', padding: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          ><FiChevronUp size={14} /></button>
          <button title="Next match (Enter)" onClick={() => doFind(findQuery, true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', padding: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          ><FiChevronDown size={14} /></button>
          <button title="Close (Escape)" onClick={onCloseFind}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', padding: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.red)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          ><FiX size={13} /></button>
        </div>
      )}

      {/* ── xterm canvas ── */}
      <div
        ref={divRef}
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '4px 4px 0', boxSizing: 'border-box' }}
        onContextMenu={e => {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY, hasSelection: Boolean(xtermRef.current?.getSelection()) });
        }}
      />

      {/* ── Right-click context menu ── */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed',
            top:  Math.min(ctxMenu.y, window.innerHeight - 260),
            left: Math.min(ctxMenu.x, window.innerWidth  - 220),
            zIndex: 99999, background: '#1c2128',
            border: `1px solid ${C.border}`, borderRadius: 7,
            boxShadow: '0 12px 36px rgba(0,0,0,0.7)', minWidth: 210, padding: '4px 0', userSelect: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          {([
            { label: 'Copy',               shortcut: 'Ctrl+C', icon: '⎘', disabled: !ctxMenu.hasSelection, action: handleCopy },
            { label: 'Paste',              shortcut: 'Ctrl+V', icon: '⏎', disabled: false,                  action: handlePaste },
            { sep: true },
            { label: 'Select All',         shortcut: 'Ctrl+A', icon: '☰', disabled: false,                  action: handleSelectAll },
            { sep: true },
            { label: 'Scroll to Top',      shortcut: 'Home',   icon: '⤒', disabled: false,                  action: handleScrollTop },
            { label: 'Scroll to Bottom',   shortcut: 'End',    icon: '⤓', disabled: false,                  action: handleScrollBot },
            { label: 'Previous Command',   shortcut: 'Alt+↑',  icon: '↑', disabled: cmdLinesRef.current.length === 0, action: handlePrevCmd },
            { label: 'Next Command',       shortcut: 'Alt+↓',  icon: '↓', disabled: cmdLinesRef.current.length === 0, action: handleNextCmd },
            { sep: true },
            { label: 'Clear Terminal',     shortcut: 'Ctrl+L', icon: '✕', disabled: false,                  action: handleClear },
          ] as const).map((item, i) =>
            'sep' in item ? (
              <div key={i} style={{ height: 1, background: C.border, margin: '3px 0' }} />
            ) : (
              <button key={i} disabled={item.disabled} onClick={item.action} style={{
                display: 'flex', alignItems: 'center', width: '100%',
                padding: '6px 12px', gap: 8, background: 'none', border: 'none',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                color: item.disabled ? C.dim : C.text,
                fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                textAlign: 'left', boxSizing: 'border-box',
              }}
                onMouseEnter={e => { if (!item.disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(88,166,255,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <span style={{ width: 14, textAlign: 'center', opacity: 0.6, fontSize: 11 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 10, color: C.muted }}>{item.shortcut}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── Toolbar icon button ── */
function ToolBtn({ title, icon, onClick, active: isActive = false, danger = false }: {
  title: string; icon: React.ReactNode; onClick: () => void; active?: boolean; danger?: boolean;
}) {
  return (
    <button
      title={title} onClick={onClick}
      style={{
        background: isActive ? 'rgba(88,166,255,0.15)' : 'none',
        border: 'none', cursor: 'pointer',
        color: danger ? C.red : isActive ? C.blue : C.muted,
        padding: '0 8px', height: '100%', display: 'flex', alignItems: 'center', transition: 'color 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = danger ? '#ff7b72' : C.text)}
      onMouseLeave={e => (e.currentTarget.style.color = danger ? C.red : isActive ? C.blue : C.muted)}
    >{icon}</button>
  );
}

/* ════════════════════════════════════════════════════════════
   TerminalPane — outer container
   ════════════════════════════════════════════════════════════ */
const TerminalPane: React.FC = () => {
  const {
    files, updateFileContent, setTerminalWrite, setTerminalRunCommand,
    addFile, addFolder, folders,
  } = useEditorStore();
  const projectType = detectProjectType(files);

  const [sessions,      setSessions]     = useState<TermSession[]>([{ id: ++_sessId, name: 'bash' }]);
  const [activeId,      setActiveId]     = useState<number>(sessions[0].id);
  const [splitId,       setSplitId]      = useState<number | null>(null);
  const [containerMounted, setContainerMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CmdCategory>('npm');
  const [fontSize,      setFontSize]     = useState(13);
  const [showFind,      setShowFind]     = useState(false);
  const [renamingId,    setRenamingId]   = useState<number | null>(null);
  const [renameVal,     setRenameVal]    = useState('');

  const sessionFnsRef = useRef<Map<number, { write: (t: string) => void; run: (c: string) => void; xterm: () => any }>>(new Map());

  /* ── Store sync ── */
  const registerStore = useCallback(() => {
    const fns = sessionFnsRef.current.get(activeId);
    if (fns) { setTerminalWrite(fns.write); setTerminalRunCommand(fns.run); }
    else { setTerminalWrite(null); setTerminalRunCommand(null); }
  }, [activeId, setTerminalWrite, setTerminalRunCommand]);
  useEffect(() => { registerStore(); }, [registerStore]);
  useEffect(() => () => { setTerminalWrite(null); setTerminalRunCommand(null); }, [setTerminalWrite, setTerminalRunCommand]);
  useEffect(() => { setContainerMounted(false); }, [files]);

  /* ── Full file system sync from container → store ── */
  const onFileSyncNeeded = useCallback(async () => {
    const scan = await fullScanContainerFS();

    /* 1. Update content of files already in the store */
    for (const f of files) {
      if (f.type === 'image') continue;
      const path = f.folder ? `${f.folder}/${f.name}` : f.name;
      const found = scan.files.find(sf => sf.path === path);
      if (found && found.content !== f.content) {
        updateFileContent(f.id, found.content);
      }
    }

    /* 2. Add new folders discovered in the container */
    const knownFolderSet = new Set(folders);
    for (const folderPath of scan.folders) {
      // Only add top-level or one-level-deep folders as store folders
      const parts = folderPath.split('/');
      const topLevel = parts[0];
      if (!knownFolderSet.has(topLevel)) {
        addFolder(topLevel);
        knownFolderSet.add(topLevel);
      }
    }

    /* 3. Add new files discovered in the container */
    const existingPaths = new Set(
      files.map(f => f.folder ? `${f.folder}/${f.name}` : f.name)
    );
    for (const sf of scan.files) {
      if (existingPaths.has(sf.path)) continue;
      // Split into folder + name
      const parts  = sf.path.split('/');
      const name   = parts[parts.length - 1];
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : undefined;
      const type   = getFileTypeForName(name);
      addFile({
        id:      sf.path,          // use path as stable id
        name,
        type,
        content: sf.content,
        folder,
      });
      existingPaths.add(sf.path);
    }

    /* 4. Show node_modules (and other heavy dirs) as empty placeholder folders */
    for (const hd of scan.heavyDirs) {
      const topLevel = hd.split('/')[0];
      if (!knownFolderSet.has(topLevel)) {
        addFolder(topLevel);
        knownFolderSet.add(topLevel);
      }
    }
  }, [files, folders, updateFileContent, addFile, addFolder]);

  /* ── Session management ── */
  const addSession = useCallback(() => {
    const id = ++_sessId;
    setSessions(s => [...s, { id, name: `bash-${s.length + 1}` }]);
    setActiveId(id);
    setSplitId(null);
  }, []);

  const splitSession = useCallback(() => {
    const id = ++_sessId;
    setSessions(s => [...s, { id, name: `bash-${s.length + 1}` }]);
    setSplitId(id);
  }, []);

  const removeSession = useCallback((id: number) => {
    const remaining = sessions.filter(s => s.id !== id);
    if (remaining.length === 0) return;
    sessionFnsRef.current.delete(id);
    setSessions(remaining);
    if (splitId === id) setSplitId(null);
    if (activeId === id) setActiveId(remaining[remaining.length - 1].id);
  }, [sessions, activeId, splitId]);

  const startRename = (id: number, currentName: string) => {
    setRenamingId(id);
    setRenameVal(currentName);
  };
  const commitRename = () => {
    if (renamingId !== null && renameVal.trim()) {
      setSessions(s => s.map(sess => sess.id === renamingId ? { ...sess, name: renameVal.trim() } : sess));
    }
    setRenamingId(null);
  };

  /* ── Font size ── */
  const zoomIn  = useCallback(() => setFontSize(s => Math.min(s + 1, 24)), []);
  const zoomOut = useCallback(() => setFontSize(s => Math.max(s - 1, 9)), []);
  const zoomReset = useCallback(() => setFontSize(13), []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setShowFind(v => !v); }
      if (e.key === '=' || e.key === '+')  { e.preventDefault(); zoomIn(); }
      if (e.key === '-')                    { e.preventDefault(); zoomOut(); }
      if (e.key === '0')                    { e.preventDefault(); zoomReset(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoomIn, zoomOut, zoomReset]);

  const runQuick = (cmd: string) => sessionFnsRef.current.get(activeId)?.run(cmd);

  const syncContainer = async () => {
    const fns = sessionFnsRef.current.get(activeId);
    if (fns) fns.write('\r\n\x1b[33m  Syncing files…\x1b[0m');
    await mountFilesToContainer(files, projectType);
    setContainerMounted(true);
    // Pull any changes/new files back from the container into the store
    await onFileSyncNeeded();
    if (fns) fns.write('\r\n\x1b[32m  ✓ Synced\x1b[0m\r\n');
  };

  const filteredCmds = QUICK_CMDS.filter(c => c.category === activeCategory);
  const catCfg       = CAT_CFG[activeCategory];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: C.bg }}>

      {/* ══ TOP BAR: tabs + VS Code-style toolbar ══ */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 33, flexShrink: 0, background: C.panel, borderBottom: `1px solid ${C.border}` }}>

        {/* Session tabs */}
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto', alignItems: 'stretch', minWidth: 0 }}>
          {sessions.map(sess => {
            const isActive   = activeId === sess.id;
            const isSplit    = splitId === sess.id;
            const isRenaming = renamingId === sess.id;
            return (
              <div
                key={sess.id}
                onClick={() => { if (!isRenaming) setActiveId(sess.id); }}
                onDoubleClick={() => startRename(sess.id, sess.name)}
                title="Double-click to rename"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px 0 12px',
                  cursor: 'pointer', flexShrink: 0, userSelect: 'none',
                  background: isActive ? C.bg : isSplit ? 'rgba(88,166,255,0.06)' : 'transparent',
                  borderRight: `1px solid ${C.border}`,
                  borderBottom: `2px solid ${isActive ? C.green : isSplit ? C.blue : 'transparent'}`,
                  color: isActive ? C.text : isSplit ? C.blue : C.muted,
                  fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  transition: 'color 0.1s',
                }}
              >
                <span style={{ fontSize: 8, color: isActive ? C.green : isSplit ? C.blue : C.muted }}>
                  {isSplit ? '⊟' : '▶'}
                </span>
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: '#0d1117', border: `1px solid ${C.blue}`, borderRadius: 3,
                      color: C.text, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      padding: '0 4px', width: 70, outline: 'none',
                    }}
                  />
                ) : (
                  <span>{sess.name}</span>
                )}
                {/* Kill this terminal button */}
                <span
                  onClick={e => { e.stopPropagation(); removeSession(sess.id); }}
                  title="Kill terminal"
                  style={{ display: 'flex', alignItems: 'center', marginLeft: 2, cursor: 'pointer', color: C.muted, opacity: 0.6, borderRadius: 2, padding: '1px 2px', transition: 'opacity 0.1s, color 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
                ><FiX size={10} /></span>
              </div>
            );
          })}
        </div>

        {/* ── Right-side VS Code-style toolbar ── */}
        <div style={{ display: 'flex', alignItems: 'stretch', borderLeft: `1px solid ${C.border}`, flexShrink: 0 }}>
          <ToolBtn title="New Terminal (Ctrl+`)"         icon={<FiPlus size={13} />}     onClick={addSession} />
          <ToolBtn title="Split Terminal"                icon={<FiColumns size={13} />}  onClick={splitSession} active={splitId !== null} />
          <ToolBtn title="Find in Terminal (Ctrl+F)"     icon={<FiSearch size={13} />}   onClick={() => setShowFind(v => !v)} active={showFind} />
          <ToolBtn title="Zoom In (Ctrl+=)"              icon={<FiZoomIn size={13} />}   onClick={zoomIn} />
          <ToolBtn title="Zoom Out (Ctrl+-)"             icon={<FiZoomOut size={13} />}  onClick={zoomOut} />
          <ToolBtn title="Sync Files to Container"       icon={<FiRefreshCw size={12} />} onClick={syncContainer} />
          <ToolBtn title="Kill Active Terminal"          icon={<FiTrash2 size={13} />}   onClick={() => removeSession(activeId)} danger />
        </div>
      </div>

      {/* ══ QUICK COMMAND BAR ══ */}
      <div style={{ display: 'flex', alignItems: 'center', background: C.bar, borderBottom: `1px solid ${C.border}`, flexShrink: 0, height: 30 }}>
        {(['npm', 'git', 'files'] as CmdCategory[]).map(cat => {
          const cfg = CAT_CFG[cat];
          const isAct = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '0 11px', height: '100%', border: 'none', cursor: 'pointer',
              background: isAct ? cfg.bg : 'transparent',
              borderRight: `1px solid ${C.border}`,
              borderBottom: `2px solid ${isAct ? cfg.fg : 'transparent'}`,
              color: isAct ? cfg.fg : C.muted,
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, letterSpacing: '0.08em', transition: 'all 0.12s', flexShrink: 0,
            }}
              onMouseEnter={e => { if (!isAct) (e.currentTarget as HTMLElement).style.color = cfg.fg; }}
              onMouseLeave={e => { if (!isAct) (e.currentTarget as HTMLElement).style.color = C.muted; }}
            >{cfg.label}</button>
          );
        })}

        <div style={{ display: 'flex', gap: 3, padding: '0 6px', overflowX: 'auto', flex: 1, alignItems: 'center' }}>
          {filteredCmds.map(({ label, cmd, icon }) => (
            <button key={cmd} title={cmd} onClick={() => runQuick(cmd)} style={{
              padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer',
              background: catCfg.bg, border: `1px solid ${catCfg.border}`,
              color: catCfg.fg, fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.1s',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = catCfg.bg.replace('0.08', '0.2'); el.style.borderColor = catCfg.fg; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = catCfg.bg; el.style.borderColor = catCfg.border; }}
            >
              {icon && <span style={{ fontSize: 8, opacity: 0.7 }}>{icon}</span>}
              {label}
            </button>
          ))}
        </div>

        {/* Font size indicator + clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderLeft: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span
            title="Font size (Ctrl+0 to reset)"
            onDoubleClick={zoomReset}
            style={{ padding: '0 8px', fontSize: 10, color: C.muted, cursor: 'default', fontFamily: "'JetBrains Mono', monospace" }}
          >{fontSize}px</span>
          <button title="Clear (Ctrl+L)" onClick={() => {
            sessionFnsRef.current.get(activeId)?.xterm()?.clear();
          }} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
            fontSize: 10, padding: '0 10px', height: 30,
            fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
            borderLeft: `1px solid ${C.border}`, transition: 'color 0.1s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >clr</button>
        </div>
      </div>

      {/* ══ TERMINAL AREA (single or split) ══ */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
        {sessions.map(sess => {
          const isPrimary   = sess.id === activeId;
          const isSecondary = sess.id === splitId;
          const visible     = isPrimary || isSecondary;

          return (
            <div
              key={sess.id}
              style={{
                display: visible ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden',
                borderLeft: isSecondary ? `2px solid ${C.border}` : 'none',
              }}
            >
              {/* Split label */}
              {splitId !== null && (
                <div style={{
                  height: 20, flexShrink: 0, display: 'flex', alignItems: 'center',
                  padding: '0 10px', background: C.panel, borderBottom: `1px solid ${C.border}`,
                  fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {isPrimary   ? `${sess.name} (primary)` : `${sess.name} (split)`}
                </div>
              )}
              <TerminalSession
                sessionId={sess.id}
                active={isPrimary}
                files={files}
                containerMounted={containerMounted}
                setContainerMounted={setContainerMounted}
                onFileSyncNeeded={onFileSyncNeeded}
                onReady={(write, run, xterm) => {
                  sessionFnsRef.current.set(sess.id, { write, run, xterm });
                  if (sess.id === activeId) { setTerminalWrite(write); setTerminalRunCommand(run); }
                }}
                onUnready={() => {
                  sessionFnsRef.current.delete(sess.id);
                  if (sess.id === activeId) { setTerminalWrite(null); setTerminalRunCommand(null); }
                }}
                fontSize={fontSize}
                showFind={showFind && isPrimary}
                onCloseFind={() => setShowFind(false)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TerminalPane;
