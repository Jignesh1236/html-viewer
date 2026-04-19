import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { FileItem, FileType } from '../store/editorStore';
import { exportProject } from '../utils/export';

type WinId = 'files' | 'code' | 'preview' | 'properties' | 'timeline' | 'terminal';
interface WinState { id: WinId; title: string; visible: boolean; minimized: boolean; docked: boolean; }

interface MenuBarProps {
  wins?: WinState[];
  onToggleWin?: (id: WinId) => void;
  onOpenWin?: (id: WinId, asDocked?: boolean) => void;
  onResetLayout?: () => void;
  onApplyModePreset?: (m: 'code' | 'visual' | 'split') => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
  danger?: boolean;
  badge?: string;
  badgeColor?: string;
}

const WIN_LABELS: Record<WinId, string> = {
  files: 'File Explorer', code: 'Code Editor', preview: 'Preview / Visual Editor',
  properties: 'Properties', timeline: 'Timeline', terminal: 'Terminal',
};
const WIN_ICONS: Record<WinId, string> = {
  files: '📁', code: '</>', preview: '🖥', properties: '⚙', timeline: '⏱', terminal: '>_',
};

const MenuBar: React.FC<MenuBarProps> = ({
  wins = [], onToggleWin, onOpenWin, onResetLayout, onApplyModePreset,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const { files, mode, showNotification, clearConsole, setPendingFileDialog, updateFileContent, addFolder, resetFiles } = useEditorStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const close = () => setOpenMenu(null);

  const htmlFile = files.find(f => f.type === 'html');

  const formatHtml = (input: string) => {
    let indent = 0;
    return input
      .replace(/>\s*</g, '><')
      .replace(/></g, '>\n<')
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
        const out = `${'  '.repeat(indent)}${trimmed}`;
        if (!trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) indent++;
        return out;
      })
      .filter(Boolean)
      .join('\n');
  };

  const minifyHtml = (input: string) =>
    input
      .replace(/>\s+</g, '><')
      .replace(/\n+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const validateHtml = (input: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');
    return !doc.querySelector('parsererror');
  };

  const checkAccessibility = (input: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');
    const missingAlt = doc.querySelectorAll('img:not([alt])').length;
    const missingButtonLabel = Array.from(doc.querySelectorAll('button')).filter(btn => !btn.textContent?.trim() && !btn.getAttribute('aria-label')).length;
    return { missingAlt, missingButtonLabel };
  };

  const newFile = () => {
    setPendingFileDialog({ type: 'create' });
    close();
  };

  const newFolder = () => {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    addFolder(name.trim());
    showNotification(`Folder "${name.trim()}" created`);
    close();
  };

  const clearAll = () => {
    close();
    if (!window.confirm('Delete all files and start a blank project? This cannot be undone.')) return;
    const blankHtml: FileItem = {
      id: 'index.html', name: 'index.html', type: 'html',
      content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>New Project</title>\n</head>\n<body>\n  \n</body>\n</html>',
    };
    resetFiles([blankHtml]);
    showNotification('Project cleared — blank HTML file created');
  };

  /* Build the Window menu dynamically */
  const buildWindowMenu = (): MenuItem[] => {
    const items: MenuItem[] = [];

    // Layout presets section
    items.push({ label: 'LAYOUT PRESETS', disabled: true });
    items.push({
      label: 'Code Layout', shortcut: 'Ctrl+1', checked: mode === 'code',
      badge: mode === 'code' ? 'active' : undefined, badgeColor: '#e5a45a',
      action: () => { onApplyModePreset?.('code'); close(); },
    });
    items.push({
      label: 'Visual Layout', shortcut: 'Ctrl+2', checked: mode === 'visual',
      badge: mode === 'visual' ? 'active' : undefined, badgeColor: '#e5a45a',
      action: () => { onApplyModePreset?.('visual'); close(); },
    });
    items.push({
      label: 'Split Layout', shortcut: 'Ctrl+3', checked: mode === 'split',
      badge: mode === 'split' ? 'active' : undefined, badgeColor: '#e5a45a',
      action: () => { onApplyModePreset?.('split'); close(); },
    });
    items.push({ separator: true, label: '' });

    // Per-window entries
    items.push({ label: 'WINDOWS', disabled: true });
    for (const w of wins) {
      const stateLabel = !w.visible ? 'hidden' : w.docked ? 'docked' : w.minimized ? 'minimized' : 'floating';
      const badgeColor = !w.visible ? '#555' : w.docked ? '#7ab8f5' : '#e5a45a';
      items.push({
        label: `${WIN_ICONS[w.id]}  ${WIN_LABELS[w.id]}`,
        checked: w.visible && !w.minimized,
        badge: stateLabel,
        badgeColor,
        action: () => {
          if (!w.visible) {
            onOpenWin?.(w.id, w.docked);
          } else {
            onToggleWin?.(w.id);
          }
          close();
        },
      });
    }
    items.push({ separator: true, label: '' });

    // Open specific windows in docked/floating mode
    items.push({ label: 'OPEN IN DOCKED SLOT', disabled: true });
    for (const w of wins) {
      if (!w.visible || !w.docked) {
        items.push({
          label: `Dock: ${WIN_LABELS[w.id]}`,
          action: () => { onOpenWin?.(w.id, true); close(); },
        });
      }
    }
    items.push({ label: 'OPEN AS FLOATING', disabled: true });
    for (const w of wins) {
      if (!w.visible || w.docked) {
        items.push({
          label: `Float: ${WIN_LABELS[w.id]}`,
          action: () => { onOpenWin?.(w.id, false); close(); },
        });
      }
    }

    items.push({ separator: true, label: '' });
    items.push({ label: '↺ Reset Layout to Defaults', action: () => { onResetLayout?.(); close(); } });
    return items;
  };

  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: 'File',
      items: [
        { label: '📄 New File', shortcut: 'Ctrl+N', action: newFile },
        { label: '📁 New Folder', action: newFolder },
        { separator: true, label: '' },
        { label: 'Save All', shortcut: 'Ctrl+S', action: () => { showNotification('All files saved ✓'); close(); } },
        { separator: true, label: '' },
        { label: 'Import Files…', action: () => { document.getElementById('global-file-upload')?.click(); close(); } },
        { label: '⬇ Clone Git Repo…', action: () => { setShowCloneDialog(true); close(); } },
        { separator: true, label: '' },
        { label: 'Export as ZIP', shortcut: 'Ctrl+E', action: () => { exportProject(files); showNotification('Exported as ZIP'); close(); } },
        { separator: true, label: '' },
        { label: '🗑 Clear All Files', danger: true, action: clearAll },
      ],
    },
    {
      label: 'Export',
      items: [
        { label: 'Export ZIP (All Files)', action: () => { exportProject(files); showNotification('Exported as ZIP'); close(); } },
        { label: 'Export HTML only', action: () => { exportProject(files.filter(f => f.type === 'html')); close(); } },
        { label: 'Export CSS only',  action: () => { exportProject(files.filter(f => f.type === 'css'));  close(); } },
        { label: 'Export JS only',   action: () => { exportProject(files.filter(f => f.type === 'js'));   close(); } },
        { separator: true, label: '' },
        { label: 'Copy HTML to Clipboard', action: () => { navigator.clipboard.writeText(files.find(f => f.type === 'html')?.content || ''); showNotification('HTML copied'); close(); } },
      ],
    },
    {
      label: 'Tools',
      items: [
        {
          label: 'Validate HTML',
          action: () => {
            if (!htmlFile) { showNotification('No HTML file found'); close(); return; }
            const ok = validateHtml(htmlFile.content);
            showNotification(ok ? 'HTML looks valid' : 'HTML parser found issues');
            close();
          },
        },
        {
          label: 'Check Accessibility',
          action: () => {
            if (!htmlFile) { showNotification('No HTML file found'); close(); return; }
            const a11y = checkAccessibility(htmlFile.content);
            if (a11y.missingAlt === 0 && a11y.missingButtonLabel === 0) {
              showNotification('Accessibility quick-check passed');
            } else {
              showNotification(`A11y: missing alt(${a11y.missingAlt}), unlabeled buttons(${a11y.missingButtonLabel})`);
            }
            close();
          },
        },
        { separator: true, label: '' },
        { label: 'Clear Console', action: () => { clearConsole(); close(); } },
        { label: 'Hard Refresh Preview', shortcut: 'Ctrl+R', action: () => { useEditorStore.getState().refreshPreview(); close(); } },
        { separator: true, label: '' },
        {
          label: 'Format HTML',
          action: () => {
            if (!htmlFile) { showNotification('No HTML file found'); close(); return; }
            const formatted = formatHtml(htmlFile.content);
            updateFileContent(htmlFile.id, formatted);
            showNotification('HTML formatted');
            close();
          },
        },
        {
          label: 'Minify HTML',
          action: () => {
            if (!htmlFile) { showNotification('No HTML file found'); close(); return; }
            const minified = minifyHtml(htmlFile.content);
            updateFileContent(htmlFile.id, minified);
            showNotification('HTML minified');
            close();
          },
        },
      ],
    },
    {
      label: 'Window',
      items: buildWindowMenu(),
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', action: () => { showNotification('Ctrl+1/2/3 Layout | Ctrl+S Save | Ctrl+E Export | Ctrl+R Refresh'); close(); } },
        { label: 'Drag floating window to dock slot', disabled: true },
        { label: 'Right-click docked panel to float', disabled: true },
        { label: 'Drag divider between panels to resize', disabled: true },
        { separator: true, label: '' },
        { label: 'About HTML Editor v2.0', action: () => { showNotification('HTML Editor v2.0 — Floating + Docked Window System'); close(); } },
      ],
    },
  ];

  return (
    <>
    <div ref={menuRef} style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
      {menus.map(menu => (
        <div
          key={menu.label}
          style={{ position: 'relative' }}
          onMouseEnter={() => { if (openMenu && openMenu !== menu.label) setOpenMenu(menu.label); }}
        >
          <button
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            style={{
              height: '100%', padding: '0 10px',
              background: openMenu === menu.label ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center',
            }}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 100000,
              background: '#2a2a2a', border: '1px solid #505050', borderRadius: 5,
              boxShadow: '0 12px 40px rgba(0,0,0,0.8)', minWidth: 280, padding: '4px 0',
              maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
            }}>
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} style={{ height: 1, background: '#3a3a3a', margin: '4px 0' }} />
                ) : item.disabled ? (
                  <div key={i} style={{ padding: '4px 12px 2px', fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.08em', userSelect: 'none' }}>
                    {item.label}
                  </div>
                ) : (
                  <MenuRow key={i} item={item} />
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
    {showCloneDialog && (
      <CloneRepoDialog
        onClose={() => setShowCloneDialog(false)}
        onCloned={(newFiles) => {
          resetFiles(newFiles);
          setShowCloneDialog(false);
          showNotification(`Cloned ${newFiles.length} files`);
        }}
      />
    )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   Clone Repo Dialog
   ───────────────────────────────────────────────────────────── */
function inferFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'js';
  if (ext === 'ts') return 'ts';
  if (ext === 'tsx') return 'tsx';
  if (ext === 'jsx') return 'jsx';
  if (ext === 'json') return 'json';
  if (['png','jpg','jpeg','gif','webp','svg','ico','bmp'].includes(ext)) return 'image';
  return 'other';
}

const BINARY_EXTS = new Set(['png','jpg','jpeg','gif','webp','ico','bmp','woff','woff2','ttf','eot','otf','zip','tar','gz','pdf','mp4','mp3','wav']);

interface CloneRepoDialogProps {
  onClose: () => void;
  onCloned: (files: FileItem[]) => void;
}

function CloneRepoDialog({ onClose, onCloned }: CloneRepoDialogProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const parseRepo = (raw: string): { owner: string; repo: string } | null => {
    const s = raw.trim().replace(/\.git$/, '');
    const ghMatch = s.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (ghMatch) return { owner: ghMatch[1], repo: ghMatch[2] };
    const shortMatch = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
    return null;
  };

  const clone = useCallback(async () => {
    setError('');
    setStatus('');
    setProgress(null);
    const parsed = parseRepo(url);
    if (!parsed) { setError('Invalid URL. Use https://github.com/owner/repo or owner/repo'); return; }
    const { owner, repo } = parsed;
    setLoading(true);
    try {
      // 1. Get default branch
      setStatus('Fetching repository info…');
      const infoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!infoRes.ok) throw new Error(infoRes.status === 404 ? 'Repository not found. Make sure it is public.' : `GitHub API error ${infoRes.status}`);
      const info = await infoRes.json() as { default_branch: string };
      const branch = info.default_branch;

      // 2. Get file tree
      setStatus(`Fetching file tree (branch: ${branch})…`);
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
      if (!treeRes.ok) throw new Error(`Could not fetch file tree (${treeRes.status})`);
      const tree = await treeRes.json() as { tree: { path: string; type: string; size?: number; sha: string }[]; truncated: boolean };
      if (tree.truncated) setStatus('Note: repository is large — showing first 1000 files only.');

      const blobs = tree.tree.filter(f => {
        if (f.type !== 'blob') return false;
        const ext = f.path.split('.').pop()?.toLowerCase() ?? '';
        if (BINARY_EXTS.has(ext)) return false;
        if (f.size && f.size > 300_000) return false;
        return true;
      }).slice(0, 100);

      setProgress({ done: 0, total: blobs.length });

      // 3. Fetch file content via raw.githubusercontent.com — no API rate limits!
      const fetchedFiles: FileItem[] = [];
      const BATCH = 10; // parallel batch size
      for (let i = 0; i < blobs.length; i += BATCH) {
        const batch = blobs.slice(i, i + BATCH);
        setStatus(`Downloading files ${i + 1}–${Math.min(i + BATCH, blobs.length)} of ${blobs.length}…`);
        setProgress({ done: i, total: blobs.length });
        const results = await Promise.allSettled(
          batch.map(async blob => {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${blob.path}`;
            const res = await fetch(rawUrl);
            if (!res.ok) return null;
            const content = await res.text();
            const name = blob.path.split('/').pop() ?? blob.path;
            const folder = blob.path.includes('/') ? blob.path.split('/').slice(0, -1).join('/') : undefined;
            return { id: blob.path, name, type: inferFileType(name), content, folder } as FileItem;
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) fetchedFiles.push(r.value);
        }
      }

      if (fetchedFiles.length === 0) throw new Error('No readable text files found in this repository.');
      setProgress({ done: blobs.length, total: blobs.length });
      setStatus(`Done! ${fetchedFiles.length} files loaded.`);
      setTimeout(() => onCloned(fetchedFiles), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [url, onCloned]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1e1e1e', border: '1px solid #3e3e3e', borderRadius: 10,
        width: 480, maxWidth: '90vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px 12px', background: '#252526', borderBottom: '1px solid #333',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⬇</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#d4d4d4' }}>Clone Public Repo</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>Imports text files from any public GitHub repository</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18, lineHeight: 1, padding: 4, borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
            onMouseLeave={e => (e.currentTarget.style.color = '#888')}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px' }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>
            GitHub Repository URL or <code style={{ color: '#e5a45a' }}>owner/repo</code>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !loading) clone(); if (e.key === 'Escape') onClose(); }}
              placeholder="https://github.com/owner/repo"
              disabled={loading}
              style={{
                flex: 1, background: '#141414', border: '1px solid #3e3e3e', borderRadius: 6,
                color: '#d4d4d4', fontSize: 13, padding: '8px 12px',
                outline: 'none', fontFamily: 'var(--app-font-mono)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(229,164,90,0.6)')}
              onBlur={e => (e.currentTarget.style.borderColor = '#3e3e3e')}
            />
            <button
              onClick={clone}
              disabled={loading || !url.trim()}
              style={{
                padding: '8px 18px', borderRadius: 6, cursor: loading ? 'wait' : 'pointer',
                background: loading ? 'rgba(229,164,90,0.1)' : 'rgba(229,164,90,0.2)',
                border: '1px solid rgba(229,164,90,0.4)',
                color: '#e5a45a', fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
                opacity: !url.trim() ? 0.5 : 1, flexShrink: 0,
              }}
            >
              {loading ? 'Cloning…' : 'Clone'}
            </button>
          </div>

          {/* Progress bar */}
          {progress && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 4 }}>
                <span>Downloading files</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: '#e5a45a', borderRadius: 2,
                  width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                  transition: 'width 0.2s ease',
                }} />
              </div>
            </div>
          )}

          {/* Status */}
          {status && !error && (
            <div style={{
              marginTop: 12, padding: '8px 12px', background: 'rgba(78,201,176,0.08)',
              border: '1px solid rgba(78,201,176,0.2)', borderRadius: 6,
              fontSize: 12, color: '#4ec9b0', lineHeight: 1.5,
            }}>
              {status}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 12, padding: '8px 12px', background: 'rgba(244,71,71,0.08)',
              border: '1px solid rgba(244,71,71,0.25)', borderRadius: 6,
              fontSize: 12, color: '#f88', lineHeight: 1.5,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Info */}
          {!loading && !error && !status && (
            <div style={{ marginTop: 14, fontSize: 11, color: '#555', lineHeight: 1.7 }}>
              <div>• Only <strong style={{ color: '#666' }}>public</strong> repositories are supported</div>
              <div>• Text files only (HTML, CSS, JS, TS, JSON, etc.) — up to 80 files</div>
              <div>• Files larger than 500 KB are skipped</div>
              <div>• Current project will be replaced by the cloned files</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 20px', background: '#252526', borderTop: '1px solid #333',
        }}>
          <button onClick={onClose} disabled={loading} style={{
            padding: '6px 16px', borderRadius: 5, cursor: 'pointer',
            background: 'none', border: '1px solid #444', color: '#888', fontSize: 12, fontFamily: 'inherit',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={item.disabled ? undefined : item.action}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px 5px 8px',
        cursor: item.disabled ? 'default' : 'pointer',
        background: hov && !item.disabled ? 'rgba(255,255,255,0.07)' : 'transparent',
        color: item.disabled ? '#555' : item.danger ? '#f88' : '#ccc',
        fontSize: 12, userSelect: 'none', transition: 'background 0.08s',
      }}
    >
      {/* Checkmark column */}
      <span style={{ width: 14, textAlign: 'center', fontSize: 11, color: '#e5a45a', flexShrink: 0 }}>
        {item.checked ? '✓' : ''}
      </span>

      {/* Label */}
      <span style={{ flex: 1 }}>{item.label}</span>

      {/* Badge */}
      {item.badge && (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
          background: `${item.badgeColor || '#666'}22`,
          color: item.badgeColor || '#888',
          border: `1px solid ${item.badgeColor || '#666'}44`,
          letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
        }}>
          {item.badge}
        </span>
      )}

      {/* Shortcut */}
      {item.shortcut && (
        <span style={{ fontSize: 10, color: '#555', paddingLeft: 8, flexShrink: 0 }}>{item.shortcut}</span>
      )}
    </div>
  );
}

export default MenuBar;
