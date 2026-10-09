import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import { useAdmin } from "./AdminContext";

// Maintenance flag lives at career_global_settings/maintenance (true / false).
// The last known value is cached in localStorage so a refresh shows the right
// screen instantly instead of flashing the full site first.
const CACHE_KEY = "careerMaintenanceCache";

const MaintenanceContext = createContext({
  maintenance: false,
  lockActive: false,
  ready: true,
  setMaintenance: async () => {},
});

export function MaintenanceProvider({ children }) {
  const { isAdmin } = useAdmin();

  const [maintenance, setMaintenanceState] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY) === "true"; } catch { return false; }
  });
  const [ready, setReady] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY) !== null; } catch { return false; }
  });

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

  // Visitors are locked out only while maintenance is on AND they haven't
  // bypassed it with the admin key.
  const lockActive = maintenance && !isAdmin;

  return (
    <MaintenanceContext.Provider value={{ maintenance, lockActive, ready, setMaintenance }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}
