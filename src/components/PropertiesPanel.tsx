import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  FiChevronDown, FiChevronRight, FiType, FiLayout, FiBox,
  FiDroplet, FiSliders, FiZap, FiCode, FiMove, FiMaximize2,
} from 'react-icons/fi';

/* ─── Design tokens ───────────────────────────────────────── */
const C = {
  bg:        '#1e1e1e',
  surface:   '#252526',
  surface2:  '#2d2d2d',
  border:    '#3a3a3a',
  accent:    '#e5a45a',
  accentBg:  'rgba(229,164,90,0.12)',
  accentBrd: 'rgba(229,164,90,0.35)',
  text:      '#d4d4d4',
  muted:     '#888',
  dim:       '#555',
};

/* ─── Section ─────────────────────────────────────────────── */
interface SectionProps { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }
const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', cursor: 'pointer', border: 'none', outline: 'none',
          background: open ? 'rgba(255,255,255,0.03)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = open ? 'rgba(255,255,255,0.03)' : 'transparent')}
      >
        {icon && <span style={{ color: open ? C.accent : C.muted, display: 'flex', transition: 'color 0.15s' }}>{icon}</span>}
        <span style={{
          flex: 1, textAlign: 'left', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.09em', textTransform: 'uppercase',
          color: open ? C.text : C.muted,
        }}>{title}</span>
        <span style={{ color: C.dim, display: 'flex' }}>
          {open ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        </span>
      </button>
      {open && (
        <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {children}
        </div>
      )}
    </div>
  );
};

/* ─── Row ─────────────────────────────────────────────────── */
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 11, color: C.muted, width: 58, flexShrink: 0, userSelect: 'none' }}>{label}</span>
    <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>{children}</div>
  </div>
);

/* ─── Shared input style ──────────────────────────────────── */
const inputBase: React.CSSProperties = {
  flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4,
  padding: '4px 7px', fontSize: 11, color: C.text, fontFamily: 'var(--app-font-mono)',
  outline: 'none', minWidth: 0, transition: 'border-color 0.15s',
};

const selBase: React.CSSProperties = {
  ...inputBase, cursor: 'pointer', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center',
  paddingRight: 22,
};

/* ─── BtnGroup ────────────────────────────────────────────── */
function BtnGroup({ options, value, onChange, small }: { options: string[]; value: string; onChange: (v: string) => void; small?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 2, flex: 1 }}>
      {options.map(o => {
        const active = value === o || value.startsWith(o);
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            title={o}
            style={{
              flex: 1, padding: small ? '2px 1px' : '3px 2px',
              fontSize: small ? 9 : 10, fontWeight: active ? 600 : 400,
              background: active ? C.accentBg : C.surface2,
              border: `1px solid ${active ? C.accentBrd : C.border}`,
              borderRadius: 4, cursor: 'pointer',
              color: active ? C.accent : C.muted,
              transition: 'all 0.12s',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = C.muted; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.border; }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ─── ColorInput ──────────────────────────────────────────── */
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const hex = /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#000000';
  return (
    <div style={{ display: 'flex', gap: 5, flex: 1, alignItems: 'center' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 4, border: `1px solid ${C.border}`,
          background: value || '#000', cursor: 'pointer', overflow: 'hidden',
        }}>
          <input
            type="color" value={hex}
            onChange={e => { onChange(e.target.value); setText(e.target.value); }}
            style={{ width: 40, height: 40, opacity: 0, cursor: 'pointer', position: 'absolute', top: -4, left: -4 }}
          />
        </div>
      </div>
      <input
        style={inputBase} value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => onChange(text)}
        onKeyDown={e => e.key === 'Enter' && onChange(text)}
        placeholder="#000000 or rgba(...)"
        onFocus={e => (e.target.style.borderColor = C.accentBrd)}
        onBlurCapture={e => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}

/* ─── PropInput ───────────────────────────────────────────── */
function PropInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input
      style={inputBase} value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onChange(local)}
      onKeyDown={e => e.key === 'Enter' && onChange(local)}
      placeholder={placeholder}
      onFocus={e => (e.target.style.borderColor = C.accentBrd)}
      onBlurCapture={e => (e.target.style.borderColor = C.border)}
    />
  );
}

/* ─── Chip pills ──────────────────────────────────────────── */
function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
      {options.map(o => {
        const active = value === o;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: '2px 9px', fontSize: 10, borderRadius: 20, cursor: 'pointer',
            background: active ? C.accentBg : C.surface2,
            border: `1px solid ${active ? C.accentBrd : C.border}`,
            color: active ? C.accent : C.muted, transition: 'all 0.12s',
          }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Spacer grid (margin / padding) ─────────────────────── */
function SpacingGrid({ props, getS, apply }: { props: [string, string][]; getS: (k: string) => string; apply: (p: string, v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
      {props.map(([prop, label]) => (
        <div key={prop} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PropInput value={getS(prop) || '0'} onChange={v => apply(prop, v)} placeholder="0" />
          <div style={{ fontSize: 9, color: C.dim, textAlign: 'center', userSelect: 'none' }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────── */
const PropertiesPanel: React.FC<{ onClose?: () => void; hideHeader?: boolean }> = ({ hideHeader }) => {
  const { selectedElement, selectedSelector, applySelectedStyle, applySelectedContent, animationConfig, setAnimationConfig } = useEditorStore();

  const apply = (property: string, value: string) => applySelectedStyle(property, value);
  const getS = (key: string) => selectedElement?.styles?.[key] || '';

  /* ── Empty state ── */
  if (!selectedElement || !selectedSelector) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {!hideHeader && (
          <div style={{
            height: 36, flexShrink: 0, display: 'flex', alignItems: 'center',
            padding: '0 12px', borderBottom: `1px solid ${C.border}`, background: C.surface,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted }}>Properties</span>
          </div>
        )}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 14, color: C.dim, padding: 28, textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: C.surface2,
            border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FiSliders size={22} color={C.muted} />
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            Switch to <strong style={{ color: C.text }}>Visual mode</strong> and<br />click an element to edit its properties
          </div>
          <div style={{
            fontSize: 10, color: C.dim, background: C.surface2,
            border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', lineHeight: 1.6,
          }}>
            Typography · Layout · Background<br />Border · Shadows · Animations
          </div>
        </div>
      </div>
    );
  }

  const tag = selectedElement.tagName;
  const elId = selectedElement.id ? `#${selectedElement.id}` : '';
  const elClass = selectedElement.className?.trim().split(/\s+/)[0] ? `.${selectedElement.className.trim().split(/\s+/)[0]}` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: C.bg }}>

      {/* ── Header ── */}
      {!hideHeader && (
        <div style={{
          height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 10px', borderBottom: `1px solid ${C.border}`, background: C.surface,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted }}>Properties</span>
          <code style={{
            fontSize: 11, color: C.accent, background: C.accentBg,
            border: `1px solid ${C.accentBrd}`, borderRadius: 4, padding: '1px 7px',
          }}>
            &lt;{tag}{elId || elClass}&gt;
          </code>
        </div>
      )}

      {/* ── Mini breadcrumb when hideHeader ── */}
      {hideHeader && (
        <div style={{
          padding: '5px 10px', background: C.accentBg, borderBottom: `1px solid ${C.border}`,
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <code style={{ fontSize: 11, color: C.accent }}>&lt;{tag}{elId}&gt;</code>
          {elClass && <span style={{ fontSize: 10, color: C.dim }}>{elClass}</span>}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Content */}
        <Section title="Content" icon={<FiCode size={12} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 1 }}>Inner HTML</div>
            <textarea
              style={{ ...inputBase, height: 60, resize: 'vertical', width: '100%', flex: 'none', fontFamily: 'var(--app-font-mono)' } as any}
              defaultValue={selectedElement.innerHTML}
              key={tag + selectedElement.id}
              onBlur={e => applySelectedContent(e.target.value)}
              onFocus={e => (e.target.style.borderColor = C.accentBrd)}
              onBlurCapture={e => (e.target.style.borderColor = C.border)}
            />
          </div>
          <Row label="Text">
            <PropInput value={selectedElement.textContent} placeholder="Plain text" onChange={v => applySelectedContent(v)} />
          </Row>
        </Section>

        {/* Typography */}
        <Section title="Typography" icon={<FiType size={12} />}>
          <Row label="Color">
            <ColorInput value={getS('color') || '#333333'} onChange={v => apply('color', v)} />
          </Row>
          <Row label="Size">
            <PropInput value={getS('font-size') || '16px'} onChange={v => apply('font-size', v)} placeholder="16px" />
          </Row>
          <Row label="Family">
            <select style={selBase} value={getS('font-family')} onChange={e => apply('font-family', e.target.value)}>
              {['sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma'].map(f => <option key={f}>{f}</option>)}
            </select>
          </Row>
          <Row label="Weight">
            <BtnGroup options={['100', '300', '400', '600', '700', '900']} value={getS('font-weight') || '400'} onChange={v => apply('font-weight', v)} small />
          </Row>
          <Row label="Align">
            <BtnGroup options={['left', 'center', 'right', 'justify']} value={getS('text-align') || 'left'} onChange={v => apply('text-align', v)} />
          </Row>
          <Row label="Line H">
            <PropInput value={getS('line-height') || '1.6'} onChange={v => apply('line-height', v)} placeholder="1.6" />
          </Row>
          <Row label="Decor">
            <BtnGroup options={['none', 'underline', 'line-through', 'overline']} value={getS('text-decoration') || 'none'} onChange={v => apply('text-decoration', v)} small />
          </Row>
          <Row label="Case">
            <BtnGroup options={['none', 'upper', 'lower', 'capitalize']}
              value={(() => { const v = getS('text-transform') || 'none'; if (v === 'uppercase') return 'upper'; if (v === 'lowercase') return 'lower'; return v; })()}
              onChange={v => apply('text-transform', v === 'upper' ? 'uppercase' : v === 'lower' ? 'lowercase' : v)} />
          </Row>
        </Section>

        {/* Background */}
        <Section title="Background" icon={<FiDroplet size={12} />}>
          <Row label="Color">
            <ColorInput value={getS('background-color') || '#ffffff'} onChange={v => apply('background-color', v)} />
          </Row>
          <Row label="Image">
            <PropInput value={getS('background-image') || ''} onChange={v => apply('background-image', v)} placeholder="url(...)" />
          </Row>
          <Row label="Size">
            <BtnGroup options={['auto', 'cover', 'contain']} value={getS('background-size') || 'auto'} onChange={v => apply('background-size', v)} />
          </Row>
          <Row label="Opacity">
            <input
              type="range" min="0" max="1" step="0.01"
              defaultValue={getS('opacity') || '1'}
              style={{ flex: 1, accentColor: C.accent } as any}
              onInput={e => apply('opacity', (e.target as HTMLInputElement).value)}
            />
            <span style={{ fontSize: 11, color: C.muted, width: 32, textAlign: 'right', flexShrink: 0 }}>
              {Math.round(parseFloat(getS('opacity') || '1') * 100)}%
            </span>
          </Row>
        </Section>

        {/* Layout */}
        <Section title="Layout" icon={<FiLayout size={12} />}>
          <Row label="Display">
            <BtnGroup options={['block', 'flex', 'grid', 'inline', 'none']} value={getS('display') || 'block'} onChange={v => apply('display', v)} small />
          </Row>
          <Row label="Position">
            <select style={selBase} value={getS('position') || 'static'} onChange={e => apply('position', e.target.value)}>
              {['static', 'relative', 'absolute', 'fixed', 'sticky'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {([['left', 'X'], ['top', 'Y'], ['width', 'W'], ['height', 'H']] as [string, string][]).map(([prop, label]) => (
              <div key={prop} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <PropInput value={getS(prop) || 'auto'} onChange={v => apply(prop, v)} placeholder="auto" />
                <div style={{ fontSize: 9, color: C.dim, textAlign: 'center', userSelect: 'none' }}>{label}</div>
              </div>
            ))}
          </div>
          <Row label="Overflow">
            <BtnGroup options={['visible', 'hidden', 'auto', 'scroll']} value={getS('overflow') || 'visible'} onChange={v => apply('overflow', v)} small />
          </Row>
          <Row label="Z-Index">
            <PropInput value={getS('z-index') || 'auto'} onChange={v => apply('z-index', v)} placeholder="auto" />
            <button onClick={() => apply('z-index', String((parseInt(getS('z-index') || '0') || 0) + 1))}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, cursor: 'pointer', padding: '4px 9px', fontSize: 13, flexShrink: 0 }}>+</button>
            <button onClick={() => apply('z-index', String((parseInt(getS('z-index') || '0') || 0) - 1))}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, cursor: 'pointer', padding: '4px 9px', fontSize: 13, flexShrink: 0 }}>−</button>
          </Row>
        </Section>

        {/* Flex / Grid */}
        <Section title="Flex / Grid" icon={<FiMaximize2 size={12} />} defaultOpen={false}>
          <Row label="Direction">
            <BtnGroup options={['row', 'column', 'row-rev', 'col-rev']}
              value={(() => { const v = getS('flex-direction') || 'row'; if (v === 'row-reverse') return 'row-rev'; if (v === 'column-reverse') return 'col-rev'; return v; })()}
              onChange={v => apply('flex-direction', v === 'row-rev' ? 'row-reverse' : v === 'col-rev' ? 'column-reverse' : v)} small />
          </Row>
          <Row label="Justify">
            <select style={selBase} value={getS('justify-content') || 'flex-start'} onChange={e => apply('justify-content', e.target.value)}>
              {['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Align">
            <select style={selBase} value={getS('align-items') || 'stretch'} onChange={e => apply('align-items', e.target.value)}>
              {['stretch', 'flex-start', 'center', 'flex-end', 'baseline'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Wrap">
            <BtnGroup options={['nowrap', 'wrap', 'wrap-rev']}
              value={(() => { const v = getS('flex-wrap') || 'nowrap'; return v === 'wrap-reverse' ? 'wrap-rev' : v; })()}
              onChange={v => apply('flex-wrap', v === 'wrap-rev' ? 'wrap-reverse' : v)} />
          </Row>
          <Row label="Gap">
            <PropInput value={getS('gap') || '0px'} onChange={v => apply('gap', v)} placeholder="0px" />
          </Row>
          <Row label="Grid cols">
            <PropInput value={getS('grid-template-columns') || ''} onChange={v => apply('grid-template-columns', v)} placeholder="1fr 1fr 1fr" />
          </Row>
          <Row label="Grid rows">
            <PropInput value={getS('grid-template-rows') || ''} onChange={v => apply('grid-template-rows', v)} placeholder="auto 1fr auto" />
          </Row>
        </Section>

        {/* Spacing */}
        <Section title="Spacing" icon={<FiMove size={12} />} defaultOpen={false}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>Margin</div>
          <SpacingGrid
            props={[['margin-top','↑'],['margin-right','→'],['margin-bottom','↓'],['margin-left','←']]}
            getS={getS} apply={apply}
          />
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4, marginBottom: 2 }}>Padding</div>
          <SpacingGrid
            props={[['padding-top','↑'],['padding-right','→'],['padding-bottom','↓'],['padding-left','←']]}
            getS={getS} apply={apply}
          />
        </Section>

        {/* Border */}
        <Section title="Border" icon={<FiBox size={12} />} defaultOpen={false}>
          <Row label="Width">
            <PropInput value={getS('border-width') || '0px'} onChange={v => apply('border-width', v)} placeholder="0px" />
          </Row>
          <Row label="Color">
            <ColorInput value={getS('border-color') || '#cccccc'} onChange={v => apply('border-color', v)} />
          </Row>
          <Row label="Style">
            <BtnGroup options={['none', 'solid', 'dashed', 'dotted', 'double']} value={getS('border-style') || 'none'} onChange={v => apply('border-style', v)} small />
          </Row>
          <Row label="Radius">
            <PropInput value={getS('border-radius') || '0px'} onChange={v => apply('border-radius', v)} placeholder="0px" />
          </Row>
        </Section>

        {/* Shadows */}
        <Section title="Shadows" defaultOpen={false}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>Box Shadow</div>
          <PropInput value={getS('box-shadow') || 'none'} onChange={v => apply('box-shadow', v)} placeholder="0 4px 12px rgba(0,0,0,0.2)" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
            {(['none', '0 2px 4px rgba(0,0,0,0.1)', '0 4px 12px rgba(0,0,0,0.2)', '0 8px 24px rgba(0,0,0,0.3)', '0 0 0 3px rgba(229,164,90,0.5)', 'inset 0 2px 4px rgba(0,0,0,0.2)'] as string[]).map((s, i) => (
              <button key={s} onClick={() => apply('box-shadow', s)} style={{
                fontSize: 10, padding: '3px 8px', background: C.surface2,
                border: `1px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', color: C.muted,
                transition: 'border-color 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.muted)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
              >
                {['None','Sm','Md','Lg','Glow','Inset'][i]}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 8, marginBottom: 3 }}>Text Shadow</div>
          <PropInput value={getS('text-shadow') || 'none'} onChange={v => apply('text-shadow', v)} placeholder="2px 2px 4px rgba(0,0,0,0.3)" />
        </Section>

        {/* Transform */}
        <Section title="Transform" defaultOpen={false}>
          <Row label="Rotate">
            <input type="range" min="-180" max="180" step="1" defaultValue="0"
              style={{ flex: 1, accentColor: C.accent } as any}
              onInput={e => apply('transform', `rotate(${(e.target as HTMLInputElement).value}deg)`)} />
          </Row>
          <Row label="Scale X">
            <input type="range" min="0.1" max="3" step="0.05" defaultValue="1"
              style={{ flex: 1, accentColor: C.accent } as any}
              onInput={e => apply('transform', `scaleX(${(e.target as HTMLInputElement).value})`)} />
          </Row>
          <Row label="Scale Y">
            <input type="range" min="0.1" max="3" step="0.05" defaultValue="1"
              style={{ flex: 1, accentColor: C.accent } as any}
              onInput={e => apply('transform', `scaleY(${(e.target as HTMLInputElement).value})`)} />
          </Row>
          <Row label="Custom">
            <PropInput value={getS('transform') || 'none'} onChange={v => apply('transform', v)} placeholder="rotate(45deg) scale(1.2)" />
          </Row>
        </Section>

        {/* Animation */}
        <Section title="Animation" icon={<FiZap size={12} />} defaultOpen={false}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Preset</div>
          <ChipGroup
            options={['none','fadeIn','slideUp','slideLeft','slideRight','bounce','pulse','spin','zoom','shake','flip']}
            value={animationConfig.preset}
            onChange={v => setAnimationConfig({ preset: v })}
          />
          <Row label="Trigger">
            <BtnGroup options={['load','hover','click']} value={animationConfig.trigger} onChange={v => setAnimationConfig({ trigger: v as any })} />
          </Row>
          <Row label="Duration">
            <PropInput value={animationConfig.duration} onChange={v => setAnimationConfig({ duration: v })} placeholder="0.6s" />
          </Row>
          <Row label="Delay">
            <PropInput value={animationConfig.delay} onChange={v => setAnimationConfig({ delay: v })} placeholder="0s" />
          </Row>
          <Row label="Easing">
            <select style={selBase} value={animationConfig.easing} onChange={e => setAnimationConfig({ easing: e.target.value })}>
              {['ease','linear','ease-in','ease-out','ease-in-out','cubic-bezier(0.68,-0.55,0.27,1.55)'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Repeat">
            <BtnGroup options={['1','2','3','infinite']} value={animationConfig.iteration} onChange={v => setAnimationConfig({ iteration: v })} />
          </Row>
          <Row label="Direction">
            <select style={selBase} value={animationConfig.direction} onChange={e => setAnimationConfig({ direction: e.target.value })}>
              {['normal','reverse','alternate','alternate-reverse'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Row>
          <Row label="Fill">
            <BtnGroup options={['none','forwards','backwards','both']} value={animationConfig.fillMode} onChange={v => setAnimationConfig({ fillMode: v })} small />
          </Row>
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Custom @keyframes</div>
            <textarea
              style={{ ...inputBase, width: '100%', height: 72, resize: 'none', flex: 'none' } as any}
              placeholder="@keyframes myAnim { from { opacity: 0 } to { opacity: 1 } }"
              value={animationConfig.customKeyframes}
              onChange={e => setAnimationConfig({ customKeyframes: e.target.value })}
              onFocus={e => (e.target.style.borderColor = C.accentBrd)}
              onBlurCapture={e => (e.target.style.borderColor = C.border)}
            />
          </div>
          <button
            onClick={() => {
              if (!selectedElement || animationConfig.preset === 'none') return;
              const PRESETS: Record<string, string> = {
                fadeIn: 'fadeIn 0.6s ease forwards', slideUp: 'slideUp 0.6s ease forwards',
                slideLeft: 'slideLeft 0.6s ease forwards', slideRight: 'slideRight 0.6s ease forwards',
                bounce: 'bounce 1s ease infinite', pulse: 'pulse 1.5s ease infinite',
                spin: 'spin 1s linear infinite', zoom: 'zoom 0.4s ease forwards',
                shake: 'shake 0.5s ease', flip: 'flip 0.6s ease forwards',
              };
              apply('animation', PRESETS[animationConfig.preset] || animationConfig.preset);
            }}
            style={{
              padding: '6px 12px', background: C.accentBg,
              border: `1px solid ${C.accentBrd}`, borderRadius: 5,
              cursor: 'pointer', color: C.accent, fontSize: 11,
              width: '100%', fontWeight: 600, letterSpacing: '0.03em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,164,90,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = C.accentBg)}
          >
            ▶ Apply Animation to Element
          </button>
        </Section>

        {/* Custom CSS */}
        <Section title="Custom CSS" icon={<FiCode size={12} />} defaultOpen={false}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Paste CSS property:value pairs</div>
          <textarea
            key={tag}
            style={{ ...inputBase, width: '100%', height: 88, resize: 'none', flex: 'none' } as any}
            placeholder={'color: red;\nbackground: blue;\nfont-size: 20px;'}
            defaultValue={selectedElement.styles?.['inline-style'] || ''}
            onBlur={e => {
              e.target.value.split(';').map(r => r.trim()).filter(Boolean).forEach(rule => {
                const [prop, ...vals] = rule.split(':');
                if (prop && vals.length) apply(prop.trim(), vals.join(':').trim());
              });
            }}
            onFocus={e => (e.target.style.borderColor = C.accentBrd)}
            onBlurCapture={e => (e.target.style.borderColor = C.border)}
          />
        </Section>

      </div>
    </div>
  );
};

export default PropertiesPanel;
