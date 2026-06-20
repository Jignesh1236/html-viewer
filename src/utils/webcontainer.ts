import { WebContainer } from '@webcontainer/api';
import type { FileItem, FolderItem } from '../store/editorStore';

/* ─── Singleton ─────────────────────────────────────────── */
let wc: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export type WCStatus = 'idle' | 'booting' | 'ready' | 'error';

interface WCListeners {
  onStatusChange?: (s: WCStatus) => void;
  onPortReady?: (port: number, url: string) => void;
  onPortClose?: (port: number) => void;
  onLog?: (msg: string) => void;
}

const listeners: WCListeners = {};
let currentStatus: WCStatus = 'idle';

function setStatus(s: WCStatus) {
  currentStatus = s;
  listeners.onStatusChange?.(s);
}

export function getWCStatus(): WCStatus { return currentStatus; }

export function registerWCListeners(l: WCListeners) {
  Object.assign(listeners, l);
}

export function checkCrossOriginIsolation(): { ok: boolean; message: string } {
  if (!crossOriginIsolated) {
    return {
      ok: false,
      message: 'Page is not cross-origin isolated (SharedArrayBuffer unavailable). ' +
        'Open the app in a standalone tab (click the ↗ external link button) — ' +
        'WebContainer requires COOP + COEP headers that only apply in top-level browsing contexts.',
    };
  }
  return { ok: true, message: '' };
}

export async function getWebContainer(): Promise<WebContainer> {
  if (wc) return wc;
  if (bootPromise) return bootPromise;

  const isolation = checkCrossOriginIsolation();
  if (!isolation.ok) {
    setStatus('error');
    listeners.onLog?.(`❌ ${isolation.message}`);
    throw new Error(isolation.message);
  }

  setStatus('booting');
  listeners.onLog?.('🚀 Booting WebContainer…');

  bootPromise = WebContainer.boot().then(async instance => {
    wc = instance;
    setStatus('ready');
    listeners.onLog?.('✅ WebContainer ready');

    try {
      const gitBundle = await fetchGitBundle();
      try { await instance.fs.mkdir('/usr/local/bin'); } catch { /* already exists */ }
      await instance.fs.writeFile('/usr/local/bin/git', gitBundle);
      listeners.onLog?.('📦 git ready (isomorphic-git)');
    } catch (e) {
      listeners.onLog?.('⚠️ git bundle unavailable: ' + String(e));
    }

    instance.on('server-ready', (port, url) => {
      listeners.onLog?.(`🌐 Server ready on port ${port} → ${url}`);
      listeners.onPortReady?.(port, url);
    });

    instance.on('port', (port, type) => {
      if (type === 'close') {
        listeners.onLog?.(`🔌 Port ${port} closed`);
        listeners.onPortClose?.(port);
      }
    });

    return instance;
  }).catch(err => {
    bootPromise = null;
    setStatus('error');
    listeners.onLog?.(`❌ Boot failed: ${String(err)}`);
    throw err;
  });

  return bootPromise;
}

/* ─── Git bundle (fetched lazily from /git-bundle.cjs) ──────── */
let gitBundleCache: string | null = null;
async function fetchGitBundle(): Promise<string> {
  if (gitBundleCache) return gitBundleCache;
  const r = await fetch('/git-bundle.cjs');
  if (!r.ok) throw new Error('Could not load git bundle: ' + r.status);
  gitBundleCache = await r.text();
  return gitBundleCache;
}

/* ─────────────────────────────────────────────────────────────
   Real Filesystem Constants & Scan Utility
   ───────────────────────────────────────────────────────────── */

/** OS-level dirs that live in WC root and should never be shown in the editor. */
export const WC_SYSTEM_DIRS = new Set([
  'usr', 'etc', 'bin', 'lib', 'lib64', 'proc', 'dev', 'run',
  'sys', 'tmp', 'sbin', 'opt', 'boot', 'home', 'root', 'var', 'snap',
]);

/** Hidden metadata file stored in WC FS root (not shown in editor). */
export const WC_META_PATH = '/.editor-meta.json';

/** Directory names always excluded from the file explorer scan. */
const WC_SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.cache', '.vite']);

/** Root-level filenames excluded from the file explorer scan. */
const WC_SKIP_ROOT_FILES = new Set(['.editor-meta.json']);

function nameToFileType(name: string): FileItem['type'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['html', 'htm'].includes(ext)) return 'html';
  if (ext === 'css') return 'css';
  if (['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'].includes(ext)) return 'js';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) return 'image';
  return 'other';
}

export interface WCScanResult {
  files: FileItem[];
  folders: FolderItem[];
}

async function scanDir(
  instance: WebContainer,
  wcPath: string,
  storeParentId: string | null,
  results: WCScanResult,
  depth = 0,
): Promise<void> {
  if (depth > 10) return;
  let entries: { name: string; isFile: () => boolean; isDirectory: () => boolean }[] = [];
  try {
    entries = await instance.fs.readdir(wcPath, { withFileTypes: true }) as typeof entries;
  } catch { return; }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (storeParentId === null && WC_SYSTEM_DIRS.has(entry.name)) continue;
    if (WC_SKIP_DIRS.has(entry.name)) continue;

    const fullPath = wcPath === '/' ? '/' + entry.name : wcPath + '/' + entry.name;
    const storeId = storeParentId ? storeParentId + '/' + entry.name : entry.name;

    if (entry.isDirectory()) {
      results.folders.push({ id: storeId, name: entry.name, parentId: storeParentId });
      await scanDir(instance, fullPath, storeId, results, depth + 1);
    } else if (entry.isFile()) {
      if (storeParentId === null && WC_SKIP_ROOT_FILES.has(entry.name)) continue;
      try {
        const content = await instance.fs.readFile(fullPath, 'utf-8') as string;
        results.files.push({
          id: storeId,
          name: entry.name,
          type: nameToFileType(entry.name),
          content,
          folder: storeParentId ?? undefined,
        });
      } catch { /* binary or unreadable — skip */ }
    }
  }
}

/**
 * Scan the WebContainer real filesystem and return all text files and folders
 * visible to the editor, mirroring the real FS structure.
 *
 * @param specificDir  Optional sub-directory to scan (e.g. a freshly-cloned repo).
 */
export async function scanWCFilesystem(specificDir?: string): Promise<WCScanResult> {
  const instance = await getWebContainer();
  const results: WCScanResult = { files: [], folders: [] };

  if (specificDir) {
    const dirName = specificDir.replace(/^\/+/, '').replace(/\/+$/, '');
    const parentName = dirName.split('/').pop() ?? dirName;
    results.folders.push({ id: dirName, name: parentName, parentId: null });
    await scanDir(instance, '/' + dirName, dirName, results);
  } else {
    await scanDir(instance, '/', null, results);
  }

  return results;
}

/* ─── Single-file sync (used by PreviewPane for live WC dev server reload) ── */
export async function syncFileToWebContainer(file: FileItem): Promise<void> {
  if (!wc) return;
  const pathParts = file.folder
    ? [...file.folder.split('/').filter(Boolean), file.name]
    : [file.name];
  const path = '/' + pathParts.join('/');
  await wc.fs.writeFile(path, file.content);
}

/* ─── Framework Detection ─────────────────────────────────── */
export type Framework = 'react' | 'vue' | 'svelte' | 'vite' | 'next' | 'static';

export function detectFramework(files: FileItem[]): Framework {
  const pkg = files.find(f => f.name === 'package.json');
  if (!pkg) return 'static';
  try {
    const p = JSON.parse(pkg.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...p.dependencies, ...p.devDependencies };
    if (deps['next']) return 'next';
    if (deps['svelte']) return 'svelte';
    if (deps['vue']) return 'vue';
    if (deps['react'] || deps['react-dom']) return 'react';
    if (deps['vite']) return 'vite';
  } catch { /* ignore */ }
  return 'static';
}

/* ─── Dev Server ──────────────────────────────────────────── */
let devProcess: { kill: () => void } | null = null;

export interface DevServerOptions {
  /** @deprecated Files are now managed directly in WC FS. Kept for compatibility. */
  files?: FileItem[];
  /** @deprecated Folders are now managed directly in WC FS. Kept for compatibility. */
  folders?: FolderItem[];
  onLog: (msg: string) => void;
  onReady: (port: number, url: string) => void;
}

/**
 * Start a Node.js dev server inside WebContainer.
 * Files must already be present in the WebContainer real filesystem before calling this.
 * There is no mounting step — the real FS is the source of truth.
 */
export async function startDevServer(opts: DevServerOptions): Promise<void> {
  const { onLog, onReady } = opts;

  const instance = await getWebContainer();

  // npm install
  onLog('📦 Installing dependencies…');
  const install = await instance.spawn('npm', ['install']);
  install.output.pipeTo(new WritableStream({ write(d) { onLog(d.trim()); } }));
  const installCode = await install.exit;
  if (installCode !== 0) {
    onLog(`❌ npm install failed (exit ${installCode})`);
    return;
  }
  onLog('✅ Dependencies installed');

  // Detect start script from package.json in WC FS
  onLog('🔧 Starting dev server…');
  let startScript = 'dev';
  try {
    const pkgRaw = await instance.fs.readFile('/package.json', 'utf-8') as string;
    const p = JSON.parse(pkgRaw) as { scripts?: Record<string, string> };
    if (p.scripts?.dev) startScript = 'dev';
    else if (p.scripts?.start) startScript = 'start';
  } catch { /* no package.json — default to dev */ }

  const dev = await instance.spawn('npm', ['run', startScript]);
  dev.output.pipeTo(new WritableStream({ write(d) { onLog(d.trim()); } }));
  devProcess = dev;

  instance.on('server-ready', (port, url) => {
    onLog(`🌐 Ready at ${url}`);
    onReady(port, url);
  });
}

export async function killDevServer(): Promise<void> {
  if (devProcess) {
    devProcess.kill();
    devProcess = null;
  }
}

/* ─── Shell ───────────────────────────────────────────────── */
export interface ShellProcess {
  output: ReadableStream<string>;
  input: WritableStreamDefaultWriter<string>;
  kill: () => void;
  resize: (cols: number, rows: number) => void;
}

export async function spawnShell(cols: number, rows: number): Promise<ShellProcess> {
  const instance = await getWebContainer();
  const proc = await instance.spawn('jsh', {
    terminal: { cols, rows },
  });

  const writer = proc.input.getWriter();

  return {
    output: proc.output,
    input: writer,
    kill: () => proc.kill(),
    resize: (c, r) => proc.resize({ cols: c, rows: r }),
  };
}

/* ─── Teardown ────────────────────────────────────────────── */
export async function destroyWebContainer(): Promise<void> {
  if (devProcess) { devProcess.kill(); devProcess = null; }
  if (wc) {
    await wc.teardown();
    wc = null;
    bootPromise = null;
    setStatus('idle');
  }
}
