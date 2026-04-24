import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FiFileText, FiCheckCircle, FiAlertTriangle, FiUserCheck, FiArrowLeft } from 'react-icons/fi';

const TermsOfService: React.FC = () => {
  React.useEffect(() => {
    document.title = "Terms of Service | HTML Editor Pro";
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

    setMeta('description', 'Terms of Service for HTML Editor Pro. Agreement for using the free online HTML, CSS and JavaScript editor with visual designer and live preview.', 'name');
    setMeta('keywords', 'HTML editor terms of service, online HTML editor agreement, web editor terms, code editor terms, HTML builder terms', 'name');
    setMeta('og:title', 'Terms of Service | HTML Editor Pro', 'property');
    setMeta('og:description', 'Terms of Service for HTML Editor Pro. Agreement for using the free online HTML, CSS and JavaScript editor.', 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:url', 'https://html-viewer-gray-beta.vercel.app/terms', 'property');
    setMeta('og:image', 'https://html-viewer-gray-beta.vercel.app/og-image.jpg', 'property');
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('twitter:title', 'Terms of Service | HTML Editor Pro', 'name');
    setMeta('twitter:description', 'Terms of Service for HTML Editor Pro. Agreement for using the free online HTML, CSS and JavaScript editor.', 'name');
    setMeta('twitter:image', 'https://html-viewer-gray-beta.vercel.app/og-image.jpg', 'name');

    // Set canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://html-viewer-gray-beta.vercel.app/terms');

    // Set JSON-LD
    const ldId = '__terms_jsonld__';
    document.getElementById(ldId)?.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = ldId;
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': 'https://html-viewer-gray-beta.vercel.app/terms',
          'url': 'https://html-viewer-gray-beta.vercel.app/terms',
          'name': 'Terms of Service',
          'description': 'Terms of Service for HTML Editor Pro. Agreement for using the free online HTML, CSS and JavaScript editor with visual designer and live preview.',
          'isPartOf': { '@id': 'https://html-viewer-gray-beta.vercel.app/#website' },
          'datePublished': '2026-04-21',
          'dateModified': '2026-04-24',
          'author': { '@type': 'Person', name: 'Jignesh D Maru' },
          'breadcrumb': {
            '@type': 'BreadcrumbList',
            'itemListElement': [
              { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://html-viewer-gray-beta.vercel.app/' },
              { '@type': 'ListItem', 'position': 2, 'name': 'Terms of Service', 'item': 'https://html-viewer-gray-beta.vercel.app/terms' }
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
            <span className="text-lg font-black text-white tracking-tighter uppercase">Terms <span className="text-orange-500">Service</span></span>
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
            <div className="w-20 h-20 rounded-[2.5rem] bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto border border-blue-500/20 shadow-2xl shadow-blue-500/5">
              <FiFileText size={40} />
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">Terms of Service</h1>
            <p className="text-xl text-[#666] font-medium leading-relaxed">Agreement for Using HTML Editor Pro</p>
          </section>

          <Card className="bg-[#111] border-[#222] p-8 md:p-12 space-y-12 rounded-[2rem]">
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <FiCheckCircle className="text-blue-500" size={24} />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">1. Acceptance of Terms</h2>
              </div>
              <p className="text-[#888] font-medium leading-relaxed text-sm">
                By accessing and using <strong>HTML Editor Pro</strong>, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our tool.
              </p>
            </section>

            <section className="space-y-6 pt-12 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-4">
                <FiUserCheck className="text-green-500" size={24} />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">2. User Responsibility</h2>
              </div>
              <div className="prose prose-invert max-w-none text-[#888] text-sm font-medium space-y-4">
                <p>As a user, you are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The content you create, edit, or host using the editor.</li>
                  <li>Ensuring your code does not violate any laws or third-party copyrights.</li>
                  <li>Backing up your own files (since we do not store them on our servers).</li>
                </ul>
              </div>
            </section>

            <section className="space-y-6 pt-12 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-4">
                <FiAlertTriangle className="text-yellow-500" size={24} />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">3. Disclaimer of Warranty</h2>
              </div>
              <p className="text-[#888] font-medium leading-relaxed text-sm italic">
                "HTML Editor Pro is provided 'as is' without any warranties. We are not responsible for any data loss, bugs, or downtime that may occur."
              </p>
            </section>

            <section className="space-y-6 pt-12 border-t border-[#1a1a1a]">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">4. Restrictions</h3>
              <p className="text-[#888] font-medium leading-relaxed text-sm">
                You may not use this tool for any illegal activities, distributing malware, or phishing schemes. 
                We reserve the right to block access to the tool if misuse is detected.
              </p>
            </section>
          </Card>

          <footer className="text-center pt-12">
            <p className="text-[#444] text-xs font-bold uppercase tracking-widest">Effective Date: April 21, 2026</p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
