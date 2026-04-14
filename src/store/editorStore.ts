import { create } from 'zustand';

export interface FileItem {
  id: string;
  name: string;
  type: 'html' | 'css' | 'js' | 'image' | 'other';
  content: string;
  url?: string;
  mimeType?: string;
}

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

interface EditorStore {
  files: FileItem[];
  activeFileId: string | null;
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string) => void;

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

export const useEditorStore = create<EditorStore>((set, get) => ({
  files: [
    { id: 'index.html', name: 'index.html', type: 'html', content: DEFAULT_HTML },
    { id: 'styles.css', name: 'styles.css', type: 'css', content: DEFAULT_CSS },
    { id: 'script.js', name: 'script.js', type: 'js', content: DEFAULT_JS },
  ],
  activeFileId: 'index.html',

  addFile: (file) => set((s) => ({ files: [...s.files, file] })),
  removeFile: (id) => set((s) => ({
    files: s.files.filter(f => f.id !== id),
    activeFileId: s.activeFileId === id ? (s.files.find(f => f.id !== id)?.id ?? null) : s.activeFileId,
  })),
  updateFileContent: (id, content) => set((s) => ({
    files: s.files.map(f => f.id === id ? { ...f, content } : f),
    previewRefreshKey: s.previewRefreshKey + 1,
  })),
  setActiveFile: (id) => set({ activeFileId: id }),

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

  pendingFileDialog: null,
  setPendingFileDialog: (d) => set({ pendingFileDialog: d }),
}));
