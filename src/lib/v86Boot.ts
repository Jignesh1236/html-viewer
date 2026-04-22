export const V86_BASE = '/v86';

export type BootStatus = 'idle' | 'loading' | 'booting' | 'ready' | 'error';

export interface ProgressState {
  loaded: number;
  total: number;
  file: string;
  fileIndex: number;
  totalFiles: number;
}

interface BootFile {
  url: string;
  label: string;
  estimatedBytes: number;
}

const BOOT_FILES: BootFile[] = [
  { url: `${V86_BASE}/bios/seabios.bin`,                label: '/boot/seabios.bin',         estimatedBytes:    131072 },
  { url: `${V86_BASE}/bios/vgabios.bin`,                label: '/boot/vgabios.bin',         estimatedBytes:     36352 },
  { url: `${V86_BASE}/images/linux.iso`,                label: '/boot/linux.iso',           estimatedBytes:   5666816 },
];

let _emulator: any = null;
let _serialListeners: Set<(c: string) => void> = new Set();
let _statusListeners: Set<(s: BootStatus) => void> = new Set();
let _progressListeners: Set<(p: ProgressState) => void> = new Set();
let _logListeners: Set<(line: string) => void> = new Set();
let _bootError = '';

let _status: BootStatus = 'idle';
let _progress: ProgressState = { loaded: 0, total: 0, file: '', fileIndex: 0, totalFiles: BOOT_FILES.length };
const _logBuffer: string[] = [];

export function getBootStatus(): BootStatus { return _status; }
export function getBootProgress(): ProgressState { return _progress; }
export function getBootLog(): string[] { return [..._logBuffer]; }
export function getBootError(): string { return _bootError; }
export function getEmulator() { return _emulator; }

export function onBootStatus(fn: (s: BootStatus) => void) {
  _statusListeners.add(fn);
  return () => { _statusListeners.delete(fn); };
}
export function onBootProgress(fn: (p: ProgressState) => void) {
  _progressListeners.add(fn);
  return () => { _progressListeners.delete(fn); };
}
export function onBootLog(fn: (line: string) => void) {
  _logListeners.add(fn);
  return () => { _logListeners.delete(fn); };
}
export function onSerialChar(fn: (c: string) => void) {
  _serialListeners.add(fn);
  return () => { _serialListeners.delete(fn); };
}

function setStatus(s: BootStatus) {
  _status = s;
  _statusListeners.forEach(fn => fn(s));
}
function setProgress(p: ProgressState) {
  _progress = p;
  _progressListeners.forEach(fn => fn(p));
}
function pushLog(line: string) {
  _logBuffer.push(line);
  if (_logBuffer.length > 200) _logBuffer.shift();
  _logListeners.forEach(fn => fn(line));
}

async function fetchWithProgress(url: string, label: string, fileIndex: number, estimatedBytes: number): Promise<ArrayBuffer> {
  pushLog(`[ ${String(fileIndex + 1).padStart(2, '0')}/${BOOT_FILES.length} ] fetching ${label}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${label}`);
  const headerLen = parseInt(res.headers.get('content-length') || '0');
  const total = headerLen || estimatedBytes;
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    setProgress({ loaded, total: Math.max(total, loaded), file: label, fileIndex, totalFiles: BOOT_FILES.length });
  }
  const buf = new ArrayBuffer(loaded);
  const view = new Uint8Array(buf);
  let offset = 0;
  for (const c of chunks) { view.set(c, offset); offset += c.length; }
  pushLog(`         ok    ${(loaded / 1024).toFixed(1)} KB`);
  return buf;
}

export async function bootV86(): Promise<void> {
  if (_status !== 'idle' && _status !== 'error') return;
  setStatus('loading');
  _bootError = '';

  try {
    pushLog('HTML Editor — Linux (in-browser, x86)');
    pushLog('Powered by v86 · runs entirely in your browser.');
    pushLog('');
    pushLog('Detecting system…');
    pushLog(`CPU: ${navigator.hardwareConcurrency || 1} core(s) · UA: ${navigator.platform}`);
    pushLog('');
    pushLog('Initialising x86 emulator…');

    let waited = 0;
    while (typeof (window as any).V86Starter === 'undefined' && typeof (window as any).V86 === 'undefined') {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
      if (waited > 15000) throw new Error('libv86.js failed to load (network blocked?).');
    }
    pushLog('libv86.js loaded.');
    pushLog('');
    pushLog('Downloading kernel & BIOS images…');

    const buffers: ArrayBuffer[] = [];
    for (let i = 0; i < BOOT_FILES.length; i++) {
      const f = BOOT_FILES[i];
      buffers.push(await fetchWithProgress(f.url, f.label, i, f.estimatedBytes));
    }
    const [seabios, vgabios, cdrom] = buffers;

    pushLog('');
    pushLog('All images downloaded. Booting Linux kernel…');
    setStatus('booting');

    // v86 needs a real DOM screen container or some builds throw.
    // We create a hidden one off-screen so the emulator can attach without
    // affecting the layout — the user only ever sees the serial terminal.
    let hiddenScreen = document.getElementById('__v86_hidden_screen__') as HTMLDivElement | null;
    if (!hiddenScreen) {
      hiddenScreen = document.createElement('div');
      hiddenScreen.id = '__v86_hidden_screen__';
      hiddenScreen.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:720px;height:400px;visibility:hidden;pointer-events:none;';
      const inner = document.createElement('div');
      inner.style.cssText = 'white-space:pre;font-family:monospace;';
      const canvas = document.createElement('canvas');
      hiddenScreen.appendChild(inner);
      hiddenScreen.appendChild(canvas);
      document.body.appendChild(hiddenScreen);
    }

    const Starter: any = (window as any).V86Starter || (window as any).V86;
    _emulator = new Starter({
      wasm_path: `${V86_BASE}/v86.wasm`,
      memory_size: 128 * 1024 * 1024,
      vga_memory_size: 2 * 1024 * 1024,
      screen_container: hiddenScreen,
      bios:     { buffer: seabios },
      vga_bios: { buffer: vgabios },
      cdrom:    { buffer: cdrom },
      autostart: true,
      disable_keyboard: true,
      disable_mouse: true,
    });

    _emulator.add_listener('serial0-output-char', (c: string) => {
      _serialListeners.forEach(fn => fn(c));
    });
    _emulator.add_listener('emulator-ready', () => {
      pushLog('Kernel boot complete. Shell ready.');
      setStatus('ready');
    });
    setTimeout(() => { if (_status === 'booting') { pushLog('Boot timeout reached — assuming ready.'); setStatus('ready'); } }, 30000);

  } catch (err: any) {
    console.error('[v86] boot error:', err);
    _bootError = err?.message || 'Failed to boot Linux';
    pushLog(`ERROR: ${_bootError}`);
    setStatus('error');
  }
}

export function restartEmulator() {
  if (_emulator) { try { _emulator.restart(); } catch {} }
}

export function sendSerial(data: string) {
  if (_emulator) _emulator.serial0_send(data);
}

export const BOOT_FILE_COUNT = BOOT_FILES.length;
