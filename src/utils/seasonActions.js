import { db } from "../firebase";
import { ref, get, set, remove } from "firebase/database";

export async function renameSeason(league, season, seasons, setSeasons, setSeason) {
  const newName = prompt(`Rename Season ${season} to:`);
  if (!newName || !newName.trim()) return;
  const trimmed = newName.trim();
  if (seasons.includes(trimmed) && trimmed !== season) {
    alert(`Season "${trimmed}" already exists.`);
    return;
  }
  const updated = seasons.map(s => (s === season ? trimmed : s));
  setSeasons(updated);
  setSeason(trimmed);
  await set(ref(db, `career_${league}_settings/seasons`), updated);
}

export async function setActiveSeason(league, season) {
  await set(ref(db, `career_${league}_settings/activeSeason`), season);
  alert(`Season ${season} set as active ✓`);
}

// Permanently deletes a season: its table, results, pending results, top
// scorers/assists, manager history, AND any calendar fixtures/tournament
// entries tagged with this league + season. Cannot be undone.
export async function deleteSeason(league, tournamentNameKey, season, seasons, setSeasons, setSeason) {
  if (seasons.length <= 1) {
    alert("Can't delete the only season.");
    return;
  }
  if (!confirm(`Delete Season ${season}? This permanently removes its table, results, stats, and calendar fixtures for this competition. This cannot be undone.`)) {
    return;
  }

  try {
    // 1. Wipe the season's league data (table/results/pending/top scorers/assists/manager history)
    await remove(ref(db, `career_${league}/seasons/season_${season}`));

    // 2. Remove any calendar tournament entries for this competition + season
    const calSnap = await get(ref(db, "career_calendarEvents"));
    const calData = calSnap.val() || {};
    for (const [dateKey, dayData] of Object.entries(calData)) {
      if (!dayData?.tournaments) continue;
      const filtered = {};
      let changed = false;
      for (const [tKey, t] of Object.entries(dayData.tournaments)) {
        const nameMatches = typeof t?.name === "string" && t.name.trim().toLowerCase().replace(/\s+/g, " ") === tournamentNameKey;
        const seasonMatches = String(t?.season ?? "") === String(season);
        if (nameMatches && seasonMatches) { changed = true; continue; }
        filtered[tKey] = t;
      }
      if (changed) {
        if (Object.keys(filtered).length > 0) {
          await set(ref(db, `career_calendarEvents/${dateKey}/tournaments`), filtered);
        } else {
          await remove(ref(db, `career_calendarEvents/${dateKey}/tournaments`));
        }
      }
    }

    // 3. Update the seasons list and switch off the deleted season
    const updated = seasons.filter(s => s !== season);
    const nextSeason = updated[0];
    setSeasons(updated);
    setSeason(nextSeason);
    await set(ref(db, `career_${league}_settings/seasons`), updated);
  } catch (e) {
    alert("Error deleting season: " + e.message);
  }
}
