import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { normName } from "../utils/uefaLinks";

// Returns the flat-table teams PLUS every team that lives inside a group
// (career_<league>/seasons/season_<n>/groups/<g>/teams/<t>), without duplicates.
// League pages that can run in "group stage" mode use this for the result /
// stat / admin / submit modals — otherwise those modals only see the (empty)
// flat table and have no teams to choose from.
export default function useGroupTeams(league, season, flatTeams = []) {
  const [groupTeams, setGroupTeams] = useState([]);

  useEffect(() => {
    if (!league || season === undefined || season === null) return;
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/groups`), snap => {
      const list = [];
      for (const [gKey, g] of Object.entries(snap.val() || {})) {
        for (const [tKey, t] of Object.entries(g?.teams || {})) {
          if (t?.name) list.push({ key: `${gKey}/${tKey}`, ...t, group: g.name || gKey });
        }
      }
      setGroupTeams(list);
    }, () => setGroupTeams([]));
    return () => unsub();
  }, [league, season]);

  return useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const t of [...flatTeams, ...groupTeams]) {
      const n = normName(t?.name);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(t);
    }
    return out;
  }, [flatTeams, groupTeams]);
}
