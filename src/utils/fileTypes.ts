import type { FileItem, FileType, ProjectType } from '../store/editorStore';

export const TEXT_EXTENSIONS = ['html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'json', 'txt', 'md', 'markdown', 'svg', 'vue', 'svelte'] as const;
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'] as const;

export function getExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() || '';
}

export function getFileTypeForName(name: string): FileType {
  const ext = getExtension(name);
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less') return 'css';
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'js';
  if (ext === 'ts') return 'ts';
  if (ext === 'tsx') return 'tsx';
  if (ext === 'jsx') return 'jsx';
  if (ext === 'json') return 'json';
  if ((IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return 'image';
  return 'other';
}

export function isTextExtension(name: string) {
  return (TEXT_EXTENSIONS as readonly string[]).includes(getExtension(name));
}

export function isImageExtension(name: string) {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(getExtension(name));
}

export function isScriptFile(file: FileItem) {
  return file.type === 'js' || file.type === 'ts' || file.type === 'tsx' || file.type === 'jsx';
}

export function isRuntimeSourceFile(file: FileItem) {
  return ['html', 'css', 'js', 'ts', 'tsx', 'jsx', 'json'].includes(file.type);
}

export function getMonacoLanguage(file: { name: string; type: string }) {
  const ext = getExtension(file.name);
  const byExt: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass',
    less: 'less', js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    cjs: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json',
    md: 'markdown', markdown: 'markdown', py: 'python', rb: 'ruby',
    php: 'php', java: 'java', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp',
    cxx: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', swift: 'swift',
    kt: 'kotlin', kts: 'kotlin', sql: 'sql', sh: 'shell', bash: 'shell',
    zsh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'xml',
    vue: 'html', svelte: 'html', txt: 'plaintext',
  };
  const byType: Record<string, string> = {
    html: 'html', css: 'css', js: 'javascript', ts: 'typescript',
    tsx: 'typescript', jsx: 'javascript', json: 'json', other: 'plaintext',
  };
  return byExt[ext] || byType[file.type] || 'plaintext';
}

export function detectProjectType(files: FileItem[]): ProjectType {
  const packageFile = files.find(f => f.name === 'package.json' || f.id.endsWith('/package.json'));
  const hasHtml = files.some(f => f.type === 'html');
  const hasReactSource = files.some(f => f.type === 'tsx' || f.type === 'jsx' || /from\s+['"]react['"]|import\s+React/.test(f.content));
  const hasServerSource = files.some(f => /(^|\/)(server|api|index)\.(js|ts)$/.test(f.id) && /(express|fastify|createServer|listen\()/.test(f.content));

  if (packageFile) {
    try {
      const pkg = JSON.parse(packageFile.content || '{}');
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const scripts = pkg.scripts || {};
      const hasReact = Boolean(deps.react || deps['@vitejs/plugin-react'] || String(scripts.dev || '').includes('vite'));
      const hasNode = Boolean(deps.express || deps.fastify || hasServerSource || String(scripts.start || '').includes('node'));
      if (hasReact && hasNode) return 'fullstack';
      if (hasReact || hasReactSource) return 'react';
      if (hasNode) return 'node';
    } catch {}
  }

  if (hasReactSource) return 'react';
  if (hasServerSource) return 'node';
  if (hasHtml) return 'static';
  return 'static';
}

export function projectTypeLabel(projectType: ProjectType) {
  return projectType === 'static' ? 'Static HTML'
    : projectType === 'react' ? 'React/Vite'
    : projectType === 'node' ? 'Node'
    : 'Fullstack';
}