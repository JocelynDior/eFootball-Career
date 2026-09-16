import { db, PATHS } from '../firebase';
import { ref, get, set } from 'firebase/database';

// ── Debounce map: one pending recalc per league+season ────────────────────────
const pendingRecalc = {};

// ── Recalculate the entire table from scratch from all results ────────────────
// Rules:
//  - normal match:   gs, gc, gd, w/d/l, pts all count normally
//  - forfeit_win:    w/l and pts count, but gs/gc/gd do NOT
//  - no_contest:     l for both, no pts, no gs/gc/gd

export async function recalculateTable(league, season) {
  // Load current table entries (to get team names and preserve non-stat fields)
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
      home.p += 1; home.l += 1;
      away.p += 1; away.l += 1;

    } else if (ft === 'forfeit_win') {
      const hs = Number(result.homeScore) || 0;
      const as = Number(result.awayScore) || 0;
      home.p += 1;
      away.p += 1;
      if (hs > as) {
        home.w += 1; home.pts += 3;
        away.l += 1;
      } else {
        away.w += 1; away.pts += 3;
        home.l += 1;
      }

    } else {
      const hs = Number(result.homeScore) || 0;
      const as = Number(result.awayScore) || 0;
      home.p  += 1; home.gs += hs; home.gc += as; home.gd += hs - as;
      away.p  += 1; away.gs += as; away.gc += hs; away.gd += as - hs;
      if (hs > as) {
        home.w += 1; home.pts += 3; away.l += 1;
      } else if (hs < as) {
        away.w += 1; away.pts += 3; home.l += 1;
      } else {
        home.d += 1; home.pts += 1;
        away.d += 1; away.pts += 1;
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

// ── Debounced recalculate: collapses rapid successive calls into one ──────────
// This prevents race conditions where multiple submissions fire recalculate
// before Firebase has finished writing the previous result.
function debouncedRecalculate(league, season, delayMs = 600) {
  const key = `${league}_${season}`;
  if (pendingRecalc[key]) {
    clearTimeout(pendingRecalc[key]);
  }
  return new Promise((resolve, reject) => {
    pendingRecalc[key] = setTimeout(async () => {
      delete pendingRecalc[key];
      try {
        await recalculateTable(league, season);
        resolve();
      } catch (e) {
        reject(e);
      }
    }, delayMs);
  });
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
// All callers keep using applyResultToTable / reverseResultFromTable.
// Now debounced to prevent race conditions on rapid submissions.

export async function applyResultToTable(league, season) {
  await debouncedRecalculate(league, season);
}

export async function reverseResultFromTable(league, season) {
  await debouncedRecalculate(league, season);
}
