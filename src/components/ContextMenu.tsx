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

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => {
      document.addEventListener('mousedown', down);
      document.addEventListener('keydown', key);
    }, 0);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [onClose]);

  // Clamp to viewport
  const W = 200, itemH = 28;
  const approxH = items.length * itemH;
  const cx = Math.min(x, window.innerWidth - W - 8);
  const cy = Math.min(y, window.innerHeight - approxH - 8);

  return (
    <div
      ref={ref}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'fixed',
        left: cx,
        top: cy,
        width: W,
        background: '#2a2a2a',
        border: '1px solid #4a4a4a',
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        zIndex: 99999,
        padding: '4px 0',
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
              padding: '5px 12px',
              background: 'none',
              border: 'none',
              cursor: item.disabled ? 'default' : 'pointer',
              fontSize: 12,
              color: item.disabled ? '#555' : item.danger ? '#f88' : '#ccc',
              gap: 8,
              textAlign: 'left',
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.1s',
            }}
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
  const hide = () => setMenu(null);
  const element = menu ? <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={hide} /> : null;
  return { show, hide, element };
}
