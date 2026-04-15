import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

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
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
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
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            monaco: ["@monaco-editor/react", "monaco-editor"],
            zustand: ["zustand"],
          },
        },
      },
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});