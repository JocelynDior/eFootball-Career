import { db } from "../firebase";
import { ref, get, set, remove } from "firebase/database";

// Renames a season LABEL only. Season data lives under
// career_<league>/seasons/season_<name>, so the data is MOVED to the new path
// exactly as it is (table, results, stats, manager history, photos...).
// Safety: refuses if the new path already holds data, verifies the copy
// before the old path is removed, and also carries over the activeSeason
// setting and calendar tournament entries tagged with this season.
export async function renameSeason(league, season, seasons, setSeasons, setSeason, tournamentNameKey) {
  const newName = prompt(`Rename Season ${season} to:`);
  if (!newName || !newName.trim()) return;
  const trimmed = newName.trim();
  if (trimmed === season) return;
  if (/[.#$\[\]\/]/.test(trimmed)) {
    alert("Season name can't contain . # $ [ ] or /");
    return;
  }
  if (seasons.includes(trimmed)) {
    alert(`Season "${trimmed}" already exists.`);
    return;
  }

  try {
    const oldRef = ref(db, `career_${league}/seasons/season_${season}`);
    const newRef = ref(db, `career_${league}/seasons/season_${trimmed}`);

    const [oldSnap, newSnap] = await Promise.all([get(oldRef), get(newRef)]);
    if (newSnap.exists()) {
      alert(`Season "${trimmed}" already has saved data, so it can't be used as a new name.`);
      return;
    }

    // 1. Move the season's data untouched to the new path
    if (oldSnap.exists()) {
      const data = oldSnap.val();
      await set(newRef, data);
      const check = await get(newRef);
      if (JSON.stringify(check.val()) !== JSON.stringify(data)) {
        await remove(newRef);
        alert("Rename failed: the copied data did not match. Nothing was changed.");
        return;
      }
      await remove(oldRef);
    }

    // 2. Calendar tournament entries tagged with this competition + season
    if (tournamentNameKey) {
      const calSnap = await get(ref(db, "career_calendarEvents"));
      const calData = calSnap.val() || {};
      for (const [dateKey, dayData] of Object.entries(calData)) {
        if (!dayData?.tournaments) continue;
        for (const [tKey, t] of Object.entries(dayData.tournaments)) {
          const nameMatches = typeof t?.name === "string" && t.name.trim().toLowerCase().replace(/\s+/g, " ") === tournamentNameKey;
          if (nameMatches && String(t?.season ?? "") === String(season)) {
            await set(ref(db, `career_calendarEvents/${dateKey}/tournaments/${tKey}/season`), trimmed);
          }
        }
      }
    }

    // 3. Seasons list + activeSeason
    const updated = seasons.map(x => (x === season ? trimmed : x));
    await set(ref(db, `career_${league}_settings/seasons`), updated);
    const activeSnap = await get(ref(db, `career_${league}_settings/activeSeason`));
    if (String(activeSnap.val()) === String(season)) {
      await set(ref(db, `career_${league}_settings/activeSeason`), trimmed);
    }
    setSeasons(updated);
    setSeason(trimmed);
  } catch (e) {
    alert("Error renaming season: " + e.message);
  }
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
