import { create } from 'zustand';
import { dataUrlToBase64 } from '../utils/projectFiles';
import { getCookie, setCookie } from '../utils/cookies';
import { getWebContainer, WC_META_PATH, scanWCFilesystem } from '../utils/webcontainer';

export interface FileItem {
  id: string;
  name: string;
  type: 'html' | 'css' | 'js' | 'image' | 'other';
  content: string;
  url?: string;
  mimeType?: string;
  folder?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
}

export interface PortInfo {
  port: number;
  pid?: number;
  command?: string;
  status: 'running' | 'stopped';
  url: string;
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
export type VisualPreviewDevice = 'desktop' | 'tablet' | 'mobile' | 'custom';

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

  folders: FolderItem[];
  addFolder: (name: string, parentId?: string | null) => void;
  removeFolder: (folderId: string) => void;
  renameFolder: (folderId: string, newName: string) => void;
  moveFolder: (folderId: string, newParentId: string | null) => void;

  ports: PortInfo[];
  addPort: (port: PortInfo) => void;
  removePort: (port: number) => void;
  updatePort: (port: number, updates: Partial<PortInfo>) => void;

  mode: Mode;
  setMode: (mode: Mode) => void;

  selectedSelector: string | null;
  setSelectedSelector: (selector: string | null) => void;

  selectedElement: SelectedElement | null;
  setSelectedElement: (el: SelectedElement | null) => void;

  visualPreviewDevice: VisualPreviewDevice;
  setVisualPreviewDevice: (device: VisualPreviewDevice) => void;

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

  wcBootStatus: 'idle' | 'booting' | 'ready' | 'failed';
  initFromWebContainer: () => Promise<void>;
}

const DEFAULT_HTML = ``;
const DEFAULT_CSS = ``;
const DEFAULT_JS = ``;

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

/* ─────────────────────────────────────────────────────────────
   WebContainer Real Filesystem Persistence
   ─────────────────────────────────────────────────────────────
   Files are stored as actual files at their real paths inside
   the WebContainer virtual filesystem (e.g. /index.html,
   /src/App.tsx). The WC FS persists across page reloads via
   the browser's built-in storage (managed by WebContainer).

   Non-file state (active file, timeline, event bindings, and
   binary/image files) is kept in a single hidden metadata file
   at /.editor-meta.json.

   UI preferences (mode, panels, etc.) remain in cookies since
   they are session-level config, not project data.
   ───────────────────────────────────────────────────────────── */

/** Metadata stored alongside the real files in WC FS. */
interface WCMeta {
  activeFileId: string | null;
  timelineState: TimelineState;
  eventBindings: EventBinding[];
  /** Image files (binary) cannot live as text on the real FS, so kept here. */
  imageFiles: FileItem[];
}

const USER_CONFIG_COOKIE_KEY = 'html-editor-user-config-v1';

const DEFAULT_TIMELINE_STATE: TimelineState = {
  tracks: [],
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
  visualPreviewDevice?: VisualPreviewDevice;
  animationConfig?: Partial<AnimationConfig>;
  panels?: Partial<PanelConfig>;
  liveServer?: boolean;
  autoSave?: boolean;
}

const DEFAULT_FILES: FileItem[] = [
  { id: 'index.html', name: 'index.html', type: 'html', content: DEFAULT_HTML },
  { id: 'styles.css', name: 'styles.css', type: 'css',  content: DEFAULT_CSS  },
  { id: 'script.js',  name: 'script.js',  type: 'js',   content: DEFAULT_JS   },
];

/* ─── Cookie helpers (UI config only) ─── */

function loadUserConfigCookie(): UserConfigCookie {
  try {
    const raw = getCookie(USER_CONFIG_COOKIE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UserConfigCookie;
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch { return {}; }
}

function saveUserConfigCookie(config: UserConfigCookie) {
  try { setCookie(USER_CONFIG_COOKIE_KEY, JSON.stringify(config)); } catch {}
}

function patchUserConfigCookie(patch: UserConfigCookie) {
  saveUserConfigCookie({ ...loadUserConfigCookie(), ...patch });
}

const _initUserConfig = loadUserConfigCookie();

/* ─── Real FS helpers ─── */

function fileToWCPath(file: Pick<FileItem, 'name' | 'folder'>): string {
  return file.folder ? `/${file.folder}/${file.name}` : `/${file.name}`;
}

async function ensureWCDirs(
  instance: Awaited<ReturnType<typeof getWebContainer>>,
  folderPath: string,
): Promise<void> {
  const parts = folderPath.split('/').filter(Boolean);
  let cur = '';
  for (const part of parts) {
    cur += '/' + part;
    try { await instance.fs.mkdir(cur); } catch { /* exists */ }
  }
}

async function writeFileToWC(file: FileItem): Promise<void> {
  if (file.type === 'image') return; // images stored in metadata
  try {
    const instance = await getWebContainer();
    if (file.folder) await ensureWCDirs(instance, file.folder);
    await instance.fs.writeFile(fileToWCPath(file), file.content ?? '');
  } catch { /* WC not ready or not cross-origin isolated */ }
}

const _fileWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();
function debouncedWriteFileToWC(file: FileItem) {
  const existing = _fileWriteTimers.get(file.id);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    writeFileToWC(file);
    _fileWriteTimers.delete(file.id);
  }, 800);
  _fileWriteTimers.set(file.id, t);
}

async function deleteFileFromWC(file: FileItem): Promise<void> {
  if (file.type === 'image') return;
  try {
    const instance = await getWebContainer();
    await instance.fs.rm(fileToWCPath(file));
  } catch { /* WC not ready or file not found */ }
}

async function createFolderInWC(folderId: string): Promise<void> {
  try {
    const instance = await getWebContainer();
    await ensureWCDirs(instance, folderId);
  } catch { /* WC not ready */ }
}

async function deleteFolderFromWC(folderId: string): Promise<void> {
  try {
    const instance = await getWebContainer();
    await instance.fs.rm('/' + folderId, { recursive: true });
  } catch { /* WC not ready or not found */ }
}

async function copyWCDir(
  instance: Awaited<ReturnType<typeof getWebContainer>>,
  srcPath: string,
  dstPath: string,
): Promise<void> {
  try { await instance.fs.mkdir(dstPath); } catch { /* exists */ }
  let entries: { name: string; isFile: () => boolean; isDirectory: () => boolean }[] = [];
  try {
    entries = await instance.fs.readdir(srcPath, { withFileTypes: true }) as typeof entries;
  } catch { return; }
  for (const entry of entries) {
    const src = srcPath + '/' + entry.name;
    const dst = dstPath + '/' + entry.name;
    if (entry.isDirectory()) {
      await copyWCDir(instance, src, dst);
    } else {
      try {
        const content = await instance.fs.readFile(src, 'utf-8') as string;
        await instance.fs.writeFile(dst, content);
      } catch { /* binary file — skip */ }
    }
  }
}

async function moveWCDir(oldId: string, newId: string): Promise<void> {
  try {
    const instance = await getWebContainer();
    await copyWCDir(instance, '/' + oldId, '/' + newId);
    await instance.fs.rm('/' + oldId, { recursive: true });
  } catch { /* WC not ready */ }
}

async function moveFileInWC(
  oldFile: Pick<FileItem, 'name' | 'folder' | 'type'>,
  newFile: Pick<FileItem, 'name' | 'folder' | 'type' | 'content'>,
): Promise<void> {
  if (oldFile.type === 'image') return;
  try {
    const instance = await getWebContainer();
    const oldPath = fileToWCPath(oldFile);
    const newPath = fileToWCPath(newFile);
    if (oldPath === newPath) return;
    if (newFile.folder) await ensureWCDirs(instance, newFile.folder);
    await instance.fs.writeFile(newPath, newFile.content ?? '');
    await instance.fs.rm(oldPath);
  } catch { /* WC not ready */ }
}

/* ─── Metadata helpers ─── */

let _metaSaveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSaveMeta(meta: WCMeta) {
  if (_metaSaveTimer) clearTimeout(_metaSaveTimer);
  _metaSaveTimer = setTimeout(async () => {
    try {
      const instance = await getWebContainer();
      await instance.fs.writeFile(WC_META_PATH, JSON.stringify({
        ...meta,
        imageFiles: meta.imageFiles.map(f => {
          if (f.url?.startsWith('data:')) return { ...f, content: f.content || dataUrlToBase64(f.url), url: undefined };
          if (f.url?.startsWith('blob:')) return { ...f, url: undefined };
          return f;
        }),
      }));
    } catch { /* WC not ready */ }
    _metaSaveTimer = null;
  }, 500);
}

async function saveMetaImmediate(meta: WCMeta): Promise<void> {
  try {
    const instance = await getWebContainer();
    await instance.fs.writeFile(WC_META_PATH, JSON.stringify(meta));
  } catch { /* WC not ready */ }
}

function buildMeta(s: Pick<EditorStore, 'activeFileId' | 'timelineState' | 'eventBindings' | 'files'>): WCMeta {
  return {
    activeFileId: s.activeFileId,
    timelineState: s.timelineState,
    eventBindings: s.eventBindings,
    imageFiles: s.files.filter(f => f.type === 'image'),
  };
}

/* ─── Store ─── */

export const useEditorStore = create<EditorStore>((set, get) => ({
  /* Start with defaults in memory — real data loads once WC boots via initFromWebContainer() */
  files: DEFAULT_FILES,
  activeFileId: DEFAULT_FILES[0].id,

  addFile: (file) => set((s) => {
    const next = s.files.some(f => f.id === file.id)
      ? s.files.map(f => f.id === file.id ? file : f)
      : [...s.files, file];
    // Write to real WC FS (images go into metadata)
    if (file.type === 'image') {
      debouncedSaveMeta(buildMeta({ ...s, files: next }));
    } else {
      writeFileToWC(file);
    }
    return { files: next };
  }),

  removeFile: (id) => set((s) => {
    const fileToRemove = s.files.find(f => f.id === id);
    const next = s.files.filter(f => f.id !== id);
    const nextActive = s.activeFileId === id
      ? (next.find(f => f.id !== id)?.id ?? next[0]?.id ?? null)
      : s.activeFileId;

    const nextTabs = s.previewTabs.filter(t => t.fileId !== id && t.imageFileId !== id);
    let nextActiveTabId = s.activePreviewTabId;
    if (nextTabs.length === 0) {
      nextTabs.push({ id: 'tab-1', title: 'Brand', favicon: '', active: true, previewType: 'page', fileId: 'index.html' });
      nextActiveTabId = 'tab-1';
    } else if (!nextTabs.find(t => t.id === s.activePreviewTabId)) {
      nextActiveTabId = nextTabs[nextTabs.length - 1].id;
    }

    const updatedTabs = nextTabs.map(t => ({ ...t, active: t.id === nextActiveTabId }));

    // Remove from real WC FS
    if (fileToRemove) deleteFileFromWC(fileToRemove);
    debouncedSaveMeta(buildMeta({ ...s, files: next, activeFileId: nextActive }));

    return {
      files: next,
      activeFileId: nextActive,
      previewTabs: updatedTabs,
      activePreviewTabId: nextActiveTabId,
    };
  }),

  updateFileContent: (id, content) => set((s) => {
    const next = s.files.map(f => f.id === id ? { ...f, content } : f);
    const updatedFile = next.find(f => f.id === id);
    const autoSave = s.autoSave;

    // Write to real WC FS (debounced for performance)
    if (updatedFile) debouncedWriteFileToWC(updatedFile);

    const unsavedFileIds = autoSave
      ? s.unsavedFileIds.filter(uid => uid !== id)
      : s.unsavedFileIds.includes(id) ? s.unsavedFileIds : [...s.unsavedFileIds, id];

    return {
      files: next,
      unsavedFileIds,
      ...(autoSave ? { previewRefreshKey: s.previewRefreshKey + 1 } : {}),
    };
  }),

  setActiveFile: (id) => {
    const s = get();
    debouncedSaveMeta(buildMeta({ ...s, activeFileId: id }));
    set({ activeFileId: id });
  },

  moveFileToFolder: (fileId, folder) => set((s) => {
    const oldFile = s.files.find(f => f.id === fileId);
    const newId = folder ? `${folder}/${oldFile?.name ?? fileId}` : (oldFile?.name ?? fileId);
    const next = s.files.map(f => {
      if (f.id !== fileId) return f;
      const updated = { ...f, folder, id: newId };
      // Move file in WC FS
      if (oldFile) moveFileInWC(oldFile, updated);
      return updated;
    });
    debouncedSaveMeta(buildMeta({ ...s, files: next }));
    return { files: next };
  }),

  folders: [],

  addFolder: (name, parentId = null) => set((s) => {
    const id = parentId ? `${parentId}/${name}` : name;
    if (s.folders.some(f => f.id === id)) return s;
    const newFolder: FolderItem = { id, name, parentId };
    const next = [...s.folders, newFolder];
    // Create real directory in WC FS
    createFolderInWC(id);
    return { folders: next };
  }),

  removeFolder: (folderId) => set((s) => {
    const getAllSubfolderIds = (parentId: string): string[] => {
      const children = s.folders.filter(f => f.parentId === parentId).map(f => f.id);
      return children.flatMap(id => [id, ...getAllSubfolderIds(id)]);
    };
    const toDelete = new Set([folderId, ...getAllSubfolderIds(folderId)]);
    const nextFolders = s.folders.filter(f => !toDelete.has(f.id));
    const nextFiles = s.files.filter(
      f => !toDelete.has(f.folder ?? '') && !Array.from(toDelete).some(d => f.folder?.startsWith(d + '/'))
    );
    // Delete real directory (recursive) in WC FS
    deleteFolderFromWC(folderId);
    debouncedSaveMeta(buildMeta({ ...s, files: nextFiles }));
    return { folders: nextFolders, files: nextFiles };
  }),

  renameFolder: (folderId, newName) => set((s) => {
    const folder = s.folders.find(f => f.id === folderId);
    if (!folder) return s;
    const newId = folder.parentId ? `${folder.parentId}/${newName}` : newName;

    const nextFolders = s.folders.map(f => {
      if (f.id === folderId) return { ...f, id: newId, name: newName };
      if (f.id.startsWith(folderId + '/')) {
        const newChildId = newId + f.id.slice(folderId.length);
        const newParentId = f.parentId === folderId ? newId :
          (f.parentId?.startsWith(folderId + '/') ? newId + f.parentId.slice(folderId.length) : f.parentId);
        return { ...f, id: newChildId, parentId: newParentId };
      }
      if (f.parentId === folderId) return { ...f, parentId: newId };
      return f;
    });

    const nextFiles = s.files.map(f => {
      if (!f.folder) return f;
      if (f.folder === folderId) return { ...f, folder: newId, id: newId + '/' + f.name };
      if (f.folder.startsWith(folderId + '/')) {
        const newFolder = newId + f.folder.slice(folderId.length);
        return { ...f, folder: newFolder, id: newFolder + '/' + f.name };
      }
      return f;
    });

    // Move the directory in real WC FS (copy + delete)
    moveWCDir(folderId, newId);

    return { folders: nextFolders, files: nextFiles };
  }),

  moveFolder: (folderId, newParentId) => set((s) => {
    const folder = s.folders.find(f => f.id === folderId);
    if (!folder) return s;

    const isDescendant = (potentialParent: string, ofFolder: string): boolean => {
      if (potentialParent === ofFolder) return true;
      const parent = s.folders.find(f => f.id === potentialParent);
      if (!parent?.parentId) return false;
      return isDescendant(parent.parentId, ofFolder);
    };
    if (newParentId && isDescendant(newParentId, folderId)) {
      console.warn('Cannot move folder into its own descendant');
      return s;
    }

    const newId = newParentId ? `${newParentId}/${folder.name}` : folder.name;
    const oldId = folderId;

    const nextFolders = s.folders.map(f => {
      if (f.id === oldId) return { ...f, id: newId, parentId: newParentId };
      if (f.id.startsWith(oldId + '/')) {
        return { ...f,
          id: newId + f.id.slice(oldId.length),
          parentId: f.parentId === oldId ? newId : newId + (f.parentId?.slice(oldId.length) ?? ''),
        };
      }
      return f;
    });

    const nextFiles = s.files.map(f => {
      if (!f.folder) return f;
      if (f.folder === oldId) return { ...f, folder: newId, id: newId + '/' + f.name };
      if (f.folder.startsWith(oldId + '/')) {
        const newFolder = newId + f.folder.slice(oldId.length);
        return { ...f, folder: newFolder, id: newFolder + '/' + f.name };
      }
      return f;
    });

    // Move the directory in real WC FS
    moveWCDir(oldId, newId);

    return { folders: nextFolders, files: nextFiles };
  }),

  ports: [],
  addPort: (port) => set((s) => ({ ports: [...s.ports.filter(p => p.port !== port.port), port] })),
  removePort: (port) => set((s) => ({ ports: s.ports.filter(p => p.port !== port) })),
  updatePort: (port, updates) => set((s) => ({
    ports: s.ports.map(p => p.port === port ? { ...p, ...updates } : p),
  })),

  mode: _initUserConfig.mode ?? 'split',
  setMode: (mode) => { patchUserConfigCookie({ mode }); set({ mode }); },

  visualPreviewDevice: _initUserConfig.visualPreviewDevice ?? 'desktop',
  setVisualPreviewDevice: (device) => { patchUserConfigCookie({ visualPreviewDevice: device }); set({ visualPreviewDevice: device }); },

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
    get().visualBridge?.applyContent(html);
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
    const next = { ...s.panels, ...panels };
    patchUserConfigCookie({ panels: next });
    return { panels: next };
  }),

  consoleEntries: [],
  addConsoleEntry: (entry) => set((s) => {
    const next = [...s.consoleEntries, { ...entry, id: Math.random().toString(36).slice(2) }];
    if (next.length > 1000) next.shift();
    return { consoleEntries: next };
  }),
  clearConsole: () => set({ consoleEntries: [] }),

  previewTabs: [{ id: 'tab-1', title: 'Brand', favicon: '', active: true, previewType: 'page', fileId: 'index.html' }],
  activePreviewTabId: 'tab-1',
  addPreviewTab: (opts) => {
    const { previewTabs } = get();
    const existing = previewTabs.find(t =>
      (opts?.fileId && t.fileId === opts.fileId) ||
      (opts?.imageFileId && t.imageFileId === opts.imageFileId)
    );
    if (existing) {
      set((s) => ({
        previewTabs: s.previewTabs.map(t => ({ ...t, active: t.id === existing.id })),
        activePreviewTabId: existing.id,
      }));
      return;
    }
    const id = `tab-${Date.now()}`;
    const newTab: PreviewTab = {
      id, title: opts?.title ?? 'New Tab', favicon: '', active: true,
      previewType: opts?.previewType ?? 'page',
      imageFileId: opts?.imageFileId, fileId: opts?.fileId,
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
    const currentMsg = msg;
    setTimeout(() => { set((s) => s.notification === currentMsg ? { notification: null } : {}); }, 2800);
  },

  previewRefreshKey: 0,
  refreshPreview: () => set((s) => ({ previewRefreshKey: s.previewRefreshKey + 1 })),

  timelineAnimationStyle: '',
  setTimelineAnimationStyle: (css) => set({ timelineAnimationStyle: css }),

  timelineRestartKey: 0,
  triggerTimelineRestart: () => set((s) => ({ timelineRestartKey: s.timelineRestartKey + 1 })),

  timelineState: DEFAULT_TIMELINE_STATE,
  setTimelineState: (update) => set((s) => {
    const nextState = typeof update === 'function' ? update(s.timelineState) : { ...s.timelineState, ...update };
    debouncedSaveMeta(buildMeta({ ...s, timelineState: nextState }));
    return { timelineState: nextState };
  }),
  resetTimelineState: () => set((s) => {
    debouncedSaveMeta(buildMeta({ ...s, timelineState: DEFAULT_TIMELINE_STATE }));
    return { timelineState: DEFAULT_TIMELINE_STATE };
  }),

  pendingFileDialog: null,
  setPendingFileDialog: (d) => set({ pendingFileDialog: d }),

  clearProject: () => set((s) => {
    const newFiles: FileItem[] = DEFAULT_FILES.map(f => ({ ...f }));
    const clearedTimeline: TimelineState = { ...DEFAULT_TIMELINE_STATE };

    // Delete all existing user files from WC FS, then write defaults
    (async () => {
      try {
        const instance = await getWebContainer();
        // Remove old files from WC FS
        for (const f of s.files) {
          if (f.type !== 'image') {
            try { await instance.fs.rm(fileToWCPath(f)); } catch {}
          }
        }
        // Remove old folders
        for (const folder of s.folders) {
          if (!folder.parentId) {
            try { await instance.fs.rm('/' + folder.id, { recursive: true }); } catch {}
          }
        }
        // Write default files
        for (const f of newFiles) {
          await instance.fs.writeFile(fileToWCPath(f), f.content ?? '');
        }
        // Update metadata
        await saveMetaImmediate({
          activeFileId: newFiles[0].id,
          timelineState: clearedTimeline,
          eventBindings: [],
          imageFiles: [],
        });
      } catch { /* WC not ready */ }
    })();

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

  eventBindings: [],
  addEventBinding: (b) => set((s) => {
    const next = [...s.eventBindings, b];
    debouncedSaveMeta(buildMeta({ ...s, eventBindings: next }));
    return { eventBindings: next };
  }),
  removeEventBinding: (id) => set((s) => {
    const next = s.eventBindings.filter(binding => binding.id !== id);
    debouncedSaveMeta(buildMeta({ ...s, eventBindings: next }));
    return { eventBindings: next };
  }),
  updateEventBinding: (id, updates) => set((s) => {
    const next = s.eventBindings.map(binding => binding.id === id ? { ...binding, ...updates } : binding);
    debouncedSaveMeta(buildMeta({ ...s, eventBindings: next }));
    return { eventBindings: next };
  }),
  setEventBindings: (bindings) => {
    const s = get();
    debouncedSaveMeta(buildMeta({ ...s, eventBindings: bindings }));
    set({ eventBindings: bindings });
  },

  liveServer: _initUserConfig.liveServer ?? true,
  setLiveServer: (v) => { patchUserConfigCookie({ liveServer: v }); set({ liveServer: v }); },

  autoSave: _initUserConfig.autoSave ?? true,
  setAutoSave: (v) => {
    patchUserConfigCookie({ autoSave: v });
    set((s) => {
      if (v) {
        // Flush any unsaved files to WC FS
        s.files.filter(f => s.unsavedFileIds.includes(f.id)).forEach(f => writeFileToWC(f));
      }
      return { autoSave: v, unsavedFileIds: v ? [] : s.unsavedFileIds };
    });
  },

  unsavedFileIds: [],
  markFileSaved: (id) => set((s) => {
    // Immediately flush this file to WC FS
    const file = s.files.find(f => f.id === id);
    if (file) writeFileToWC(file);
    return {
      unsavedFileIds: s.unsavedFileIds.filter(uid => uid !== id),
      previewRefreshKey: s.previewRefreshKey + 1,
    };
  }),
  markAllSaved: () => set((s) => {
    // Flush all unsaved files to WC FS
    s.files.filter(f => s.unsavedFileIds.includes(f.id)).forEach(f => writeFileToWC(f));
    return {
      unsavedFileIds: [],
      previewRefreshKey: s.previewRefreshKey + 1,
    };
  }),

  /* ── WebContainer Real FS initialization ── */
  wcBootStatus: 'idle',
  initFromWebContainer: async () => {
    set({ wcBootStatus: 'booting' });
    try {
      const instance = await getWebContainer();

      // Read metadata (non-file state)
      let meta: WCMeta = {
        activeFileId: null,
        timelineState: DEFAULT_TIMELINE_STATE,
        eventBindings: [],
        imageFiles: [],
      };
      try {
        const rawMeta = await instance.fs.readFile(WC_META_PATH, 'utf-8') as string;
        const parsed = JSON.parse(rawMeta) as Partial<WCMeta>;
        meta = {
          activeFileId: parsed.activeFileId ?? null,
          timelineState: parsed.timelineState ?? DEFAULT_TIMELINE_STATE,
          eventBindings: Array.isArray(parsed.eventBindings) ? parsed.eventBindings : [],
          imageFiles: Array.isArray(parsed.imageFiles) ? parsed.imageFiles : [],
        };
      } catch { /* no metadata yet — first run */ }

      // Scan real WC FS for all text files and directories
      const scan = await scanWCFilesystem();

      if (scan.files.length === 0) {
        // Fresh WC FS — seed with default project files
        for (const f of DEFAULT_FILES) {
          await instance.fs.writeFile(fileToWCPath(f), f.content ?? '');
        }
        meta.activeFileId = DEFAULT_FILES[0].id;
        await saveMetaImmediate(meta);

        set({
          files: [...DEFAULT_FILES, ...meta.imageFiles],
          folders: [],
          activeFileId: DEFAULT_FILES[0].id,
          timelineState: meta.timelineState,
          eventBindings: meta.eventBindings,
          wcBootStatus: 'ready',
        });
        return;
      }

      // Merge text files from real FS + image files from metadata
      const allFiles = [...scan.files, ...meta.imageFiles];
      const activeFileId = (meta.activeFileId && allFiles.find(f => f.id === meta.activeFileId))
        ? meta.activeFileId
        : allFiles[0]?.id ?? null;

      set({
        files: allFiles,
        folders: scan.folders,
        activeFileId,
        timelineState: meta.timelineState,
        eventBindings: meta.eventBindings,
        wcBootStatus: 'ready',
      });
    } catch (e) {
      // WC unavailable (no cross-origin isolation, etc.) — fall back to in-memory defaults
      console.warn('[EditorStore] WebContainer real FS unavailable:', e);
      set({ wcBootStatus: 'failed' });
    }
  },
}));
