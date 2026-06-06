import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { FileItem } from '../store/editorStore';
import { dataUrlToBase64, filePath, imageSource } from './projectFiles';

export async function exportProject(files: FileItem[]) {
  const zip = new JSZip();

  for (const file of files) {
    const path = filePath(file);
    if (file.type === 'image') {
      if (file.content) {
        const content = file.content.startsWith('data:') ? dataUrlToBase64(file.content) : file.content;
        zip.file(path, content, { base64: true });
        continue;
      }

      const src = imageSource(file);
      if (!src) continue;
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        zip.file(path, blob);
      } catch {
        // Skip inaccessible remote images.
      }
    } else if (file.content) {
      zip.file(path, file.content);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'project.zip');
}

export function exportSingleFile(file: FileItem) {
  const blob = new Blob([file.content], { type: file.mimeType || 'text/plain;charset=utf-8' });
  saveAs(blob, file.name);
}
