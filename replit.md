# HTML Editor Pro

## Overview

A free, browser-based HTML/CSS/JavaScript editor with a Monaco code editor, drag-and-drop visual designer, CSS animation timeline, live preview, and one-click ZIP export. Single-package React + Vite app — all source lives at the project root with one shared `node_modules`.

**Production domains:**
- Primary: <https://html-viewer-gray-beta.vercel.app/>
- Secondary: <https://html-viewer-f2v.pages.dev/>

## Stack

| Concern         | Choice                                  |
| --------------- | --------------------------------------- |
| Framework       | React 19                                |
| Build tool      | Vite 7                                  |
| Language        | TypeScript 5.9                          |
| Package manager | pnpm (single package, no workspace)     |
| Styling         | Tailwind CSS v4 + Radix UI              |
| Code editor     | Monaco Editor (VS Code engine)          |
| State           | Zustand                                 |
| Routing         | Wouter                                  |
| Icons           | react-icons (Feather set)               |
| Export          | jszip + file-saver                      |

## Project Layout

```
.
├── index.html                  Vite entry + ALL <head> SEO metadata
├── public/
│   ├── ads.txt                 Google AdSense authorized seller
│   ├── robots.txt              Search-engine crawl rules
│   ├── sitemap.xml             Sitemap (/, /seo, /docs)
│   ├── manifest.json           PWA manifest
│   ├── sw.js                   Service worker (offline shell)
│   ├── favicon.svg             Scalable favicon
│   ├── icon-192.png /-512.png  PWA + Apple Touch icons
│   ├── og-image.jpg /.png      Open Graph share images
│   ├── og-seo-tutorial.png     OG image for /seo
│   └── 404.html                Static 404
├── src/
│   ├── main.tsx                Wouter mounting point
│   ├── App.tsx                 Top-level routes (/, /docs, /privacy, /terms, /seo)
│   ├── index.css               Tailwind base + global styles
│   ├── pages/
│   │   ├── Documentation.tsx   Full /docs page (~1180 lines, sectioned)
│   │   ├── SEOPage.tsx         /seo HTML + SEO tutorial (5 tabs)
│   │   ├── PrivacyPolicy.tsx
│   │   ├── TermsOfService.tsx
│   │   └── not-found.tsx
│   ├── components/             Editor UI: MenuBar, FileExplorer, CodeEditor,
│   │                           PreviewPane, VisualEditor, PropertiesPanel,
│   │                           Timeline, WindowManager, etc.
│   ├── store/                  Zustand stores (files, layout, timeline)
│   ├── hooks/                  Custom React hooks
│   ├── lib/                    Pure helpers (parsing, file ops, etc.)
│   └── utils/                  Misc utilities
├── vite.config.ts              Vite config (BASE_PATH, port 21192)
├── tsconfig.json
├── package.json
├── vercel.json                 Vercel rewrites for SPA
└── wrangler.toml               Cloudflare Pages config
```

## Routes

| Path        | Component                | Purpose                                                           |
| ----------- | ------------------------ | ----------------------------------------------------------------- |
| `/`         | App (editor)             | Main HTML editor                                                  |
| `/docs`     | `Documentation.tsx`      | Detailed documentation with FAQ schema                            |
| `/seo`      | `SEOPage.tsx`            | Tutorial: charset, HTML tags, CSS, Image SEO, Open Graph, favicons |
| `/privacy`  | `PrivacyPolicy.tsx`      | Privacy policy                                                    |
| `/terms`    | `TermsOfService.tsx`     | Terms of service                                                  |

## Features

### Editor Core
- VS Code-style dark theme (orange/amber `#e34c26` accent — HTML5 brand color)
- Monaco code editor for HTML/CSS/JS with full syntax highlighting and IntelliSense
- Multi-file project support with File Explorer (upload, create, rename, delete)
- Live preview panel with viewport switching (desktop / tablet / mobile)
- Hard-refresh preview command (Ctrl+R)

### Visual Designer
- Element selection, move, resize, rotate
- Properties Panel covering full CSS surface: typography, layout, background, borders, shadows, transforms, animations
- Visual edits write back to the HTML as inline styles, keeping code and canvas in sync

### Animation Timeline
- Draggable animation tracks per element
- Play preview inside the iframe
- "Apply to Page" injects generated keyframes into a `<style id="__timeline-anim-style">` tag in the active HTML

### Window System
- Floating + dockable panel system with per-window default sizes
- Snap zones (left/right/top/bottom) and resizable docked panels via drag dividers
- Layout persisted in localStorage key `html-editor-win-layout-v4`

### Export & Persistence
- One-click export to ZIP (jszip + file-saver)
- All files & layout auto-saved to localStorage (no server, no account)
- Service worker caches the editor shell for offline launch

### Documentation & Tutorials
- `/docs` — sectioned full reference with TOC sidebar, keyboard shortcuts, animation presets, mobile guide, and FAQ (drives FAQ rich results)
- `/seo` — five-tab interactive HTML & SEO tutorial used as a teaching aid

## SEO Configuration

All SEO metadata lives in `index.html`. The setup follows current Google guidance and is structured so every section can be edited independently.

### Meta tags
- `<title>` and `<meta name="description">` — primary SERP signals
- `<meta name="keywords">` — broad long-tail keyword set covering "HTML editor online", "Monaco editor online", "free code editor", JS playground alternatives (codepen / jsfiddle / jsbin / replit / stackblitz), CSS animation editor, and SEO tutorial keywords
- `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">` — full SERP feature opt-in
- `<meta name="googlebot">` and `<meta name="bingbot">` explicit overrides
- `<meta name="google-site-verification">` for Search Console ownership
- `<link rel="canonical">` to the primary domain + `<link rel="alternate" hreflang>` for the secondary domain
- Author / publisher / copyright / classification / category / coverage tags

### Open Graph (Facebook, LinkedIn, WhatsApp, iMessage)
Full `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:locale`, `og:image`, `og:image:secure_url`, `og:image:type`, `og:image:width=1280`, `og:image:height=720`, `og:image:alt`.

### Twitter / X Card
`summary_large_image` with `twitter:site`, `twitter:creator`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:url`, `twitter:domain`.

### Structured data (JSON-LD `@graph`)
- `WebApplication` — name, alternate names, applicationCategory `DeveloperApplication`, free Offer, featureList
- `WebSite` — with `SearchAction` `potentialAction` for Sitelinks search box
- `WebPage` — with `BreadcrumbList`
- `Person` — author (Jignesh D Maru)
- `FAQPage` — feeds Google FAQ rich results

### Files
- `public/robots.txt` — allow all, disallow build dirs, sitemap entries for both domains, polite `Crawl-delay: 1`
- `public/sitemap.xml` — `/`, `/seo`, `/docs` with `<image:image>` annotations
- `public/ads.txt` — `google.com, pub-1826192920016393, DIRECT, f08c47fec0942fa0`
- `public/manifest.json` — PWA install metadata + theme colors
- `public/sw.js` — service worker for offline shell

### PWA & favicons
SVG favicon (modern), 192/512 PNG icons, Apple Touch Icon, `theme-color` for light + dark, MS tile color, Apple mobile web-app capability flags.

### Performance
- Preconnect to `fonts.googleapis.com`, `fonts.gstatic.com`
- DNS-prefetch to `cdn.jsdelivr.net`
- Inter font loaded with `display=swap`

## Key Commands

```bash
PORT=5000 BASE_PATH=/ pnpm run dev   # development server
pnpm run build                       # production build (outputs dist/public)
pnpm run typecheck                   # TypeScript-only check
```

## Architecture Notes

- **Timeline animations** are stored in Zustand (`timelineAnimationStyle`) and injected into the VisualEditor iframe via `<style id="__timeline-anim-style">`.
- **MenuBar z-index**: wrapper div has `position: relative; z-index: 9999` so dropdowns sit above all panels.
- **PropertiesPanel scrolling**: uses `flex: 1; min-height: 0` for proper scrolling inside a flex column.
- **Window layout** persisted under localStorage key `html-editor-win-layout-v4`.
- **Routing**: Wouter (`<Route>` declared in `src/App.tsx`); `/` falls through to the editor App component.
- **Service worker**: registered on first load, caches the editor shell (`/`, JS chunks, CSS) for offline launch; user files stay in localStorage.

## Changelog

- **2026-04-21** — Added `public/ads.txt` (AdSense). Expanded `<meta name="keywords">` with high-intent long-tail terms. Extended FAQ section in `/docs` with 7 additional Q&As (browser support, storage limits, offline, SEO, dark mode, collaboration). Rewrote `replit.md` with full project documentation.
- **2026-04-17** — Added comprehensive SEO meta tags, JSON-LD graph (WebApplication / WebSite / WebPage / Person / FAQPage), OG + Twitter cards, sitemap.xml, robots.txt, manifest.json, SVG favicon, AI-generated 1200×630 OG image, `/seo` tutorial page, Wouter routing.
