import { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { stagePath } from "../utils/uefaStage";

// Live stage settings of a UEFA competition: { mode: "league" | "knockout", imageUrl }
export default function useUefaStageSettings(league) {
  const [settings, setSettings] = useState({ mode: "league", imageUrl: "" });
  useEffect(() => {
    if (!league) return;
    const unsub = onValue(ref(db, stagePath(league)), snap => {
      const d = snap.val() || {};
      setSettings({ mode: d.mode === "knockout" ? "knockout" : "league", imageUrl: d.imageUrl || "" });
    }, () => {});
    return () => unsub();
  }, [league]);
  return settings;
}
