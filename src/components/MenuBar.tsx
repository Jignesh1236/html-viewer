import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { exportProject } from '../utils/export';
import type { WinId, WinState } from '../App';
import { getTargetHtmlFile } from '../utils/projectFiles';

interface MenuBarProps {
  wins?: WinState[];
  onToggleWin?: (id: WinId) => void;
  onOpenWin?: (id: WinId, asDocked?: boolean) => void;
  onResetLayout?: () => void;
  onApplyModePreset?: (m: 'code' | 'visual' | 'split') => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
  danger?: boolean;
  badge?: string;        // small colored badge text
  badgeColor?: string;
}

const WIN_LABELS: Record<WinId, string> = {
  files: 'File Explorer', code: 'Code Editor', preview: 'Preview / Visual Editor',
  properties: 'Properties', timeline: 'Timeline', events: 'Event Listeners',
  'anim-presets': 'Anim Presets', 'anim-config': 'Anim Config', 'anim-tracks': 'Anim Tracks',
  'gsap-editor': 'GSAP Editor', 'gsap-timeline': 'GSAP Timeline',
  'vanta-editor': 'OGL Shader FX',
};
const WIN_ICONS: Record<WinId, string> = {
  files: '', code: '', preview: '', properties: '', timeline: '', events: '',
  'anim-presets': '', 'anim-config': '', 'anim-tracks': '',
  'gsap-editor': '', 'gsap-timeline': '', 'vanta-editor': '',
};

const MenuBar: React.FC<MenuBarProps> = ({
  wins = [], onToggleWin, onOpenWin, onResetLayout, onApplyModePreset,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { files, activeFileId, mode, showNotification, clearConsole, setPendingFileDialog, updateFileContent, addFolder, clearProject, autoSave, setAutoSave } = useEditorStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const close = () => setOpenMenu(null);

  const htmlFile = getTargetHtmlFile(files, activeFileId);

  const formatHtml = (input: string) => {
    let indent = 0;
    return input
      .replace(/>\s*</g, '><')
      .replace(/></g, '>\n<')
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
        const out = `${'  '.repeat(indent)}${trimmed}`;
        if (!trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) indent++;
        return out;
      })
      .filter(Boolean)
      .join('\n');
  };

  const minifyHtml = (input: string) =>
    input
      .replace(/>\s+</g, '><')
      .replace(/\n+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const validateHtml = (input: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');
    return !doc.querySelector('parsererror');
  };

  const checkAccessibility = (input: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');
    const missingAlt = doc.querySelectorAll('img:not([alt])').length;
    const missingButtonLabel = Array.from(doc.querySelectorAll('button')).filter(btn => !btn.textContent?.trim() && !btn.getAttribute('aria-label')).length;
    return { missingAlt, missingButtonLabel };
  };

  const newFile = () => {
    setPendingFileDialog({ type: 'create' });
    close();
  };

  const newFolder = () => {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    addFolder(name.trim());
    showNotification(`Folder "${name.trim()}" created`);
    close();
  };

  /* Build the Window menu dynamically */
  const buildWindowMenu = (): MenuItem[] => {
    const items: MenuItem[] = [];

    // Layout presets section
    items.push({ label: 'LAYOUT PRESETS', disabled: true });
    items.push({
      label: 'Code Layout', shortcut: 'Ctrl+1', checked: mode === 'code',
      badge: mode === 'code' ? 'active' : undefined, badgeColor: '#e5a45a',
      action: () => { onApplyModePreset?.('code'); close(); },
    });
    items.push({
      label: 'Visual Layout', shortcut: 'Ctrl+2', checked: mode === 'visual',
      badge: mode === 'visual' ? 'active' : undefined, badgeColor: '#e5a45a',
      action: () => { onApplyModePreset?.('visual'); close(); },
    });
    items.push({
      label: 'Split Layout', shortcut: 'Ctrl+3', checked: mode === 'split',
      badge: mode === 'split' ? 'active' : undefined, badgeColor: '#e5a45a',
      action: () => { onApplyModePreset?.('split'); close(); },
    });
    items.push({ separator: true, label: '' });

    // Per-panel entries — show/hide toggle
    items.push({ label: 'PANELS', disabled: true });
    for (const w of wins) {
      items.push({
        label: WIN_LABELS[w.id],
        checked: w.visible,
        badge: w.visible ? 'open' : 'closed',
        badgeColor: w.visible ? '#7ab8f5' : '#555',
        action: () => {
          if (!w.visible) {
            onOpenWin?.(w.id);
          } else {
            onToggleWin?.(w.id);
          }
          close();
        },
      });
    }

    items.push({ separator: true, label: '' });
    items.push({ label: 'Reset Layout to Defaults', shortcut: 'Ctrl+0', action: () => { onResetLayout?.(); close(); } });
    return items;
  };

  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: newFile },
        { label: 'New Folder', action: newFolder },
        { separator: true, label: '' },
        { label: 'Save All', shortcut: 'Ctrl+S', action: () => { showNotification('All files saved ✓'); if (!autoSave) useEditorStore.getState().refreshPreview(); close(); } },
        {
          label: `Auto Save: ${autoSave ? 'ON' : 'OFF'}`,
          checked: autoSave,
          badge: autoSave ? 'on' : 'off',
          badgeColor: autoSave ? '#4ec98e' : '#888',
          action: () => { setAutoSave(!autoSave); showNotification(`Auto Save ${!autoSave ? 'enabled' : 'disabled'}`); close(); },
        },
        { separator: true, label: '' },
        { label: 'Import Files…', action: () => { document.getElementById('global-file-upload')?.click(); close(); } },
        { separator: true, label: '' },
        { label: 'Export as ZIP', shortcut: 'Ctrl+E', action: () => { exportProject(files); showNotification('Exported as ZIP'); close(); } },
        { separator: true, label: '' },
        {
          label: 'Clear Project', danger: true,
          action: () => {
            if (!window.confirm('Delete all project files and start fresh? This keeps empty HTML, CSS, and JS files.')) return;
            clearProject();
            showNotification('Project cleared — fresh start!');
            close();
          },
        },
      ],
    },
    {
      label: 'Export',
      items: [
        { label: 'Export ZIP (All Files)', action: () => { exportProject(files); showNotification('Exported as ZIP'); close(); } },
        { label: 'Export HTML only', action: () => { exportProject(files.filter(f => f.type === 'html')); close(); } },
        { label: 'Export CSS only',  action: () => { exportProject(files.filter(f => f.type === 'css'));  close(); } },
        { label: 'Export JS only',   action: () => { exportProject(files.filter(f => f.type === 'js'));   close(); } },
        { separator: true, label: '' },
        { label: 'Copy HTML to Clipboard', action: () => { navigator.clipboard.writeText(htmlFile?.content || ''); showNotification('HTML copied'); close(); } },
      ],
    },
    {
      label: 'Tools',
      items: [
        {
          label: 'Validate HTML',
          action: () => {
            if (!htmlFile) { showNotification('No HTML file found'); close(); return; }
            const ok = validateHtml(htmlFile.content);
            showNotification(ok ? 'HTML looks valid' : 'HTML parser found issues');
            close();
          },
        },
        {
          label: 'Check Accessibility',
          action: () => {
            if (!htmlFile) { showNotification('No HTML file found'); close(); return; }
            const a11y = checkAccessibility(htmlFile.content);
            if (a11y.missingAlt === 0 && a11y.missingButtonLabel === 0) {
              showNotification('Accessibility quick-check passed');
            } else {
              showNotification(`A11y: missing alt(${a11y.missingAlt}), unlabeled buttons(${a11y.missingButtonLabel})`);
            }
            close();
          },
        },
        { separator: true, label: '' },
        { label: 'Clear Console', action: () => { clearConsole(); close(); } },
        { label: 'Hard Refresh Preview', shortcut: 'Ctrl+R', action: () => { useEditorStore.getState().refreshPreview(); close(); } },
        { separator: true, label: '' },
        {
          label: 'Format HTML',
          action: () => {
            if (!htmlFile) { showNotification('No HTML file found'); close(); return; }
            const formatted = formatHtml(htmlFile.content);
            updateFileContent(htmlFile.id, formatted);
            showNotification('HTML formatted');
            close();
          },
        },
        {
          label: 'Minify HTML',
          action: () => {
            if (!htmlFile) { showNotification('No HTML file found'); close(); return; }
            const minified = minifyHtml(htmlFile.content);
            updateFileContent(htmlFile.id, minified);
            showNotification('HTML minified');
            close();
          },
        },
      ],
    },
    {
      label: 'Window',
      items: buildWindowMenu(),
    },
    {
      label: 'Help',
      items: [
        { label: 'User Guide / Documentation', action: () => { window.location.href = '/docs'; close(); } },
        { label: 'Privacy Policy', action: () => { window.location.href = '/privacy'; close(); } },
        { label: 'Terms of Service', action: () => { window.location.href = '/terms'; close(); } },
        { separator: true, label: '' },
        { label: 'Keyboard Shortcuts', action: () => { showNotification('Ctrl+1/2/3 Layout | Ctrl+S Save | Ctrl+E Export | Ctrl+R Refresh'); close(); } },
        { label: 'Drag floating window to dock slot', disabled: true },
        { label: 'Right-click docked panel to float', disabled: true },
        { label: 'Drag divider between panels to resize', disabled: true },
        { separator: true, label: '' },
        { label: 'About HTML Editor v2.0', action: () => { showNotification('HTML Editor v2.0 — Floating + Docked Window System'); close(); } },
      ],
    },
  ];

  return (
    <div ref={menuRef} style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
      {menus.map(menu => (
        <div
          key={menu.label}
          style={{ position: 'relative' }}
          onMouseEnter={() => { if (openMenu && openMenu !== menu.label) setOpenMenu(menu.label); }}
        >
          <button
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            style={{
              height: '100%', padding: '0 11px',
              background: openMenu === menu.label
                ? 'rgba(255,255,255,0.09)'
                : 'transparent',
              border: 'none', cursor: 'pointer',
              color: openMenu === menu.label ? '#e8e8e8' : '#b0b0b8',
              fontSize: 12, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              fontWeight: 500, letterSpacing: '0.01em',
              borderBottom: `2px solid ${openMenu === menu.label ? 'rgba(229,164,90,0.5)' : 'transparent'}`,
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={e => { if (openMenu !== menu.label) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#d0d0d8'; } }}
            onMouseLeave={e => { if (openMenu !== menu.label) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#b0b0b8'; } }}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 100000,
              background: 'linear-gradient(180deg,#35353d 0%,#2e2e36 100%)',
              border: '1px solid rgba(0,0,0,0.7)',
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.07)',
              minWidth: 290, padding: '4px 0',
              maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
              animation: 'fadeIn 0.12s ease',
            }}>
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} style={{ height: 1, background: 'rgba(0,0,0,0.4)', margin: '4px 0', boxShadow: '0 1px 0 rgba(255,255,255,0.04)' }} />
                ) : item.disabled ? (
                  <div key={i} style={{ padding: '5px 14px 2px', fontSize: 9, fontWeight: 800, color: '#444454', letterSpacing: '0.1em', userSelect: 'none', textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                ) : (
                  <MenuRow key={i} item={item} />
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

function MenuRow({ item }: { item: MenuItem }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={item.disabled ? undefined : item.action}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px 5px 8px',
        cursor: item.disabled ? 'default' : 'pointer',
        background: hov && !item.disabled ? 'rgba(255,255,255,0.07)' : 'transparent',
        color: item.disabled ? '#555' : item.danger ? '#f88' : '#ccc',
        fontSize: 12, userSelect: 'none', transition: 'background 0.08s',
      }}
    >
      {/* Checkmark column */}
      <span style={{ width: 14, textAlign: 'center', fontSize: 11, color: '#e5a45a', flexShrink: 0 }}>
        {item.checked ? '✓' : ''}
      </span>

      {/* Label */}
      <span style={{ flex: 1 }}>{item.label}</span>

      {/* Badge */}
      {item.badge && (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
          background: `${item.badgeColor || '#666'}22`,
          color: item.badgeColor || '#888',
          border: `1px solid ${item.badgeColor || '#666'}44`,
          letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
        }}>
          {item.badge}
        </span>
      )}

      {/* Shortcut */}
      {item.shortcut && (
        <span style={{ fontSize: 10, color: '#555', paddingLeft: 8, flexShrink: 0 }}>{item.shortcut}</span>
      )}
    </div>
  );
}

export default MenuBar;
