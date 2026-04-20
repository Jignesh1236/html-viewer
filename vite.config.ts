import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

import { nodePolyfills } from "vite-plugin-node-polyfills";

const port = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === "production";

export default defineConfig(async () => {
  const extraPlugins = [];

  if (!isProduction && process.env.REPL_ID !== undefined) {
    const cartographer = await import("@replit/vite-plugin-cartographer");
    const devBanner = await import("@replit/vite-plugin-dev-banner");

    extraPlugins.push(cartographer.cartographer());
    extraPlugins.push(devBanner.devBanner());
  }

  return {
    base: "/",
    plugins: [
      nodePolyfills({
        include: ["buffer", "path", "stream", "util", "events", "process"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      react(),
      tailwindcss(),
      ...extraPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      target: "es2020",
      cssCodeSplit: true,
      sourcemap: false,
      minify: "esbuild",
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: (id: string) => id.startsWith("@webcontainer/api"),
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom"],
            "vendor-monaco": ["@monaco-editor/react", "monaco-editor"],
            "vendor-state": ["zustand"],
            "vendor-ui": ["framer-motion", "@radix-ui/react-context-menu", "@radix-ui/react-tooltip"],
            "vendor-utils": ["jszip", "file-saver"],
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
        },
      },
      esbuildOptions: {
        drop: isProduction ? ["console", "debugger"] : [],
        legalComments: "none",
      },
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "zustand", "framer-motion", "buffer"],
      exclude: ["@monaco-editor/react", "@webcontainer/api"],
    },
  };
});
