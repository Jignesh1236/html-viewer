import React, { useEffect, useState } from 'react';
import Editor, { BeforeMount, OnMount } from '@monaco-editor/react';
import { useEditorStore } from '../store/editorStore';
import { VscFileCode, VscSymbolColor, VscFile } from 'react-icons/vsc';
import { FiImage } from 'react-icons/fi';

const LANG_MAP: Record<string, string> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
  other: 'plaintext',
};

const EXTENSION_LANG_MAP: Record<string, string> = {
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  rb: 'ruby',
  php: 'php',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  vue: 'html',
  svelte: 'html',
  txt: 'plaintext',
};

const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

let inlineAiProviderRegistered = false;

// Simple LRU-style cache: key = prefix hash, value = suggestion
const aiSuggestionCache = new Map<string, string>();
const AI_CACHE_MAX = 40;

// Pending debounce handle
let aiDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Reactive status for the AI badge
export const aiStatus = { loading: false, lastError: false, listeners: new Set<() => void>() };
function setAiStatus(loading: boolean, error = false) {
  aiStatus.loading = loading;
  aiStatus.lastError = error;
  aiStatus.listeners.forEach(fn => fn());
}

function getLanguageForFile(file: { name: string; type: string }) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_LANG_MAP[extension] || LANG_MAP[file.type] || 'plaintext';
}

function cleanAiSuggestion(raw: string): string {
  return raw
    .replace(/^```[\w-]*\n?/i, '')
    .replace(/\n?```$/i, '')
    .replace(/^`+|`+$/g, '')
    .trimEnd()
    .slice(0, 1500);
}

function buildPrompt(language: string, fileName: string, prefix: string, suffix: string) {
  return [
    'You are an expert inline code completion AI, similar to GitHub Copilot.',
    'Output ONLY the code to insert at the cursor — nothing else.',
    'No explanations, no markdown fences, no prose.',
    'Complete the code naturally for 1-5 lines, matching indentation and style.',
    `Language: ${language}. File: ${fileName}.`,
    '--- CODE BEFORE CURSOR ---',
    prefix.slice(-2000),
    '--- CODE AFTER CURSOR ---',
    suffix.slice(0, 600),
    '--- COMPLETION (raw code only) ---',
  ].join('\n');
}

function cacheKey(prefix: string, language: string): string {
  const trimmed = prefix.slice(-300);
  return `${language}::${trimmed}`;
}

async function fetchAiSuggestion(
  language: string,
  fileName: string,
  prefix: string,
  suffix: string,
  signal: AbortSignal,
): Promise<string> {
  const key = cacheKey(prefix, language);

  if (aiSuggestionCache.has(key)) {
    return aiSuggestionCache.get(key)!;
  }

  const prompt = buildPrompt(language, fileName, prefix, suffix);
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`AI API ${res.status}`);

  const text = cleanAiSuggestion(await res.text());

  if (text) {
    if (aiSuggestionCache.size >= AI_CACHE_MAX) {
      aiSuggestionCache.delete(aiSuggestionCache.keys().next().value!);
    }
    aiSuggestionCache.set(key, text);
  }

  return text;
}

function registerPollinationsInlineSuggestions(monaco: any) {
  if (inlineAiProviderRegistered) return;
  inlineAiProviderRegistered = true;

  monaco.languages.registerInlineCompletionsProvider('*', {
    provideInlineCompletions: (model: any, position: any, _context: any, token: any) => {
      const linePrefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1);

      // Don't trigger on empty lines or very short input
      if (linePrefix.trim().length < 2) {
        return Promise.resolve({ items: [], dispose: () => undefined });
      }

      const fullText = model.getValue();
      const offset = model.getOffsetAt(position);
      const language = model.getLanguageId();
      const fileName = model.uri?.path?.split('/').pop() || 'untitled';
      const prefix = fullText.slice(0, offset);
      const suffix = fullText.slice(offset);

      // Check cache first — instant response
      const cached = aiSuggestionCache.get(cacheKey(prefix, language));
      if (cached) {
        return Promise.resolve({
          items: [{
            insertText: cached,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          }],
          dispose: () => undefined,
        });
      }

      // Debounced network fetch wrapped in a Promise
      return new Promise<{ items: any[]; dispose: () => void }>((resolve) => {
        if (aiDebounceTimer) clearTimeout(aiDebounceTimer);

        aiDebounceTimer = setTimeout(async () => {
          if (token.isCancellationRequested) {
            resolve({ items: [], dispose: () => undefined });
            return;
          }

          const abortCtrl = new AbortController();
          const cancelSub = token.onCancellationRequested(() => abortCtrl.abort());

          setAiStatus(true);
          try {
            const suggestion = await fetchAiSuggestion(language, fileName, prefix, suffix, abortCtrl.signal);

            if (!suggestion || token.isCancellationRequested) {
              resolve({ items: [], dispose: () => undefined });
            } else {
              resolve({
                items: [{
                  insertText: suggestion,
                  range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                }],
                dispose: () => undefined,
              });
            }
          } catch {
            setAiStatus(false, true);
            resolve({ items: [], dispose: () => undefined });
          } finally {
            setAiStatus(false);
            cancelSub?.dispose();
          }
        }, 420); // 420 ms debounce — feels like Copilot
      });
    },
    freeInlineCompletions: () => undefined,
  });
}

function enableHtmlAutoClose(editor: any, monaco: any) {
  return editor.onDidType((text: string) => {
    if (text !== '>' || editor.getModel()?.getLanguageId() !== 'html') return;

    const model = editor.getModel();
    const position = editor.getPosition();
    if (!model || !position) return;

    const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
    const tagMatch = line.match(/<([A-Za-z][\w:-]*)(?:\s[^<>]*)?>$/);
    if (!tagMatch) return;

    const tagName = tagMatch[1].toLowerCase();
    if (VOID_HTML_TAGS.has(tagName) || line.endsWith('/>') || line.includes('</')) return;

    const closingTag = `</${tagMatch[1]}>`;

    editor.executeEdits('html-auto-close', [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text: closingTag,
      forceMoveMarkers: true,
    }]);

    editor.setPosition(position);
  });
}

function fileIcon(type: string) {
  if (type === 'html') return <VscFileCode style={{ color: '#e34c26', flexShrink: 0 }} size={14} />;
  if (type === 'css') return <VscSymbolColor style={{ color: '#264de4', flexShrink: 0 }} size={14} />;
  if (type === 'js') return <VscFile style={{ color: '#f7df1e', flexShrink: 0 }} size={14} />;
  if (type === 'image') return <FiImage style={{ color: '#8bc34a', flexShrink: 0 }} size={13} />;
  return <VscFile style={{ color: '#aaa', flexShrink: 0 }} size={14} />;
}

function AiBadge() {
  const [state, setState] = useState({ loading: false, lastError: false });
  useEffect(() => {
    const handler = () => setState({ loading: aiStatus.loading, lastError: aiStatus.lastError });
    aiStatus.listeners.add(handler);
    return () => { aiStatus.listeners.delete(handler); };
  }, []);

  const color = state.loading ? '#f59e0b' : state.lastError ? '#ef4444' : '#22c55e';
  const label = state.loading ? 'AI…' : state.lastError ? 'AI ✗' : 'AI ✓';
  const title = state.loading
    ? 'AI is generating a suggestion…'
    : state.lastError
    ? 'AI suggestion failed – will retry on next keystroke'
    : 'AI inline completions active (Tab to accept)';

  return (
    <div title={title} style={{
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 4,
      background: 'rgba(0,0,0,0.25)',
      border: `1px solid ${color}44`,
      flexShrink: 0,
      cursor: 'default',
      userSelect: 'none',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        boxShadow: state.loading ? `0 0 6px ${color}` : 'none',
        animation: state.loading ? 'pulse 1s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );
}

const CodeEditor: React.FC = () => {
  const { files, activeFileId, setActiveFile, updateFileContent } = useEditorStore();

  const activeFile = files.find(f => f.id === activeFileId);

  const handleBeforeMount: BeforeMount = (monaco) => {
    registerPollinationsInlineSuggestions(monaco);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    const autoCloseDisposable = enableHtmlAutoClose(editor, monaco);
    editor.onDidDispose(() => autoCloseDisposable.dispose());
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  return (
    <div className="editor-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div className="editor-tabs" style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', flexShrink: 0, alignItems: 'center', paddingRight: 8 }}>
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
        <AiBadge />
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
              language={getLanguageForFile(activeFile)}
              value={activeFile.content}
              onChange={handleEditorChange}
              beforeMount={handleBeforeMount}
              onMount={handleEditorMount}
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
                inlineSuggest: { enabled: true },
                suggest: { preview: true },
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
