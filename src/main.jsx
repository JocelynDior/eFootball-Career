import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Viewport scaling like the reference — desktop width scaled to fit any screen
(function() {
  const designWidth = 1200;
  const screenWidth = window.screen.width;
  const scale = Math.min(1.0, Math.max(0.3, screenWidth / designWidth));
  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = `width=1200, initial-scale=${scale}, user-scalable=yes`;
  document.head.appendChild(meta);
})();

const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { min-width: 1200px; }
  body { background: #000020; color: #fff; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; min-width: 1200px; }
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

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.log('Service Worker registration failed:', err);
    });
  });
}
