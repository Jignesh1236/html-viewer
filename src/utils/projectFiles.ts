import type { FileItem } from '../store/editorStore';

export function filePath(file: FileItem): string {
  return file.folder ? `${file.folder}/${file.name}` : file.name;
}

export function fileIdFor(name: string, folder?: string): string {
  return folder ? `${folder}/${name}` : name;
}

export function imageSource(file: Pick<FileItem, 'content' | 'mimeType' | 'url'>): string {
  if (file.url) return file.url;
  if (!file.content) return '';
  if (file.content.startsWith('data:')) return file.content;
  return `data:${file.mimeType || 'application/octet-stream'};base64,${file.content}`;
}

export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export function makeUniqueName(name: string, folder: string | undefined, files: FileItem[], ignoreId?: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let candidate = name;
  let i = 2;
  while (files.some(f => f.id !== ignoreId && f.folder === folder && f.name === candidate)) {
    candidate = `${base}-${i}${ext}`;
    i += 1;
  }
  return candidate;
}

export function makeUniqueFileId(name: string, folder: string | undefined, files: FileItem[], ignoreId?: string): string {
  return fileIdFor(makeUniqueName(name, folder, files, ignoreId), folder);
}

export function getTargetHtmlFile(files: FileItem[], activeFileId?: string | null): FileItem | undefined {
  const active = activeFileId ? files.find(f => f.id === activeFileId && f.type === 'html') : undefined;
  return active || files.find(f => f.type === 'html');
}

export function getTargetJsFile(files: FileItem[], activeFileId?: string | null): FileItem | undefined {
  const activeHtml = getTargetHtmlFile(files, activeFileId);
  if (activeHtml) {
    const scriptRefs = Array.from(activeHtml.content.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi))
      .map(m => normalizeAssetRef(m[1]));
    const linked = files.find(f => f.type === 'js' && scriptRefs.some(ref => ref === f.name || ref === f.id || ref === filePath(f)));
    if (linked) return linked;
  }
  return files.find(f => f.type === 'js');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeInlineStyle(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style');
}

function safeInlineScript(js: string): string {
  return js.replace(/<\/script/gi, '<\\/script');
}

function normalizeAssetRef(ref: string): string {
  return ref.replace(/^[./]+/, '').replace(/[?#].*$/, '');
}

function refPattern(file: FileItem): string {
  const refs = Array.from(new Set([file.name, file.id, filePath(file)]));
  return `(?:\\.?/|/)?(?:${refs.map(escapeRegExp).join('|')})(?:[?#][^"']*)?`;
}

export function insertBeforeClosingTag(html: string, tagName: 'head' | 'body', insertion: string): string {
  const closeRe = new RegExp(`</${tagName}>`, 'i');
  if (closeRe.test(html)) return html.replace(closeRe, `${insertion}\n</${tagName}>`);
  return tagName === 'head' ? `${insertion}\n${html}` : `${html}\n${insertion}`;
}

export function buildProjectHtml(files: FileItem[], htmlFile: FileItem, extraHead = ''): string {
  let html = htmlFile.content;

  files.filter(f => f.type === 'css').forEach(css => {
    const tag = `<style data-src="${css.id}">\n${safeInlineStyle(css.content)}\n</style>`;
    const re = new RegExp(`<link\\b[^>]*href=["']${refPattern(css)}["'][^>]*\\/?>`, 'gi');
    if (re.test(html)) html = html.replace(re, tag);
    else html = insertBeforeClosingTag(html, 'head', tag);
  });

  files.filter(f => f.type === 'js').forEach(js => {
    const tag = `<script data-src="${js.id}">\n${safeInlineScript(js.content)}\n</script>`;
    const re = new RegExp(`<script\\b[^>]*src=["']${refPattern(js)}["'][^>]*>\\s*</script>`, 'gi');
    if (re.test(html)) html = html.replace(re, tag);
    else html = insertBeforeClosingTag(html, 'body', tag);
  });

  files.filter(f => f.type === 'image').forEach(img => {
    const src = imageSource(img);
    if (!src) return;
    const re = new RegExp(`(src|href)=["']${refPattern(img)}["']`, 'gi');
    html = html.replace(re, `$1="${src}"`);
  });

  if (extraHead.trim()) html = insertBeforeClosingTag(html, 'head', extraHead);
  return html;
}
