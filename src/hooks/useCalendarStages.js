import { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { getTournamentKey } from "../utils/leagueTournamentNames";
import { normName } from "../utils/uefaLinks";

// The stage(s) the admin set in the calendar for this competition on the given
// dates (previous matchday + current matchday). Current-matchday stages come
// first. Returns { stages: [...distinct stage names], preferred: "" }.
export default function useCalendarStages(league, dates) {
  const [state, setState] = useState({ stages: [], preferred: "" });
  const key = (dates || []).join("|");

  useEffect(() => {
    if (!league || !key) return;
    const wanted = key.split("|");               // [previous date, current date]
    const target = getTournamentKey(league);
    const unsub = onValue(ref(db, "career_calendarEvents"), snap => {
      const data = snap.val() || {};
      const stagesFor = (dateStr) => {
        const out = [];
        for (const tourn of Object.values(data[dateStr]?.tournaments || {})) {
          if (!(tourn?.name || "").toLowerCase().includes(target)) continue;
          for (const fix of Object.values(tourn?.fixtures || {})) {
            if (typeof fix?.stage === "string" && fix.stage.trim()) out.push(fix.stage.trim());
          }
        }
        return out;
      };
      const curr = stagesFor(wanted[wanted.length - 1]);
      const prev = wanted.length > 1 ? stagesFor(wanted[0]) : [];
      const seen = new Set(), stages = [];
      for (const s of [...curr, ...prev]) {
        const k = normName(s);
        if (!seen.has(k)) { seen.add(k); stages.push(s); }
      }
      setState({ stages, preferred: curr[0] || prev[0] || "" });
    }, () => {});
    return () => unsub();
  }, [league, key]);

  return state;
}
