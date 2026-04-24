import { create } from 'zustand';

export interface FileItem {
  id: string;
  name: string;
  type: 'html' | 'css' | 'js' | 'image' | 'other';
  content: string;
  url?: string;
  mimeType?: string;
  folder?: string;
}

export interface SelectedElement {
  tagName: string;
  id: string;
  className: string;
  styles: Record<string, string>;
  hoverStyles?: Record<string, string>;
  innerHTML: string;
  textContent: string;
}

type VisualBridge = {
  applyStyle: (property: string, value: string) => void;
  applyHoverStyle: (property: string, value: string) => void;
  applyContent: (html: string) => void;
  setHoverPreview: (on: boolean) => void;
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

export type AnimTrigger = 'load' | 'hover' | 'click';

export interface TimelineTrack {
  id: string;
  element: string;
  animation: string;
  duration: number;
  delay: number;
  color: string;
  easing: string;
  iteration: string;
  trigger?: AnimTrigger;
}

export interface CustomAnimation {
  name: string;
  keyframes: string;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  playing: boolean;
  currentTime: number;
  animationsApplied: boolean;
  customAnimations: CustomAnimation[];
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

  hoverEditMode: boolean;
  setHoverEditMode: (v: boolean) => void;

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
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="header">
    <h1>Welcome to HTML Editor</h1>
    <nav>
      <a href="#">Home</a>
      <a href="#">About</a>
      <a href="#">Contact</a>
    </nav>
  </header>

  <main class="main">
    <section class="hero">
      <h2>Build Amazing Websites</h2>
      <p>Switch to <strong>Visual mode</strong> to design your page like Photoshop — click any element to select, drag to move, use handles to resize and rotate.</p>
      <button class="btn" onclick="alert('Hello from your page!')">Get Started</button>
    </section>

    <section class="features">
      <div class="card">
        <h3>Code Editor</h3>
        <p>Full Monaco editor with syntax highlighting, autocomplete, and formatting for HTML, CSS, and JS.</p>
      </div>
      <div class="card">
        <h3>Visual Editor</h3>
        <p>Click any element to select it, drag to reposition, and use the properties panel to style it.</p>
      </div>
      <div class="card">
        <h3>Live Preview</h3>
        <p>See your changes instantly. Export as ZIP or copy to clipboard when you're done.</p>
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>&copy; 2024 My Website. Built with HTML Editor.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>`;

const DEFAULT_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #333;
  line-height: 1.6;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 40px;
  background: #1a1a2e;
  color: white;
}
.header h1 { font-size: 1.4rem; font-weight: 700; }
nav a {
  color: rgba(255,255,255,0.75);
  text-decoration: none;
  margin-left: 24px;
  font-size: 0.9rem;
  transition: color 0.2s;
}
nav a:hover { color: #f0a500; }

/* Hero */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 80px 40px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  min-height: 50vh;
  justify-content: center;
}
.hero h2 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 16px;
  background: linear-gradient(90deg, #f0a500, #e94560);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero p {
  font-size: 1.1rem;
  color: rgba(255,255,255,0.75);
  max-width: 560px;
  margin-bottom: 36px;
}
.btn {
  padding: 14px 36px;
  background: #f0a500;
  color: #1a1a2e;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(240,165,0,0.4);
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  padding: 60px 40px;
  background: #f8f9fa;
}
.card {
  background: white;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: #1a1a2e;
}
.card p { color: #666; font-size: 0.9rem; }

/* Footer */
.footer {
  text-align: center;
  padding: 24px;
  background: #1a1a2e;
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
}
`;

const DEFAULT_JS = `// JavaScript is live — edits here run instantly in preview
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page ready!');

  // Animate cards on scroll
  const cards = document.querySelectorAll('.card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 100);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    observer.observe(card);
  });
});
`;

const FILES_STORAGE_KEY    = 'html-editor-files-v1';
const FOLDERS_STORAGE_KEY  = 'html-editor-folders-v1';
const ACTIVE_FILE_KEY      = 'html-editor-active-file-v1';
const TIMELINE_STORAGE_KEY = 'html-editor-timeline-state-v1';
const DEFAULT_TIMELINE_TRACKS: TimelineTrack[] = [
  { id: '1', element: '.hero', animation: 'fadeIn', duration: 1.2, delay: 0, color: '#e5a45a', easing: 'ease', iteration: '1' },
  { id: '2', element: 'h2', animation: 'slideUp', duration: 0.8, delay: 0.3, color: '#4ec9b0', easing: 'ease', iteration: '1' },
  { id: '3', element: '.btn', animation: 'zoom', duration: 0.5, delay: 0.8, color: '#9cdcfe', easing: 'ease', iteration: '1' },
  { id: '4', element: '.card', animation: 'fadeIn', duration: 0.6, delay: 1.0, color: '#dcdcaa', easing: 'ease', iteration: '1' },
];

const DEFAULT_TIMELINE_STATE: TimelineState = {
  tracks: DEFAULT_TIMELINE_TRACKS,
  playing: false,
  currentTime: 0,
  animationsApplied: false,
  customAnimations: [],
};

/* ─── Files persistence ─── */
const DEFAULT_FILES: FileItem[] = [
  { id: 'index.html', name: 'index.html', type: 'html', content: DEFAULT_HTML },
  { id: 'styles.css', name: 'styles.css', type: 'css', content: DEFAULT_CSS },
  { id: 'script.js',  name: 'script.js',  type: 'js',  content: DEFAULT_JS  },
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
    if (!raw) return DEFAULT_FILES;
    const parsed = JSON.parse(raw) as FileItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FILES;
    return parsed;
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
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
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
      customAnimations: Array.isArray(parsed.customAnimations) ? parsed.customAnimations : [],
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
    const { visualBridge, hoverEditMode } = get();
    if (!visualBridge) return;
    if (hoverEditMode) visualBridge.applyHoverStyle(property, value);
    else visualBridge.applyStyle(property, value);
  },

  applySelectedContent: (html) => {
    const bridge = get().visualBridge;
    if (!bridge) return;
    bridge.applyContent(html);
  },

  hoverEditMode: false,
  setHoverEditMode: (v) => {
    set({ hoverEditMode: v });
    get().visualBridge?.setHoverPreview(v);
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
