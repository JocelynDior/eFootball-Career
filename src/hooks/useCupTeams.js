import { useEffect, useMemo, useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, get } from "firebase/database";
import { DOMESTIC_LEAGUE_KEYS } from "../utils/cupConfig";
import { isDomesticCup } from "../utils/uefaStage";
import { normName } from "../utils/uefaLinks";

// Opponents for a domestic cup: the cup's own teams PLUS every team currently in the
// active-season table of the 5 domestic leagues (the same pool managers already use),
// without duplicates. The cup pages hand this to the result modals so admins and
// managers can pick any team.
async function fetchDomesticPool() {
  const names = new Set();
  for (const leagueKey of DOMESTIC_LEAGUE_KEYS) {
    try {
      const settingsSnap = await get(ref(db, `career_${leagueKey}_settings/activeSeason`));
      const activeSeason = settingsSnap.val() || "1";
      const tableSnap = await get(ref(db, PATHS.table(leagueKey, activeSeason)));
      for (const t of Object.values(tableSnap.val() || {})) {
        if (t?.name) names.add(t.name);
      }
    } catch {
      // one league failing shouldn't block the others
    }
  }
  return Array.from(names).sort();
}

export default function useCupTeams(league, ownTeams = []) {
  const [pool, setPool] = useState([]);

  useEffect(() => {
    if (!isDomesticCup(league)) return;
    let cancelled = false;
    fetchDomesticPool().then(names => { if (!cancelled) setPool(names); });
    return () => { cancelled = true; };
  }, [league]);

  return useMemo(() => {
    const seen = new Set(), out = [];
    for (const t of [...ownTeams, ...pool.map(name => ({ name }))]) {
      const n = normName(t?.name);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(t);
    }
    return out;
  }, [ownTeams, pool]);
}
