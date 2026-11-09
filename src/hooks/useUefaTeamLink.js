import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { decodeUefaLinks, effectiveTeamName, linksPath, normName } from "../utils/uefaLinks";

// Live team-link lookup for a UEFA league.
//   assignedTeam  – the team the manager was assigned (manager.team)
//   effectiveTeam – the team whose fixtures/results that manager plays as
//                   (the linked team, or assignedTeam itself when there is no link)
export default function useUefaTeamLink(league, assignedTeam) {
  const [links, setLinks] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!league) return;
    const unsub = onValue(
      ref(db, linksPath(league)),
      (snap) => { setLinks(decodeUefaLinks(snap.val())); setLoaded(true); },
      () => setLoaded(true)
    );
    return () => unsub();
  }, [league]);

  const effectiveTeam = useMemo(() => effectiveTeamName(assignedTeam, links), [assignedTeam, links]);
  const isLinked = !!assignedTeam && normName(effectiveTeam) !== normName(assignedTeam);
  return { links, loaded, effectiveTeam, isLinked };
}
