import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../store/editorStore';
import { VscFileCode, VscSymbolColor, VscFile } from 'react-icons/vsc';
import { FiX } from 'react-icons/fi';

const LANG_MAP: Record<string, string> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
  other: 'plaintext',
};

const CodeEditor: React.FC = () => {
  const { files, activeFileId, setActiveFile, removeFile, updateFileContent } = useEditorStore();

  const activeFile = files.find(f => f.id === activeFileId);
  const editableFiles = files.filter(f => f.type !== 'image');

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = editableFiles.filter(f => f.id !== id);
    if (remaining.length > 0 && activeFileId === id) {
      setActiveFile(remaining[0].id);
    }
  };

  return (
    <div className="editor-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="editor-tabs">
        {editableFiles.map(file => (
          <div
            key={file.id}
            className={`editor-tab ${activeFileId === file.id ? 'active' : ''}`}
            onClick={() => setActiveFile(file.id)}
          >
            {file.type === 'html' && <VscFileCode style={{ color: '#e34c26', flexShrink: 0 }} size={14} />}
            {file.type === 'css' && <VscSymbolColor style={{ color: '#264de4', flexShrink: 0 }} size={14} />}
            {file.type === 'js' && <VscFile style={{ color: '#f7df1e', flexShrink: 0 }} size={14} />}
            {file.type === 'other' && <VscFile style={{ color: '#aaa', flexShrink: 0 }} size={14} />}
            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
            <div className="tab-close" onClick={(e) => handleCloseTab(file.id, e)}>
              <FiX size={12} />
            </div>
          </div>
        ))}
      </div>

      <div className="monaco-container" style={{ flex: 1 }}>
        {activeFile ? (
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
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--editor-text-muted)',
            fontSize: 13,
          }}>
            No file selected
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
