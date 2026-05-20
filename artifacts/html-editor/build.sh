#!/usr/bin/env bash
export PATH="/nix/store/bl6iwirn83qj9r8wng43kfdqd5mfahj8-nodejs-22.22.0/bin:$PATH"
PNPM="/nix/store/1gsx3y7my2kfyh60vqjryzkv46y47gl2-pnpm-8.15.9/bin/pnpm"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)/html-viewer"
exec "$PNPM" --dir "$ROOT" run build
