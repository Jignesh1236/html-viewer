import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../store/editorStore';
import { VscFileCode, VscSymbolColor, VscFile } from 'react-icons/vsc';
import { FiImage } from 'react-icons/fi';

const LANG_MAP: Record<string, string> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
  other: 'plaintext',
};

function fileIcon(type: string) {
  if (type === 'html') return <VscFileCode style={{ color: '#e34c26', flexShrink: 0 }} size={14} />;
  if (type === 'css') return <VscSymbolColor style={{ color: '#264de4', flexShrink: 0 }} size={14} />;
  if (type === 'js') return <VscFile style={{ color: '#f7df1e', flexShrink: 0 }} size={14} />;
  if (type === 'image') return <FiImage style={{ color: '#8bc34a', flexShrink: 0 }} size={13} />;
  return <VscFile style={{ color: '#aaa', flexShrink: 0 }} size={14} />;
}

const CodeEditor: React.FC = () => {
  const { files, activeFileId, setActiveFile, updateFileContent } = useEditorStore();

  const activeFile = files.find(f => f.id === activeFileId);

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  return (
    <div className="editor-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div className="editor-tabs" style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', flexShrink: 0 }}>
        {files.map(file => (
          <div
            key={file.id}
            className={`editor-tab ${activeFileId === file.id ? 'active' : ''}`}
            onClick={() => setActiveFile(file.id)}
            style={{ flexShrink: 0 }}
          >
            {fileIcon(file.type)}
            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
          </div>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {!activeFile ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: 'var(--editor-text-muted)', fontSize: 13,
          }}>
            No file selected
          </div>
        ) : activeFile.type === 'image' ? (
          <ImageViewer file={activeFile} />
        ) : (
          <div className="monaco-container" style={{ height: '100%' }}>
            <Editor
              key={activeFile.id}
              height="100%"
              language={LANG_MAP[activeFile.type] || 'plaintext'}
              value={activeFile.content}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                fontLigatures: true,
                minimap: { enabled: true, scale: 0.7 },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                wordWrap: 'off',
                tabSize: 2,
                insertSpaces: true,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                formatOnPaste: true,
                formatOnType: false,
                suggestOnTriggerCharacters: true,
                quickSuggestions: { other: true, comments: false, strings: false },
                snippetSuggestions: 'top',
                renderWhitespace: 'selection',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
                padding: { top: 8 },
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface ImageViewerProps {
  file: { name: string; url?: string; content: string; mimeType?: string };
}

function ImageViewer({ file }: ImageViewerProps) {
  const src = file.url || (file.content ? `data:${file.mimeType || 'image/png'};base64,${file.content}` : '');
  const [zoom, setZoom] = React.useState(1);
  const [bg, setBg] = React.useState<'dark' | 'light' | 'checker'>('checker');

  const bgStyle: React.CSSProperties = bg === 'checker'
    ? { backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%)', backgroundSize: '20px 20px' }
    : { background: bg === 'dark' ? '#111' : '#eee' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>
      {/* Image toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        background: '#252526', borderBottom: '1px solid #3e3e3e', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <FiImage size={13} style={{ color: '#8bc34a' }} />
        <span style={{ fontSize: 12, color: '#ccc', fontWeight: 500 }}>{file.name}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#666' }}>Background:</span>
        {(['checker', 'dark', 'light'] as const).map(b => (
          <button key={b} onClick={() => setBg(b)}
            style={{
              padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
              background: bg === b ? 'rgba(229,164,90,0.15)' : 'transparent',
              border: `1px solid ${bg === b ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`,
              color: bg === b ? '#e5a45a' : '#888', fontFamily: 'inherit',
            }}>
            {b.charAt(0).toUpperCase() + b.slice(1)}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: '#3e3e3e' }} />
        <span style={{ fontSize: 11, color: '#666' }}>Zoom:</span>
        <button onClick={() => setZoom(z => Math.max(0.1, +(z - 0.25).toFixed(2)))}
          style={{ width: 22, height: 22, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontSize: 14, lineHeight: 1, fontFamily: 'inherit' }}>−</button>
        <span style={{ fontSize: 12, color: '#bbb', minWidth: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))}
          style={{ width: 22, height: 22, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontSize: 14, lineHeight: 1, fontFamily: 'inherit' }}>+</button>
        <button onClick={() => setZoom(1)}
          style={{ padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontFamily: 'inherit' }}>
          Reset
        </button>
      </div>

      {/* Image display */}
      <div style={{
        flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, minHeight: 0, ...bgStyle,
      }}>
        {src ? (
          <img
            src={src}
            alt={file.name}
            style={{
              maxWidth: 'none',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              display: 'block',
              imageRendering: zoom > 2 ? 'pixelated' : 'auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          />
        ) : (
          <div style={{ color: '#555', fontSize: 13, textAlign: 'center' }}>
            <FiImage size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>Cannot display image</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeEditor;
