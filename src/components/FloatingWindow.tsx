import React, { useRef, useState, useCallback } from 'react';
import { useContextMenu, ContextMenuItem } from './ContextMenu';

export interface WinRect { x: number; y: number; w: number; h: number; }

interface Props {
  id: string;
  title: string;
  icon?: React.ReactNode;
  rect: WinRect;
  zIndex: number;
  visible: boolean;
  minimized: boolean;
  docked?: boolean;
  onFloat?: () => void;
  onDock?: () => void;
  minW?: number;
  minH?: number;
  workspaceW: number;
  workspaceH: number;
  contextMenuExtra?: ContextMenuItem[];
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (rect: WinRect) => void;
  onClose: () => void;
  onMinimize: () => void;
  onDragPos?: (x: number, y: number) => void;   // fires during drag (for snap zones)
  onDragEnd?: (x: number, y: number) => void;   // fires on mouseup (for snap drop)
  children: React.ReactNode;
}

type ResizeDir = 'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
const RESIZE_CURSOR: Record<ResizeDir, string> = {
  n:'n-resize', ne:'ne-resize', e:'e-resize', se:'se-resize',
  s:'s-resize', sw:'sw-resize', w:'w-resize', nw:'nw-resize',
};

export function showCapture(cursor: string) {
  document.body.style.cursor = cursor;
  document.body.style.userSelect = 'none';
  const el = document.getElementById('__drag-capture');
  if (el) { el.style.display = 'block'; el.style.cursor = cursor; }
}
export function hideCapture() {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  const el = document.getElementById('__drag-capture');
  if (el) el.style.display = 'none';
}

const FloatingWindow: React.FC<Props> = ({
  id, title, icon, rect, zIndex, visible, minimized,
  docked = false, onFloat, onDock,
  minW = 160, minH = 80,
  workspaceW, workspaceH,
  contextMenuExtra,
  onFocus, onMove, onResize, onClose, onMinimize,
  onDragPos, onDragEnd,
  children,
}) => {
  const { show: showCtx, element: ctxEl } = useContextMenu();
  const [isMaximized, setIsMaximized] = useState(false);
  const prevRect = useRef<WinRect | null>(null);
  const [headerHov, setHeaderHov] = useState(false);

  /* ── Maximize toggle ── */
  const toggleMaximize = useCallback(() => {
    if (!isMaximized) { prevRect.current = rect; setIsMaximized(true); }
    else { setIsMaximized(false); if (prevRect.current) onResize(prevRect.current); }
    onFocus();
  }, [isMaximized, rect, onResize, onFocus]);

  /* ── Drag title bar (floating only) ── */
  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [data-no-drag]')) return;
    if (e.button !== 0 || isMaximized || docked) return;
    e.preventDefault(); onFocus();
    const startX = e.clientX, startY = e.clientY;
    const initX = rect.x, initY = rect.y;
    showCapture('move');
    const onMv = (ev: MouseEvent) => {
      const nx = Math.max(0, Math.min(workspaceW - rect.w, initX + ev.clientX - startX));
      const ny = Math.max(0, Math.min(workspaceH - 34, initY + ev.clientY - startY));
      onMove(nx, ny);
      onDragPos?.(ev.clientX, ev.clientY);
    };
    const onUp = (ev: MouseEvent) => {
      hideCapture();
      onDragEnd?.(ev.clientX, ev.clientY);
      window.removeEventListener('mousemove', onMv);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  }, [rect, onMove, onFocus, isMaximized, docked, workspaceW, workspaceH, onDragPos, onDragEnd]);

  /* ── Resize handles ── */
  const onResizeMd = useCallback((dir: ResizeDir, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isMaximized || docked) return;
    onFocus();
    const { x, y, w, h } = rect;
    const startX = e.clientX, startY = e.clientY;
    showCapture(RESIZE_CURSOR[dir]);
    const onMv = (ev: MouseEvent) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let nx = x, ny = y, nw = w, nh = h;
      if (dir.includes('e')) nw = Math.max(minW, w + dx);
      if (dir.includes('s')) nh = Math.max(minH, h + dy);
      if (dir.includes('w')) { nw = Math.max(minW, w - dx); nx = x + (w - nw); }
      if (dir.includes('n')) { nh = Math.max(minH, h - dy); ny = y + (h - nh); }
      onResize({ x: Math.max(0, nx), y: Math.max(0, ny), w: nw, h: nh });
    };
    const onUp = () => { hideCapture(); window.removeEventListener('mousemove', onMv); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  }, [rect, onResize, onFocus, isMaximized, docked, minW, minH]);

  /* ── Context menu ── */
  const onCtxMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (docked) {
      showCtx(e, [
        { label: `📌 ${title}`, disabled: true },
        { separator: true, label: '' },
        { label: 'Float Window (Unpin)', icon: '⬡', action: onFloat },
        { separator: true, label: '' },
        ...(contextMenuExtra || []),
        { separator: true, label: '' },
        { label: 'Close', icon: '✕', danger: true, action: onClose },
      ]);
    } else {
      showCtx(e, [
        { label: minimized ? 'Restore' : 'Minimize', icon: '—', action: onMinimize },
        { label: isMaximized ? 'Restore Size' : 'Maximize', icon: '□', action: toggleMaximize },
        ...(onDock ? [{ separator: true, label: '' }, { label: 'Dock to Slot (Pin)', icon: '📌', action: onDock }] : [] as ContextMenuItem[]),
        { separator: true, label: '' },
        ...(contextMenuExtra || []),
        { separator: true, label: '' },
        { label: 'Close', icon: '✕', danger: true, action: onClose },
      ]);
    }
  }, [docked, title, onFloat, onDock, contextMenuExtra, onClose, minimized, onMinimize, isMaximized, toggleMaximize, showCtx]);

  const effectiveRect = isMaximized ? { x: 0, y: 0, w: workspaceW, h: workspaceH } : rect;

  if (!visible) return <>{ctxEl}</>;

  const EDGE = 5, CORNER = 14;

  /* ════════════════════════════════════
     DOCKED mode — content only (no title bar)
  ════════════════════════════════════ */
  if (docked) {
    return (
      <>
        <div
          onMouseDown={onFocus}
          onContextMenu={onCtxMenu}
          style={{
          position: 'absolute',
          left: rect.x, top: rect.y, width: rect.w,
          height: rect.h,
          zIndex, display: 'flex', flexDirection: 'column',
          background: '#1e1e1e',
          borderRight: '1px solid #2d2d2d',
          borderBottom: '1px solid #2d2d2d',
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </div>
        {ctxEl}
      </>
    );
  }

  /* ════════════════════════════════════
     FLOATING mode — full controls, shadow, resize
  ════════════════════════════════════ */
  return (
    <>
      <div onMouseDown={onFocus} style={{
        position: 'absolute',
        left: effectiveRect.x, top: effectiveRect.y,
        width: effectiveRect.w,
        height: minimized ? 34 : effectiveRect.h,
        zIndex, display: 'flex', flexDirection: 'column',
        borderRadius: isMaximized ? 0 : 6,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
        background: '#1e1e1e',
      }}>
        {/* Title bar */}
        <div
          onMouseDown={onTitleMouseDown}
          onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) toggleMaximize(); }}
          onContextMenu={onCtxMenu}
          onMouseEnter={() => setHeaderHov(true)}
          onMouseLeave={() => setHeaderHov(false)}
          style={{
            height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
            padding: '0 8px 0 10px',
            background: headerHov ? '#2c2c2e' : '#252526',
            borderBottom: minimized ? 'none' : '1px solid #3e3e3e',
            cursor: isMaximized ? 'default' : 'move',
            userSelect: 'none', transition: 'background 0.12s',
          }}
        >
          {/* Traffic-light dots */}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} data-no-drag>
            <WinDot color="#ff5f57" title="Close" onClick={e => { e.stopPropagation(); onClose(); }} />
            <WinDot color="#febc2e" title="Minimize" onClick={e => { e.stopPropagation(); onMinimize(); }} />
            <WinDot color="#28c840" title={isMaximized ? 'Restore' : 'Maximize'} onClick={e => { e.stopPropagation(); toggleMaximize(); }} />
          </div>

          {icon && <span style={{ color: '#888', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>

          {onDock && !isMaximized && (
            <button
              title="Dock to slot"
              data-no-drag
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDock(); }}
              style={{ background: 'none', border: '1px solid transparent', borderRadius: 3, cursor: 'pointer', padding: '1px 6px', fontSize: 10, color: '#666', display: headerHov ? 'flex' : 'none', alignItems: 'center', gap: 3, flexShrink: 0, whiteSpace: 'nowrap', fontFamily: 'inherit' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e5a45a'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(229,164,90,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#666'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
            >📌 Dock</button>
          )}
        </div>

        {!minimized && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        )}

        {/* Resize handles */}
        {!isMaximized && !minimized && (
          <>
            <ResizeHandle dir="n"  style={{ top:0, left:CORNER, right:CORNER, height:EDGE, cursor:'n-resize' }} onMd={onResizeMd} />
            <ResizeHandle dir="s"  style={{ bottom:0, left:CORNER, right:CORNER, height:EDGE, cursor:'s-resize' }} onMd={onResizeMd} />
            <ResizeHandle dir="w"  style={{ left:0, top:CORNER, bottom:CORNER, width:EDGE, cursor:'w-resize' }} onMd={onResizeMd} />
            <ResizeHandle dir="e"  style={{ right:0, top:CORNER, bottom:CORNER, width:EDGE, cursor:'e-resize' }} onMd={onResizeMd} />
            <ResizeHandle dir="nw" style={{ top:0, left:0, width:CORNER, height:CORNER, cursor:'nw-resize' }} onMd={onResizeMd} />
            <ResizeHandle dir="ne" style={{ top:0, right:0, width:CORNER, height:CORNER, cursor:'ne-resize' }} onMd={onResizeMd} />
            <ResizeHandle dir="sw" style={{ bottom:0, left:0, width:CORNER, height:CORNER, cursor:'sw-resize' }} onMd={onResizeMd} />
            <ResizeHandle dir="se" style={{ bottom:0, right:0, width:CORNER, height:CORNER, cursor:'se-resize' }} onMd={onResizeMd} />
          </>
        )}
      </div>
      {ctxEl}
    </>
  );
};

function WinDot({ color, title, onClick }: { color: string; title: string; onClick: (e: React.MouseEvent) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 12, height: 12, borderRadius: '50%', background: hov ? color : `${color}77`, cursor: 'pointer', transition: 'background 0.12s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
}

function ResizeHandle({ dir, style, onMd }: { dir: ResizeDir; style: React.CSSProperties; onMd: (d: ResizeDir, e: React.MouseEvent) => void }) {
  return <div style={{ ...style, position: 'absolute', zIndex: 10, background: 'transparent' }} onMouseDown={e => onMd(dir, e)} />;
}

export default FloatingWindow;
