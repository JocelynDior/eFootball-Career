import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Mobile gets the original fixed-1200px-canvas-scaled-down treatment (the compact
// look); desktop gets a real fluid layout instead of being stuck on that same
// rigid canvas. Explicit min/max-scale bounds stop mobile Safari's habit of
// carrying over a remembered zoom level into new tabs — pinch-zoom still works,
// it just always *starts* at the same calculated zoomed-out level.
const MOBILE_BREAKPOINT = 900;
const isMobile = window.screen.width < MOBILE_BREAKPOINT;

if (isMobile) {
  const designWidth = 1200;
  const screenWidth = window.screen.width;
  const scale = Math.min(1.0, Math.max(0.3, screenWidth / designWidth));
  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = `width=1200, initial-scale=${scale}, minimum-scale=${Math.max(0.2, scale - 0.3)}, maximum-scale=5, user-scalable=yes`;
  document.head.appendChild(meta);
}

const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ${isMobile ? `
  html { min-width: 1200px; }
  body { min-width: 1200px; }
  ` : `
  /* Fluid root font-size on desktop — rem-based sizing scales smoothly with viewport width */
  html { font-size: clamp(15px, 0.85vw + 8px, 20px); }
  `}
  body { background: #000020; color: #fff; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
  ::-webkit-scrollbar-thumb { background: #FF1493; border-radius: 3px; }
  select option { background: #000033; color: #fff; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register service worker — checks for updates on every revisit
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      // Force an update check every time the user opens the app
      reg.update().catch(() => {});
    } catch (err) {
      console.log('Service Worker registration failed:', err);
    }
  });
}
