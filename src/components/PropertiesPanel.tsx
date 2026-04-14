import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface SectionProps { title: string; children: React.ReactNode; defaultOpen?: boolean }
const Section: React.FC<SectionProps> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #3e3e3e' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 10px', cursor: 'pointer', userSelect: 'none',
          background: 'rgba(0,0,0,0.2)', fontSize: 10,
          fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: open ? '#ccc' : '#888',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
      >
        <span>{title}</span>
        {open ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
      </div>
      {open && <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>}
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode; labelWidth?: number }> = ({ label, children, labelWidth = 64 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontSize: 11, color: '#888', width: labelWidth, flexShrink: 0 }}>{label}</span>
    <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>{children}</div>
  </div>
);

// Shared input style
const inp: React.CSSProperties = {
  flex: 1, background: '#1a1a1a', border: '1px solid #3e3e3e', borderRadius: 3,
  padding: '3px 6px', fontSize: 12, color: '#ccc', fontFamily: 'var(--app-font-mono)',
  outline: 'none', minWidth: 0,
};

const sel: React.CSSProperties = {
  flex: 1, background: '#1a1a1a', border: '1px solid #3e3e3e', borderRadius: 3,
  padding: '3px 6px', fontSize: 12, color: '#ccc', outline: 'none',
};

function BtnGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, flex: 1 }}>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            flex: 1, padding: '3px 2px', fontSize: 10,
            background: value === o ? 'rgba(229,164,90,0.15)' : '#1a1a1a',
            border: `1px solid ${value === o ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`,
            borderRadius: 3, cursor: 'pointer',
            color: value === o ? '#e5a45a' : '#888',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
      <input
        type="color"
        value={value.startsWith('#') ? value : '#000000'}
        onChange={e => { onChange(e.target.value); setText(e.target.value); }}
        style={{ width: 28, height: 24, padding: 2, border: '1px solid #3e3e3e', borderRadius: 3, background: '#1a1a1a', cursor: 'pointer', flexShrink: 0 }}
      />
      <input
        style={inp}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => onChange(text)}
        onKeyDown={e => e.key === 'Enter' && onChange(text)}
        placeholder="e.g. #ff0000 or rgba(0,0,0,0.5)"
      />
    </div>
  );
}

function PropInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input
      style={inp}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onChange(local)}
      onKeyDown={e => e.key === 'Enter' && onChange(local)}
      placeholder={placeholder}
    />
  );
}

const PropertiesPanel: React.FC<{ onClose?: () => void; hideHeader?: boolean }> = ({ onClose, hideHeader }) => {
  const { selectedElement, animationConfig, setAnimationConfig } = useEditorStore();

  const apply = (property: string, value: string) => {
    selectedElement?.applyStyle(property, value);
  };

  const getS = (key: string) => selectedElement?.styles?.[key] || '';

  if (!selectedElement) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {!hideHeader && <div style={{
          height: 35, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 10px', borderBottom: '1px solid #3e3e3e', background: '#252526',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888',
        }}>
          Properties
        </div>}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, color: '#555', padding: 24, textAlign: 'center',
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
          </svg>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>
            Switch to <strong style={{ color: '#888' }}>Visual mode</strong> and click any element to edit its properties here
          </div>
          <div style={{ fontSize: 10, color: '#444', lineHeight: 1.5 }}>
            Supports typography, layout, background, borders, shadows, animations and more
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      {!hideHeader && <div style={{
        height: 35, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 10px', borderBottom: '1px solid #3e3e3e', background: '#252526',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888' }}>Properties</span>
        <code style={{
          fontSize: 11, color: '#e5a45a', background: 'rgba(229,164,90,0.1)',
          border: '1px solid rgba(229,164,90,0.25)', borderRadius: 3, padding: '0 6px',
        }}>
          &lt;{selectedElement.tagName}{selectedElement.id ? '#' + selectedElement.id : ''}&gt;
        </code>
      </div>}
      {hideHeader && selectedElement && (
        <div style={{ padding: '5px 10px', background: 'rgba(229,164,90,0.06)', borderBottom: '1px solid #3e3e3e', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <code style={{ fontSize: 11, color: '#e5a45a' }}>
            &lt;{selectedElement.tagName}{selectedElement.id ? '#' + selectedElement.id : ''}&gt;
          </code>
          {selectedElement.className && (
            <span style={{ fontSize: 10, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              .{selectedElement.className.trim().split(/\s+/).join(' .')}
            </span>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Content */}
        <Section title="Content">
          <Row label="HTML">
            <textarea
              style={{ ...inp, height: 56, resize: 'none', width: '100%', flex: 'none' } as any}
              defaultValue={selectedElement.innerHTML}
              key={selectedElement.tagName + selectedElement.id}
              onBlur={e => selectedElement.applyContent(e.target.value)}
            />
          </Row>
          <Row label="Text">
            <PropInput
              value={selectedElement.textContent}
              placeholder="Plain text content"
              onChange={v => selectedElement.applyContent(v)}
            />
          </Row>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <Row label="Color">
            <ColorInput value={getS('color') || '#333333'} onChange={v => apply('color', v)} />
          </Row>
          <Row label="Size">
            <PropInput value={getS('font-size') || '16px'} onChange={v => apply('font-size', v)} placeholder="16px" />
          </Row>
          <Row label="Weight">
            <BtnGroup
              options={['100', '300', '400', '600', '700', '900']}
              value={getS('font-weight') || '400'}
              onChange={v => apply('font-weight', v)}
            />
          </Row>
          <Row label="Align">
            <BtnGroup
              options={['left', 'center', 'right', 'justify']}
              value={getS('text-align') || 'left'}
              onChange={v => apply('text-align', v)}
            />
          </Row>
          <Row label="Family">
            <select style={sel} value={getS('font-family')} onChange={e => apply('font-family', e.target.value)}>
              {['sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma'].map(f => <option key={f}>{f}</option>)}
            </select>
          </Row>
          <Row label="Line H">
            <PropInput value={getS('line-height') || '1.6'} onChange={v => apply('line-height', v)} placeholder="1.6" />
          </Row>
          <Row label="Decoration">
            <BtnGroup
              options={['none', 'underline', 'line-through', 'overline']}
              value={getS('text-decoration') || 'none'}
              onChange={v => apply('text-decoration', v)}
            />
          </Row>
          <Row label="Transform">
            <BtnGroup
              options={['none', 'uppercase', 'lowercase', 'capitalize']}
              value={getS('text-transform') || 'none'}
              onChange={v => apply('text-transform', v)}
            />
          </Row>
        </Section>

        {/* Background */}
        <Section title="Background">
          <Row label="Color">
            <ColorInput value={getS('background-color') || '#ffffff'} onChange={v => apply('background-color', v)} />
          </Row>
          <Row label="Image">
            <PropInput value={getS('background-image') || ''} onChange={v => apply('background-image', v)} placeholder="url(...)" />
          </Row>
          <Row label="Size">
            <BtnGroup
              options={['auto', 'cover', 'contain']}
              value={getS('background-size') || 'auto'}
              onChange={v => apply('background-size', v)}
            />
          </Row>
          <Row label="Opacity">
            <input
              type="range" min="0" max="1" step="0.01"
              defaultValue={getS('opacity') || '1'}
              style={{ flex: 1 }}
              onInput={e => apply('opacity', (e.target as HTMLInputElement).value)}
            />
            <span style={{ fontSize: 11, color: '#888', width: 30, textAlign: 'right', flexShrink: 0 }}>
              {Math.round(parseFloat(getS('opacity') || '1') * 100)}%
            </span>
          </Row>
        </Section>

        {/* Border */}
        <Section title="Border" defaultOpen={false}>
          <Row label="Width">
            <PropInput value={getS('border-width') || '0px'} onChange={v => apply('border-width', v)} placeholder="0px" />
          </Row>
          <Row label="Color">
            <ColorInput value={getS('border-color') || '#cccccc'} onChange={v => apply('border-color', v)} />
          </Row>
          <Row label="Style">
            <BtnGroup
              options={['none', 'solid', 'dashed', 'dotted', 'double']}
              value={getS('border-style') || 'none'}
              onChange={v => apply('border-style', v)}
            />
          </Row>
          <Row label="Radius">
            <PropInput value={getS('border-radius') || '0px'} onChange={v => apply('border-radius', v)} placeholder="0px" />
          </Row>
        </Section>

        {/* Shadow */}
        <Section title="Shadows" defaultOpen={false}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Box Shadow</div>
          <PropInput
            value={getS('box-shadow') || 'none'}
            onChange={v => apply('box-shadow', v)}
            placeholder="0 4px 12px rgba(0,0,0,0.2)"
          />
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Text Shadow</div>
          <PropInput
            value={getS('text-shadow') || 'none'}
            onChange={v => apply('text-shadow', v)}
            placeholder="2px 2px 4px rgba(0,0,0,0.3)"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {[
              'none',
              '0 2px 4px rgba(0,0,0,0.1)',
              '0 4px 12px rgba(0,0,0,0.2)',
              '0 8px 24px rgba(0,0,0,0.3)',
              '0 0 0 3px rgba(229,164,90,0.5)',
              'inset 0 2px 4px rgba(0,0,0,0.2)',
            ].map(s => (
              <button
                key={s}
                onClick={() => apply('box-shadow', s)}
                style={{
                  fontSize: 10, padding: '2px 6px',
                  background: '#1a1a1a', border: '1px solid #3e3e3e',
                  borderRadius: 10, cursor: 'pointer', color: '#888',
                }}
              >
                {s === 'none' ? 'None' : s.includes('inset') ? 'Inset' : s.includes('0 2') ? 'Small' : s.includes('0 4') ? 'Medium' : s.includes('0 8') ? 'Large' : 'Glow'}
              </button>
            ))}
          </div>
        </Section>

        {/* Layout */}
        <Section title="Layout">
          <Row label="Display">
            <BtnGroup
              options={['block', 'flex', 'grid', 'inline', 'none']}
              value={getS('display') || 'block'}
              onChange={v => apply('display', v)}
            />
          </Row>
          <Row label="Position">
            <select style={sel} value={getS('position') || 'static'} onChange={e => apply('position', e.target.value)}>
              {['static', 'relative', 'absolute', 'fixed', 'sticky'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {([['left', 'X'], ['top', 'Y'], ['width', 'W'], ['height', 'H']] as [string, string][]).map(([prop, label]) => (
              <div key={prop}>
                <PropInput
                  value={getS(prop) || 'auto'}
                  onChange={v => apply(prop, v)}
                  placeholder="auto"
                />
                <div style={{ fontSize: 9, color: '#666', textAlign: 'center', marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>
          <Row label="Z-index">
            <PropInput value={getS('z-index') || 'auto'} onChange={v => apply('z-index', v)} placeholder="auto" />
            <button onClick={() => { const curr = parseInt(getS('z-index') || '0'); apply('z-index', String(curr + 1)); }}
              style={{ ...inp, cursor: 'pointer', flex: 'none', padding: '3px 8px', width: 'auto' } as any}>+</button>
            <button onClick={() => { const curr = parseInt(getS('z-index') || '0'); apply('z-index', String(curr - 1)); }}
              style={{ ...inp, cursor: 'pointer', flex: 'none', padding: '3px 8px', width: 'auto' } as any}>−</button>
          </Row>
          <Row label="Overflow">
            <BtnGroup
              options={['visible', 'hidden', 'auto', 'scroll']}
              value={getS('overflow') || 'visible'}
              onChange={v => apply('overflow', v)}
            />
          </Row>
        </Section>

        {/* Spacing */}
        <Section title="Spacing" defaultOpen={false}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Margin (top right bottom left)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3 }}>
            {(['margin-top', 'margin-right', 'margin-bottom', 'margin-left'] as const).map((p, i) => (
              <div key={p}>
                <PropInput value={getS(p) || '0'} onChange={v => apply(p, v)} placeholder="0" />
                <div style={{ fontSize: 9, color: '#666', textAlign: 'center' }}>{['↑', '→', '↓', '←'][i]}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 6, marginBottom: 4 }}>Padding (top right bottom left)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3 }}>
            {(['padding-top', 'padding-right', 'padding-bottom', 'padding-left'] as const).map((p, i) => (
              <div key={p}>
                <PropInput value={getS(p) || '0'} onChange={v => apply(p, v)} placeholder="0" />
                <div style={{ fontSize: 9, color: '#666', textAlign: 'center' }}>{['↑', '→', '↓', '←'][i]}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Flex / Grid */}
        <Section title="Flex / Grid" defaultOpen={false}>
          <Row label="Direction">
            <BtnGroup
              options={['row', 'column', 'row-reverse', 'column-reverse']}
              value={getS('flex-direction') || 'row'}
              onChange={v => apply('flex-direction', v)}
            />
          </Row>
          <Row label="Justify">
            <select style={sel} value={getS('justify-content') || 'flex-start'} onChange={e => apply('justify-content', e.target.value)}>
              {['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Align">
            <select style={sel} value={getS('align-items') || 'stretch'} onChange={e => apply('align-items', e.target.value)}>
              {['stretch', 'flex-start', 'center', 'flex-end', 'baseline'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Wrap">
            <BtnGroup
              options={['nowrap', 'wrap', 'wrap-reverse']}
              value={getS('flex-wrap') || 'nowrap'}
              onChange={v => apply('flex-wrap', v)}
            />
          </Row>
          <Row label="Gap">
            <PropInput value={getS('gap') || '0px'} onChange={v => apply('gap', v)} placeholder="0px" />
          </Row>
          <Row label="Grid cols">
            <PropInput value={getS('grid-template-columns') || ''} onChange={v => apply('grid-template-columns', v)} placeholder="1fr 1fr 1fr" />
          </Row>
        </Section>

        {/* Transform */}
        <Section title="Transform" defaultOpen={false}>
          <Row label="Rotate">
            <input
              type="range" min="-180" max="180" step="1"
              defaultValue="0"
              style={{ flex: 1 }}
              onInput={e => apply('transform', `rotate(${(e.target as HTMLInputElement).value}deg)`)}
            />
          </Row>
          <Row label="Scale X">
            <input type="range" min="0.1" max="3" step="0.05" defaultValue="1" style={{ flex: 1 }}
              onInput={e => apply('transform', `scaleX(${(e.target as HTMLInputElement).value})`)} />
          </Row>
          <Row label="Scale Y">
            <input type="range" min="0.1" max="3" step="0.05" defaultValue="1" style={{ flex: 1 }}
              onInput={e => apply('transform', `scaleY(${(e.target as HTMLInputElement).value})`)} />
          </Row>
          <Row label="Custom">
            <PropInput
              value={getS('transform') || 'none'}
              onChange={v => apply('transform', v)}
              placeholder="rotate(45deg) scale(1.2)"
            />
          </Row>
        </Section>

        {/* Animation */}
        <Section title="CSS Animation" defaultOpen={false}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Presets</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['none', 'fadeIn', 'slideUp', 'slideLeft', 'slideRight', 'bounce', 'pulse', 'spin', 'zoom', 'shake', 'flip'].map(p => (
              <button
                key={p}
                onClick={() => setAnimationConfig({ preset: p })}
                style={{
                  padding: '3px 8px', fontSize: 10, borderRadius: 10, cursor: 'pointer',
                  background: animationConfig.preset === p ? 'rgba(229,164,90,0.15)' : '#1a1a1a',
                  border: `1px solid ${animationConfig.preset === p ? 'rgba(229,164,90,0.5)' : '#3e3e3e'}`,
                  color: animationConfig.preset === p ? '#e5a45a' : '#888',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <Row label="Trigger">
            <BtnGroup
              options={['load', 'hover', 'click']}
              value={animationConfig.trigger}
              onChange={v => setAnimationConfig({ trigger: v as any })}
            />
          </Row>
          <Row label="Duration">
            <PropInput value={animationConfig.duration} onChange={v => setAnimationConfig({ duration: v })} placeholder="0.6s" />
          </Row>
          <Row label="Delay">
            <PropInput value={animationConfig.delay} onChange={v => setAnimationConfig({ delay: v })} placeholder="0s" />
          </Row>
          <Row label="Easing">
            <select style={sel} value={animationConfig.easing} onChange={e => setAnimationConfig({ easing: e.target.value })}>
              {['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.68,-0.55,0.27,1.55)'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Repeat">
            <BtnGroup
              options={['1', '2', '3', 'infinite']}
              value={animationConfig.iteration}
              onChange={v => setAnimationConfig({ iteration: v })}
            />
          </Row>
          <Row label="Direction">
            <select style={sel} value={animationConfig.direction} onChange={e => setAnimationConfig({ direction: e.target.value })}>
              {['normal', 'reverse', 'alternate', 'alternate-reverse'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Fill">
            <BtnGroup
              options={['none', 'forwards', 'backwards', 'both']}
              value={animationConfig.fillMode}
              onChange={v => setAnimationConfig({ fillMode: v })}
            />
          </Row>
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Custom @keyframes</div>
            <textarea
              style={{ ...inp, width: '100%', height: 72, resize: 'none', flex: 'none' } as any}
              placeholder="@keyframes myAnim { from { opacity: 0 } to { opacity: 1 } }"
              value={animationConfig.customKeyframes}
              onChange={e => setAnimationConfig({ customKeyframes: e.target.value })}
            />
          </div>
          <button
            onClick={() => {
              if (!selectedElement || animationConfig.preset === 'none') return;
              const PRESETS: Record<string, string> = {
                fadeIn: 'fadeIn 0.6s ease forwards',
                slideUp: 'slideUp 0.6s ease forwards',
                slideLeft: 'slideLeft 0.6s ease forwards',
                slideRight: 'slideRight 0.6s ease forwards',
                bounce: 'bounce 1s ease infinite',
                pulse: 'pulse 1.5s ease infinite',
                spin: 'spin 1s linear infinite',
                zoom: 'zoom 0.4s ease forwards',
                shake: 'shake 0.5s ease',
                flip: 'flip 0.6s ease forwards',
              };
              const anim = PRESETS[animationConfig.preset] || animationConfig.preset;
              apply('animation', anim);
            }}
            style={{
              padding: '5px 12px', background: 'rgba(229,164,90,0.15)',
              border: '1px solid rgba(229,164,90,0.4)', borderRadius: 4, cursor: 'pointer',
              color: '#e5a45a', fontSize: 12, width: '100%',
            }}
          >
            Apply Animation to Element ▶
          </button>
        </Section>

        {/* Custom CSS */}
        <Section title="Custom CSS" defaultOpen={false}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Paste any CSS property:value pairs:</div>
          <textarea
            key={selectedElement.tagName}
            style={{ ...inp, width: '100%', height: 80, resize: 'none', flex: 'none' } as any}
            placeholder="color: red;&#10;background: blue;&#10;font-size: 20px;"
            defaultValue={selectedElement.styles?.['inline-style'] || ''}
            onBlur={e => {
              // Apply all custom CSS rules
              const rules = e.target.value.split(';').map(r => r.trim()).filter(Boolean);
              rules.forEach(rule => {
                const [prop, ...vals] = rule.split(':');
                if (prop && vals.length) apply(prop.trim(), vals.join(':').trim());
              });
            }}
          />
        </Section>

      </div>
    </div>
  );
};

export default PropertiesPanel;
