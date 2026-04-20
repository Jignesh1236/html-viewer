import type { FileItem, ProjectType } from '../store/editorStore';
import { isRuntimeSourceFile } from './fileTypes';

type FileSystemTree = Record<string, any>;
type WebContainerInstance = any;
type WebContainerProcess = any;

type RuntimePhase = 'booting' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error';
type ConsoleLevel = 'log' | 'error' | 'warn' | 'info';

export interface RuntimeCallbacks {
  onStatus?: (phase: RuntimePhase, message: string) => void;
  onConsole?: (level: ConsoleLevel, message: string) => void;
}

export interface RuntimeResult {
  url: string;
  command: string;
  runtimeLabel: string;
}

let bootPromise: Promise<WebContainerInstance> | null = null;
let container: WebContainerInstance | null = null;
let runningProcess: WebContainerProcess | null = null;
let activeRun = 0;
let installSignature = '';

function normalizePath(file: FileItem) {
  const id = file.id || file.name;
  const folder = file.folder ? `${file.folder.replace(/^\/+|\/+$/g, '')}/` : '';
  const path = id.includes('/') ? id : `${folder}${file.name}`;
  return path.replace(/^\/+/, '').replace(/\/+/g, '/');
}

function addTreeFile(tree: FileSystemTree, path: string, contents: string) {
  const parts = path.split('/').filter(Boolean);
  let node = tree;
  parts.slice(0, -1).forEach(part => {
    const current = node[part];
    if (!current || !('directory' in current)) {
      node[part] = { directory: {} };
    }
    node = (node[part] as { directory: FileSystemTree }).directory;
  });
  node[parts[parts.length - 1]] = { file: { contents } };
}

function readPackage(files: FileItem[]) {
  const pkg = files.find(f => normalizePath(f) === 'package.json' || f.name === 'package.json');
  if (!pkg) return null;
  try {
    return JSON.parse(pkg.content || '{}') as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

function hasPath(files: FileItem[], path: string) {
  return files.some(f => normalizePath(f) === path);
}

function firstExisting(files: FileItem[], paths: string[]) {
  return paths.find(path => hasPath(files, path));
}

function firstReactComponent(files: FileItem[]) {
  return firstExisting(files, ['src/App.tsx', 'src/App.jsx', 'src/App.ts', 'src/App.js', 'App.tsx', 'App.jsx', 'App.ts', 'App.js']);
}

function synthesizePackage(projectType: ProjectType, files: FileItem[]) {
  if (readPackage(files)) return null;
  if (projectType === 'node') {
    return {
      scripts: { start: 'node index.js', dev: 'node index.js' },
      dependencies: {},
      devDependencies: {},
    };
  }
  return {
    scripts: { dev: 'vite --host 0.0.0.0' },
    dependencies: {
      '@vitejs/plugin-react': 'latest',
      vite: 'latest',
      typescript: 'latest',
      react: 'latest',
      'react-dom': 'latest',
    },
    devDependencies: {},
  };
}

function createFallbackReactMain(files: FileItem[]) {
  const appPath = firstReactComponent(files);
  if (!appPath) {
    return `import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <main style={{ fontFamily: 'system-ui, sans-serif', padding: 40 }}>
    <h1>React preview ready</h1>
    <p>Add an App.jsx, App.tsx, or src/App.jsx file to render your project.</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);`;
  }
  const importPath = appPath.startsWith('src/') ? `./${appPath.slice(4).replace(/\.(tsx|jsx|ts|js)$/, '')}` : `../${appPath.replace(/\.(tsx|jsx|ts|js)$/, '')}`;
  return `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '${importPath}';

createRoot(document.getElementById('root')).render(<App />);`;
}

function createTree(files: FileItem[], projectType: ProjectType): FileSystemTree {
  const tree: FileSystemTree = {};
  files.filter(isRuntimeSourceFile).forEach(file => {
    addTreeFile(tree, normalizePath(file), file.content || '');
  });

  const syntheticPackage = synthesizePackage(projectType, files);
  if (syntheticPackage) {
    addTreeFile(tree, 'package.json', JSON.stringify(syntheticPackage, null, 2));
  }

  if ((projectType === 'react' || projectType === 'fullstack') && !hasPath(files, 'index.html')) {
    addTreeFile(tree, 'index.html', '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Preview</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>');
  }

  if ((projectType === 'react' || projectType === 'fullstack') && !firstExisting(files, ['src/main.tsx', 'src/main.jsx', 'src/main.ts', 'src/main.js'])) {
    addTreeFile(tree, 'src/main.jsx', createFallbackReactMain(files));
  }

  if (projectType === 'node' && !firstExisting(files, ['index.js', 'index.ts', 'server.js', 'server.ts'])) {
    addTreeFile(tree, 'index.js', 'import { createServer } from "node:http";\n\ncreateServer((req, res) => {\n  res.setHeader("content-type", "text/html;charset=utf-8");\n  res.end("<h1>Node runtime ready</h1><p>Add index.js or server.js to run your app.</p>");\n}).listen(3000, "0.0.0.0");\n');
  }

  return tree;
}

function getCommand(projectType: ProjectType, files: FileItem[]) {
  const pkg = readPackage(files) ?? synthesizePackage(projectType, files);
  const scripts = pkg?.scripts ?? {};
  if (scripts.dev) return { command: 'npm run dev', cmd: 'npm', args: ['run', 'dev'] };
  if (scripts.start) return { command: 'npm start', cmd: 'npm', args: ['start'] };
  if (projectType === 'node') return { command: 'node index.js', cmd: 'node', args: ['index.js'] };
  return { command: 'npm run dev', cmd: 'npm', args: ['run', 'dev'] };
}

function streamProcess(process: WebContainerProcess, callbacks: RuntimeCallbacks) {
  process.output.pipeTo(new WritableStream({
    write(data) {
      callbacks.onConsole?.('info', String(data));
    },
  })).catch(() => {});
}

async function getContainer(callbacks: RuntimeCallbacks) {
  if (!('SharedArrayBuffer' in window) || !window.crossOriginIsolated) {
    throw new Error('WebContainer needs browser cross-origin isolation. Dev headers are configured, but this preview frame/browser is not isolated yet.');
  }
  if (!bootPromise) {
    callbacks.onStatus?.('booting', 'Booting WebContainer runtime…');
    bootPromise = import('@webcontainer/api').then(({ WebContainer }) => WebContainer.boot({ coep: 'credentialless' }));
  }
  container = await bootPromise;
  return container;
}

export async function stopWebContainerRuntime() {
  activeRun += 1;
  if (runningProcess) {
    runningProcess.kill();
    runningProcess = null;
  }
}

/** Get the WebContainer instance (boots if needed) */
export async function getWebContainer(): Promise<WebContainerInstance> {
  return getContainer({});
}

/** Returns true if a WebContainer is already booted */
export function isContainerBooted(): boolean {
  return container !== null;
}

/** Spawn an arbitrary command in the WebContainer with xterm PTY support */
export async function spawnInContainer(
  cmd: string,
  args: string[],
  onData: (data: string) => void,
  options?: { cols?: number; rows?: number }
): Promise<{ exit: Promise<number>; kill: () => void; write: (data: string) => void; resize: (dims: { cols: number; rows: number }) => void }> {
  const wc = await getContainer({});
  const proc = await wc.spawn(cmd, args, {
    terminal: options ? { cols: options.cols || 80, rows: options.rows || 24 } : undefined,
  });
  proc.output.pipeTo(new WritableStream({ write(d) { onData(String(d)); } })).catch(() => {});

  let writer: WritableStreamDefaultWriter<string> | null = null;
  const getWriter = () => {
    if (!writer && proc.input) {
      try { writer = proc.input.getWriter(); } catch {}
    }
    return writer;
  };

  return {
    exit: proc.exit,
    kill: () => { try { writer?.releaseLock(); } catch {} writer = null; proc.kill(); },
    write: (data: string) => {
      const w = getWriter();
      if (w) w.write(data).catch(() => {});
    },
    resize: (dims: { cols: number; rows: number }) => {
      try { (proc as any).resize?.(dims); } catch {}
    },
  };
}

/** Mount current project files to the container */
export async function mountFilesToContainer(files: FileItem[], projectType: ProjectType) {
  const wc = await getContainer({});
  await wc.mount(createTree(files, projectType));
}

/** Write a single file to the container FS */
export async function writeFileToContainer(path: string, content: string) {
  if (!container) return;
  try {
    await container.fs.writeFile(path, content);
  } catch {
    // Container may not have the directory yet — try to create it
    const parts = path.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/');
      try { await container.fs.mkdir(dir, { recursive: true }); } catch {}
      await container.fs.writeFile(path, content);
    }
  }
}

/** Read a file from the container FS */
export async function readFileFromContainer(path: string): Promise<string | null> {
  if (!container) return null;
  try {
    const data = await container.fs.readFile(path, 'utf-8');
    return String(data);
  } catch {
    return null;
  }
}

/** List directory contents from container FS */
export async function listDirFromContainer(path: string): Promise<string[]> {
  if (!container) return [];
  try {
    const entries = await container.fs.readdir(path, { withFileTypes: true });
    return entries.map((e: any) => (e.isDirectory ? `${e.name}/` : e.name));
  } catch {
    return [];
  }
}

/** Sync container FS files back to the editor store (file content only) */
export async function syncContainerFilesToStore(
  filePaths: string[],
  onUpdate: (path: string, content: string) => void
) {
  if (!container) return;
  for (const path of filePaths) {
    try {
      const content = await container.fs.readFile(path, 'utf-8');
      if (content !== null && content !== undefined) {
        onUpdate(path, String(content));
      }
    } catch {
      // file may not exist in container
    }
  }
}

export interface ScanResult {
  /** All folder paths found (relative to root), e.g. "src", "node_modules" */
  folders: string[];
  /** All text files found (excluding contents of blacklisted dirs) */
  files: { path: string; content: string }[];
  /** Heavy/virtual dirs that exist but whose contents were not traversed */
  heavyDirs: string[];
}

const HEAVY_DIRS = new Set(['node_modules', '.git', 'dist', '.cache', '.next', 'build', '.vite', '__pycache__']);
const TEXT_EXTS  = new Set(['js','jsx','ts','tsx','json','html','css','scss','sass','less','md','txt','env','yaml','yml','sh','py','rb','php','go','rs','toml','xml','svg']);
const MAX_DEPTH  = 6;
const MAX_FILES  = 300;

/**
 * Recursively scans the WebContainer file system.
 * - Skips contents of heavy dirs (node_modules, .git, dist, …) but records they exist
 * - Returns flat lists of folder paths and file { path, content } objects
 */
export async function fullScanContainerFS(): Promise<ScanResult> {
  if (!container) return { folders: [], files: [], heavyDirs: [] };

  const result: ScanResult = { folders: [], files: [], heavyDirs: [] };
  let fileCount = 0;

  async function walk(dir: string, depth: number) {
    if (depth > MAX_DEPTH || fileCount >= MAX_FILES) return;
    let entries: any[];
    try {
      entries = await container!.fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const rel = dir === '/' ? entry.name : `${dir}/${entry.name}`.replace(/^\/+/, '');

      if (entry.isDirectory()) {
        if (HEAVY_DIRS.has(entry.name)) {
          result.heavyDirs.push(rel);
          result.folders.push(rel);
        } else {
          result.folders.push(rel);
          await walk(`/${rel}`, depth + 1);
        }
      } else {
        const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
        if (!TEXT_EXTS.has(ext)) continue;
        try {
          const content = await container!.fs.readFile(`/${rel}`, 'utf-8');
          result.files.push({ path: rel, content: String(content) });
          fileCount++;
        } catch {
          // unreadable — skip
        }
      }
    }
  }

  await walk('/', 0);
  return result;
}

export async function startWebContainerPreview(files: FileItem[], projectType: ProjectType, callbacks: RuntimeCallbacks = {}): Promise<RuntimeResult> {
  const runId = ++activeRun;
  const command = getCommand(projectType, files);

  callbacks.onStatus?.('booting', 'Preparing browser runtime…');
  const wc = await getContainer(callbacks);
  if (runId !== activeRun) throw new Error('Runtime start was cancelled.');

  if (runningProcess) {
    runningProcess.kill();
    runningProcess = null;
  }

  callbacks.onStatus?.('mounting', 'Mounting project files…');
  await wc.mount(createTree(files, projectType));
  if (runId !== activeRun) throw new Error('Runtime start was cancelled.');

  const pkg = readPackage(files) ?? synthesizePackage(projectType, files);
  const signature = JSON.stringify({
    dependencies: pkg?.dependencies ?? {},
    devDependencies: pkg?.devDependencies ?? {},
  });

  if (signature !== installSignature || !installSignature) {
    callbacks.onStatus?.('installing', 'Installing project dependencies…');
    const install = await wc.spawn('npm', ['install']);
    streamProcess(install, callbacks);
    const installCode = await install.exit;
    if (installCode !== 0) throw new Error(`npm install failed with exit code ${installCode}.`);
    installSignature = signature;
  }

  callbacks.onStatus?.('starting', `Starting ${command.command}…`);

  const readyUrl = new Promise<string>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Runtime started, but no preview server became ready within 25 seconds.')), 25000);
    const off = wc.on('server-ready', (_port: number, url: string) => {
      window.clearTimeout(timeout);
      off();
      resolve(url);
    });
  });

  runningProcess = await wc.spawn(command.cmd, command.args);
  streamProcess(runningProcess, callbacks);

  const url = await readyUrl;
  if (runId !== activeRun) throw new Error('Runtime start was cancelled.');
  callbacks.onStatus?.('ready', `Runtime ready at ${url}`);
  return { url, command: command.command, runtimeLabel: 'WebContainer' };
}
