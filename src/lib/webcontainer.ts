import { WebContainer } from '@webcontainer/api';
import type { FileItem } from '../store/editorStore';

export type WCStatus = 'idle' | 'booting' | 'ready' | 'error';
export type PortInfo = { port: number; url: string };

type StatusListener = (s: WCStatus) => void;
type PortListener = (ports: PortInfo[]) => void;
type FileListener = (files: FileSystemFile[]) => void;
type LogListener = (line: BootLog) => void;

export type BootLogLevel = 'info' | 'ok' | 'warn' | 'err' | 'cmd';
export interface BootLog { level: BootLogLevel; text: string; ts: number; }

export interface FileSystemFile {
  path: string;
  content: string;
  isDirectory: boolean;
}

class WebContainerManager {
  private instance: WebContainer | null = null;
  private bootPromise: Promise<WebContainer> | null = null;
  private _status: WCStatus = 'idle';
  private statusListeners = new Set<StatusListener>();
  private portListeners = new Set<PortListener>();
  private fileListeners = new Set<FileListener>();
  private logListeners = new Set<LogListener>();
  private logs: BootLog[] = [];
  private activePorts: PortInfo[] = [];
  private shellProcess: { write: (data: string) => void; kill: () => void } | null = null;

  get status() { return this._status; }
  get ports() { return this.activePorts; }
  get wc() { return this.instance; }

  onStatus(fn: StatusListener) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }
  onPorts(fn: PortListener) {
    this.portListeners.add(fn);
    return () => this.portListeners.delete(fn);
  }
  onFiles(fn: FileListener) {
    this.fileListeners.add(fn);
    return () => this.fileListeners.delete(fn);
  }
  onLog(fn: LogListener) {
    // replay buffered logs to new subscribers
    this.logs.forEach(l => { try { fn(l); } catch {} });
    this.logListeners.add(fn);
    return () => this.logListeners.delete(fn);
  }
  log(level: BootLogLevel, text: string) {
    const entry: BootLog = { level, text, ts: Date.now() };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs = this.logs.slice(-300);
    this.logListeners.forEach(fn => { try { fn(entry); } catch {} });
  }
  getLogs() { return [...this.logs]; }

  private setStatus(s: WCStatus) {
    this._status = s;
    this.statusListeners.forEach(fn => fn(s));
  }

  async boot() {
    if (this.instance) return this.instance;
    if (this.bootPromise) return this.bootPromise;
    this.setStatus('booting');
    this.bootPromise = (async () => {
      try {
        this.log('info', 'Cold-booting Node.js sandbox (WebContainer)…');
        const t0 = performance.now();
        const wc = await WebContainer.boot();
        this.instance = wc;
        wc.on('server-ready', (port, url) => {
          this.activePorts = [...this.activePorts.filter(p => p.port !== port), { port, url }];
          this.portListeners.forEach(fn => fn(this.activePorts));
          this.log('ok', `Server ready on port ${port} → ${url}`);
        });
        const ms = Math.round(performance.now() - t0);
        this.log('ok', `Sandbox booted in ${ms} ms · Node.js v22 · jsh shell`);
        this.setStatus('ready');
        return wc;
      } catch (e: any) {
        console.error('[WebContainer] boot failed', e);
        this.log('err', `Boot failed: ${e?.message || e}`);
        this.setStatus('error');
        this.bootPromise = null;
        throw e;
      }
    })();
    return this.bootPromise;
  }

  /** Run `npm install` if package.json exists. Streams output to bootLog. */
  async maybeInstallDeps(): Promise<{ ran: boolean; ok: boolean }> {
    if (!this.instance) return { ran: false, ok: false };
    let pkgRaw = '';
    try { pkgRaw = await this.instance.fs.readFile('/package.json', 'utf-8'); }
    catch { this.log('info', 'No package.json detected — skipping npm install.'); return { ran: false, ok: true }; }
    let depsCount = 0;
    try {
      const pkg = JSON.parse(pkgRaw);
      depsCount = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
    } catch {}
    if (depsCount === 0) {
      this.log('info', 'package.json found, but no dependencies declared.');
      return { ran: false, ok: true };
    }
    this.log('cmd', `npm install   (${depsCount} package${depsCount === 1 ? '' : 's'})`);
    try {
      const proc = await this.instance.spawn('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error']);
      proc.output.pipeTo(new WritableStream({
        write: (chunk) => {
          const txt = String(chunk).replace(/\x1b\[[0-9;]*m/g, '').trim();
          if (txt) this.log('info', txt.split('\n').slice(-1)[0].slice(0, 180));
        },
      })).catch(() => {});
      const code = await proc.exit;
      if (code === 0) { this.log('ok', 'npm install completed.'); return { ran: true, ok: true }; }
      this.log('err', `npm install exited with code ${code}`);
      return { ran: true, ok: false };
    } catch (e: any) {
      this.log('err', `npm install failed: ${e?.message || e}`);
      return { ran: true, ok: false };
    }
  }

  async mountFiles(files: FileItem[]) {
    if (!this.instance) await this.boot();
    const wc = this.instance!;
    this.log('info', `Mounting ${files.length} file${files.length === 1 ? '' : 's'} into the sandbox FS…`);

    const mountObj: Record<string, any> = {};

    for (const file of files) {
      if (file.type === 'image') continue;
      const pathParts = file.folder
        ? [...file.folder.split('/').filter(Boolean), file.name]
        : [file.name];

      let cur = mountObj;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!cur[part]) cur[part] = { directory: {} };
        cur = cur[part].directory;
      }
      cur[pathParts[pathParts.length - 1]] = { file: { contents: file.content } };
    }

    await wc.mount(mountObj);
    this.log('ok', 'Project files mounted at /');
  }

  async writeFile(path: string, content: string) {
    if (!this.instance) return;
    await this.instance.fs.writeFile(path, content, 'utf-8');
  }

  async deleteFile(path: string) {
    if (!this.instance) return;
    try { await this.instance.fs.rm(path, { recursive: true }); } catch {}
  }

  async readContainerFiles(): Promise<FileSystemFile[]> {
    if (!this.instance) return [];
    return this._readDirRecursive('/', this.instance);
  }

  private async _readDirRecursive(dir: string, wc: WebContainer): Promise<FileSystemFile[]> {
    const results: FileSystemFile[] = [];
    try {
      const entries = await wc.fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const full = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          results.push({ path: full, content: '', isDirectory: true });
          const sub = await this._readDirRecursive(full, wc);
          results.push(...sub);
        } else {
          try {
            const content = await wc.fs.readFile(full, 'utf-8');
            results.push({ path: full, content, isDirectory: false });
          } catch {}
        }
      }
    } catch {}
    return results;
  }

  async spawn(cmd: string, args: string[], opts?: { cwd?: string }) {
    if (!this.instance) await this.boot();
    return this.instance!.spawn(cmd, args, opts ? { cwd: opts.cwd } : undefined);
  }

  async startShell() {
    if (!this.instance) await this.boot();
    return this.instance!.spawn('jsh', [], { terminal: { cols: 80, rows: 24 } });
  }

  async runCommand(cmd: string, cwd = '/') {
    if (!this.instance) await this.boot();
    const [command, ...args] = cmd.split(' ');
    return this.instance!.spawn(command, args, { cwd });
  }

  reset() {
    this.instance = null;
    this._status = 'idle';
    this.activePorts = [];
  }
}

export const wcManager = new WebContainerManager();
