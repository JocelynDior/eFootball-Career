import { useEffect, useRef, useState } from "react";

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
const VERSION_CHECK_INTERVAL_MS = 2 * 60 * 1000; // check every 2 minutes
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "wheel"];

// Pulls out every hashed asset URL (Vite's /assets/xxx-<hash>.js|.css) referenced
// by a document's HTML so we can tell when a new build has been deployed.
function extractAssetSignature(html) {
  const matches = html.match(/\/assets\/[^"']+\.(?:js|css)/g) || [];
  return matches.sort().join("|");
}

export default function AutoRefresher() {
  const [updateBanner, setUpdateBanner] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const baselineRef = useRef(null);
  const reloadTimerRef = useRef(null);

  useEffect(() => {
    // Baseline = the assets currently loaded in this tab right now.
    baselineRef.current = extractAssetSignature(document.documentElement.innerHTML);

    const markActive = () => { lastActivityRef.current = Date.now(); };
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, markActive, { passive: true }));

    function doReload() {
      window.location.reload();
    }

    // 1. Inactivity check — nobody's there to interrupt, so reload immediately.
    const inactivityTimer = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LIMIT_MS) {
        doReload();
      }
    }, 30 * 1000);

    // 2. New-build check — fetch the live index.html (bypassing cache) and compare
    // its asset hashes to what this tab currently has loaded.
    const versionTimer = setInterval(async () => {
      try {
        const res = await fetch("/index.html", { cache: "no-store" });
        if (!res.ok) return;
        const html = await res.text();
        const latest = extractAssetSignature(html);
        if (latest && baselineRef.current && latest !== baselineRef.current) {
          setUpdateBanner(true);
          // Give an active user a few seconds' notice, then reload for them.
          if (!reloadTimerRef.current) {
            reloadTimerRef.current = setTimeout(doReload, 10 * 1000);
          }
        }
      } catch {
        // network hiccup — ignore, try again next interval
      }
    }, VERSION_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, markActive));
      clearInterval(inactivityTimer);
      clearInterval(versionTimer);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  if (!updateBanner) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
      background: "rgba(20,20,24,0.95)", border: "1px solid rgba(255,20,147,0.4)",
      color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: "0.85rem",
      zIndex: 99999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontFamily: "inherit",
    }}>
      ✨ New version available — refreshing...
    </div>
  );
}
