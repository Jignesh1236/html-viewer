export type RuntimeKind = 'v86' | 'wc';

const KEY = 'html-editor-runtime-v1';

let _runtime: RuntimeKind | null = null;
const listeners = new Set<(r: RuntimeKind | null) => void>();

try {
  const saved = sessionStorage.getItem(KEY);
  if (saved === 'v86' || saved === 'wc') _runtime = saved;
} catch {}

export function getRuntime(): RuntimeKind | null { return _runtime; }

export function setRuntime(r: RuntimeKind) {
  _runtime = r;
  try { sessionStorage.setItem(KEY, r); } catch {}
  listeners.forEach(fn => { try { fn(r); } catch {} });
}

export function clearRuntime() {
  _runtime = null;
  try { sessionStorage.removeItem(KEY); } catch {}
  listeners.forEach(fn => { try { fn(null); } catch {} });
}

export function onRuntime(fn: (r: RuntimeKind | null) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
