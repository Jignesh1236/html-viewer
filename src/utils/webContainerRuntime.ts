import type { FileSystemTree, WebContainer as WebContainerInstance, WebContainerProcess } from '@webcontainer/api';
import type { FileItem, ProjectType } from '../store/editorStore';
import { isRuntimeSourceFile } from './fileTypes';

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

/** Spawn an arbitrary command in the WebContainer and return the process */
export async function spawnInContainer(
  cmd: string,
  args: string[],
  onData: (data: string) => void,
): Promise<{ exit: Promise<number>; kill: () => void }> {
  const wc = await getContainer({});
  const proc = await wc.spawn(cmd, args);
  proc.output.pipeTo(new WritableStream({ write(d) { onData(String(d)); } })).catch(() => {});
  return {
    exit: proc.exit,
    kill: () => proc.kill(),
  };
}

/** Mount current project files to the container */
export async function mountFilesToContainer(files: FileItem[], projectType: ProjectType) {
  const wc = await getContainer({});
  await wc.mount(createTree(files, projectType));
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
    const off = wc.on('server-ready', (_port, url) => {
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