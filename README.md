# HTML Editor by Jignesh

A **free, AI-powered browser-based HTML editor** that combines a **Monaco** code editor (the same engine as VS Code) with an **AI Chat Site Builder**, **live preview**, **visual (WYSIWYG-style) editing**, templates, and optional **PWA** installation. Everything runs client-side in your browser—no server is required to edit or preview your pages.

**Live demo (example deployment):** [html-viewer-gray-beta.vercel.app](https://html-viewer-gray-beta.vercel.app/)

---

## Table of contents

1. [AI Chat Site Builder](#ai-chat-site-builder)
2. [Features](#features)
3. [Interface overview](#interface-overview)
4. [Editor modes](#editor-modes)
5. [Visual editor](#visual-editor)
6. [Live preview and Auto](#live-preview-and-auto)
7. [Templates](#templates)
8. [File operations](#file-operations)
9. [Sharing](#sharing)
10. [Keyboard shortcuts](#keyboard-shortcuts)
11. [Drafts, theme, and settings](#drafts-theme-and-settings)
12. [PWA (install as app)](#pwa-install-as-app)
13. [Technical stack](#technical-stack)
14. [Running locally](#running-locally)
15. [Deploying](#deploying)
16. [SEO and production checklist](#seo-and-production-checklist)
17. [Project files](#project-files)
18. [License and credits](#license-and-credits)

---

## AI Chat Site Builder

The **AI Chat Site Builder** is a powerful feature that allows you to generate and edit code using natural language.

- **Multi-Model Support**: Choose between OpenAI, Gemini, Mistral, and Llama models.
- **Auto-Apply**: AI responses are automatically applied to the editor for instant feedback.
- **Keep/Undo**: Review AI changes and choose to "Keep" them or "Undo" to revert to your previous code.
- **Context-Aware**: The AI sees your current HTML, CSS, and JS code (including line numbers and selections) to provide precise edits.
- **OpenRouter Support**: Uses Pollinations.AI with a fallback to OpenRouter (requires `OPENROUTER_API_KEY` in `.env`).

---

## Features

| Area | What you get |
|------|----------------|
| **AI Builder** | Chat with AI to generate sections, fix bugs, or build entire pages. Auto-applies code with undo support. |
| **Code** | Full HTML editing with syntax highlighting, word wrap, find/replace (Monaco), optional **minimap**. |
| **Visual** | Select elements, move (relative/absolute), resize, rotate, and edit properties like **Display** (flex/grid) and **Position**. |
| **Sync** | Visual changes sync back to HTML automatically. AI changes sync to all relevant tabs. |
| **Templates** | Built-in starter pages (hero, form, cards, blog, pricing, dashboard, etc.). |
| **Viewport** | Preview at full width or fixed widths (mobile / tablet / desktop presets). |
| **Export** | Copy HTML, download as `.html`, import from file. |
| **Share** | Compressed share links; **QR code** modal for the same link. |
| **Snapshots** | Named snapshots in **localStorage** with line-by-line **Diff** support. |
| **UX** | Dark/light theme, floating/resizable AI chat, draggable property panels. |

---

## Interface overview

- **Top bar** — App branding, **Code / Visual / Split** mode tabs, **Auto** (live run) toggle, font size, **Map** (minimap), theme, character/line stats, shortcuts (**?**).
- **Left sidebar** — Preview actions (open in tab, run), edit actions (format, clear, insert image, accessibility check), **template** picker, file actions (copy HTML, **copy share link**, **QR for share link**, **save snapshot**, **snapshots** list, **snapshot diff**, import, export, forget draft).
- **Center** — Code editor (Monaco or **CSS** / **JS** auxiliary tabs) and/or preview depending on mode.
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
2. **Click** an element in the preview to select it.
3. **Drag** to change `left` / `top` (supports both `absolute` and `relative` positions).
4. **Resize** with handles; **rotate** with the top control.
5. Use the **properties** panel for:
   - **Layout**: Change **Display** (flex, grid, block, etc.) and **Position** (static, relative, absolute, fixed, sticky).
   - **Dimensions**: Precise width and height inputs.
   - **Z-index**: Quick **Front +** / **Back −** buttons.
   - **Spacing**: Margin and padding controls.
   - **Typography**: Text content, size, weight, color, alignment.
   - **Decoration**: Background colors/gradients, opacity, borders, and radius.
   - **Custom CSS**: Edit raw inline `style` attribute.
6. **Keep/Undo**: (For AI changes) Confirm or revert automated edits.
7. **Discard**: Reverts manual visual changes to the state when selected.
8. **Delete/Duplicate**: Manage elements directly from the sidebar.

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

**Copy share link** builds a URL that embeds compressed HTML (using **LZ-String**). The payload is placed in the URL **hash** (`#c=…`); the app also accepts the same payload via the `c` **query** parameter when opening a link. Recipients open your deployment; the app decompresses and loads the HTML into the editor.

**QR for share link** opens a modal with a scannable QR code for that same URL (built with **qrcodejs** from a CDN). URL limits and validation match **Copy share link** (`computeShareUrl` in the script).

Limits are defined in code as `SHARE_MAX_PLAIN` and `SHARE_MAX_COMPRESSED`; very large documents may exceed practical URL length—use **Export** or **Copy HTML** for big projects.

---

## Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Run preview / save | **Ctrl/Cmd + S** |
| Format HTML | **Ctrl/Cmd + /** |
| Deselect (visual) | **Esc** |
| Exit fullscreen preview | **Esc** (when preview is full screen) |
| Close modals | **Esc** (shortcuts, QR, snapshots, snapshot diff, accessibility) |
| Shortcuts help | **?** (when not typing in Monaco or CSS/JS tab) |
| Find / replace in editor | **Ctrl/Cmd + F** / **H** |
| QR / snapshots / diff | Sidebar: **QR for share link**, **Save snapshot**, **Snapshots…**, **Snapshot diff…** |

---

## Drafts, theme, and settings

- **Local draft** — The editor content may be saved automatically to `localStorage` (see `DRAFT_KEY` in the script). **Forget saved draft** clears it.
- **Named snapshots** — **Save snapshot** prompts for a name and stores the current HTML under `SNAPSHOTS_KEY` (up to **25** entries). Open **Snapshots…** to **Restore** (replaces editor, runs preview) or **Delete** an entry. Snapshots are browser-local only.
- **Theme** — Dark/light stored under `THEME_KEY`.
- **Font size** — Editor font size stored under `FONT_KEY`.
- **Minimap** — On/off state for the Monaco minimap stored under `MINIMAP_KEY` (toggle **Map** in the top bar).

---

## PWA (install as app)

`manifest.json` and `sw.js` support installable PWA behavior where the environment allows (HTTPS or `localhost`). Icons reference `icon.svg`.

---

## Technical stack

- **Monaco Editor** (HTML language) via CDN
- **diff** (CDN) for snapshot line comparisons
- **LZ-String** for share links
- **qrcodejs** (CDN) for share-link QR codes in the modal
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

**Google Search Console (after deploy):** Add the property for your production URL, confirm ownership (or keep the existing `google-site-verification` meta in `index.html` if it matches your property), submit `https://your-domain/sitemap.xml`, then monitor **Coverage**, **Page experience**, and **Mobile usability** for issues.

---

## Project files

| File | Role |
|------|------|
| `index.html` | Full application UI, styles, and logic |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker |
| `icon.svg` | Favicon / PWA icon |
| `sitemap.xml` | Sitemap for crawlers (home, about, privacy) |
| `about.html` | Short about page (static) |
| `privacy.html` | Privacy notes (static) |
| `robots.txt` | Crawler directives |
| `vercel.json` | Optional security headers on Vercel (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) |
| `ads.txt` | Ad network verification (if applicable) |
| `README.md` | This documentation |

---

## License and credits

Created by **Jignesh**. If the original repository shipped with a license file, keep it alongside this project; otherwise clarify licensing for your fork before redistribution.

For issues or improvements, track them in your own repo’s issue tracker.

---

*Last updated: documentation reflects HTML/CSS/JS code tabs, fullscreen preview, minimap toggle, snapshot diff, and extra static pages in the sitemap.*
