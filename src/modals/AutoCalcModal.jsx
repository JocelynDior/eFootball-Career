import { normName } from "./uefaLinks";

// ─────────────────────────────────────────────────────────────────────────────
// UEFA version of the "Auto Calculate from Results" maths (Edit Team).
// Same rules as the original in AddTeamModal.jsx, with two differences:
//   1. Names are compared ignoring capitals (REAL MADRID = Real Madrid).
//   2. If the team has links, the stats are the SUM of the results of ALL its
//      linked teams (the team's own name is not used). No links → its own name.
//
// Rules (unchanged from the original):
//   normal:       gs/gc/gd, w/d/l and pts count normally
//   forfeit_win:  w/l and pts count, goals do not
//   no_contest:   a played match and a loss, nothing else
// Returns { stats, log } — `log` feeds the confirmation screen.
// ─────────────────────────────────────────────────────────────────────────────
export function computeUefaTeamStats(results, ownName, linkedNames = []) {
  const useLinks = linkedNames.length > 0;
  const names = useLinks ? linkedNames : [ownName];
  const wanted = new Set(names.map(normName));

  const stats = { p: 0, w: 0, d: 0, l: 0, gs: 0, gc: 0, gd: 0, pts: 0 };
  const log = [];

  for (const result of results) {
    if (!result?.homeTeam || !result?.awayTeam) continue;
    if (result.status && result.status !== "approved") continue;

    const isHome = wanted.has(normName(result.homeTeam));
    const isAway = wanted.has(normName(result.awayTeam));
    if (!isHome && !isAway) continue;
    if (isHome && isAway) continue; // two of the same team's links playing each other

    const hs = Number(result.homeScore) || 0;
    const as = Number(result.awayScore) || 0;
    const ft = result.forfeitType || "none";
    const mine = isHome ? result.homeTeam : result.awayTeam;
    const opp = isHome ? result.awayTeam : result.homeTeam;
    // when linked, show which linked team the match came from
    const opponent = useLinks ? `${opp} (as ${mine})` : opp;

    if (ft === "no_contest") {
      stats.p += 1; stats.l += 1;
      log.push({ opponent, side: isHome ? "H" : "A", outcome: "L", score: "F-F", type: "No Contest" });
    } else if (ft === "forfeit_win") {
      stats.p += 1;
      const won = isHome ? hs > as : as > hs;
      if (won) { stats.w += 1; stats.pts += 3; } else { stats.l += 1; }
      log.push({ opponent, side: isHome ? "H" : "A", outcome: won ? "W" : "L", score: `${hs}-${as} (F)`, type: "Forfeit" });
    } else {
      stats.p += 1;
      const gf = isHome ? hs : as;
      const ga = isHome ? as : hs;
      stats.gs += gf; stats.gc += ga; stats.gd += gf - ga;
      let outcome;
      if (gf > ga) { stats.w += 1; stats.pts += 3; outcome = "W"; }
      else if (gf === ga) { stats.d += 1; stats.pts += 1; outcome = "D"; }
      else { stats.l += 1; outcome = "L"; }
      log.push({ opponent, side: isHome ? "H" : "A", outcome, score: `${hs}-${as}`, type: "Normal" });
    }
  }
  return { stats, log };
}
