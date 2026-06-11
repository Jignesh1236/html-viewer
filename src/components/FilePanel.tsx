import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ControlledTreeEnvironment,
  Tree,
  TreeItem,
  TreeItemIndex,
  DraggingPosition,
} from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';
import { useEditorStore, FileItem, getDefaultContentForLanguage, getLanguageFromFileName } from '../store/editorStore';
import { openFileInGLPanel } from '../lib/fileEditorBridge';
import { FiPlus, FiUpload, FiX, FiCheck, FiTrash2, FiAlertTriangle, FiFolderPlus, FiChevronRight } from 'react-icons/fi';
import { useContextMenu } from './ContextMenu';
import { dataUrlToBase64, fileIdFor, makeUniqueName } from '../utils/projectFiles';

/* ─── devicon map ─────────────────────────────────────────── */
const DEVICON_MAP: Record<string, { icon: string; color: string }> = {
  html:  { icon: 'devicon-html5-plain',       color: '#e34c26' },
  css:   { icon: 'devicon-css3-plain',         color: '#264de4' },
  js:    { icon: 'devicon-javascript-plain',   color: '#f7df1e' },
  ts:    { icon: 'devicon-typescript-plain',   color: '#3178c6' },
  tsx:   { icon: 'devicon-react-original',     color: '#61dafb' },
  jsx:   { icon: 'devicon-react-original',     color: '#61dafb' },
  json:  { icon: 'devicon-json-plain',         color: '#f8c555' },
  md:    { icon: 'devicon-markdown-original',  color: '#aaa' },
  svg:   { icon: 'devicon-svg-plain',          color: '#ffb13b' },
  png:   { icon: 'devicon-photoshop-plain',    color: '#31a8ff' },
  jpg:   { icon: 'devicon-photoshop-plain',    color: '#31a8ff' },
  jpeg:  { icon: 'devicon-photoshop-plain',    color: '#31a8ff' },
  gif:   { icon: 'devicon-photoshop-plain',    color: '#31a8ff' },
  webp:  { icon: 'devicon-photoshop-plain',    color: '#31a8ff' },
  ico:   { icon: 'devicon-photoshop-plain',    color: '#31a8ff' },
  py:    { icon: 'devicon-python-plain',       color: '#3776ab' },
  php:   { icon: 'devicon-php-plain',          color: '#8892bf' },
  sass:  { icon: 'devicon-sass-original',      color: '#cc6699' },
  scss:  { icon: 'devicon-sass-original',      color: '#cc6699' },
  vue:   { icon: 'devicon-vuejs-plain',        color: '#42b883' },
};

const FileIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 13 }) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const entry = DEVICON_MAP[ext];
  if (entry) return <i className={entry.icon} style={{ fontSize: size, color: entry.color, flexShrink: 0, lineHeight: 1 }} />;
  return <span style={{ width: size, height: size, flexShrink: 0, display: 'inline-block', background: '#555', borderRadius: 2 }} />;
};

/* ─── folder icon ─────────────────────────────────────────── */
const FolderIcon: React.FC<{ open?: boolean; color?: string }> = ({ open, color = '#c09040' }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={color} style={{ flexShrink: 0 }}>
    {open
      ? <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14V3.5z"/>
      : <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707z"/>
    }
  </svg>
);

/* ─── types ───────────────────────────────────────────────── */
type ItemData =
  | { kind: 'file'; file: FileItem }
  | { kind: 'folder'; name: string }
  | { kind: 'root' };

type DialogMode = 'create-file' | 'create-folder' | 'rename-file' | 'rename-folder' | 'delete-file' | 'delete-folder' | 'github-import';
interface DialogState {
  mode: DialogMode;
  file?: FileItem;
  folderName?: string;
  targetFolder?: string;
}

/* ─── theme tokens ───────────────────────────────────────── */
const T = {
  bg: '#1e1e22',
  row: 'transparent',
  rowHover: 'rgba(255,255,255,0.05)',
  rowActive: 'rgba(229,164,90,0.12)',
  rowDragOver: 'rgba(229,164,90,0.15)',
  accent: '#e5a45a',
  text: '#cccccc',
  textMuted: '#888',
  textFolder: '#c8c8c8',
  border: 'rgba(0,0,0,0.5)',
  indentLine: 'rgba(255,255,255,0.07)',
  headerBg: 'linear-gradient(180deg,#2e2e34 0%,#252528 50%,#222225 100%)',
  btnBg: 'linear-gradient(180deg,#3a3a42 0%,#2e2e35 50%,#2a2a31 100%)',
  btnShadow: 'inset 0 1px 0 rgba(255,255,255,0.1),0 1px 3px rgba(0,0,0,0.4)',
};

/* ─── Dialog ─────────────────────────────────────────────── */
const FileDialog: React.FC<{
  dialog: DialogState;
  files: FileItem[];
  folders: string[];
  onConfirm: (value: string) => void;
  onCancel: () => void;
}> = ({ dialog, files, folders, onConfirm, onCancel }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(dialog.mode === 'rename-file' ? (dialog.file?.name ?? '') : dialog.mode === 'rename-folder' ? (dialog.folderName ?? '') : '');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [dialog]);

  const validate = (v: string) => {
    if (!v.trim()) return 'Name cannot be empty';
    if (dialog.mode === 'github-import') {
      if (!/^https?:\/\/github\.com\/[\w-]+\/[\w-]+(\/tree\/[\w-/]+)?$/.test(v.trim())) return 'Invalid GitHub URL';
    }
    if (dialog.mode === 'create-file') {
      if (files.find(f => f.name === v.trim() && f.folder === dialog.targetFolder)) return `"${v}" already exists`;
      if (!/^[\w\-. ]+$/.test(v.trim())) return 'Invalid characters';
    }
    if (dialog.mode === 'create-folder') {
      if (folders.includes(v.trim())) return `"${v}" already exists`;
      if (!/^[\w\-. ]+$/.test(v.trim())) return 'Invalid characters';
    }
    if (dialog.mode === 'rename-file') {
      if (v.trim() !== dialog.file?.name && files.find(f => f.name === v.trim())) return `"${v}" already exists`;
      if (!/^[\w\-. ]+$/.test(v.trim())) return 'Invalid characters';
    }
    if (dialog.mode === 'rename-folder') {
      if (v.trim() !== dialog.folderName && folders.includes(v.trim())) return `"${v}" already exists`;
      if (!/^[\w\-. ]+$/.test(v.trim())) return 'Invalid characters';
    }
    return '';
  };

  const handleConfirm = () => {
    if (dialog.mode === 'delete-file' || dialog.mode === 'delete-folder') { onConfirm(''); return; }
    const err = validate(value);
    if (err) { setError(err); return; }
    onConfirm(value.trim());
  };

  const isDelete = dialog.mode === 'delete-file' || dialog.mode === 'delete-folder';
  const isFolder = dialog.mode === 'create-folder' || dialog.mode === 'rename-folder' || dialog.mode === 'delete-folder';
  const isGithub = dialog.mode === 'github-import';

  const TITLES: Record<DialogMode, string> = {
    'create-file': 'New File', 'create-folder': 'New Folder',
    'rename-file': 'Rename File', 'rename-folder': 'Rename Folder',
    'delete-file': `Delete "${dialog.file?.name}"?`,
    'delete-folder': `Delete folder "${dialog.folderName}"?`,
    'github-import': 'Import from GitHub',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ background: '#252526', border: `1px solid ${isDelete ? 'rgba(248,68,68,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '20px 22px 18px', width: isGithub ? 400 : 300, boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          {isDelete ? <FiAlertTriangle size={15} color="#f84" /> : isGithub ? <span style={{ fontSize: 15 }}>🐙</span> : isFolder ? <FiFolderPlus size={15} color={T.accent} /> : <FiPlus size={15} color={T.accent} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8', flex: 1 }}>{TITLES[dialog.mode]}</span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 3, borderRadius: 4, display: 'flex' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#999')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
            <FiX size={13} />
          </button>
        </div>

        {!isDelete && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {isGithub ? 'Repository URL' : dialog.mode.startsWith('create') ? (isFolder ? 'Folder name' : 'File name') : 'New name'}
            </div>
            <input ref={inputRef} value={value} onChange={e => { setValue(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onCancel(); }}
              placeholder={isGithub ? 'https://github.com/owner/repo' : isFolder ? 'e.g. components' : 'e.g. about.html'}
              style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a1e', border: `1px solid ${error ? 'rgba(248,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, padding: '8px 10px', fontSize: 12.5, color: '#e0e0e0', outline: 'none', fontFamily: 'monospace', transition: 'border-color 0.15s' }}
              onFocus={e => { if (!error) e.currentTarget.style.borderColor = T.accent + '55'; }}
              onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
            {error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><FiAlertTriangle size={10} /> {error}</div>}
            {!error && dialog.mode === 'create-file' && <div style={{ fontSize: 10, color: '#555', marginTop: 5 }}>Extension sets file type (.html, .css, .js)</div>}
          </div>
        )}
        {isDelete && <p style={{ fontSize: 12, color: '#999', marginBottom: 16, lineHeight: 1.6 }}>
          {dialog.mode === 'delete-folder' ? 'Files inside will be moved to root. Cannot be undone.' : 'This action cannot be undone.'}
        </p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'none', cursor: 'pointer', color: '#888', fontSize: 12, fontFamily: 'inherit', transition: 'all 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#ccc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888'; }}>
            Cancel
          </button>
          <button onClick={handleConfirm} style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${isDelete ? 'rgba(239,68,68,0.3)' : 'rgba(229,164,90,0.3)'}`, background: isDelete ? 'rgba(239,68,68,0.12)' : 'rgba(229,164,90,0.12)', cursor: 'pointer', color: isDelete ? '#f87171' : T.accent, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', transition: 'all 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.background = isDelete ? 'rgba(239,68,68,0.22)' : 'rgba(229,164,90,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDelete ? 'rgba(239,68,68,0.12)' : 'rgba(229,164,90,0.12)'; }}>
            {isDelete ? <><FiTrash2 size={11} />Delete</> : <><FiCheck size={11} />{dialog.mode.startsWith('create') ? 'Create' : 'Rename'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main component ──────────────────────────────────────── */
const FilePanel: React.FC<{ onClose?: () => void; hideHeader?: boolean }> = ({ onClose, hideHeader }) => {
  const {
    files, folders, activeFileId, setActiveFile, addFile, removeFile,
    addFolder, removeFolder, renameFolder, moveFileToFolder,
    showNotification, pendingFileDialog, setPendingFileDialog,
    unsavedFileIds, markFileSaved,
  } = useEditorStore();

  const uploadRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [expandedItems, setExpandedItems] = useState<TreeItemIndex[]>([]);
  const [selectedItems, setSelectedItems] = useState<TreeItemIndex[]>([]);
  const [dropZoneOver, setDropZoneOver] = useState(false);
  const { show: showCtx, element: ctxEl } = useContextMenu();

  useEffect(() => {
    if (!pendingFileDialog) return;
    if (pendingFileDialog.type === 'create') setDialog({ mode: 'create-file' });
    else if (pendingFileDialog.type === 'rename' && pendingFileDialog.fileId) {
      const file = files.find(f => f.id === pendingFileDialog.fileId);
      if (file) setDialog({ mode: 'rename-file', file });
    }
    setPendingFileDialog(null);
  }, [pendingFileDialog, files, setPendingFileDialog]);

  const allFolderNames = useMemo(
    () => Array.from(new Set([...folders, ...files.filter(f => f.folder).map(f => f.folder!)])),
    [folders, files]
  );

  /* ── build tree items map ─────────────────────────────── */
  const treeItems = useMemo<Record<TreeItemIndex, TreeItem<ItemData>>>(() => {
    const items: Record<TreeItemIndex, TreeItem<ItemData>> = {};
    items['root'] = {
      index: 'root', isFolder: true,
      children: [
        ...allFolderNames.map(f => `folder:${f}`),
        ...files.filter(f => !f.folder).map(f => `file:${f.id}`),
      ],
      data: { kind: 'root' },
    };
    allFolderNames.forEach(name => {
      items[`folder:${name}`] = {
        index: `folder:${name}`, isFolder: true,
        children: files.filter(f => f.folder === name).map(f => `file:${f.id}`),
        data: { kind: 'folder', name },
      };
    });
    files.forEach(file => {
      items[`file:${file.id}`] = {
        index: `file:${file.id}`, isFolder: false, children: [],
        data: { kind: 'file', file },
      };
    });
    return items;
  }, [files, allFolderNames]);

  /* ── file import helpers ─────────────────────────────── */
  const importSingleFile = useCallback((file: File, targetFolder?: string) => {
    const name = makeUniqueName(file.name, targetFolder, files);
    const ext = name.split('.').pop()?.toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '');
    const isText = ['html', 'css', 'js', 'ts', 'tsx', 'jsx', 'json', 'txt', 'md'].includes(ext || '');
    const fileId = fileIdFor(name, targetFolder);
    const readAs = (mode: 'dataURL' | 'text', cb: (result: string) => void) => {
      const reader = new FileReader();
      reader.onload = e => cb(String(e.target?.result ?? ''));
      if (mode === 'dataURL') reader.readAsDataURL(file); else reader.readAsText(file);
    };
    if (isImage) {
      readAs('dataURL', dataUrl => addFile({ id: fileId, name, type: 'image', content: dataUrlToBase64(dataUrl), url: dataUrl, mimeType: file.type, folder: targetFolder }));
    } else if (isText) {
      readAs('text', content => {
        const type = ext === 'html' ? 'html' : ext === 'css' ? 'css' : (ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'jsx') ? 'js' : 'other';
        addFile({ id: fileId, name, type, content, folder: targetFolder });
      });
    } else {
      readAs('dataURL', dataUrl => addFile({ id: fileId, name, type: 'other', content: dataUrlToBase64(dataUrl), url: dataUrl, mimeType: file.type, folder: targetFolder }));
    }
  }, [addFile, files]);

  const readDirectoryEntry = useCallback((entry: FileSystemDirectoryEntry, parentFolder?: string) => {
    const folderName = parentFolder ? `${parentFolder}/${entry.name}` : entry.name;
    addFolder(folderName);
    const reader = entry.createReader();
    const readAll = (acc: FileSystemEntry[] = []) => {
      reader.readEntries(entries => {
        if (entries.length === 0) {
          acc.forEach(e => {
            if (e.isFile) (e as FileSystemFileEntry).file(f => importSingleFile(f, folderName));
            else if (e.isDirectory) readDirectoryEntry(e as FileSystemDirectoryEntry, folderName);
          });
          return;
        }
        readAll([...acc, ...entries]);
      });
    };
    readAll();
  }, [addFolder, importSingleFile]);

  const handleDropItems = useCallback((items: DataTransferItemList, targetFolder?: string) => {
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (!entry) continue;
      count++;
      if (entry.isDirectory) readDirectoryEntry(entry as FileSystemDirectoryEntry, targetFolder);
      else if (entry.isFile) (entry as FileSystemFileEntry).file(f => importSingleFile(f, targetFolder));
    }
    if (count > 0) showNotification(`Importing ${count} item(s)…`);
  }, [readDirectoryEntry, importSingleFile, showNotification]);

  const handleUpload = useCallback((uploadedFiles: FileList | null, targetFolder?: string) => {
    if (!uploadedFiles) return;
    Array.from(uploadedFiles).forEach(file => importSingleFile(file, targetFolder));
    if (uploadedFiles.length) showNotification(`Imported ${uploadedFiles.length} file(s)`);
  }, [importSingleFile, showNotification]);

  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const entry = (file as any).webkitGetAsEntry?.();
      if (entry?.isDirectory) readDirectoryEntry(entry as FileSystemDirectoryEntry);
      else importSingleFile(file);
    }
    e.target.value = '';
  }, [readDirectoryEntry, importSingleFile]);

  /* ── dialog confirm ────────────────────────────────────── */
  const handleDialogConfirm = useCallback((value: string) => {
    if (!dialog) return;
    if (dialog.mode === 'create-file') {
      const fileId = fileIdFor(value, dialog.targetFolder);
      if (files.find(f => f.id === fileId)) { showNotification(`"${value}" already exists`); return; }
      const ext = value.split('.').pop()?.toLowerCase();
      const type = ext === 'html' ? 'html' : ext === 'css' ? 'css' : (ext === 'js' || ext === 'ts') ? 'js' : 'other';
      addFile({ id: fileId, name: value, type, content: getDefaultContentForLanguage(getLanguageFromFileName(value)), folder: dialog.targetFolder });
      setActiveFile(fileId);
      showNotification(`Created ${value}`);
    }
    if (dialog.mode === 'create-folder') {
      addFolder(value);
      setExpandedItems(prev => [...prev.filter(i => i !== `folder:${value}`), `folder:${value}`]);
      showNotification(`Created folder "${value}"`);
    }
    if (dialog.mode === 'rename-file' && dialog.file) {
      if (value === dialog.file.name) { setDialog(null); return; }
      const newId = fileIdFor(value, dialog.file.folder);
      removeFile(dialog.file.id);
      addFile({ ...dialog.file, id: newId, name: value });
      setActiveFile(newId);
      showNotification(`Renamed to ${value}`);
    }
    if (dialog.mode === 'rename-folder' && dialog.folderName) {
      if (value !== dialog.folderName) { renameFolder(dialog.folderName, value); showNotification(`Renamed to "${value}"`); }
    }
    if (dialog.mode === 'delete-file' && dialog.file) {
      removeFile(dialog.file.id);
      showNotification(`Deleted ${dialog.file.name}`);
    }
    if (dialog.mode === 'delete-folder' && dialog.folderName) {
      removeFolder(dialog.folderName);
      showNotification(`Deleted folder "${dialog.folderName}"`);
    }
    if (dialog.mode === 'github-import') {
      const match = value.trim().match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        fetch(`https://api.github.com/repos/${match[1]}/${match[2]}/contents`)
          .then(r => r.json())
          .then(data => {
            if (!Array.isArray(data)) return;
            data.forEach(item => {
              if (item.type !== 'file') return;
              const ext = item.name.split('.').pop()?.toLowerCase();
              const isText = ['html','css','js','ts','tsx','jsx','json','txt','md'].includes(ext||'');
              const isImage = ['png','jpg','jpeg','gif','svg','webp','ico'].includes(ext||'');
              if (isText) {
                fetch(item.download_url).then(r => r.text()).then(content => {
                  const type = ext === 'html' ? 'html' : ext === 'css' ? 'css' : (ext==='js'||ext==='ts'||ext==='tsx'||ext==='jsx') ? 'js' : 'other';
                  const nm = makeUniqueName(item.name, undefined, useEditorStore.getState().files);
                  addFile({ id: nm, name: nm, type, content });
                });
              } else if (isImage) {
                const nm = makeUniqueName(item.name, undefined, useEditorStore.getState().files);
                addFile({ id: nm, name: nm, type: 'image', content: '', url: item.download_url });
              }
            });
            showNotification(`Imported from GitHub`);
          })
          .catch(() => showNotification('GitHub import failed'));
      }
    }
    setDialog(null);
  }, [dialog, files, addFile, removeFile, addFolder, removeFolder, renameFolder, setActiveFile, showNotification]);

  /* ── context menus ─────────────────────────────────────── */
  const handleFileCtx = (e: React.MouseEvent, file: FileItem) => {
    showCtx(e, [
      { label: 'Open', icon: '📂', action: () => { setActiveFile(file.id); if (file.type !== 'image') openFileInGLPanel(file.id, file.name); } },
      { separator: true, label: '' },
      { label: unsavedFileIds.includes(file.id) ? 'Save' : 'Save (up to date)', icon: '💾', action: () => { markFileSaved(file.id); showNotification(`Saved ${file.name} ✓`); } },
      { separator: true, label: '' },
      { label: 'Rename', icon: '✏️', action: () => setDialog({ mode: 'rename-file', file }) },
      { label: 'Duplicate', icon: '📋', action: () => {
        const parts = file.name.split('.');
        const pref = parts.length > 1 ? `${parts.slice(0,-1).join('.')}_copy.${parts[parts.length-1]}` : `${file.name}_copy`;
        const newName = makeUniqueName(pref, file.folder, files);
        addFile({ ...file, id: fileIdFor(newName, file.folder), name: newName });
        showNotification(`Duplicated as ${newName}`);
      }},
      ...(allFolderNames.length > 0 ? [
        { separator: true, label: '' },
        ...allFolderNames.filter(f => f !== file.folder).map(fn => ({ label: `Move to 📁 ${fn}`, action: () => moveFileToFolder(file.id, fn) })),
        ...(file.folder ? [{ label: 'Move to Root', action: () => moveFileToFolder(file.id, undefined) }] : []),
      ] : []),
      { separator: true, label: '' },
      { label: 'Copy Content', icon: '📄', action: () => { navigator.clipboard.writeText(file.content); showNotification('Copied'); } },
      { separator: true, label: '' },
      { label: `Delete "${file.name}"`, icon: '🗑️', danger: true, action: () => setDialog({ mode: 'delete-file', file }) },
    ]);
  };

  const handleFolderCtx = (e: React.MouseEvent, folderName: string) => {
    e.preventDefault(); e.stopPropagation();
    showCtx(e, [
      { label: `📁 ${folderName}`, disabled: true },
      { separator: true, label: '' },
      { label: 'New File Inside', icon: '📄', action: () => setDialog({ mode: 'create-file', targetFolder: folderName }) },
      { label: 'Rename Folder', icon: '✏️', action: () => setDialog({ mode: 'rename-folder', folderName }) },
      { separator: true, label: '' },
      { label: 'Delete Folder', icon: '🗑️', danger: true, action: () => setDialog({ mode: 'delete-folder', folderName }) },
    ]);
  };

  const handlePanelCtx = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('input,textarea,select,[contenteditable="true"]')) return;
    e.preventDefault(); e.stopPropagation();
    if ((e.target as Element).closest('[data-file-item],[data-folder-item],button,input')) return;
    showCtx(e, [
      { label: 'New File', icon: '📄', action: () => setDialog({ mode: 'create-file' }) },
      { label: 'New Folder', icon: '📁', action: () => setDialog({ mode: 'create-folder' }) },
      { label: 'Import Files…', icon: '⬆️', action: () => uploadRef.current?.click() },
      { label: 'Open Folder…', icon: '📂', action: () => folderInputRef.current?.click() },
      { label: 'Import from GitHub…', icon: '🐙', action: () => setDialog({ mode: 'github-import' }) },
      { separator: true, label: '' },
      { label: 'Close Explorer', icon: '✕', action: onClose },
    ]);
  };

  /* ── react-complex-tree drop handler ───────────────────── */
  const handleDrop = useCallback((droppedItems: TreeItem<ItemData>[], target: DraggingPosition) => {
    droppedItems.forEach(dropped => {
      if (dropped.data.kind !== 'file') return;
      const { file } = dropped.data;

      if (target.targetType === 'root') {
        moveFileToFolder(file.id, undefined);
      } else if (target.targetType === 'item') {
        const t = treeItems[target.targetItem];
        if (t?.data.kind === 'folder') moveFileToFolder(file.id, t.data.name);
        else if (t?.data.kind === 'file') moveFileToFolder(file.id, t.data.file.folder);
        else if (t?.data.kind === 'root') moveFileToFolder(file.id, undefined);
      } else if (target.targetType === 'between-items') {
        const parent = treeItems[target.parentItem];
        if (parent?.data.kind === 'folder') moveFileToFolder(file.id, parent.data.name);
        else moveFileToFolder(file.id, undefined);
      }
    });
  }, [treeItems, moveFileToFolder]);

  /* ── section header label ──────────────────────────────── */
  const SECTION_LABEL = 'EXPLORER';

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', background: T.bg }}
      onContextMenu={handlePanelCtx}
    >
      {/* inject scoped styles */}
      <style>{`
        .fp-tree ul { list-style: none !important; margin: 0 !important; padding: 0 !important; }
        .fp-tree li { list-style: none !important; }
        .fp-tree [role="group"] { border-left: 1px solid ${T.indentLine}; margin-left: 0; }
        .fp-drag-line { background: ${T.accent} !important; height: 2px !important; opacity: 0.8 !important; border-radius: 1px; }
        .fp-row { position: relative; display: flex; align-items: center; height: 24px; gap: 0; cursor: pointer; user-select: none; border: 1px solid transparent; border-radius: 3px; }
        .fp-row:focus-visible { outline: 1px solid ${T.accent}55 !important; }
        .fp-row-inner { display: flex; align-items: center; gap: 5px; flex: 1; min-width: 0; padding-right: 4px; }
        .fp-row-actions { display: flex; align-items: center; gap: 1px; opacity: 0; transition: opacity 0.12s; flex-shrink: 0; padding-right: 4px; }
        .fp-row:hover .fp-row-actions { opacity: 1; }
        .fp-action-btn { background: none; border: none; cursor: pointer; color: #555; padding: 3px; display: flex; border-radius: 3px; transition: color 0.1s, background 0.1s; }
        .fp-action-btn:hover { color: #ccc; background: rgba(255,255,255,0.08); }
        .fp-action-btn.danger:hover { color: #f87171; background: rgba(248,113,113,0.1); }
        .fp-unsaved { width: 6px; height: 6px; border-radius: 50%; background: ${T.accent}; flex-shrink: 0; box-shadow: 0 0 5px rgba(229,164,90,0.7); }
      `}</style>

      {/* ── header ───────────────────────────────────── */}
      {!hideHeader && (
        <div style={{ height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 10px', background: T.headerBg, borderBottom: `1px solid ${T.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMuted, flex: 1 }}>{SECTION_LABEL}</span>
          {[
            { title: 'New File', icon: <FiPlus size={13} />, action: () => setDialog({ mode: 'create-file' }) },
            { title: 'New Folder', icon: <FiFolderPlus size={13} />, action: () => setDialog({ mode: 'create-folder' }) },
            { title: 'Import Files', icon: <FiUpload size={12} />, action: () => uploadRef.current?.click() },
          ].map(({ title, icon, action }) => (
            <button key={title} title={title} onClick={action}
              style={{ background: T.btnBg, border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', color: T.textMuted, padding: '3px 5px', display: 'flex', borderRadius: 4, marginLeft: 3, boxShadow: T.btnShadow, transition: 'color 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ddd'; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; }}>
              {icon}
            </button>
          ))}
          {onClose && (
            <button title="Close" onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '3px 5px', display: 'flex', borderRadius: 4, marginLeft: 3 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f88'; e.currentTarget.style.background = 'rgba(255,80,80,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'none'; }}>
              <FiX size={12} />
            </button>
          )}
        </div>
      )}

      {/* ── section label when no header ─────────────── */}
      {hideHeader && (
        <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{SECTION_LABEL}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { title: 'New File', icon: <FiPlus size={12} />, action: () => setDialog({ mode: 'create-file' }) },
              { title: 'New Folder', icon: <FiFolderPlus size={12} />, action: () => setDialog({ mode: 'create-folder' }) },
              { title: 'Import', icon: <FiUpload size={11} />, action: () => uploadRef.current?.click() },
            ].map(({ title, icon, action }) => (
              <button key={title} title={title} onClick={action}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 3, display: 'flex', borderRadius: 3, transition: 'color 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#bbb'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── tree ─────────────────────────────────────── */}
      <div className="fp-tree" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '2px 0 4px' }}>
        <ControlledTreeEnvironment
          items={treeItems as Record<TreeItemIndex, TreeItem<ItemData>>}
          getItemTitle={item => {
            if (item.data.kind === 'file') return item.data.file.name;
            if (item.data.kind === 'folder') return item.data.name;
            return 'root';
          }}
          viewState={{
            'file-tree': {
              expandedItems,
              selectedItems,
              focusedItem: activeFileId ? `file:${activeFileId}` : undefined,
            },
          }}
          canDragAndDrop
          canDropOnFolder
          canDropOnNonFolder={false}
          canReorderItems
          canDrag={items => items.every(i => i.data.kind === 'file')}
          onExpandItem={item => setExpandedItems(prev => [...prev, item.index])}
          onCollapseItem={item => setExpandedItems(prev => prev.filter(i => i !== item.index))}
          onSelectItems={items => setSelectedItems(items)}
          onDrop={handleDrop}
          onPrimaryAction={item => {
            if (item.data.kind === 'file') {
              const { file } = item.data;
              setActiveFile(file.id);
              if (file.type !== 'image') {
                openFileInGLPanel(file.id, file.name);
              }
            }
          }}
          onRenameItem={(item, name) => {
            if (item.data.kind === 'file') {
              const file = item.data.file;
              const newId = fileIdFor(name, file.folder);
              removeFile(file.id); addFile({ ...file, id: newId, name });
              setActiveFile(newId); showNotification(`Renamed to ${name}`);
            } else if (item.data.kind === 'folder') {
              renameFolder(item.data.name, name); showNotification(`Renamed to "${name}"`);
            }
          }}
          /* ── custom renderers ───────────────────────── */
          renderItemArrow={({ item, context }) => {
            if (!item.isFolder || item.data.kind === 'root') return null;
            return (
              <span {...context.arrowProps} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, flexShrink: 0, color: '#666', transition: 'transform 0.15s', transform: context.isExpanded ? 'rotate(90deg)' : 'none', pointerEvents: 'none' }}>
                <FiChevronRight size={11} />
              </span>
            );
          }}
          renderItem={({ item, depth, children, title, arrow, context }) => {
            if (item.data.kind === 'root') return <div>{children}</div>;

            const isFile = item.data.kind === 'file';
            const isFolder = item.data.kind === 'folder';
            const file = isFile ? item.data.file : null;
            const folderName = isFolder ? item.data.name : null;
            const isActive = isFile && activeFileId === file?.id;
            const isUnsaved = isFile && file ? unsavedFileIds.includes(file.id) : false;
            const isDragOver = context.isDraggingOver;
            const isSelected = context.isSelected;

            const bgColor = isActive
              ? T.rowActive
              : isDragOver
              ? T.rowDragOver
              : isSelected
              ? 'rgba(255,255,255,0.06)'
              : T.row;

            const borderColor = isActive ? T.accent : isDragOver ? T.accent + '88' : 'transparent';

            return (
              <li {...context.itemContainerWithChildrenProps} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {/* The key fix: spread interactiveElementProps (drag handlers) on the actual row */}
                <div
                  {...context.itemContainerWithoutChildrenProps}
                  {...context.interactiveElementProps}
                  data-file-item={isFile ? 'true' : undefined}
                  data-folder-item={isFolder ? 'true' : undefined}
                  className="fp-row"
                  onContextMenu={e => {
                    e.preventDefault(); e.stopPropagation();
                    if (file) handleFileCtx(e, file);
                    else if (folderName) handleFolderCtx(e, folderName);
                  }}
                  onDoubleClick={e => {
                    e.preventDefault();
                    if (file) setDialog({ mode: 'rename-file', file });
                    else if (folderName) setDialog({ mode: 'rename-folder', folderName });
                  }}
                  style={{
                    paddingLeft: 6 + depth * 14,
                    background: bgColor,
                    borderWidth: '1px 1px 1px 2px',
                    borderStyle: 'solid',
                    borderColor: `transparent transparent transparent ${borderColor}`,
                    color: isActive ? T.accent : isFolder ? T.textFolder : T.text,
                    transition: 'background 0.08s',
                    ...(isDragOver ? { outline: `1px dashed ${T.accent}66`, outlineOffset: -1, borderRadius: 3, borderColor: `${T.accent}55 ${T.accent}55 ${T.accent}55 ${T.accent}` } : {}),
                  }}
                >
                  <div className="fp-row-inner">
                    {/* arrow for folders */}
                    {isFolder ? arrow : <span style={{ width: 16, flexShrink: 0 }} />}

                    {/* icon */}
                    {isFolder
                      ? <FolderIcon open={context.isExpanded} color={isDragOver ? T.accent : isActive ? T.accent : '#c09040'} />
                      : file
                      ? <FileIcon name={file.name} />
                      : null
                    }

                    {/* name */}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: isActive ? 500 : 400 }}>
                      {title}
                    </span>
                  </div>

                  {/* right-side actions */}
                  <div className="fp-row-actions" onClick={e => e.stopPropagation()}>
                    {isUnsaved && <span className="fp-unsaved" title="Unsaved changes" />}

                    {isFolder && (
                      <>
                        <span style={{ fontSize: 10, color: '#444', marginRight: 2 }}>
                          {files.filter(f => f.folder === folderName).length}
                        </span>
                        <button
                          className="fp-action-btn"
                          title="New file in folder"
                          onClick={() => setDialog({ mode: 'create-file', targetFolder: folderName! })}>
                          <FiPlus size={11} />
                        </button>
                      </>
                    )}

                    {isFile && file && (
                      <button
                        className="fp-action-btn danger"
                        title="Delete file"
                        onClick={() => setDialog({ mode: 'delete-file', file })}>
                        <FiX size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* nested children */}
                {children}
              </li>
            );
          }}
          renderItemsContainer={({ children, containerProps }) => (
            <ul {...containerProps} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {children}
            </ul>
          )}
          renderTreeContainer={({ children, containerProps }) => (
            <div {...containerProps} style={{ outline: 'none' }}>
              {children}
            </div>
          )}
          renderDragBetweenLine={({ lineProps }) => (
            <div {...lineProps} className="fp-drag-line" />
          )}
        >
          <Tree treeId="file-tree" rootItem="root" treeLabel="Project Files" />
        </ControlledTreeEnvironment>
      </div>

      {/* ── drop zone ─────────────────────────────────── */}
      <div
        onClick={() => uploadRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropZoneOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropZoneOver(false); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setDropZoneOver(false); handleDropItems(e.dataTransfer.items); }}
        style={{
          margin: '6px 8px 8px', padding: '10px 8px', borderRadius: 6,
          border: `1px dashed ${dropZoneOver ? T.accent : 'rgba(255,255,255,0.1)'}`,
          background: dropZoneOver ? 'rgba(229,164,90,0.06)' : 'transparent',
          textAlign: 'center', cursor: 'pointer', fontSize: 11, color: dropZoneOver ? T.accent : '#555',
          transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={e => { if (!dropZoneOver) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
        onMouseLeave={e => { if (!dropZoneOver) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
      >
        <FiUpload size={13} style={{ display: 'block', margin: '0 auto 4px', opacity: dropZoneOver ? 0.9 : 0.4 }} />
        <span>Drop files or click to import</span>
        <div style={{ fontSize: 10, marginTop: 2, opacity: 0.5 }}>html · css · js · images</div>
      </div>

      {/* ── hidden inputs ─────────────────────────────── */}
      <input id="global-file-upload" ref={uploadRef} type="file" multiple style={{ display: 'none' }}
        onChange={e => handleUpload(e.target.files)}
        accept="image/*,.html,.css,.js,.ts,.tsx,.jsx,.json,.txt,.md,.svg" />
      <input ref={folderInputRef} type="file" {...({ webkitdirectory: 'true', directory: 'true' } as any)} multiple style={{ display: 'none' }}
        onChange={handleFolderSelect} />

      {dialog && (
        <FileDialog dialog={dialog} files={files} folders={allFolderNames}
          onConfirm={handleDialogConfirm} onCancel={() => setDialog(null)} />
      )}
      {ctxEl}
    </div>
  );
};

export default FilePanel;
