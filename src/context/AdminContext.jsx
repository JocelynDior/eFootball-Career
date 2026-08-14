import { createContext, useContext, useState, useEffect } from "react";
import { verifyAdminKey } from "../utils/adminKey";

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamIconsCache, setTeamIconsCache] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("careerAdminMode");
    if (saved === "true") setIsAdmin(true);
    const icons = localStorage.getItem("careerTeamIcons");
    if (icons) { try { setTeamIconsCache(JSON.parse(icons)); } catch (e) {} }
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

  function updateTeamIcon(teamName, url) {
    const updated = { ...teamIconsCache, [teamName]: url };
    setTeamIconsCache(updated);
    localStorage.setItem("careerTeamIcons", JSON.stringify(updated));
  }

  return (
    <AdminContext.Provider value={{ isAdmin, loginAdmin, logoutAdmin, teamIconsCache, updateTeamIcon }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
