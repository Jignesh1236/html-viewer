import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  FiCode, FiEye, FiLayout, FiDownload, FiRefreshCw, FiFolder, FiSliders, FiClock,
  FiMonitor, FiBookOpen, FiInfo, FiTerminal, FiZap, FiPlus, FiSettings, FiShare2,
  FiChevronRight, FiPlay, FiCpu, FiFileText, FiSearch, FiUpload, FiPlusSquare,
  FiFolderPlus, FiCopy, FiTrash2, FiEdit, FiCheckCircle, FiAlertCircle, FiBox,
  FiDroplet, FiMaximize2, FiMove, FiType, FiCheck, FiX, FiSquare, FiZoomIn,
  FiZoomOut, FiCommand, FiMousePointer, FiMenu, FiLayers, FiGrid, FiScissors,
  FiSave, FiFilePlus, FiPause, FiStopCircle, FiAlignLeft, FiAlignCenter,
  FiAlignRight, FiUnderline, FiBold, FiItalic, FiMinus, FiCornerDownRight,
  FiPackage, FiDatabase, FiGlobe, FiSmartphone, FiTablet, FiStar, FiArrowRight,
  FiRotateCcw, FiLock, FiUnlock, FiTarget, FiTrendingUp, FiShield, FiList, FiSend,
} from 'react-icons/fi';

/* ─────────────────────────────────────────────────────────────────────────────
   Re-usable UI components
   ───────────────────────────────────────────────────────────────────────── */

const KbdKey: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#333] text-[10px] font-black text-[#aaa] font-mono tracking-wide shadow-sm">
    {children}
  </kbd>
);

const StepBadge: React.FC<{ n: number | string; color?: string }> = ({ n, color = 'orange' }) => (
  <div className={`w-9 h-9 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-400 font-black text-sm flex-shrink-0`}>
    {n}
  </div>
);

const Tag: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'orange' }) => (
  <span className={`inline-block px-2 py-0.5 rounded-md bg-${color}-500/10 border border-${color}-500/20 text-${color}-400 text-[10px] font-black uppercase tracking-widest`}>
    {children}
  </span>
);

const InfoBox: React.FC<{ title: string; icon?: React.ReactNode; color?: string; children: React.ReactNode }> = ({
  title, icon, color = 'blue', children,
}) => (
  <div className={`p-5 bg-${color}-500/5 border border-${color}-500/20 rounded-2xl space-y-2`}>
    <div className={`flex items-center gap-2 text-${color}-400 font-black text-xs uppercase tracking-widest`}>
      {icon} {title}
    </div>
    <div className="text-xs text-[#666] leading-relaxed">{children}</div>
  </div>
);

const FeatureRow: React.FC<{ icon: React.ReactNode; label: string; desc: string; shortcut?: string; color?: string }> = ({
  icon, label, desc, shortcut, color = 'orange',
}) => (
  <div className={`flex items-start gap-4 p-4 rounded-2xl bg-[#111] border border-[#1e1e1e] hover:border-${color}-500/20 transition-all group`}>
    <div className={`text-${color}-500 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-white text-xs font-black uppercase tracking-tight">{label}</span>
        {shortcut && <KbdKey>{shortcut}</KbdKey>}
      </div>
      <p className="text-[10px] text-[#555] leading-relaxed mt-0.5 font-medium">{desc}</p>
    </div>
  </div>
);

const SectionDivider: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; color?: string }> = ({
  icon, title, subtitle, color = 'orange',
}) => (
  <div className={`flex items-center gap-4 sm:gap-6 mb-8 sm:mb-12 pb-6 sm:pb-8 border-b border-[#1a1a1a]`}>
    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-500 flex-shrink-0 shadow-lg shadow-${color}-500/10`}>
      {React.cloneElement(icon as React.ReactElement, { size: 22 })}
    </div>
    <div className="min-w-0">
      <h2 className={`text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter break-words`}>{title}</h2>
      <p className="text-[#555] text-xs sm:text-sm font-medium mt-0.5">{subtitle}</p>
    </div>
  </div>
);

const InArticleAd: React.FC = () => {
  React.useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      /* AdSense blocked or not loaded */
    }
  }, []);
  return (
    <div className="my-8 px-2">
      <p className="text-[9px] font-black text-[#2a2a2a] uppercase tracking-[0.3em] mb-2 text-center">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client="ca-pub-1826192920016393"
        data-ad-slot="9844179549"
      />
    </div>
  );
};

const SidebarAd: React.FC = () => {
  React.useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      /* AdSense blocked or not loaded */
    }
  }, []);
  return (
    <div className="mt-8 pt-6 border-t border-[#141414]">
      <p className="text-[9px] font-black text-[#2a2a2a] uppercase tracking-[0.3em] mb-2 px-3">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-1826192920016393"
        data-ad-slot="7872622325"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

const PresetCard: React.FC<{ name: string; desc: string; css: string }> = ({ name, desc, css }) => (
  <div className="p-4 bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl hover:border-red-500/20 transition-all group">
    <div className="flex items-center justify-between mb-2">
      <span className="text-white text-xs font-black uppercase tracking-tight group-hover:text-red-400 transition-colors">{name}</span>
    </div>
    <p className="text-[10px] text-[#555] mb-3 leading-relaxed">{desc}</p>
    <code className="text-[9px] text-red-400/60 font-mono block bg-[#060606] px-2 py-1.5 rounded-lg border border-[#1a1a1a] leading-relaxed">{css}</code>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Table of contents data
   ───────────────────────────────────────────────────────────────────────── */

const NAV_SECTIONS = [
  {
    heading: 'Getting Started',
    items: [
      { id: 'overview', label: 'What Is HTML Editor?', icon: <FiInfo size={13} /> },
      { id: 'quick-start', label: 'Quick Start in 5 Steps', icon: <FiZap size={13} /> },
      { id: 'interface-overview', label: 'Interface Overview', icon: <FiLayout size={13} /> },
      { id: 'modes', label: 'Editor Modes', icon: <FiGrid size={13} /> },
    ],
    color: 'orange',
  },
  {
    heading: 'Panels In Depth',
    items: [
      { id: 'file-explorer', label: 'File Explorer', icon: <FiFolder size={13} /> },
      { id: 'code-editor', label: 'Code Editor (Monaco)', icon: <FiCode size={13} /> },
      { id: 'preview-pane', label: 'Live Preview', icon: <FiMonitor size={13} /> },
      { id: 'visual-designer', label: 'Visual Designer', icon: <FiEye size={13} /> },
      { id: 'properties-panel', label: 'Properties Panel', icon: <FiSliders size={13} /> },
      { id: 'timeline', label: 'CSS Timeline', icon: <FiClock size={13} /> },
    ],
    color: 'blue',
  },
  {
    heading: 'Menus & Commands',
    items: [
      { id: 'menu-file', label: 'File Menu', icon: <FiFileText size={13} /> },
      { id: 'menu-export', label: 'Export Menu', icon: <FiDownload size={13} /> },
      { id: 'menu-tools', label: 'Tools Menu', icon: <FiSettings size={13} /> },
      { id: 'menu-window', label: 'Window Menu', icon: <FiMenu size={13} /> },
      { id: 'menu-help', label: 'Help Menu', icon: <FiBookOpen size={13} /> },
    ],
    color: 'cyan',
  },
  {
    heading: 'AI & Intelligence',
    items: [
      { id: 'ai-copilot', label: 'AI Copilot System', icon: <FiCpu size={13} /> },
      { id: 'ai-states', label: 'AI Status States', icon: <FiZap size={13} /> },
    ],
    color: 'yellow',
  },
  {
    heading: 'Window System',
    items: [
      { id: 'docking', label: 'Dock & Float Panels', icon: <FiLayers size={13} /> },
      { id: 'resizing', label: 'Resizing Panels', icon: <FiMaximize2 size={13} /> },
      { id: 'snap-zones', label: 'Snap Zones', icon: <FiTarget size={13} /> },
    ],
    color: 'purple',
  },
  {
    heading: 'Storage & Data',
    items: [
      { id: 'persistence', label: 'Auto-Save & Storage', icon: <FiDatabase size={13} /> },
      { id: 'import-export', label: 'Import & Export', icon: <FiPackage size={13} /> },
    ],
    color: 'green',
  },
  {
    heading: 'No-Code Builder',
    items: [
      { id: 'component-library', label: 'Component Library', icon: <FiBox size={13} /> },
      { id: 'layout-builder', label: 'Layout Builder', icon: <FiGrid size={13} /> },
      { id: 'page-manager', label: 'Page Manager', icon: <FiFileText size={13} /> },
      { id: 'template-library', label: 'Template Library', icon: <FiStar size={13} /> },
    ],
    color: 'purple',
  },
  {
    heading: 'Reference',
    items: [
      { id: 'shortcuts', label: 'All Keyboard Shortcuts', icon: <FiTerminal size={13} /> },
      { id: 'animation-presets', label: 'Animation Presets', icon: <FiStar size={13} /> },
      { id: 'mobile', label: 'Mobile Interface', icon: <FiSmartphone size={13} /> },
      { id: 'faq', label: 'FAQ', icon: <FiSearch size={13} /> },
    ],
    color: 'pink',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Main Documentation Page
   ───────────────────────────────────────────────────────────────────────── */

const Documentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  React.useEffect(() => {
    document.title = 'HTML Editor Pro Documentation — Online HTML, CSS & JavaScript Editor Guide';
    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Complete documentation for HTML Editor Pro — the free online HTML, CSS and JavaScript editor with Monaco code editor, drag-and-drop visual designer, CSS animation timeline, live preview and ZIP export. Step-by-step guides, keyboard shortcuts and FAQ.');
    setMeta('keywords', 'HTML editor documentation, online HTML editor guide, HTML editor tutorial, Monaco editor docs, free HTML CSS JS editor, HTML editor keyboard shortcuts, CSS animation timeline tutorial, drag and drop HTML builder docs, HTML editor FAQ, learn HTML editor, web editor manual');
    setMeta('og:title', 'HTML Editor Pro — Complete Documentation', 'property');
    setMeta('og:description', 'Every panel, menu, shortcut and feature of the free online HTML editor explained step by step.', 'property');
    setMeta('og:url', 'https://html-viewer-f2v.pages.dev/docs', 'property');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://html-viewer-f2v.pages.dev/docs');

    const ldId = '__docs_jsonld__';
    document.getElementById(ldId)?.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = ldId;
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'TechArticle',
          '@id': 'https://html-viewer-f2v.pages.dev/docs#article',
          headline: 'HTML Editor Pro — Complete Documentation',
          description: 'Step-by-step documentation covering every panel, menu, keyboard shortcut, animation preset and feature of the free online HTML editor.',
          inLanguage: 'en',
          url: 'https://html-viewer-f2v.pages.dev/docs',
          datePublished: '2026-04-17',
          dateModified: '2026-04-21',
          author: { '@type': 'Person', name: 'Jignesh D Maru' },
          publisher: { '@type': 'Person', name: 'Jignesh D Maru' },
          image: 'https://html-viewer-f2v.pages.dev/og-image.jpg',
          proficiencyLevel: 'Beginner',
          articleSection: ['Getting Started', 'Panels', 'Menus', 'AI', 'Window System', 'Storage', 'Reference', 'FAQ'],
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://html-viewer-f2v.pages.dev/' },
            { '@type': 'ListItem', position: 2, name: 'Documentation', item: 'https://html-viewer-f2v.pages.dev/docs' },
          ],
        },
        {
          '@type': 'HowTo',
          name: 'How to build a web page with HTML Editor Pro in 5 steps',
          description: 'Create, edit, design visually, animate and export a complete web page using the free online HTML editor.',
          totalTime: 'PT3M',
          inLanguage: 'en',
          step: [
            { '@type': 'HowToStep', position: 1, name: 'Open the editor', text: 'The editor loads with a starter project (index.html, styles.css, script.js) ready to edit.' },
            { '@type': 'HowToStep', position: 2, name: 'Write or paste your code', text: 'Click any file in the File Explorer, then type in the Monaco code editor. The Live Preview updates on every keystroke.' },
            { '@type': 'HowToStep', position: 3, name: 'Switch to Visual Mode', text: 'Click any element on the canvas to move, resize, rotate and style it through the Properties Panel — every change is written back to your HTML.' },
            { '@type': 'HowToStep', position: 4, name: 'Animate with the CSS Timeline', text: 'Open the Timeline panel, add tracks, then click Apply to Page to inject standard @keyframes CSS into your HTML.' },
            { '@type': 'HowToStep', position: 5, name: 'Export your project', text: 'Use Export → Download ZIP to get a complete static site you can host anywhere — Netlify, Vercel, Cloudflare Pages or GitHub Pages.' },
          ],
        },
      ],
    });
    document.head.appendChild(script);

    if (window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    return () => { document.getElementById(ldId)?.remove(); };
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#ccc] font-sans overflow-x-hidden">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-[200] w-full border-b border-[#141414] bg-[#080808]/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 no-underline group min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#e34c26] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-600/30 group-hover:scale-105 transition-transform flex-shrink-0">H</div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight leading-none block truncate">HTML EDITOR <span className="text-orange-500">PRO</span></span>
              <span className="text-[8px] sm:text-[9px] font-black text-[#444] tracking-[0.2em] sm:tracking-[0.25em] uppercase block mt-0.5 truncate">Official Documentation</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 h-8 rounded-full text-[10px] font-black text-[#999] border border-[#222] hover:border-[#333] uppercase tracking-widest"
              aria-label="Open table of contents"
            >
              <FiList size={13} /> Menu
            </button>
            <Link href="/">
              <button className="px-3 sm:px-4 h-8 rounded-full text-[10px] sm:text-[11px] font-black text-[#666] hover:text-white border border-[#222] hover:border-[#333] bg-transparent transition-all uppercase tracking-widest whitespace-nowrap">
                Open Editor
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile TOC Drawer ── */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-[300] flex" role="dialog" aria-modal="true" aria-label="Table of contents">
          <div className="flex-1 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <aside className="w-[82%] max-w-sm h-full bg-[#0a0a0a] border-l border-[#1a1a1a] overflow-y-auto p-5 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-[#666] uppercase tracking-[0.3em]">Contents</p>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#666] hover:text-white border border-[#1a1a1a] hover:border-[#333]"
                aria-label="Close menu"
              >
                <FiX size={14} />
              </button>
            </div>
            {NAV_SECTIONS.map((section) => (
              <div key={section.heading}>
                <p className="text-[9px] font-black text-[#2a2a2a] uppercase tracking-[0.3em] px-3 mb-2">{section.heading}</p>
                <nav className="space-y-0.5">
                  {section.items.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={() => { setActiveSection(item.id); setMobileNavOpen(false); }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all no-underline ${
                        activeSection === item.id
                          ? `bg-${section.color}-500/10 text-${section.color}-400`
                          : 'text-[#777] hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className={activeSection === item.id ? `text-${section.color}-400` : `text-[#444]`}>{item.icon}</span>
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            ))}
          </aside>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">

          {/* ── Sidebar Navigation (desktop) ── */}
          <aside className="hidden lg:block sticky top-28 h-[calc(100vh-120px)] overflow-y-auto pr-4 space-y-8" style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
            {NAV_SECTIONS.map((section) => (
              <div key={section.heading}>
                <p className={`text-[9px] font-black text-[#2a2a2a] uppercase tracking-[0.3em] px-3 mb-3`}>{section.heading}</p>
                <nav className="space-y-0.5">
                  {section.items.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all group no-underline ${
                        activeSection === item.id
                          ? `bg-${section.color}-500/10 text-${section.color}-400`
                          : 'text-[#444] hover:text-[#999] hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className={activeSection === item.id ? `text-${section.color}-400` : `text-[#333] group-hover:text-[#666]`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            ))}
            <SidebarAd />
          </aside>

          {/* ── Main Content ── */}
          <main className="min-w-0 space-y-14 sm:space-y-20 lg:space-y-24">

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Overview
                ═══════════════════════════════════════════════════════════ */}
            <section id="overview" className="scroll-mt-28 space-y-10">
              <div>
                <Tag color="orange">v2.0 · Free Forever · No Login</Tag>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter mt-4 leading-[0.95] break-words">
                  HTML Editor Pro<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Complete Guide</span>
                </h1>
                <p className="text-base sm:text-lg text-[#666] leading-relaxed max-w-2xl mt-5 font-medium">
                  HTML Editor Pro is a fully browser-based web development environment. It runs entirely in your browser with no server, no login, and no installation required. Every project is stored in your browser's local storage and can be exported as a ZIP at any time.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: <FiCode />, title: 'Monaco Code Editor', desc: 'The same engine as Visual Studio Code — IntelliSense, syntax highlighting, multi-cursor, Emmet, and AI completions.', color: 'blue' },
                  { icon: <FiEye />, title: 'Visual Designer', desc: 'Click-to-select any HTML element, drag to reposition, use handles to resize and rotate — all without touching code.', color: 'green' },
                  { icon: <FiClock />, title: 'CSS Timeline', desc: 'A visual keyframe timeline to design CSS animations. Drag track bars to set delay and duration, then export standard @keyframes CSS.', color: 'red' },
                  { icon: <FiFolder />, title: 'Virtual File System', desc: 'Manage HTML, CSS, JS, and image files in a virtual folder structure. Everything is auto-saved to localStorage.', color: 'orange' },
                  { icon: <FiMonitor />, title: 'Live Preview', desc: 'Every keystroke refreshes the preview instantly. Tabbed preview supports multiple pages simultaneously.', color: 'cyan' },
                  { icon: <FiCpu />, title: 'AI Copilot', desc: 'An inline AI assistant that analyzes your file context and suggests completions. Press Tab to accept instantly.', color: 'yellow' },
                ].map((f, i) => (
                  <a href={`#${['code-editor','visual-designer','timeline','file-explorer','preview-pane','ai-copilot'][i]}`} key={i}
                    className={`p-5 rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-${f.color}-500/30 transition-all group no-underline`}>
                    <div className={`text-${f.color}-500 mb-3 group-hover:scale-110 transition-transform inline-block`}>{f.icon}</div>
                    <h3 className="text-white text-sm font-black mb-1.5 tracking-tight">{f.title}</h3>
                    <p className="text-[11px] text-[#555] leading-relaxed">{f.desc}</p>
                  </a>
                ))}
              </div>
            </section>

            <InArticleAd />

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Quick Start
                ═══════════════════════════════════════════════════════════ */}
            <section id="quick-start" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiZap />} title="Quick Start in 5 Steps" subtitle="From zero to a working web page in under 3 minutes." color="orange" />

              <div className="space-y-4">
                {[
                  {
                    n: 1, color: 'orange', title: 'Open the Editor',
                    desc: 'The editor loads with a starter project already created — index.html, styles.css, and script.js are ready to go. You can immediately start editing or create fresh files.',
                  },
                  {
                    n: 2, color: 'blue', title: 'Write or Paste Your Code',
                    desc: 'Click any file in the File Explorer (left panel) to open it. Start typing in the Monaco Code Editor. Your changes sync to the Live Preview instantly on every keystroke.',
                  },
                  {
                    n: 3, color: 'green', title: 'Switch to Visual Mode to Design',
                    desc: 'Press Ctrl+2 or go to Window → Visual Layout. Now click any element directly in the canvas to select it. Use the Properties Panel on the right to change colors, fonts, spacing, and more — without writing CSS.',
                  },
                  {
                    n: 4, color: 'red', title: 'Add Animations with the Timeline',
                    desc: 'Click the Timeline panel tab at the bottom. Press "+" to add an animation track. Choose your CSS selector (e.g. .hero), pick a preset (FadeIn, SlideUp, Bounce), drag the bar to set timing, then click "Apply to Page" to inject the @keyframes CSS.',
                  },
                  {
                    n: 5, color: 'purple', title: 'Export Your Project',
                    desc: 'Click File → Export as ZIP (or press Ctrl+E). A zip archive with all your HTML, CSS, JS, and image files downloads instantly. Upload it to any web host to go live.',
                  },
                ].map((step) => (
                  <div key={step.n} className={`flex gap-5 p-5 rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-${step.color}-500/20 transition-all`}>
                    <StepBadge n={step.n} color={step.color} />
                    <div>
                      <h4 className="text-white font-black text-sm uppercase tracking-tight mb-1">{step.title}</h4>
                      <p className="text-xs text-[#555] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Interface Overview
                ═══════════════════════════════════════════════════════════ */}
            <section id="interface-overview" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiLayout />} title="Interface Overview" subtitle="Every area of the screen and what it does." color="blue" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed font-medium">
                  The editor is made up of five main panels plus a menu bar at the top. All panels are <strong className="text-white">dockable</strong> (snapped into the layout) or <strong className="text-white">floating</strong> (free-floating windows you can drag anywhere).
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: <FiFolder />, label: 'File Explorer', pos: 'Left side', desc: 'Your project\'s file tree. Create, rename, delete, and organize HTML, CSS, JS, and image files into folders.', color: 'orange' },
                    { icon: <FiCode />, label: 'Code Editor', pos: 'Center', desc: 'The Monaco editor where you write HTML, CSS, and JavaScript. Auto-updates the preview on every change.', color: 'blue' },
                    { icon: <FiMonitor />, label: 'Preview Pane', pos: 'Right (split) / Center (visual)', desc: 'A live sandboxed iframe showing your rendered page. Supports multiple tabs.', color: 'cyan' },
                    { icon: <FiSliders />, label: 'Properties Panel', pos: 'Right (visual mode)', desc: 'Click any element in visual mode to inspect and change its CSS properties visually.', color: 'purple' },
                    { icon: <FiClock />, label: 'Timeline', pos: 'Bottom (visual mode)', desc: 'A visual animation timeline. Add tracks, set presets, drag to set delay and duration.', color: 'red' },
                    { icon: <FiMenu />, label: 'Menu Bar', pos: 'Top bar', desc: 'File, Export, Tools, Window, and Help menus. Also shows the active mode and AI status.', color: 'gray' },
                  ].map((p, i) => (
                    <div key={i} className={`p-5 rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-${p.color}-500/20 transition-all`}>
                      <div className={`text-${p.color}-500 mb-3`}>{p.icon}</div>
                      <h4 className="text-white font-black text-sm tracking-tight mb-0.5">{p.label}</h4>
                      <p className={`text-[9px] text-${p.color}-500/60 font-black uppercase tracking-widest mb-2`}>{p.pos}</p>
                      <p className="text-[11px] text-[#555] leading-relaxed">{p.desc}</p>
                    </div>
                  ))}
                </div>

                <InfoBox title="Status Bar" icon={<FiInfo size={11} />} color="orange">
                  At the very bottom of the screen is the Status Bar. It shows the active file name on the left, and the <strong className="text-orange-400">AI Status Button</strong> on the right (✦ AI · ⟳ AI… · ✓ AI · ✗ AI). Click it to trigger a new AI suggestion.
                </InfoBox>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Editor Modes
                ═══════════════════════════════════════════════════════════ */}
            <section id="modes" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiGrid />} title="Editor Modes" subtitle="Switch between three specialized workspace layouts." color="orange" />

              <div className="grid md:grid-cols-3 gap-5">
                {[
                  {
                    key: 'Ctrl+1', name: 'Code Mode', color: 'blue', icon: <FiCode size={20} />,
                    panels: ['File Explorer (left)', 'Code Editor (full width)'],
                    use: 'Pure coding sessions — maximum editor space, no distractions.',
                    detail: 'In Code Mode the Code Editor fills the entire workspace (minus the File Explorer on the left). Use this when you want maximum focus on writing markup, styles, or JavaScript.',
                  },
                  {
                    key: 'Ctrl+3', name: 'Split Mode', color: 'cyan', icon: <FiLayout size={20} />,
                    panels: ['File Explorer (left)', 'Code Editor (center)', 'Preview (right)'],
                    use: 'The default mode. Write code on the left, see the result on the right.',
                    detail: 'Split Mode shows the code and the live preview side-by-side. Drag the divider between the panels to give more or less space to either side.',
                  },
                  {
                    key: 'Ctrl+2', name: 'Visual Mode', color: 'green', icon: <FiEye size={20} />,
                    panels: ['File Explorer (left)', 'Canvas/Preview (center)', 'Properties Panel (right)', 'Timeline (bottom)'],
                    use: 'Design-first workflow — click elements, change styles, animate.',
                    detail: 'Visual Mode is for design work. The canvas becomes interactive: click any HTML element to select it, drag it to move, and use the corner/edge handles to resize or rotate. The Properties Panel populates with that element\'s CSS.',
                  },
                ].map((m) => (
                  <div key={m.name} className={`p-6 rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-${m.color}-500/30 transition-all space-y-4`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-${m.color}-500`}>{m.icon}</div>
                      <KbdKey>{m.key}</KbdKey>
                    </div>
                    <h3 className={`text-${m.color}-400 font-black text-base tracking-tight`}>{m.name}</h3>
                    <p className="text-[11px] text-[#555] leading-relaxed">{m.detail}</p>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-[#333] uppercase tracking-widest">Active Panels</p>
                      {m.panels.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-[#444]">
                          <FiChevronRight size={10} className={`text-${m.color}-500/50`} /> {p}
                        </div>
                      ))}
                    </div>
                    <p className={`text-[10px] text-${m.color}-500/70 italic font-medium`}>{m.use}</p>
                  </div>
                ))}
              </div>

              <InfoBox title="Mode Memory" icon={<FiDatabase size={11} />} color="purple">
                Your last active mode is remembered between sessions via <code className="text-purple-400 bg-purple-500/5 px-1 rounded">localStorage</code>. Switching modes also adjusts which panels are visible and docked — but your floating windows and their positions are preserved.
              </InfoBox>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: File Explorer
                ═══════════════════════════════════════════════════════════ */}
            <section id="file-explorer" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiFolder />} title="File Explorer" subtitle="Your project's virtual file system — create, organize, import, and manage every asset." color="orange" />

              <div className="space-y-8">
                <p className="text-[#666] text-sm leading-relaxed font-medium">
                  The File Explorer is the left-hand panel that shows every file in your project. Files are grouped by optional folders and ordered by type. All data is stored in <code className="text-orange-400 bg-orange-500/5 px-1 rounded text-xs">localStorage</code> under the key <code className="text-orange-400 bg-orange-500/5 px-1 rounded text-xs">html-editor-files-v1</code>.
                </p>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Creating Files & Folders</h3>
                  {[
                    { icon: <FiFilePlus />, label: 'New File', shortcut: 'Ctrl+N', desc: 'Opens a dialog to enter a file name. The extension you type determines the editor language — .html uses HTML mode, .css uses CSS mode, .js uses JavaScript mode. Supported: .html, .css, .js, .json, .md, .svg, .txt and image uploads.', color: 'orange' },
                    { icon: <FiFolderPlus />, label: 'New Folder', desc: 'Creates a folder (via browser prompt). Folders are purely organizational — they group files visually in the panel. There is no actual file system path; folder membership is stored in each file\'s metadata.', color: 'orange' },
                    { icon: <FiUpload />, label: 'Import Files', desc: 'Click "Import Files…" in the File menu or drag-and-drop files from your OS directly onto the File Explorer. Images (PNG, JPG, GIF, SVG, WebP) are stored as base64 data URLs. HTML/CSS/JS files are stored as text.', color: 'blue' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">File Operations</h3>
                  <p className="text-[11px] text-[#555] leading-relaxed">Right-click any file or folder to open its context menu with the following options:</p>
                  {[
                    { icon: <FiEdit />, label: 'Rename', desc: 'Opens an inline rename dialog. Changing a file name does not automatically update references to it in other files — manually update any &lt;link&gt;, &lt;script&gt;, or @import references.', color: 'cyan' },
                    { icon: <FiCopy />, label: 'Duplicate', desc: 'Creates an identical copy of the file with "-copy" appended to the name. The copy is placed in the same folder as the original.', color: 'cyan' },
                    { icon: <FiTrash2 />, label: 'Delete', desc: 'Permanently removes the file from localStorage. If you delete the currently active file, the editor will switch to the next available file. This action cannot be undone — export a ZIP backup first if unsure.', color: 'red' },
                    { icon: <FiCornerDownRight />, label: 'Move to Folder', desc: 'Reassigns the file\'s folder membership. If no folders exist, create one first via File → New Folder.', color: 'cyan' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Folder Operations</h3>
                  {[
                    { icon: <FiEdit />, label: 'Rename Folder', desc: 'Renames the folder and automatically updates the folder field of every file inside it — links stay intact.', color: 'orange' },
                    { icon: <FiTrash2 />, label: 'Delete Folder', desc: 'Deletes the folder entry but does NOT delete the files inside — they are moved to the root (no folder). This is safe.', color: 'red' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <InfoBox title="Default Project" icon={<FiPackage size={11} />} color="blue">
                  On first load (or when localStorage is empty) the editor creates a starter project with <strong className="text-blue-400">index.html</strong>, <strong className="text-blue-400">styles.css</strong>, and <strong className="text-blue-400">script.js</strong>. These demonstrate HTML structure, CSS layout, and JavaScript interactivity. Feel free to edit or delete them.
                </InfoBox>

                <InfoBox title="Image Files" icon={<FiDroplet size={11} />} color="green">
                  Uploaded images are stored as base64 data URLs inside localStorage. To reference them in HTML, use a relative path matching the file name, e.g. <code className="text-green-400 bg-green-500/5 px-1 rounded">&lt;img src="photo.jpg"&gt;</code>. The preview resolves these automatically via Blob URLs.
                </InfoBox>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Code Editor
                ═══════════════════════════════════════════════════════════ */}
            <section id="code-editor" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiCode />} title="Code Editor (Monaco)" subtitle="The same engine as VS Code — full IntelliSense, AI, multi-cursor, and Emmet." color="blue" />

              <p className="text-[#666] text-sm leading-relaxed font-medium">
                The Code Editor is powered by <strong className="text-white">Monaco Editor</strong> — Microsoft's open-source editor engine that runs Visual Studio Code. It provides desktop-grade code editing with zero compromise in the browser.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: 'Syntax Highlighting', desc: 'Full token-based coloring for HTML tags, attributes, CSS selectors/properties/values, JavaScript keywords, functions, strings, and comments.' },
                  { title: 'IntelliSense Autocomplete', desc: 'Type any HTML tag, CSS property, or JS function and Monaco will suggest completions. Press Enter or Tab to accept.' },
                  { title: 'Emmet Abbreviations', desc: 'Type a shorthand like div.container>ul>li*3 and press Tab to expand it into full HTML markup instantly.' },
                  { title: 'Multi-Cursor Editing', desc: 'Hold Alt and click at different positions to place multiple cursors. All cursors edit simultaneously — perfect for bulk changes.' },
                  { title: 'Code Folding', desc: 'Click the arrow in the gutter (left margin) next to any block-level element, function, or rule to collapse it and reduce visual noise.' },
                  { title: 'Find & Replace', desc: 'Press Ctrl+F to open the find bar. Press Ctrl+H to open find-and-replace. Supports regex patterns.' },
                  { title: 'Go to Line', desc: 'Press Ctrl+G to jump directly to any line number. Useful in large files.' },
                  { title: 'Undo / Redo History', desc: 'Ctrl+Z to undo, Ctrl+Y or Ctrl+Shift+Z to redo. Monaco keeps a deep history of changes within a session.' },
                  { title: 'Live Sync to Preview', desc: 'Every change triggers an immediate preview refresh — no need to save or press a button. The preview re-renders on every keystroke.' },
                  { title: 'File-Aware Language Mode', desc: 'The editor automatically sets the language mode based on the file extension. .html → HTML, .css → CSS, .js → JavaScript.' },
                ].map((f, i) => (
                  <div key={i} className="p-4 bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl hover:border-blue-500/20 transition-all">
                    <h4 className="text-white text-xs font-black uppercase tracking-tight mb-1.5">{f.title}</h4>
                    <p className="text-[11px] text-[#555] leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-white font-black text-sm uppercase tracking-widest">Monaco Keyboard Shortcuts (in editor)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        <th className="text-left text-[#333] font-black uppercase tracking-widest py-2 pr-6">Action</th>
                        <th className="text-left text-[#333] font-black uppercase tracking-widest py-2">Shortcut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0f0f0f]">
                      {[
                        ['Select All', 'Ctrl+A'],
                        ['Copy Line Down', 'Alt+Shift+↓'],
                        ['Move Line Up / Down', 'Alt+↑ / Alt+↓'],
                        ['Delete Line', 'Ctrl+Shift+K'],
                        ['Comment / Uncomment Line', 'Ctrl+/'],
                        ['Indent / Outdent', 'Tab / Shift+Tab'],
                        ['Format Document', 'Shift+Alt+F'],
                        ['Go to Definition', 'F12'],
                        ['Open Command Palette', 'F1'],
                        ['Select Word at Cursor', 'Ctrl+D'],
                        ['Select All Occurrences', 'Ctrl+Shift+L'],
                        ['Accept AI Suggestion', 'Tab (when green dot shows)'],
                      ].map(([action, shortcut], i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-6 text-[#777] font-medium">{action}</td>
                          <td className="py-2.5"><KbdKey>{shortcut}</KbdKey></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Preview Pane
                ═══════════════════════════════════════════════════════════ */}
            <section id="preview-pane" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiMonitor />} title="Live Preview Pane" subtitle="A sandboxed iframe that re-renders your page on every keystroke." color="cyan" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed font-medium">
                  The Preview Pane runs your HTML inside a sandboxed <code className="text-cyan-400 bg-cyan-500/5 px-1 rounded text-xs">&lt;iframe&gt;</code>. It combines all your project files — injecting linked CSS and JS — and displays the result in real time. The preview is fully isolated from the editor's own JavaScript runtime.
                </p>

                <div className="space-y-3">
                  {[
                    { icon: <FiRefreshCw />, label: 'Auto Refresh', shortcut: 'Ctrl+R', desc: 'The preview refreshes automatically on every code change. You can also force a hard refresh with Ctrl+R or Tools → Hard Refresh Preview. Hard refresh re-runs all scripts from scratch.', color: 'cyan' },
                    { icon: <FiPlus />, label: 'Multiple Preview Tabs', desc: 'Click the "+" button in the preview tab bar to open additional tabs. Each tab can show a different page. Click a tab\'s × to close it (the last tab cannot be closed).', color: 'cyan' },
                    { icon: <FiGlobe />, label: 'Console Intercept', desc: 'Any console.log(), console.warn(), console.error(), or console.info() calls made by your page\'s JavaScript are captured and displayed in the editor\'s internal console log (accessible via Tools → Clear Console).', color: 'green' },
                    { icon: <FiShield />, label: 'Sandboxed Execution', desc: 'The iframe runs with allow-scripts and allow-same-origin permissions. Network fetch calls, localStorage access from your page, and JavaScript execution all work normally inside the preview.', color: 'purple' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Visual Designer
                ═══════════════════════════════════════════════════════════ */}
            <section id="visual-designer" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiEye />} title="Visual Designer" subtitle="Click, drag, resize, and rotate any HTML element directly on the canvas." color="green" />

              <div className="space-y-8">
                <p className="text-[#666] text-sm leading-relaxed font-medium">
                  The Visual Designer transforms your live preview into an interactive canvas. Switch to Visual Mode (Ctrl+2) to activate it. The canvas is overlaid with a selection system that lets you manipulate elements visually — all changes are written back to your HTML/CSS code in real time.
                </p>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Selecting Elements</h3>
                  {[
                    { icon: <FiMousePointer />, label: 'Click to Select', desc: 'Click any element on the canvas. A blue outline appears around the selected element. Its CSS properties are immediately loaded into the Properties Panel on the right.', color: 'green' },
                    { icon: <FiLayers />, label: 'Click Through Containers', desc: 'If a container is selected and you click again, the click passes through to the child element inside. This lets you target deeply nested elements.', color: 'green' },
                    { icon: <FiX />, label: 'Deselect', desc: 'Click on empty space (outside any element) to deselect and clear the Properties Panel.', color: 'green' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Moving Elements</h3>
                  {[
                    { icon: <FiMove />, label: 'Drag to Reposition', desc: 'Click and drag any selected element to move it. The element\'s position property is set to absolute and the top/left values are updated in your CSS. If the element\'s parent does not have position: relative, it is added automatically.', color: 'blue' },
                    { icon: <FiArrowRight />, label: 'Fine-Tune via Properties Panel', desc: 'After dragging, use the Position fields in the Properties Panel to type exact pixel values for top, left, right, and bottom.', color: 'blue' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Resizing & Rotating</h3>
                  {[
                    { icon: <FiMaximize2 />, label: 'Corner Handles → Resize', desc: 'Drag any of the 8 handles (4 corners + 4 edges) to resize the element. This sets the width and height CSS properties.', color: 'orange' },
                    { icon: <FiRotateCcw />, label: 'Rotation Handle → Rotate', desc: 'The handle that appears above the top-center of the selection box rotates the element. This applies a CSS transform: rotate(Xdeg) to the element\'s inline style.', color: 'orange' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Context Menu (Right-Click on Canvas)</h3>
                  <p className="text-[11px] text-[#555] leading-relaxed">Right-click any element on the visual canvas to get a context menu with:</p>
                  {[
                    { icon: <FiCopy />, label: 'Duplicate Element', desc: 'Creates an identical HTML clone of the element and inserts it after the original in the DOM.', color: 'cyan' },
                    { icon: <FiTrash2 />, label: 'Delete Element', desc: 'Removes the element from the DOM and writes the updated HTML back to the code editor.', color: 'red' },
                    { icon: <FiCode />, label: 'View in Code Editor', desc: 'Switches to code mode and highlights the HTML line corresponding to the selected element.', color: 'blue' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Properties Panel
                ═══════════════════════════════════════════════════════════ */}
            <section id="properties-panel" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiSliders />} title="Properties Panel" subtitle="Every CSS property for the selected element, grouped and visualized." color="purple" />

              <div className="space-y-8">
                <p className="text-[#666] text-sm leading-relaxed font-medium">
                  The Properties Panel is only available in Visual Mode. When you click an element on the canvas, its CSS is read and populated into the panel's controls. Every change you make in the panel is immediately written to the selected element's inline style AND reflected in the code editor.
                </p>

                {[
                  {
                    title: 'Element Info', color: 'purple', icon: <FiInfo />,
                    fields: [
                      { name: 'Tag Name', desc: 'Shows the HTML tag (div, h1, img, etc.) — read only.' },
                      { name: 'ID', desc: 'The element\'s id attribute. Click to edit inline.' },
                      { name: 'Class Name', desc: 'The element\'s class names. Edit to add/remove classes.' },
                      { name: 'Inner HTML', desc: 'The raw HTML content inside the element. Edit to change text or nested markup.' },
                    ],
                  },
                  {
                    title: 'Layout & Display', color: 'blue', icon: <FiBox />,
                    fields: [
                      { name: 'Display', desc: 'block / inline / inline-block / flex / grid / none. Switching to flex reveals Flex Controls below.' },
                      { name: 'Width & Height', desc: 'Numeric input with unit selector (px, %, em, rem, vw, vh, auto).' },
                      { name: 'Max / Min Width & Height', desc: 'Constraint values for responsive layouts.' },
                      { name: 'Overflow', desc: 'visible / hidden / scroll / auto — controls content clipping.' },
                      { name: 'Position', desc: 'static / relative / absolute / fixed / sticky. Absolute/fixed reveal top/right/bottom/left fields.' },
                      { name: 'Z-Index', desc: 'Stacking order. Higher = in front.' },
                    ],
                  },
                  {
                    title: 'Flexbox Controls (when display: flex)', color: 'cyan', icon: <FiAlignLeft />,
                    fields: [
                      { name: 'Flex Direction', desc: 'row / row-reverse / column / column-reverse.' },
                      { name: 'Justify Content', desc: 'flex-start / flex-end / center / space-between / space-around / space-evenly.' },
                      { name: 'Align Items', desc: 'flex-start / flex-end / center / stretch / baseline.' },
                      { name: 'Gap', desc: 'Space between flex children (in px).' },
                      { name: 'Flex Wrap', desc: 'nowrap / wrap / wrap-reverse.' },
                    ],
                  },
                  {
                    title: 'Spacing — Margin & Padding', color: 'orange', icon: <FiMove />,
                    fields: [
                      { name: 'Margin (all sides)', desc: 'A single value sets all four sides. Individual controls for top/right/bottom/left are shown below.' },
                      { name: 'Padding (all sides)', desc: 'Same as margin but for internal spacing.' },
                      { name: 'Individual Side Inputs', desc: 'Four separate fields for precise control of each side independently.' },
                    ],
                  },
                  {
                    title: 'Typography', color: 'yellow', icon: <FiType />,
                    fields: [
                      { name: 'Font Family', desc: 'Text input — type any system font or Google Font name.' },
                      { name: 'Font Size', desc: 'Value + unit selector (px, em, rem, %).' },
                      { name: 'Font Weight', desc: '100–900 or normal/bold.' },
                      { name: 'Line Height', desc: 'Numeric or unitless (e.g. 1.6).' },
                      { name: 'Letter Spacing', desc: 'In px or em.' },
                      { name: 'Text Align', desc: 'left / center / right / justify — shown as icon buttons.' },
                      { name: 'Text Decoration', desc: 'none / underline / line-through / overline.' },
                      { name: 'Text Transform', desc: 'none / uppercase / lowercase / capitalize.' },
                      { name: 'Color', desc: 'Color picker with hex input and opacity slider.' },
                    ],
                  },
                  {
                    title: 'Backgrounds', color: 'green', icon: <FiDroplet />,
                    fields: [
                      { name: 'Background Color', desc: 'Color picker with full alpha/opacity control.' },
                      { name: 'Background Image', desc: 'URL input — paste any image URL or reference an uploaded file.' },
                      { name: 'Background Size', desc: 'cover / contain / auto or custom (e.g. 100% 100%).' },
                      { name: 'Background Position', desc: 'Dropdown or manual (center / top left / etc.).' },
                      { name: 'Background Repeat', desc: 'no-repeat / repeat / repeat-x / repeat-y.' },
                      { name: 'Gradient Builder', desc: 'Toggle to gradient mode to set direction, start color, and end color for a linear-gradient().' },
                    ],
                  },
                  {
                    title: 'Borders & Radius', color: 'red', icon: <FiSquare />,
                    fields: [
                      { name: 'Border Width', desc: 'Uniform px value.' },
                      { name: 'Border Style', desc: 'none / solid / dashed / dotted / double.' },
                      { name: 'Border Color', desc: 'Color picker.' },
                      { name: 'Border Radius', desc: 'Uniform corner rounding (px or %). Individual corners can be set via the four corner inputs.' },
                    ],
                  },
                  {
                    title: 'Effects', color: 'pink', icon: <FiStar />,
                    fields: [
                      { name: 'Box Shadow', desc: 'H-offset, V-offset, blur, spread, color, inset toggle.' },
                      { name: 'Opacity', desc: '0–1 slider.' },
                      { name: 'Transform', desc: 'Scale (X/Y), Translate (X/Y), Rotate (deg), Skew (X/Y). Composed into a single CSS transform string.' },
                      { name: 'Transition', desc: 'Property, duration, easing, delay for CSS transitions on hover.' },
                      { name: 'Cursor', desc: 'pointer / default / move / not-allowed / etc.' },
                    ],
                  },
                ].map((group, gi) => (
                  <div key={gi} className="space-y-3">
                    <div className={`flex items-center gap-2 text-${group.color}-500 font-black text-xs uppercase tracking-widest`}>
                      {group.icon} {group.title}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 pl-0">
                      {group.fields.map((f, fi) => (
                        <div key={fi} className={`p-3 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] hover:border-${group.color}-500/15 transition-all`}>
                          <span className="text-white text-[11px] font-black block mb-0.5">{f.name}</span>
                          <span className="text-[10px] text-[#444] leading-relaxed">{f.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <InfoBox title="Sync with Code Editor" icon={<FiCode size={11} />} color="blue">
                  Every change made in the Properties Panel is written to the element's <strong className="text-blue-400">inline style</strong> attribute in your HTML file. Switch to Code Mode (Ctrl+1) to see the generated inline styles. If the element already has a stylesheet rule, the inline style takes precedence.
                </InfoBox>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Timeline
                ═══════════════════════════════════════════════════════════ */}
            <section id="timeline" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiClock />} title="CSS Timeline" subtitle="A visual keyframe animation editor — no @keyframes knowledge required." color="red" />

              <div className="space-y-8">
                <p className="text-[#666] text-sm leading-relaxed font-medium">
                  The Timeline Panel provides a visual interface for creating CSS @keyframes animations. Each row is a "track" that targets one CSS selector. All animation data is stored in localStorage and converted to standard CSS when you click "Apply to Page."
                </p>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Toolbar Buttons</h3>
                  {[
                    { icon: <FiPlus />, label: 'Add Track (+)', desc: 'Adds a new animation track. If an element is selected in Visual Mode, the track is pre-filled with that element\'s CSS selector. Otherwise you type the selector manually (e.g. .hero, #banner, h1).', color: 'red' },
                    { icon: <FiPlay />, label: 'Play (▶)', desc: 'Triggers a preview of all animations in the Live Preview. Animations play once so you can judge the timing and feel. The preview auto-resets after playback.', color: 'green' },
                    { icon: <FiRotateCcw />, label: 'Reset Playhead', desc: 'Stops playback and resets the timeline scrubber to 0.00s. Use this to re-watch from the beginning.', color: 'orange' },
                    { icon: <FiCheck />, label: 'Apply to Page (✓)', desc: 'Converts all timeline tracks into CSS @keyframes rules and a corresponding animation property. This CSS is injected into your active HTML file inside a style tag. After applying, the animations become permanent parts of your code.', color: 'blue' },
                    { icon: <FiTrash2 />, label: 'Reset Timeline', desc: 'Clears all tracks and removes the injected animation CSS from the page. Restores the default starter tracks.', color: 'red' },
                    { icon: <FiZoomIn />, label: 'Zoom In / Out', desc: 'Scales the timeline ruler. Zoom in for fine 0.1s-level control; zoom out to see the full animation sequence at a glance.', color: 'cyan' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Interacting with Track Bars</h3>
                  {[
                    { icon: <FiMove />, label: 'Drag Middle → Change Delay', desc: 'Click and drag the middle of a track bar left or right to adjust the animation-delay. Moving the bar to the right increases the delay (animation starts later). The delay value (in seconds) is shown on the track.', color: 'orange' },
                    { icon: <FiMaximize2 />, label: 'Drag Right Edge → Change Duration', desc: 'Drag the right edge of the track bar to stretch or shrink it. The width represents the animation-duration. Wider = longer animation. The duration is shown inside the bar.', color: 'orange' },
                    { icon: <FiCommand />, label: 'Right-Click → Track Menu', desc: 'Right-click the track bar for: Change Preset, Change Easing, Set Iteration Count (1/2/3/infinite), Duplicate Track, and Delete Track.', color: 'cyan' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Track Inspector (Clicking a Track Row)</h3>
                  <p className="text-[11px] text-[#555] leading-relaxed">Click anywhere on the track's label row (not the bar) to expand the inspector:</p>
                  {[
                    { icon: <FiEdit />, label: 'CSS Selector Input', desc: 'The CSS selector this animation targets (e.g. .hero, #title, div.card:first-child). Changing this re-targets the animation.', color: 'red' },
                    { icon: <FiStar />, label: 'Animation Preset Dropdown', desc: 'Choose from: FadeIn, FadeOut, SlideUp, SlideDown, SlideLeft, SlideRight, Zoom, ZoomOut, Bounce, Shake, Spin, Flip, Pulse, Wiggle, HeartBeat. Each preset defines a custom @keyframes.', color: 'red' },
                    { icon: <FiTrendingUp />, label: 'Easing Function', desc: 'linear / ease / ease-in / ease-out / ease-in-out / cubic-bezier(). Controls the acceleration curve of the animation.', color: 'red' },
                    { icon: <FiRotateCcw />, label: 'Iteration Count', desc: '1 / 2 / 3 / infinite. How many times the animation repeats before stopping.', color: 'red' },
                    { icon: <FiDroplet />, label: 'Track Color', desc: 'A color swatch for the track bar — purely cosmetic, helps you distinguish multiple tracks visually.', color: 'red' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Animation Presets — Full List</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { name: 'FadeIn', desc: 'Fades from 0 opacity to 1', css: 'opacity: 0 → opacity: 1' },
                      { name: 'FadeOut', desc: 'Fades from 1 opacity to 0', css: 'opacity: 1 → opacity: 0' },
                      { name: 'SlideUp', desc: 'Slides up from below while fading in', css: 'translateY(40px) → translateY(0)' },
                      { name: 'SlideDown', desc: 'Slides down from above while fading in', css: 'translateY(-40px) → translateY(0)' },
                      { name: 'SlideLeft', desc: 'Slides in from the right', css: 'translateX(60px) → translateX(0)' },
                      { name: 'SlideRight', desc: 'Slides in from the left', css: 'translateX(-60px) → translateX(0)' },
                      { name: 'Zoom', desc: 'Scales from 0 to full size (pop in)', css: 'scale(0) → scale(1)' },
                      { name: 'ZoomOut', desc: 'Scales from full size to 0 (pop out)', css: 'scale(1) → scale(0)' },
                      { name: 'Bounce', desc: 'Bounces in with elastic overshoot', css: 'scale(0) → scale(1.1) → scale(1)' },
                      { name: 'Shake', desc: 'Horizontal shake (error/attention)', css: 'translateX(-8px) ↔ translateX(8px)' },
                      { name: 'Spin', desc: 'Full 360° rotation', css: 'rotate(0deg) → rotate(360deg)' },
                      { name: 'Flip', desc: 'Card-flip effect on Y axis', css: 'rotateY(0deg) → rotateY(360deg)' },
                      { name: 'Pulse', desc: 'Gently scales up and back (heartbeat)', css: 'scale(1) → scale(1.08) → scale(1)' },
                      { name: 'Wiggle', desc: 'Slight rotation back-and-forth', css: 'rotate(-4deg) ↔ rotate(4deg)' },
                      { name: 'HeartBeat', desc: 'Quick double-pulse like a heartbeat', css: 'scale(1) → scale(1.15) → scale(1) → scale(1.15)' },
                    ].map((p, i) => <PresetCard key={i} {...p} />)}
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Menus
                ═══════════════════════════════════════════════════════════ */}
            <section id="menu-file" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiMenu />} title="Menus & Commands" subtitle="Every menu option explained in full detail." color="cyan" />

              {/* File Menu */}
              <div className="space-y-5">
                <h3 className="text-white font-black text-sm uppercase tracking-widest border-l-4 border-cyan-500 pl-3">File Menu</h3>
                {[
                  { icon: <FiFilePlus />, label: 'New File', shortcut: 'Ctrl+N', desc: 'Opens the "Create File" dialog. Type the full file name including extension (.html, .css, .js, .json, .md). The file is created empty and becomes the active file.', color: 'cyan' },
                  { icon: <FiFolderPlus />, label: 'New Folder', desc: 'Opens a browser prompt for the folder name. The folder appears in the File Explorer. Files can be moved into it via right-click → Move to Folder.', color: 'cyan' },
                  { icon: <FiSave />, label: 'Save All', shortcut: 'Ctrl+S', desc: 'Explicitly saves all files to localStorage and shows a toast notification "All files saved ✓". Note: files are also auto-saved on every keystroke, so this is mostly a confirmation action.', color: 'cyan' },
                  { icon: <FiUpload />, label: 'Import Files…', desc: 'Opens the OS file picker. Select one or more files. HTML/CSS/JS/MD/TXT/JSON files are imported as text. Image files (PNG, JPG, GIF, SVG, WEBP) are read as base64 data URLs and stored as image-type assets.', color: 'blue' },
                  { icon: <FiDownload />, label: 'Export as ZIP', shortcut: 'Ctrl+E', desc: 'Uses JSZip to bundle all project files (HTML, CSS, JS, images, etc.) into a .zip archive and triggers a browser download. The file is named "project.zip". No server is involved — this is entirely client-side.', color: 'orange' },
                ].map((item, i) => <FeatureRow key={i} {...item} />)}
              </div>
            </section>

            <section id="menu-export" className="scroll-mt-28 space-y-5">
              <h3 className="text-white font-black text-sm uppercase tracking-widest border-l-4 border-orange-500 pl-3">Export Menu</h3>
              {[
                { icon: <FiDownload />, label: 'Export ZIP (All Files)', desc: 'Packages every file in your project — HTML, CSS, JS, images, and any other file type — into a single project.zip download. This is the recommended way to download your entire project.', color: 'orange' },
                { icon: <FiFileText />, label: 'Export HTML Only', desc: 'Downloads a ZIP containing only the .html files from your project. Useful when you want to share markup without styles or scripts.', color: 'orange' },
                { icon: <FiDroplet />, label: 'Export CSS Only', desc: 'Downloads a ZIP containing only the .css files.', color: 'orange' },
                { icon: <FiCode />, label: 'Export JS Only', desc: 'Downloads a ZIP containing only the .js files.', color: 'orange' },
                { icon: <FiCopy />, label: 'Copy HTML to Clipboard', desc: 'Copies the full content of the active HTML file to your clipboard. A toast confirms "HTML copied". Paste directly into any other editor or CMS.', color: 'cyan' },
              ].map((item, i) => <FeatureRow key={i} {...item} />)}
            </section>

            <section id="menu-tools" className="scroll-mt-28 space-y-5">
              <h3 className="text-white font-black text-sm uppercase tracking-widest border-l-4 border-blue-500 pl-3">Tools Menu</h3>
              {[
                { icon: <FiCheckCircle />, label: 'Validate HTML', desc: 'Uses the browser\'s DOMParser to parse your HTML. If the parser finds a <parsererror> node it reports issues; otherwise shows "HTML looks valid". This catches unclosed tags, bad attribute syntax, and structural errors.', color: 'green' },
                { icon: <FiSearch />, label: 'Check Accessibility', desc: 'Scans your HTML for common a11y issues: images without alt attributes, and buttons without text content or aria-label. Reports counts like "A11y: missing alt(3), unlabeled buttons(1)". Does not perform a full WCAG audit.', color: 'blue' },
                { icon: <FiTrash2 />, label: 'Clear Console', desc: 'Empties the internal console log that captures output from your page\'s JavaScript. Does not affect the browser\'s developer console.', color: 'red' },
                { icon: <FiRefreshCw />, label: 'Hard Refresh Preview', shortcut: 'Ctrl+R', desc: 'Increments the preview\'s refresh key, forcing a full iframe reload. All scripts re-execute from the top. Use this if the preview gets into a bad state.', color: 'cyan' },
                { icon: <FiLayers />, label: 'Format HTML', desc: 'Runs the active HTML file through a basic indentation formatter. Collapses excess whitespace, normalizes newlines, and re-indents nested tags with 2-space indentation. Applied in-place to the code editor.', color: 'purple' },
                { icon: <FiScissors />, label: 'Minify HTML', desc: 'Strips all unnecessary whitespace, newlines, and indentation from the active HTML file. The result is a single-line compact string — ideal for production deployment where file size matters.', color: 'purple' },
              ].map((item, i) => <FeatureRow key={i} {...item} />)}
            </section>

            <section id="menu-window" className="scroll-mt-28 space-y-5">
              <h3 className="text-white font-black text-sm uppercase tracking-widest border-l-4 border-purple-500 pl-3">Window Menu</h3>
              <p className="text-[11px] text-[#555] leading-relaxed">The Window menu is dynamically generated based on the current panel state. It shows the status of each panel (docked, floating, minimized, hidden) and lets you control all of them.</p>
              {[
                { icon: <FiGrid />, label: 'Layout Presets (Ctrl+1/2/3)', desc: 'Switches the entire workspace to a predefined panel configuration. Code (Ctrl+1): files + full-width editor. Visual (Ctrl+2): files + canvas + properties + timeline. Split (Ctrl+3): files + editor + preview.', color: 'purple' },
                { icon: <FiMonitor />, label: 'Panel Toggles (per panel)', desc: 'Each panel has an entry showing its current state (docked / floating / minimized / hidden) with a badge. Clicking it toggles the panel\'s visibility.', color: 'purple' },
                { icon: <FiLayers />, label: 'Open in Docked Slot', desc: 'Opens a hidden or floating panel back into its designated dock slot for the current mode.', color: 'purple' },
                { icon: <FiMaximize2 />, label: 'Open as Floating', desc: 'Opens a panel as a free-floating window at its default floating position and size.', color: 'purple' },
                { icon: <FiRotateCcw />, label: 'Reset Layout to Defaults', desc: 'Clears the saved panel layout from localStorage and restores all panels to their factory default positions and sizes for the current mode.', color: 'orange' },
              ].map((item, i) => <FeatureRow key={i} {...item} />)}
            </section>

            <section id="menu-help" className="scroll-mt-28 space-y-5">
              <h3 className="text-white font-black text-sm uppercase tracking-widest border-l-4 border-green-500 pl-3">Help Menu</h3>
              {[
                { icon: <FiBookOpen />, label: 'User Guide / Documentation', desc: 'Opens this documentation page (/docs).', color: 'green' },
                { icon: <FiShield />, label: 'Privacy Policy', desc: 'Opens the Privacy Policy page (/privacy).', color: 'green' },
                { icon: <FiFileText />, label: 'Terms of Service', desc: 'Opens the Terms of Service page (/terms).', color: 'green' },
                { icon: <FiTerminal />, label: 'Keyboard Shortcuts', desc: 'Shows a quick toast notification listing the most important shortcuts. See the full shortcuts table in the Reference section below.', color: 'cyan' },
                { icon: <FiInfo />, label: 'About HTML Editor v2.0', desc: 'Shows a toast with the app version and brief description.', color: 'gray' },
              ].map((item, i) => <FeatureRow key={i} {...item} />)}
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: AI Copilot
                ═══════════════════════════════════════════════════════════ */}
            <section id="ai-copilot" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiCpu />} title="AI Copilot System" subtitle="Inline AI code suggestions that understand your file context." color="yellow" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed font-medium">
                  The AI Copilot is an inline completion system that analyzes the content of your currently open file and offers contextually relevant code suggestions. It works directly inside the Monaco editor as ghost text (grey inline suggestions).
                </p>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest" id="ai-states">AI Status States</h3>
                  <div className="space-y-2">
                    {[
                      { dot: '#ffffff55', state: '✦ AI  (Idle)', badge: 'IDLE', desc: 'The AI is ready but no suggestion has been triggered. Click the button to request one, or just keep typing — a suggestion will be generated automatically after a short pause.', color: 'gray' },
                      { dot: '#fbbf24', state: '⟳ AI…', badge: 'LOADING', desc: 'The AI is currently processing your file context and generating a suggestion. This typically takes 1–3 seconds.', color: 'yellow' },
                      { dot: '#4ade80', state: '✓ AI  (Ready)', badge: 'READY', desc: 'A suggestion is available. The ghost text is visible in the editor. Press Tab to accept the full suggestion, or keep typing to ignore it.', color: 'green' },
                      { dot: '#f87171', state: '✗ AI  (Error)', badge: 'ERROR', desc: 'The AI request failed. Click the button to retry. This may happen if the service is temporarily unavailable.', color: 'red' },
                    ].map((s, i) => (
                      <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-${s.color}-500/20 transition-all`}>
                        <div className="mt-0.5 flex-shrink-0">
                          <div className="w-3 h-3 rounded-full" style={{ background: s.dot, boxShadow: s.dot !== '#ffffff55' ? `0 0 8px ${s.dot}` : 'none' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-white text-xs font-black font-mono">{s.state}</span>
                            <Tag color={s.color === 'gray' ? 'orange' : s.color}>{s.badge}</Tag>
                          </div>
                          <p className="text-[11px] text-[#555] leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Using the AI</h3>
                  {[
                    { icon: <FiZap />, label: 'Auto-Trigger', desc: 'The AI automatically generates a suggestion after you stop typing for about 1.5 seconds. You do not need to do anything special.', color: 'yellow' },
                    { icon: <FiMousePointer />, label: 'Manual Trigger', desc: 'Click the AI Status Button in the bottom status bar to immediately clear the cache and request a fresh suggestion.', color: 'yellow' },
                    { icon: <FiCheck />, label: 'Accept Suggestion (Tab)', desc: 'When the dot is green (✓ AI), the ghost text is visible in the editor. Press Tab to accept and insert the suggestion at the cursor position.', color: 'green' },
                    { icon: <FiX />, label: 'Dismiss Suggestion (Esc)', desc: 'Press Escape or continue typing to dismiss the current suggestion. The AI will generate a new one the next time it triggers.', color: 'red' },
                    { icon: <FiRotateCcw />, label: 'Refresh / Clear Cache', desc: 'Clicking the AI button also clears the suggestion cache so you always get a fresh result based on your current code, not a cached previous suggestion.', color: 'orange' },
                  ].map((item, i) => <FeatureRow key={i} {...item} />)}
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Window / Docking System
                ═══════════════════════════════════════════════════════════ */}
            <section id="docking" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiLayers />} title="Dock & Float System" subtitle="Every panel can be freely floated or snapped to its dock slot." color="purple" />

              <div className="space-y-8">
                <p className="text-[#666] text-sm leading-relaxed font-medium">
                  HTML Editor uses a hybrid window management system. Panels can operate in two modes: <strong className="text-white">Docked</strong> (snapped into the workspace grid) or <strong className="text-white">Floating</strong> (a free-floating, draggable, resizable window on top of the workspace).
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 text-purple-400">Docked Panels</h3>
                    {[
                      { icon: <FiLock />, label: 'What is "Docked"?', desc: 'A docked panel occupies a predefined slot in the workspace layout. It resizes relative to other docked panels and stays in place when you scroll.', color: 'purple' },
                      { icon: <FiArrowRight />, label: 'How to Float a Docked Panel', desc: 'Right-click the panel\'s title bar and select "Float Window". The panel detaches from its slot and becomes a free-floating window.', color: 'purple' },
                    ].map((item, i) => <FeatureRow key={i} {...item} />)}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 text-orange-400">Floating Windows</h3>
                    {[
                      { icon: <FiUnlock />, label: 'What is "Floating"?', desc: 'A floating panel is a movable window that sits on top of the workspace. Drag its title bar to reposition it anywhere. Resize it by dragging any edge or corner.', color: 'orange' },
                      { icon: <FiTarget />, label: 'How to Dock a Floating Window', desc: 'Drag the floating window\'s title bar near a snap zone. When the zone highlights blue with "Drop to dock here", release the mouse. The panel snaps into that slot.', color: 'orange' },
                    ].map((item, i) => <FeatureRow key={i} {...item} />)}
                  </div>
                </div>

                <InfoBox title="Z-Index & Focus" icon={<FiLayers size={11} />} color="purple">
                  Clicking any floating window brings it to the front (highest z-index). The focus order is tracked with an internal counter that increments on every window activation — so the most recently clicked window is always on top.
                </InfoBox>
              </div>
            </section>

            <section id="resizing" className="scroll-mt-28 space-y-6">
              <h3 className="text-white font-black text-sm uppercase tracking-widest border-l-4 border-purple-500 pl-3">Resizing Panels</h3>
              <p className="text-[#666] text-sm leading-relaxed">
                Docked panels are separated by resize dividers. These are invisible 4px-wide hit areas between panels. Hover over them to see a blue highlight and a resize cursor. Drag to adjust the split.
              </p>
              {[
                { icon: <FiMove />, label: 'Left Divider (File Explorer ↔ Editor)', desc: 'Drag the vertical divider between the File Explorer and the Code Editor to make the file panel wider or narrower. Minimum 120px, maximum 400px.', color: 'purple' },
                { icon: <FiMove />, label: 'Right Divider (Editor ↔ Preview)', desc: 'In Split Mode, drag the vertical divider between the Code Editor and the Preview to redistribute horizontal space between them.', color: 'purple' },
                { icon: <FiMove />, label: 'Bottom Divider (Canvas ↔ Timeline)', desc: 'In Visual Mode, drag the horizontal divider between the canvas and the Timeline Panel to give the timeline more or less height.', color: 'purple' },
                { icon: <FiMove />, label: 'Right Divider (Canvas ↔ Properties)', desc: 'In Visual Mode, drag the vertical divider between the canvas and the Properties Panel.', color: 'purple' },
              ].map((item, i) => <FeatureRow key={i} {...item} />)}
            </section>

            <section id="snap-zones" className="scroll-mt-28 space-y-6">
              <h3 className="text-white font-black text-sm uppercase tracking-widest border-l-4 border-purple-500 pl-3">Snap Zones</h3>
              <p className="text-[#666] text-sm leading-relaxed">
                When you drag a floating window, transparent dock slot outlines (snap zones) appear over the workspace. These are the valid dock slots for the current mode. Hovering over a zone highlights it blue and shows "Drop to dock here." Release the window over a zone to snap it into that slot.
              </p>
              <InfoBox title="Available Snap Zones by Mode" icon={<FiTarget size={11} />} color="purple">
                <strong className="text-purple-400">Code Mode:</strong> File Explorer slot, Code Editor slot.<br />
                <strong className="text-purple-400">Split Mode:</strong> File Explorer slot, Code Editor slot, Preview slot.<br />
                <strong className="text-purple-400">Visual Mode:</strong> File Explorer slot, Canvas slot, Properties slot, Timeline slot.
              </InfoBox>
            </section>

            <InArticleAd />

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Storage
                ═══════════════════════════════════════════════════════════ */}
            <section id="persistence" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiDatabase />} title="Auto-Save & Storage" subtitle="All project data persists in localStorage — no server required." color="green" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed">
                  HTML Editor stores all data in <strong className="text-white">localStorage</strong> — your browser's built-in key-value storage. Data is specific to the domain and browser tab. It persists indefinitely until you clear browser storage or explicitly delete files.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        <th className="text-left text-[#333] font-black py-2 pr-6 uppercase tracking-widest text-[9px]">Storage Key</th>
                        <th className="text-left text-[#333] font-black py-2 uppercase tracking-widest text-[9px]">What It Stores</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0c0c0c]">
                      {[
                        ['html-editor-files-v1', 'All project files (name, type, content, folder assignment)'],
                        ['html-editor-folders-v1', 'Folder names list'],
                        ['html-editor-active-file-v1', 'The last active (open) file ID'],
                        ['html-editor-timeline-state-v1', 'All timeline tracks, playhead position, and animation state'],
                        ['html-editor-win-layout-v6', 'Window positions, sizes, docked/floating/visible state'],
                        ['html-editor-dock-sizes-v2', 'Divider positions (panel widths and heights)'],
                      ].map(([key, desc], i) => (
                        <tr key={i} className="hover:bg-white/[0.01]">
                          <td className="py-2.5 pr-6 font-mono text-green-400/70 text-[10px]">{key}</td>
                          <td className="py-2.5 text-[#555]">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <InfoBox title="Storage Quota" icon={<FiAlertCircle size={11} />} color="orange">
                  Browsers typically allow 5–10 MB of localStorage per origin. Large image files stored as base64 can fill this quickly. If storage fills up, file saves are silently skipped (no error). Export your project as a ZIP regularly as a backup.
                </InfoBox>

                <InfoBox title="Clearing Storage" icon={<FiTrash2 size={11} />} color="red">
                  To fully reset the editor (delete all files and settings), open your browser's DevTools (F12) → Application → Local Storage → right-click the origin → Clear. Reload the page and the starter project is recreated.
                </InfoBox>
              </div>
            </section>

            <section id="import-export" className="scroll-mt-28 space-y-6">
              <h3 className="text-white font-black text-sm uppercase tracking-widest border-l-4 border-green-500 pl-3">Import & Export</h3>
              {[
                { icon: <FiUpload />, label: 'Importing Files', desc: 'Go to File → Import Files… to open the OS file picker. You can select multiple files at once. Alternatively, drag files from your OS directly onto the File Explorer panel. Text files are imported as-is; images are base64-encoded.', color: 'green' },
                { icon: <FiDownload />, label: 'Exporting as ZIP', shortcut: 'Ctrl+E', desc: 'Packages all files using JSZip in the browser, no server needed. The ZIP preserves folder structure (subfolders map to their folder names). The download is triggered via FileSaver.js. Image files are stored as their original binary in the ZIP.', color: 'orange' },
                { icon: <FiCopy />, label: 'Copying to Clipboard', desc: 'Export → Copy HTML to Clipboard puts the full HTML file content on your clipboard. Ready to paste into any external editor, GitHub, or CMS.', color: 'cyan' },
              ].map((item, i) => <FeatureRow key={i} {...item} />)}
            </section>

            <InArticleAd />

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: No-Code Builder
                ═══════════════════════════════════════════════════════════ */}
            <section id="component-library" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiBox />} title="Component Library" subtitle="Drag-and-drop pre-built components into your visual editor." color="purple" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed">
                  The Component Library provides 20+ pre-built HTML components organized by category. Simply drag a component from the sidebar and drop it onto the visual editor canvas to insert it.
                </p>

                <div className="p-6 bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl">
                  <p className="text-[9px] font-black text-[#333] uppercase tracking-[0.3em] mb-4">No-Code Builder Features</p>
                  <pre className="text-[10px] text-[#666] leading-relaxed overflow-x-auto">
{`mindmap
  root((No-Code Builder))
    Component Library
      Buttons
      Forms
      Cards
      Navigation
      Layout
      Typography
      Media
      Social
    Layout Builder
      Grid Layout
      Flexbox Layout
      CSS Preview
    Page Manager
      Create Pages
      Duplicate Pages
      Delete Pages
      Set Default
    Template Library
      Landing Page
      Portfolio
      Blog
      Contact Page`}
                  </pre>
                </div>

                <div className="p-6 bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl">
                  <p className="text-[9px] font-black text-[#333] uppercase tracking-[0.3em] mb-4">Component Categories Distribution</p>
                  <pre className="text-[10px] text-[#666] leading-relaxed overflow-x-auto">
{`pie title Components by Category
  "Buttons" : 12
  "Forms" : 15
  "Cards" : 10
  "Navigation" : 8
  "Layout" : 20
  "Typography" : 15
  "Media" : 12
  "Social" : 8`}
                  </pre>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: <FiBox />, label: 'Buttons', desc: 'Primary, secondary, outline, ghost, and icon buttons with various styles.', color: 'purple' },
                    { icon: <FiBox />, label: 'Forms', desc: 'Input fields, textareas, checkboxes, radio buttons, selects, and form groups.', color: 'purple' },
                    { icon: <FiBox />, label: 'Cards', desc: 'Content cards with images, headers, footers, and action buttons.', color: 'purple' },
                    { icon: <FiBox />, label: 'Navigation', desc: 'Navbars, menus, breadcrumbs, and pagination components.', color: 'purple' },
                    { icon: <FiBox />, label: 'Layout', desc: 'Containers, sections, grids, and layout utility components.', color: 'purple' },
                    { icon: <FiBox />, label: 'Typography', desc: 'Headings, paragraphs, lists, quotes, and text utilities.', color: 'purple' },
                    { icon: <FiBox />, label: 'Media', desc: 'Images, videos, galleries, and media containers.', color: 'purple' },
                    { icon: <FiBox />, label: 'Social', desc: 'Social media buttons, share icons, and follow components.', color: 'purple' },
                  ].map((cat, i) => (
                    <div key={i} className={`p-4 rounded-xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-${cat.color}-500/20 transition-all`}>
                      <div className={`text-${cat.color}-500 mb-2`}>{cat.icon}</div>
                      <h4 className="text-white font-black text-xs tracking-tight mb-1">{cat.label}</h4>
                      <p className="text-[10px] text-[#444] leading-relaxed">{cat.desc}</p>
                    </div>
                  ))}
                </div>

                <InfoBox title="Using Components" icon={<FiMousePointer size={11} />} color="purple">
                  1. Open the Components panel from the Windows menu or toolbar.<br />
                  2. Browse categories or use the search to find a component.<br />
                  3. Drag the component from the sidebar.<br />
                  4. Drop it onto the visual editor canvas.<br />
                  5. The component is inserted with its HTML and CSS automatically applied.
                </InfoBox>
              </div>
            </section>

            <section id="layout-builder" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiGrid />} title="Layout Builder" subtitle="Visual grid and flexbox layout controls." color="purple" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed">
                  The Layout Builder provides visual controls for creating CSS Grid and Flexbox layouts. Select any element in the visual editor, then use the Layout Builder to apply modern layout systems without writing CSS.
                </p>

                <div className="p-6 bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl">
                  <p className="text-[9px] font-black text-[#333] uppercase tracking-[0.3em] mb-4">Component Drag-Drop Workflow</p>
                  <pre className="text-[10px] text-[#666] leading-relaxed overflow-x-auto">
{`flowchart LR
  A[Open Components Panel] --> B[Browse Categories]
  B --> C[Select Component]
  C --> D[Drag Component]
  D --> E[Drop on Canvas]
  E --> F[HTML Inserted]
  F --> G[CSS Applied]
  G --> H[Element Selected]
  H --> I[Edit in Properties Panel]`}
                  </pre>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a]">
                    <h4 className="text-white font-black text-sm tracking-tight mb-4 flex items-center gap-2">
                      <span className="text-purple-500">Grid Layout</span>
                    </h4>
                    <ul className="space-y-2 text-[11px] text-[#555]">
                      <li>• Columns: 2, 3, 4, custom, auto-fit</li>
                      <li>• Rows: auto, 2, 3 rows</li>
                      <li>• Gap spacing control</li>
                      <li>• Live CSS preview</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a]">
                    <h4 className="text-white font-black text-sm tracking-tight mb-4 flex items-center gap-2">
                      <span className="text-purple-500">Flexbox Layout</span>
                    </h4>
                    <ul className="space-y-2 text-[11px] text-[#555]">
                      <li>• Direction: row, column, reverse</li>
                      <li>• Wrap: nowrap, wrap, wrap-reverse</li>
                      <li>• Justify Content & Align Items</li>
                      <li>• Gap spacing control</li>
                    </ul>
                  </div>
                </div>

                <InfoBox title="Applying Layouts" icon={<FiLayers size={11} />} color="purple">
                  1. Select an element in the visual editor (e.g., a container div).<br />
                  2. Click the "Layout" button in the toolbar.<br />
                  3. Choose Grid or Flexbox mode.<br />
                  4. Adjust the controls to configure your layout.<br />
                  5. Click "Apply Layout" to apply the CSS to the selected element.
                </InfoBox>
              </div>
            </section>

            <section id="page-manager" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiFileText />} title="Page Manager" subtitle="Multi-page project management." color="purple" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed">
                  The Page Manager allows you to create and manage multiple pages within a single project. Each page has its own HTML content and can be set as the default landing page.
                </p>

                <div className="space-y-4">
                  {[
                    { icon: <FiPlusSquare />, label: 'Create New Page', desc: 'Enter a page name and a new page is created with default HTML structure.', color: 'purple' },
                    { icon: <FiCopy />, label: 'Duplicate Page', desc: 'Copy an existing page to create a new one with the same content.', color: 'purple' },
                    { icon: <FiTrash2 />, label: 'Delete Page', desc: 'Remove a page from your project (cannot delete the default page).', color: 'purple' },
                    { icon: <FiStar />, label: 'Set Default', desc: 'Mark a page as the default landing page for your project.', color: 'purple' },
                  ].map((action, i) => <FeatureRow key={i} {...action} />)}
                </div>
              </div>
            </section>

            <section id="template-library" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiStar />} title="Template Library" subtitle="Start from pre-built page templates." color="purple" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed">
                  The Template Library provides ready-to-use page templates with complete HTML and embedded CSS. Use them as starting points for your projects.
                </p>

                <div className="p-6 bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl">
                  <p className="text-[9px] font-black text-[#333] uppercase tracking-[0.3em] mb-4">Templates by Category</p>
                  <pre className="text-[10px] text-[#666] leading-relaxed overflow-x-auto">
{`xychart-beta
    title "Templates per category"
    x-axis ["Landing", "Portfolio", "Blog", "Contact", "E-commerce", "Dashboard"]
    y-axis "Template count" 0 --> 5
    bar [3, 2, 2, 1, 2, 1]`}
                  </pre>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: <FiGlobe />, label: 'Landing Page', desc: 'Modern landing page with hero section, features, and CTA.', color: 'purple' },
                    { icon: <FiFileText />, label: 'Portfolio', desc: 'Clean portfolio template with project gallery.', color: 'purple' },
                    { icon: <FiBookOpen />, label: 'Blog', desc: 'Simple blog layout with posts list.', color: 'purple' },
                    { icon: <FiSend />, label: 'Contact Page', desc: 'Contact form with information section.', color: 'purple' },
                  ].map((tmpl, i) => (
                    <div key={i} className={`p-4 rounded-xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-${tmpl.color}-500/20 transition-all`}>
                      <div className={`text-${tmpl.color}-500 mb-2`}>{tmpl.icon}</div>
                      <h4 className="text-white font-black text-xs tracking-tight mb-1">{tmpl.label}</h4>
                      <p className="text-[10px] text-[#444] leading-relaxed">{tmpl.desc}</p>
                    </div>
                  ))}
                </div>

                <InfoBox title="Using Templates" icon={<FiDownload size={11} />} color="purple">
                  1. Open the Template Library from the menu.<br />
                  2. Browse templates by category or search.<br />
                  3. Click on a template to preview its details.<br />
                  4. Click "Use Template" to load it into your project.<br />
                  5. Customize the template as needed.
                </InfoBox>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Keyboard Shortcuts
                ═══════════════════════════════════════════════════════════ */}
            <section id="shortcuts" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiTerminal />} title="All Keyboard Shortcuts" subtitle="Every global shortcut in HTML Editor Pro." color="orange" />

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      <th className="text-left text-[#333] font-black uppercase tracking-widest py-3 pr-8 text-[9px]">Action</th>
                      <th className="text-left text-[#333] font-black uppercase tracking-widest py-3 text-[9px]">Shortcut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0c0c0c]">
                    {[
                      ['Switch to Code Layout', 'Ctrl+1'],
                      ['Switch to Visual Layout', 'Ctrl+2'],
                      ['Switch to Split Layout', 'Ctrl+3'],
                      ['Save All Files', 'Ctrl+S'],
                      ['Export as ZIP', 'Ctrl+E'],
                      ['Hard Refresh Preview', 'Ctrl+R'],
                      ['New File', 'Ctrl+N'],
                      ['Find in Editor', 'Ctrl+F'],
                      ['Find & Replace in Editor', 'Ctrl+H'],
                      ['Go to Line', 'Ctrl+G'],
                      ['Undo (in editor)', 'Ctrl+Z'],
                      ['Redo (in editor)', 'Ctrl+Y'],
                      ['Comment / Uncomment Line', 'Ctrl+/'],
                      ['Accept AI Suggestion', 'Tab'],
                      ['Format Document (Monaco)', 'Shift+Alt+F'],
                      ['Open Monaco Command Palette', 'F1'],
                    ].map(([action, shortcut], i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-8 text-[#777] font-medium">{action}</td>
                        <td className="py-2.5"><KbdKey>{shortcut}</KbdKey></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: Mobile Interface
                ═══════════════════════════════════════════════════════════ */}
            <section id="mobile" className="scroll-mt-28 space-y-10">
              <SectionDivider icon={<FiSmartphone />} title="Mobile Interface" subtitle="A purpose-built layout for touchscreens and small displays." color="pink" />

              <div className="space-y-6">
                <p className="text-[#666] text-sm leading-relaxed">
                  When the screen width is less than 768px, HTML Editor automatically switches to the <strong className="text-white">Mobile Interface</strong> — a tabbed single-panel layout optimized for touch and smaller screens.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: <FiFolder />, label: 'Files Tab', desc: 'Full File Explorer — create, rename, delete, and switch between files.', color: 'orange' },
                    { icon: <FiCode />, label: 'Code Tab', desc: 'Full Monaco Editor — write HTML, CSS, and JavaScript with syntax highlighting.', color: 'blue' },
                    { icon: <FiEye />, label: 'Preview Tab', desc: 'Live Preview (in Split/Code mode) or the Visual Designer canvas (in Visual mode).', color: 'green' },
                    { icon: <FiSliders />, label: 'Props Tab', desc: 'Properties Panel — CSS controls for the selected element (Visual mode only).', color: 'purple' },
                  ].map((tab, i) => (
                    <div key={i} className={`p-4 rounded-xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-${tab.color}-500/20 transition-all`}>
                      <div className={`text-${tab.color}-500 mb-2`}>{tab.icon}</div>
                      <h4 className="text-white font-black text-xs tracking-tight mb-1">{tab.label}</h4>
                      <p className="text-[10px] text-[#444] leading-relaxed">{tab.desc}</p>
                    </div>
                  ))}
                </div>

                <InfoBox title="Mobile Export" icon={<FiDownload size={11} />} color="orange">
                  The "ZIP" button in the top-right of the mobile header works identically to the desktop Export menu — it downloads a project.zip with all files.
                </InfoBox>

                <InfoBox title="Mode Toggle on Mobile" icon={<FiGrid size={11} />} color="blue">
                  A compact mode switcher in the mobile header lets you toggle between Split View (Preview tab shows the live preview) and Visual mode (Preview tab shows the interactive canvas). Timeline, Code Mode preset, and other desktop modes are not available on mobile.
                </InfoBox>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION: FAQ
                ═══════════════════════════════════════════════════════════ */}
            <section id="faq" className="scroll-mt-28 space-y-8">
              <SectionDivider icon={<FiSearch />} title="Frequently Asked Questions" subtitle="Common questions answered clearly." color="orange" />

              <div className="space-y-4">
                {[
                  {
                    q: 'Is HTML Editor completely free?',
                    a: 'Yes. HTML Editor Pro is 100% free with no subscription, no login, and no account required. It runs entirely in your browser.',
                  },
                  {
                    q: 'Does my data leave my browser?',
                    a: 'No. All files are stored in your browser\'s localStorage. Nothing is uploaded to any server. The only external requests are the Monaco editor assets (loaded from a CDN once) and the AI suggestion service (if AI Copilot is enabled).',
                  },
                  {
                    q: 'What happens if I close the browser tab?',
                    a: 'All your files and settings are saved automatically to localStorage. When you reopen the editor, everything is exactly as you left it — the same files, the same active file, the same panel layout, and the same timeline tracks.',
                  },
                  {
                    q: 'Can I use external CSS frameworks like Bootstrap or Tailwind?',
                    a: 'Yes. Add a link tag to your HTML pointing to any CDN URL (e.g. https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css). The Live Preview loads it from the internet and renders it correctly.',
                  },
                  {
                    q: 'Can I use JavaScript libraries like jQuery, React, or Vue?',
                    a: 'Yes. Add a script tag pointing to a CDN in your HTML. Plain JS libraries work without any build tools. For React/Vue with JSX or SFC syntax, you would need a CDN build like the standalone React/ReactDOM UMD build or Vue 3 CDN version.',
                  },
                  {
                    q: 'The preview is not updating — what do I do?',
                    a: 'Press Ctrl+R for a Hard Refresh. If the preview still does not update, try Tools → Hard Refresh Preview. If neither works, check that you are editing the correct file (the active file shown in the status bar) and that there are no JavaScript errors in the file.',
                  },
                  {
                    q: 'How do I link my CSS file to my HTML?',
                    a: 'Add a link tag (rel="stylesheet" href="styles.css") inside the head of your HTML. The preview automatically resolves linked files within your project. The file name must match exactly (case-sensitive).',
                  },
                  {
                    q: 'How do I link my JS file to my HTML?',
                    a: 'Add a script tag (src="script.js") at the bottom of your body element. The preview resolves it from your project files automatically.',
                  },
                  {
                    q: 'Can I open multiple projects at the same time?',
                    a: 'Not natively — the editor stores one project per browser origin. To work on a second project simultaneously, open the editor in a different browser (e.g. Chrome and Firefox). To switch projects, export the current one as a ZIP, then import the new project\'s files.',
                  },
                  {
                    q: 'Where is the CSS Timeline output stored?',
                    a: 'When you click "Apply to Page," the generated CSS is injected into a style tag (id="timeline-animations") inside your active HTML file. You can see and edit it directly in the Code Editor.',
                  },
                  {
                    q: 'Can I host my exported project for free?',
                    a: 'Yes. Export your ZIP, unzip it, and upload the files to Netlify Drop (drop.netlify.com), GitHub Pages, Vercel, Cloudflare Pages, or any static hosting service. No server-side code is required.',
                  },
                  {
                    q: 'Does the Visual Designer modify my code?',
                    a: 'Yes — every visual change (move, resize, rotate, style via Properties Panel) is written back to your HTML as inline styles on the affected element. This keeps the visual canvas and the code perfectly in sync at all times.',
                  },
                  {
                    q: 'Which browsers are supported?',
                    a: 'HTML Editor Pro works on all modern evergreen browsers: Chrome 90+, Edge 90+, Firefox 90+, Safari 15+, Opera 76+, and Brave. Mobile Safari (iOS 15+) and Chrome for Android are supported with a touch-optimized UI. Internet Explorer 11 is not supported because the Monaco editor and modern ES modules are required.',
                  },
                  {
                    q: 'How much storage does the editor use?',
                    a: 'Files, panel layout, animation tracks, and theme preference are stored in localStorage (typical browser limit ~5–10 MB per origin). Large binary assets (e.g. images, fonts) should be referenced from a CDN to avoid hitting the limit. Use Tools → Clear All to reset storage if you ever run out of space.',
                  },
                  {
                    q: 'Does the editor work offline?',
                    a: 'Yes. After the first load, the service worker caches the editor shell so it can launch without an internet connection. CDN-loaded resources inside your preview (Bootstrap, fonts, etc.) still require connectivity at runtime.',
                  },
                  {
                    q: 'How do I make my exported page rank on Google?',
                    a: 'Open the /seo tutorial page bundled with the editor. It walks through every essential meta tag, Open Graph, Twitter Card, structured data (JSON-LD), favicons, sitemap.xml, robots.txt, image alt text, semantic HTML, and Core Web Vitals — the same checklist this site uses.',
                  },
                  {
                    q: 'Is there a dark mode?',
                    a: 'The entire UI is a refined VS Code-style dark theme by default. Live Preview always renders your page exactly as a browser would, regardless of the editor theme.',
                  },
                  {
                    q: 'Can I collaborate with others in real time?',
                    a: 'Real-time collaboration is not available — the editor is fully client-side and stores files locally. To share work, export a ZIP and send it, or push it to a Git repository.',
                  },
                ].map((item, i) => (
                  <details key={i} className="group p-5 rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a] hover:border-orange-500/20 transition-all open:border-orange-500/30 open:bg-[#111]">
                    <summary className="text-white text-xs font-black uppercase tracking-tight cursor-pointer list-none flex items-center justify-between gap-4">
                      {item.q}
                      <FiChevronRight size={13} className="text-[#333] group-open:rotate-90 transition-transform flex-shrink-0" />
                    </summary>
                    <p className="text-[11px] text-[#555] leading-relaxed mt-3 pl-0">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#111] pt-12 pb-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#e34c26] flex items-center justify-center text-white font-black mx-auto shadow-lg shadow-orange-600/20">H</div>
              <p className="text-[#333] text-xs font-medium">HTML Editor Pro v2.0 · Free, browser-based, no login required</p>
              <p className="text-[#222] text-[10px]">© 2024 Jignesh D Maru · Built with ♥ for the web developer community</p>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link href="/" className="text-[11px] text-[#333] hover:text-orange-500 transition-colors no-underline font-bold">Open Editor</Link>
                <Link href="/privacy" className="text-[11px] text-[#333] hover:text-orange-500 transition-colors no-underline font-bold">Privacy</Link>
                <Link href="/terms" className="text-[11px] text-[#333] hover:text-orange-500 transition-colors no-underline font-bold">Terms</Link>
              </div>
            </footer>

          </main>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
