import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { verifyAdminKey } from "../utils/adminKey";
import { db, PATHS } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";
import { LOCAL_TEAM_ICONS } from "../utils/teamIcons";

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [manager, setManager] = useState(null);
  const [managerLoading, setManagerLoading] = useState(true);
  const [remoteTeamIcons, setRemoteTeamIcons] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("careerAdminMode");
    if (saved === "true") setIsAdmin(true);

    const savedManager = localStorage.getItem("careerManagerSession");
    if (savedManager) {
      try {
        const parsed = JSON.parse(savedManager);
        const managerRef = ref(db, `${PATHS.accounts}/${parsed.uid}`);
        onValue(managerRef, snap => {
          const data = snap.val();
          if (data) {
            setManager({ uid: parsed.uid, ...data });
          } else {
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

  useEffect(() => {
    if (!manager?.uid) return;
    const unsub = onValue(ref(db, `${PATHS.accounts}/${manager.uid}`), snap => {
      const data = snap.val();
      if (data) {
        const updated = { uid: manager.uid, ...data };
        setManager(updated);
        localStorage.setItem("careerManagerSession", JSON.stringify({ uid: manager.uid }));
      }
    });
    return () => unsub();
  }, [manager?.uid]);

  // Uploaded team icons live in career_team_icons — entries are either a plain URL
  // string (Navbar upload) or { imageUrl } (TeamIconUploadModal). Normalise both.
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.teamIcons), snap => {
      const data = snap.val() || {};
      const map = {};
      Object.entries(data).forEach(([name, val]) => {
        const url = typeof val === "string" ? val : val?.imageUrl;
        if (url) map[name] = url;
      });
      setRemoteTeamIcons(map);
    });
    return () => unsub();
  }, []);

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

  async function registerManager({ email, password, username }) {
    const allRef = ref(db, PATHS.accounts);
    return new Promise(resolve => {
      onValue(allRef, snap => {
        const data = snap.val() || {};
        const taken = Object.values(data).some(
          acc => acc.username?.toLowerCase() === username.toLowerCase()
        );
        if (taken) return resolve({ success: false, error: "Username already taken." });
        const uid = "mgr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        const accountData = { username, email, password, role: "manager", team: null, profilePhoto: null, rank: null, createdAt: Date.now() };
        set(ref(db, `${PATHS.accounts}/${uid}`), accountData).then(() => {
          setManager({ uid, ...accountData });
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
        setManager({ uid, ...accountData });
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

  // Instantly reflect a freshly uploaded icon everywhere (the Firebase listener
  // above keeps it in sync afterwards).
  function updateTeamIcon(teamName, url) {
    if (!teamName || !url) return;
    setRemoteTeamIcons(prev => ({ ...prev, [teamName]: url }));
  }

  const teamIconsCache = useMemo(
    () => ({ ...LOCAL_TEAM_ICONS, ...remoteTeamIcons }),
    [remoteTeamIcons]
  );

  return (
    <AdminContext.Provider value={{
      isAdmin, loginAdmin, logoutAdmin,
      teamIconsCache,
      updateTeamIcon,
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
