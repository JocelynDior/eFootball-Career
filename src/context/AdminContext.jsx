import { createContext, useContext, useState, useEffect } from "react";
import { verifyAdminKey } from "../utils/adminKey";
import { db, PATHS } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamIconsCache, setTeamIconsCache] = useState({});

  // Manager auth state
  const [manager, setManager] = useState(null); // { uid, username, email, ... }
  const [managerLoading, setManagerLoading] = useState(true);

  useEffect(() => {
    // Restore admin session
    const saved = localStorage.getItem("careerAdminMode");
    if (saved === "true") setIsAdmin(true);

    // Restore team icons
    const icons = localStorage.getItem("careerTeamIcons");
    if (icons) { try { setTeamIconsCache(JSON.parse(icons)); } catch (e) {} }

    // Restore manager session from LocalStorage
    const savedManager = localStorage.getItem("careerManagerSession");
    if (savedManager) {
      try {
        const parsed = JSON.parse(savedManager);
        // Re-validate against Firebase
        const managerRef = ref(db, `${PATHS.accounts}/${parsed.uid}`);
        onValue(managerRef, snap => {
          const data = snap.val();
          if (data) {
            setManager({ uid: parsed.uid, ...data });
          } else {
            // Account deleted — clear session
            localStorage.removeItem("careerManagerSession");
            setManager(null);
          }
          setManagerLoading(false);
        }, { onlyOnce: true });
      } catch (e) {
        localStorage.removeItem("careerManagerSession");
        setManagerLoading(false);
      }
    } else {
      setManagerLoading(false);
    }
  }, []);

  // Keep manager state in sync with Firebase (live updates)
  useEffect(() => {
    if (!manager?.uid) return;
    const unsub = onValue(ref(db, `${PATHS.accounts}/${manager.uid}`), snap => {
      const data = snap.val();
      if (data) {
        const updated = { uid: manager.uid, ...data };
        setManager(updated);
        // Update LocalStorage mirror
        localStorage.setItem("careerManagerSession", JSON.stringify({ uid: manager.uid }));
      }
    });
    return () => unsub();
  }, [manager?.uid]);

  /* ── Admin ── */
  function loginAdmin(key) {
    if (verifyAdminKey(key)) {
      setIsAdmin(true);
      localStorage.setItem("careerAdminMode", "true");
      return true;
    }
    return false;
  }

  function logoutAdmin() {
    setIsAdmin(false);
    localStorage.removeItem("careerAdminMode");
  }

  /* ── Manager ── */
  async function registerManager({ email, password, username }) {
    // Check username uniqueness
    const allRef = ref(db, PATHS.accounts);
    return new Promise(resolve => {
      onValue(allRef, snap => {
        const data = snap.val() || {};
        const taken = Object.values(data).some(
          acc => acc.username?.toLowerCase() === username.toLowerCase()
        );
        if (taken) return resolve({ success: false, error: "Username already taken." });

        // Generate uid
        const uid = "mgr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        const accountData = {
          username,
          email,
          password,
          role: "manager",
          team: null,
          profilePhoto: null,
          rank: null,
          createdAt: Date.now(),
        };

        set(ref(db, `${PATHS.accounts}/${uid}`), accountData).then(() => {
          const managerObj = { uid, ...accountData };
          setManager(managerObj);
          localStorage.setItem("careerManagerSession", JSON.stringify({ uid }));
          resolve({ success: true });
        }).catch(err => resolve({ success: false, error: err.message }));
      }, { onlyOnce: true });
    });
  }

  async function loginManager({ email, password }) {
    return new Promise(resolve => {
      onValue(ref(db, PATHS.accounts), snap => {
        const data = snap.val() || {};
        const entry = Object.entries(data).find(
          ([, acc]) => acc.email === email && acc.password === password && acc.role === "manager"
        );
        if (!entry) return resolve({ success: false, error: "Invalid email or password." });
        const [uid, accountData] = entry;
        const managerObj = { uid, ...accountData };
        setManager(managerObj);
        localStorage.setItem("careerManagerSession", JSON.stringify({ uid }));
        resolve({ success: true });
      }, { onlyOnce: true });
    });
  }

  function logoutManager() {
    setManager(null);
    localStorage.removeItem("careerManagerSession");
  }

  async function updateManagerField(uid, fields) {
    await update(ref(db, `${PATHS.accounts}/${uid}`), fields);
  }

  /* ── Team icons ── */
  function updateTeamIcon(teamName, url) {
    const updated = { ...teamIconsCache, [teamName]: url };
    setTeamIconsCache(updated);
    localStorage.setItem("careerTeamIcons", JSON.stringify(updated));
  }

  return (
    <AdminContext.Provider value={{
      isAdmin, loginAdmin, logoutAdmin,
      teamIconsCache, updateTeamIcon,
      manager, managerLoading,
      registerManager, loginManager, logoutManager,
      updateManagerField,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
