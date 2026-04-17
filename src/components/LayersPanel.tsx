import React, { useCallback, useEffect, useRef, useState } from 'react';

const SKIP = new Set(['script', 'style', 'meta', 'link', 'title', 'base', 'noscript', 'head']);

export interface LayerNode {
  el: HTMLElement;
  tag: string;
  id: string;
  cls: string;
  children: LayerNode[];
  depth: number;
}

function buildTree(el: HTMLElement, depth = 0): LayerNode | null {
  const tag = el.tagName?.toLowerCase();
  if (!tag || SKIP.has(tag)) return null;
  const children: LayerNode[] = [];
  for (const child of Array.from(el.children)) {
    const node = buildTree(child as HTMLElement, depth + 1);
    if (node) children.push(node);
  }
  return { el, tag, id: el.id, cls: Array.from(el.classList).join(' '), children, depth };
}

function label(node: LayerNode) {
  if (node.id) return `<${node.tag}#${node.id}>`;
  if (node.cls) return `<${node.tag}.${node.cls.split(' ')[0]}>`;
  return `<${node.tag}>`;
}

interface RowProps {
  node: LayerNode;
  selectedEl: HTMLElement | null;
  multiSel: Set<HTMLElement>;
  onSelect: (el: HTMLElement, shift: boolean) => void;
  onMove: (el: HTMLElement, dir: 'up' | 'down') => void;
}

function LayerRow({ node, selectedEl, multiSel, onSelect, onMove }: RowProps) {
  const [open, setOpen] = useState(true);
  const isSel = node.el === selectedEl || multiSel.has(node.el);

  return (
    <div>
      <div
        onClick={e => { e.stopPropagation(); onSelect(node.el, e.shiftKey); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 8 + node.depth * 12,
          paddingRight: 4,
          height: 24,
          cursor: 'pointer',
          background: isSel
            ? (node.el === selectedEl ? 'rgba(229,164,90,0.18)' : 'rgba(100,160,255,0.12)')
            : 'transparent',
          borderLeft: isSel
            ? `2px solid ${node.el === selectedEl ? '#e5a45a' : '#64a0ff'}`
            : '2px solid transparent',
          fontSize: 11,
          color: isSel ? (node.el === selectedEl ? '#e5a45a' : '#7ab8f5') : '#aaa',
          userSelect: 'none',
          gap: 4,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => {
          if (!isSel) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={e => {
          if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        {node.children.length > 0 ? (
          <span
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            style={{ fontSize: 9, color: '#666', width: 12, textAlign: 'center', flexShrink: 0 }}
          >
            {open ? '▾' : '▸'}
          </span>
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
          {label(node)}
        </span>
        {isSel && node.el === selectedEl && (
          <span style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={e => { e.stopPropagation(); onMove(node.el, 'up'); }}
              title="Move up"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 10, padding: '0 2px', lineHeight: 1 }}
            >▲</button>
            <button
              onClick={e => { e.stopPropagation(); onMove(node.el, 'down'); }}
              title="Move down"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 10, padding: '0 2px', lineHeight: 1 }}
            >▼</button>
          </span>
        )}
      </div>
      {open && node.children.map((child, i) => (
        <LayerRow
          key={i}
          node={child}
          selectedEl={selectedEl}
          multiSel={multiSel}
          onSelect={onSelect}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

interface LayersPanelProps {
  iframeDoc: Document | null;
  selectedEl: HTMLElement | null;
  multiSel: Set<HTMLElement>;
  tick: number;
  onSelect: (el: HTMLElement, shift: boolean) => void;
  onMove: (el: HTMLElement, dir: 'up' | 'down') => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ iframeDoc, selectedEl, multiSel, tick, onSelect, onMove }) => {
  const [tree, setTree] = useState<LayerNode | null>(null);

  useEffect(() => {
    if (!iframeDoc?.body) { setTree(null); return; }
    setTree(buildTree(iframeDoc.body));
  }, [iframeDoc, tick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e', borderRight: '1px solid #333' }}>
      <div style={{
        height: 28, flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 10px', borderBottom: '1px solid #2e2e2e',
        fontSize: 10, fontWeight: 700, color: '#777', letterSpacing: '0.07em', textTransform: 'uppercase',
      }}>
        Layers
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {tree ? (
          <LayerRow
            node={tree}
            selectedEl={selectedEl}
            multiSel={multiSel}
            onSelect={onSelect}
            onMove={onMove}
          />
        ) : (
          <div style={{ padding: 12, fontSize: 11, color: '#555', textAlign: 'center' }}>
            No HTML loaded
          </div>
        )}
      </div>
      <div style={{
        height: 22, flexShrink: 0, borderTop: '1px solid #2e2e2e',
        display: 'flex', alignItems: 'center', padding: '0 8px',
        fontSize: 10, color: '#555',
      }}>
        Shift+click to multi-select
      </div>
    </div>
  );
};

export default LayersPanel;
