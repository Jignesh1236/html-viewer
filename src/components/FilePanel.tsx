import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useEditorStore, FileItem } from '../store/editorStore';
import { FiPlus, FiUpload, FiX, FiCheck, FiTrash2, FiAlertTriangle, FiFolder, FiFolderPlus, FiChevronRight, FiChevronDown, FiEdit2 } from 'react-icons/fi';
import { useContextMenu } from './ContextMenu';

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

const FileIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 14 }) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const entry = DEVICON_MAP[ext];
  if (entry) return <i className={entry.icon} style={{ fontSize: size, color: entry.color, flexShrink: 0, lineHeight: 1 }} />;
  return <span style={{ fontSize: size - 1, color: '#888', flexShrink: 0, lineHeight: 1, fontFamily: 'monospace' }}>•</span>;
};

type DialogMode = 'create-file' | 'create-folder' | 'rename-file' | 'rename-folder' | 'delete-file' | 'delete-folder';
interface DialogState {
  mode: DialogMode;
  file?: FileItem;
  folderName?: string;
  targetFolder?: string;
}

const C = {
  bg: '#1e1e1e', surface: '#252526', surface2: '#2d2d2d',
  border: '#3e3e3e', accent: '#e5a45a', text: '#ccc', muted: '#888',
};

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
    if (dialog.mode === 'rename-file') setValue(dialog.file?.name ?? '');
    else if (dialog.mode === 'rename-folder') setValue(dialog.folderName ?? '');
    else setValue('');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [dialog]);

  const validate = (v: string) => {
    if (!v.trim()) return 'Name cannot be empty';
    if (dialog.mode === 'create-file') {
      if (files.find(f => f.name === v.trim() && f.folder === dialog.targetFolder)) return `"${v}" already exists`;
      if (!/^[\w\-. ]+$/.test(v.trim())) return 'Invalid characters';
    }
    if (dialog.mode === 'create-folder') {
      if (folders.includes(v.trim())) return `Folder "${v}" already exists`;
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

  const title =
    dialog.mode === 'create-file' ? 'New File' :
    dialog.mode === 'create-folder' ? 'New Folder' :
    dialog.mode === 'rename-file' ? 'Rename File' :
    dialog.mode === 'rename-folder' ? 'Rename Folder' :
    dialog.mode === 'delete-file' ? `Delete "${dialog.file?.name}"?` :
    `Delete folder "${dialog.folderName}"?`;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ background: '#252526', border: `1px solid ${isDelete ? 'rgba(248,68,68,0.4)' : '#3e3e3e'}`, borderRadius: 8, padding: '18px 20px 16px', width: 280, boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {isDelete ? <FiAlertTriangle size={15} color="#f84" /> : isFolder ? <FiFolderPlus size={15} color={C.accent} /> : <FiPlus size={15} color={C.accent} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0', flex: 1 }}>{title}</span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', padding: 2, borderRadius: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')} onMouseLeave={e => (e.currentTarget.style.color = '#666')}>
            <FiX size={13} />
          </button>
        </div>

        {!isDelete && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {dialog.mode === 'create-file' ? 'File name' : dialog.mode === 'create-folder' ? 'Folder name' : 'New name'}
            </div>
            <input ref={inputRef} value={value} onChange={e => { setValue(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onCancel(); }}
              placeholder={dialog.mode === 'create-file' ? 'e.g. about.html, extra.css' : dialog.mode === 'create-folder' ? 'e.g. images, styles' : ''}
              style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a1a', border: `1px solid ${error ? 'rgba(248,68,68,0.6)' : '#444'}`, borderRadius: 5, padding: '7px 10px', fontSize: 12.5, color: '#e0e0e0', outline: 'none', fontFamily: 'monospace', transition: 'border-color 0.15s' }}
              onFocus={e => { if (!error) e.currentTarget.style.borderColor = '#e5a45a66'; }}
              onBlur={e => { if (!error) e.currentTarget.style.borderColor = '#444'; }}
            />
            {error && <div style={{ fontSize: 10.5, color: '#f87171', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><FiAlertTriangle size={10} /> {error}</div>}
            {!error && dialog.mode === 'create-file' && <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Extension determines file type (.html, .css, .js)</div>}
          </div>
        )}
        {isDelete && <div style={{ fontSize: 11.5, color: '#aaa', marginBottom: 14, lineHeight: 1.5 }}>
          {dialog.mode === 'delete-folder' ? 'Files inside will be moved to root. This cannot be undone.' : 'This action cannot be undone.'}
        </div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '6px 14px', borderRadius: 5, border: '1px solid #3e3e3e', background: 'none', cursor: 'pointer', color: '#888', fontSize: 12, fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#ccc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888'; }}>
            Cancel
          </button>
          <button onClick={handleConfirm} style={{ padding: '6px 14px', borderRadius: 5, border: 'none', background: isDelete ? 'rgba(239,68,68,0.15)' : 'rgba(229,164,90,0.15)', cursor: 'pointer', color: isDelete ? '#f87171' : C.accent, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', outline: `1px solid ${isDelete ? 'rgba(239,68,68,0.3)' : 'rgba(229,164,90,0.3)'}` }}
            onMouseEnter={e => { e.currentTarget.style.background = isDelete ? 'rgba(239,68,68,0.25)' : 'rgba(229,164,90,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDelete ? 'rgba(239,68,68,0.15)' : 'rgba(229,164,90,0.15)'; }}>
            {isDelete ? <><FiTrash2 size={11} /> Delete</> : <><FiCheck size={11} /> {dialog.mode === 'create-file' || dialog.mode === 'create-folder' ? 'Create' : 'Rename'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const ITEM_STYLE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px',
  cursor: 'pointer', fontSize: 12.5, userSelect: 'none', transition: 'background 0.1s',
  borderLeft: '2px solid transparent',
};

const FilePanel: React.FC<{ onClose?: () => void; hideHeader?: boolean }> = ({ onClose, hideHeader }) => {
  const {
    files, folders, activeFileId, setActiveFile, addFile, removeFile,
    addFolder, removeFolder, renameFolder, moveFileToFolder,
    updateFileContent, showNotification, pendingFileDialog, setPendingFileDialog,
  } = useEditorStore();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const draggingFileIdRef = useRef<string | null>(null);
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

  const toggleFolder = (name: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const importSingleFile = useCallback((file: File, targetFolder?: string) => {
    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '');
    const isText = ['html', 'css', 'js', 'ts', 'tsx', 'jsx', 'json', 'txt', 'md'].includes(ext || '');
    const fileId = targetFolder ? `${targetFolder}/${name}` : name;
    if (isImage) {
      addFile({ id: fileId, name, type: 'image', content: '', url: URL.createObjectURL(file), mimeType: file.type, folder: targetFolder });
    } else if (isText) {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        const type = ext === 'html' ? 'html' : ext === 'css' ? 'css' : (ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'jsx') ? 'js' : 'other';
        addFile({ id: fileId, name, type, content, folder: targetFolder });
      };
      reader.readAsText(file);
    } else {
      addFile({ id: fileId, name, type: 'other', content: '', url: URL.createObjectURL(file), mimeType: file.type, folder: targetFolder });
    }
  }, [addFile]);

  const readDirectoryEntry = useCallback((entry: FileSystemDirectoryEntry, parentFolder?: string) => {
    const folderName = parentFolder ? `${parentFolder}/${entry.name}` : entry.name;
    addFolder(folderName);
    const reader = entry.createReader();
    const readAll = (accumulated: FileSystemEntry[] = []) => {
      reader.readEntries(entries => {
        if (entries.length === 0) {
          accumulated.forEach(e => {
            if (e.isFile) {
              (e as FileSystemFileEntry).file(f => importSingleFile(f, folderName));
            } else if (e.isDirectory) {
              readDirectoryEntry(e as FileSystemDirectoryEntry, folderName);
            }
          });
          return;
        }
        readAll([...accumulated, ...entries]);
      });
    };
    readAll();
  }, [addFolder, importSingleFile]);

  const handleDropItems = useCallback((items: DataTransferItemList, targetFolder?: string) => {
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry?.();
      if (!entry) continue;
      count++;
      if (entry.isDirectory) {
        readDirectoryEntry(entry as FileSystemDirectoryEntry, targetFolder);
      } else if (entry.isFile) {
        (entry as FileSystemFileEntry).file(f => importSingleFile(f, targetFolder));
      }
    }
    if (count > 0) showNotification(`Importing ${count} item(s)…`);
  }, [readDirectoryEntry, importSingleFile, showNotification]);

  const handleUpload = useCallback((uploadedFiles: FileList | null, targetFolder?: string) => {
    if (!uploadedFiles) return;
    Array.from(uploadedFiles).forEach(file => importSingleFile(file, targetFolder));
    if (uploadedFiles.length > 0) showNotification(`Imported ${uploadedFiles.length} file(s)`);
  }, [importSingleFile, showNotification]);

  const handleDialogConfirm = useCallback((value: string) => {
    if (!dialog) return;

    if (dialog.mode === 'create-file') {
      const name = value;
      const folder = dialog.targetFolder;
      const fileId = folder ? `${folder}/${name}` : name;
      if (files.find(f => f.id === fileId)) { showNotification(`"${name}" already exists`); return; }
      const ext = name.split('.').pop()?.toLowerCase();
      const type = ext === 'html' ? 'html' : ext === 'css' ? 'css' : (ext === 'js' || ext === 'ts') ? 'js' : 'other';
      const starter = type === 'html' ? `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>New Page</title>\n</head>\n<body>\n\n</body>\n</html>` :
        type === 'css' ? `/* ${name} */\n` : type === 'js' ? `// ${name}\n` : '';
      addFile({ id: fileId, name, type, content: starter, folder });
      setActiveFile(fileId);
      showNotification(`Created ${name}`);
    }

    if (dialog.mode === 'create-folder') {
      addFolder(value);
      setCollapsedFolders(prev => { const n = new Set(prev); n.delete(value); return n; });
      showNotification(`Created folder "${value}"`);
    }

    if (dialog.mode === 'rename-file' && dialog.file) {
      const newName = value;
      if (newName === dialog.file.name) { setDialog(null); return; }
      const newId = dialog.file.folder ? `${dialog.file.folder}/${newName}` : newName;
      removeFile(dialog.file.id);
      addFile({ ...dialog.file, id: newId, name: newName });
      setActiveFile(newId);
      showNotification(`Renamed to ${newName}`);
    }

    if (dialog.mode === 'rename-folder' && dialog.folderName) {
      const newName = value;
      if (newName === dialog.folderName) { setDialog(null); return; }
      renameFolder(dialog.folderName, newName);
      showNotification(`Renamed folder to "${newName}"`);
    }

    if (dialog.mode === 'delete-file' && dialog.file) {
      removeFile(dialog.file.id);
      showNotification(`Deleted ${dialog.file.name}`);
    }

    if (dialog.mode === 'delete-folder' && dialog.folderName) {
      removeFolder(dialog.folderName);
      showNotification(`Deleted folder "${dialog.folderName}"`);
    }

    setDialog(null);
  }, [dialog, files, folders, addFile, removeFile, addFolder, removeFolder, renameFolder, setActiveFile, showNotification]);

  const handleFileCtx = (e: React.MouseEvent, file: FileItem) => {
    const moveItems = folders.length > 0 ? [
      { separator: true, label: '' },
      ...folders.filter(f => f !== file.folder).map(folderName => ({
        label: `Move to 📁 ${folderName}`,
        action: () => moveFileToFolder(file.id, folderName),
      })),
      ...(file.folder ? [{ label: 'Move to Root', action: () => moveFileToFolder(file.id, undefined) }] : []),
    ] : [];

    showCtx(e, [
      { label: 'Open', icon: '📂', action: () => { if (file.type !== 'image') setActiveFile(file.id); } },
      { separator: true, label: '' },
      { label: 'Rename', icon: '✏️', action: () => setDialog({ mode: 'rename-file', file }) },
      { label: 'Duplicate', icon: '📋', action: () => {
        const parts = file.name.split('.');
        const newName = parts.length > 1 ? `${parts.slice(0,-1).join('.')}_copy.${parts[parts.length-1]}` : `${file.name}_copy`;
        const newId = file.folder ? `${file.folder}/${newName}` : newName;
        addFile({ ...file, id: newId, name: newName });
        showNotification(`Duplicated as ${newName}`);
      }},
      ...moveItems,
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
    // Keep native context menu inside editable controls (copy/paste, spellcheck, etc.)
    if ((e.target as Element).closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    e.stopPropagation();
    if ((e.target as Element).closest('[data-file-item], [data-folder-item], button, input')) return;
    showCtx(e, [
      { label: 'New File', icon: '📄', action: () => setDialog({ mode: 'create-file' }) },
      { label: 'New Folder', icon: '📁', action: () => setDialog({ mode: 'create-folder' }) },
      { label: 'Import Files…', icon: '⬆️', action: () => uploadRef.current?.click() },
      { separator: true, label: '' },
      { label: 'Close Explorer', icon: '✕', action: onClose },
    ]);
  };

  const rootFiles = files.filter(f => !f.folder);
  const allFolderNames = Array.from(new Set([...folders, ...files.filter(f => f.folder).map(f => f.folder!)]));

  const renderFileRow = (file: FileItem, indent = 0) => {
    const isActive = activeFileId === file.id;
    return (
      <div
        key={file.id}
        data-file-item="true"
        draggable
        onDragStart={e => { draggingFileIdRef.current = file.id; e.dataTransfer.setData('text/plain', file.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { draggingFileIdRef.current = null; }}
        onClick={() => file.type !== 'image' && setActiveFile(file.id)}
        onDoubleClick={() => setDialog({ mode: 'rename-file', file })}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); handleFileCtx(e, file); }}
        style={{
          ...ITEM_STYLE,
          paddingLeft: 10 + indent * 12,
          background: isActive ? 'rgba(229,164,90,0.1)' : 'transparent',
          borderLeft: `2px solid ${isActive ? C.accent : 'transparent'}`,
          color: isActive ? C.accent : C.text,
        }}
        onMouseEnter={e => {
          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
          const btn = (e.currentTarget as HTMLDivElement).querySelector<HTMLButtonElement>('[data-del-btn]');
          if (btn) btn.style.opacity = '1';
        }}
        onMouseLeave={e => {
          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          const btn = (e.currentTarget as HTMLDivElement).querySelector<HTMLButtonElement>('[data-del-btn]');
          if (btn) btn.style.opacity = '0';
        }}
      >
        <FileIcon name={file.name} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>
          {file.name}
        </span>
        <button data-del-btn title={`Delete ${file.name}`} onClick={e => { e.stopPropagation(); setDialog({ mode: 'delete-file', file }); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 2, display: 'flex', borderRadius: 2, opacity: 0, flexShrink: 0, transition: 'opacity 0.12s, color 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f88'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}>
          <FiX size={11} />
        </button>
      </div>
    );
  };

  const renderFolder = (folderName: string) => {
    const folderFiles = files.filter(f => f.folder === folderName);
    const collapsed = collapsedFolders.has(folderName);
    const isDragOver = draggingOver === folderName;
    return (
      <div key={folderName} data-folder-item="true">
        <div
          onContextMenu={e => handleFolderCtx(e, folderName)}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDraggingOver(folderName); }}
          onDragLeave={e => { if (!(e.currentTarget as HTMLDivElement).contains(e.relatedTarget as Node)) setDraggingOver(null); }}
          onDrop={e => {
            e.preventDefault(); e.stopPropagation(); setDraggingOver(null);
            if (draggingFileIdRef.current) {
              moveFileToFolder(draggingFileIdRef.current, folderName);
              draggingFileIdRef.current = null;
            } else {
              handleDropItems(e.dataTransfer.items, folderName);
            }
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px 4px 10px',
            cursor: 'pointer', userSelect: 'none', fontSize: 12.5,
            background: isDragOver ? 'rgba(229,164,90,0.1)' : 'transparent',
            border: isDragOver ? '1px dashed rgba(229,164,90,0.5)' : '1px solid transparent',
            borderRadius: 3, color: '#bbb', transition: 'background 0.1s',
          }}
          onClick={() => toggleFolder(folderName)}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isDragOver ? 'rgba(229,164,90,0.1)' : 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isDragOver ? 'rgba(229,164,90,0.1)' : 'transparent'; }}
        >
          <span style={{ color: '#666', display: 'flex', flexShrink: 0 }}>
            {collapsed ? <FiChevronRight size={11} /> : <FiChevronDown size={11} />}
          </span>
          <FiFolder size={13} color={isDragOver ? C.accent : '#c09040'} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folderName}</span>
          <span style={{ fontSize: 10, color: '#555' }}>{folderFiles.length}</span>
          <button onClick={e => { e.stopPropagation(); setDialog({ mode: 'create-file', targetFolder: folderName }); }}
            title="New file in folder"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 2, display: 'flex', borderRadius: 2, opacity: 0, flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.opacity = ''; }}
            className="folder-add-btn">
            <FiPlus size={11} />
          </button>
        </div>
        {!collapsed && folderFiles.map(f => renderFileRow(f, 1))}
        {!collapsed && folderFiles.length === 0 && (
          <div style={{ paddingLeft: 28, fontSize: 11, color: '#444', padding: '3px 0 3px 28px', fontStyle: 'italic' }}>
            Empty — drop files here
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}
      onContextMenu={handlePanelCtx}>

      {!hideHeader && (
        <div style={{ height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted, flex: 1 }}>Explorer</span>
          <button title="New File" onClick={() => setDialog({ mode: 'create-file' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'flex', borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'none'; }}>
            <FiPlus size={14} />
          </button>
          <button title="New Folder" onClick={() => setDialog({ mode: 'create-folder' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'flex', borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'none'; }}>
            <FiFolderPlus size={14} />
          </button>
          <button title="Import Files" onClick={() => uploadRef.current?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'flex', borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'none'; }}>
            <FiUpload size={14} />
          </button>
          {onClose && (
            <button title="Close" onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'flex', borderRadius: 3 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f88'; e.currentTarget.style.background = 'rgba(255,80,80,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'none'; }}>
              <FiX size={12} />
            </button>
          )}
        </div>
      )}

      <div style={{ padding: '5px 12px 2px', fontSize: 10, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Project Files
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation();
          if (draggingFileIdRef.current) {
            moveFileToFolder(draggingFileIdRef.current, undefined);
            draggingFileIdRef.current = null;
          } else {
            handleDropItems(e.dataTransfer.items);
          }
        }}>

        {allFolderNames.map(folderName => renderFolder(folderName))}

        {rootFiles.map(f => renderFileRow(f, 0))}
      </div>

      <div onClick={() => uploadRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDraggingOver('__dropzone__'); }}
        onDragLeave={e => { if (e.currentTarget === e.target || !(e.currentTarget as HTMLDivElement).contains(e.relatedTarget as Node)) setDraggingOver(null); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setDraggingOver(null); handleDropItems(e.dataTransfer.items); }}
        style={{
          margin: 8, padding: '10px', borderRadius: 5,
          border: `1px dashed ${draggingOver === '__dropzone__' ? C.accent : '#3e3e3e'}`,
          background: draggingOver === '__dropzone__' ? 'rgba(229,164,90,0.06)' : 'transparent',
          textAlign: 'center', cursor: 'pointer', fontSize: 11, color: '#666', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (draggingOver !== '__dropzone__') (e.currentTarget as HTMLDivElement).style.borderColor = '#555'; }}
        onMouseLeave={e => { if (draggingOver !== '__dropzone__') (e.currentTarget as HTMLDivElement).style.borderColor = '#3e3e3e'; }}>
        <FiUpload size={14} style={{ display: 'block', margin: '0 auto 4px', opacity: 0.5 }} />
        Drop files or click to import
        <div style={{ fontSize: 10, marginTop: 2, opacity: 0.5 }}>images, css, js, html, and more</div>
      </div>

      <input id="global-file-upload" ref={uploadRef} type="file" multiple style={{ display: 'none' }}
        onChange={e => handleUpload(e.target.files)}
        accept="image/*,.html,.css,.js,.ts,.tsx,.jsx,.json,.txt,.md,.svg" />

      {dialog && (
        <FileDialog dialog={dialog} files={files} folders={allFolderNames}
          onConfirm={handleDialogConfirm} onCancel={() => setDialog(null)} />
      )}
      {ctxEl}
    </div>
  );
};

export default FilePanel;
