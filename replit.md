# HTML Editor

## Overview

Single-package React + Vite app. All code lives in `html-viewer/` with its own `node_modules`.

## Stack

- **Framework**: React 19 + Vite 7
- **Language**: TypeScript 5.9
- **Package manager**: npm (inside html-viewer/)
- **Styling**: Tailwind CSS v4 + Radix UI
- **Editor**: Monaco Editor
- **Terminal**: xterm.js (@xterm/xterm + addons)
- **Layout**: react-resizable-panels (VSCode-style)
- **State**: Zustand
- **Routing**: Wouter

## App Structure

- `src/` — React app source code
- `public/` — Static assets
- `index.html` — App entry point
- `vite.config.ts` — Vite configuration
- `package.json` — All dependencies

## Layout (VSCode-style, added 2026-04-19)

The UI now uses a VSCode-inspired layout:

- **Activity Bar** (far left, 48px): Icons for Files, Search, Source Control, Terminal toggle
- **Primary Sidebar** (collapsible, ~18%): File Explorer / Search / Git panels
- **Editor Area** (center): Tabbed panels with `react-resizable-panels`
  - Split mode: Code + Preview side by side (resizable)
  - Visual mode: Visual Editor + Properties (resizable)
  - Single tab: any individual panel
- **Bottom Panel** (collapsible, Ctrl+`): Terminal / Timeline with maximize support
- **Status Bar** (24px blue): Branch, mode, file info, terminal toggle, AI status

## Terminal (xterm.js, added 2026-04-19)

- `src/components/TerminalPane.tsx` — Full xterm.js terminal with:
  - Multi-tab support (add/close terminal sessions)
  - PTY-mode input forwarding to WebContainer process
  - Command history (ArrowUp/Down)
  - Ctrl+C to kill, Ctrl+L to clear
  - Quick action buttons (npm install, npm run dev, ls, etc.)
  - GitHub Dark theme with colored output
  - Auto-resize via ResizeObserver + FitAddon
  - WebLinks addon for clickable URLs

## File System Sync (added 2026-04-19)

Bidirectional sync between editor store and WebContainer:
- **Editor → Container**: `App.tsx` watches `files` in Zustand; writes changed files to container FS via `writeFileToContainer()`
- **Container → Editor**: After terminal commands that mutate files (touch, mkdir, rm, cp, npm, etc.), reads file contents back via `readFileFromContainer()` and updates Zustand store

## SEO (Added 2026-04-17)

- `index.html` — full SEO meta tags: title, description, keywords, author (Jignesh D Maru), canonical, OG, Twitter Card, JSON-LD structured data, manifest/favicon links
- `public/og-image.png` — AI-generated 1200×630 OG image
- `public/og-seo-tutorial.png` — OG image for the SEO tutorial page
- `public/favicon.svg` — Updated SVG favicon with `</>` icon
- `public/sitemap.xml` — Updated with `/seo` route
- `src/pages/SEOPage.tsx` — Comprehensive HTML & SEO tutorial page at `/seo`
- `src/main.tsx` — Wouter routing added (`/` = editor, `/seo` = tutorial)

## Features

- VSCode-style dark theme with blue accent
- Monaco code editor for HTML/CSS/JS with syntax highlighting
- Visual editor with element selection, move, resize, rotate
- Properties panel with full CSS editing
- Timeline panel with animation tracks
- xterm.js terminal with WebContainer integration
- Live preview panel with viewport switching
- File Explorer with upload support
- Export to ZIP (jszip + file-saver)
- Resizable panels via react-resizable-panels

## Key Commands

- `cd html-viewer && PORT=5000 BASE_PATH=/ npm run dev` — start development server
- `cd html-viewer && npm run build` — production build
- `cd html-viewer && npm run typecheck` — TypeScript typecheck

## Keyboard Shortcuts

- `Ctrl+\`` — Toggle terminal
- `Ctrl+Shift+E` — Toggle file explorer
- `Ctrl+Shift+F` — Toggle search
- `Ctrl+1` — Code layout
- `Ctrl+2` — Visual layout
- `Ctrl+3` — Split layout
- `Ctrl+R` — Refresh preview
- `Ctrl+E` — Export ZIP
- `Ctrl+S` — Save notification

## Architecture Notes

- Timeline animations stored in Zustand (`timelineAnimationStyle`) injected into VisualEditor iframe
- Layout preferences saved to localStorage (mode, sidebar, terminal open state, open tabs)
- xterm.js loaded lazily with dynamic import() to avoid SSR issues
- WebContainer file sync happens on every `files` Zustand state change when container is booted
