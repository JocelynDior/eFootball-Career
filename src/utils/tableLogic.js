import { db, PATHS } from '../firebase';
import { ref, get, set } from 'firebase/database';

// ── Recalculate the entire table from scratch from all results ────────────────
// This is called every time a result is submitted or deleted.
// The table is always a direct reflection of the results — nothing can drift.
//
// Rules:
//  - normal match:   gs, gc, gd, w/d/l, pts all count normally
//  - forfeit_win:    w/l and pts count, but gs/gc/gd do NOT (forfeit goals don't count)
//  - no_contest:     l for both, no pts, no gs/gc/gd

export async function recalculateTable(league, season) {
  // Load current table entries (to get team names and preserve non-stat fields like icon)
  const tableSnap = await get(ref(db, PATHS.table(league, season)));
  const tableVal  = tableSnap.val() || {};

  // Load all approved results
  const resultsSnap = await get(ref(db, PATHS.results(league, season)));
  const resultsVal  = resultsSnap.val() || {};

  // Build a map of teamName → tableKey + base data
  const teamMap = {};
  for (const [key, val] of Object.entries(tableVal)) {
    if (!val?.name) continue;
    teamMap[val.name] = {
      key,
      // Preserve non-stat fields
      name:  val.name,
      icon:  val.icon  || '',
      color: val.color || '',
      // Zero out all stats — will be recalculated
      p: 0, w: 0, d: 0, l: 0,
      gs: 0, gc: 0, gd: 0, pts: 0,
    };
  }

  // Walk every result and accumulate stats
  for (const result of Object.values(resultsVal)) {
    if (!result?.homeTeam || !result?.awayTeam) continue;
    if (result.status && result.status !== 'approved') continue;

    const home = teamMap[result.homeTeam];
    const away = teamMap[result.awayTeam];
    if (!home || !away) continue;

    const ft = result.forfeitType || 'none';

    if (ft === 'no_contest') {
      // Both teams get a loss, no goals, no pts
      home.p += 1; home.l += 1;
      away.p += 1; away.l += 1;

    } else if (ft === 'forfeit_win') {
      // homeTeam stored as winner — winner gets W+3pts, loser gets L
      // Forfeit goals do NOT count toward gs/gc/gd
      home.p += 1; home.w += 1; home.pts += 3;
      away.p += 1; away.l += 1;

    } else {
      // Normal match
      const hs = Number(result.homeScore) || 0;
      const as = Number(result.awayScore) || 0;

      home.p  += 1;
      home.gs += hs;
      home.gc += as;
      home.gd += hs - as;

      away.p  += 1;
      away.gs += as;
      away.gc += hs;
      away.gd += as - hs;

      if (hs > as) {
        home.w   += 1; home.pts += 3;
        away.l   += 1;
      } else if (hs < as) {
        away.w   += 1; away.pts += 3;
        home.l   += 1;
      } else {
        home.d   += 1; home.pts += 1;
        away.d   += 1; away.pts += 1;
      }
    }
  }

  // Write all teams back to Firebase
  const writes = Object.values(teamMap).map(team => {
    const { key, ...data } = team;
    return set(ref(db, `${PATHS.table(league, season)}/${key}`), data);
  });

  await Promise.all(writes);
}

// ── Convenience wrappers kept for backwards compatibility ─────────────────────
// All callers (SubmitResultModal, PendingFixturesModal, league pages) can keep
// calling applyResultToTable — it now just triggers a full recalculation.

export async function applyResultToTable(league, season) {
  await recalculateTable(league, season);
}

export async function reverseResultFromTable(league, season) {
  await recalculateTable(league, season);
}
