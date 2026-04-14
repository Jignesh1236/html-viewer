import React, { useRef, useState } from 'react';
import { useEditorStore, FileItem } from '../store/editorStore';
import { FiPlus, FiUpload, FiX } from 'react-icons/fi';
import { VscFile, VscFileCode, VscSymbolColor, VscFileMedia } from 'react-icons/vsc';
import { useContextMenu } from './ContextMenu';

const FileIcon: React.FC<{ type: FileItem['type'] }> = ({ type }) => {
  if (type === 'html') return <VscFileCode style={{ color: '#e34c26', flexShrink: 0 }} />;
  if (type === 'css') return <VscSymbolColor style={{ color: '#264de4', flexShrink: 0 }} />;
  if (type === 'js') return <VscFile style={{ color: '#f7df1e', flexShrink: 0 }} />;
  if (type === 'image') return <VscFileMedia style={{ color: '#4ec9b0', flexShrink: 0 }} />;
  return <VscFile style={{ color: '#aaa', flexShrink: 0 }} />;
};

const FilePanel: React.FC<{ onClose?: () => void; hideHeader?: boolean }> = ({ onClose, hideHeader }) => {
  const { files, activeFileId, setActiveFile, addFile, removeFile, updateFileContent, showNotification } = useEditorStore();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { show: showCtx, element: ctxEl } = useContextMenu();

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

  const createNewFile = () => {
    const name = prompt('New file name (e.g. page.html, extra.css, app.js):');
    if (!name) return;
    if (files.find(f => f.id === name)) { showNotification(`"${name}" already exists`); return; }
    const ext = name.split('.').pop()?.toLowerCase();
    const type = ext === 'html' ? 'html' : ext === 'css' ? 'css' : ext === 'js' ? 'js' : 'other';
    const starter = type === 'html'
      ? `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>New Page</title>\n</head>\n<body>\n\n</body>\n</html>`
      : type === 'css' ? `/* ${name} */\n` : type === 'js' ? `// ${name}\n` : '';
    addFile({ id: name, name, type, content: starter });
    setActiveFile(name);
    showNotification(`Created ${name}`);
  };

  const handleFileContextMenu = (e: React.MouseEvent, file: FileItem) => {
    showCtx(e, [
      { label: 'Open', icon: '📂', action: () => { if (file.type !== 'image') setActiveFile(file.id); } },
      { separator: true, label: '' },
      { label: 'Duplicate', icon: '📋', action: () => {
          const parts = file.name.split('.');
          const newName = parts.length > 1 ? `${parts.slice(0,-1).join('.')}_copy.${parts[parts.length-1]}` : `${file.name}_copy`;
          addFile({ ...file, id: newName, name: newName });
          showNotification(`Duplicated as ${newName}`);
        }
      },
      { label: 'Rename', icon: '✏️', action: () => {
          const newName = prompt('Rename to:', file.name);
          if (!newName || newName === file.name) return;
          removeFile(file.id);
          addFile({ ...file, id: newName, name: newName });
          setActiveFile(newName);
        }
      },
      { separator: true, label: '' },
      { label: 'Copy Content', icon: '📄', action: () => {
          navigator.clipboard.writeText(file.content);
          showNotification('Content copied to clipboard');
        }
      },
      { separator: true, label: '' },
      { label: `Delete "${file.name}"`, icon: '🗑️', danger: true, action: () => {
          if (confirm(`Delete "${file.name}"?`)) { removeFile(file.id); showNotification(`Deleted ${file.name}`); }
        }
      },
    ]);
  };

  const handlePanelContextMenu = (e: React.MouseEvent) => {
    // Only if not on a file item
    if ((e.target as Element).closest('[data-file-item]')) return;
    showCtx(e, [
      { label: 'New File', icon: '📄', action: createNewFile },
      { label: 'Upload Files…', icon: '⬆️', action: () => uploadRef.current?.click() },
      { separator: true, label: '' },
      { label: 'Close Explorer', icon: '✕', action: onClose },
    ]);
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
      onContextMenu={handlePanelContextMenu}
    >
      {/* Header */}
      {!hideHeader && <div style={{
        height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px',
        borderBottom: '1px solid #3e3e3e', background: '#252526',
      }}
        onContextMenu={e => {
          e.stopPropagation();
          showCtx(e, [
            { label: 'New File', icon: '📄', action: createNewFile },
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
          onClick={createNewFile}
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
      </div>}

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
            onContextMenu={e => { e.stopPropagation(); handleFileContextMenu(e, file); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
              cursor: file.type === 'image' ? 'default' : 'pointer',
              background: activeFileId === file.id ? 'rgba(229,164,90,0.1)' : 'transparent',
              borderLeft: `2px solid ${activeFileId === file.id ? '#e5a45a' : 'transparent'}`,
              color: activeFileId === file.id ? '#e5a45a' : '#ccc',
              fontSize: 12.5,
              userSelect: 'none',
            }}
            onMouseEnter={e => {
              if (activeFileId !== file.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              if (activeFileId !== file.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <FileIcon type={file.type} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
            {file.type === 'image' && <span style={{ fontSize: 9, color: '#666', flexShrink: 0 }}>img</span>}
            <button
              title={`Delete ${file.name}`}
              onClick={e => {
                e.stopPropagation();
                if (confirm(`Delete "${file.name}"?`)) { removeFile(file.id); showNotification(`Deleted ${file.name}`); }
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#555',
                padding: 2, display: 'flex', borderRadius: 2, opacity: 0, flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f88'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
              ref={el => {
                if (!el) return;
                const row = el.closest('[data-file-item]') as HTMLElement;
                if (row) {
                  row.addEventListener('mouseenter', () => el.style.opacity = '1');
                  row.addEventListener('mouseleave', () => el.style.opacity = '0');
                }
              }}
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
      {ctxEl}
    </div>
  );
};

export default FilePanel;
