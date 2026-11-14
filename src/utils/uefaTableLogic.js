import { db, PATHS } from '../firebase';
import { ref, get, update } from 'firebase/database';
import { normName, decodeUefaLinks, linkedNamesFor, linksPath } from './uefaLinks';

// ─────────────────────────────────────────────────────────────────────────────
// UEFA version of recalculateTable (Champions League, Europa, Conference).
// Same rules and the same name matching as the original in tableLogic.js, with
// two additions:
//
//  1. TEAM LINKING. A table team can be linked to several teams (Admin → Team
//     Linking). Its row is built from the results of ALL of them added together,
//     ignoring capitals (REAL MADRID = Real Madrid), and NOT from results saved
//     under its own name. A team with no links uses its own name. One team's
//     results can feed more than one row.
//
//  2. GROUP STAGE. Teams that live inside groups
//     (career_<league>/seasons/season_<n>/groups/<group>/teams/<team>) are
//     calculated too — the original only handled the flat table. A result
//     counts in a group only when both of its teams are in that group.
//
// Rules (unchanged from the original):
//  - normal match:   gs, gc, gd, w/d/l, pts all count normally
//  - forfeit_win:    w/l and pts count, but gs/gc/gd do NOT
//  - no_contest:     l for both, no pts, no gs/gc/gd
// ─────────────────────────────────────────────────────────────────────────────

const seasonBase = (league, season) => `career_${league}/seasons/season_${season}`;
const freshStats = () => ({ p: 0, w: 0, d: 0, l: 0, gs: 0, gc: 0, gd: 0, pts: 0 });

// What one result does to ONE side (the home side or the away side).
function sideDelta(result, side) {
  const ft = result.forfeitType || 'none';
  const hs = Number(result.homeScore) || 0;
  const as = Number(result.awayScore) || 0;
  const gf = side === 'home' ? hs : as;
  const ga = side === 'home' ? as : hs;

  if (ft === 'no_contest') return { p: 1, l: 1 };

  if (ft === 'forfeit_win') {
    // Same as the original: home wins only if hs > as, otherwise away wins.
    const homeWins = hs > as;
    const won = side === 'home' ? homeWins : !homeWins;
    return won ? { p: 1, w: 1, pts: 3 } : { p: 1, l: 1 };
  }

  const d = { p: 1, gs: gf, gc: ga, gd: gf - ga };
  if (gf > ga) { d.w = 1; d.pts = 3; }
  else if (gf < ga) { d.l = 1; }
  else { d.d = 1; d.pts = 1; }
  return d;
}

function addDelta(stats, delta) {
  for (const k of Object.keys(delta)) stats[k] += delta[k];
}

// One table (the flat table, or a single group).
//   entries: [{ key, name, path }]
// byName maps a RESULT team name → the table rows that use it.
function buildStructure(entries, links) {
  const rows = [];
  const byName = new Map();
  for (const { key, name, path } of entries) {
    const row = { key, name, path, stats: freshStats() };
    rows.push(row);
    // A linked team uses the results of ALL its linked teams (and not its own
    // name); a team with no links uses its own name.
    const linked = linkedNamesFor(name, links);
    for (const n of (linked.length ? linked : [name])) {
      const k = normName(n);
      if (!byName.has(k)) byName.set(k, []);
      if (!byName.get(k).includes(row)) byName.get(k).push(row);
    }
  }
  return { rows, byName };
}

export async function recalculateUefaTable(league, season) {
  const [tableSnap, groupsSnap, resultsSnap, linksSnap] = await Promise.all([
    get(ref(db, PATHS.table(league, season))),
    get(ref(db, `${seasonBase(league, season)}/groups`)),
    get(ref(db, PATHS.results(league, season))),
    get(ref(db, linksPath(league))),
  ]);

  const links = decodeUefaLinks(linksSnap.val());
  const resultsVal = resultsSnap.val() || {};

  // Build every table that exists: the flat one and each group
  const structures = [];

  const flatEntries = Object.entries(tableSnap.val() || {})
    .filter(([, val]) => val?.name)
    .map(([key, val]) => ({ key, name: val.name, path: `${PATHS.table(league, season)}/${key}` }));
  if (flatEntries.length) structures.push(buildStructure(flatEntries, links));

  for (const [gKey, gVal] of Object.entries(groupsSnap.val() || {})) {
    const entries = Object.entries(gVal?.teams || {})
      .filter(([, val]) => val?.name)
      .map(([tKey, val]) => ({
        key: tKey,
        name: val.name,
        path: `${seasonBase(league, season)}/groups/${gKey}/teams/${tKey}`,
      }));
    if (entries.length) structures.push(buildStructure(entries, links));
  }

  // Walk every result and accumulate stats
  let applied = 0;
  const skipped = [];

  for (const result of Object.values(resultsVal)) {
    if (!result?.homeTeam || !result?.awayTeam) continue;
    if (result.status && result.status !== 'approved') continue;

    const hn = normName(result.homeTeam);
    const an = normName(result.awayTeam);
    let counted = false;

    for (const st of structures) {
      const homeRows = st.byName.get(hn);
      const awayRows = st.byName.get(an);
      if (!homeRows || !awayRows) continue;
      if (homeRows.some((r) => awayRows.includes(r))) continue; // same row on both sides
      for (const r of homeRows) addDelta(r.stats, sideDelta(result, 'home'));
      for (const r of awayRows) addDelta(r.stats, sideDelta(result, 'away'));
      counted = true;
    }

    if (counted) {
      applied += 1;
    } else {
      // Report only names that no table row uses (a real link/name problem).
      // A result between two teams of different groups is simply not counted.
      const missing = [result.homeTeam, result.awayTeam].filter(
        (n) => !structures.some((st) => st.byName.has(normName(n)))
      );
      if (missing.length) skipped.push({ homeTeam: result.homeTeam, awayTeam: result.awayTeam, missing });
    }
  }

  // Write the stats back. Only the stat fields are written, so name / icon /
  // color (and anything else on the team) is left exactly as it was.
  const writes = [];
  for (const st of structures) {
    for (const row of st.rows) writes.push(update(ref(db, row.path), row.stats));
  }
  const settled = await Promise.allSettled(writes);
  const failed = settled.find((r) => r.status === 'rejected');
  if (failed) throw failed.reason;

  if (skipped.length) {
    console.warn(
      `[${league}] ${skipped.length} result(s) use a team name that no table team uses or is linked to. ` +
      `Check Admin → Team Linking:`, skipped
    );
  }
  return { applied, skipped };
}
