# HTML Editor

## Overview

Single-package React + Vite app. All code lives at the project root with one shared `node_modules`.

## Stack

- **Framework**: React 19 + Vite 7
- **Language**: TypeScript 5.9
- **Package manager**: pnpm (single package, no workspace)
- **Styling**: Tailwind CSS v4 + Radix UI
- **Editor**: Monaco Editor
- **State**: Zustand
- **Routing**: Wouter

## App Structure

- `src/` — React app source code
- `public/` — Static assets
- `index.html` — App entry point
- `vite.config.ts` — Vite configuration
- `package.json` — All dependencies

## Features

- VS Code-style dark theme (amber accent)
- Monaco code editor for HTML/CSS/JS with syntax highlighting
- Visual editor with element selection, move, resize, rotate
- Live preview panel with viewport switching (desktop/tablet/mobile)
- DevTools panel (console + elements inspector)
- File Explorer with upload support
- Export to ZIP (jszip + file-saver)
- Resizable panels

## Key Commands

- `pnpm run dev` — start development server
- `pnpm run build` — production build
- `pnpm run typecheck` — TypeScript typecheck
