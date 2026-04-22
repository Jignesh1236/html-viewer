import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore, FileItem } from '../store/editorStore';
import { wcManager } from '../lib/webcontainer';

const SYNC_DEBOUNCE = 600; // ms

function fileToWcPath(file: FileItem): string {
  if (file.folder) {
    return `/${file.folder.replace(/^\/|\/$/g, '')}/${file.name}`;
  }
  return `/${file.name}`;
}

export function useWebContainerSync() {
  const { files, updateFileContent, addFile } = useEditorStore();
  const prevFilesRef = useRef<FileItem[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingFromWC = useRef(false);
  const initialized = useRef(false);

  // Write store files to WebContainer when they change
  const syncToWC = useCallback(async () => {
    if (wcManager.status !== 'ready') return;
    if (isSyncingFromWC.current) return;

    const prev = prevFilesRef.current;
    const curr = files;

    for (const file of curr) {
      if (file.type === 'image') continue;
      const prevFile = prev.find(f => f.id === file.id);
      if (!prevFile || prevFile.content !== file.content) {
        const path = fileToWcPath(file);
        try {
          const parts = path.split('/').filter(Boolean);
          if (parts.length > 1) {
            const dir = '/' + parts.slice(0, -1).join('/');
            await wcManager.wc?.fs.mkdir(dir, { recursive: true }).catch(() => {});
          }
          await wcManager.writeFile(path, file.content);
        } catch (e) {
          console.warn('[WC Sync] write failed', path, e);
        }
      }
    }

    for (const pFile of prev) {
      const stillExists = curr.find(f => f.id === pFile.id);
      if (!stillExists) {
        try {
          await wcManager.deleteFile(fileToWcPath(pFile));
        } catch {}
      }
    }

    prevFilesRef.current = curr;
  }, [files]);

  // Initial mount: boot WebContainer and sync all files
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        // EditorGate already booted + mounted before showing the editor; this is a safety net.
        if (wcManager.status !== 'ready') {
          await wcManager.boot();
          await wcManager.mountFiles(files);
        }
        prevFilesRef.current = files;
      } catch (e) {
        console.warn('[WC Sync] initial boot failed', e);
      }
    })();
  }, []);

  // Debounced sync when files change
  useEffect(() => {
    if (!initialized.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(syncToWC, SYNC_DEBOUNCE);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [files, syncToWC]);

  // Poll WebContainer FS for new/changed files (created via terminal)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (wcManager.status !== 'ready') return;
      try {
        isSyncingFromWC.current = true;
        const wcFiles = await wcManager.readContainerFiles();
        const storeFiles = useEditorStore.getState().files;

        for (const wcFile of wcFiles) {
          if (wcFile.isDirectory) continue;
          const name = wcFile.path.split('/').pop() || '';
          const folder = wcFile.path.split('/').slice(1, -1).join('/') || undefined;
          const ext = name.split('.').pop()?.toLowerCase() || '';
          if (['image', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg'].includes(ext)) continue;

          const existingStore = storeFiles.find(f => {
            const p = f.folder ? `/${f.folder}/${f.name}` : `/${f.name}`;
            return p === wcFile.path;
          });

          if (existingStore) {
            if (existingStore.content !== wcFile.content && wcFile.content.length > 0) {
              isSyncingFromWC.current = true;
              useEditorStore.getState().updateFileContent(existingStore.id, wcFile.content);
              prevFilesRef.current = prevFilesRef.current.map(f =>
                f.id === existingStore.id ? { ...f, content: wcFile.content } : f
              );
            }
          } else {
            // New file from container - add to store
            const type: FileItem['type'] =
              ext === 'html' ? 'html' : ext === 'css' ? 'css' :
              ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'jsx' ? 'js' : 'other';
            if (typeof addFile === 'function') {
              const id = `wc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
              addFile({ id, name, type, content: wcFile.content, folder });
            }
          }
        }
        isSyncingFromWC.current = false;
      } catch {
        isSyncingFromWC.current = false;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);
}
