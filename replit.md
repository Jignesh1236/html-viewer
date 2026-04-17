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
- Properties panel with full CSS editing (typography, layout, background, borders, shadows, animations)
- Timeline panel with draggable animation tracks, Play previews animations in iframe, "Apply to Page" button
- Floating + dockable window system with distinct per-window default sizes
- MenuBar dropdowns properly z-indexed above all panels (z-index: 9999)
- Live preview panel with viewport switching
- File Explorer with upload support
- Export to ZIP (jszip + file-saver)
- Resizable docked panels via drag dividers

## Key Commands

- `PORT=5000 BASE_PATH=/ pnpm run dev` — start development server
- `pnpm run build` — production build
- `pnpm run typecheck` — TypeScript typecheck

## Architecture Notes

- Timeline animations stored in Zustand (`timelineAnimationStyle`) and injected into VisualEditor iframe via `<style id="__timeline-anim-style">`
- Menu bar z-index fixed: wrapper div has `position: relative, z-index: 9999`
- PropertiesPanel uses `flex: 1, minHeight: 0` for proper scrolling in flex layout
- Window layout localStorage key: `html-editor-win-layout-v4`
