import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FiShield, FiLock, FiDatabase, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

const PrivacyPolicy: React.FC = () => {
  React.useEffect(() => {
    document.title = "Privacy Policy | HTML Editor Pro";
    window.scrollTo(0, 0);

    // Set meta tags
    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', 'Privacy Policy for HTML Editor Pro. Learn how we manage your data - all files are stored locally in your browser with no cloud sync. Your code stays private and secure.', 'name');
    setMeta('keywords', 'HTML editor privacy policy, online HTML editor data storage, browser-based editor privacy, local storage editor, no cloud code editor', 'name');
    setMeta('og:title', 'Privacy Policy | HTML Editor Pro', 'property');
    setMeta('og:description', 'Privacy-first approach: Your files are stored locally in your browser. No cloud sync, no backend database. Your code stays private.', 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:url', 'https://html-viewer-gray-beta.vercel.app/privacy', 'property');
    setMeta('og:image', 'https://html-viewer-gray-beta.vercel.app/og-image.jpg', 'property');
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('twitter:title', 'Privacy Policy | HTML Editor Pro', 'name');
    setMeta('twitter:description', 'Privacy-first approach: Your files are stored locally in your browser. No cloud sync, no backend database.', 'name');
    setMeta('twitter:image', 'https://html-viewer-gray-beta.vercel.app/og-image.jpg', 'name');

    // Set canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://html-viewer-gray-beta.vercel.app/privacy');

    // Set JSON-LD
    const ldId = '__privacy_jsonld__';
    document.getElementById(ldId)?.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = ldId;
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': 'https://html-viewer-gray-beta.vercel.app/privacy',
          'url': 'https://html-viewer-gray-beta.vercel.app/privacy',
          'name': 'Privacy Policy',
          'description': 'Privacy Policy for HTML Editor Pro. Learn how we manage your data - all files are stored locally in your browser with no cloud sync.',
          'isPartOf': { '@id': 'https://html-viewer-gray-beta.vercel.app/#website' },
          'datePublished': '2026-04-21',
          'dateModified': '2026-04-24',
          'author': { '@type': 'Person', name: 'Jignesh D Maru' },
          'breadcrumb': {
            '@type': 'BreadcrumbList',
            'itemListElement': [
              { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://html-viewer-gray-beta.vercel.app/' },
              { '@type': 'ListItem', 'position': 2, 'name': 'Privacy Policy', 'item': 'https://html-viewer-gray-beta.vercel.app/privacy' }
            ]
          }
        }
      ]
    });
    document.head.appendChild(script);

    return () => { document.getElementById(ldId)?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-[#ccc] font-sans selection:bg-orange-500/30">
      <header className="sticky top-0 z-[100] w-full border-b border-[#1a1a1a] bg-[#080808]/90 backdrop-blur-2xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 no-underline group">
            <div className="w-11 h-11 rounded-2xl bg-[#e34c26] flex items-center justify-center text-white font-black shadow-[0_8px_25px_rgba(227,76,38,0.4)] group-hover:scale-105 transition-transform">H</div>
            <span className="text-lg font-black text-white tracking-tighter uppercase">Privacy <span className="text-orange-500">Center</span></span>
          </Link>
          <Link href="/docs">
            <Button variant="ghost" className="text-xs font-black hover:bg-white/5 uppercase tracking-widest px-6 h-10 border border-white/5 rounded-full flex items-center gap-2">
              <FiArrowLeft /> Documentation
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-20 max-w-4xl">
        <div className="space-y-16">
          <section className="text-center space-y-6">
            <div className="w-20 h-20 rounded-[2.5rem] bg-orange-500/10 flex items-center justify-center text-orange-500 mx-auto border border-orange-500/20 shadow-2xl shadow-orange-500/5">
              <FiShield size={40} />
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">Privacy Policy</h1>
            <p className="text-xl text-[#666] font-medium leading-relaxed">Last Updated: April 21, 2026</p>
          </section>

          <Card className="bg-[#111] border-[#222] p-8 md:p-12 space-y-12 rounded-[2rem]">
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <FiDatabase className="text-orange-500" size={24} />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">How We Manage Your Data</h2>
              </div>
              <div className="prose prose-invert max-w-none text-[#888] leading-relaxed font-medium space-y-4">
                <p>
                  At <strong>HTML Editor Pro</strong>, we take a "Privacy-First" approach. Unlike traditional editors, we do not store your source code or project files on our servers.
                </p>
                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <h4 className="text-white font-bold mb-2 flex items-center gap-2"><FiLock className="text-green-500" /> Local Storage</h4>
                    <p className="text-xs">Your files are stored directly in your browser's <b>IndexedDB</b> and <b>LocalStorage</b>. They never leave your device unless you export them.</p>
                  </div>
                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <h4 className="text-white font-bold mb-2 flex items-center gap-2"><FiEyeOff className="text-blue-500" /> No Cloud Sync</h4>
                    <p className="text-xs">We do not have a backend database for your projects. Your code is yours alone, completely private and secure.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6 pt-12 border-t border-[#1a1a1a]">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">1. Information We Collect</h3>
              <p className="text-[#888] font-medium leading-relaxed">
                We collect minimal data required to provide and improve the service:
              </p>
              <ul className="list-disc pl-6 space-y-3 text-[#777] text-sm font-medium">
                <li><strong>Analytics:</strong> Anonymous usage patterns (e.g., which features are used most) to improve UI/UX.</li>
                <li><strong>Error Logs:</strong> Crash reports to fix bugs and improve stability.</li>
                <li><strong>Ad Preferences:</strong> Google AdSense may use cookies to serve personalized ads.</li>
              </ul>
            </section>

            <section className="space-y-6 pt-12 border-t border-[#1a1a1a]">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">2. Cookies & Third Parties</h3>
              <p className="text-[#888] font-medium leading-relaxed text-sm">
                We use Google AdSense for monetization. Google may use cookies to serve ads based on your prior visits to our website or other websites. 
                You can opt-out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="text-orange-500 hover:underline">Google Ad Settings</a>.
              </p>
            </section>

            <section className="space-y-6 pt-12 border-t border-[#1a1a1a]">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">3. Data Security</h3>
              <p className="text-[#888] font-medium leading-relaxed text-sm">
                Since your data is local, the security of your files depends on the security of your device and browser. 
                We recommend clearing your browser cache if you are using the editor on a public computer.
              </p>
            </section>
          </Card>

          <footer className="text-center pt-12">
            <p className="text-[#444] text-xs font-bold uppercase tracking-widest">Questions about your privacy?</p>
            <a href="mailto:privacy@htmleditor.pro" className="text-orange-500 font-black text-sm hover:underline mt-2 inline-block">privacy@htmleditor.pro</a>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
