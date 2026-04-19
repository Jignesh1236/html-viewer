/**
 * Git service using isomorphic-git + memfs
 * Provides browser-based git operations for the HTML editor
 */

import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { Volume } from 'memfs';
import type { FileItem } from '../store/editorStore';

/* ── Filesystem setup ── */
const vol = new Volume();

// Node-like fs adapter that isomorphic-git expects
const fs = {
  promises: {
    readFile: (path: string, opts?: any) => vol.promises.readFile(path, opts),
    writeFile: (path: string, data: any, opts?: any) => vol.promises.writeFile(path, data, opts),
    unlink: (path: string) => vol.promises.unlink(path),
    readdir: (path: string, opts?: any) => vol.promises.readdir(path, opts),
    mkdir: (path: string, opts?: any) => vol.promises.mkdir(path, opts),
    rmdir: (path: string) => vol.promises.rmdir(path),
    stat: (path: string, opts?: any) => vol.promises.stat(path, opts),
    lstat: (path: string, opts?: any) => vol.promises.lstat(path, opts),
    readlink: (path: string, opts?: any) => (vol.promises as any).readlink(path, opts),
    symlink: (target: string, path: string) => (vol.promises as any).symlink(target, path),
    chmod: (_path: string, _mode: any) => Promise.resolve(),
  },
};

/* ── State ── */
let currentDir = '/repo';
let isInitialized = false;
let currentBranch = 'main';
let remoteUrl = '';

export interface GitStatus {
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: GitFileStatus[];
  branch: string;
  remoteUrl: string;
  ahead: number;
  behind: number;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  staged: boolean;
}

export interface GitCommit {
  oid: string;
  message: string;
  author: string;
  email: string;
  date: Date;
  shortOid: string;
}

export interface GitDiff {
  path: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  lineNum: number;
}

/* ── Helpers ── */
async function ensureDir(path: string) {
  const parts = path.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += '/' + part;
    try { await vol.promises.mkdir(current); } catch {}
  }
}

async function writeFilesFromEditor(files: FileItem[]) {
  for (const file of files) {
    if (file.type === 'image') continue;
    const path = file.folder
      ? `${currentDir}/${file.folder}/${file.name}`
      : `${currentDir}/${file.name}`;
    const dir = path.substring(0, path.lastIndexOf('/'));
    await ensureDir(dir);
    await vol.promises.writeFile(path, file.content || '');
  }
}

/* ── Initialize ── */
export async function initGit(files: FileItem[]): Promise<void> {
  try {
    await ensureDir(currentDir);
    await writeFilesFromEditor(files);

    // Check if already a git repo
    try {
      await vol.promises.stat(`${currentDir}/.git`);
      isInitialized = true;
      currentBranch = await git.currentBranch({ fs, dir: currentDir }) || 'main';
      return;
    } catch {}

    await git.init({ fs, dir: currentDir, defaultBranch: 'main' });

    // Set user config
    await git.setConfig({ fs, dir: currentDir, path: 'user.name', value: 'HTML Editor User' });
    await git.setConfig({ fs, dir: currentDir, path: 'user.email', value: 'user@htmleditor.dev' });

    isInitialized = true;
    currentBranch = 'main';
  } catch (e) {
    console.error('Git init failed:', e);
  }
}

/* ── Sync files from editor to git FS ── */
export async function syncFilesToGit(files: FileItem[]): Promise<void> {
  if (!isInitialized) return;
  await writeFilesFromEditor(files);
}

/* ── Get status ── */
export async function getStatus(): Promise<GitStatus> {
  if (!isInitialized) {
    return { staged: [], unstaged: [], untracked: [], branch: currentBranch, remoteUrl, ahead: 0, behind: 0 };
  }

  try {
    const statusMatrix = await git.statusMatrix({ fs, dir: currentDir });
    const staged: GitFileStatus[] = [];
    const unstaged: GitFileStatus[] = [];
    const untracked: GitFileStatus[] = [];

    for (const [filepath, head, workdir, index] of statusMatrix) {
      if (filepath === '.git') continue;
      // head=0 workdir=1 index=1 → newly added and staged
      // head=0 workdir=2 index=0 → untracked
      // head=1 workdir=2 index=1 → modified (unstaged)
      // head=1 workdir=2 index=2 → modified (staged)
      // head=1 workdir=0 index=1 → deleted (unstaged)
      // head=1 workdir=0 index=0 → deleted (staged)

      if (head === 0 && workdir === 2 && index === 0) {
        untracked.push({ path: filepath, status: 'added', staged: false });
      } else if (head === 0 && workdir > 0 && index > 0) {
        staged.push({ path: filepath, status: 'added', staged: true });
      } else if (head === 1 && workdir === 2 && index === 1) {
        unstaged.push({ path: filepath, status: 'modified', staged: false });
      } else if (head === 1 && workdir === 2 && index === 2) {
        staged.push({ path: filepath, status: 'modified', staged: true });
      } else if (head === 1 && workdir === 0 && index === 1) {
        unstaged.push({ path: filepath, status: 'deleted', staged: false });
      } else if (head === 1 && workdir === 0 && index === 0) {
        staged.push({ path: filepath, status: 'deleted', staged: true });
      }
    }

    currentBranch = await git.currentBranch({ fs, dir: currentDir }) || 'main';
    return { staged, unstaged, untracked, branch: currentBranch, remoteUrl, ahead: 0, behind: 0 };
  } catch {
    return { staged: [], unstaged: [], untracked: [], branch: currentBranch, remoteUrl, ahead: 0, behind: 0 };
  }
}

/* ── Stage file ── */
export async function stageFile(filepath: string): Promise<void> {
  if (!isInitialized) return;
  try {
    await git.add({ fs, dir: currentDir, filepath });
  } catch (e) {
    console.error('Stage failed:', e);
  }
}

/* ── Unstage file ── */
export async function unstageFile(filepath: string): Promise<void> {
  if (!isInitialized) return;
  try {
    await git.resetIndex({ fs, dir: currentDir, filepath });
  } catch (e) {
    console.error('Unstage failed:', e);
  }
}

/* ── Stage all ── */
export async function stageAll(files: FileItem[]): Promise<void> {
  if (!isInitialized) return;
  await writeFilesFromEditor(files);
  try {
    await git.add({ fs, dir: currentDir, filepath: '.' });
  } catch (e) {
    console.error('Stage all failed:', e);
  }
}

/* ── Commit ── */
export async function commit(message: string): Promise<string> {
  if (!isInitialized) throw new Error('Git not initialized');
  const oid = await git.commit({
    fs,
    dir: currentDir,
    message: message.trim(),
    author: { name: 'HTML Editor User', email: 'user@htmleditor.dev' },
  });
  return oid;
}

/* ── Log ── */
export async function getLog(depth = 20): Promise<GitCommit[]> {
  if (!isInitialized) return [];
  try {
    const commits = await git.log({ fs, dir: currentDir, depth });
    return commits.map(c => ({
      oid: c.oid,
      shortOid: c.oid.slice(0, 7),
      message: c.commit.message.trim(),
      author: c.commit.author.name,
      email: c.commit.author.email,
      date: new Date(c.commit.author.timestamp * 1000),
    }));
  } catch {
    return [];
  }
}

/* ── Branch operations ── */
export async function getBranches(): Promise<string[]> {
  if (!isInitialized) return [currentBranch];
  try {
    const branches = await git.listBranches({ fs, dir: currentDir });
    return branches;
  } catch {
    return [currentBranch];
  }
}

export async function createBranch(name: string): Promise<void> {
  if (!isInitialized) return;
  await git.branch({ fs, dir: currentDir, ref: name, checkout: true });
  currentBranch = name;
}

export async function checkoutBranch(name: string): Promise<void> {
  if (!isInitialized) return;
  await git.checkout({ fs, dir: currentDir, ref: name });
  currentBranch = name;
}

/* ── Clone via GitHub API (with rate-limit fix using raw.githubusercontent.com) ── */
export async function cloneFromGitHub(
  owner: string,
  repo: string,
  onProgress: (msg: string, done: number, total: number) => void
): Promise<FileItem[]> {
  // Step 1: Get repo info & default branch
  onProgress('Fetching repository info…', 0, 100);
  const infoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!infoRes.ok) {
    if (infoRes.status === 404) throw new Error('Repository not found. Make sure it is public.');
    if (infoRes.status === 403) throw new Error('GitHub API rate limit hit. Try again in a minute.');
    throw new Error(`GitHub error: ${infoRes.status}`);
  }
  const info = await infoRes.json() as { default_branch: string };
  const branch = info.default_branch;

  // Step 2: Get file tree
  onProgress(`Fetching file tree (branch: ${branch})…`, 5, 100);
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!treeRes.ok) throw new Error(`Could not fetch file tree (${treeRes.status})`);
  const tree = await treeRes.json() as { tree: { path: string; type: string; size?: number }[]; truncated: boolean };

  const BINARY_EXTS = new Set(['png','jpg','jpeg','gif','webp','ico','bmp','woff','woff2','ttf','eot','otf','zip','tar','gz','pdf','mp4','mp3','wav']);
  const blobs = tree.tree.filter(f => {
    if (f.type !== 'blob') return false;
    const ext = f.path.split('.').pop()?.toLowerCase() ?? '';
    if (BINARY_EXTS.has(ext)) return false;
    if (f.size && f.size > 300_000) return false;
    return true;
  }).slice(0, 100);

  // Step 3: Fetch file contents via raw.githubusercontent.com (no rate limit!)
  const fetchedFiles: FileItem[] = [];
  const BATCH = 10; // fetch 10 at a time

  for (let i = 0; i < blobs.length; i += BATCH) {
    const batch = blobs.slice(i, i + BATCH);
    onProgress(`Downloading files ${i + 1}–${Math.min(i + BATCH, blobs.length)}/${blobs.length}…`, i, blobs.length);

    const results = await Promise.allSettled(
      batch.map(async blob => {
        // Use raw.githubusercontent.com — no API rate limits!
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${blob.path}`;
        const res = await fetch(rawUrl);
        if (!res.ok) return null;
        const content = await res.text();
        const name = blob.path.split('/').pop() ?? blob.path;
        const folder = blob.path.includes('/') ? blob.path.split('/').slice(0, -1).join('/') : undefined;
        const ext = name.split('.').pop()?.toLowerCase() ?? '';
        const type = ext === 'html' || ext === 'htm' ? 'html'
          : ext === 'css' ? 'css'
          : ext === 'js' || ext === 'mjs' ? 'js'
          : ext === 'ts' ? 'ts' : ext === 'tsx' ? 'tsx' : ext === 'jsx' ? 'jsx'
          : ext === 'json' ? 'json' : 'other';
        return { id: blob.path, name, type, content, folder } as FileItem;
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) fetchedFiles.push(r.value);
    }
  }

  if (fetchedFiles.length === 0) throw new Error('No readable text files found in this repository.');
  onProgress(`Done! ${fetchedFiles.length} files loaded.`, blobs.length, blobs.length);

  // Initialize git in the cloned project
  try {
    remoteUrl = `https://github.com/${owner}/${repo}.git`;
    await ensureDir(currentDir);
    // Reset vol for fresh clone
    await git.init({ fs, dir: currentDir, defaultBranch: branch });
    await git.setConfig({ fs, dir: currentDir, path: 'user.name', value: 'HTML Editor User' });
    await git.setConfig({ fs, dir: currentDir, path: 'user.email', value: 'user@htmleditor.dev' });
    await writeFilesFromEditor(fetchedFiles);
    await git.add({ fs, dir: currentDir, filepath: '.' });
    await git.commit({
      fs, dir: currentDir,
      message: `Initial clone from ${owner}/${repo}`,
      author: { name: 'HTML Editor User', email: 'user@htmleditor.dev' },
    });
    currentBranch = branch;
    isInitialized = true;
  } catch (e) {
    console.warn('Git init after clone failed:', e);
  }

  return fetchedFiles;
}

/* ── Get diff for a file ── */
export async function getFileDiff(filepath: string, content: string): Promise<DiffHunk[]> {
  if (!isInitialized) return [];
  try {
    let oldContent = '';
    try {
      const oid = await git.resolveRef({ fs, dir: currentDir, ref: 'HEAD' });
      const { blob } = await git.readBlob({ fs, dir: currentDir, oid, filepath });
      oldContent = new TextDecoder().decode(blob);
    } catch {
      oldContent = '';
    }

    return computeDiff(oldContent, content);
  } catch {
    return [];
  }
}

function computeDiff(oldText: string, newText: string): DiffHunk[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Simple line-by-line diff
  const hunks: DiffHunk[] = [];
  let hunkLines: DiffLine[] = [];
  let i = 0, j = 0;
  let lineNum = 1;

  while (i < oldLines.length || j < newLines.length) {
    const o = oldLines[i];
    const n = newLines[j];

    if (o === n) {
      if (hunkLines.length > 0) {
        hunkLines.push({ type: 'context', content: n, lineNum });
      }
      i++; j++; lineNum++;
    } else if (o !== undefined && n === undefined) {
      hunkLines.push({ type: 'removed', content: o, lineNum });
      i++; lineNum++;
    } else if (o === undefined && n !== undefined) {
      hunkLines.push({ type: 'added', content: n, lineNum });
      j++; lineNum++;
    } else {
      hunkLines.push({ type: 'removed', content: o, lineNum });
      hunkLines.push({ type: 'added', content: n, lineNum });
      i++; j++; lineNum++;
    }

    if (hunkLines.length > 200) break;
  }

  if (hunkLines.length > 0) {
    hunks.push({ header: `@@ Changes @@`, lines: hunkLines });
  }

  return hunks;
}

/* ── Export state ── */
export function getGitDir() { return currentDir; }
export function getRemoteUrl() { return remoteUrl; }
export function setRemoteUrl(url: string) { remoteUrl = url; }
export function getIsInitialized() { return isInitialized; }
export function getCurrentBranch() { return currentBranch; }
