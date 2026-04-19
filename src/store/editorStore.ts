import { create } from 'zustand';

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  content: string;
  url?: string;
  mimeType?: string;
  folder?: string;
}

export type FileType = 'html' | 'css' | 'js' | 'ts' | 'tsx' | 'jsx' | 'json' | 'image' | 'other';
export type ProjectType = 'static' | 'react' | 'node' | 'fullstack';

export interface SelectedElement {
  tagName: string;
  id: string;
  className: string;
  styles: Record<string, string>;
  innerHTML: string;
  textContent: string;
}

type VisualBridge = {
  applyStyle: (property: string, value: string) => void;
  applyContent: (html: string) => void;
} | null;

export interface AnimationConfig {
  preset: string;
  trigger: 'load' | 'hover' | 'click';
  duration: string;
  easing: string;
  delay: string;
  iteration: string;
  direction: string;
  fillMode: string;
  customKeyframes: string;
}

export type Mode = 'code' | 'visual' | 'split';

export interface PanelConfig {
  filePanel: boolean;
  propertiesPanel: boolean;
  timelinePanel: boolean;
  devtools: boolean;
  filesPanelWidth: number;
  propertiesPanelWidth: number;
  timelineHeight: number;
  devtoolsHeight: number;
}

export interface ConsoleEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

export interface PreviewTab {
  id: string;
  title: string;
  favicon: string;
  active: boolean;
  previewType: 'page' | 'image';
  imageFileId?: string;
}

export interface TimelineTrack {
  id: string;
  element: string;
  animation: string;
  duration: number;
  delay: number;
  color: string;
  easing: string;
  iteration: string;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  playing: boolean;
  currentTime: number;
  animationsApplied: boolean;
}

interface EditorStore {
  files: FileItem[];
  activeFileId: string | null;
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string) => void;
  moveFileToFolder: (fileId: string, folder: string | undefined) => void;

  folders: string[];
  addFolder: (name: string) => void;
  removeFolder: (name: string) => void;
  renameFolder: (oldName: string, newName: string) => void;

  mode: Mode;
  setMode: (mode: Mode) => void;

  selectedSelector: string | null;
  setSelectedSelector: (selector: string | null) => void;

  selectedElement: SelectedElement | null;
  setSelectedElement: (el: SelectedElement | null) => void;

  applySelectedStyle: (property: string, value: string) => void;
  applySelectedContent: (html: string) => void;

  visualBridge: VisualBridge;
  setVisualBridge: (bridge: VisualBridge) => void;

  animationConfig: AnimationConfig;
  setAnimationConfig: (config: Partial<AnimationConfig>) => void;

  panels: PanelConfig;
  setPanels: (panels: Partial<PanelConfig>) => void;

  consoleEntries: ConsoleEntry[];
  addConsoleEntry: (entry: Omit<ConsoleEntry, 'id'>) => void;
  clearConsole: () => void;

  previewTabs: PreviewTab[];
  activePreviewTabId: string;
  addPreviewTab: (opts?: { fileId?: string; title?: string; previewType?: 'page' | 'image'; imageFileId?: string }) => void;
  closePreviewTab: (id: string) => void;
  setActivePreviewTab: (id: string) => void;
  updatePreviewTab: (id: string, update: Partial<PreviewTab>) => void;

  notification: string | null;
  showNotification: (msg: string) => void;

  previewRefreshKey: number;
  refreshPreview: () => void;

  timelineAnimationStyle: string;
  setTimelineAnimationStyle: (css: string) => void;

  timelineRestartKey: number;
  triggerTimelineRestart: () => void;

  timelineState: TimelineState;
  setTimelineState: (update: Partial<TimelineState> | ((prev: TimelineState) => TimelineState)) => void;
  resetTimelineState: () => void;

  pendingFileDialog: { type: 'create' | 'rename'; fileId?: string } | null;
  setPendingFileDialog: (d: { type: 'create' | 'rename'; fileId?: string } | null) => void;

  resetFiles: (newFiles: FileItem[]) => void;
}

const DEFAULT_PKG = `{
  "name": "my-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2"
  }
}`;

const DEFAULT_VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;

const DEFAULT_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const DEFAULT_MAIN_JSX = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;

const DEFAULT_APP_JSX = `import { useState } from 'react'
import './App.css'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="header">
        <div className="logo">⚛ My App</div>
        <nav>
          <a href="#">Home</a>
          <a href="#">About</a>
          <a href="#">Contact</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>Hello, React! 👋</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to see changes instantly.
          </p>
          <div className="counter">
            <button onClick={() => setCount(c => c - 1)}>−</button>
            <span>{count}</span>
            <button onClick={() => setCount(c => c + 1)}>+</button>
          </div>
        </section>

        <section className="features">
          {[
            { icon: '⚡', title: 'Vite', desc: 'Lightning-fast dev server with instant HMR' },
            { icon: '⚛', title: 'React 18', desc: 'Modern React with hooks and concurrent rendering' },
            { icon: '🎨', title: 'Customizable', desc: 'Edit App.css to style your app your way' },
          ].map(f => (
            <div key={f.title} className="card">
              <div className="card-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="footer">
        <p>Built with React + Vite · <a href="https://react.dev" target="_blank">Docs</a></p>
      </footer>
    </div>
  )
}
`;

const DEFAULT_APP_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
  line-height: 1.6;
}

.app { min-height: 100vh; display: flex; flex-direction: column; }

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 40px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}
.logo { font-size: 1.2rem; font-weight: 700; color: #61dafb; }
nav a {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  margin-left: 28px;
  font-size: 0.9rem;
  transition: color 0.2s;
}
nav a:hover { color: #61dafb; }

/* Hero */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 100px 40px 80px;
  background: radial-gradient(ellipse at 50% 0%, rgba(97, 218, 251, 0.08) 0%, transparent 70%);
}
.hero h1 {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #61dafb, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
}
.hero p { font-size: 1.1rem; color: rgba(255, 255, 255, 0.55); margin-bottom: 40px; }
.hero code {
  background: rgba(97, 218, 251, 0.12);
  color: #61dafb;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Counter */
.counter { display: flex; align-items: center; gap: 20px; }
.counter button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(97, 218, 251, 0.4);
  background: rgba(97, 218, 251, 0.1);
  color: #61dafb;
  font-size: 1.4rem;
  cursor: pointer;
  transition: all 0.2s;
}
.counter button:hover {
  background: rgba(97, 218, 251, 0.2);
  border-color: #61dafb;
  transform: scale(1.08);
}
.counter span {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  min-width: 60px;
  text-align: center;
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  padding: 60px 40px;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 28px;
  transition: border-color 0.2s, background 0.2s;
}
.card:hover { border-color: rgba(97, 218, 251, 0.3); background: rgba(97, 218, 251, 0.04); }
.card-icon { font-size: 2rem; margin-bottom: 12px; }
.card h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; color: #fff; }
.card p { color: rgba(255, 255, 255, 0.5); font-size: 0.88rem; }

/* Footer */
.footer {
  margin-top: auto;
  text-align: center;
  padding: 24px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.footer a { color: #61dafb; text-decoration: none; }
.footer a:hover { text-decoration: underline; }
`;

const FILES_STORAGE_KEY    = 'html-editor-files-v2';
const FOLDERS_STORAGE_KEY  = 'html-editor-folders-v2';
const ACTIVE_FILE_KEY      = 'html-editor-active-file-v2';
const TIMELINE_STORAGE_KEY = 'html-editor-timeline-state-v2';
const DEFAULT_TIMELINE_TRACKS: TimelineTrack[] = [
  { id: '1', element: '.hero', animation: 'fadeIn', duration: 1.2, delay: 0, color: '#e5a45a', easing: 'ease', iteration: '1' },
  { id: '2', element: 'h1', animation: 'slideUp', duration: 0.8, delay: 0.3, color: '#4ec9b0', easing: 'ease', iteration: '1' },
  { id: '3', element: '.counter', animation: 'zoom', duration: 0.5, delay: 0.8, color: '#9cdcfe', easing: 'ease', iteration: '1' },
  { id: '4', element: '.card', animation: 'fadeIn', duration: 0.6, delay: 1.0, color: '#dcdcaa', easing: 'ease', iteration: '1' },
];

const DEFAULT_TIMELINE_STATE: TimelineState = {
  tracks: DEFAULT_TIMELINE_TRACKS,
  playing: false,
  currentTime: 0,
  animationsApplied: false,
};

const DEFAULT_FOLDERS = ['src'];

/* ─── Files persistence ─── */
const DEFAULT_FILES: FileItem[] = [
  { id: 'package.json',    name: 'package.json',    type: 'json', content: DEFAULT_PKG         },
  { id: 'vite.config.js',  name: 'vite.config.js',  type: 'js',   content: DEFAULT_VITE_CONFIG },
  { id: 'index.html',      name: 'index.html',      type: 'html', content: DEFAULT_INDEX_HTML  },
  { id: 'src/main.jsx',    name: 'main.jsx',         type: 'jsx',  content: DEFAULT_MAIN_JSX,   folder: 'src' },
  { id: 'src/App.jsx',     name: 'App.jsx',          type: 'jsx',  content: DEFAULT_APP_JSX,    folder: 'src' },
  { id: 'src/App.css',     name: 'App.css',          type: 'css',  content: DEFAULT_APP_CSS,    folder: 'src' },
];

function serializeFiles(files: FileItem[]): FileItem[] {
  return files.map(f => {
    if (f.type === 'image' && f.url?.startsWith('blob:')) {
      return { ...f, url: undefined };
    }
    return f;
  });
}

function saveFiles(files: FileItem[]) {
  try {
    localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(serializeFiles(files)));
  } catch { /* quota exceeded — ignore */ }
}

function loadFiles(): FileItem[] {
  try {
    const raw = localStorage.getItem(FILES_STORAGE_KEY);
    if (raw === null) return DEFAULT_FILES; // First ever visit → show demo project
    const parsed = JSON.parse(raw) as FileItem[];
    if (!Array.isArray(parsed)) return DEFAULT_FILES;
    return parsed; // Empty array is valid (user cleared project)
  } catch {
    return DEFAULT_FILES;
  }
}

function saveFolders(folders: string[]) {
  try { localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders)); } catch {}
}

function loadFolders(): string[] {
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : DEFAULT_FOLDERS;
  } catch { return DEFAULT_FOLDERS; }
}

function saveActiveFile(id: string | null) {
  try { localStorage.setItem(ACTIVE_FILE_KEY, id ?? ''); } catch {}
}

function loadActiveFile(files: FileItem[]): string | null {
  try {
    const id = localStorage.getItem(ACTIVE_FILE_KEY);
    if (id && files.find(f => f.id === id)) return id;
    return files[0]?.id ?? null;
  } catch {
    return files[0]?.id ?? null;
  }
}

function loadTimelineState(): TimelineState {
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
    if (!raw) return DEFAULT_TIMELINE_STATE;
    const parsed = JSON.parse(raw) as Partial<TimelineState>;
    if (!parsed || !Array.isArray(parsed.tracks)) return DEFAULT_TIMELINE_STATE;
    return {
      tracks: parsed.tracks,
      playing: !!parsed.playing,
      currentTime: typeof parsed.currentTime === 'number' ? parsed.currentTime : 0,
      animationsApplied: !!parsed.animationsApplied,
    };
  } catch {
    return DEFAULT_TIMELINE_STATE;
  }
}

function saveTimelineState(state: TimelineState) {
  try {
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota/storage errors
  }
}

const _initFiles = loadFiles();
const _initActiveFileId = loadActiveFile(_initFiles);
const _initFolders = loadFolders();

export const useEditorStore = create<EditorStore>((set, get) => ({
  files: _initFiles,
  activeFileId: _initActiveFileId,

  addFile: (file) => set((s) => {
    const next = [...s.files, file];
    saveFiles(next);
    return { files: next };
  }),
  removeFile: (id) => set((s) => {
    const next = s.files.filter(f => f.id !== id);
    const nextActive = s.activeFileId === id ? (next.find(f => f.id !== id)?.id ?? next[0]?.id ?? null) : s.activeFileId;
    saveFiles(next);
    saveActiveFile(nextActive);
    return { files: next, activeFileId: nextActive };
  }),
  resetFiles: (newFiles) => set(() => {
    const firstId = newFiles[0]?.id ?? null;
    const folders = [...new Set(newFiles.map(f => f.folder).filter(Boolean) as string[])];
    saveFiles(newFiles);
    saveActiveFile(firstId);
    saveFolders(folders);
    return { files: newFiles, activeFileId: firstId, folders };
  }),
  updateFileContent: (id, content) => set((s) => {
    const file = s.files.find(f => f.id === id);
    const isHtmlFile = file?.type === 'html';
    const isBlank = content.trim().length < 30;
    let timelinePatch: Partial<EditorStore> = {};
    if (isHtmlFile && isBlank) {
      const clearedTimeline: TimelineState = { ...s.timelineState, animationsApplied: false, tracks: [], playing: false, currentTime: 0 };
      saveTimelineState(clearedTimeline);
      timelinePatch = { timelineState: clearedTimeline, timelineAnimationStyle: '' };
    }
    const next = s.files.map(f => f.id === id ? { ...f, content } : f);
    saveFiles(next);
    return {
      files: next,
      previewRefreshKey: s.previewRefreshKey + 1,
      ...timelinePatch,
    };
  }),
  setActiveFile: (id) => {
    saveActiveFile(id);
    set({ activeFileId: id });
  },
  moveFileToFolder: (fileId, folder) => set((s) => {
    const next = s.files.map(f => f.id === fileId ? { ...f, folder } : f);
    saveFiles(next);
    return { files: next };
  }),

  folders: _initFolders,
  addFolder: (name) => set((s) => {
    const next = s.folders.includes(name) ? s.folders : [...s.folders, name];
    saveFolders(next);
    return { folders: next };
  }),
  removeFolder: (name) => set((s) => {
    const nextFolders = s.folders.filter(f => f !== name);
    const nextFiles = s.files.map(f => f.folder === name ? { ...f, folder: undefined } : f);
    saveFolders(nextFolders);
    saveFiles(nextFiles);
    return { folders: nextFolders, files: nextFiles };
  }),
  renameFolder: (oldName, newName) => set((s) => {
    const nextFolders = s.folders.map(f => f === oldName ? newName : f);
    const nextFiles = s.files.map(f => f.folder === oldName ? { ...f, folder: newName } : f);
    saveFolders(nextFolders);
    saveFiles(nextFiles);
    return { folders: nextFolders, files: nextFiles };
  }),

  mode: 'split',
  setMode: (mode) => set({ mode }),

  selectedSelector: null,
  setSelectedSelector: (selector) => set({ selectedSelector: selector }),

  selectedElement: null,
  setSelectedElement: (el) => set({ selectedElement: el }),

  visualBridge: null,
  setVisualBridge: (bridge) => set({ visualBridge: bridge }),

  applySelectedStyle: (property, value) => {
    const bridge = get().visualBridge;
    if (!bridge) return;
    bridge.applyStyle(property, value);
  },

  applySelectedContent: (html) => {
    const bridge = get().visualBridge;
    if (!bridge) return;
    bridge.applyContent(html);
  },

  animationConfig: {
    preset: 'none',
    trigger: 'load',
    duration: '0.6s',
    easing: 'ease',
    delay: '0s',
    iteration: '1',
    direction: 'normal',
    fillMode: 'forwards',
    customKeyframes: '',
  },
  setAnimationConfig: (config) => set((s) => ({
    animationConfig: { ...s.animationConfig, ...config }
  })),

  panels: {
    filePanel: true,
    propertiesPanel: true,
    timelinePanel: true,
    devtools: false,
    filesPanelWidth: 220,
    propertiesPanelWidth: 268,
    timelineHeight: 180,
    devtoolsHeight: 220,
  },
  setPanels: (panels) => set((s) => ({ panels: { ...s.panels, ...panels } })),

  consoleEntries: [],
  addConsoleEntry: (entry) => set((s) => ({
    consoleEntries: [...s.consoleEntries.slice(-300), { ...entry, id: Math.random().toString(36) }],
  })),
  clearConsole: () => set({ consoleEntries: [] }),

  previewTabs: [{ id: 'tab-1', title: 'My Page', favicon: '', active: true, previewType: 'page' }],
  activePreviewTabId: 'tab-1',
  addPreviewTab: (opts) => {
    const id = `tab-${Date.now()}`;
    const newTab: PreviewTab = {
      id,
      title: opts?.title ?? 'New Tab',
      favicon: '',
      active: true,
      previewType: opts?.previewType ?? 'page',
      imageFileId: opts?.imageFileId,
    };
    set((s) => ({
      previewTabs: [...s.previewTabs.map(t => ({ ...t, active: false })), newTab],
      activePreviewTabId: id,
    }));
  },
  closePreviewTab: (id) => set((s) => {
    const remaining = s.previewTabs.filter(t => t.id !== id);
    if (remaining.length === 0) return s;
    const wasActive = s.activePreviewTabId === id;
    const newActive = wasActive ? remaining[remaining.length - 1].id : s.activePreviewTabId;
    return {
      previewTabs: remaining.map(t => ({ ...t, active: t.id === newActive })),
      activePreviewTabId: newActive,
    };
  }),
  setActivePreviewTab: (id) => set((s) => ({
    previewTabs: s.previewTabs.map(t => ({ ...t, active: t.id === id })),
    activePreviewTabId: id,
  })),
  updatePreviewTab: (id, update) => set((s) => ({
    previewTabs: s.previewTabs.map(t => t.id === id ? { ...t, ...update } : t),
  })),

  notification: null,
  showNotification: (msg) => {
    set({ notification: msg });
    setTimeout(() => set({ notification: null }), 2800);
  },

  previewRefreshKey: 0,
  refreshPreview: () => set((s) => ({ previewRefreshKey: s.previewRefreshKey + 1 })),

  timelineAnimationStyle: '',
  setTimelineAnimationStyle: (css: string) => set({ timelineAnimationStyle: css }),

  timelineRestartKey: 0,
  triggerTimelineRestart: () => set((s) => ({ timelineRestartKey: s.timelineRestartKey + 1 })),

  timelineState: loadTimelineState(),
  setTimelineState: (update) => set((s) => {
    const nextState = typeof update === 'function' ? update(s.timelineState) : { ...s.timelineState, ...update };
    saveTimelineState(nextState);
    return { timelineState: nextState };
  }),
  resetTimelineState: () => set(() => {
    saveTimelineState(DEFAULT_TIMELINE_STATE);
    return { timelineState: DEFAULT_TIMELINE_STATE };
  }),

  pendingFileDialog: null,
  setPendingFileDialog: (d) => set({ pendingFileDialog: d }),
}));
