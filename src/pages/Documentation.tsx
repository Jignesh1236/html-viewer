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
  FiDroplet,
  FiMaximize2,
  FiMove,
  FiType,
  FiCheck,
  FiX,
  FiSquare,
  FiZoomIn,
  FiZoomOut,
  FiCommand,
  FiMousePointer,
  FiMenu,
  FiLayers,
  FiGrid,
  FiScissors,
  FiSave,
  FiFilePlus
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
                  { id: 'menu-system', label: 'Menu Dictionary', icon: <FiMenu />, color: 'cyan' },
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
                <h3 className="text-[11px] font-black text-[#333] uppercase tracking-[0.3em] px-3 mb-6">AI & Intelligence</h3>
                {[
                  { id: 'ai-assistant', label: 'AI Code Copilot', icon: <FiCpu /> },
                  { id: 'ai-suggestions', label: 'Smart Suggestions', icon: <FiZap /> },
                ].map(item => (
                  <a key={item.id} href={`#${item.id}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-[#666] hover:text-white font-bold transition-all group">
                    <span className="text-yellow-500 group-hover:scale-110 transition-transform">{item.icon}</span> {item.label}
                  </a>
                ))}
              </nav>

              <nav className="space-y-2">
                <h3 className="text-[11px] font-black text-[#333] uppercase tracking-[0.3em] px-3 mb-6">Support</h3>
                {[
                  { id: 'shortcuts', label: 'Hotkeys List', icon: <FiTerminal /> },
                  { id: 'pro-tips', label: 'Tips & Tricks', icon: <FiZap /> },
                  { id: 'deployment', label: 'Deployment', icon: <FiShare2 /> },
                ].map(item => (
                  <a key={item.id} href={`#${item.id}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-[#666] hover:text-white font-bold transition-all group">
                    <span className="text-green-500 group-hover:scale-110 transition-transform">{item.icon}</span> {item.label}
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

            {/* Section: Quick Start */}
            <section id="quick-start" className="scroll-mt-32 space-y-12 pt-12 border-t border-[#1a1a1a]">
              <div className="space-y-4 text-center max-w-2xl mx-auto">
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Quick Start Guide</h2>
                <p className="text-[#666]">Build your first web page in under 3 minutes following these steps.</p>
              </div>

              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { step: '01', title: 'Init', desc: 'Create your index.html in the File Explorer.' },
                  { step: '02', title: 'Layout', desc: 'Drag components onto the visual stage.' },
                  { step: '03', title: 'Animate', desc: 'Add keyframes to the CSS timeline.' },
                  { step: '04', title: 'Ship', desc: 'Export your production-ready ZIP file.' },
                ].map((s, i) => (
                  <div key={i} className="relative group">
                    <div className="text-5xl font-black text-[#1a1a1a] absolute -top-4 -left-2 group-hover:text-orange-500/5 transition-colors">{s.step}</div>
                    <div className="relative pt-6">
                      <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2">{s.title}</h4>
                      <p className="text-xs text-[#777] leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <AdPlaceholder slot="DOCS_CONTENT_MID_1" />

            {/* Section: Menu Dictionary - DETAILED */}
            <section id="menu-system" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Menu Dictionary" 
                subtitle="Every function and tool explained in detail."
                icon={<FiMenu />}
                color="cyan"
              />

              <div className="space-y-16">
                <div className="grid md:grid-cols-2 gap-12">
                  {/* File Menu */}
                  <div className="space-y-6">
                    <h4 className="text-xl text-white font-black uppercase tracking-widest border-l-4 border-cyan-500 pl-4">1. File Menu</h4>
                    <p className="text-sm text-[#777] leading-relaxed font-medium">Project and file management controls.</p>
                    <div className="space-y-4">
                      {[
                        { label: 'New File', icon: <FiFilePlus />, desc: 'Create a new file. Use .html, .css, or .js extensions.' },
                        { label: 'New Folder', icon: <FiFolderPlus />, desc: 'Create a folder to organize your assets.' },
                        { label: 'Save All', icon: <FiSave />, desc: 'Manually commit all changes to browser storage.' },
                        { label: 'Import Files', icon: <FiUpload />, desc: 'Upload existing files from your local machine.' },
                        { label: 'Export ZIP', icon: <FiDownload />, desc: 'Download your entire project as a clean ZIP.' },
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-[#111] rounded-2xl border border-[#222] flex gap-4 items-center group hover:border-cyan-500/30 transition-all">
                          <div className="text-cyan-500 group-hover:scale-110 transition-transform">{item.icon}</div>
                          <div>
                            <span className="text-white text-xs font-black block uppercase tracking-tight">{item.label}</span>
                            <span className="text-[10px] text-[#555] font-medium leading-relaxed">{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tools Menu */}
                  <div className="space-y-6">
                    <h4 className="text-xl text-white font-black uppercase tracking-widest border-l-4 border-blue-500 pl-4">2. Tools Menu</h4>
                    <p className="text-sm text-[#777] leading-relaxed font-medium">Advanced quality and formatting tools.</p>
                    <div className="space-y-4">
                      {[
                        { label: 'Validate HTML', icon: <FiCheckCircle />, desc: 'Check for unclosed tags or syntax errors in HTML.' },
                        { label: 'Accessibility', icon: <FiSearch />, desc: 'Check for missing alt tags and aria-labels.' },
                        { label: 'Format HTML', icon: <FiLayers />, desc: 'Clean up your code with proper indentation.' },
                        { label: 'Minify HTML', icon: <FiScissors />, desc: 'Compress HTML for production performance.' },
                        { label: 'Clear Console', icon: <FiTrash2 />, desc: 'Reset the output console logs.' },
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-[#111] rounded-2xl border border-[#222] flex gap-4 items-center group hover:border-blue-500/30 transition-all">
                          <div className="text-blue-500 group-hover:scale-110 transition-transform">{item.icon}</div>
                          <div>
                            <span className="text-white text-xs font-black block uppercase tracking-tight">{item.label}</span>
                            <span className="text-[10px] text-[#555] font-medium leading-relaxed">{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  {/* Window Menu */}
                  <div className="space-y-6">
                    <h4 className="text-xl text-white font-black uppercase tracking-widest border-l-4 border-purple-500 pl-4">3. Window Menu</h4>
                    <p className="text-sm text-[#777] leading-relaxed font-medium">Control the workspace layout and panels.</p>
                    <div className="space-y-4">
                      {[
                        { label: 'Layout Presets', icon: <FiGrid />, desc: 'Switch between Code, Visual, and Split layouts.' },
                        { label: 'Panel Visibility', icon: <FiMaximize2 />, desc: 'Toggle specific panels like File Explorer or Timeline.' },
                        { label: 'Docking System', icon: <FiLayout />, desc: 'Dock panels to slots or float them as windows.' },
                        { label: 'Reset Layout', icon: <FiRefreshCw />, desc: 'Reset all panels to their default positions.' },
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-[#111] rounded-2xl border border-[#222] flex gap-4 items-center group hover:border-purple-500/30 transition-all">
                          <div className="text-purple-500 group-hover:scale-110 transition-transform">{item.icon}</div>
                          <div>
                            <span className="text-white text-xs font-black block uppercase tracking-tight">{item.label}</span>
                            <span className="text-[10px] text-[#555] font-medium leading-relaxed">{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Export Menu */}
                  <div className="space-y-6">
                    <h4 className="text-xl text-white font-black uppercase tracking-widest border-l-4 border-orange-500 pl-4">4. Export Menu</h4>
                    <p className="text-sm text-[#777] leading-relaxed font-medium">Options for downloading your project.</p>
                    <div className="space-y-4">
                      {[
                        { label: 'Export ZIP', icon: <FiDownload />, desc: 'Complete project bundle with all assets.' },
                        { label: 'Export HTML Only', icon: <FiFileText />, desc: 'Download only the active HTML file.' },
                        { label: 'Export CSS Only', icon: <FiDroplet />, desc: 'Download the active CSS stylesheet.' },
                        { label: 'Copy to Clipboard', icon: <FiCopy />, desc: 'Copy current code for quick sharing.' },
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-[#111] rounded-2xl border border-[#222] flex gap-4 items-center group hover:border-orange-500/30 transition-all">
                          <div className="text-orange-500 group-hover:scale-110 transition-transform">{item.icon}</div>
                          <div>
                            <span className="text-white text-xs font-black block uppercase tracking-tight">{item.label}</span>
                            <span className="text-[10px] text-[#555] font-medium leading-relaxed">{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: File Explorer Deep-Dive */}
            <section id="file-explorer" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="File Explorer" 
                subtitle="The nerve center of your project organization."
                icon={<FiFolder />}
                color="orange"
              />

              <div className="space-y-10">
                <div className="prose prose-invert max-w-none text-[#888] font-medium leading-relaxed text-lg">
                  <p>
                    The File Explorer manages all assets within your current session. It supports a virtual file system that persists in your browser's local storage.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                      <FiPlusSquare className="text-orange-500" /> Key Operations
                    </h4>
                    <ul className="space-y-6">
                      <li className="flex gap-4 p-4 rounded-2xl bg-[#111] border border-[#222] hover:bg-orange-500/5 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0"><FiPlus /></div>
                        <div>
                          <strong className="text-white block mb-1 uppercase tracking-tight">New File</strong>
                          <span className="text-xs text-[#777]">Supports .html, .css, .js, .json, and .md. Extension determines the editor mode.</span>
                        </div>
                      </li>
                      <li className="flex gap-4 p-4 rounded-2xl bg-[#111] border border-[#222] hover:bg-orange-500/5 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0"><FiFolderPlus /></div>
                        <div>
                          <strong className="text-white block mb-1 uppercase tracking-tight">New Folder</strong>
                          <span className="text-xs text-[#777]">Organize your components and assets into a clean directory structure.</span>
                        </div>
                      </li>
                      <li className="flex gap-4 p-4 rounded-2xl bg-[#111] border border-[#222] hover:bg-orange-500/5 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0"><FiUpload /></div>
                        <div>
                          <strong className="text-white block mb-1 uppercase tracking-tight">Smart Import</strong>
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
                        <div key={i} className="flex items-center gap-4 group cursor-default p-2 rounded-xl hover:bg-white/5 transition-colors">
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
                  <p className="text-[#888] font-medium leading-relaxed text-lg">
                    Our Code Editor is built on <strong>Monaco</strong>, the same engine powering VS Code. It provides a native development experience with desktop-grade performance.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-8 bg-[#111] rounded-3xl border border-[#222] hover:border-blue-500/30 transition-all">
                      <h5 className="text-white font-black uppercase tracking-widest text-[10px] mb-4 text-blue-500">Feature 01</h5>
                      <h4 className="text-xl text-white font-bold mb-3">IntelliSense</h4>
                      <p className="text-sm text-[#666] leading-relaxed">Smart completions for HTML tags, CSS properties, and JavaScript functions.</p>
                    </div>
                    <div className="p-8 bg-[#111] rounded-3xl border border-[#222] hover:border-blue-500/30 transition-all">
                      <h5 className="text-white font-black uppercase tracking-widest text-[10px] mb-4 text-blue-500">Feature 02</h5>
                      <h4 className="text-xl text-white font-bold mb-3">Multi-Cursor</h4>
                      <p className="text-sm text-[#666] leading-relaxed">Hold Alt and click to place multiple cursors for bulk editing tasks.</p>
                    </div>
                    <div className="p-8 bg-[#111] rounded-3xl border border-[#222] hover:border-blue-500/30 transition-all">
                      <h5 className="text-white font-black uppercase tracking-widest text-[10px] mb-4 text-blue-500">Feature 03</h5>
                      <h4 className="text-xl text-white font-bold mb-3">Prettier Sync</h4>
                      <p className="text-sm text-[#666] leading-relaxed">Automatic formatting ensures your code meets professional standards.</p>
                    </div>
                    <div className="p-8 bg-[#111] rounded-3xl border border-[#222] hover:border-blue-500/30 transition-all">
                      <h5 className="text-white font-black uppercase tracking-widest text-[10px] mb-4 text-blue-500">Feature 04</h5>
                      <h4 className="text-xl text-white font-bold mb-3">Emmet Support</h4>
                      <p className="text-sm text-[#666] leading-relaxed">Write HTML lightning fast with standard Emmet abbreviations.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-10 bg-blue-500/5 border border-blue-500/20 rounded-3xl space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"><FiCpu size={120} /></div>
                    <h4 className="text-blue-400 font-black uppercase tracking-widest text-xs">AI Intelligence</h4>
                    <p className="text-sm text-[#777] leading-relaxed font-medium">
                      Look for the <span className="text-blue-400 font-bold">✦ AI Status Button</span> in the status bar. 
                      It provides real-time suggestions, bug fixes, and boilerplate generation based on your file context.
                    </p>
                    <div className="flex flex-col gap-3">
                      <Badge className="bg-blue-500/10 text-blue-400 border-none py-2 px-4 justify-start font-bold">✓ Suggestion Ready (Tab)</Badge>
                      <Badge className="bg-yellow-500/10 text-yellow-400 border-none py-2 px-4 justify-start font-bold">⟳ AI Thinking...</Badge>
                      <Badge className="bg-white/5 text-[#444] border-none py-2 px-4 justify-start font-bold">✦ AI Idle</Badge>
                    </div>
                  </div>
                  <Alert className="bg-[#111] border-[#222] rounded-3xl p-6">
                    <FiCheckCircle className="text-green-500" />
                    <AlertTitle className="text-white font-black text-xs uppercase mb-2">Live Refresh</AlertTitle>
                    <AlertDescription className="text-xs text-[#666] leading-relaxed">
                      Every keystroke is synchronized. No need to hit save to see changes in the preview pane.
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
                <div className="grid md:grid-cols-[350px_1fr] gap-16 items-start">
                  <div className="space-y-10">
                    <div>
                      <h4 className="text-white font-black uppercase tracking-widest text-sm mb-4">Interactive Canvas</h4>
                      <p className="text-[#888] text-lg leading-relaxed font-medium">
                        The Visual Designer provides a true-to-life preview that doubles as an interactive staging area.
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                       <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                          <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0 text-xs font-black group-hover:bg-green-500 group-hover:text-white transition-all">1</div>
                          <div>
                            <strong className="text-white block mb-1 uppercase tracking-tight">Select & Focus</strong>
                            <span className="text-xs text-[#666] leading-relaxed block font-medium">Click any element to focus it. Its CSS properties will automatically load in the Properties Panel.</span>
                          </div>
                       </div>
                       <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                          <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0 text-xs font-black group-hover:bg-green-500 group-hover:text-white transition-all">2</div>
                          <div>
                            <strong className="text-white block mb-1 uppercase tracking-tight">Context Actions</strong>
                            <span className="text-xs text-[#666] leading-relaxed block font-medium">Right-click elements on the canvas to duplicate, delete, or wrap them in new containers.</span>
                          </div>
                       </div>
                       <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                          <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0 text-xs font-black group-hover:bg-green-500 group-hover:text-white transition-all">3</div>
                          <div>
                            <strong className="text-white block mb-1 uppercase tracking-tight">Responsive Toggles</strong>
                            <span className="text-xs text-[#666] leading-relaxed block font-medium">Use the viewport icons to test your design on Mobile, Tablet, and Desktop resolutions.</span>
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-[#0a0a0a] rounded-[2.5rem] border border-[#222] shadow-3xl overflow-hidden group relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-10 transition-opacity pointer-events-none"><FiMousePointer size={200} /></div>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1a1a1a]">
                      <div className="flex gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/40" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                        <div className="w-3 h-3 rounded-full bg-green-500/40" />
                      </div>
                      <div className="text-[10px] text-[#444] font-black uppercase tracking-[0.2em]">Visual-Stage.Pro.v2</div>
                    </div>
                    <div className="grid grid-cols-[1fr_220px] gap-6 h-[400px]">
                      <div className="bg-white/[0.02] rounded-3xl border-2 border-dashed border-green-500/20 flex flex-col items-center justify-center p-12 text-center group/stage">
                        <div className="w-24 h-24 rounded-[2rem] bg-green-500/10 flex items-center justify-center text-green-500 mb-8 group-hover/stage:scale-110 transition-transform shadow-2xl group-hover/stage:bg-green-500 group-hover/stage:text-white">
                          <FiLayout size={44} />
                        </div>
                        <h4 className="text-white font-black text-lg uppercase tracking-widest mb-3">Drop Zone</h4>
                        <p className="text-xs text-[#555] font-medium leading-relaxed max-w-[180px]">Components dropped here are instantly converted to clean HTML/CSS.</p>
                      </div>
                      <div className="bg-[#111] rounded-3xl border border-[#222] p-6 space-y-8">
                        <div className="text-[10px] font-black text-[#333] uppercase tracking-[0.2em]">Active Properties</div>
                        <div className="space-y-4">
                          <div className="h-2 w-full bg-[#1a1a1a] rounded-full" />
                          <div className="h-10 w-full bg-[#161616] rounded-xl border border-white/5" />
                          <div className="h-2 w-2/3 bg-[#1a1a1a] rounded-full" />
                          <div className="h-10 w-full bg-[#161616] rounded-xl border border-white/5" />
                          <div className="pt-8 grid grid-cols-3 gap-3">
                            <div className="aspect-square rounded-xl bg-orange-500/10 border border-orange-500/30 shadow-lg shadow-orange-500/5 hover:bg-orange-500 hover:scale-110 transition-all cursor-pointer" />
                            <div className="aspect-square rounded-xl bg-blue-500/10 border border-blue-500/30 shadow-lg shadow-blue-500/5 hover:bg-blue-500 hover:scale-110 transition-all cursor-pointer" />
                            <div className="aspect-square rounded-xl bg-green-500/10 border border-green-500/30 shadow-lg shadow-green-500/5 hover:bg-green-500 hover:scale-110 transition-all cursor-pointer" />
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

              <div className="grid md:grid-cols-2 gap-16">
                 <div className="space-y-10">
                    <p className="text-[#888] font-medium leading-relaxed text-lg">
                       The Properties Panel is your visual CSS engine. It categorizes hundreds of properties into logical groups for rapid styling and experimentation.
                    </p>
                    <Accordion type="single" collapsible className="w-full space-y-2">
                       {[
                          { title: 'Layout & Box Model', icon: <FiBox />, desc: 'Master the geometry: Display (Flex/Grid/Block), Width, Height, Aspect Ratio, Margins, and Padding.' },
                          { title: 'Typography & Fonts', icon: <FiType />, desc: 'Craft your message: Font family, size, weight, letter-spacing, line-height, and text alignment.' },
                          { title: 'Colors & Backgrounds', icon: <FiDroplet />, desc: 'Set the mood: Solid colors, complex linear/radial gradients, and background image positioning.' },
                          { title: 'Borders & Shadows', icon: <FiMaximize2 />, desc: 'Add depth: Border radius, border styles, box-shadows, and element opacity.' },
                          { title: 'Spacing Controls', icon: <FiMove />, desc: 'Pixel-perfect alignment: Detailed control over individual sides for margins and padding.' },
                       ].map((item, i) => (
                          <AccordionItem key={i} value={`item-${i}`} className="border border-[#1a1a1a] rounded-2xl px-4 bg-[#111]/50">
                             <AccordionTrigger className="text-white hover:text-purple-500 font-bold text-xs uppercase tracking-[0.15em] no-underline py-5 group">
                                <div className="flex items-center gap-4">
                                   <span className="text-purple-500 group-hover:scale-110 transition-transform">{item.icon}</span> {item.title}
                                </div>
                             </AccordionTrigger>
                             <AccordionContent className="text-[#666] text-xs leading-relaxed font-medium pl-10 pb-5">
                                {item.desc}
                             </AccordionContent>
                          </AccordionItem>
                       ))}
                    </Accordion>
                 </div>
                 
                 <div className="p-10 bg-purple-500/5 border border-purple-500/20 rounded-[2.5rem] space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"><FiSliders size={150} /></div>
                    <h4 className="text-purple-400 font-black uppercase tracking-widest text-xs">Contextual Intelligence</h4>
                    <p className="text-sm text-[#777] leading-relaxed font-medium">
                       Our panel is context-aware. If you select a container set to <strong>flex</strong>, it will automatically inject alignment and justification controls. 
                       For images, it prioritize aspect ratio and object-fit settings.
                    </p>
                    <div className="bg-[#080808] p-6 rounded-2xl border border-[#1a1a1a] font-mono text-xs text-purple-400/70 leading-relaxed shadow-inner">
                       <span className="text-[#444] block mb-2">// Auto-generated Styles</span>
                       {`.selected-element {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, ...);
  border-radius: 24px;
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
                subtitle="The definitive guide to CSS Keyframing and Timelines."
                icon={<FiClock />}
                color="red"
              />

              <div className="space-y-16">
                <div className="prose prose-invert max-w-none text-[#888] font-medium leading-relaxed text-lg">
                  <p>
                    The Timeline Panel is a professional-grade animation suite. It allows you to create complex CSS @keyframes animations using a visual interface. 
                    Every track you create is converted into standard CSS, ensuring your animations work on any modern browser without external libraries.
                  </p>
                </div>

                {/* Detailed Button Breakdown */}
                <div className="grid md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                         <FiSettings className="text-red-500" /> Toolbar Controls
                      </h4>
                      <div className="grid gap-4">
                         {[
                            { icon: <FiPlus />, label: 'Add Track', desc: 'Adds a new animation lane. If an element is selected in Visual mode, it automatically uses that selector.' },
                            { icon: <FiPlay />, label: 'Play / Preview', desc: 'Runs all animations in real-time on the stage so you can check timing and feel.' },
                            { icon: <FiRefreshCw />, label: 'Reset Playhead', desc: 'Instantly stops playback and returns the playhead to 0.00s.' },
                            { icon: <FiCheck />, label: 'Apply to Page', desc: 'Injects the generated CSS into your HTML file. This makes animations permanent.' },
                            { icon: <FiZoomIn />, label: 'Timeline Zoom', desc: 'Scale the timeline ruler for finer precision (up to 0.1s increments).' },
                         ].map((btn, i) => (
                            <div key={i} className="flex gap-4 p-5 rounded-2xl bg-[#111] border border-[#222] hover:bg-red-500/5 transition-colors">
                               <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">{btn.icon}</div>
                               <div>
                                  <strong className="text-white text-sm block mb-1 uppercase tracking-wider">{btn.label}</strong>
                                  <span className="text-xs text-[#666] leading-relaxed font-medium">{btn.desc}</span>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-8">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                         <FiMousePointer className="text-red-500" /> Direct Interaction
                      </h4>
                      <Card className="bg-[#0a0a0a] border-[#222] p-8 space-y-8">
                         <div className="space-y-6">
                            <div className="flex gap-5">
                               <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-red-500 flex-shrink-0 shadow-lg">
                                  <FiMove />
                               </div>
                               <div>
                                  <h5 className="text-white font-bold mb-1 uppercase tracking-tight">Drag to Move (Delay)</h5>
                                  <p className="text-xs text-[#666] leading-relaxed font-medium">Click and hold the middle of any track bar to move it. This changes the <strong>animation-delay</strong> property.</p>
                               </div>
                            </div>
                            <div className="flex gap-5">
                               <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-red-500 flex-shrink-0 shadow-lg">
                                  <FiMaximize2 />
                               </div>
                               <div>
                                  <h5 className="text-white font-bold mb-1 uppercase tracking-tight">Resize to Scale (Duration)</h5>
                                  <p className="text-xs text-[#666] leading-relaxed font-medium">Drag the right handle of a track bar to stretch it. This changes the <strong>animation-duration</strong> property.</p>
                               </div>
                            </div>
                            <div className="flex gap-5">
                               <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-red-500 flex-shrink-0 shadow-lg">
                                  <FiCommand />
                               </div>
                               <div>
                                  <h5 className="text-white font-bold mb-1 uppercase tracking-tight">Context Menu</h5>
                                  <p className="text-xs text-[#666] leading-relaxed font-medium">Right-click any track to Duplicate it, Reset its position, or change its Animation Preset instantly.</p>
                               </div>
                            </div>
                         </div>
                      </Card>
                   </div>
                </div>

                <div className="space-y-10">
                   <h4 className="text-white font-black uppercase tracking-widest text-sm text-center">The Track Inspector</h4>
                   <div className="grid md:grid-cols-3 gap-6">
                      {[
                         { title: 'Animation Presets', desc: 'Choose from professional presets like FadeIn, Bounce, Spin, Shake, or Flip. Each one generates custom @keyframes.' },
                         { title: 'Easing Functions', desc: 'Control the feel of the motion with Linear, Ease-In, Ease-Out, or Ease-In-Out timing functions.' },
                         { title: 'Iteration Count', desc: 'Set how many times the animation plays. Use "infinite" for continuous loops or "1" for a single trigger.' },
                      ].map((box, i) => (
                         <div key={i} className="p-8 bg-[#111] rounded-3xl border border-[#222] text-center space-y-4 hover:border-red-500/20 transition-all">
                            <h5 className="text-white font-black uppercase tracking-widest text-xs text-red-500">{box.title}</h5>
                            <p className="text-xs text-[#666] leading-relaxed font-medium">{box.desc}</p>
                         </div>
                      ))}
                   </div>
                </div>

                <Alert className="bg-red-500/5 border-red-500/20 text-red-400 rounded-[2rem] p-8 shadow-2xl">
                   <div className="flex gap-6 items-center">
                      <FiAlertCircle size={40} className="flex-shrink-0" />
                      <div>
                         <AlertTitle className="text-white font-black text-lg uppercase tracking-tight mb-2">How It Works (Technical)</AlertTitle>
                         <AlertDescription className="text-sm text-[#777] leading-relaxed font-medium">
                            When you click <strong>Apply to Page</strong>, our engine parses your tracks and generates a standard CSS block. 
                            It then injects this into a <code>&lt;style id="timeline-animations"&gt;</code> tag in your HTML. 
                            This means your animations are native, fast, and SEO-friendly.
                         </AlertDescription>
                      </div>
                   </div>
                </Alert>
              </div>
            </section>

            {/* Section: AI Intelligence */}
            <section id="ai-assistant" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="AI Code Copilot" 
                subtitle="High-performance code completion powered by Pollinations AI."
                icon={<FiCpu />}
                color="yellow"
              />

              <div className="space-y-16">
                <div className="prose prose-invert max-w-none text-[#888] font-medium leading-relaxed text-lg">
                  <p>
                    Our editor features a state-of-the-art <strong>AI Code Copilot</strong> that predicts your next lines of code in real-time. 
                    Built on the <code>pollinations.ai</code> API, it understands context, follows your coding style, and suggests entire functions instantly.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                         <FiZap className="text-yellow-500" /> How It Works
                      </h4>
                      <div className="space-y-6">
                         <div className="flex gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 flex-shrink-0 shadow-lg">
                               <FiType />
                            </div>
                            <div>
                               <h5 className="text-white font-bold mb-1 uppercase tracking-tight">Ghost Text Preview</h5>
                               <p className="text-xs text-[#666] leading-relaxed font-medium">As you type, suggestions appear in <strong>Ghost Text</strong> (grayed out). This is exactly how GitHub Copilot functions.</p>
                            </div>
                         </div>
                         <div className="flex gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 flex-shrink-0 shadow-lg">
                               <FiCheck />
                            </div>
                            <div>
                               <h5 className="text-white font-bold mb-1 uppercase tracking-tight">One-Key Acceptance</h5>
                               <p className="text-xs text-[#666] leading-relaxed font-medium">Simply press the <strong>Tab</strong> key to accept the suggestion. It will be instantly committed to your code.</p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <Card className="bg-[#0a0a0a] border-[#222] p-8 space-y-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><FiCommand size={100} /></div>
                      <h4 className="text-white font-black uppercase tracking-widest text-xs border-b border-[#1a1a1a] pb-4">AI Pro Tips</h4>
                      <ul className="space-y-4">
                         <li className="flex items-start gap-3">
                            <FiChevronRight className="text-yellow-500 mt-1 flex-shrink-0" />
                            <p className="text-xs text-[#777] font-medium leading-relaxed"><strong>Force Trigger:</strong> If the AI is idle, press <code>Ctrl + Space</code> or use the AI button in the status bar.</p>
                         </li>
                         <li className="flex items-start gap-3">
                            <FiChevronRight className="text-yellow-500 mt-1 flex-shrink-0" />
                            <p className="text-xs text-[#777] font-medium leading-relaxed"><strong>Context Awareness:</strong> The AI looks at 2000 characters before your cursor to ensure the suggestion fits perfectly.</p>
                         </li>
                         <li className="flex items-start gap-3">
                            <FiChevronRight className="text-yellow-500 mt-1 flex-shrink-0" />
                            <p className="text-xs text-[#777] font-medium leading-relaxed"><strong>Language Support:</strong> Works across HTML, CSS, JavaScript, and 20+ other programming languages.</p>
                         </li>
                      </ul>
                   </Card>
                </div>
              </div>
            </section>

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
                  <div key={i} className="flex justify-between items-center p-6 bg-[#111] rounded-2xl border border-[#222] hover:border-green-500/40 hover:bg-[#161616] transition-all group">
                    <span className="text-[#888] text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-white transition-colors">{s.action}</span>
                    <kbd className="bg-[#1a1a1a] px-3 py-1.5 rounded-lg text-[11px] text-green-500 font-black border border-[#222] shadow-2xl group-hover:scale-110 transition-transform">{s.key}</kbd>
                  </div>
                ))}
              </div>
            </section>

            {/* Section: Pro Tips */}
            <section id="pro-tips" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Pro Tips & Tricks" 
                subtitle="Advanced workflows to push your development speed to the limit."
                icon={<FiZap />}
                color="orange"
              />

              <div className="grid md:grid-cols-2 gap-8">
                 <Card className="bg-[#111] border-[#222] p-8 space-y-4 hover:border-orange-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2"><FiCode /></div>
                    <h4 className="text-white font-black uppercase tracking-tight">Emmet Mastery</h4>
                    <p className="text-sm text-[#666] leading-relaxed font-medium">
                       Don't write tags manually. Type <code>div.container&gt;ul&gt;li*5</code> and press <strong>Tab</strong> in the code editor to generate a full list structure instantly.
                    </p>
                 </Card>
                 <Card className="bg-[#111] border-[#222] p-8 space-y-4 hover:border-orange-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2"><FiMousePointer /></div>
                    <h4 className="text-white font-black uppercase tracking-tight">Multi-Select Magic</h4>
                    <p className="text-sm text-[#666] leading-relaxed font-medium">
                       Hold <strong>Alt</strong> and click in multiple places in the code editor to type in several lines at once. Perfect for changing multiple class names.
                    </p>
                 </Card>
              </div>
            </section>

            {/* Section: Deployment */}
            <section id="deployment" className="scroll-mt-32 space-y-12 pt-20 border-t border-[#1a1a1a]">
              <SectionHeader 
                title="Deployment Guide" 
                subtitle="How to take your project from the editor to a live server."
                icon={<FiShare2 />}
                color="blue"
              />

              <div className="space-y-10">
                 <div className="prose prose-invert max-w-none text-[#888] font-medium leading-relaxed">
                    <p>
                       Once your project is ready, you need to host it. Since our editor generates clean, standard HTML/CSS/JS, you can host it anywhere.
                    </p>
                 </div>

                 <div className="grid md:grid-cols-3 gap-6">
                    {[
                       { title: 'Vercel / Netlify', desc: 'The easiest way. Simply upload your exported ZIP or connect a GitHub repo.' },
                       { title: 'GitHub Pages', desc: 'Free hosting for static sites. Create a repo, push your files, and enable Pages in settings.' },
                       { title: 'Shared Hosting', desc: 'Use FileZilla or any FTP client to upload your files to the `public_html` folder.' },
                    ].map((step, i) => (
                       <div key={i} className="p-6 bg-[#111] rounded-3xl border border-[#222] space-y-3">
                          <h5 className="text-white font-black uppercase tracking-widest text-[10px] text-blue-500">Method 0{i+1}</h5>
                          <h4 className="text-white font-bold">{step.title}</h4>
                          <p className="text-xs text-[#666] leading-relaxed">{step.desc}</p>
                       </div>
                    ))}
                 </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#1a1a1a] pt-24 pb-32 text-center space-y-10">
              <div className="flex justify-center items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-[#e34c26] flex items-center justify-center text-white font-black text-sm shadow-2xl shadow-orange-500/20">H</div>
                 <span className="text-white font-black tracking-[0.4em] text-sm uppercase">HTML Editor Pro v2.0</span>
              </div>
              <p className="text-[#444] text-sm font-bold max-w-xl mx-auto leading-relaxed italic">
                "Built for the dreamers, the coders, and the designers who refuse to compromise."
              </p>
              <div className="flex justify-center gap-10 text-[11px] font-black text-[#222] uppercase tracking-[0.3em]">
                <Link href="/privacy" className="hover:text-orange-500 transition-colors no-underline">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-orange-500 transition-colors no-underline">Terms of Service</Link>
                <a href="#" className="hover:text-orange-500 transition-colors">Contact Engineering</a>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Documentation;
