import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<Props> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = React.useState<number>(-1);

  const actionableIndexes = React.useMemo(
    () => items.map((item, idx) => ({ item, idx })).filter(({ item }) => !item.separator && !item.disabled && !!item.action).map(({ idx }) => idx),
    [items]
  );

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (actionableIndexes.length === 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentPos = actionableIndexes.indexOf(focusIdx);
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const nextPos = currentPos === -1
          ? (delta > 0 ? 0 : actionableIndexes.length - 1)
          : (currentPos + delta + actionableIndexes.length) % actionableIndexes.length;
        setFocusIdx(actionableIndexes[nextPos]);
      }
      if (e.key === 'Enter' && focusIdx >= 0) {
        e.preventDefault();
        const target = items[focusIdx];
        if (!target?.disabled && target.action) {
          target.action();
          onClose();
        }
      }
    };
    const scrollOrResize = () => onClose();
    setTimeout(() => {
      document.addEventListener('mousedown', down);
      document.addEventListener('keydown', key);
      window.addEventListener('resize', scrollOrResize);
      window.addEventListener('scroll', scrollOrResize, true);
    }, 0);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', scrollOrResize);
      window.removeEventListener('scroll', scrollOrResize, true);
    };
  }, [onClose, actionableIndexes, focusIdx, items]);

  useEffect(() => {
    if (actionableIndexes.length > 0) setFocusIdx(actionableIndexes[0]);
    else setFocusIdx(-1);
  }, [actionableIndexes]);

  // Clamp to viewport
  const W = 240, itemH = 30;
  const approxH = items.length * itemH;
  const cx = Math.min(x, window.innerWidth - W - 8);
  const cy = Math.min(y, window.innerHeight - approxH - 8);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
        onMouseDown={onClose}
        onContextMenu={e => { e.preventDefault(); onClose(); }}
      />
    <div
      ref={ref}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'fixed',
        left: cx,
        top: cy,
        width: W,
        background: '#252526',
        border: '1px solid #3f3f46',
        borderRadius: 8,
        boxShadow: '0 16px 40px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.35)',
        zIndex: 99999,
        padding: '6px 0',
        animation: 'fadeInMenu 0.1s ease',
        userSelect: 'none',
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} style={{ height: 1, background: '#3e3e3e', margin: '4px 0' }} />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled && item.action) {
                item.action();
                onClose();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              cursor: item.disabled ? 'default' : 'pointer',
              fontSize: 12,
              color: item.disabled ? '#555' : item.danger ? '#f88' : '#ccc',
              gap: 8,
              textAlign: 'left',
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.1s',
              outline: 'none',
              boxSizing: 'border-box',
              borderLeft: focusIdx === i ? '2px solid #e5a45a' : '2px solid transparent',
            }}
            onMouseMove={() => { if (!item.disabled && item.action) setFocusIdx(i); }}
            onMouseEnter={e => {
              if (!item.disabled) (e.currentTarget as HTMLButtonElement).style.background = item.danger ? 'rgba(255,100,100,0.12)' : 'rgba(229,164,90,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
            }}
          >
            {item.icon && <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && <span style={{ fontSize: 10, color: '#666' }}>{item.shortcut}</span>}
          </button>
        )
      )}
    </div>
    </>
  );
};

export default ContextMenu;

/* Hook for easy context menu usage */
export function useContextMenu() {
  const [menu, setMenu] = React.useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const show = (e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  };
  const hide = () => {
    setMenu(null);
  };
  const element = menu ? <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={hide} /> : null;
  return { show, hide, element };
}
