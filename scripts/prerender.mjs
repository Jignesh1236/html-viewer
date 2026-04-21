#!/usr/bin/env node
/**
 * Static prerender for HTML Editor Pro.
 *
 * Reads dist/index.html (the Vite build output) and, for each route, writes
 * a folder with its own index.html where the SEO-critical tags
 * (title, description, canonical, OG/Twitter, JSON-LD) are baked in and a
 * crawler-visible <noscript> + hidden content block contains real text so
 * Googlebot sees full content on the very first HTML response — without
 * waiting for JS to execute.
 *
 * No SSR runtime needed — the React app still hydrates the page exactly the
 * same way; we just enrich the static shell per route.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PRIMARY = 'https://html-viewer-gray-beta.vercel.app';

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('[prerender] dist/index.html not found — run vite build first.');
  process.exit(1);
}

const SHELL = readFileSync(join(DIST, 'index.html'), 'utf8');

/** Per-route SEO + crawler content. */
const ROUTES = [
  {
    path: '/',
    title: 'HTML Editor Pro — Free Online HTML, CSS & JS Editor with Visual Designer',
    description:
      'Free browser-based HTML editor with Monaco code engine, drag-and-drop visual designer, 60+ CSS animations, live preview and one-click ZIP export. No signup, no install.',
    h1: 'HTML Editor Pro — Build, Design & Animate in your browser',
    intro:
      'HTML Editor Pro is a free online HTML, CSS and JavaScript editor with a Photoshop-style visual designer, animation timeline with 60+ presets, multi-file project support, live preview, and one-click ZIP export. Works offline as a PWA. No signup.',
    bullets: [
      'Monaco-powered code editor with HTML, CSS, JS, JSON, Markdown, TypeScript syntax highlighting',
      'Visual drag-and-drop designer — click any element, move, resize, rotate',
      'Properties Panel with 160+ CSS controls across 20 sections (typography, gradients, filters, clip-path, transform 3D, scroll snap, columns, masks)',
      'Animation Timeline with 60+ pre-built keyframes across 7 categories + custom @keyframes editor',
      'Multi-file project explorer with drag-and-drop import and ZIP export',
      'Installable PWA — works offline after first visit',
    ],
    schema: 'app',
  },
  {
    path: '/docs',
    title: 'Documentation — HTML Editor Pro | Full Reference & Tutorials',
    description:
      'Complete documentation for HTML Editor Pro: getting started, code editor, visual designer, animation timeline, properties panel, project files, ZIP export, keyboard shortcuts, FAQ.',
    h1: 'HTML Editor Pro Documentation',
    intro:
      'Complete reference for the HTML Editor Pro web app. Learn the code editor, visual designer, animation timeline, properties panel, file explorer, keyboard shortcuts and ZIP export workflow.',
    bullets: [
      'Getting started — open the editor, switch between Code / Visual / Split mode',
      'Code editor — Monaco features, multi-file tabs, find & replace',
      'Visual designer — select / move / resize / rotate elements',
      'Properties panel — every CSS section explained',
      'Animation timeline — apply presets and create custom @keyframes',
      'Keyboard shortcuts and FAQ',
    ],
    schema: 'docs',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy — HTML Editor Pro',
    description:
      'Privacy policy for HTML Editor Pro. We do not collect your code or personal data. All projects are stored locally in your browser via localStorage.',
    h1: 'Privacy Policy',
    intro:
      'HTML Editor Pro respects your privacy. All your project files, settings and animations are stored locally in your browser (localStorage). We do not upload, read, sell or share your code.',
    bullets: [
      'No account required — no email, no signup',
      'All files stored locally in your browser',
      'Anonymous analytics (page views) only',
      'Google AdSense may set cookies — see their policy',
      'You can clear all data anytime via your browser settings',
    ],
    schema: 'page',
  },
  {
    path: '/terms',
    title: 'Terms of Service — HTML Editor Pro',
    description:
      'Terms of service for HTML Editor Pro — a free browser-based HTML/CSS/JS editor. Provided as-is for personal and commercial use.',
    h1: 'Terms of Service',
    intro:
      'HTML Editor Pro is provided free of charge, as-is, without warranty. You retain full ownership of every line of code you write. By using this site you agree to these terms.',
    bullets: [
      'Free for personal and commercial use',
      'You own your code — we never claim copyright',
      'No warranty — provided as-is',
      'Do not use the editor to generate illegal content',
      'We may update these terms; continued use constitutes acceptance',
    ],
    schema: 'page',
  },
];

/** Build a JSON-LD blob appropriate to the route. */
function jsonLd(route) {
  const url = `${PRIMARY}${route.path === '/' ? '/' : route.path}`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${PRIMARY}/` },
      ...(route.path === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: route.h1, item: url }]),
    ],
  };
  if (route.schema === 'app') {
    return [
      breadcrumb,
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'HTML Editor Pro',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any (browser)',
        url,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '128' },
        description: route.description,
      },
    ];
  }
  if (route.schema === 'docs') {
    return [
      breadcrumb,
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: route.h1,
        description: route.description,
        url,
        author: { '@type': 'Person', name: 'Jignesh D Maru' },
        publisher: {
          '@type': 'Organization',
          name: 'HTML Editor Pro',
          logo: { '@type': 'ImageObject', url: `${PRIMARY}/icon-512.png` },
        },
      },
    ];
  }
  return [
    breadcrumb,
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: route.h1,
      description: route.description,
      url,
    },
  ];
}

function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function staticBlock(route) {
  const items = route.bullets.map(b => `      <li>${escape(b)}</li>`).join('\n');
  // Both <noscript> (shown to no-JS users) and a hidden visually-clipped
  // <div> (parsed by crawlers but invisible to humans) carry the text.
  return `
<noscript>
  <main style="max-width:780px;margin:40px auto;padding:0 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#111">
    <h1>${escape(route.h1)}</h1>
    <p>${escape(route.intro)}</p>
    <ul>
${items}
    </ul>
    <p>This editor is fully interactive — please <a href="https://www.enable-javascript.com/" rel="nofollow">enable JavaScript</a> to use the visual designer, code editor and animation timeline.</p>
  </main>
</noscript>
<div id="prerender-content" aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;">
  <h1>${escape(route.h1)}</h1>
  <p>${escape(route.intro)}</p>
  <ul>
${items}
  </ul>
</div>`;
}

function renderRoute(route) {
  const url = `${PRIMARY}${route.path === '/' ? '/' : route.path}`;
  const ld = jsonLd(route)
    .map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join('\n    ');

  let html = SHELL;

  // Title
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(route.title)}</title>`);

  // <meta name="description">
  html = html.replace(
    /<meta\s+name="description"[^>]*\/?>(?:\s*<\/meta>)?/i,
    `<meta name="description" content="${escape(route.description)}" />`
  );

  // canonical
  html = html.replace(
    /<link\s+rel="canonical"[^>]*\/?>/i,
    `<link rel="canonical" href="${url}" />`
  );

  // OG title / description / url
  html = html.replace(
    /<meta\s+property="og:title"[^>]*\/?>/i,
    `<meta property="og:title" content="${escape(route.title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"[^>]*\/?>/i,
    `<meta property="og:description" content="${escape(route.description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"[^>]*\/?>/i,
    `<meta property="og:url" content="${url}" />`
  );

  // Twitter
  html = html.replace(
    /<meta\s+name="twitter:title"[^>]*\/?>/i,
    `<meta name="twitter:title" content="${escape(route.title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"[^>]*\/?>/i,
    `<meta name="twitter:description" content="${escape(route.description)}" />`
  );

  // Inject JSON-LD just before </head>
  html = html.replace('</head>', `    ${ld}\n  </head>`);

  // Inject crawler-visible content right after <div id="root"> opens
  html = html.replace(
    /(<div\s+id=["']root["'][^>]*>)/i,
    `$1${staticBlock(route)}`
  );

  return html;
}

let written = 0;
for (const route of ROUTES) {
  const html = renderRoute(route);
  const outDir = route.path === '/' ? DIST : join(DIST, route.path.replace(/^\//, ''));
  if (route.path !== '/') mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  console.log(`[prerender] ${route.path.padEnd(12)} → ${outDir.replace(DIST, 'dist')}/index.html`);
  written++;
}

// Also drop a 404.html that mirrors the not-found page for static hosts that
// honor it (GitHub Pages, Cloudflare Pages).
const notFound = renderRoute({
  path: '/404',
  title: '404 — Page not found · HTML Editor Pro',
  description: 'The page you requested does not exist. Return to the HTML Editor Pro home page.',
  h1: '404 — Page not found',
  intro: 'The page you are looking for does not exist on this site. Use the link below to return home.',
  bullets: ['Return to the home page', 'Read the documentation', 'Open the editor'],
  schema: 'page',
});
writeFileSync(join(DIST, '404.html'), notFound, 'utf8');
console.log(`[prerender] 404          → dist/404.html`);

console.log(`[prerender] Done — ${written} routes prerendered + 404.`);
