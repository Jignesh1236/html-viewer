import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { EventBinding } from '../store/editorStore';
import { FiPlus, FiTrash2, FiZap, FiChevronDown, FiChevronRight, FiCheck, FiInfo, FiX } from 'react-icons/fi';
import { getTargetHtmlFile } from '../utils/projectFiles';

const C = {
  bg: '#161618', surface: '#1e1e20', surface2: '#252528',
  border: '#333336', accent: '#e5a45a', accentBg: 'rgba(229,164,90,0.12)',
  accentBrd: 'rgba(229,164,90,0.35)', text: '#d4d4d4', muted: '#888', dim: '#555',
  green: '#4ec9b0', red: '#f44747', blue: '#9cdcfe', purple: '#c586c0',
};

const inp: React.CSSProperties = {
  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 3,
  padding: '3px 6px', fontSize: 10, color: C.text, outline: 'none',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
const selStyle: React.CSSProperties = {
  ...inp, cursor: 'pointer', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: 20,
};

const EVENT_GROUPS: { label: string; color: string; events: string[] }[] = [
  { label: 'Mouse', color: '#9cdcfe', events: ['click','dblclick','mousedown','mouseup','mousemove','mouseenter','mouseleave','mouseover','mouseout','contextmenu'] },
  { label: 'Keyboard', color: '#c586c0', events: ['keydown','keyup','keypress'] },
  { label: 'Form', color: '#4ec9b0', events: ['submit','change','input','focus','blur','reset','select'] },
  { label: 'Window', color: '#e5a45a', events: ['load','DOMContentLoaded','resize','scroll','beforeunload','unload','hashchange','popstate'] },
  { label: 'Drag', color: '#dcdcaa', events: ['dragstart','drag','dragend','dragenter','dragleave','dragover','drop'] },
  { label: 'Touch', color: '#f48771', events: ['touchstart','touchmove','touchend','touchcancel'] },
  { label: 'Clipboard', color: '#89d185', events: ['copy','cut','paste'] },
  { label: 'Pointer', color: '#b5cea8', events: ['pointerdown','pointerup','pointermove','pointerenter','pointerleave','pointercancel'] },
  { label: 'Animation/Transition', color: '#c586c0', events: ['animationstart','animationend','animationiteration','transitionstart','transitionend'] },
  { label: 'Media', color: '#608b4e', events: ['play','pause','ended','timeupdate','volumechange','canplay','loadeddata'] },
  { label: 'Custom', color: '#888', events: ['custom'] },
];

const ALL_EVENTS = EVENT_GROUPS.flatMap(g => g.events);

const ACTIONS = [
  { value: 'playAnimation',    label: '▶ Play Animation',    color: '#4ec9b0' },
  { value: 'toggleClass',      label: '⊞ Toggle Class',      color: '#9cdcfe' },
  { value: 'showHide',         label: '👁 Show / Hide',      color: '#e5a45a' },
  { value: 'setAttribute',     label: '✎ Set Attribute',     color: '#dcdcaa' },
  { value: 'navigate',         label: '→ Navigate',          color: '#c586c0' },
  { value: 'dispatchEvent',    label: '⚡ Dispatch Event',   color: '#f48771' },
  { value: 'preventDefault',   label: '⛔ preventDefault',   color: '#f44747' },
  { value: 'stopPropagation',  label: '■ stopPropagation',   color: '#888' },
  { value: 'snippet',          label: '⌨ Run JS Snippet',   color: '#b5cea8' },
];

const EVENT_OBJECT_PROPS: { group: string; color: string; props: { name: string; desc: string }[] }[] = [
  { group: 'Target', color: '#9cdcfe', props: [
    { name: 'e.target', desc: 'Element that triggered the event' },
    { name: 'e.currentTarget', desc: 'Element with the listener attached' },
    { name: 'e.type', desc: 'Event name (e.g. "click")' },
  ]},
  { group: 'Mouse', color: '#e5a45a', props: [
    { name: 'e.clientX/Y', desc: 'Viewport position' },
    { name: 'e.pageX/Y', desc: 'Page position (includes scroll)' },
    { name: 'e.offsetX/Y', desc: 'Position relative to element' },
    { name: 'e.button', desc: '0=left, 1=middle, 2=right' },
    { name: 'e.buttons', desc: 'Bitmask of pressed buttons' },
  ]},
  { group: 'Keyboard', color: '#c586c0', props: [
    { name: 'e.key', desc: 'Key value ("Enter", "a", "ArrowLeft")' },
    { name: 'e.code', desc: 'Physical key ("KeyA", "Space")' },
    { name: 'e.altKey', desc: 'Alt key pressed' },
    { name: 'e.ctrlKey', desc: 'Ctrl key pressed' },
    { name: 'e.shiftKey', desc: 'Shift key pressed' },
    { name: 'e.metaKey', desc: 'Meta/Win/Cmd key pressed' },
  ]},
  { group: 'Event Flow', color: '#4ec9b0', props: [
    { name: 'e.bubbles', desc: 'Does event bubble up?' },
    { name: 'e.cancelable', desc: 'Can preventDefault() be used?' },
    { name: 'e.defaultPrevented', desc: 'Was preventDefault() called?' },
    { name: 'e.timeStamp', desc: 'Event time (ms since page load)' },
    { name: 'e.composedPath()', desc: 'Full DOM path of the event' },
  ]},
  { group: 'Touch', color: '#f48771', props: [
    { name: 'e.touches', desc: 'All active touch points' },
    { name: 'e.changedTouches', desc: 'Changed touch points' },
  ]},
];

const CODE_PATTERNS: { label: string; code: string }[] = [
  { label: 'Run Once', code: 'btn.addEventListener("click", fn, { once: true })' },
  { label: 'Prevent Reload', code: 'form.addEventListener("submit", e => e.preventDefault())' },
  { label: 'Enter Key', code: 'input.addEventListener("keydown", e => { if (e.key === "Enter") console.log("enter") })' },
  { label: 'Track Mouse', code: 'window.addEventListener("mousemove", e => console.log(e.clientX, e.clientY))' },
  { label: 'Infinite Scroll', code: 'window.addEventListener("scroll", () => {\n  if (window.innerHeight + window.scrollY >= document.body.offsetHeight)\n    console.log("bottom reached")\n})' },
  { label: 'Event Delegation', code: 'parent.addEventListener("click", e => {\n  if (e.target.matches(".btn")) console.log("clicked")\n})' },
  { label: 'AbortController', code: 'const ctrl = new AbortController()\nbtn.addEventListener("click", fn, { signal: ctrl.signal })\n// later: ctrl.abort()' },
];

function generateBindingCode(b: EventBinding): string {
  const eventName = b.event === 'custom' ? (b.customEvent || 'myevent') : b.event;
  const target = b.target || 'body';
  let action = '';
  switch (b.action) {
    case 'playAnimation':
      action = `el.style.animation='none';void el.offsetWidth;el.style.animation='${b.animationName||'fadeIn'} ${b.animationDuration||'0.6s'} ${b.animationEasing||'ease'} both';`;
      break;
    case 'toggleClass':
      action = `el.classList.toggle(${JSON.stringify(b.className||'active')});`;
      break;
    case 'showHide':
      action = `el.style.display=el.style.display==='none'?'':'none';`;
      break;
    case 'setAttribute':
      action = `el.setAttribute(${JSON.stringify(b.attrName||'data-state')},${JSON.stringify(b.attrValue||'active')});`;
      break;
    case 'navigate':
      action = `window.location.href=${JSON.stringify(b.navigateUrl||'#')};`;
      break;
    case 'dispatchEvent':
      action = `el.dispatchEvent(new CustomEvent(${JSON.stringify(b.dispatchEventName||'my-event')},{bubbles:true,detail:{source:el}}));`;
      break;
    case 'preventDefault':
      action = 'event.preventDefault();';
      break;
    case 'stopPropagation':
      action = 'event.stopPropagation();';
      break;
    case 'snippet':
      action = (b.snippet || '').trim();
      break;
  }
  const opts: string[] = [];
  if (b.optOnce) opts.push('once:true');
  if (b.optPassive) opts.push('passive:true');
  if (b.optCapture) opts.push('capture:true');
  const optsStr = opts.length ? `,{${opts.join(',')}}` : '';
  return `  document.querySelectorAll(${JSON.stringify(target)}).forEach(function(el){el.addEventListener(${JSON.stringify(eventName)},function(event){${action}}${optsStr});});`;
}

function buildRuntimeScript(bindings: EventBinding[]): string {
  const enabled = bindings.filter(b => b.enabled);
  if (!enabled.length) return '';
  const lines = enabled.map(generateBindingCode).join('\n');
  return `(function(){\n  function init(){\n${lines}\n  }\n  if(document.readyState!=='loading')init();\n  else document.addEventListener('DOMContentLoaded',init);\n})();`;
}

function injectIntoHtml(html: string, script: string): string {
  const cleaned = html.replace(/\n?\s*<script\s+id=["']__event_listeners__["'][\s\S]*?<\/script>/i, '');
  if (!script.trim()) return cleaned;
  const block = `<script id="__event_listeners__">\n${script}\n</script>`;
  if (cleaned.includes('</body>')) return cleaned.replace('</body>', `${block}\n</body>`);
  return `${cleaned}\n${block}`;
}

function emptyBinding(): EventBinding {
  return {
    id: Date.now().toString(), target: '', event: 'click', action: 'playAnimation',
    animationName: 'fadeIn', animationDuration: '0.6s', animationEasing: 'ease',
    className: 'active', attrName: 'data-state', attrValue: 'active',
    snippet: '', navigateUrl: '', dispatchEventName: 'my-event',
    enabled: true, optOnce: false, optPassive: false, optCapture: false,
  };
}

function Field({ label, children, color }: { label: string; children: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 5 }}>
      <span style={{ fontSize: 9, color: color || C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      {children}
    </div>
  );
}

function OptionToggle({ label, value, onChange, color }: { label: string; value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <button onClick={() => onChange(!value)}
      title={label}
      style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', fontSize: 9, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
        background: value ? `${color}18` : C.surface2,
        border: `1px solid ${value ? `${color}55` : C.border}`,
        color: value ? color : C.dim }}>
      {value ? '✓' : '○'} {label}
    </button>
  );
}

function BindingCard({ binding, onUpdate, onDelete, selectedSelector }: {
  binding: EventBinding;
  onUpdate: (updates: Partial<EventBinding>) => void;
  onDelete: () => void;
  selectedSelector: string | null;
}) {
  const [open, setOpen] = useState(false);
  const eventGroup = EVENT_GROUPS.find(g => g.events.includes(binding.event));
  const eventColor = eventGroup?.color || C.muted;
  const actionLabel = ACTIONS.find(a => a.value === binding.action)?.label.replace(/^[^\s]+\s/, '') || binding.action;
  const actionColor = ACTIONS.find(a => a.value === binding.action)?.color || C.muted;
  const eventLabel = binding.event === 'custom' ? (binding.customEvent || 'custom') : binding.event;
  const hasOpts = binding.optOnce || binding.optPassive || binding.optCapture;

  return (
    <div style={{ border: `1px solid ${binding.enabled ? C.border : '#2a2a2c'}`, borderRadius: 5, overflow: 'hidden', marginBottom: 4, opacity: binding.enabled ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 7px', background: C.surface, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <button
          onClick={e => { e.stopPropagation(); onUpdate({ enabled: !binding.enabled }); }}
          title={binding.enabled ? 'Disable' : 'Enable'}
          style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${binding.enabled ? C.accent : C.dim}`, background: binding.enabled ? C.accentBg : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          {binding.enabled && <FiCheck size={9} color={C.accent} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: C.accent }}>{binding.target || '(no target)'}</span>
          </div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: eventColor }}>{eventLabel}</span>
            <span style={{ color: C.dim }}>→</span>
            <span style={{ color: actionColor }}>{actionLabel}</span>
            {hasOpts && <span style={{ fontSize: 8, color: C.dim, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 3, padding: '0 4px' }}>opts</span>}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: 2, flexShrink: 0, display: 'flex' }} title="Delete">
          <FiTrash2 size={11} />
        </button>
        <span style={{ color: C.dim, flexShrink: 0 }}>{open ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}</span>
      </div>

      {open && (
        <div style={{ padding: '8px', background: C.bg, borderTop: `1px solid ${C.border}` }}>

          <Field label="Target Selector" color={C.accent}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input style={{ ...inp, flex: 1 }} value={binding.target} placeholder=".my-btn, #hero, button"
                onChange={e => onUpdate({ target: e.target.value })} />
              {selectedSelector && (
                <button onClick={() => onUpdate({ target: selectedSelector })}
                  style={{ padding: '2px 6px', fontSize: 9, borderRadius: 3, cursor: 'pointer', background: C.accentBg, border: `1px solid ${C.accentBrd}`, color: C.accent, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  Use selected
                </button>
              )}
            </div>
          </Field>

          <Field label="Event Type">
            <div style={{ display: 'flex', gap: 4 }}>
              <select style={{ ...selStyle, flex: 1 }} value={binding.event} onChange={e => onUpdate({ event: e.target.value })}>
                {EVENT_GROUPS.map(g => (
                  <optgroup key={g.label} label={`── ${g.label} ──`}>
                    {g.events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                  </optgroup>
                ))}
              </select>
              {binding.event === 'custom' && (
                <input style={{ ...inp, flex: 1 }} value={binding.customEvent || ''} placeholder="my-event-name"
                  onChange={e => onUpdate({ customEvent: e.target.value })} />
              )}
            </div>
          </Field>

          <Field label="Action">
            <select style={selStyle} value={binding.action} onChange={e => onUpdate({ action: e.target.value as EventBinding['action'] })}>
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>

          {binding.action === 'playAnimation' && (
            <>
              <Field label="Animation Name" color={C.green}>
                <input style={inp} value={binding.animationName || ''} placeholder="fadeIn, bounce, slideUp…"
                  onChange={e => onUpdate({ animationName: e.target.value })} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <Field label="Duration">
                  <input style={inp} value={binding.animationDuration || ''} placeholder="0.6s"
                    onChange={e => onUpdate({ animationDuration: e.target.value })} />
                </Field>
                <Field label="Easing">
                  <input style={inp} value={binding.animationEasing || ''} placeholder="ease"
                    onChange={e => onUpdate({ animationEasing: e.target.value })} />
                </Field>
              </div>
            </>
          )}

          {binding.action === 'toggleClass' && (
            <Field label="Class Name" color={C.blue}>
              <input style={inp} value={binding.className || ''} placeholder="active, is-open, dark…"
                onChange={e => onUpdate({ className: e.target.value })} />
            </Field>
          )}

          {binding.action === 'setAttribute' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <Field label="Attribute" color={C.muted}>
                <input style={inp} value={binding.attrName || ''} placeholder="data-state"
                  onChange={e => onUpdate({ attrName: e.target.value })} />
              </Field>
              <Field label="Value" color={C.muted}>
                <input style={inp} value={binding.attrValue || ''} placeholder="active"
                  onChange={e => onUpdate({ attrValue: e.target.value })} />
              </Field>
            </div>
          )}

          {binding.action === 'navigate' && (
            <Field label="URL / Hash" color={C.purple}>
              <input style={inp} value={binding.navigateUrl || ''} placeholder="#section, /page, https://…"
                onChange={e => onUpdate({ navigateUrl: e.target.value })} />
            </Field>
          )}

          {binding.action === 'dispatchEvent' && (
            <Field label="Custom Event Name" color={C.red}>
              <input style={inp} value={binding.dispatchEventName || ''} placeholder="my-custom-event"
                onChange={e => onUpdate({ dispatchEventName: e.target.value })} />
            </Field>
          )}

          {(binding.action === 'preventDefault' || binding.action === 'stopPropagation') && (
            <div style={{ padding: '5px 8px', background: C.surface, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 10, color: C.muted }}>
              Calls <code style={{ color: binding.action === 'preventDefault' ? C.red : C.dim, background: C.surface2, padding: '1px 4px', borderRadius: 2 }}>event.{binding.action}()</code> on the event.
            </div>
          )}

          {binding.action === 'snippet' && (
            <Field label="JavaScript Snippet" color={C.blue}>
              <textarea style={{ ...inp, height: 72, resize: 'vertical', lineHeight: 1.4, fontFamily: 'monospace' } as React.CSSProperties}
                value={binding.snippet || ''} placeholder={'el.style.color = "red";\nconsole.log(event.target);'}
                onChange={e => onUpdate({ snippet: e.target.value })} />
            </Field>
          )}

          {/* addEventListener Options */}
          <div style={{ marginTop: 6, padding: '6px 8px', background: C.surface, borderRadius: 4, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>addEventListener Options</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <OptionToggle label="once" value={!!binding.optOnce} onChange={v => onUpdate({ optOnce: v })} color={C.green} />
              <OptionToggle label="passive" value={!!binding.optPassive} onChange={v => onUpdate({ optPassive: v })} color={C.blue} />
              <OptionToggle label="capture" value={!!binding.optCapture} onChange={v => onUpdate({ optCapture: v })} color={C.purple} />
            </div>
            <div style={{ marginTop: 4, fontSize: 9, color: C.dim, lineHeight: 1.4 }}>
              {binding.optOnce && <div><span style={{ color: C.green }}>once</span> — listener fires once then auto-removes</div>}
              {binding.optPassive && <div><span style={{ color: C.blue }}>passive</span> — never calls preventDefault (better scroll perf)</div>}
              {binding.optCapture && <div><span style={{ color: C.purple }}>capture</span> — fires in capture phase (top-down)</div>}
              {!binding.optOnce && !binding.optPassive && !binding.optCapture && <div>No options set — fires every time, bubbling phase</div>}
            </div>
          </div>

          {/* Generated Code Preview */}
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Generated Code</div>
            <pre style={{ margin: 0, padding: '6px 8px', background: '#0d0d0f', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, color: '#dcdcaa', fontFamily: 'monospace', lineHeight: 1.5, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {generateBindingCode(binding).trim()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function EventObjectRef() {
  const [open, setOpen] = useState(false);
  const [patternsOpen, setPatternsOpen] = useState(false);
  return (
    <div style={{ margin: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Event Object Reference */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 5, overflow: 'hidden' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: C.surface, border: 'none', cursor: 'pointer', color: C.muted, fontSize: 10 }}>
          <FiInfo size={11} color={C.blue} />
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>Event Object Properties</span>
          {open ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
        </button>
        {open && (
          <div style={{ background: C.bg, padding: '6px 8px', borderTop: `1px solid ${C.border}` }}>
            {EVENT_OBJECT_PROPS.map(group => (
              <div key={group.group} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: group.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{group.group}</div>
                {group.props.map(p => (
                  <div key={p.name} style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'flex-start' }}>
                    <code style={{ fontSize: 9, color: group.color, background: C.surface2, padding: '1px 5px', borderRadius: 2, fontFamily: 'monospace', flexShrink: 0, whiteSpace: 'nowrap' }}>{p.name}</code>
                    <span style={{ fontSize: 9, color: C.dim, lineHeight: 1.4 }}>{p.desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Useful Patterns */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 5, overflow: 'hidden' }}>
        <button onClick={() => setPatternsOpen(o => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: C.surface, border: 'none', cursor: 'pointer', color: C.muted, fontSize: 10 }}>
          <FiZap size={11} color={C.accent} />
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>Useful Patterns & Snippets</span>
          {patternsOpen ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
        </button>
        {patternsOpen && (
          <div style={{ background: C.bg, padding: '6px 8px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CODE_PATTERNS.map(p => (
              <div key={p.label}>
                <div style={{ fontSize: 9, color: C.accent, fontWeight: 600, marginBottom: 2 }}>{p.label}</div>
                <pre style={{ margin: 0, padding: '5px 8px', background: '#0d0d0f', border: `1px solid ${C.border}`, borderRadius: 3, fontSize: 9, color: '#dcdcaa', fontFamily: 'monospace', lineHeight: 1.5, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{p.code}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const EventListenersPanel: React.FC = () => {
  const {
    eventBindings, addEventBinding, removeEventBinding, updateEventBinding,
    files, activeFileId, updateFileContent, showNotification, selectedSelector,
  } = useEditorStore();

  const [injected, setInjected] = useState(false);
  const [activeTab, setActiveTab] = useState<'bindings' | 'ref'>('bindings');

  const handleInject = useCallback(() => {
    const htmlFile = getTargetHtmlFile(files, activeFileId);
    if (!htmlFile) { showNotification('No HTML file found'); return; }
    const script = buildRuntimeScript(eventBindings);
    const updated = injectIntoHtml(htmlFile.content, script);
    if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
    setInjected(true);
    showNotification(eventBindings.filter(b => b.enabled).length + ' event listener(s) injected');
    setTimeout(() => setInjected(false), 2000);
  }, [activeFileId, eventBindings, files, updateFileContent, showNotification]);

  const handleAdd = () => addEventBinding(emptyBinding());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', height: 32, background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <FiZap size={12} color={C.accent} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>Event Listeners</span>
        <button onClick={handleAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', background: C.accentBg, border: `1px solid ${C.accentBrd}`, color: C.accent, fontFamily: 'inherit' }}>
          <FiPlus size={10} /> Add
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{ flexShrink: 0, display: 'flex', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {[['bindings', 'Listeners'], ['ref', 'Reference']] .map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id as 'bindings' | 'ref')}
            style={{ flex: 1, height: 26, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
              background: activeTab === id ? C.accentBg : 'transparent',
              borderBottom: `2px solid ${activeTab === id ? C.accent : 'transparent'}`,
              color: activeTab === id ? C.accent : C.muted, fontWeight: activeTab === id ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'bindings' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 8 }}>
            {eventBindings.length === 0 ? (
              <div style={{ padding: '20px 8px', textAlign: 'center' }}>
                <FiZap size={22} color={C.dim} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>No event listeners yet</div>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 12 }}>Click <strong style={{ color: C.accent }}>+ Add</strong> to bind a DOM event to an action — no code required.</div>
                <button onClick={handleAdd}
                  style={{ padding: '5px 14px', fontSize: 10, borderRadius: 4, cursor: 'pointer', background: C.accentBg, border: `1px solid ${C.accentBrd}`, color: C.accent, fontFamily: 'inherit' }}>
                  + Add First Listener
                </button>
              </div>
            ) : (
              eventBindings.map(b => (
                <BindingCard
                  key={b.id}
                  binding={b}
                  selectedSelector={selectedSelector}
                  onUpdate={updates => updateEventBinding(b.id, updates)}
                  onDelete={() => removeEventBinding(b.id)}
                />
              ))
            )}
          </div>

          <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: '6px 8px', background: C.surface, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: C.dim, flex: 1 }}>
              {eventBindings.filter(b => b.enabled).length} active / {eventBindings.length} total
            </span>
            <button onClick={handleInject}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                background: injected ? 'rgba(78,201,176,0.15)' : C.accentBg,
                border: `1px solid ${injected ? 'rgba(78,201,176,0.5)' : C.accentBrd}`,
                color: injected ? C.green : C.accent }}>
              {injected ? <><FiCheck size={10} /> Injected!</> : <><FiZap size={10} /> Inject into Page</>}
            </button>
          </div>
        </>
      )}

      {activeTab === 'ref' && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingTop: 8 }}>
          {/* Event Phases */}
          <div style={{ margin: '0 8px 8px', padding: '7px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5 }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Event Phases</div>
            {[['1', 'Capturing', C.purple, 'Top-down: window → document → target'],
              ['2', 'Target', C.accent, 'Event reaches the target element'],
              ['3', 'Bubbling', C.blue, 'Bottom-up: target → document → window'],
            ].map(([num, phase, color, desc]) => (
              <div key={phase as string} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: color as string, fontWeight: 700, background: C.surface2, padding: '1px 5px', borderRadius: 2, flexShrink: 0 }}>{num as string}</span>
                <span style={{ fontSize: 10, color: color as string, fontWeight: 600, minWidth: 60 }}>{phase as string}</span>
                <span style={{ fontSize: 9, color: C.dim }}>{desc as string}</span>
              </div>
            ))}
          </div>

          {/* Event Groups quick ref */}
          <div style={{ margin: '0 8px 8px', padding: '7px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5 }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Event Types by Category</div>
            {EVENT_GROUPS.filter(g => g.label !== 'Custom').map(g => (
              <div key={g.label} style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: g.color, fontWeight: 700 }}>{g.label}: </span>
                <span style={{ fontSize: 9, color: C.dim }}>{g.events.join(', ')}</span>
              </div>
            ))}
          </div>

          <EventObjectRef />
        </div>
      )}
    </div>
  );
};

export default EventListenersPanel;
