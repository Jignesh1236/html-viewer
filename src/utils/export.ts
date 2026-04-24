import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { FileItem } from '../store/editorStore';

export async function exportProject(files: FileItem[]) {
  const zip = new JSZip();

  for (const file of files) {
    const filePath = file.folder ? `${file.folder}/${file.name}` : file.name;
    if (file.type === 'image' && file.url) {
      // Fetch the blob for uploaded images
      try {
        const response = await fetch(file.url);
        const blob = await response.blob();
        zip.file(filePath, blob);
      } catch {
        // Skip if can't fetch
      }
    } else if (file.content) {
      zip.file(filePath, file.content);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'project.zip');
}

export function exportSingleFile(file: FileItem) {
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, file.name);
}
