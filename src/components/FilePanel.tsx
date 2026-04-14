import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useEditorStore, FileItem } from '../store/editorStore';
import { FiPlus, FiUpload, FiX, FiCheck, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { useContextMenu } from './ContextMenu';

/* ── Devicon file icons ── */
const DEVICON_MAP: Record<string, { icon: string; color: string }> = {
  html:       { icon: 'devicon-html5-plain',          color: '#e34c26' },
  css:        { icon: 'devicon-css3-plain',            color: '#264de4' },
  js:         { icon: 'devicon-javascript-plain',      color: '#f7df1e' },
  ts:         { icon: 'devicon-typescript-plain',      color: '#3178c6' },
  tsx:        { icon: 'devicon-react-original',        color: '#61dafb' },
  jsx:        { icon: 'devicon-react-original',        color: '#61dafb' },
  json:       { icon: 'devicon-json-plain',            color: '#f8c555' },
  md:         { icon: 'devicon-markdown-original',     color: '#aaa' },
  svg:        { icon: 'devicon-svg-plain',             color: '#ffb13b' },
  png:        { icon: 'devicon-photoshop-plain',       color: '#31a8ff' },
  jpg:        { icon: 'devicon-photoshop-plain',       color: '#31a8ff' },
  jpeg:       { icon: 'devicon-photoshop-plain',       color: '#31a8ff' },
  gif:        { icon: 'devicon-photoshop-plain',       color: '#31a8ff' },
  webp:       { icon: 'devicon-photoshop-plain',       color: '#31a8ff' },
  ico:        { icon: 'devicon-photoshop-plain',       color: '#31a8ff' },
  py:         { icon: 'devicon-python-plain',          color: '#3776ab' },
  php:        { icon: 'devicon-php-plain',             color: '#8892bf' },
  sass:       { icon: 'devicon-sass-original',         color: '#cc6699' },
  scss:       { icon: 'devicon-sass-original',         color: '#cc6699' },
  vue:        { icon: 'devicon-vuejs-plain',           color: '#42b883' },
};

const FileIcon: React.FC<{ name: string }> = ({ name }) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const entry = DEVICON_MAP[ext];
  if (entry) {
    return (
      <i
        className={entry.icon}
        style={{ fontSize: 14, color: entry.color, flexShrink: 0, lineHeight: 1 }}
      />
    );
  }
  return (
    <span style={{ fontSize: 13, color: '#888', flexShrink: 0, lineHeight: 1, fontFamily: 'monospace' }}>
      {}
    </span>
  );
};

/* ── Inline File Dialog ── */
interface DialogState {
  mode: 'create' | 'rename' | 'delete';
  file?: FileItem;
}

const FileDialog: React.FC<{
  dialog: DialogState;
  files: FileItem[];
  onConfirm: (value: string) => void;
  onCancel: () => void;
}> = ({ dialog, files, onConfirm, onCancel }) => {
  const [value, setValue] = useState(dialog.file?.name ?? '');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(dialog.mode === 'rename' ? (dialog.file?.name ?? '') : '');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [dialog]);

  const validate = (v: string) => {
    if (!v.trim()) return 'Name cannot be empty';
    if (dialog.mode === 'create' && files.find(f => f.name === v.trim())) return `"${v}" already exists`;
    if (dialog.mode === 'rename' && v.trim() !== dialog.file?.name && files.find(f => f.name === v.trim())) return `"${v}" already exists`;
    if (!/^[\w\-. ]+$/.test(v.trim())) return 'Invalid characters in filename';
    return '';
  };

  const handleConfirm = () => {
    if (dialog.mode === 'delete') { onConfirm(''); return; }
    const err = validate(value);
    if (err) { setError(err); return; }
    onConfirm(value.trim());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  const isDelete = dialog.mode === 'delete';

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: '#252526',
        border: `1px solid ${isDelete ? 'rgba(248,68,68,0.4)' : '#3e3e3e'}`,
        borderRadius: 8,
        padding: '18px 20px 16px',
        width: 280,
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {isDelete
            ? <FiAlertTriangle size={15} style={{ color: '#f84', flexShrink: 0 }} />
            : <FiPlus size={15} style={{ color: '#e5a45a', flexShrink: 0 }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>
            {dialog.mode === 'create' ? 'New File' : dialog.mode === 'rename' ? 'Rename File' : `Delete "${dialog.file?.name}"?`}
          </span>
          <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', padding: 2, borderRadius: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')} onMouseLeave={e => (e.currentTarget.style.color = '#666')}>
            <FiX size={13} />
          </button>
        </div>

        {/* Input */}
        {!isDelete && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {dialog.mode === 'create' ? 'File name' : 'New name'}
            </div>
            <input
              ref={inputRef}
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              placeholder={dialog.mode === 'create' ? 'e.g. about.html, extra.css' : dialog.file?.name}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1a1a1a',
                border: `1px solid ${error ? 'rgba(248,68,68,0.6)' : '#444'}`,
                borderRadius: 5, padding: '7px 10px',
                fontSize: 12.5, color: '#e0e0e0', outline: 'none',
                fontFamily: 'monospace',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { if (!error) e.currentTarget.style.borderColor = '#e5a45a66'; }}
              onBlur={e => { if (!error) e.currentTarget.style.borderColor = '#444'; }}
            />
            {error && (
              <div style={{ fontSize: 10.5, color: '#f87171', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiAlertTriangle size={10} /> {error}
              </div>
            )}
            {!error && dialog.mode === 'create' && (
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                Extension determines file type (.html, .css, .js)
              </div>
            )}
          </div>
        )}

        {isDelete && (
          <div style={{ fontSize: 11.5, color: '#aaa', marginBottom: 14, lineHeight: 1.5 }}>
            This action cannot be undone.
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 14px', borderRadius: 5, border: '1px solid #3e3e3e',
              background: 'none', cursor: 'pointer', color: '#888', fontSize: 12,
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#ccc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '6px 14px', borderRadius: 5, border: 'none',
              background: isDelete ? 'rgba(239,68,68,0.15)' : 'rgba(229,164,90,0.15)',
              cursor: 'pointer',
              color: isDelete ? '#f87171' : '#e5a45a',
              fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'inherit',
              outline: `1px solid ${isDelete ? 'rgba(239,68,68,0.3)' : 'rgba(229,164,90,0.3)'}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDelete ? 'rgba(239,68,68,0.25)' : 'rgba(229,164,90,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDelete ? 'rgba(239,68,68,0.15)' : 'rgba(229,164,90,0.15)'; }}
          >
            {isDelete ? <><FiTrash2 size={11} /> Delete</> : <><FiCheck size={11} /> {dialog.mode === 'create' ? 'Create' : 'Rename'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main FilePanel ── */
const FilePanel: React.FC<{ onClose?: () => void; hideHeader?: boolean }> = ({ onClose, hideHeader }) => {
  const {
    files, activeFileId, setActiveFile, addFile, removeFile,
    updateFileContent, showNotification, pendingFileDialog, setPendingFileDialog,
  } = useEditorStore();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const { show: showCtx, element: ctxEl } = useContextMenu();

  /* Watch store-triggered dialog (from MenuBar) */
  useEffect(() => {
    if (!pendingFileDialog) return;
    if (pendingFileDialog.type === 'create') {
      setDialog({ mode: 'create' });
    } else if (pendingFileDialog.type === 'rename' && pendingFileDialog.fileId) {
      const file = files.find(f => f.id === pendingFileDialog.fileId);
      if (file) setDialog({ mode: 'rename', file });
    }
    setPendingFileDialog(null);
  }, [pendingFileDialog, files, setPendingFileDialog]);

  /* ── Upload handler ── */
  const handleUpload = (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;
    Array.from(uploadedFiles).forEach(file => {
      const name = file.name;
      const ext = name.split('.').pop()?.toLowerCase();
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '');
      const isText = ['html', 'css', 'js', 'json', 'txt', 'md'].includes(ext || '');
      if (isImage) {
        addFile({ id: name, name, type: 'image', content: '', url: URL.createObjectURL(file), mimeType: file.type });
        showNotification(`Uploaded ${name}`);
      } else if (isText) {
        const reader = new FileReader();
        reader.onload = e => {
          const content = e.target?.result as string;
          const type = ext === 'html' ? 'html' : ext === 'css' ? 'css' : ext === 'js' ? 'js' : 'other';
          addFile({ id: name, name, type, content });
          showNotification(`Uploaded ${name}`);
        };
        reader.readAsText(file);
      } else {
        addFile({ id: name, name, type: 'other', content: '', url: URL.createObjectURL(file), mimeType: file.type });
        showNotification(`Uploaded ${name}`);
      }
    });
  };

  /* ── Dialog confirm handler ── */
  const handleDialogConfirm = useCallback((value: string) => {
    if (!dialog) return;

    if (dialog.mode === 'create') {
      const name = value;
      if (files.find(f => f.id === name)) { showNotification(`"${name}" already exists`); return; }
      const ext = name.split('.').pop()?.toLowerCase();
      const type = ext === 'html' ? 'html' : ext === 'css' ? 'css' : ext === 'js' ? 'js' : 'other';
      const starter = type === 'html'
        ? `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>New Page</title>\n</head>\n<body>\n\n</body>\n</html>`
        : type === 'css' ? `/* ${name} */\n` : type === 'js' ? `// ${name}\n` : '';
      addFile({ id: name, name, type, content: starter });
      setActiveFile(name);
      showNotification(`Created ${name}`);
    }

    if (dialog.mode === 'rename' && dialog.file) {
      const newName = value;
      if (newName === dialog.file.name) { setDialog(null); return; }
      removeFile(dialog.file.id);
      addFile({ ...dialog.file, id: newName, name: newName });
      setActiveFile(newName);
      showNotification(`Renamed to ${newName}`);
    }

    if (dialog.mode === 'delete' && dialog.file) {
      removeFile(dialog.file.id);
      showNotification(`Deleted ${dialog.file.name}`);
    }

    setDialog(null);
  }, [dialog, files, addFile, removeFile, setActiveFile, showNotification]);

  /* ── Context menus ── */
  const handleFileContextMenu = (e: React.MouseEvent, file: FileItem) => {
    showCtx(e, [
      { label: 'Open', icon: '📂', action: () => { if (file.type !== 'image') setActiveFile(file.id); } },
      { separator: true, label: '' },
      { label: 'Rename', icon: '✏️', action: () => setDialog({ mode: 'rename', file }) },
      { label: 'Duplicate', icon: '📋', action: () => {
          const parts = file.name.split('.');
          const newName = parts.length > 1 ? `${parts.slice(0,-1).join('.')}_copy.${parts[parts.length-1]}` : `${file.name}_copy`;
          addFile({ ...file, id: newName, name: newName });
          showNotification(`Duplicated as ${newName}`);
        }
      },
      { separator: true, label: '' },
      { label: 'Copy Content', icon: '📄', action: () => {
          navigator.clipboard.writeText(file.content);
          showNotification('Content copied to clipboard');
        }
      },
      { separator: true, label: '' },
      { label: `Delete "${file.name}"`, icon: '🗑️', danger: true, action: () => setDialog({ mode: 'delete', file }) },
    ]);
  };

  const handlePanelContextMenu = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-file-item]')) return;
    showCtx(e, [
      { label: 'New File', icon: '📄', action: () => setDialog({ mode: 'create' }) },
      { label: 'Upload Files…', icon: '⬆️', action: () => uploadRef.current?.click() },
      { separator: true, label: '' },
      { label: 'Close Explorer', icon: '✕', action: onClose },
    ]);
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}
      onContextMenu={handlePanelContextMenu}
    >
      {/* Header */}
      {!hideHeader && (
        <div
          style={{
            height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px',
            borderBottom: '1px solid #3e3e3e', background: '#252526',
          }}
          onContextMenu={e => {
            e.stopPropagation();
            showCtx(e, [
              { label: 'New File', icon: '📄', action: () => setDialog({ mode: 'create' }) },
              { label: 'Upload Files…', icon: '⬆️', action: () => uploadRef.current?.click() },
              { separator: true, label: '' },
              { label: 'Close Explorer', icon: '✕', danger: true, action: onClose },
            ]);
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#888', flex: 1 }}>
            Explorer
          </span>
          <button
            title="New File"
            onClick={() => setDialog({ mode: 'create' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'flex', borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'none'; }}
          >
            <FiPlus size={14} />
          </button>
          <button
            title="Upload Files"
            onClick={() => uploadRef.current?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'flex', borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'none'; }}
          >
            <FiUpload size={14} />
          </button>
          {onClose && (
            <button
              title="Close Explorer"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'flex', borderRadius: 3 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f88'; e.currentTarget.style.background = 'rgba(255,80,80,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'none'; }}
            >
              <FiX size={12} />
            </button>
          )}
        </div>
      )}

      {/* Section label */}
      <div style={{ padding: '6px 12px 2px', fontSize: 10, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Project Files
      </div>

      {/* File list */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
      >
        {files.map(file => (
          <div
            key={file.id}
            data-file-item="true"
            onClick={() => file.type !== 'image' && setActiveFile(file.id)}
            onDoubleClick={() => setDialog({ mode: 'rename', file })}
            onContextMenu={e => { e.stopPropagation(); handleFileContextMenu(e, file); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px',
              cursor: file.type === 'image' ? 'default' : 'pointer',
              background: activeFileId === file.id ? 'rgba(229,164,90,0.1)' : 'transparent',
              borderLeft: `2px solid ${activeFileId === file.id ? '#e5a45a' : 'transparent'}`,
              color: activeFileId === file.id ? '#e5a45a' : '#ccc',
              fontSize: 12.5,
              userSelect: 'none',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => {
              if (activeFileId !== file.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
              const btn = (e.currentTarget as HTMLDivElement).querySelector<HTMLButtonElement>('[data-del-btn]');
              if (btn) btn.style.opacity = '1';
            }}
            onMouseLeave={e => {
              if (activeFileId !== file.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              const btn = (e.currentTarget as HTMLDivElement).querySelector<HTMLButtonElement>('[data-del-btn]');
              if (btn) btn.style.opacity = '0';
            }}
          >
            <FileIcon name={file.name} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>
              {file.name}
            </span>
            <button
              data-del-btn
              title={`Delete ${file.name}`}
              onClick={e => { e.stopPropagation(); setDialog({ mode: 'delete', file }); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#555',
                padding: 2, display: 'flex', borderRadius: 2, opacity: 0, flexShrink: 0,
                transition: 'opacity 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f88'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
            >
              <FiX size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Upload drop zone */}
      <div
        onClick={() => uploadRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
        style={{
          margin: 8, padding: '10px', borderRadius: 5,
          border: `1px dashed ${dragging ? '#e5a45a' : '#3e3e3e'}`,
          background: dragging ? 'rgba(229,164,90,0.06)' : 'transparent',
          textAlign: 'center', cursor: 'pointer', fontSize: 11, color: '#666',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!dragging) (e.currentTarget as HTMLDivElement).style.borderColor = '#555'; }}
        onMouseLeave={e => { if (!dragging) (e.currentTarget as HTMLDivElement).style.borderColor = '#3e3e3e'; }}
      >
        <FiUpload size={14} style={{ display: 'block', margin: '0 auto 4px', opacity: 0.5 }} />
        Drop files or click to upload
        <div style={{ fontSize: 10, marginTop: 2, opacity: 0.5 }}>images, css, js, html</div>
      </div>

      <input
        id="global-file-upload"
        ref={uploadRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleUpload(e.target.files)}
        accept="image/*,.html,.css,.js,.json,.txt,.md,.svg"
      />

      {/* File dialog overlay */}
      {dialog && (
        <FileDialog
          dialog={dialog}
          files={files}
          onConfirm={handleDialogConfirm}
          onCancel={() => setDialog(null)}
        />
      )}

      {ctxEl}
    </div>
  );
};

export default FilePanel;
