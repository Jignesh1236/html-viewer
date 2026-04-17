import React, { useState } from 'react';

export interface PaletteItem {
  icon: string;
  label: string;
  tag: string;
  defaultHtml: string;
  category: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { icon: '▭', label: 'Div', tag: 'div', category: 'Layout', defaultHtml: '<div style="padding:16px;border:1px dashed #aaa">Div block</div>' },
  { icon: '⬛', label: 'Section', tag: 'section', category: 'Layout', defaultHtml: '<section style="padding:24px">Section</section>' },
  { icon: '▤', label: 'Header', tag: 'header', category: 'Layout', defaultHtml: '<header style="padding:16px;background:#333;color:#fff">Header</header>' },
  { icon: '▣', label: 'Footer', tag: 'footer', category: 'Layout', defaultHtml: '<footer style="padding:16px;background:#222;color:#aaa">Footer</footer>' },
  { icon: 'H1', label: 'Heading 1', tag: 'h1', category: 'Text', defaultHtml: '<h1>Heading 1</h1>' },
  { icon: 'H2', label: 'Heading 2', tag: 'h2', category: 'Text', defaultHtml: '<h2>Heading 2</h2>' },
  { icon: 'H3', label: 'Heading 3', tag: 'h3', category: 'Text', defaultHtml: '<h3>Heading 3</h3>' },
  { icon: '¶', label: 'Paragraph', tag: 'p', category: 'Text', defaultHtml: '<p>Type your text here.</p>' },
  { icon: '🔗', label: 'Link', tag: 'a', category: 'Text', defaultHtml: '<a href="#">Link text</a>' },
  { icon: '⌚', label: 'Span', tag: 'span', category: 'Text', defaultHtml: '<span>Inline text</span>' },
  { icon: '⏩', label: 'Button', tag: 'button', category: 'UI', defaultHtml: '<button style="padding:10px 20px;background:#e5a45a;border:none;border-radius:6px;cursor:pointer;font-size:14px;color:#111">Button</button>' },
  { icon: '☐', label: 'Input', tag: 'input', category: 'UI', defaultHtml: '<input type="text" placeholder="Enter text..." style="padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px">' },
  { icon: '▽', label: 'Select', tag: 'select', category: 'UI', defaultHtml: '<select style="padding:8px;border:1px solid #ccc;border-radius:4px"><option>Option 1</option><option>Option 2</option></select>' },
  { icon: '☷', label: 'Textarea', tag: 'textarea', category: 'UI', defaultHtml: '<textarea rows="4" style="padding:8px;border:1px solid #ccc;border-radius:4px;resize:vertical" placeholder="Enter text..."></textarea>' },
  { icon: '🖼', label: 'Image', tag: 'img', category: 'Media', defaultHtml: '<img src="https://placehold.co/200x120" alt="Image" style="max-width:100%;border-radius:4px">' },
  { icon: '—', label: 'Divider', tag: 'hr', category: 'Layout', defaultHtml: '<hr style="border:none;border-top:2px solid #eee;margin:16px 0">' },
  { icon: '•', label: 'List (ul)', tag: 'ul', category: 'Text', defaultHtml: '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>' },
  { icon: '1.', label: 'List (ol)', tag: 'ol', category: 'Text', defaultHtml: '<ol><li>First</li><li>Second</li><li>Third</li></ol>' },
  { icon: '⊞', label: 'Table', tag: 'table', category: 'Layout', defaultHtml: '<table style="border-collapse:collapse;width:100%"><thead><tr><th style="border:1px solid #ccc;padding:8px">Col 1</th><th style="border:1px solid #ccc;padding:8px">Col 2</th></tr></thead><tbody><tr><td style="border:1px solid #ccc;padding:8px">Cell</td><td style="border:1px solid #ccc;padding:8px">Cell</td></tr></tbody></table>' },
  { icon: '◱', label: 'Card', tag: 'div', category: 'UI', defaultHtml: '<div style="padding:20px;background:#fff;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.1);max-width:280px"><h3 style="margin:0 0 8px">Card Title</h3><p style="margin:0;color:#666;font-size:14px">Card description goes here.</p></div>' },
  { icon: '☰', label: 'Nav', tag: 'nav', category: 'Layout', defaultHtml: '<nav style="display:flex;gap:16px;padding:12px 24px;background:#222"><a href="#" style="color:#ccc;text-decoration:none">Home</a><a href="#" style="color:#ccc;text-decoration:none">About</a><a href="#" style="color:#ccc;text-decoration:none">Contact</a></nav>' },
  { icon: '◫', label: 'Flex Row', tag: 'div', category: 'Layout', defaultHtml: '<div style="display:flex;gap:16px;align-items:center;padding:12px"><div style="padding:12px;background:#eee;border-radius:4px;flex:1">Item</div><div style="padding:12px;background:#eee;border-radius:4px;flex:1">Item</div></div>' },
  { icon: '⊟', label: 'Grid', tag: 'div', category: 'Layout', defaultHtml: '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px"><div style="padding:16px;background:#eee;border-radius:4px">Grid Item</div><div style="padding:16px;background:#eee;border-radius:4px">Grid Item</div><div style="padding:16px;background:#eee;border-radius:4px">Grid Item</div><div style="padding:16px;background:#eee;border-radius:4px">Grid Item</div></div>' },
];

const CATEGORIES = ['Layout', 'Text', 'UI', 'Media'];

interface Props {
  onInsert: (html: string) => void;
  onDragStart?: (html: string) => void;
  onDragEnd?: () => void;
}

const ElementsPalette: React.FC<Props> = ({ onInsert, onDragStart, onDragEnd }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState<PaletteItem | null>(null);

  const cats = ['All', ...CATEGORIES];
  const items = PALETTE_ITEMS.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchQ = !search || item.label.toLowerCase().includes(search.toLowerCase()) || item.tag.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e', borderLeft: '1px solid #333' }}>
      <div style={{
        height: 28, flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 10px', borderBottom: '1px solid #2e2e2e',
        fontSize: 10, fontWeight: 700, color: '#777', letterSpacing: '0.07em', textTransform: 'uppercase',
      }}>
        Elements
      </div>

      <div style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search elements…"
          style={{
            width: '100%', background: '#2a2a2a', border: '1px solid #3a3a3a',
            borderRadius: 4, padding: '4px 8px', fontSize: 11, color: '#ccc',
            outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0, flexWrap: 'wrap', padding: '4px 4px' }}>
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            style={{
              padding: '2px 7px', fontSize: 10, borderRadius: 3, cursor: 'pointer',
              fontFamily: 'inherit', border: 'none', margin: '1px',
              background: activeCategory === c ? 'rgba(229,164,90,0.2)' : 'transparent',
              color: activeCategory === c ? '#e5a45a' : '#666',
              fontWeight: activeCategory === c ? 700 : 400,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
        {items.map((item, i) => (
          <div
            key={i}
            draggable
            onDragStart={e => {
              setDragging(item);
              e.dataTransfer.setData('text/html-element', item.defaultHtml);
              e.dataTransfer.effectAllowed = 'copy';
              onDragStart?.(item.defaultHtml);
            }}
            onDragEnd={() => { setDragging(null); onDragEnd?.(); }}
            onClick={() => onInsert(item.defaultHtml)}
            title={`Click or drag to insert <${item.tag}>`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px',
              borderRadius: 5,
              cursor: 'grab',
              marginBottom: 1,
              background: dragging === item ? 'rgba(229,164,90,0.15)' : 'transparent',
              border: '1px solid transparent',
              transition: 'background 0.1s, border-color 0.1s',
              userSelect: 'none',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLElement).style.borderColor = '#333';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = dragging === item ? 'rgba(229,164,90,0.15)' : 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
            }}
          >
            <span style={{
              width: 26, height: 26, flexShrink: 0,
              background: '#2a2a2a', borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: item.icon.length > 2 ? 9 : 13, color: '#e5a45a',
              fontFamily: 'monospace', fontWeight: 700,
            }}>
              {item.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#ccc', fontWeight: 500, lineHeight: 1.3 }}>{item.label}</div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}>&lt;{item.tag}&gt;</div>
            </div>
            <span style={{ fontSize: 9, color: '#444', flexShrink: 0 }}>drag</span>
          </div>
        ))}
      </div>

      <div style={{
        height: 22, flexShrink: 0, borderTop: '1px solid #2e2e2e',
        display: 'flex', alignItems: 'center', padding: '0 8px',
        fontSize: 10, color: '#555',
      }}>
        Click or drag to insert
      </div>
    </div>
  );
};

export default ElementsPalette;
