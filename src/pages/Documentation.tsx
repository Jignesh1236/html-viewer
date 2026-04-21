import React, { useState } from 'react';
import { Link } from 'wouter';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FiCode, 
  FiEye, 
  FiLayout, 
  FiDownload, 
  FiRefreshCw, 
  FiFolder, 
  FiSliders, 
  FiClock, 
  FiMonitor,
  FiBookOpen,
  FiInfo,
  FiTerminal,
  FiZap,
  FiPlus,
  FiSettings,
  FiShare2,
  FiChevronRight,
  FiPlay,
  FiCpu,
  FiFileText,
  FiSearch,
  FiUpload,
  FiPlusSquare,
  FiFolderPlus,
  FiCopy,
  FiTrash2,
  FiEdit,
  FiCheckCircle,
  FiAlertCircle,
  FiBox,
  FiDroplet
} from 'react-icons/fi';

/* ─── Components ────────────────────────────────────────── */

const AdPlaceholder: React.FC<{ className?: string; slot?: string }> = ({ className, slot = "XXXXXXXXXX" }) => (
  <div className={`bg-[#111] border border-[#222] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 min-h-[140px] shadow-inner ${className}`}>
    <span className="text-[10px] text-[#333] font-black uppercase tracking-[0.2em] mb-3">Sponsor / Advertisement</span>
    <ins className="adsbygoogle"
         style={{ display: 'block', width: '100%' }}
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
         data-ad-slot={slot}
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>
         (window.adsbygoogle = window.adsbygoogle || []).push({});
    </script>
    <div className="text-[10px] text-[#222] mt-3 italic font-medium tracking-tight">Monetization Slot: {slot}</div>
  </div>
);

const SectionHeader: React.FC<{ title: string; subtitle: string; icon: React.ReactNode; color?: string }> = ({ title, subtitle, icon, color = "orange" }) => (
  <div className="flex items-center gap-6 mb-10">
    <div className={`w-16 h-16 rounded-3xl bg-${color}-500/10 flex items-center justify-center text-${color}-500 border border-${color}-500/20 shadow-lg shadow-${color}-500/5`}>
      {React.cloneElement(icon as React.ReactElement, { size: 32 })}
    </div>
    <div>
      <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{title}</h2>
      <p className="text-[#888] text-lg font-medium">{subtitle}</p>
    </div>
  </div>
);

const FeatureCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; id: string }> = ({ title, desc, icon, id }) => (
  <a href={`#${id}`} className="p-6 rounded-3xl bg-[#111] border border-[#222] hover:border-orange-500/40 hover:bg-[#161616] transition-all group no-underline block shadow-xl hover:-translate-y-1">
    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6 group-hover:scale-110 transition-transform group-hover:bg-orange-500 group-hover:text-white">
      {icon}
    </div>
    <h4 className="text-xl text-white font-black mb-3 group-hover:text-orange-500 transition-colors tracking-tight">{title}</h4>
    <p className="text-sm text-[#777] leading-relaxed font-medium">{desc}</p>
    <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">
      View Deep-Dive <FiChevronRight />
    </div>
  </a>
);

const Documentation: React.FC = () => {
  React.useEffect(() => {
    document.title = "Official Documentation | HTML Editor Pro Edition";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Comprehensive guide to HTML Editor Pro. Learn about Visual Designer, Monaco Editor, CSS Timeline, and full project management.');
    }
    // Fix scroll to hash
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-[#ccc] font-sans selection:bg-orange-500/30">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-[100] w-full border-b border-[#1a1a1a] bg-[#080808]/90 backdrop-blur-2xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 no-underline group">
            <div className="w-11 h-11 rounded-2xl bg-[#e34c26] flex items-center justify-center text-white font-black shadow-[0_8px_25px_rgba(227,76,38,0.4)] group-hover:scale-105 transition-transform">H</div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-white tracking-tighter leading-none">HTML EDITOR <span className="text-orange-500">PRO</span></span>
              <span className="text-[10px] font-black text-[#555] tracking-[0.3em] mt-1.5 uppercase">Official Documentation</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="text-xs font-black hover:bg-white/5 uppercase tracking-[0.15em] px-6 h-10 border border-white/5 rounded-full">Editor</Button>
            </Link>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white border-none text-xs font-black px-8 h-10 rounded-full shadow-2xl shadow-orange-500/30 tracking-widest uppercase">
              Download Desktop
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-16">
          
          {/* ── Persistent Navigation Sidebar ── */}
          <aside className="hidden lg:block space-y-12 sticky top-32 h-[calc(100vh-160px)] overflow-y-auto pr-6 scrollbar-hide">
            <AdPlaceholder slot="DOCS_SIDEBAR_TOP" />

            <div className="space-y-10">
              <nav className="space-y-2">
                <h3 className="text-[11px] font-black text-[#333] uppercase tracking-[0.3em] px-3 mb-6">Introduction</h3>
                {[
                  { id: 'introduction', label: 'Welcome Pro', icon: <FiInfo /> },
                  { id: 'quick-start', label: '3-Min Startup', icon: <FiZap /> },
                  { id: 'interface', label: 'Interface Guide', icon: <FiLayout /> },
                ].map(item => (
                  <a key={item.id} href={`#${item.id}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-[#666] hover:text-white font-bold transition-all group">
                    <span className="text-orange-500 group-hover:scale-110 transition-transform">{item.icon}</span> {item.label}
                  </a>
                ))}
              </nav>

              <nav className="space-y-2">
                <h3 className="text-[11px] font-black text-[#333] uppercase tracking-[0.3em] px-3 mb-6">Panels & Workflows</h3>
                {[
                  { id: 'file-explorer', label: 'File Explorer', icon: <FiFolder />, color: 'orange' },
                  { id: 'code-editor', label: 'Monaco Engine', icon: <FiCode />, color: 'blue' },
                  { id: 'visual-builder', label: 'Visual Designer', icon: <FiEye />, color: 'green' },
                  { id: 'properties-panel', label: 'Properties Panel', icon: <FiSliders />, color: 'purple' },
                  { id: 'timeline-animation', label: 'CSS Timeline', icon: <FiClock />, color: 'red' },
                ].map(item => (
                  <a key={item.id} href={`#${item.id}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-[#666] hover:text-white font-bold transition-all group">
                    <span className={`text-${item.color}-500 group-hover:scale-110 transition-transform`}>{item.icon}</span> {item.label}
                  </a>
                ))}
              </nav>

              <nav className="space-y-2">
                <h3 className="text-[11px] font-black text-[#333] uppercase tracking-[0.3em] px-3 mb-6">Control System</h3>
                {[
                  { id: 'menu-system', label: 'Menu Dictionary', icon: <FiSettings /> },
                  { id: 'shortcuts', label: 'Hotkeys List', icon: <FiTerminal /> },
                ].map(item => (
                  <a key={item.id} href={`#${item.id}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-[#666] hover:text-white font-bold transition-all group">
                    <span className="text-cyan-500 group-hover:scale-110 transition-transform">{item.icon}</span> {item.label}
                  </a>
                ))}
              </nav>
            </div>

            <AdPlaceholder slot="DOCS_SIDEBAR_BOTTOM" />
          </aside>

          {/* ── Main Documentation Content ── */}
          <div className="space-y-32">
            <AdPlaceholder slot="DOCS_CONTENT_HERO" />

            {/* Section: Welcome */}
            <section id="introduction" className="scroll-mt-32 space-y-10">
              <div className="space-y-6">
                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/5">Enterprise Standard</Badge>
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9]">The All-In-One <span className="text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-red-600">Web Forge</span></h1>
                <p className="text-2xl text-[#777] leading-relaxed max-w-3xl font-medium">
                  Welcome to the definitive guide for HTML Editor Pro. Whether you're a designer seeking visual perfection or a coder demanding precision, our workspace adapts to your flow.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <FeatureCard 
                  id="visual-builder"
                  icon={<FiEye />} 
                  title="Low-Code Designer" 
                  desc="A drag-and-drop ecosystem with high-fidelity canvas and property inspector." 
                />
                <FeatureCard 
                  id="code-editor"
                  icon={<FiCode />} 
                  title="VS Code Engine" 
                  desc="Native Monaco integration with IntelliSense, emmet, and syntax highlighting." 
                />
                <FeatureCard 
                  id="timeline-animation"
                  icon={<FiClock />} 
                  title="Motion Engine" 
                  desc="Keyframe-based timeline to build complex CSS animations without code." 
                />
                <FeatureCard 
                  id="file-explorer"
                  icon={<FiFolder />} 
                  title="Project Core" 
                  desc="Virtual file system with folder support, image hosting, and ZIP deployment." 
                />
              </div>
            </section>

            {/* Section: Interface Breakdown */}
            <section id="interface" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Workspace Layout" 
                subtitle="A modular, dockable environment designed for maximum productivity."
                icon={<FiLayout />}
                color="blue"
              />

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="bg-[#111] border-[#222] p-8 space-y-4 md:col-span-2">
                  <h4 className="text-xl text-white font-black uppercase tracking-tight">Window Management</h4>
                  <p className="text-[#888] leading-relaxed font-medium">
                    Our workspace is built on a custom windowing system. Every panel can be **Docked** into a slot, **Floated** anywhere on screen, or **Minimized** to the status bar. 
                    Drag the title bar of any window to reposition it, and use the snap zones to dock it back.
                  </p>
                  <div className="flex gap-4 pt-4">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Snap Zones</Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Multi-Z-Index</Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Auto-Layout</Badge>
                  </div>
                </Card>
                <div className="bg-[#111] border border-[#222] rounded-3xl p-8 flex flex-col justify-center items-center text-center group">
                   <div className="text-orange-500 mb-6 group-hover:scale-110 transition-transform"><FiMonitor size={48} /></div>
                   <h5 className="text-white font-black mb-2 uppercase tracking-widest text-sm">Preset Modes</h5>
                   <p className="text-xs text-[#666] font-medium leading-relaxed">Toggle between Code, Visual, or Split layouts with Ctrl+1, 2, or 3.</p>
                </div>
              </div>
            </section>

            <AdPlaceholder slot="DOCS_CONTENT_MID_1" />

            {/* Section: File Explorer Deep-Dive */}
            <section id="file-explorer" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="File Explorer" 
                subtitle="The nerve center of your project organization."
                icon={<FiFolder />}
                color="orange"
              />

              <div className="space-y-10">
                <div className="prose prose-invert max-w-none text-[#888] font-medium leading-relaxed">
                  <p>
                    Located by default on the left, the File Explorer manages all assets within your current session. It supports a virtual file system that persists in your browser's local storage.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                      <FiPlusSquare className="text-orange-500" /> Key Operations
                    </h4>
                    <ul className="space-y-6">
                      <li className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-orange-500 flex-shrink-0"><FiPlus /></div>
                        <div>
                          <strong className="text-white block mb-1">Create File</strong>
                          <span className="text-xs text-[#777]">Supports .html, .css, .js, .json, and .md. Extension determines the editor mode.</span>
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-orange-500 flex-shrink-0"><FiFolderPlus /></div>
                        <div>
                          <strong className="text-white block mb-1">Create Folder</strong>
                          <span className="text-xs text-[#777]">Organize your components and assets into a clean directory structure.</span>
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-orange-500 flex-shrink-0"><FiUpload /></div>
                        <div>
                          <strong className="text-white block mb-1">Smart Import</strong>
                          <span className="text-xs text-[#777]">Drag and drop files from your OS directly into the panel to import them.</span>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <Card className="bg-[#0a0a0a] border-[#222] p-8 space-y-6">
                    <h4 className="text-white font-black uppercase tracking-widest text-xs border-b border-[#1a1a1a] pb-4">Context Menu Actions</h4>
                    <div className="space-y-4">
                      {[
                        { label: 'Rename', icon: <FiEdit />, desc: 'Safely change names with path auto-update.' },
                        { label: 'Duplicate', icon: <FiCopy />, desc: 'Instant clone of any file or directory.' },
                        { label: 'Delete', icon: <FiTrash2 />, desc: 'Permanent removal from virtual storage.' },
                        { label: 'Export ZIP', icon: <FiDownload />, desc: 'Convert virtual files to a physical .zip file.' },
                      ].map((action, i) => (
                        <div key={i} className="flex items-center gap-4 group cursor-default">
                          <div className="text-[#444] group-hover:text-orange-500 transition-colors">{action.icon}</div>
                          <div className="flex-1">
                            <span className="text-white text-xs font-bold block">{action.label}</span>
                            <span className="text-[10px] text-[#555]">{action.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </section>

            {/* Section: Code Editor Deep-Dive */}
            <section id="code-editor" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Monaco Engine" 
                subtitle="The world's most advanced code editor, now in your browser."
                icon={<FiCode />}
                color="blue"
              />

              <div className="grid lg:grid-cols-[1fr_350px] gap-12">
                <div className="space-y-8">
                  <p className="text-[#888] font-medium leading-relaxed">
                    Our Code Editor is built on **Monaco**, the same engine powering VS Code. It provides a native development experience with desktop-grade performance.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-[#111] rounded-3xl border border-[#222]">
                      <h5 className="text-white font-black uppercase tracking-widest text-[10px] mb-3 text-blue-500">Feature 01</h5>
                      <h4 className="text-white font-bold mb-2">IntelliSense</h4>
                      <p className="text-xs text-[#666]">Smart completions for HTML tags, CSS properties, and JavaScript functions.</p>
                    </div>
                    <div className="p-6 bg-[#111] rounded-3xl border border-[#222]">
                      <h5 className="text-white font-black uppercase tracking-widest text-[10px] mb-3 text-blue-500">Feature 02</h5>
                      <h4 className="text-white font-bold mb-2">Multi-Cursor</h4>
                      <p className="text-xs text-[#666]">Hold Alt and click to place multiple cursors for bulk editing.</p>
                    </div>
                    <div className="p-6 bg-[#111] rounded-3xl border border-[#222]">
                      <h5 className="text-white font-black uppercase tracking-widest text-[10px] mb-3 text-blue-500">Feature 03</h5>
                      <h4 className="text-white font-bold mb-2">Prettier Sync</h4>
                      <p className="text-xs text-[#666]">Automatic formatting ensures your code always meets professional standards.</p>
                    </div>
                    <div className="p-6 bg-[#111] rounded-3xl border border-[#222]">
                      <h5 className="text-white font-black uppercase tracking-widest text-[10px] mb-3 text-blue-500">Feature 04</h5>
                      <h4 className="text-white font-bold mb-2">Emmet</h4>
                      <p className="text-xs text-[#666]">Write HTML lightning fast with Emmet abbreviations support.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-3xl space-y-6">
                    <h4 className="text-blue-400 font-black uppercase tracking-widest text-xs">AI Intelligence</h4>
                    <p className="text-xs text-[#777] leading-relaxed">
                      Look for the <span className="text-blue-400 font-bold">✦ AI Status Button</span> in the status bar. 
                      It provides real-time suggestions, bug fixes, and boilerplate generation based on your current file context.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Badge className="bg-blue-500/20 text-blue-400 border-none justify-start">✓ Suggestion Ready (Tab)</Badge>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-none justify-start">⟳ AI Thinking...</Badge>
                      <Badge className="bg-white/5 text-[#555] border-none justify-start">✦ AI Idle</Badge>
                    </div>
                  </div>
                  <Alert className="bg-[#111] border-[#222] rounded-3xl">
                    <FiCheckCircle className="text-green-500" />
                    <AlertTitle className="text-white font-black text-xs uppercase">Live Refresh</AlertTitle>
                    <AlertDescription className="text-[10px] text-[#666]">
                      Every keystroke is synchronized. No need to hit save to see changes in the preview.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </section>

            <AdPlaceholder slot="DOCS_CONTENT_MID_2" />

            {/* Section: Visual Designer Deep-Dive */}
            <section id="visual-builder" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Visual Designer" 
                subtitle="The ultimate bridge between design and code."
                icon={<FiEye />}
                color="green"
              />

              <div className="space-y-12">
                <div className="grid md:grid-cols-[300px_1fr] gap-12 items-center">
                  <div className="space-y-6">
                    <h4 className="text-white font-black uppercase tracking-widest text-sm">Interactive Canvas</h4>
                    <p className="text-[#888] text-sm leading-relaxed font-medium">
                      The Visual Designer provides a true-to-life preview of your web project. But it's more than just a preview—it's an interactive staging area.
                    </p>
                    <div className="space-y-4">
                       <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500 flex-shrink-0 text-xs font-black">1</div>
                          <span className="text-xs text-[#666]">**Select:** Click any element to focus it in the Properties Panel.</span>
                       </div>
                       <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500 flex-shrink-0 text-xs font-black">2</div>
                          <span className="text-xs text-[#666]">**Edit:** Right-click elements for visual-specific actions.</span>
                       </div>
                       <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500 flex-shrink-0 text-xs font-black">3</div>
                          <span className="text-xs text-[#666]">**Sync:** Drag elements to reorder them (Pro only).</span>
                       </div>
                    </div>
                  </div>
                  <div className="p-4 bg-[#0d0d0d] rounded-3xl border border-[#222] shadow-3xl overflow-hidden">
                    {/* Visual Editor Preview Mockup */}
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1a1a1a]">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500/50" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                        <div className="w-2 h-2 rounded-full bg-green-500/50" />
                      </div>
                      <div className="text-[9px] text-[#444] font-black uppercase tracking-widest">Visual-Stage.v2</div>
                    </div>
                    <div className="grid grid-cols-[1fr_180px] gap-4 h-[320px]">
                      <div className="bg-white/[0.02] rounded-2xl border-2 border-dashed border-green-500/20 flex flex-col items-center justify-center p-10 text-center group">
                        <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform shadow-2xl">
                          <FiLayout size={38} />
                        </div>
                        <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2">Drop Components</h4>
                        <p className="text-[10px] text-[#555] font-medium leading-relaxed max-w-[140px]">The stage reacts to your component drops in real-time.</p>
                      </div>
                      <div className="bg-[#111] rounded-2xl border border-[#222] p-4 space-y-6">
                        <div className="text-[9px] font-black text-[#333] uppercase tracking-widest">Active Props</div>
                        <div className="space-y-3">
                          <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full" />
                          <div className="h-7 w-full bg-[#1a1a1a] rounded-lg border border-white/5" />
                          <div className="h-1.5 w-2/3 bg-[#1a1a1a] rounded-full" />
                          <div className="h-7 w-full bg-[#1a1a1a] rounded-lg border border-white/5" />
                          <div className="pt-6 grid grid-cols-3 gap-2">
                            <div className="aspect-square rounded-md bg-orange-500/20 border border-orange-500/40" />
                            <div className="aspect-square rounded-md bg-blue-500/20 border border-blue-500/40" />
                            <div className="aspect-square rounded-md bg-green-500/20 border border-green-500/40" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Properties Panel */}
            <section id="properties-panel" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Properties Panel" 
                subtitle="Fine-tune every pixel without touching the CSS file."
                icon={<FiSliders />}
                color="purple"
              />

              <div className="grid md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <p className="text-[#888] font-medium leading-relaxed">
                       When an element is selected in the Visual Designer, the Properties Panel becomes active. It categorizes CSS properties into logical groups for rapid styling.
                    </p>
                    <Accordion type="single" collapsible className="w-full">
                       {[
                          { title: 'Layout & Box Model', icon: <FiBox />, desc: 'Control Display (Flex/Grid), Width, Height, Margins, and Padding.' },
                          { title: 'Typography', icon: <FiFileText />, desc: 'Font family, size, weight, line-height, and alignment.' },
                          { title: 'Backgrounds', icon: <FiDroplet />, desc: 'Solid colors, linear gradients, and radial gradients.' },
                          { title: 'Effects & Borders', icon: <FiZap />, desc: 'Border radius, shadow, opacity, and custom filters.' },
                       ].map((item, i) => (
                          <AccordionItem key={i} value={`item-${i}`} className="border-[#1a1a1a] py-1">
                             <AccordionTrigger className="text-white hover:text-purple-500 font-bold text-sm uppercase tracking-widest no-underline py-4">
                                <div className="flex items-center gap-3">
                                   <span className="text-purple-500">{item.icon}</span> {item.title}
                                </div>
                             </AccordionTrigger>
                             <AccordionContent className="text-[#666] text-xs leading-relaxed font-medium pl-8">
                                {item.desc}
                             </AccordionContent>
                          </AccordionItem>
                       ))}
                    </Accordion>
                 </div>
                 
                 <div className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-3xl space-y-6">
                    <h4 className="text-purple-400 font-black uppercase tracking-widest text-xs">Prop Intelligence</h4>
                    <p className="text-xs text-[#777] leading-relaxed">
                       Our properties panel is context-aware. If you select a `flex` container, it will automatically show alignment and justification controls. 
                       If you select an image, it will show aspect ratio and object-fit settings.
                    </p>
                    <div className="bg-[#080808] p-4 rounded-2xl border border-[#1a1a1a] font-mono text-[10px] text-purple-400/60 leading-tight">
                       {`.selected-element {
  display: flex;
  align-items: center;
  background: linear-gradient(...);
  border-radius: 12px;
}`}
                    </div>
                 </div>
              </div>
            </section>

            <AdPlaceholder slot="DOCS_CONTENT_MID_3" />

            {/* Section: Timeline & Animation */}
            <section id="timeline-animation" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Motion Engine" 
                subtitle="Bring your web pages to life with visual keyframing."
                icon={<FiClock />}
                color="red"
              />

              <div className="space-y-10">
                <div className="prose prose-invert max-w-none text-[#888] font-medium leading-relaxed">
                  <p>
                    The Timeline Panel is a unique feature that allows you to create complex CSS @keyframes animations using a drag-and-drop time-scrubber. 
                    No more writing complex transform strings—just set your keyframes and we handle the rest.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                   <div className="p-6 bg-[#111] rounded-3xl border border-[#222] space-y-4">
                      <FiPlay className="text-red-500" size={24} />
                      <h4 className="text-white font-black text-xs uppercase tracking-widest">Keyframe Setup</h4>
                      <p className="text-[11px] text-[#666] leading-relaxed font-medium">Select an element, click "Add Keyframe" on the timeline, and move the scrubber to a new time. Change the element's style, and a transition is born.</p>
                   </div>
                   <div className="p-6 bg-[#111] rounded-3xl border border-[#222] space-y-4">
                      <FiShare2 className="text-red-500" size={24} />
                      <h4 className="text-white font-black text-xs uppercase tracking-widest">Preset Library</h4>
                      <p className="text-[11px] text-[#666] leading-relaxed font-medium">Don't want to start from scratch? Use our library of FadeIn, SlideUp, Bounce, and Pulse presets to animate instantly.</p>
                   </div>
                   <div className="p-6 bg-[#111] rounded-3xl border border-[#222] space-y-4">
                      <FiRefreshCw className="text-red-500" size={24} />
                      <h4 className="text-white font-black text-xs uppercase tracking-widest">Live Playback</h4>
                      <p className="text-[11px] text-[#666] leading-relaxed font-medium">Preview your animations directly on the stage. Loop them, reverse them, or trigger them on specific user actions.</p>
                   </div>
                </div>

                <Alert className="bg-red-500/5 border-red-500/20 text-red-400 rounded-3xl p-6">
                   <FiAlertCircle className="h-5 w-5" />
                   <AlertTitle className="text-white font-black text-xs uppercase ml-2">Exporting Animations</AlertTitle>
                   <AlertDescription className="text-xs text-[#777] ml-2 leading-relaxed mt-2">
                      When you export your project, all timeline animations are converted into standard CSS @keyframes and injected into your stylesheet. They work on any browser without our editor.
                   </AlertDescription>
                </Alert>
              </div>
            </section>

            {/* Section: Menu Dictionary */}
            <section id="menu-system" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Menu Dictionary" 
                subtitle="Every function explained, from File to Help."
                icon={<FiSettings />}
                color="cyan"
              />

              <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <h4 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-cyan-500 pl-4">File & Export</h4>
                    <div className="space-y-4">
                       <div className="p-4 bg-[#111] rounded-2xl border border-[#222] flex justify-between items-center group">
                          <div>
                             <span className="text-white text-xs font-bold block">New File / Folder</span>
                             <span className="text-[10px] text-[#555]">Create virtual assets in the current project.</span>
                          </div>
                          <Badge className="bg-cyan-500/10 text-cyan-500 border-none uppercase text-[8px] font-black">Ctrl+N</Badge>
                       </div>
                       <div className="p-4 bg-[#111] rounded-2xl border border-[#222] flex justify-between items-center">
                          <div>
                             <span className="text-white text-xs font-bold block">Save All</span>
                             <span className="text-[10px] text-[#555]">Sync all virtual files to browser storage.</span>
                          </div>
                          <Badge className="bg-cyan-500/10 text-cyan-500 border-none uppercase text-[8px] font-black">Ctrl+S</Badge>
                       </div>
                       <div className="p-4 bg-[#111] rounded-2xl border border-[#222] flex justify-between items-center">
                          <div>
                             <span className="text-white text-xs font-bold block">Export ZIP</span>
                             <span className="text-[10px] text-[#555]">Download entire project for hosting.</span>
                          </div>
                          <Badge className="bg-cyan-500/10 text-cyan-500 border-none uppercase text-[8px] font-black">Ctrl+E</Badge>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-blue-500 pl-4">Tools & Window</h4>
                    <div className="space-y-4">
                       <div className="p-4 bg-[#111] rounded-2xl border border-[#222]">
                          <span className="text-white text-xs font-bold block mb-1">HTML Validator</span>
                          <span className="text-[10px] text-[#555]">Checks your active HTML file for syntax errors and unclosed tags.</span>
                       </div>
                       <div className="p-4 bg-[#111] rounded-2xl border border-[#222]">
                          <span className="text-white text-xs font-bold block mb-1">A11y Checker</span>
                          <span className="text-[10px] text-[#555]">Quick-check for alt tags and ARIA labels to ensure accessibility.</span>
                       </div>
                       <div className="p-4 bg-[#111] rounded-2xl border border-[#222]">
                          <span className="text-white text-xs font-bold block mb-1">Layout Presets</span>
                          <span className="text-[10px] text-[#555]">Instantly snap windows into Code, Visual, or Split layouts.</span>
                       </div>
                    </div>
                 </div>
              </div>
            </section>

            <AdPlaceholder slot="DOCS_CONTENT_BOTTOM" />

            {/* Section: Shortcuts */}
            <section id="shortcuts" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Power Shortcuts" 
                subtitle="Master the editor with these mission-critical hotkeys."
                icon={<FiTerminal />}
                color="green"
              />
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { key: 'Ctrl + 1', action: 'Code Layout' },
                  { key: 'Ctrl + 2', action: 'Visual Layout' },
                  { key: 'Ctrl + 3', action: 'Split Layout' },
                  { key: 'Ctrl + S', action: 'Save All' },
                  { key: 'Ctrl + E', action: 'Export ZIP' },
                  { key: 'Ctrl + R', action: 'Refresh Preview' },
                  { key: 'Ctrl + N', action: 'New File' },
                  { key: 'Tab', action: 'Accept AI Suggestion' },
                  { key: 'Esc', action: 'Deselect Element' },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-[#111] rounded-2xl border border-[#222] hover:border-green-500/20 transition-all">
                    <span className="text-[#888] text-xs font-bold uppercase tracking-widest">{s.action}</span>
                    <kbd className="bg-[#1a1a1a] px-3 py-1 rounded-lg text-[10px] text-green-500 font-black border border-[#222] shadow-inner">{s.key}</kbd>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#1a1a1a] pt-20 pb-32 text-center space-y-8">
              <div className="flex justify-center items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-[#e34c26] flex items-center justify-center text-white font-black text-xs">H</div>
                 <span className="text-white font-black tracking-widest text-xs uppercase">HTML Editor Pro v2.0</span>
              </div>
              <p className="text-[#444] text-xs font-medium max-w-lg mx-auto leading-relaxed">
                Designed for the next generation of web creators. No install, no limits. 
                Built with React, Monaco, and Framer Motion.
              </p>
              <div className="flex justify-center gap-8 text-[10px] font-black text-[#333] uppercase tracking-[0.2em]">
                <a href="#" className="hover:text-orange-500 transition-colors">Privacy</a>
                <a href="#" className="hover:text-orange-500 transition-colors">Terms</a>
                <a href="#" className="hover:text-orange-500 transition-colors">Contact</a>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Documentation;
