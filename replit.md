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
- **Hover state editor**: a **HOVER toggle button** at the top of the Properties panel switches the panel into "edit `:hover` state" mode. While ON, **every** change made in the panel (and via right-click quick-mods) is written to the element's `:hover` rule instead of the base style. The element is also given a temporary preview class so the iframe shows the hover state live without needing to mouse over. Hover styles are persisted by storing them on the element as `data-tl-hover-style="…"` + a stable id `data-tl-hov-id="hov_xxx"`; a `<style id="__tl-hover-rules">` block in the iframe head turns these into actual CSS rules (`[data-tl-hov-id="…"]:hover, [data-tl-hov-id="…"].__tl-hover-preview { … }`). Toggle off → all reads/writes go back to base styles. The orange `:hover` banner makes the active mode obvious.
- **Inline text editing**: double-click any element with visible text in the preview to edit its content directly with a dashed orange outline; Enter/blur commits, Esc cancels. Works on containers with mixed children too (contenteditable handles nested HTML safely)
- **Right-click quick-modifications context menu**: rich submenu lets you change Color, Background, Font family, Font size (incl. Larger/Smaller bumps), Weight, Align directly without opening the Properties panel; also Toggle Bold/Italic/Underline, copy element HTML, copy styles, reset, hide, select parent, edit text inline. Color/gradient menu entries show colored swatches; gradients include a "Text gradient" submenu that uses the background-clip trick.
- **Inline gradient picker on every color**: ColorInput has an optional "G" toggle button that opens a popover with a full gradient builder (linear/radial, 2 colors, angle slider, 6 presets, custom string). Used in **Background** (sets background-image) and **Typography Color** (applies a text gradient via `-webkit-background-clip: text`). Plain colors still work via the regular swatch — the gradient panel is opt-in only.
- **Searchable Properties panel**: top search bar filters sections + rows live by label/title/keywords; matching sections auto-expand. Type "color", "gap", "shadow", "gradient" etc. to jump straight to the property.
- Properties Panel covering full CSS surface: Content, Typography, Background, Layout, Flex/Grid (direction, wrap, gap, row/col gap, grow/shrink/basis, order, align-self, align-content, grid auto-flow, grid-column/row, place-items/content), Spacing, Border, Shadows, Transform, Animation (80+ presets across 8 categories), Filters (visual blur/brightness/etc builder), Transitions, Visibility/Interaction (cursor, pointer-events, user-select, resize, caret), Outline & Object (object-fit, aspect-ratio), Clip & Mask (clip-path presets), List, Columns, Scroll (snap, overscroll), Text Effects (letter/word spacing, decoration styling, writing-mode), Transform Origin / 3D (perspective, backface), Accent / Scrollbar / Misc (accent-color, color-scheme, scrollbar-width/color, inset, scroll-margin/padding, content-visibility, contain, touch-action), Custom CSS
- Visual edits write back to the HTML as inline styles, keeping code and canvas in sync

### Animation Timeline
- Draggable animation tracks per element
- **80+ pre-built animations** across 8 categories: Fade, Slide, Zoom, Rotate, Bounce, Attention, Special, **Hover FX** (liftUp, tilt, pressDown, underlineSlide, rotate90, colorPulse) — searchable via the Library panel filter input
- **Per-track animation triggers**: choose between **Load** (plays on page load via inline animation), **Hover** (emits `selector:hover` keyframes), or **Click** (toggles a `__tl-clicked` class via injected runtime script). Trigger badge shown next to the track name; selectable from the track properties sidebar
- Custom animation creator: define your own `@keyframes` with a name, save to project, edit/delete, apply to any track
- Per-track Animation dropdown groups custom animations and all preset categories
- Play preview inside the iframe (always plays as load preview regardless of saved trigger)
- "Apply to Page" injects generated keyframes into a `<style id="timeline-animations">` tag and (if any click triggers exist) a `<script id="timeline-click-runtime">` into the active HTML

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
- **Static prerendering** — `scripts/prerender.mjs` runs after `vite build` and emits per-route `index.html` files (`dist/index.html`, `dist/docs/index.html`, `dist/privacy/index.html`, `dist/terms/index.html`, `dist/404.html`) with route-specific `<title>`, description, canonical, OG/Twitter tags, JSON-LD (Breadcrumb + SoftwareApplication / TechArticle / WebPage) and a crawler-visible `<noscript>` + offscreen content block — solves the SPA empty-`<div id="root">` SEO problem without migrating to SSR. Static files take precedence over the SPA rewrite on Vercel/Cloudflare so Googlebot sees full content on first response.
- `vercel.json` adds `cleanUrls`, `trailingSlash:false`, long-cache headers for `/assets/*`, correct `Content-Type` for `sitemap.xml` / `robots.txt`, and the SPA fallback rewrite (only used when no static file matches).
- `public/robots.txt` allows all major search engines (Google, Bing, Yandex, DuckDuckGo, Slurp), AdSense (Mediapartners-Google, AdsBot-Google), and social card crawlers (Facebook, Twitter, LinkedIn, WhatsApp, Telegram, Discord, Slack); blocks AI-training crawlers (GPTBot, ChatGPT-User, CCBot, anthropic-ai, Claude-Web, Google-Extended, PerplexityBot, Bytespider).
- `public/sitemap.xml` lists `/`, `/docs`, `/privacy`, `/terms` with `xhtml:link hreflang`, image entries, and proper lastmod/changefreq/priority.
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

- **2026-04-24 (latest)** — **Hover state editing + Properties Panel sync fix**: (1) **Hover toggle button** added to top of Properties panel (next to search). When ON: every panel change (and right-click quick-mod) is written to the element's `:hover` state instead of base. Persistence model: hover styles serialize into `data-tl-hover-style` attribute + stable `data-tl-hov-id`; iframe head gets a `<style id="__tl-hover-rules">` block whose rules target both `:hover` and a `.__tl-hover-preview` class so the user **sees** the hover state live in the iframe while editing. Selection/refresh now collects both `styles` (base) and `hoverStyles` (parsed from data attr) — `getS` in PropertiesPanel routes based on `hoverEditMode`. Source-HTML sync also persists the new data attributes so hover rules survive reloads. Orange `:hover` banner makes the active mode obvious. (2) **Property panel UI sync bug fixed**: many sections (Filters slider, Cursor, Clip-path, Pointer-events, Aspect-ratio, Object-fit, Accent, Scrollbar, Mask, Columns, Scroll-snap, Text-decoration-color/style/thickness, etc.) weren't reflecting their values back to the inputs because `STYLE_PROPS` (the allowlist of properties read by `collectStyles`) was missing them — the preview updated but the panel UI snapped back to defaults. Expanded `STYLE_PROPS` from ~50 to 110+ properties to cover everything `getS()` reads. Also `collectStyles` now prefers **inline** style values over computed ones (e.g. so `filter: brightness(120%)` displays as `120%`, not the browser-normalized `1.2`).
- **2026-04-24 (earlier)** — **Editor UX polish**: (1) Gradient picker is no longer always visible — moved to a per-color "G" toggle button on `ColorInput`. Pops a compact builder (linear/radial, 2 colors, angle slider, presets) over the swatch. Wired to **Background** (sets background-image) and **Typography Color** (text gradient via `-webkit-background-clip: text`). (2) Inline text editing now works on **any** element with visible text (previously text-only nodes only). (3) **Properties panel search bar** — top search input filters sections/rows live by label, title, or section keywords; matching sections auto-expand. (4) **Right-click quick-modifications** in Visual Editor preview — submenu-rich context menu with swatched Color/Background pickers (incl. text-gradient submenu), Font family / Size (with Larger/Smaller bumps) / Weight / Align submenus, plus Toggle Bold/Italic/Underline. ContextMenu component upgraded to support nested submenus and color swatches.
- **2026-04-24** — **Visual Editor upgrades**: (1) Inline text editing — double-click any text-only element in the preview to edit its content, with Enter/blur commit and Esc cancel. (2) Animation triggers — each timeline track now supports Load / Hover / Click triggers; hover emits `:hover` keyframes, click uses an injected runtime script that toggles a `__tl-clicked` class with reflow restart. Trigger badge in track row + 3-button selector in track sidebar. (3) +28 new animation presets (glitch, neonFlicker, vibrate, jiggle, marquee, blurIn/Out, doorOpen, pop/popOut, twirl, swing3d, slideInTL/TR/BL/BR, scaleUp/Down, magnetic, expand, reveal, circleReveal, rgbSplit, shimmer) plus a new "Hover FX" category (liftUp, tilt, pressDown, underlineSlide, rotate90, colorPulse). (4) Properties Panel: expanded Flex/Grid section (align-self, align-content, row/col gap, flex grow/shrink/basis, order, grid-auto-flow, grid-column/row, place-items/content) and added new "Accent / Scrollbar / Misc" section (accent-color, color-scheme, scrollbar-width/color, inset, scroll-margin/padding-top, content-visibility, contain, touch-action). (5) Library panel polish: live search input filters presets across all categories.
- **2026-04-21** — Added `public/ads.txt` (AdSense). Expanded `<meta name="keywords">` with high-intent long-tail terms. Extended FAQ section in `/docs` with 7 additional Q&As (browser support, storage limits, offline, SEO, dark mode, collaboration). Rewrote `replit.md` with full project documentation.
- **2026-04-17** — Added comprehensive SEO meta tags, JSON-LD graph (WebApplication / WebSite / WebPage / Person / FAQPage), OG + Twitter cards, sitemap.xml, robots.txt, manifest.json, SVG favicon, AI-generated 1200×630 OG image, `/seo` tutorial page, Wouter routing.
