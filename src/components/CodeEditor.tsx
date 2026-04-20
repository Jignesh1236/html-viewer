import React, { useEffect, useRef, useState } from 'react';
import Editor, { BeforeMount, OnMount } from '@monaco-editor/react';
import { useEditorStore } from '../store/editorStore';
import { VscFileCode, VscSymbolColor, VscFile } from 'react-icons/vsc';
import { FiImage } from 'react-icons/fi';

/* ─────────────────────────────────────────────────────────────
   Language maps
   ───────────────────────────────────────────────────────────── */
const LANG_MAP: Record<string, string> = {
  html: 'html', css: 'css', js: 'javascript', other: 'plaintext',
};
const EXTENSION_LANG_MAP: Record<string, string> = {
  html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass',
  less: 'less', js: 'javascript', jsx: 'javascript', mjs: 'javascript',
  cjs: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json',
  md: 'markdown', markdown: 'markdown', py: 'python', rb: 'ruby',
  php: 'php', java: 'java', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp',
  cxx: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', swift: 'swift',
  kt: 'kotlin', kts: 'kotlin', sql: 'sql', sh: 'shell', bash: 'shell',
  zsh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'xml',
  vue: 'html', svelte: 'html', txt: 'plaintext',
};
const VOID_HTML_TAGS = new Set([
  'area','base','br','col','embed','hr','img','input',
  'link','meta','param','source','track','wbr',
]);

function getLanguageForFile(file: { name: string; type: string }) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_LANG_MAP[ext] || LANG_MAP[file.type] || 'plaintext';
}

/* ─────────────────────────────────────────────────────────────
   Global AI state — shared with App status bar
   ───────────────────────────────────────────────────────────── */
export type AiState = 'idle' | 'loading' | 'ready' | 'error';

export const aiControl = {
  state: 'idle' as AiState,
  lastSuggestion: '',
  listeners: new Set<() => void>(),
  triggerManual: null as (() => void) | null,

  setState(s: AiState, suggestion = '') {
    this.state = s;
    if (suggestion) this.lastSuggestion = suggestion;
    this.listeners.forEach(fn => fn());
  },
};

/* ─────────────────────────────────────────────────────────────
   Suggestion cache
   ───────────────────────────────────────────────────────────── */
const suggestionCache = new Map<string, string>();
const CACHE_MAX = 50;

function cacheKey(prefix: string, lang: string) {
  return `${lang}::${prefix.slice(-300)}`;
}
function cacheGet(prefix: string, lang: string) {
  return suggestionCache.get(cacheKey(prefix, lang)) ?? null;
}
function cacheSet(prefix: string, lang: string, value: string) {
  if (suggestionCache.size >= CACHE_MAX) {
    suggestionCache.delete(suggestionCache.keys().next().value!);
  }
  suggestionCache.set(cacheKey(prefix, lang), value);
}
export function clearAiCache() {
  suggestionCache.clear();
}

/* ─────────────────────────────────────────────────────────────
   AI fetch
   ───────────────────────────────────────────────────────────── */
function buildPrompt(lang: string, file: string, prefix: string, suffix: string) {
  return [
    'You are an expert inline code completion AI like GitHub Copilot.',
    'Output ONLY the raw code to insert at the cursor. No explanation, no markdown.',
    'Complete 1–5 lines naturally, preserving indentation and coding style.',
    `Language: ${lang}. File: ${file}.`,
    '=== CODE BEFORE CURSOR ===',
    prefix.slice(-2000),
    '=== CODE AFTER CURSOR ===',
    suffix.slice(0, 600),
    '=== COMPLETION ===',
  ].join('\n');
}

function cleanSuggestion(raw: string): string {
  return raw
    .replace(/^```[\w-]*\n?/i, '')
    .replace(/\n?```$/i, '')
    .replace(/^`+|`+$/g, '')
    .trimEnd()
    .slice(0, 1500);
}

async function fetchSuggestion(
  lang: string, fileName: string,
  prefix: string, suffix: string,
  signal: AbortSignal,
): Promise<string> {
  const cached = cacheGet(prefix, lang);
  if (cached) return cached;

  const url = `https://text.pollinations.ai/${encodeURIComponent(buildPrompt(lang, fileName, prefix, suffix))}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = cleanSuggestion(await res.text());
  if (text) cacheSet(prefix, lang, text);
  return text;
}

/* ─────────────────────────────────────────────────────────────
   Inline completions provider (registered once)
   ───────────────────────────────────────────────────────────── */
let providerRegistered = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function registerProvider(monaco: any) {
  if (providerRegistered) return;
  providerRegistered = true;

  monaco.languages.registerInlineCompletionsProvider('*', {
    provideInlineCompletions(model: any, position: any, _ctx: any, token: any) {
      const linePrefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      if (linePrefix.trim().length < 2) {
        return Promise.resolve({ items: [], dispose: () => undefined });
      }

      const fullText = model.getValue();
      const offset   = model.getOffsetAt(position);
      const lang     = model.getLanguageId();
      const fileName = model.uri?.path?.split('/').pop() ?? 'untitled';
      const prefix   = fullText.slice(0, offset);
      const suffix   = fullText.slice(offset);

      // instant from cache
      const cached = cacheGet(prefix, lang);
      if (cached) {
        aiControl.setState('ready', cached);
        return Promise.resolve({
          items: [{ insertText: cached, range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column) }],
          dispose: () => undefined,
        });
      }

      return new Promise<{ items: any[]; dispose: () => void }>(resolve => {
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
          if (token.isCancellationRequested) return resolve({ items: [], dispose: () => undefined });

          const ctrl = new AbortController();
          const sub  = token.onCancellationRequested(() => ctrl.abort());
          aiControl.setState('loading');

          try {
            const text = await fetchSuggestion(lang, fileName, prefix, suffix, ctrl.signal);
            if (!text || token.isCancellationRequested) {
              aiControl.setState('idle');
              resolve({ items: [], dispose: () => undefined });
            } else {
              aiControl.setState('ready', text);
              resolve({
                items: [{ insertText: text, range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column) }],
                dispose: () => undefined,
              });
            }
          } catch {
            aiControl.setState('error');
            resolve({ items: [], dispose: () => undefined });
          } finally {
            sub?.dispose();
          }
        }, 420);
      });
    },
    freeInlineCompletions: () => undefined,
  });
}

/* ─────────────────────────────────────────────────────────────
   HTML auto-close
   ───────────────────────────────────────────────────────────── */
function enableHtmlAutoClose(editor: any, monaco: any) {
  return editor.onDidType((text: string) => {
    if (text !== '>' || editor.getModel()?.getLanguageId() !== 'html') return;
    const model    = editor.getModel();
    const position = editor.getPosition();
    if (!model || !position) return;
    const line     = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
    const tagMatch = line.match(/<([A-Za-z][\w:-]*)(?:\s[^<>]*)?>$/);
    if (!tagMatch) return;
    const tag = tagMatch[1].toLowerCase();
    if (VOID_HTML_TAGS.has(tag) || line.endsWith('/>') || line.includes('</')) return;
    editor.executeEdits('html-auto-close', [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text: `</${tagMatch[1]}>`, forceMoveMarkers: true,
    }]);
    editor.setPosition(position);
  });
}

/* ─────────────────────────────────────────────────────────────
   File icon
   ───────────────────────────────────────────────────────────── */
function fileIcon(type: string) {
  if (type === 'html')  return <VscFileCode style={{ color: '#e34c26', flexShrink: 0 }} size={14} />;
  if (type === 'css')   return <VscSymbolColor style={{ color: '#264de4', flexShrink: 0 }} size={14} />;
  if (type === 'js')    return <VscFile style={{ color: '#f7df1e', flexShrink: 0 }} size={14} />;
  if (type === 'image') return <FiImage style={{ color: '#8bc34a', flexShrink: 0 }} size={13} />;
  return <VscFile style={{ color: '#aaa', flexShrink: 0 }} size={14} />;
}

/* ─────────────────────────────────────────────────────────────
   CodeEditor component
   ───────────────────────────────────────────────────────────── */
const CodeEditor: React.FC = () => {
  const { files, activeFileId, setActiveFile, updateFileContent } = useEditorStore();
  const editorRef = useRef<any>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFile = files.find(f => f.id === activeFileId);

  /* ── Trigger AI inline suggestion at current cursor ── */
  function triggerAiSuggestion(forceRefresh = false) {
    const editor = editorRef.current;
    if (!editor) return;
    if (forceRefresh) {
      // Clear cache for current position so fresh suggestion is fetched
      const model  = editor.getModel();
      const pos    = editor.getPosition();
      if (model && pos) {
        const lang   = model.getLanguageId();
        const offset = model.getOffsetAt(pos);
        const prefix = model.getValue().slice(0, offset);
        const key    = cacheKey(prefix, lang);
        suggestionCache.delete(key);
      }
    }
    // Dismiss any current suggestion first, then re-trigger
    editor.trigger('ai-manual', 'editor.action.inlineSuggest.hide', null);
    setTimeout(() => {
      editor.trigger('ai-manual', 'editor.action.inlineSuggest.trigger', null);
    }, 50);
  }

  /* ── Expose trigger to status bar ── */
  useEffect(() => {
    aiControl.triggerManual = () => triggerAiSuggestion(true);
    return () => { aiControl.triggerManual = null; };
  });

  /* ── Register idle detection ── */
  function setupIdleDetection(editor: any) {
    function resetIdleTimer() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      // After 1.5 s of no typing → trigger AI
      idleTimerRef.current = setTimeout(() => {
        const model = editor.getModel();
        const pos   = editor.getPosition();
        if (!model || !pos) return;
        const linePrefix = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
        // Only trigger if there's meaningful code on the current line
        if (linePrefix.trim().length >= 2) {
          aiControl.setState('loading');
          editor.trigger('ai-idle', 'editor.action.inlineSuggest.trigger', null);
        }
      }, 1500);
    }

    // Reset timer on every content change (user typed something)
    const contentSub = editor.onDidChangeModelContent(() => {
      aiControl.setState('idle');   // hide stale state while typing
      resetIdleTimer();
    });

    // Also reset on cursor move (arrow keys, click)
    const cursorSub = editor.onDidChangeCursorPosition(() => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    });

    return () => {
      contentSub.dispose();
      cursorSub.dispose();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }

  const handleBeforeMount: BeforeMount = (monaco) => {
    registerProvider(monaco);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    const cleanupIdle  = setupIdleDetection(editor);
    const cleanupClose = enableHtmlAutoClose(editor, monaco);
    editor.onDidDispose(() => { cleanupIdle(); cleanupClose.dispose(); });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) updateFileContent(activeFileId, value);
  };

  return (
    <div className="editor-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div className="editor-tabs" style={{
        display: 'flex', flexWrap: 'nowrap', overflowX: 'auto',
        overflowY: 'hidden', flexShrink: 0, alignItems: 'center',
      }}>
        {files.map(file => (
          <div
            key={file.id}
            className={`editor-tab ${activeFileId === file.id ? 'active' : ''}`}
            onClick={() => setActiveFile(file.id)}
            style={{ flexShrink: 0 }}
          >
            {fileIcon(file.type)}
            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {!activeFile ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--editor-text-muted)', fontSize: 13 }}>
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
                inlineSuggest: { enabled: true, mode: 'prefix' },
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
                  vertical: 'auto', horizontal: 'auto',
                  verticalScrollbarSize: 6, horizontalScrollbarSize: 6,
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Image Viewer
   ───────────────────────────────────────────────────────────── */
interface ImageViewerProps {
  file: { name: string; url?: string; content: string; mimeType?: string };
}
function ImageViewer({ file }: ImageViewerProps) {
  const src = file.url || (file.content ? `data:${file.mimeType || 'image/png'};base64,${file.content}` : '');
  const [zoom, setZoom] = React.useState(1);
  const [bg, setBg]     = React.useState<'dark' | 'light' | 'checker'>('checker');

  const bgStyle: React.CSSProperties = bg === 'checker'
    ? { backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%)', backgroundSize: '20px 20px' }
    : { background: bg === 'dark' ? '#111' : '#eee' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#252526', borderBottom: '1px solid #3e3e3e', flexShrink: 0, flexWrap: 'wrap' }}>
        <FiImage size={13} style={{ color: '#8bc34a' }} />
        <span style={{ fontSize: 12, color: '#ccc', fontWeight: 500 }}>{file.name}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#666' }}>Background:</span>
        {(['checker', 'dark', 'light'] as const).map(b => (
          <button key={b} onClick={() => setBg(b)} style={{ padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer', background: bg === b ? 'rgba(229,164,90,0.15)' : 'transparent', border: `1px solid ${bg === b ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`, color: bg === b ? '#e5a45a' : '#888', fontFamily: 'inherit' }}>
            {b.charAt(0).toUpperCase() + b.slice(1)}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: '#3e3e3e' }} />
        <span style={{ fontSize: 11, color: '#666' }}>Zoom:</span>
        <button onClick={() => setZoom(z => Math.max(0.1, +(z - 0.25).toFixed(2)))} style={{ width: 22, height: 22, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontSize: 14, lineHeight: 1, fontFamily: 'inherit' }}>−</button>
        <span style={{ fontSize: 12, color: '#bbb', minWidth: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))} style={{ width: 22, height: 22, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontSize: 14, lineHeight: 1, fontFamily: 'inherit' }}>+</button>
        <button onClick={() => setZoom(1)} style={{ padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #3e3e3e', color: '#888', fontFamily: 'inherit' }}>Reset</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 0, ...bgStyle }}>
        {src ? (
          <img src={src} alt={file.name} style={{ maxWidth: 'none', transform: `scale(${zoom})`, transformOrigin: 'center center', display: 'block', imageRendering: zoom > 2 ? 'pixelated' : 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }} />
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
