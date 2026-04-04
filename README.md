# HTML Editor by Jignesh

A **free, browser-based HTML editor** that combines a **Monaco** code editor (the same engine as VS Code) with a **live preview**, **visual (WYSIWYG-style) editing**, templates, import/export, and optional **PWA** installation. Everything runs client-side in your browser—no server is required to edit or preview your pages.

**Live demo (example deployment):** [html-viewer-gray-beta.vercel.app](https://html-viewer-gray-beta.vercel.app/)

---

## Table of contents

1. [Features](#features)
2. [Interface overview](#interface-overview)
3. [Editor modes](#editor-modes)
4. [Visual editor](#visual-editor)
5. [Live preview and Auto](#live-preview-and-auto)
6. [Templates](#templates)
7. [File operations](#file-operations)
8. [Sharing](#sharing)
9. [Keyboard shortcuts](#keyboard-shortcuts)
10. [Drafts, theme, and settings](#drafts-theme-and-settings)
11. [PWA (install as app)](#pwa-install-as-app)
12. [Technical stack](#technical-stack)
13. [Running locally](#running-locally)
14. [Deploying](#deploying)
15. [SEO and production checklist](#seo-and-production-checklist)
16. [Project files](#project-files)
17. [License and credits](#license-and-credits)

---

## Features

| Area | What you get |
|------|----------------|
| **Code** | Full HTML editing with syntax highlighting, word wrap, find/replace (Monaco). |
| **Preview** | Live iframe preview of your document (`srcdoc`). |
| **Visual** | Select elements in the preview, move, resize, rotate, and edit typography, colors, spacing, borders, and raw inline `style`. |
| **Sync** | Changes made in visual mode are **written back to the HTML in the code editor automatically** (debounced). You can still use **Save to code** for an immediate sync with confirmation. |
| **Templates** | Built-in starter pages (hero, form, cards, blog, pricing, dashboard, etc.). |
| **Viewport** | Preview at full width or fixed widths (mobile / tablet / desktop presets). |
| **Export** | Copy HTML, download as `.html`, import from file. |
| **Share** | Compressed share links (URL hash / query) so others can open your snippet. |
| **UX** | Dark/light theme, adjustable code font size, resizable sidebar and panes, optional service worker. |

---

## Interface overview

- **Top bar** — App branding, **Code / Visual / Split** mode tabs, **Auto** (live run) toggle, font size, theme, character/line stats, shortcuts (**?**).
- **Left sidebar** — Preview actions (open in tab, run), edit actions (format, clear), **template** picker, file actions (copy, share link, import, export, forget draft).
- **Center** — Code editor and/or preview depending on mode.
- **Right (visual mode)** — **Properties** panel for the selected element.
- **Bottom** — Status line for messages (e.g. sync, selection).

---

## Editor modes

### Code

Only the Monaco editor is shown. Use this when you want to focus on markup and styles without the preview taking space.

### Visual

Only the preview is shown, with the **visual overlay** active. Click an element to select it; use handles to resize, the top handle to rotate, and drag the selection to move. The **properties** panel opens on the right.

### Split

Code editor and preview **side by side**. The visual overlay is **not** active in split mode; switch to **Visual** for point-and-click editing.

---

## Visual editor

1. Switch to **Visual** mode.
2. **Click** an element in the preview to select it (click empty body area or **Esc** to deselect).
3. **Drag** the selection box to change `left` / `top` (uses `position: relative` when needed).
4. **Resize** with corner/side handles; **rotate** with the rotate control.
5. Use the **properties** panel for:
   - Layout (x, y, width, height, rotation)
   - Margin / padding
   - Text content, font size, weight, color, alignment
   - Background and opacity
   - Per-side borders and radius
   - Raw **CSS** (`style` attribute) textarea
6. **Discard** reverts `style` to the state when the element was selected.
7. **Delete** removes the element from the DOM (and syncs to code).
8. **Save to code** forces an immediate push of the preview document into the editor (normally automatic).

**Note:** The synced HTML is generated from the preview DOM (`documentElement.outerHTML`), so attribute order and formatting may differ slightly from hand-written source, which is normal for DOM serialization.

---

## Live preview and Auto

- **Run Preview** (or **Ctrl/Cmd + S**) updates the iframe from the current editor buffer.
- When **Auto ▶** is ON, the preview is scheduled shortly after you stop typing in the code editor.
- When the editor is updated **from** the visual layer, the app avoids reloading the preview if the HTML is already equivalent, so the iframe does not flash unnecessarily.

---

## Templates

Use **Templates → Load template** in the sidebar. Loading a template **replaces** the current document in the editor (confirm if you have unsaved work you care about). Templates are embedded in `index.html` as the `TEMPLATES` object.

---

## File operations

| Action | Behavior |
|--------|----------|
| **Copy HTML** | Copies the full document from the editor to the clipboard. |
| **Export** | Downloads the current HTML as a file. |
| **Import** | Loads a local `.html` / `.htm` file into the editor. |
| **Format** | Pretty-prints HTML via the built-in formatter (**Ctrl/Cmd + /**). |
| **Clear** | Clears the editor (typically with a confirmation). |

---

## Sharing

**Copy share link** builds a URL that embeds compressed HTML (using **LZ-String**). Recipients open the same app URL with the payload in the query string; the app decompresses and loads it into the editor.

Limits are defined in code as `SHARE_MAX_PLAIN` and `SHARE_MAX_COMPRESSED`; very large documents may exceed practical URL length—use **Export** or **Copy HTML** for big projects.

---

## Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Run preview / save | **Ctrl/Cmd + S** |
| Format HTML | **Ctrl/Cmd + /** |
| Deselect (visual) | **Esc** |
| Shortcuts help | **?** (when not typing in Monaco) |
| Find / replace in editor | **Ctrl/Cmd + F** / **H** |

---

## Drafts, theme, and settings

- **Local draft** — The editor content may be saved automatically to `localStorage` (see `DRAFT_KEY` in the script). **Forget saved draft** clears it.
- **Theme** — Dark/light stored under `THEME_KEY`.
- **Font size** — Editor font size stored under `FONT_KEY`.

---

## PWA (install as app)

`manifest.json` and `sw.js` support installable PWA behavior where the environment allows (HTTPS or `localhost`). Icons reference `icon.svg`.

---

## Technical stack

- **Monaco Editor** (HTML language) via CDN
- **LZ-String** for share links
- **Google Fonts** (Syne, JetBrains Mono)
- Single-page **`index.html`** with embedded CSS and application logic
- Optional **Google AdSense** and **service worker** registration (see source)

---

## Running locally

Because the app loads Monaco from a CDN and may use ES modules or workers, serve the folder over **HTTP(S)**, not as a raw `file://` URL.

**Python 3:**

```bash
cd "html-viewer-main"
python -m http.server 8080
```

Then open `http://localhost:8080/`.

**Node (npx):**

```bash
npx --yes serve .
```

---

## Deploying

Deploy the repository root as a **static site** (Vercel, Netlify, GitHub Pages, etc.). Ensure:

- `index.html` is the default document.
- `manifest.json`, `icon.svg`, `sw.js`, `sitemap.xml`, and `robots.txt` are served at the site root if you use them.

---

## SEO and production checklist

If you deploy to your **own domain**, update **all** canonical and absolute URLs so search engines and social cards point to your site:

1. **`index.html`** — `<link rel="canonical">`, `og:url`, `og:image`, `twitter:image`, and all `https://…` strings inside JSON-LD.
2. **`sitemap.xml`** — `<loc>` and `<lastmod>`.
3. **`robots.txt`** — `Sitemap:` line.

**Recommended:** Add a **1200×630** PNG or JPEG as `og-image.png` (or similar) and set `og:image` / `twitter:image` to that file—many social networks handle raster images more reliably than SVG.

Remove or replace **Google site verification** meta if it is not yours.

Avoid **fake** structured data (for example, invented review counts); search engines may ignore or penalize misleading schema.

---

## Project files

| File | Role |
|------|------|
| `index.html` | Full application UI, styles, and logic |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker |
| `icon.svg` | Favicon / PWA icon |
| `sitemap.xml` | Sitemap for crawlers |
| `robots.txt` | Crawler directives |
| `ads.txt` | Ad network verification (if applicable) |
| `README.md` | This documentation |

---

## License and credits

Created by **Jignesh**. If the original repository shipped with a license file, keep it alongside this project; otherwise clarify licensing for your fork before redistribution.

For issues or improvements, track them in your own repo’s issue tracker.

---

*Last updated: documentation reflects features including automatic visual-to-code synchronization.*
