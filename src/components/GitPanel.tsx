import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  initGit, getStatus, stageFile, unstageFile, stageAll,
  commit, getLog, getBranches, createBranch, checkoutBranch,
  syncFilesToGit, getFileDiff, setRemoteUrl, getRemoteUrl,
  cloneFromGitHub,
  type GitStatus, type GitCommit, type DiffHunk,
} from '../utils/gitService';
import {
  FiGitCommit, FiGitBranch, FiGitMerge, FiRefreshCw, FiPlus,
  FiMinus, FiCheck, FiClock, FiAlertCircle, FiChevronDown,
  FiChevronRight, FiDownload, FiUpload, FiFile, FiTrash2,
  FiGitPullRequest, FiCode,
} from 'react-icons/fi';

/* ── App color palette (matches VSCode-style theme) ── */
const C = {
  bg:       '#1e1e1e',
  panel:    '#252526',
  border:   '#3e3e3e',
  text:     '#cccccc',
  textBold: '#e0e0e0',
  muted:    '#888888',
  dimmed:   '#555555',
  amber:    '#e5a45a',
  green:    '#4ec9b0',
  blue:     '#569cd6',
  red:      '#f44747',
  hover:    'rgba(255,255,255,0.05)',
};

type GitView = 'changes' | 'history' | 'branches' | 'diff';

interface DiffViewProps { path: string; hunks: DiffHunk[]; onClose: () => void; }

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function DiffView({ path, hunks, onClose }: DiffViewProps) {
  const totalAdded = hunks.flatMap(h => h.lines).filter(l => l.type === 'added').length;
  const totalRemoved = hunks.flatMap(h => h.lines).filter(l => l.type === 'removed').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <FiFile size={12} style={{ color: C.blue }} />
        <span style={{ fontSize: 12, color: C.textBold, fontWeight: 600, flex: 1 }}>{path}</span>
        <span style={{ fontSize: 11, color: C.green }}>+{totalAdded}</span>
        <span style={{ fontSize: 11, color: C.red, marginLeft: 4 }}>-{totalRemoved}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, fontSize: 12 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12 }}>
        {hunks.length === 0 && (
          <div style={{ padding: 20, color: C.muted, textAlign: 'center' }}>No diff available (file not committed yet)</div>
        )}
        {hunks.map((hunk, hi) => (
          <div key={hi}>
            <div style={{ background: '#2d2d2d', color: C.blue, padding: '4px 12px', fontSize: 11, borderTop: `1px solid ${C.border}` }}>{hunk.header}</div>
            {hunk.lines.map((line, li) => {
              const bg = line.type === 'added' ? 'rgba(78,201,176,0.1)' : line.type === 'removed' ? 'rgba(244,71,71,0.1)' : 'transparent';
              const color = line.type === 'added' ? C.green : line.type === 'removed' ? C.red : C.muted;
              const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
              return (
                <div key={li} style={{ display: 'flex', background: bg, padding: '1px 0', borderLeft: `3px solid ${bg === 'transparent' ? 'transparent' : color}` }}>
                  <span style={{ color: C.dimmed, padding: '0 8px', minWidth: 40, textAlign: 'right', userSelect: 'none', fontSize: 11 }}>{line.lineNum}</span>
                  <span style={{ color, padding: '0 4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{prefix} {line.content}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const GitPanel: React.FC = () => {
  const { files, resetFiles, showNotification } = useEditorStore();

  const [view, setView] = useState<GitView>('changes');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [showRemoteInput, setRemoteInput] = useState(false);
  const [diffView, setDiffView] = useState<{ path: string; hunks: DiffHunk[] } | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [showClone, setShowClone] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneProgress, setCloneProgress] = useState('');
  const [cloneError, setCloneError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await initGit(files);
        setInitialized(true);
        setRemoteUrlInput(getRemoteUrl());
        await refresh();
      } catch (e) {
        setInitError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized) return;
    syncFilesToGit(files).catch(() => {});
  }, [files, initialized]);

  const refresh = useCallback(async () => {
    try {
      const [s, log, br] = await Promise.all([getStatus(), getLog(25), getBranches()]);
      setStatus(s);
      setCommits(log);
      setBranches(br);
    } catch {}
  }, []);

  const handleStageFile = async (path: string) => {
    await stageFile(path);
    await refresh();
  };

  const handleUnstageFile = async (path: string) => {
    await unstageFile(path);
    await refresh();
  };

  const handleStageAll = async () => {
    setLoading(true);
    await stageAll(files);
    await refresh();
    setLoading(false);
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) { showNotification('Enter a commit message'); return; }
    if (!status?.staged.length) { showNotification('Nothing staged to commit'); return; }
    setLoading(true);
    try {
      await commit(commitMsg);
      setCommitMsg('');
      await refresh();
      showNotification('Commit created successfully');
    } catch (e) {
      showNotification('Commit failed: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setLoading(true);
    try {
      await createBranch(newBranchName.trim());
      setNewBranchName('');
      setShowBranchInput(false);
      await refresh();
      showNotification(`Branch "${newBranchName}" created`);
    } catch (e) {
      showNotification('Branch failed: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (branch: string) => {
    setLoading(true);
    try {
      await checkoutBranch(branch);
      await refresh();
      showNotification(`Switched to "${branch}"`);
    } catch (e) {
      showNotification('Checkout failed: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleViewDiff = async (path: string) => {
    const file = files.find(f => f.name === path || `${f.folder}/${f.name}` === path);
    const content = file?.content ?? '';
    const hunks = await getFileDiff(path, content);
    setDiffView({ path, hunks });
  };

  const handleSaveRemote = () => {
    setRemoteUrl(remoteUrlInput);
    setRemoteInput(false);
    showNotification('Remote URL saved');
  };

  const parseCloneUrl = (raw: string): { owner: string; repo: string } | null => {
    const s = raw.trim().replace(/\.git$/, '');
    const m = s.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
    if (m) return { owner: m[1], repo: m[2] };
    const short = s.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (short) return { owner: short[1], repo: short[2] };
    return null;
  };

  const handleClone = async () => {
    const parsed = parseCloneUrl(cloneUrl);
    if (!parsed) { setCloneError('Invalid URL. Use https://github.com/owner/repo or owner/repo'); return; }
    setCloneLoading(true);
    setCloneError('');
    try {
      const newFiles = await cloneFromGitHub(parsed.owner, parsed.repo, (msg, done, total) => {
        setCloneProgress(`${msg} (${done}/${total})`);
      });
      resetFiles(newFiles);
      setShowClone(false);
      setCloneUrl('');
      setCloneProgress('');
      await refresh();
      showNotification(`Cloned ${newFiles.length} files from ${parsed.owner}/${parsed.repo}`);
    } catch (e) {
      setCloneError(String(e));
    } finally {
      setCloneLoading(false);
    }
  };

  /* ── Render helpers ── */
  const statusIcon = (s: string, staged: boolean) => {
    if (s === 'modified') return staged ? <FiCheck size={12} style={{ color: C.green }} /> : <FiCode size={12} style={{ color: C.amber }} />;
    if (s === 'added') return <FiPlus size={12} style={{ color: C.green }} />;
    if (s === 'deleted') return <FiMinus size={12} style={{ color: C.red }} />;
    return <FiAlertCircle size={12} style={{ color: C.blue }} />;
  };

  const statusColor = (s: string) => s === 'modified' ? C.amber : s === 'added' ? C.green : C.red;

  /* ── Show diff overlay ── */
  if (diffView) {
    return <DiffView path={diffView.path} hunks={diffView.hunks} onClose={() => setDiffView(null)} />;
  }

  /* ── Clone dialog overlay ── */
  if (showClone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, padding: 16, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FiDownload size={16} style={{ color: C.blue }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textBold }}>Clone Repository</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => { setShowClone(false); setCloneError(''); setCloneProgress(''); }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <label style={{ fontSize: 11, color: C.muted }}>GitHub URL or <code style={{ color: C.blue }}>owner/repo</code></label>
        <input
          value={cloneUrl}
          onChange={e => setCloneUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !cloneLoading) handleClone(); if (e.key === 'Escape') setShowClone(false); }}
          placeholder="https://github.com/owner/repo"
          disabled={cloneLoading}
          autoFocus
          style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: '8px 10px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
          onFocus={e => { e.currentTarget.style.borderColor = C.amber; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
        />
        {cloneProgress && <div style={{ fontSize: 11, color: C.green, padding: '6px 10px', background: 'rgba(78,201,176,0.08)', border: `1px solid rgba(78,201,176,0.2)`, borderRadius: 4 }}>{cloneProgress}</div>}
        {cloneError && <div style={{ fontSize: 11, color: C.red, padding: '6px 10px', background: 'rgba(244,71,71,0.08)', border: `1px solid rgba(244,71,71,0.2)`, borderRadius: 4 }}>⚠ {cloneError}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleClone} disabled={cloneLoading || !cloneUrl.trim()}
            style={{ flex: 1, padding: '8px', borderRadius: 6, cursor: cloneLoading ? 'wait' : 'pointer', background: 'rgba(86,156,214,0.15)', border: `1px solid rgba(86,156,214,0.4)`, color: C.blue, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', opacity: (!cloneUrl.trim() || cloneLoading) ? 0.5 : 1 }}>
            {cloneLoading ? 'Cloning…' : '⬇ Clone'}
          </button>
          <button onClick={() => { setShowClone(false); setCloneError(''); setCloneProgress(''); }}
            style={{ padding: '8px 14px', borderRadius: 6, cursor: 'pointer', background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
        <div style={{ fontSize: 11, color: C.dimmed, lineHeight: 1.6 }}>
          Uses raw.githubusercontent.com — no API rate limits. Files are downloaded directly without needing authentication.
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div style={{ padding: 16, color: C.red, fontSize: 12 }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Git initialization failed</div>
        <div style={{ color: C.muted, fontSize: 11 }}>{initError}</div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '6px 12px', background: 'rgba(244,71,71,0.1)', border: `1px solid rgba(244,71,71,0.3)`, color: C.red, cursor: 'pointer', borderRadius: 4, fontSize: 11, fontFamily: 'inherit' }}>Reload</button>
      </div>
    );
  }

  const allChanges = [
    ...(status?.staged ?? []),
    ...(status?.unstaged ?? []),
    ...(status?.untracked ?? []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '10px 12px 6px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        {/* Branch info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <FiGitBranch size={13} style={{ color: C.amber, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.textBold, fontWeight: 600 }}>{status?.branch ?? '—'}</span>
          {status && allChanges.length > 0 && (
            <span style={{ marginLeft: 4, background: C.amber, color: C.bg, borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{allChanges.length}</span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={refresh} disabled={loading} title="Refresh git status"
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.amber; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
          ><FiRefreshCw size={13} style={{ transform: loading ? 'rotate(360deg)' : 'none', transition: loading ? 'transform 1s linear infinite' : 'none' }} /></button>
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {(['changes', 'history', 'branches'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '3px 9px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: view === v ? 600 : 400, background: view === v ? 'rgba(229,164,90,0.15)' : 'transparent', border: view === v ? `1px solid rgba(229,164,90,0.35)` : '1px solid transparent', color: view === v ? C.amber : C.muted, fontFamily: 'inherit', transition: 'all 0.1s' }}
            >{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* CHANGES VIEW */}
        {view === 'changes' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Commit message */}
            <div style={{ padding: '8px 10px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
              <textarea
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                placeholder="Commit message (Ctrl+Enter to commit)"
                onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleCommit(); }}
                rows={2}
                style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, padding: '6px 8px', fontSize: 11, fontFamily: "'Inter', sans-serif", resize: 'none', boxSizing: 'border-box', outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = C.amber; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={handleStageAll} disabled={loading}
                  style={{ flex: 1, padding: '5px', borderRadius: 4, cursor: 'pointer', background: 'rgba(78,201,176,0.1)', border: `1px solid rgba(78,201,176,0.3)`, color: C.green, fontSize: 11, fontFamily: 'inherit' }}>
                  + Stage All
                </button>
                <button onClick={handleCommit} disabled={loading || !commitMsg.trim() || !status?.staged.length}
                  style={{ flex: 1, padding: '5px', borderRadius: 4, cursor: 'pointer', background: 'rgba(229,164,90,0.15)', border: `1px solid rgba(229,164,90,0.4)`, color: C.amber, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', opacity: (!commitMsg.trim() || !status?.staged.length) ? 0.5 : 1 }}>
                  ✓ Commit
                </button>
              </div>
            </div>

            {/* Files list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {allChanges.length === 0 && !loading && (
                <div style={{ padding: 20, textAlign: 'center', color: C.dimmed, fontSize: 12 }}>
                  <FiCheck size={24} style={{ display: 'block', margin: '0 auto 8px', color: C.green }} />
                  Working tree clean
                </div>
              )}

              {/* Staged */}
              {status?.staged.length ? (
                <div>
                  <div style={{ padding: '6px 10px 3px', fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Staged ({status.staged.length})
                  </div>
                  {status.staged.map(f => (
                    <div key={f.path} style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', gap: 6, cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.hover; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {statusIcon(f.status, true)}
                      <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.path}>{f.path.split('/').pop()}</span>
                      <span style={{ fontSize: 10, color: statusColor(f.status), fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>{f.status.charAt(0).toUpperCase()}</span>
                      <button onClick={() => handleViewDiff(f.path)} title="View diff" style={{ background: 'none', border: 'none', color: C.dimmed, cursor: 'pointer', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.blue; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.dimmed; }}
                      >diff</button>
                      <button onClick={() => handleUnstageFile(f.path)} title="Unstage" style={{ background: 'none', border: 'none', color: C.dimmed, cursor: 'pointer', padding: '1px 4px', borderRadius: 3 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.dimmed; }}
                      ><FiMinus size={11} /></button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Unstaged */}
              {status?.unstaged.length ? (
                <div>
                  <div style={{ padding: '6px 10px 3px', fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Changes ({status.unstaged.length})
                  </div>
                  {status.unstaged.map(f => (
                    <div key={f.path} style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', gap: 6, cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.hover; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {statusIcon(f.status, false)}
                      <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.path}>{f.path.split('/').pop()}</span>
                      <span style={{ fontSize: 10, color: statusColor(f.status), fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>{f.status.charAt(0).toUpperCase()}</span>
                      <button onClick={() => handleViewDiff(f.path)} title="View diff" style={{ background: 'none', border: 'none', color: C.dimmed, cursor: 'pointer', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.blue; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.dimmed; }}
                      >diff</button>
                      <button onClick={() => handleStageFile(f.path)} title="Stage file" style={{ background: 'none', border: 'none', color: C.dimmed, cursor: 'pointer', padding: '1px 4px', borderRadius: 3 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.green; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.dimmed; }}
                      ><FiPlus size={11} /></button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Untracked */}
              {status?.untracked.length ? (
                <div>
                  <div style={{ padding: '6px 10px 3px', fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Untracked ({status.untracked.length})
                  </div>
                  {status.untracked.map(f => (
                    <div key={f.path} style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', gap: 6 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.hover; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <FiFile size={12} style={{ color: C.muted, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path.split('/').pop()}</span>
                      <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>U</span>
                      <button onClick={() => handleStageFile(f.path)} title="Stage file" style={{ background: 'none', border: 'none', color: C.dimmed, cursor: 'pointer', padding: '1px 4px', borderRadius: 3 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.green; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.dimmed; }}
                      ><FiPlus size={11} /></button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Clone button at bottom */}
            <div style={{ padding: '8px 10px', flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setShowClone(true)}
                style={{ width: '100%', padding: '7px', borderRadius: 5, cursor: 'pointer', background: 'rgba(86,156,214,0.08)', border: `1px solid rgba(86,156,214,0.2)`, color: C.blue, fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FiDownload size={12} /> Clone Repository
              </button>
            </div>
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {commits.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: C.dimmed, fontSize: 12 }}>
                <FiGitCommit size={24} style={{ display: 'block', margin: '0 auto 8px', color: C.dimmed }} />
                No commits yet
              </div>
            )}
            {commits.map((c, i) => (
              <div key={c.oid} style={{ padding: '8px 12px', borderBottom: `1px solid rgba(255,255,255,0.04)`, position: 'relative' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.hover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {i < commits.length - 1 && (
                  <div style={{ position: 'absolute', left: 23, top: 32, bottom: -10, width: 2, background: C.border }} />
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(229,164,90,0.3)', border: `2px solid ${C.amber}`, flexShrink: 0, marginTop: 2, position: 'relative', zIndex: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 500, wordBreak: 'break-word', lineHeight: 1.4 }}>{c.message}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", background: C.panel, padding: '1px 5px', borderRadius: 4 }}>{c.shortOid}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{c.author}</span>
                      <span style={{ fontSize: 11, color: C.dimmed }}>{formatRelativeDate(c.date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BRANCHES VIEW */}
        {view === 'branches' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {branches.map(b => {
                const isCurrent = b === status?.branch;
                return (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: isCurrent ? 'default' : 'pointer' }}
                    onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = C.hover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    onClick={() => !isCurrent && handleCheckout(b)}
                  >
                    <FiGitBranch size={13} style={{ color: isCurrent ? C.green : C.muted, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: isCurrent ? C.textBold : C.muted, fontWeight: isCurrent ? 600 : 400 }}>{b}</span>
                    {isCurrent && <span style={{ fontSize: 10, color: C.green, background: 'rgba(78,201,176,0.1)', padding: '1px 6px', borderRadius: 8 }}>current</span>}
                  </div>
                );
              })}
            </div>

            {/* Create branch */}
            <div style={{ padding: '8px 10px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              {showBranchInput ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') setShowBranchInput(false); }}
                    placeholder="Branch name"
                    autoFocus
                    style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, padding: '5px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = C.amber; }}
                    onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
                  />
                  <button onClick={handleCreateBranch} style={{ padding: '5px 10px', borderRadius: 4, cursor: 'pointer', background: 'rgba(78,201,176,0.15)', border: `1px solid rgba(78,201,176,0.3)`, color: C.green, fontSize: 11, fontFamily: 'inherit' }}>Create</button>
                </div>
              ) : (
                <button onClick={() => setShowBranchInput(true)}
                  style={{ width: '100%', padding: '6px', borderRadius: 5, cursor: 'pointer', background: 'rgba(86,156,214,0.08)', border: `1px solid rgba(86,156,214,0.2)`, color: C.blue, fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <FiPlus size={12} /> New Branch
                </button>
              )}
            </div>

            {/* Remote URL */}
            <div style={{ padding: '6px 10px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              {showRemoteInput ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={remoteUrlInput}
                    onChange={e => setRemoteUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveRemote(); if (e.key === 'Escape') setRemoteInput(false); }}
                    placeholder="https://github.com/owner/repo.git"
                    autoFocus
                    style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, padding: '5px 8px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = C.amber; }}
                    onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
                  />
                  <button onClick={handleSaveRemote} style={{ padding: '5px 10px', borderRadius: 4, cursor: 'pointer', background: 'rgba(86,156,214,0.1)', border: `1px solid rgba(86,156,214,0.3)`, color: C.blue, fontSize: 11, fontFamily: 'inherit' }}>Save</button>
                </div>
              ) : (
                <button onClick={() => setRemoteInput(true)}
                  style={{ width: '100%', padding: '6px', borderRadius: 5, cursor: 'pointer', background: 'rgba(86,156,214,0.06)', border: `1px solid rgba(86,156,214,0.15)`, color: C.muted, fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <FiUpload size={12} /> {remoteUrlInput ? 'Change Remote' : 'Set Remote URL'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitPanel;
