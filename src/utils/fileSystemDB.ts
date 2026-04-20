import { createFsFromVolume, Volume } from 'memfs';

const DB_NAME = 'html-editor-fs-v1';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_FOLDERS = 'folders';
const STORE_META = 'meta';

let _db: IDBDatabase | null = null;

async function getDb(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db!); };
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, stores: string[], mode: IDBTransactionMode) {
  return db.transaction(stores, mode);
}

export async function dbSaveFiles(files: object[]): Promise<void> {
  try {
    const db = await getDb();
    const t = tx(db, [STORE_FILES], 'readwrite');
    const store = t.objectStore(STORE_FILES);
    store.clear();
    for (const f of files) {
      store.put(f);
    }
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch (e) {
    console.warn('[FileSystemDB] dbSaveFiles failed:', e);
  }
}

export async function dbLoadFiles(): Promise<any[] | null> {
  try {
    const db = await getDb();
    const t = tx(db, [STORE_FILES], 'readonly');
    const store = t.objectStore(STORE_FILES);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[FileSystemDB] dbLoadFiles failed:', e);
    return null;
  }
}

export async function dbSaveFolders(folders: string[]): Promise<void> {
  try {
    const db = await getDb();
    const t = tx(db, [STORE_FOLDERS], 'readwrite');
    const store = t.objectStore(STORE_FOLDERS);
    store.clear();
    for (const name of folders) {
      store.put({ name });
    }
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch (e) {
    console.warn('[FileSystemDB] dbSaveFolders failed:', e);
  }
}

export async function dbLoadFolders(): Promise<string[] | null> {
  try {
    const db = await getDb();
    const t = tx(db, [STORE_FOLDERS], 'readonly');
    const store = t.objectStore(STORE_FOLDERS);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as { name: string }[]).map(r => r.name));
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[FileSystemDB] dbLoadFolders failed:', e);
    return null;
  }
}

export async function dbSaveMeta(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDb();
    const t = tx(db, [STORE_META], 'readwrite');
    t.objectStore(STORE_META).put(value, key);
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch (e) {
    console.warn('[FileSystemDB] dbSaveMeta failed:', e);
  }
}

export async function dbLoadMeta<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    const t = tx(db, [STORE_META], 'readonly');
    const req = t.objectStore(STORE_META).get(key);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[FileSystemDB] dbLoadMeta failed:', e);
    return null;
  }
}

export async function dbClear(): Promise<void> {
  try {
    const db = await getDb();
    const t = tx(db, [STORE_FILES, STORE_FOLDERS, STORE_META], 'readwrite');
    t.objectStore(STORE_FILES).clear();
    t.objectStore(STORE_FOLDERS).clear();
    t.objectStore(STORE_META).clear();
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch (e) {
    console.warn('[FileSystemDB] dbClear failed:', e);
  }
}

export let memVolume: Volume | null = null;
export let memFs: ReturnType<typeof createFsFromVolume> | null = null;

export function initMemFs(): void {
  memVolume = new Volume();
  memFs = createFsFromVolume(memVolume);
}

export function syncFilesToMemFs(files: { id: string; name: string; folder?: string; content: string; type: string }[]): void {
  if (!memFs || !memVolume) return;
  try {
    memVolume.reset();
    const dirs = new Set<string>();
    for (const f of files) {
      const dir = f.folder ? `/${f.folder}` : '/';
      dirs.add(dir);
    }
    for (const dir of dirs) {
      try { memFs!.mkdirSync(dir, { recursive: true }); } catch {}
    }
    for (const f of files) {
      if (f.type === 'image') continue;
      const path = f.folder ? `/${f.folder}/${f.name}` : `/${f.name}`;
      try { memFs!.writeFileSync(path, f.content || ''); } catch {}
    }
  } catch (e) {
    console.warn('[FileSystemDB] syncFilesToMemFs failed:', e);
  }
}

export function readFileFromMemFs(path: string): string | null {
  if (!memFs) return null;
  try {
    const p = path.startsWith('/') ? path : `/${path}`;
    return memFs.readFileSync(p, 'utf8') as string;
  } catch {
    return null;
  }
}

export function writeFileToMemFs(path: string, content: string): void {
  if (!memFs) return;
  try {
    const p = path.startsWith('/') ? path : `/${path}`;
    const dir = p.substring(0, p.lastIndexOf('/')) || '/';
    try { memFs.mkdirSync(dir, { recursive: true }); } catch {}
    memFs.writeFileSync(p, content);
  } catch (e) {
    console.warn('[FileSystemDB] writeFileToMemFs failed:', e);
  }
}

initMemFs();
