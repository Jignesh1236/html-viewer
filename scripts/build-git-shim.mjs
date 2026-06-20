import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const result = await build({
  entryPoints: [join(root, 'src/git-shim/gitCli.mjs')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  minify: true,
  write: false,
  external: ['node:fs', 'node:path', 'node:os', 'node:crypto', 'node:buffer', 'node:stream', 'node:util', 'node:events', 'node:http', 'node:https', 'node:net', 'node:tls', 'node:url', 'node:zlib'],
});

const code = result.outputFiles[0].text;
const shebang = '#!/usr/bin/env node\n';
const out = shebang + code;

// Write to public/ so it's fetched lazily (avoids bloating the main JS bundle)
const outPublic = join(root, 'public/git-bundle.cjs');
writeFileSync(outPublic, out, 'utf-8');
console.log('✅ public/git-bundle.cjs written (' + Math.round(out.length / 1024) + ' KB)');
