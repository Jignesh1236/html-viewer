import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register the localhost-style preview Service Worker as early as possible.
// We don't block React mounting on it — components await it on demand.
async function registerPreviewSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    // Force the newest SW to take over immediately.
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (sw) {
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // A new SW has installed while an old one is controlling — claim now.
            sw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });
    // Trigger an update check so any cached old SW is replaced ASAP.
    try { await reg.update(); } catch {}
  } catch (err) {
    console.warn('[main] SW registration failed:', err);
  }
}
registerPreviewSW();

createRoot(document.getElementById("root")!).render(<App />);
