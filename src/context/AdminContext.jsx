import { createContext, useContext, useState, useEffect } from "react";
import { verifyAdminKey } from "../utils/adminKey";
import { db, PATHS } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";

const AdminContext = createContext();

// Plain object with all team icon paths — works with spread operator { ...teamIconsCache, ...badges }
const LOCAL_TEAM_ICONS = {
  // Premier League
  "Manchester City":    "/images/teams/premierleague/IMG-20260830-022118.png",
  "Man City":           "/images/teams/premierleague/IMG-20260830-022118.png",
  "Chelsea":            "/images/teams/premierleague/IMG-20260830-022433.png",
  "Everton":            "/images/teams/premierleague/IMG-20260830-022701.png",
  "Manchester United":  "/images/teams/premierleague/images-2026-08-30-T021642-259-removebg-preview.png",
  "Man United":         "/images/teams/premierleague/images-2026-08-30-T021642-259-removebg-preview.png",
  "Man Utd":            "/images/teams/premierleague/images-2026-08-30-T021642-259-removebg-preview.png",
  "Arsenal":            "/images/teams/premierleague/images-2026-08-30-T021741-471-removebg-preview-edit-217721579762608.png",
  "Liverpool":          "/images/teams/premierleague/images-2026-08-30-T022220-427-removebg-preview.png",
  "Newcastle":          "/images/teams/premierleague/images-2026-08-30-T022319-663-removebg-preview.png",
  "Newcastle United":   "/images/teams/premierleague/images-2026-08-30-T022319-663-removebg-preview.png",
  "Brighton":           "/images/teams/premierleague/images-2026-08-30-T022902-880-removebg-preview-edit-218356746144282.png",
  "Brighton & Hove Albion": "/images/teams/premierleague/images-2026-08-30-T022902-880-removebg-preview-edit-218356746144282.png",
  "Aston Villa":        "/images/teams/premierleague/images-2026-08-30-T022949-458-removebg-preview.png",
  "Tottenham Hotspurs": "/images/teams/premierleague/images-2026-08-30-T023258-977-removebg-preview-edit-218536483394776.png",
  "Tottenham Hotspur":  "/images/teams/premierleague/images-2026-08-30-T023258-977-removebg-preview-edit-218536483394776.png",
  "Tottenham":          "/images/teams/premierleague/images-2026-08-30-T023258-977-removebg-preview-edit-218536483394776.png",
  "Spurs":              "/images/teams/premierleague/images-2026-08-30-T023258-977-removebg-preview-edit-218536483394776.png",

  // La Liga
  "Real Madrid":        "/images/teams/laliga/IMG-20260830-025531-removebg-preview.png",
  "Atletico Madrid":    "/images/teams/laliga/images-2026-08-29-T011255-180-removebg-preview.png",
  "Atlético Madrid":    "/images/teams/laliga/images-2026-08-29-T011255-180-removebg-preview.png",
  "Atletico":           "/images/teams/laliga/images-2026-08-29-T011255-180-removebg-preview.png",
  "Real Sociedad":      "/images/teams/laliga/images-2026-08-30-T025758-363-removebg-preview.png",
  "Valencia":           "/images/teams/laliga/images-2026-08-30-T025815-617-removebg-preview.png",
  "Athletic Club":      "/images/teams/laliga/images-2026-08-30-T030227-753-removebg-preview.png",
  "Athletic Bilbao":    "/images/teams/laliga/images-2026-08-30-T030227-753-removebg-preview.png",
  "Villarreal":         "/images/teams/laliga/images-2026-08-30-T030245-701-removebg-preview.png",
  "Real Betis":         "/images/teams/laliga/images-2026-08-30-T030303-244-removebg-preview-edit-220485449764270.png",
  "Barcelona":          "/images/teams/laliga/images-2026-08-30-T030727-157-removebg-preview-edit-220649258206953.png",
  "FC Barcelona":       "/images/teams/laliga/images-2026-08-30-T030727-157-removebg-preview-edit-220649258206953.png",
  "Barca":              "/images/teams/laliga/images-2026-08-30-T030727-157-removebg-preview-edit-220649258206953.png",
  "Celta Vigo":         "/images/teams/laliga/images-2026-08-30-T030757-223-removebg-preview.png",
  "Celta de Vigo":      "/images/teams/laliga/images-2026-08-30-T030757-223-removebg-preview.png",
  "Sevilla":            "/images/teams/laliga/images-2026-08-30-T030819-910-removebg-preview.png",
  "Sevilla FC":         "/images/teams/laliga/images-2026-08-30-T030819-910-removebg-preview.png",

  // Serie A
  "Atalanta":           "/images/teams/seriaa/hd-atalanta-bc-official-logo-transparent-background-701751712234879oi9o3dtpeo_edit_16725871760987-removebg-preview.png",
  "Atalanta BC":        "/images/teams/seriaa/hd-atalanta-bc-official-logo-transparent-background-701751712234879oi9o3dtpeo_edit_16725871760987-removebg-preview.png",
  "Juventus":           "/images/teams/seriaa/images_-_2026-09-04T145755.021-removebg-preview_edit_16453440944362.png",
  "Juventus FC":        "/images/teams/seriaa/images_-_2026-09-04T145755.021-removebg-preview_edit_16453440944362.png",
  "Juve":               "/images/teams/seriaa/images_-_2026-09-04T145755.021-removebg-preview_edit_16453440944362.png",
  "Inter Milan":        "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "Inter":              "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "Internazionale":     "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "FC Internazionale":  "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "FC Internazionale Milano": "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "Napoli":             "/images/teams/seriaa/images_-_2026-09-04T150010.376-removebg-preview_edit_16464264371965.png",
  "SSC Napoli":         "/images/teams/seriaa/images_-_2026-09-04T150010.376-removebg-preview_edit_16464264371965.png",
  "AS Roma":            "/images/teams/seriaa/images_-_2026-09-04T150023.812-removebg-preview.png",
  "Roma":               "/images/teams/seriaa/images_-_2026-09-04T150023.812-removebg-preview.png",
  "Como 1907":          "/images/teams/seriaa/images_-_2026-09-04T150038.595-removebg-preview.png",
  "Como":               "/images/teams/seriaa/images_-_2026-09-04T150038.595-removebg-preview.png",
  "Fiorentina":         "/images/teams/seriaa/images_-_2026-09-04T150400.224-removebg-preview_edit_16528300870392.png",
  "ACF Fiorentina":     "/images/teams/seriaa/images_-_2026-09-04T150400.224-removebg-preview_edit_16528300870392.png",
  "Florentino":         "/images/teams/seriaa/images_-_2026-09-04T150400.224-removebg-preview_edit_16528300870392.png",
  "Lazio":              "/images/teams/seriaa/images_-_2026-09-04T150416.234-removebg-preview.png",
  "SS Lazio":           "/images/teams/seriaa/images_-_2026-09-04T150416.234-removebg-preview.png",
  "Torino":             "/images/teams/seriaa/images_-_2026-09-04T150430.736-removebg-preview_edit_16485126994878.png",
  "Torino FC":          "/images/teams/seriaa/images_-_2026-09-04T150430.736-removebg-preview_edit_16485126994878.png",
  "AC Milan":           "/images/teams/seriaa/logo-acmilan-removebg-preview_edit_16475068739151.png",
  "Milan":              "/images/teams/seriaa/logo-acmilan-removebg-preview_edit_16475068739151.png",
};

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [manager, setManager] = useState(null);
  const [managerLoading, setManagerLoading] = useState(true);

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

  // No-op: kept so nothing crashes
  function updateTeamIcon() {}

  return (
    <AdminContext.Provider value={{
      isAdmin, loginAdmin, logoutAdmin,
      teamIconsCache: LOCAL_TEAM_ICONS,
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
