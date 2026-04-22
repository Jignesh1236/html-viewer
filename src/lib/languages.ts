export type LanguageId = 'jsts' | 'wasm' | 'python' | 'native';

export interface LanguageInfo {
  id: LanguageId;
  name: string;
  short: string;
  status: 'full' | 'experimental' | 'compiled';
  statusLabel: string;
  mechanism: string;
  description: string;
  examples: string[];
  defaultEnabled: boolean;
}

export const LANGUAGES: LanguageInfo[] = [
  {
    id: 'jsts',
    name: 'JavaScript / TypeScript',
    short: 'JS/TS',
    status: 'full',
    statusLabel: 'Full · Native',
    mechanism: 'Node.js Runtime',
    description: 'Run real Node.js v22 with npm, jsh, ESM and TypeScript out of the box.',
    examples: ['.js', '.ts', '.jsx', '.tsx', '.mjs', 'package.json'],
    defaultEnabled: true,
  },
  {
    id: 'wasm',
    name: 'WebAssembly',
    short: 'WASM',
    status: 'full',
    statusLabel: 'Full · Native',
    mechanism: 'Browser Runtime',
    description: 'Load and execute .wasm modules natively in the browser & in Node.',
    examples: ['.wasm', '.wat'],
    defaultEnabled: true,
  },
  {
    id: 'python',
    name: 'Python',
    short: 'Python',
    status: 'experimental',
    statusLabel: 'Experimental',
    mechanism: 'WASI · Pyodide',
    description: 'Run Python in the browser via Pyodide. Most stdlib + scientific stack works; some C-extensions do not.',
    examples: ['.py', 'requirements.txt'],
    defaultEnabled: false,
  },
  {
    id: 'native',
    name: 'C / C++ / Rust',
    short: 'C/C++/Rust',
    status: 'compiled',
    statusLabel: 'Via Compilation',
    mechanism: 'WebAssembly (Wasm)',
    description: 'Edit & compile native code targeting WebAssembly using emscripten / clang / wasm-pack toolchains.',
    examples: ['.c', '.cpp', '.h', '.rs', 'Cargo.toml', 'CMakeLists.txt'],
    defaultEnabled: false,
  },
];

const KEY = 'html-editor-languages-v1';
const READY_KEY = 'html-editor-languages-picked-v1';

let _selected: Set<LanguageId> | null = null;
const listeners = new Set<(l: Set<LanguageId>) => void>();

function load(): Set<LanguageId> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as LanguageId[];
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set(LANGUAGES.filter(l => l.defaultEnabled).map(l => l.id));
}

export function getLanguages(): Set<LanguageId> {
  if (!_selected) _selected = load();
  return new Set(_selected);
}

export function setLanguages(langs: Set<LanguageId> | LanguageId[]) {
  _selected = new Set(langs);
  try { localStorage.setItem(KEY, JSON.stringify([..._selected])); } catch {}
  listeners.forEach(fn => { try { fn(new Set(_selected!)); } catch {} });
}

export function onLanguages(fn: (l: Set<LanguageId>) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function hasPickedLanguages(): boolean {
  try {
    const sp = new URLSearchParams(location.search);
    if (sp.get('skipLanguagePicker') === '1') return true;
  } catch {}
  try { return sessionStorage.getItem(READY_KEY) === '1'; } catch { return false; }
}

export function markLanguagesPicked() {
  try { sessionStorage.setItem(READY_KEY, '1'); } catch {}
}

export function resetLanguagesPicked() {
  try { sessionStorage.removeItem(READY_KEY); } catch {}
}

export function getEnabledLanguageInfo(): LanguageInfo[] {
  const set = getLanguages();
  return LANGUAGES.filter(l => set.has(l.id));
}
