import { create } from 'zustand';
import { dataUrlToBase64 } from '../utils/projectFiles';
import { getCookie, setCookie } from '../utils/cookies';

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
  applyPseudoStyle: (pseudo: string, property: string, value: string) => void;
  collectPseudoStyles: (pseudo: string) => Record<string, string>;
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
  fileId?: string;
}

export type AnimTrigger = 'load' | 'hover' | 'click' | 'scroll';

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

export interface EventBinding {
  id: string;
  target: string;
  event: string;
  customEvent?: string;
  action: 'playAnimation' | 'toggleClass' | 'showHide' | 'setAttribute' | 'snippet' | 'navigate' | 'dispatchEvent' | 'preventDefault' | 'stopPropagation';
  animationName?: string;
  animationDuration?: string;
  animationEasing?: string;
  className?: string;
  attrName?: string;
  attrValue?: string;
  snippet?: string;
  navigateUrl?: string;
  dispatchEventName?: string;
  enabled: boolean;
  optOnce?: boolean;
  optPassive?: boolean;
  optCapture?: boolean;
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

  pseudoState: string;
  setPseudoState: (v: string) => void;
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

  clearProject: () => void;

  eventBindings: EventBinding[];
  addEventBinding: (b: EventBinding) => void;
  removeEventBinding: (id: string) => void;
  updateEventBinding: (id: string, updates: Partial<EventBinding>) => void;
  setEventBindings: (bindings: EventBinding[]) => void;

  liveServer: boolean;
  setLiveServer: (v: boolean) => void;

  autoSave: boolean;
  setAutoSave: (v: boolean) => void;

  unsavedFileIds: string[];
  markFileSaved: (id: string) => void;
  markAllSaved: () => void;
}

const DEFAULT_HTML = ``;
const DEFAULT_CSS = ``;
const DEFAULT_JS = ``;

/* ─────────────────────────────────────────────────────────────
   Default boilerplate templates for different languages
   ───────────────────────────────────────────────────────────── */
export const LANGUAGE_BOILERPLATES: Record<string, string> = {};

export function getDefaultContentForLanguage(language: string): string {
  return LANGUAGE_BOILERPLATES[language] || '';
}

export function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python',
    json: 'json',
    md: 'markdown', markdown: 'markdown',
    sh: 'shell', bash: 'shell',
    sql: 'sql',
    xml: 'xml',
    yml: 'yaml', yaml: 'yaml',
    txt: 'plaintext',
  };
  return langMap[ext] || 'plaintext';
}

const FILES_STORAGE_KEY    = 'html-editor-files-v1';
const FOLDERS_STORAGE_KEY  = 'html-editor-folders-v1';
const ACTIVE_FILE_KEY      = 'html-editor-active-file-v1';
const TIMELINE_STORAGE_KEY = 'html-editor-timeline-state-v1';
const EVENT_BINDINGS_STORAGE_KEY = 'html-editor-event-bindings-v1';
const USER_CONFIG_COOKIE_KEY = 'html-editor-user-config-v1';
const DEFAULT_TIMELINE_TRACKS: TimelineTrack[] = [];

const DEFAULT_TIMELINE_STATE: TimelineState = {
  tracks: DEFAULT_TIMELINE_TRACKS,
  playing: false,
  currentTime: 0,
  animationsApplied: false,
  customAnimations: [],
};

const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  preset: 'none',
  trigger: 'load',
  duration: '0.6s',
  easing: 'ease',
  delay: '0s',
  iteration: '1',
  direction: 'normal',
  fillMode: 'forwards',
  customKeyframes: '',
};

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  filePanel: true,
  propertiesPanel: true,
  timelinePanel: true,
  devtools: false,
  filesPanelWidth: 220,
  propertiesPanelWidth: 268,
  timelineHeight: 180,
  devtoolsHeight: 220,
};

interface UserConfigCookie {
  mode?: Mode;
  animationConfig?: Partial<AnimationConfig>;
  panels?: Partial<PanelConfig>;
  liveServer?: boolean;
  autoSave?: boolean;
}

/* ─── Files persistence ─── */
const DEFAULT_FILES: FileItem[] = [
  { id: 'index.html', name: 'index.html', type: 'html', content: DEFAULT_HTML },
  { id: 'styles.css', name: 'styles.css', type: 'css', content: DEFAULT_CSS },
  { id: 'script.js',  name: 'script.js',  type: 'js',  content: DEFAULT_JS  },
];

function isKnownStarterProject(files: FileItem[]): boolean {
  if (files.length !== 3) return false;
  const html = files.find(f => f.id === 'index.html' && f.type === 'html');
  const css = files.find(f => f.id === 'styles.css' && f.type === 'css');
  const js = files.find(f => f.id === 'script.js' && f.type === 'js');
  if (!html || !css || !js) return false;
  if (![html, css, js].every(f => !f.folder)) return false;

  const htmlMarkers = [
    'Build a sharper presence for your brand.',
    'Welcome to HTML Editor',
    'Build Amazing Websites',
  ];
  const jsMarkers = ['Brand starter ready', 'Page ready!'];
  return htmlMarkers.some(marker => html.content.includes(marker)) ||
    jsMarkers.some(marker => js.content.includes(marker));
}

function serializeFiles(files: FileItem[]): FileItem[] {
  return files.map(f => {
    if (f.type === 'image' && f.url?.startsWith('data:')) {
      return { ...f, content: f.content || dataUrlToBase64(f.url), url: undefined };
    }
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
    if (isKnownStarterProject(parsed)) {
      saveFiles(DEFAULT_FILES);
      saveActiveFile(DEFAULT_FILES[0].id);
      return DEFAULT_FILES;
    }
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

function saveEventBindings(bindings: EventBinding[]) {
  try {
    localStorage.setItem(EVENT_BINDINGS_STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // ignore quota/storage errors
  }
}

function loadEventBindings(): EventBinding[] {
  try {
    const raw = localStorage.getItem(EVENT_BINDINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EventBinding[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadUserConfigCookie(): UserConfigCookie {
  try {
    const raw = getCookie(USER_CONFIG_COOKIE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UserConfigCookie;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveUserConfigCookie(config: UserConfigCookie) {
  try {
    setCookie(USER_CONFIG_COOKIE_KEY, JSON.stringify(config));
  } catch {
    // Ignore invalid cookie or quota errors; the app still works with defaults.
  }
}

function patchUserConfigCookie(patch: UserConfigCookie) {
  saveUserConfigCookie({ ...loadUserConfigCookie(), ...patch });
}

const _initFiles = loadFiles();
const _initActiveFileId = loadActiveFile(_initFiles);
const _initFolders = loadFolders();
const _initUserConfig = loadUserConfigCookie();

export const useEditorStore = create<EditorStore>((set, get) => ({
  files: _initFiles,
  activeFileId: _initActiveFileId,

  addFile: (file) => set((s) => {
    const next = s.files.some(f => f.id === file.id)
      ? s.files.map(f => f.id === file.id ? file : f)
      : [...s.files, file];
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
    const autoSave = s.autoSave;
    const unsavedFileIds = autoSave
      ? s.unsavedFileIds.filter(uid => uid !== id)
      : s.unsavedFileIds.includes(id) ? s.unsavedFileIds : [...s.unsavedFileIds, id];
    return {
      files: next,
      unsavedFileIds,
      ...(autoSave ? { previewRefreshKey: s.previewRefreshKey + 1 } : {}),
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

  mode: _initUserConfig.mode ?? 'split',
  setMode: (mode) => {
    patchUserConfigCookie({ mode });
    set({ mode });
  },

  selectedSelector: null,
  setSelectedSelector: (selector) => set({ selectedSelector: selector }),

  selectedElement: null,
  setSelectedElement: (el) => set({ selectedElement: el }),

  visualBridge: null,
  setVisualBridge: (bridge) => set({ visualBridge: bridge }),

  applySelectedStyle: (property, value) => {
    const { visualBridge, pseudoState } = get();
    if (!visualBridge) return;
    if (!pseudoState) visualBridge.applyStyle(property, value);
    else if (pseudoState === ':hover') visualBridge.applyHoverStyle(property, value);
    else visualBridge.applyPseudoStyle(pseudoState, property, value);
  },

  applySelectedContent: (html) => {
    const bridge = get().visualBridge;
    if (!bridge) return;
    bridge.applyContent(html);
  },

  pseudoState: '',
  setPseudoState: (v) => {
    set({ pseudoState: v, hoverEditMode: v === ':hover' });
    get().visualBridge?.setHoverPreview(v === ':hover');
  },

  hoverEditMode: false,
  setHoverEditMode: (v) => {
    set({ hoverEditMode: v, pseudoState: v ? ':hover' : '' });
    get().visualBridge?.setHoverPreview(v);
  },

  animationConfig: { ...DEFAULT_ANIMATION_CONFIG, ..._initUserConfig.animationConfig },
  setAnimationConfig: (config) => set((s) => {
    const animationConfig = { ...s.animationConfig, ...config };
    patchUserConfigCookie({ animationConfig });
    return { animationConfig };
  }),

  panels: { ...DEFAULT_PANEL_CONFIG, ..._initUserConfig.panels },
  setPanels: (panels) => set((s) => {
    const nextPanels = { ...s.panels, ...panels };
    patchUserConfigCookie({ panels: nextPanels });
    return { panels: nextPanels };
  }),

  consoleEntries: [],
  addConsoleEntry: (entry) => set((s) => ({
    consoleEntries: [...s.consoleEntries.slice(-300), { ...entry, id: Math.random().toString(36) }],
  })),
  clearConsole: () => set({ consoleEntries: [] }),

  previewTabs: [{ id: 'tab-1', title: 'Brand', favicon: '', active: true, previewType: 'page', fileId: 'index.html' }],
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
      fileId: opts?.fileId,
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

  clearProject: () => set((s) => {
    const newFiles: FileItem[] = DEFAULT_FILES.map(f => ({ ...f }));
    saveFiles(newFiles);
    saveActiveFile(newFiles[0].id);
    const clearedTimeline: TimelineState = { ...DEFAULT_TIMELINE_STATE };
    saveTimelineState(clearedTimeline);
    saveFolders([]);
    saveEventBindings([]);
    return {
      files: newFiles,
      activeFileId: newFiles[0].id,
      folders: [],
      previewRefreshKey: s.previewRefreshKey + 1,
      timelineState: clearedTimeline,
      timelineAnimationStyle: '',
      eventBindings: [],
    };
  }),

  eventBindings: loadEventBindings(),
  addEventBinding: (b) => set((s) => {
    const next = [...s.eventBindings, b];
    saveEventBindings(next);
    return { eventBindings: next };
  }),
  removeEventBinding: (id) => set((s) => {
    const next = s.eventBindings.filter(binding => binding.id !== id);
    saveEventBindings(next);
    return { eventBindings: next };
  }),
  updateEventBinding: (id, updates) => set((s) => {
    const next = s.eventBindings.map(binding => binding.id === id ? { ...binding, ...updates } : binding);
    saveEventBindings(next);
    return { eventBindings: next };
  }),
  setEventBindings: (bindings) => {
    saveEventBindings(bindings);
    set({ eventBindings: bindings });
  },

  liveServer: _initUserConfig.liveServer ?? true,
  setLiveServer: (v) => {
    patchUserConfigCookie({ liveServer: v });
    set({ liveServer: v });
  },

  autoSave: _initUserConfig.autoSave ?? true,
  setAutoSave: (v) => {
    patchUserConfigCookie({ autoSave: v });
    set({ autoSave: v });
  },

  unsavedFileIds: [],
  markFileSaved: (id) => set((s) => ({
    unsavedFileIds: s.unsavedFileIds.filter(uid => uid !== id),
    previewRefreshKey: s.previewRefreshKey + 1,
  })),
  markAllSaved: () => set((s) => ({
    unsavedFileIds: [],
    previewRefreshKey: s.previewRefreshKey + 1,
  })),
}));
