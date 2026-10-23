import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import { useAdmin } from "./AdminContext";
import { pageKeyForPath } from "../utils/shutdownPages";

// Maintenance flag lives at career_global_settings/maintenance (true / false).
// The last known value is cached in localStorage so a refresh shows the right
// screen instantly instead of flashing the full site first.
const CACHE_KEY = "careerMaintenanceCache";
// Individually shut-down pages live at career_global_settings/pageShutdowns/<pageKey> = true.
const PAGES_CACHE_KEY = "careerPageShutdownsCache";

const MaintenanceContext = createContext({
  maintenance: false,
  lockActive: false,
  ready: true,
  setMaintenance: async () => {},
  pageShutdowns: {},
  setPageShutdown: async () => {},
  clearAllPageShutdowns: async () => {},
  isPageShutDown: () => false,
});

export function MaintenanceProvider({ children }) {
  const { adminUnlocked } = useAdmin(); // stays true in manager view too

  const [maintenance, setMaintenanceState] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY) === "true"; } catch { return false; }
  });
  const [ready, setReady] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY) !== null; } catch { return false; }
  });

  const [pageShutdowns, setPageShutdowns] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PAGES_CACHE_KEY) || "{}") || {}; } catch { return {}; }
  });

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/pageShutdowns`), snap => {
      const val = snap.val() || {};
      const clean = {};
      Object.entries(val).forEach(([k, v]) => { if (v === true) clean[k] = true; });
      setPageShutdowns(clean);
      try { localStorage.setItem(PAGES_CACHE_KEY, JSON.stringify(clean)); } catch {}
    }, () => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ref(db, `${PATHS.globalSettings}/maintenance`),
      snap => {
        const val = snap.val() === true;
        setMaintenanceState(val);
        try { localStorage.setItem(CACHE_KEY, String(val)); } catch {}
        setReady(true);
      },
      () => setReady(true) // Firebase error — don't leave the site stuck on a blank screen
    );
    // Safety net: never block the site for more than 5s waiting on Firebase
    const t = setTimeout(() => setReady(true), 5000);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  const setMaintenance = useCallback(async (value) => {
    await set(ref(db, `${PATHS.globalSettings}/maintenance`), !!value);
  }, []);

  const setPageShutdown = useCallback(async (pageKey, down) => {
    await set(ref(db, `${PATHS.globalSettings}/pageShutdowns/${pageKey}`), down ? true : null);
  }, []);

  const clearAllPageShutdowns = useCallback(async () => {
    await set(ref(db, `${PATHS.globalSettings}/pageShutdowns`), null);
  }, []);

  // A single page is blocked for visitors only; anyone with the admin key (including
  // admins in manager view) still gets through so they can switch it back on.
  const isPageShutDown = useCallback((pathname) => {
    if (adminUnlocked) return false;
    const key = pageKeyForPath(pathname);
    return !!key && pageShutdowns[key] === true;
  }, [adminUnlocked, pageShutdowns]);

  // Visitors are locked out only while maintenance is on AND they haven't
  // bypassed it with the admin key.
  const lockActive = maintenance && !adminUnlocked;

  return (
    <MaintenanceContext.Provider value={{ maintenance, lockActive, ready, setMaintenance, pageShutdowns, setPageShutdown, clearAllPageShutdowns, isPageShutDown }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}
