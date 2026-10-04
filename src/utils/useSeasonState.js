import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

// Shared season state for every league / cup / super cup page.
//  - Loads the seasons list + activeSeason from career_<league>_settings
//  - Opens the page on the ACTIVE season (falls back to the first season)
//  - Only picks the starting season once, so it never yanks the user away from
//    a season they navigated to
//  - If the season being viewed disappears from the list (deleted), moves to
//    the active season
//  - activeSeason stays live, so pages can tell if the viewed season is active
export default function useSeasonState(league) {
  const [season, setSeason] = useState("1");
  const [seasons, setSeasons] = useState(["1"]);
  const [activeSeason, setActiveSeasonState] = useState(null);
  const [seasonReady, setSeasonReady] = useState(false);
  const picked = useRef(false);

  useEffect(() => {
    picked.current = false;
    setSeasonReady(false);
    const unsub = onValue(ref(db, `career_${league}_settings`), snap => {
      const d = snap.val() || {};
      let list = ["1"];
      if (Array.isArray(d.seasons) && d.seasons.length) list = d.seasons.map(String);
      else if (d.seasons && typeof d.seasons === "object") list = Object.values(d.seasons).map(String);
      const active = d.activeSeason != null && list.includes(String(d.activeSeason))
        ? String(d.activeSeason)
        : list[0];
      setSeasons(list);
      setActiveSeasonState(active);
      if (!picked.current) {
        picked.current = true;
        setSeason(active);
        setSeasonReady(true);
      } else {
        setSeason(prev => (list.includes(prev) ? prev : active));
      }
    });
    return () => unsub();
  }, [league]);

  return { season, setSeason, seasons, setSeasons, activeSeason, seasonReady };
}
