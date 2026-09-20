import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  /* Fluid root font-size: everything sized in rem across the app scales smoothly
     between a small phone and a large desktop monitor, instead of staying fixed. */
  html {
    font-size: clamp(15px, 0.85vw + 8px, 20px);
  }
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
