import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import { useEditorStore } from '../store/editorStore';
import { spawnInContainer, mountFilesToContainer } from '../utils/webContainerRuntime';
import { detectProjectType } from '../utils/fileTypes';
import { FiTerminal, FiTrash2, FiX, FiChevronRight, FiLoader } from 'react-icons/fi';

/* ── ANSI colour stripping ───────────────────────────────────────── */
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');
}

/** Convert a handful of common ANSI codes to inline colour. */
function ansiToJsx(raw: string, keyPrefix: string): React.ReactNode[] {
  const COLOUR_MAP: Record<string, string> = {
    '30': '#555', '31': '#f44747', '32': '#4ec9b0', '33': '#dcdcaa',
    '34': '#9cdcfe', '35': '#c586c0', '36': '#4fc1ff', '37': '#ccc',
    '90': '#666', '91': '#f97583', '92': '#85e89d', '93': '#ffea7f',
    '94': '#79b8ff', '95': '#b392f0', '96': '#39d0d8', '97': '#eee',
    '1': undefined as unknown as string,  // bold — handled separately
  };

  const segments = raw.split(/(\x1B\[[0-9;]*m)/);
  const nodes: React.ReactNode[] = [];
  let colour: string | null = null;
  let bold = false;

  segments.forEach((seg, i) => {
    const escMatch = seg.match(/\x1B\[([0-9;]*)m/);
    if (escMatch) {
      const codes = escMatch[1].split(';');
      for (const c of codes) {
        if (c === '0' || c === '') { colour = null; bold = false; }
        else if (c === '1') bold = true;
        else if (COLOUR_MAP[c] !== undefined) colour = COLOUR_MAP[c] ?? colour;
      }
    } else if (seg) {
      nodes.push(
        <span
          key={`${keyPrefix}-${i}`}
          style={{ color: colour ?? undefined, fontWeight: bold ? 700 : undefined }}
        >
          {seg}
        </span>
      );
    }
  });

  return nodes.length ? nodes : [<span key={keyPrefix}>{stripAnsi(raw)}</span>];
}

/* ── Line types ─────────────────────────────────────────────────── */
type LineKind = 'output' | 'input' | 'info' | 'error' | 'success';
interface TermLine {
  id: number;
  kind: LineKind;
  text: string;
}

let _lineId = 0;
function mkLine(kind: LineKind, text: string): TermLine {
  return { id: ++_lineId, kind, text };
}

/* ── Quick-action presets ────────────────────────────────────────── */
const QUICK_CMDS = [
  { label: 'install', cmd: 'npm install',  title: 'npm install — install dependencies' },
  { label: 'dev',     cmd: 'npm run dev',  title: 'npm run dev — start dev server' },
  { label: 'build',   cmd: 'npm run build', title: 'npm run build — production build' },
  { label: 'start',   cmd: 'npm start',    title: 'npm start' },
  { label: 'node .',  cmd: 'node index.js', title: 'node index.js — run with Node' },
  { label: 'ls',      cmd: 'ls -la',       title: 'List directory contents' },
];

/* ── Main Component ──────────────────────────────────────────────── */
const TerminalPane: React.FC = () => {
  const { files } = useEditorStore();
  const projectType = detectProjectType(files);

  const [lines, setLines] = useState<TermLine[]>([
    mkLine('info', 'WebContainer Terminal — type a command or use the quick actions above.'),
    mkLine('info', 'First command will boot the WebContainer and mount your project files.'),
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  const histRef = useRef<string[]>([]);
  const histIdxRef = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const killRef = useRef<(() => void) | null>(null);

  const append = useCallback((kind: LineKind, text: string) => {
    text.split('\n').forEach(line => {
      if (line) setLines(ls => [...ls, mkLine(kind, line)]);
    });
  }, []);

  /* Auto-scroll */
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const ensureMounted = useCallback(async () => {
    if (mounted) return;
    append('info', 'Booting WebContainer…');
    try {
      await mountFilesToContainer(files, projectType);
      setMounted(true);
      append('success', 'Project files mounted. Container ready.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('cross-origin') || msg.toLowerCase().includes('sharedarraybuffer') || msg.toLowerCase().includes('isolated')) {
        setLines(ls => [...ls,
          mkLine('error', 'WebContainer requires Cross-Origin Isolation.'),
          mkLine('info',  'This feature works when the app is opened directly in a browser tab.'),
          mkLine('info',  'Open the app URL directly (not inside this workspace iframe) to use the terminal.'),
          mkLine('info',  'In Replit: click the "Open in new tab" ↗ button in the preview pane toolbar.'),
        ]);
      } else {
        append('error', `Boot failed: ${msg}`);
      }
      setBusy(false);
      throw e;
    }
  }, [mounted, files, projectType, append]);

  const runCommand = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;

    /* History */
    histRef.current = [cmd, ...histRef.current.filter(c => c !== cmd)].slice(0, 50);
    histIdxRef.current = -1;

    append('input', `$ ${cmd}`);
    setBusy(true);

    try {
      await ensureMounted();
    } catch {
      setBusy(false);
      return;
    }

    try {
      const { exit, kill } = await spawnInContainer('sh', ['-c', cmd], (data) => {
        data.split('\n').forEach(line => {
          if (line) setLines(ls => [...ls, mkLine('output', line)]);
        });
      });
      killRef.current = kill;
      const code = await exit;
      if (code !== 0) {
        append('error', `Process exited with code ${code}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      append('error', `Error: ${msg}`);
    } finally {
      setBusy(false);
      killRef.current = null;
      inputRef.current?.focus();
    }
  }, [ensureMounted, append]);

  /* Re-mount on file changes */
  useEffect(() => {
    setMounted(false);
  }, [files]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = histIdxRef.current + 1;
      if (next < histRef.current.length) {
        histIdxRef.current = next;
        setInput(histRef.current[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdxRef.current - 1;
      if (next < 0) { histIdxRef.current = -1; setInput(''); }
      else { histIdxRef.current = next; setInput(histRef.current[next]); }
    } else if (e.key === 'c' && e.ctrlKey) {
      if (killRef.current) { killRef.current(); killRef.current = null; append('info', '^C'); setBusy(false); }
    }
  };

  const clearTerminal = () => setLines([mkLine('info', 'Terminal cleared.')]);

  /* ── Line colour map ─── */
  const lineColour: Record<LineKind, string> = {
    output:  '#ccc',
    input:   '#e5a45a',
    info:    '#888',
    error:   '#f44747',
    success: '#4ec9b0',
  };

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#0d1117', fontFamily: 'var(--app-font-mono)', fontSize: 12,
        color: '#ccc', overflow: 'hidden', userSelect: 'text',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 32, flexShrink: 0,
        background: '#161b22', borderBottom: '1px solid #30363d',
        padding: '0 10px',
      }}>
        <FiTerminal size={13} style={{ color: '#4ec9b0', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', flex: 1 }}>
          WebContainer Terminal
        </span>
        {busy && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#e5a45a', fontSize: 11 }}>
            <FiLoader size={11} style={{ animation: 'spin 1s linear infinite' }} />
            running…
          </span>
        )}
        <button
          title="Clear terminal"
          onClick={e => { e.stopPropagation(); clearTerminal(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e', padding: '2px 4px', borderRadius: 3, lineHeight: 1 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; }}
        >
          <FiTrash2 size={12} />
        </button>
        {busy && killRef.current && (
          <button
            title="Kill process (Ctrl+C)"
            onClick={e => { e.stopPropagation(); killRef.current?.(); killRef.current = null; append('info', '^C — process killed'); setBusy(false); }}
            style={{ background: 'rgba(244,71,71,0.12)', border: '1px solid rgba(244,71,71,0.35)', cursor: 'pointer', color: '#f44747', padding: '2px 7px', borderRadius: 3, fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <FiX size={10} /> Kill
          </button>
        )}
      </div>

      {/* ── Quick action bar ────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap',
        padding: '5px 8px', background: '#161b22', borderBottom: '1px solid #21262d',
      }}>
        {QUICK_CMDS.map(({ label, cmd, title }) => (
          <button
            key={cmd}
            title={title}
            disabled={busy}
            onClick={e => { e.stopPropagation(); runCommand(cmd); }}
            style={{
              padding: '2px 9px', fontSize: 11, borderRadius: 4,
              background: busy ? 'rgba(229,164,90,0.04)' : 'rgba(229,164,90,0.08)',
              border: '1px solid rgba(229,164,90,0.2)',
              color: busy ? '#666' : '#e5a45a',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--app-font-mono)',
              transition: 'all 0.12s',
              lineHeight: 1.6,
            }}
            onMouseEnter={e => { if (!busy) (e.currentTarget as HTMLElement).style.background = 'rgba(229,164,90,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = busy ? 'rgba(229,164,90,0.04)' : 'rgba(229,164,90,0.08)'; }}
          >
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          title="Re-mount project files to container"
          disabled={busy}
          onClick={async e => {
            e.stopPropagation();
            setMounted(false);
            append('info', 'Re-mounting project files…');
            await mountFilesToContainer(files, projectType);
            setMounted(true);
            append('success', 'Files re-mounted.');
          }}
          style={{
            padding: '2px 9px', fontSize: 11, borderRadius: 4,
            background: 'rgba(78,201,176,0.07)',
            border: '1px solid rgba(78,201,176,0.2)',
            color: busy ? '#555' : '#4ec9b0',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--app-font-mono)',
            lineHeight: 1.6,
          }}
        >
          ⟳ sync
        </button>
      </div>

      {/* ── Output area ─────────────────────────────────────────── */}
      <div
        ref={outputRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '6px 10px',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}
      >
        {lines.map(line => (
          <div
            key={line.id}
            style={{ display: 'flex', gap: 0, lineHeight: 1.55, flexShrink: 0 }}
          >
            <pre
              style={{
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                color: lineColour[line.kind],
                fontFamily: 'inherit',
                fontSize: 'inherit',
              }}
            >
              {line.kind === 'output'
                ? ansiToJsx(line.text, String(line.id))
                : line.text}
            </pre>
          </div>
        ))}
        {busy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#555', marginTop: 2 }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
          </div>
        )}
      </div>

      {/* ── Input row ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0, padding: '5px 10px',
        background: '#161b22', borderTop: '1px solid #21262d',
      }}>
        <FiChevronRight size={13} style={{ color: busy ? '#555' : '#4ec9b0', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={input}
          disabled={busy}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={busy ? 'Running… (Ctrl+C to kill)' : 'Type a command…'}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: busy ? '#555' : '#e5a45a', fontFamily: 'var(--app-font-mono)',
            fontSize: 12, caretColor: '#e5a45a',
          }}
        />
      </div>
    </div>
  );
};

export default TerminalPane;
