import { useState } from "react";
import { firebaseGet } from "./useFirebase";
import { PATHS } from "../firebase";
import { getSASTMidnightTimestamp } from "../utils/sastTime";

export function useManagerKey() {
  const [savedKey, setSavedKey] = useState(() => {
    try { return JSON.parse(localStorage.getItem("careerManagerKey")); } catch { return null; }
  });

  function saveKey(key, teamName) {
    const data = { key, teamName };
    localStorage.setItem("careerManagerKey", JSON.stringify(data));
    setSavedKey(data);
  }

  function clearKey() {
    localStorage.removeItem("careerManagerKey");
    setSavedKey(null);
  }

  async function verifyKey(inputKey) {
    const data = await firebaseGet(PATHS.managerKeys);
    if (!data) return null;
    const entry = Object.values(data).find(e => e.key === inputKey.toUpperCase());
    return entry || null;
  }

  async function checkDailyLimit(managerKey, league, season) {
    const midnight = getSASTMidnightTimestamp();
    const results = await firebaseGet(PATHS.results(league, season)) || {};
    const pending = await firebaseGet(PATHS.pendingResults(league, season)) || {};
    const all = { ...results, ...pending };
    const count = Object.values(all).filter(r => r.submittedBy === managerKey && r.submittedAt >= midnight).length;
    if (count >= 3) return { allowed: false, message: "Daily limit of 3 matches reached. Resets at SAST midnight." };
    return { allowed: true };
  }

  return { savedKey, saveKey, clearKey, verifyKey, checkDailyLimit };
}
