// ─────────────────────────────────────────────────────────────────────────
// Manager ranking engine — shared by the Rankings page and the Profile page
// so both always show the same rank.
//
// A manager's stats are built from every approved result, in EVERY tournament,
// but only from the periods in which they were actually in charge of the club:
//   • each entry in account.teamHistory  = one finished stint (team, assignedAt → removedAt)
//   • the current team                   = the open stint (teamAssignedAt → today)
//   • no history at all                  = they never changed team, so their current
//                                          team has always been theirs
// Matches inside a stint are matched by the result's own `date` (YYYY-MM-DD).
// A stint counts matches from its start date up to, but not including, the day it ended.
// ─────────────────────────────────────────────────────────────────────────
import { db, PATHS } from "../firebase";
import { ref, get } from "firebase/database";

// Real database keys — these must match the `const LEAGUE = "..."` in each page.
export const COMPETITIONS = [
  { key: "premier",        name: "Premier League" },
  { key: "laliga",         name: "La Liga" },
  { key: "seriea",         name: "Serie A" },
  { key: "bundesliga",     name: "Bundesliga" },
  { key: "ligue1",         name: "Ligue 1" },
  { key: "champions",      name: "Champions League" },
  { key: "europa",         name: "Europa League" },
  { key: "clubworldcup",   name: "Club World Cup" },
  { key: "sc",             name: "Super Cup" },
  { key: "wc",             name: "World Cup" },
  { key: "facup",          name: "FA Cup" },
  { key: "copadelrey",     name: "Copa del Rey" },
  { key: "coppaitalia",    name: "Coppa Italia" },
  { key: "dfbpokal",       name: "DFB Pokal" },
  { key: "coupesdefrance", name: "Coupe de France" },
];

/* ─── SCORING ───────────────────────────────────────────────────────────── */
export function isForfeit(r) {
  return r.forfeitType && r.forfeitType !== "none" && r.forfeitType !== "no_contest";
}
export function isNoContest(r) {
  return r.forfeitType === "no_contest" || (r.matchType === "forfeit" && r.homeScore === 0 && r.awayScore === 0);
}

export function calcPerformanceScore(stats) {
  return (stats.w || 0) * 1 + (stats.l || 0) * -1 + (stats.gs || 0) * 0.5 + (stats.gc || 0) * -0.5;
}
const sumPts = (arr = []) => arr.reduce((s, x) => s + (x.points || 0), 0);

export function totalScore(manager) {
  return (
    calcPerformanceScore(manager.stats || {}) +
    sumPts(manager.trophies) +
    sumPts(manager.medals) +
    sumPts(manager.individualAwards)
  );
}

/* ─── RESULTS (loaded once, shared, cached for a minute) ────────────────── */
const CACHE_MS = 60_000;
let cache = null;
let inflight = null;

export function loadAllResults(force = false) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.records);
  if (inflight) return inflight;

  inflight = (async () => {
    const perCompetition = await Promise.all(
      COMPETITIONS.map(async (comp) => {
        let seasons = ["1"];
        try {
          const sett = (await get(ref(db, PATHS.leagueSettings(comp.key)))).val();
          const s = sett?.seasons;
          const list = Array.isArray(s) ? s : s && typeof s === "object" ? Object.values(s) : [];
          if (list.length) seasons = list.map(String);
        } catch {}

        const perSeason = await Promise.all(
          seasons.map(async (season) => {
            try {
              const data = (await get(ref(db, PATHS.results(comp.key, season)))).val();
              if (!data) return [];
              return Object.values(data).map((r) => ({
                home: r.homeTeam || "",
                away: r.awayTeam || "",
                homeScore: Number(r.homeScore) || 0,
                awayScore: Number(r.awayScore) || 0,
                forfeitType: r.forfeitType,
                matchType: r.matchType,
                date: String(r.date || "").slice(0, 10),
                md: r.md || 0,
                season,
                tournament: comp.name,
              }));
            } catch {
              return [];
            }
          })
        );
        return perSeason.flat();
      })
    );
    const records = perCompetition.flat();
    cache = { at: Date.now(), records };
    return records;
  })().finally(() => { inflight = null; });

  return inflight;
}

/* ─── STINTS (when was this manager at which club?) ─────────────────────── */
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
const toDateStr = (ms) => new Date(ms + SAST_OFFSET_MS).toISOString().slice(0, 10);

// Returns [{ team, fromDate|null, toDate|null }] — null fromDate = start unknown/beginning,
// null toDate = still there.
export function buildStints(acc) {
  const closed = Object.values(acc?.teamHistory || {})
    .filter((e) => e && e.team && e.team !== "None")
    .map((e) => {
      const removed = Number(e.removedAt) || null;
      let assigned = Number(e.assignedAt) || null;
      // Older entries faked "assigned" as the moment of removal when the real date was missing.
      if (assigned && removed && assigned >= removed) assigned = null;
      return { team: e.team, from: assigned, to: removed };
    })
    .sort((a, b) => (a.to || 0) - (b.to || 0));

  // A stint with an unknown start began when the previous one ended.
  closed.forEach((s, i) => {
    if (!s.from && i > 0) s.from = closed[i - 1].to;
  });

  const stints = [...closed];
  if (acc?.team) {
    let from = null; // never changed team → always been theirs
    if (closed.length) {
      const lastEnd = closed[closed.length - 1].to || 0;
      from = Math.max(Number(acc.teamAssignedAt) || 0, lastEnd) || null;
    }
    stints.push({ team: acc.team, from, to: null });
  }

  return stints.map((s) => ({
    team: s.team,
    fromDate: s.from ? toDateStr(s.from) : null,
    toDate: s.to ? toDateStr(s.to) : null,
  }));
}

// Periods each club was explicitly held by someone — so a manager with an unknown start
// date is never credited with results from another manager's recorded stint.
export function buildBlockedWindows(accounts) {
  const map = {};
  for (const [uid, acc] of Object.entries(accounts || {})) {
    for (const s of buildStints(acc)) {
      if (!s.fromDate && !s.toDate) continue;
      (map[s.team] = map[s.team] || []).push({ uid, fromDate: s.fromDate, toDate: s.toDate });
    }
  }
  return map;
}

function inStint(r, s, uid, blocked) {
  if (r.home !== s.team && r.away !== s.team) return false;
  if (!r.date) return !s.fromDate && !s.toDate; // undated results only fit an unbounded stint
  if (s.fromDate && r.date < s.fromDate) return false;
  if (s.toDate && r.date >= s.toDate) return false;
  if (!s.fromDate) {
    for (const b of blocked[s.team] || []) {
      if (b.uid === uid) continue;
      if ((!b.fromDate || r.date >= b.fromDate) && (!b.toDate || r.date < b.toDate)) return false;
    }
  }
  return true;
}

/* ─── STATS ─────────────────────────────────────────────────────────────── */
export function computeStats(records, stints, uid, blocked) {
  let w = 0, d = 0, l = 0, gs = 0, gc = 0, fw = 0, fl = 0, mp = 0;
  const matchHistory = [];

  for (const r of records) {
    const stint = stints.find((s) => inStint(r, s, uid, blocked));
    if (!stint) continue;

    mp++;
    if (isNoContest(r)) {
      matchHistory.push({ home: r.home, away: r.away, homeScore: 0, awayScore: 0, tournament: r.tournament, season: r.season, md: r.md, date: r.date, isForfeit: false, isNoContest: true });
      continue;
    }

    const forf = isForfeit(r);
    const isHome = r.home === stint.team;
    const ms = isHome ? r.homeScore : r.awayScore;
    const mc = isHome ? r.awayScore : r.homeScore;

    if (forf) {
      if (ms > mc) { w++; fw++; }
      else { l++; fl++; gc += 3; }
    } else {
      gs += ms; gc += mc;
      if (ms > mc) w++;
      else if (ms === mc) d++;
      else l++;
    }
    matchHistory.push({ home: r.home, away: r.away, homeScore: r.homeScore, awayScore: r.awayScore, tournament: r.tournament, season: r.season, md: r.md, date: r.date, isForfeit: forf, isNoContest: false });
  }

  const games = w + d + l;
  matchHistory.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.season * 1000 + b.md) - (a.season * 1000 + a.md));
  return {
    w, d, l, gs, gc, gd: gs - gc, fw, fl, mp,
    winRate: games > 0 ? +((w / games) * 100).toFixed(1) : 0,
    lossRate: games > 0 ? +((l / games) * 100).toFixed(1) : 0,
    matchHistory,
  };
}

/* ─── RANKED LIST ───────────────────────────────────────────────────────── */
// accounts = career_accounts, rankData = career_rankings. Returns managers sorted best → worst,
// each with `rank` (1-based) set.
export async function getRankedManagers(accounts, rankData, { force = false } = {}) {
  const records = await loadAllResults(force);
  const blocked = buildBlockedWindows(accounts);
  const list = [];

  for (const [uid, acc] of Object.entries(accounts || {})) {
    if (!acc) continue;
    const stints = buildStints(acc);
    if (!stints.length) continue; // has never managed a club
    const rd = (rankData || {})[uid] || {};

    list.push({
      uid,
      username: acc.username || "Unknown",
      team: acc.team || null,
      profilePhoto: acc.profilePhoto || null,
      status: rd.overrideStatus || (acc.team ? "active" : "free-agent"),
      trophies: rd.trophies || [],
      medals: rd.medals || [],
      individualAwards: rd.individualAwards || [],
      records: rd.records || [],
      description: rd.description || "",
      trophyCabinet: rd.trophyCabinet || {},
      stints,
      stats: rd.manualStats || computeStats(records, stints, uid, blocked),
    });
  }

  list.sort((a, b) => {
    const sa = totalScore(a), sb = totalScore(b);
    if (sa !== sb) return sb - sa;
    if ((b.trophies || []).length !== (a.trophies || []).length) return (b.trophies || []).length - (a.trophies || []).length;
    if (a.stats.w !== b.stats.w) return b.stats.w - a.stats.w;
    return (b.stats.gd || 0) - (a.stats.gd || 0);
  });
  list.forEach((m, i) => { m.rank = i + 1; });
  return list;
}

// One manager's rank, for the Profile page → { rank, total } or null if unranked.
export async function getManagerRank(uid) {
  const [accSnap, rdSnap] = await Promise.all([
    get(ref(db, PATHS.accounts)),
    get(ref(db, "career_rankings")),
  ]);
  const list = await getRankedManagers(accSnap.val() || {}, rdSnap.val() || {});
  const found = list.find((m) => m.uid === uid);
  return found ? { rank: found.rank, total: list.length } : null;
}
