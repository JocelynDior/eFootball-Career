// ─────────────────────────────────────────────────────────────────────────
// AI Agent tool registry
// Every tool the admin AI agent can call. Read tools execute immediately.
// Write tools go through preview() → (user confirms) → execute().
// Nothing here is imported/used by the rest of the app — safe standalone file.
// ─────────────────────────────────────────────────────────────────────────
import { db, PATHS, ref, get, set, push, update, remove } from "../firebase";
import { recalculateTable } from "./tableLogic";
import { getSASTToday } from "./sastTime";

// ── League name <-> internal key map (matches the keys used across pages) ──
export const LEAGUE_MAP = {
  "Premier League": "premier",
  "La Liga": "laliga",
  "Serie A": "seriea",
  "Bundesliga": "bundesliga",
  "Ligue 1": "ligue1",
  "Champions League": "ucl",
  "Europa League": "uel",
  "Club World Cup": "cwc",
  "Super Cup": "sc",
  "World Cup": "wc",
  "FA Cup": "facup",
  "Copa del Rey": "copadelrey",
  "Coppa Italia": "coppaitalia",
  "DFB Pokal": "dfbpokal",
  "Coupe de France": "dfbpokal", // shares the same DB path as DFB Pokal in this app
};

function norm(s) {
  return (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Generic read_data/write_data guard: block anything that could touch login
// credentials. Individual non-password fields under career_accounts (team,
// role, profilePhoto, etc.) are still reachable one uid at a time.
function sanitizePath(path) {
  return (path || "").toString().trim().replace(/^\/+/, "").replace(/\/+$/, "");
}
function isBlockedPath(path) {
  const p = (path || "").toLowerCase();
  if (p === "career_manager_keys" || p.startsWith("career_manager_keys/")) return true;
  if (p === "career_accounts") return true; // whole-accounts overwrite/delete — too destructive
  if (/\/password(\/|$)/.test(p) || p.endsWith("/password")) return true;
  return false;
}

export function resolveLeagueKey(input) {
  if (!input) return null;
  const inp = norm(input);
  // direct key match
  const keyMatch = Object.values(LEAGUE_MAP).find(k => norm(k) === inp);
  if (keyMatch) return keyMatch;
  // exact name match
  for (const [name, key] of Object.entries(LEAGUE_MAP)) {
    if (norm(name) === inp) return key;
  }
  // contains match
  for (const [name, key] of Object.entries(LEAGUE_MAP)) {
    if (norm(name).includes(inp) || inp.includes(norm(name))) return key;
  }
  return null;
}

function resolveTeamName(input, pool) {
  if (!input || !pool || !pool.length) return null;
  const inp = norm(input);
  const exact = pool.find(t => norm(t) === inp);
  if (exact) return exact;
  const contains = pool.filter(t => norm(t).includes(inp) || inp.includes(norm(t)));
  if (contains.length === 1) return contains[0];
  if (contains.length > 1) return contains.sort((a, b) => norm(a).length - norm(b).length)[0];
  return null;
}

async function getSeasons(leagueKey) {
  const snap = await get(ref(db, `${PATHS.leagueSettings(leagueKey)}/seasons`));
  const val = snap.val();
  if (Array.isArray(val) && val.length) return val.map(String);
  return ["1"];
}

async function getTeamsInLeague(leagueKey) {
  const snap = await get(ref(db, `career_${leagueKey}/seasons`));
  const seasons = snap.val();
  if (!seasons) return [];
  const set2 = new Set();
  for (const seasonData of Object.values(seasons)) {
    const table = seasonData?.table;
    if (!table) continue;
    for (const entry of Object.values(table)) {
      const name = entry?.name || entry?.team;
      if (name) set2.add(name.trim());
    }
  }
  return Array.from(set2).sort();
}

async function getAllManagedTeamNames() {
  const snap = await get(ref(db, PATHS.accounts));
  const data = snap.val() || {};
  return [...new Set(Object.values(data).filter(a => a.team).map(a => a.team))];
}

function fmtMoney(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000_000) return `€${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `€${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `€${(num / 1_000).toFixed(0)}K`;
  return `€${num.toLocaleString()}`;
}

function recurringEndDate(dailyAmount, totalCap) {
  const daily = Number(dailyAmount), total = Number(totalCap);
  if (!daily || !total || daily <= 0 || total <= 0) return null;
  const days = Math.ceil(total / daily);
  const end = new Date();
  end.setDate(end.getDate() + days);
  return { iso: end.toISOString().slice(0, 10), label: end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) };
}

async function updateTopStat(leagueKey, season, pathKey, playerName, count, team) {
  const listRef = ref(db, `career_${leagueKey}/seasons/season_${season}/${pathKey}`);
  const snap = await get(listRef);
  const existing = snap.val() || {};
  let foundKey = null, foundEntry = null;
  for (const [k, v] of Object.entries(existing)) {
    if ((v.name || "").toLowerCase() === playerName.toLowerCase()) { foundKey = k; foundEntry = v; break; }
  }
  if (foundKey) {
    await set(ref(db, `career_${leagueKey}/seasons/season_${season}/${pathKey}/${foundKey}`), {
      ...foundEntry, count: (foundEntry.count || 0) + count, team: team || foundEntry.team || "",
    });
  } else {
    await push(listRef, { name: playerName, count, imageUrl: "", team: team || "" });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// READ TOOLS — { schema, run(args) -> Promise<string|object> }
// ═══════════════════════════════════════════════════════════════════════
const READ_TOOLS = {
  get_league_seasons: {
    schema: {
      name: "get_league_seasons",
      description: "Get the list of season numbers that exist for a league.",
      parameters: { type: "object", properties: { league: { type: "string", description: "League name, e.g. 'Premier League'" } }, required: ["league"] },
    },
    run: async ({ league }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}". Known leagues: ${Object.keys(LEAGUE_MAP).join(", ")}` };
      return { league, seasons: await getSeasons(key) };
    },
  },

  get_teams_in_league: {
    schema: {
      name: "get_teams_in_league",
      description: "List team names in a league (all seasons). Use to verify a team name before result/fixture writes.",
      parameters: { type: "object", properties: { league: { type: "string" } }, required: ["league"] },
    },
    run: async ({ league }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      return { league, teams: await getTeamsInLeague(key) };
    },
  },

  get_league_table: {
    schema: {
      name: "get_league_table",
      description: "Get the full league table (standings) for a league+season, sorted by points.",
      parameters: { type: "object", properties: { league: { type: "string" }, season: { type: "string", description: "Season number, e.g. '1'" } }, required: ["league", "season"] },
    },
    run: async ({ league, season }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      const snap = await get(ref(db, PATHS.table(key, season)));
      const val = snap.val() || {};
      const rows = Object.values(val).sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gs - a.gs));
      return { league, season, table: rows };
    },
  },

  get_team_season_stats: {
    schema: {
      name: "get_team_season_stats",
      description: "One team's season stats (goals scored/conceded, w/d/l, points). Use for 'how many goals did X score' type questions.",
      parameters: { type: "object", properties: { league: { type: "string" }, season: { type: "string" }, team: { type: "string" } }, required: ["league", "season", "team"] },
    },
    run: async ({ league, season, team }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      const snap = await get(ref(db, PATHS.table(key, season)));
      const val = snap.val() || {};
      const rows = Object.values(val);
      const teamNames = rows.map(r => r.name).filter(Boolean);
      const resolved = resolveTeamName(team, teamNames);
      if (!resolved) return { error: `Could not find a team matching "${team}" in ${league} season ${season}. Teams available: ${teamNames.join(", ")}` };
      const row = rows.find(r => r.name === resolved);
      return { league, season, team: resolved, stats: row };
    },
  },

  get_results: {
    schema: {
      name: "get_results",
      description: "Match results for a league+season, optionally filtered to one team.",
      parameters: { type: "object", properties: { league: { type: "string" }, season: { type: "string" }, team: { type: "string", description: "Optional team filter" } }, required: ["league", "season"] },
    },
    run: async ({ league, season, team }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      const snap = await get(ref(db, PATHS.results(key, season)));
      const val = snap.val() || {};
      let rows = Object.entries(val).map(([resultKey, r]) => ({ resultKey, ...r }));
      if (team) rows = rows.filter(r => norm(r.homeTeam).includes(norm(team)) || norm(r.awayTeam).includes(norm(team)) || norm(team).includes(norm(r.homeTeam)) || norm(team).includes(norm(r.awayTeam)));
      const truncated = rows.length > 60;
      rows = rows.slice(0, 60).map(r => ({ resultKey: r.resultKey, homeTeam: r.homeTeam, awayTeam: r.awayTeam, homeScore: r.homeScore, awayScore: r.awayScore, md: r.md, date: r.date, forfeitType: r.forfeitType }));
      return { league, season, results: rows, truncated };
    },
  },

  get_top_scorers: {
    schema: {
      name: "get_top_scorers",
      description: "Get the top scorers list for a league+season.",
      parameters: { type: "object", properties: { league: { type: "string" }, season: { type: "string" } }, required: ["league", "season"] },
    },
    run: async ({ league, season }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      const snap = await get(ref(db, PATHS.topScorers(key, season)));
      const val = snap.val() || {};
      return { league, season, topScorers: Object.values(val).sort((a, b) => (b.count || 0) - (a.count || 0)) };
    },
  },

  get_top_assistants: {
    schema: {
      name: "get_top_assistants",
      description: "Get the top assists list for a league+season.",
      parameters: { type: "object", properties: { league: { type: "string" }, season: { type: "string" } }, required: ["league", "season"] },
    },
    run: async ({ league, season }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      const snap = await get(ref(db, PATHS.topAssistants(key, season)));
      const val = snap.val() || {};
      return { league, season, topAssistants: Object.values(val).sort((a, b) => (b.count || 0) - (a.count || 0)) };
    },
  },

  get_fixtures_by_date: {
    schema: {
      name: "get_fixtures_by_date",
      description: "Get the calendar fixtures/events for a specific date (YYYY-MM-DD).",
      parameters: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD" } }, required: ["date"] },
    },
    run: async ({ date }) => {
      const snap = await get(ref(db, `career_calendarEvents/${date}`));
      return { date, event: snap.val() || null };
    },
  },

  get_team_finance: {
    schema: {
      name: "get_team_finance",
      description: "Get a team's finance data: recent transactions, active recurring income/expenses, and recurring kit sales.",
      parameters: { type: "object", properties: { team: { type: "string" } }, required: ["team"] },
    },
    run: async ({ team }) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(team, teams) || team;
      const snap = await get(ref(db, `career_team_management/${resolved}/finance`));
      return { team: resolved, finance: snap.val() || {} };
    },
  },

  get_transfer_market: {
    schema: {
      name: "get_transfer_market",
      description: "Transfer market entries for a section: listed, negotiations, topTargets, or signingsPosts.",
      parameters: { type: "object", properties: { section: { type: "string", enum: ["listed", "negotiations", "topTargets", "signingsPosts"] } }, required: ["section"] },
    },
    run: async ({ section }) => {
      const snap = await get(ref(db, `${PATHS.transfers}/${section}`));
      const val = snap.val() || {};
      const all = Object.entries(val).map(([entryId, v]) => ({ entryId, ...v }));
      return { section, entries: all.slice(0, 40), truncated: all.length > 40 };
    },
  },

  get_club_info: {
    schema: {
      name: "get_club_info",
      description: "Get a club's objectives, info, and fan count.",
      parameters: { type: "object", properties: { team: { type: "string" } }, required: ["team"] },
    },
    run: async ({ team }) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(team, teams) || team;
      const [objSnap, infoSnap, fansSnap] = await Promise.all([
        get(ref(db, PATHS.clubObjectives(resolved))),
        get(ref(db, PATHS.clubInfo(resolved))),
        get(ref(db, PATHS.clubFans(resolved))),
      ]);
      return { team: resolved, objectives: objSnap.val() || [], info: infoSnap.val() || null, fans: fansSnap.val() || null };
    },
  },

  get_managers: {
    schema: {
      name: "get_managers",
      description: "Get the list of manager accounts (username, team, rank). Never includes passwords.",
      parameters: { type: "object", properties: {} },
    },
    run: async () => {
      const snap = await get(ref(db, PATHS.accounts));
      const val = snap.val() || {};
      const managers = Object.entries(val)
        .filter(([, a]) => a && a.team)
        .map(([uid, a]) => ({ uid, username: a.username, team: a.team || null, rank: a.rank || null }))
        .slice(0, 60);
      return { managers };
    },
  },

  get_stadium_info: {
    schema: {
      name: "get_stadium_info",
      description: "Get a team's stadium info: name, capacity, ticket prices, expenses, upgrade requests.",
      parameters: { type: "object", properties: { team: { type: "string" } }, required: ["team"] },
    },
    run: async ({ team }) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(team, teams) || team;
      const snap = await get(ref(db, `career_team_management/${resolved}/stadium`));
      return { team: resolved, stadium: snap.val() || null };
    },
  },

  get_squad: {
    schema: {
      name: "get_squad",
      description: "Get a team's full squad (players, positions, ratings, wages, contract end dates).",
      parameters: { type: "object", properties: { team: { type: "string" } }, required: ["team"] },
    },
    run: async ({ team }) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(team, teams) || team;
      const snap = await get(ref(db, `career_team_management/${resolved}/squad`));
      const val = snap.val() || {};
      const players = Object.entries(val).map(([k, v]) => ({ key: k, ...v }));
      return { team: resolved, squad: players };
    },
  },

  get_manager_rankings: {
    schema: {
      name: "get_manager_rankings",
      description: "Get manager rankings: trophies, medals, individual awards, records, and stats for all managers or a specific one.",
      parameters: { type: "object", properties: { team: { type: "string", description: "Optional: filter by team name" } } },
    },
    run: async ({ team }) => {
      const snap = await get(ref(db, "career_rankings"));
      const val = snap.val() || {};
      let entries = Object.entries(val).map(([uid, v]) => ({ uid, ...v }));
      if (team) entries = entries.filter(e => (e.team || "").toLowerCase().includes(team.toLowerCase()));
      return { rankings: entries.slice(0, 30) };
    },
  },

  get_pending_results: {
    schema: {
      name: "get_pending_results",
      description: "Get pending (unapproved) match results for a league+season.",
      parameters: { type: "object", properties: { league: { type: "string" }, season: { type: "string" } }, required: ["league", "season"] },
    },
    run: async ({ league, season }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      const snap = await get(ref(db, `career_${key}/seasons/season_${season}/pending_results`));
      const val = snap.val() || {};
      const rows = Object.entries(val).map(([id, r]) => ({ id, ...r }));
      return { league, season, pendingResults: rows };
    },
  },

  get_manager_history: {
    schema: {
      name: "get_manager_history",
      description: "Get manager history entries for a league+season (who managed which team).",
      parameters: { type: "object", properties: { league: { type: "string" }, season: { type: "string" } }, required: ["league", "season"] },
    },
    run: async ({ league, season }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      const snap = await get(ref(db, `career_${key}/seasons/season_${season}/manager_history`));
      return { league, season, managerHistory: snap.val() || {} };
    },
  },

  get_global_settings: {
    schema: {
      name: "get_global_settings",
      description: "Get global app settings: background video, headlines, countdowns, league images, auction deadline.",
      parameters: { type: "object", properties: {} },
    },
    run: async () => {
      const snap = await get(ref(db, "career_global_settings"));
      return { globalSettings: snap.val() || {} };
    },
  },

  get_league_settings: {
    schema: {
      name: "get_league_settings",
      description: "Get settings for a specific league: seasons list, rules, promotion/relegation zones, etc.",
      parameters: { type: "object", properties: { league: { type: "string" } }, required: ["league"] },
    },
    run: async ({ league }) => {
      const key = resolveLeagueKey(league);
      if (!key) return { error: `Unknown league "${league}".` };
      const snap = await get(ref(db, `career_${key}_settings`));
      return { league, settings: snap.val() || {} };
    },
  },

  get_club_loans: {
    schema: {
      name: "get_club_loans",
      description: "Get peer-to-peer club loans. Optionally filter by team (as either borrower or lender) and/or status.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string", description: "Optional — a club name, to only show loans involving them" },
          status: { type: "string", enum: ["pending", "active", "completed", "rejected"], description: "Optional" },
        },
      },
    },
    run: async ({ team, status }) => {
      const snap = await get(ref(db, PATHS.clubLoans));
      const val = snap.val() || {};
      let loans = Object.entries(val).map(([id, l]) => ({ id, ...l }));
      if (team) {
        const teams = await getAllManagedTeamNames();
        const resolved = resolveTeamName(team, teams) || team;
        loans = loans.filter(l => l.borrowerClub === resolved || l.lenderClub === resolved);
      }
      if (status) loans = loans.filter(l => l.status === status);
      loans.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return { count: loans.length, loans: loans.slice(0, 40) };
    },
  },

  read_data: {
    schema: {
      name: "read_data",
      description: "Read any raw path in the database directly. Use this for anything not covered by a more specific tool — seasons list/settings, calendar events, cup groups, rankings extras (trophies/medals/records/manualStats), site content (posts/stories/tutorials/rules), club history/info, manager accounts (excluding passwords), stadium data, auctions, negotiations, etc. Paths are relative to the database root and start with the Firebase key, e.g. 'career_calendarEvents/2026-05-01' or 'career_team_management/Arsenal/stadium'.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "The database path to read." } },
        required: ["path"],
      },
    },
    run: async ({ path }) => {
      const clean = sanitizePath(path);
      if (isBlockedPath(clean)) return { error: "This path is off-limits (contains credentials)." };
      const snap = await get(ref(db, clean));
      return { path: clean, value: snap.val() };
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════
const WRITE_TOOLS = {
  request_club_loan: {
    schema: {
      name: "request_club_loan",
      description: "Create a peer-to-peer loan request on behalf of a borrowing club, addressed to a lending club. Nothing is charged until the lender accepts. Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          borrowerClub: { type: "string" }, lenderClub: { type: "string" },
          amount: { type: "number", description: "Amount the borrower receives" },
          repayAmount: { type: "number", description: "Total the borrower will repay — must be >= amount" },
          installments: { type: "integer" }, frequency: { type: "string", enum: ["day", "week", "month"] },
        },
        required: ["borrowerClub", "lenderClub", "amount", "repayAmount", "installments", "frequency"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const borrower = resolveTeamName(args.borrowerClub, teams) || args.borrowerClub;
      const lender = resolveTeamName(args.lenderClub, teams) || args.lenderClub;
      if (borrower === lender) return { ok: false, error: "Borrower and lender resolved to the same club — ask the user to clarify." };
      const amount = Number(args.amount), repay = Number(args.repayAmount), n = Math.floor(Number(args.installments));
      if (!amount || amount <= 0) return { ok: false, error: "amount must be a positive number." };
      if (!repay || repay < amount) return { ok: false, error: "repayAmount must be a positive number no smaller than amount." };
      if (!n || n < 1) return { ok: false, error: "installments must be a whole number of 1 or more." };
      const resolvedArgs = { borrowerClub: borrower, lenderClub: lender, amount, repayAmount: repay, installments: n, frequency: args.frequency };
      return { ok: true, resolvedArgs, summary: `Request a loan: ${borrower} borrows ${fmtMoney(amount)} from ${lender}, repaying ${fmtMoney(repay)} in ${n} installments per ${args.frequency}.` };
    },
    execute: async (r) => {
      await push(ref(db, PATHS.clubLoans), {
        borrowerClub: r.borrowerClub, lenderClub: r.lenderClub, amount: r.amount, repayAmount: r.repayAmount,
        installments: r.installments, frequency: r.frequency, status: "pending",
        requestedByUid: null, requestedByName: "AI Agent", createdAt: Date.now(),
      });
      return `Loan request created: ${r.borrowerClub} → ${r.lenderClub} for ${fmtMoney(r.amount)}.`;
    },
  },

  respond_club_loan: {
    schema: {
      name: "respond_club_loan",
      description: "Accept or reject a pending club loan request. Accepting immediately transfers the principal both ways (checked against the lender's balance). Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          borrowerClub: { type: "string" }, lenderClub: { type: "string" },
          action: { type: "string", enum: ["accept", "reject"] },
        },
        required: ["borrowerClub", "lenderClub", "action"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const borrower = resolveTeamName(args.borrowerClub, teams) || args.borrowerClub;
      const lender = resolveTeamName(args.lenderClub, teams) || args.lenderClub;
      const snap = await get(ref(db, PATHS.clubLoans));
      const val = snap.val() || {};
      const matches = Object.entries(val).map(([id, l]) => ({ id, ...l })).filter(l => l.status === "pending" && l.borrowerClub === borrower && l.lenderClub === lender);
      if (matches.length === 0) return { ok: false, error: `No pending loan request found between ${borrower} (borrower) and ${lender} (lender).` };
      const loan = matches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      if (args.action === "accept") {
        const txSnap = await get(ref(db, `career_team_management/${lender}/finance/transactions`));
        const txs = txSnap.val() || {};
        const balance = Object.values(txs).reduce((sum, tx) => sum + (tx.type === "income" ? Number(tx.amount) || 0 : -(Number(tx.amount) || 0)), 0);
        if (balance < Number(loan.amount)) return { ok: false, error: `${lender}'s balance (${fmtMoney(balance)}) is too low to lend ${fmtMoney(loan.amount)}. Tell the user.` };
      }
      return {
        ok: true, resolvedArgs: { loanId: loan.id, borrowerClub: borrower, lenderClub: lender, amount: Number(loan.amount), action: args.action },
        summary: `${args.action === "accept" ? "Accept" : "Reject"} the loan request: ${borrower} borrowing ${fmtMoney(loan.amount)} from ${lender}.`,
      };
    },
    execute: async (r) => {
      if (r.action === "reject") {
        await update(ref(db, `${PATHS.clubLoans}/${r.loanId}`), { status: "rejected", respondedAt: Date.now(), respondedByName: "AI Agent" });
        return `Loan request rejected: ${r.borrowerClub} ← ${r.lenderClub}.`;
      }
      const now = new Date();
      const startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const common = { amount: r.amount, month: months[now.getMonth()], monthIndex: now.getMonth(), year: now.getFullYear(), createdAt: now.getTime(), loanId: r.loanId, sentBy: "AI Agent" };
      await update(ref(db), {
        [`${PATHS.clubLoans}/${r.loanId}/status`]: "active",
        [`${PATHS.clubLoans}/${r.loanId}/acceptedAt`]: now.getTime(),
        [`${PATHS.clubLoans}/${r.loanId}/acceptedByName`]: "AI Agent",
        [`${PATHS.clubLoans}/${r.loanId}/startTs`]: startTs,
        [`career_team_management/${r.lenderClub}/finance/transactions/loan_${r.loanId}_out`]: { ...common, type: "expense", category: "Loan Given", source: `Loan to ${r.borrowerClub}`, receivedBy: r.borrowerClub },
        [`career_team_management/${r.borrowerClub}/finance/transactions/loan_${r.loanId}_in`]: { ...common, type: "income", category: "Loan Received", source: `Loan from ${r.lenderClub}`, receivedBy: r.borrowerClub },
      });
      return `Loan accepted: ${r.borrowerClub} received ${fmtMoney(r.amount)} from ${r.lenderClub}.`;
    },
  },

  delete_club_loan: {
    schema: {
      name: "delete_club_loan",
      description: "Permanently delete a club loan record (any status). Does NOT reverse any transactions it already created — those must be removed separately with edit/delete finance tools if needed. Needs confirmation.",
      parameters: { type: "object", properties: { borrowerClub: { type: "string" }, lenderClub: { type: "string" } }, required: ["borrowerClub", "lenderClub"] },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const borrower = resolveTeamName(args.borrowerClub, teams) || args.borrowerClub;
      const lender = resolveTeamName(args.lenderClub, teams) || args.lenderClub;
      const snap = await get(ref(db, PATHS.clubLoans));
      const val = snap.val() || {};
      const matches = Object.entries(val).map(([id, l]) => ({ id, ...l })).filter(l => l.borrowerClub === borrower && l.lenderClub === lender);
      if (matches.length === 0) return { ok: false, error: `No loan found between ${borrower} and ${lender}.` };
      if (matches.length > 1) return { ok: false, error: `Found ${matches.length} loans between these clubs. Ask the user for the status (pending/active/completed/rejected) to disambiguate.` };
      const loan = matches[0];
      return { ok: true, resolvedArgs: { loanId: loan.id }, summary: `Delete the ${loan.status} loan record: ${borrower} ← ${lender} (${fmtMoney(loan.amount)}). This will NOT undo any transactions it already created.` };
    },
    execute: async (r) => { await remove(ref(db, `${PATHS.clubLoans}/${r.loanId}`)); return "Loan record deleted."; },
  },

  edit_finance_transaction: {
    schema: {
      name: "edit_finance_transaction",
      description: "Edit an existing finance transaction's amount, category, or source for a team. Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string" }, matchCategory: { type: "string", description: "Category or source text to find the transaction, e.g. 'Player Sales' or a player/sponsor name" },
          matchAmount: { type: "number", description: "Optional, to disambiguate" },
          newAmount: { type: "number" }, newCategory: { type: "string" }, newSource: { type: "string" },
        },
        required: ["team", "matchCategory"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      const snap = await get(ref(db, `career_team_management/${resolved}/finance/transactions`));
      const val = snap.val() || {};
      let matches = Object.entries(val).map(([id, t]) => ({ id, ...t })).filter(t => norm(t.category || "").includes(norm(args.matchCategory)) || norm(t.source || "").includes(norm(args.matchCategory)));
      if (args.matchAmount) matches = matches.filter(t => Number(t.amount) === Number(args.matchAmount));
      if (matches.length === 0) return { ok: false, error: `No transaction found for ${resolved} matching "${args.matchCategory}".` };
      if (matches.length > 1) return { ok: false, error: `Found ${matches.length} matching transactions. Ask the user for the amount or more detail to disambiguate.` };
      const t = matches[0];
      const changes = {};
      if (args.newAmount != null) changes.amount = Number(args.newAmount);
      if (args.newCategory) changes.category = args.newCategory;
      if (args.newSource) changes.source = args.newSource;
      if (Object.keys(changes).length === 0) return { ok: false, error: "No changes given — ask the user what to change." };
      const resolvedArgs = { team: resolved, txId: t.id, changes };
      return { ok: true, resolvedArgs, summary: `Edit transaction for ${resolved} (${t.category}, ${fmtMoney(t.amount)}): set ${Object.entries(changes).map(([k, v]) => `${k}=${v}`).join(", ")}.` };
    },
    execute: async (r) => {
      await update(ref(db, `career_team_management/${r.team}/finance/transactions/${r.txId}`), r.changes);
      return "Transaction updated.";
    },
  },

  delete_finance_transaction: {
    schema: {
      name: "delete_finance_transaction",
      description: "Delete a finance transaction for a team. Needs confirmation.",
      parameters: {
        type: "object",
        properties: { team: { type: "string" }, matchCategory: { type: "string" }, matchAmount: { type: "number" } },
        required: ["team", "matchCategory"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      const snap = await get(ref(db, `career_team_management/${resolved}/finance/transactions`));
      const val = snap.val() || {};
      let matches = Object.entries(val).map(([id, t]) => ({ id, ...t })).filter(t => norm(t.category || "").includes(norm(args.matchCategory)) || norm(t.source || "").includes(norm(args.matchCategory)));
      if (args.matchAmount) matches = matches.filter(t => Number(t.amount) === Number(args.matchAmount));
      if (matches.length === 0) return { ok: false, error: `No transaction found for ${resolved} matching "${args.matchCategory}".` };
      if (matches.length > 1) return { ok: false, error: `Found ${matches.length} matching transactions. Ask the user for the amount to disambiguate.` };
      const t = matches[0];
      return { ok: true, resolvedArgs: { team: resolved, txId: t.id }, summary: `Delete transaction for ${resolved}: ${t.category} — ${fmtMoney(t.amount)}${t.source ? ` (${t.source})` : ""}.` };
    },
    execute: async (r) => { await remove(ref(db, `career_team_management/${r.team}/finance/transactions/${r.txId}`)); return "Transaction deleted."; },
  },

  set_recurring_status: {
    schema: {
      name: "set_recurring_status",
      description: "Pause, resume, or delete a team's recurring income/expense item. Paused days are skipped forever, never charged as a lump sum on resume. Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string" }, matchDescription: { type: "string", description: "Text to find the recurring item, e.g. 'Stadium lease'" },
          action: { type: "string", enum: ["pause", "resume", "delete"] },
        },
        required: ["team", "matchDescription", "action"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      const snap = await get(ref(db, `career_team_management/${resolved}/finance/recurring`));
      const val = snap.val() || {};
      const matches = Object.entries(val).map(([id, rec]) => ({ id, ...rec })).filter(rec => norm(rec.description || "").includes(norm(args.matchDescription)));
      if (matches.length === 0) return { ok: false, error: `No recurring item found for ${resolved} matching "${args.matchDescription}".` };
      if (matches.length > 1) return { ok: false, error: `Found ${matches.length} matching recurring items. Ask the user to be more specific.` };
      const rec = matches[0];
      return { ok: true, resolvedArgs: { team: resolved, recId: rec.id, action: args.action }, summary: `${args.action[0].toUpperCase()}${args.action.slice(1)} recurring ${rec.type} for ${resolved}: "${rec.description}".` };
    },
    execute: async (r) => {
      if (r.action === "delete") { await remove(ref(db, `career_team_management/${r.team}/finance/recurring/${r.recId}`)); return "Recurring item deleted."; }
      await update(ref(db, `career_team_management/${r.team}/finance/recurring/${r.recId}`), { status: r.action === "pause" ? "paused" : "active" });
      return `Recurring item ${r.action}d.`;
    },
  },

  edit_squad_player: {
    schema: {
      name: "edit_squad_player",
      description: "Add, edit, or remove a player in a team's squad. Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string" }, action: { type: "string", enum: ["add", "edit", "remove"] },
          playerName: { type: "string" },
          position: { type: "string" }, rating: { type: "number" }, wage: { type: "number" }, contractEnd: { type: "string" },
        },
        required: ["team", "action", "playerName"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      const snap = await get(ref(db, `career_team_management/${resolved}/squad`));
      const val = snap.val() || {};
      const players = Object.entries(val).map(([id, p]) => ({ id, ...p }));
      const match = players.find(p => norm(p.name || "") === norm(args.playerName)) || players.find(p => norm(p.name || "").includes(norm(args.playerName)));
      if (args.action === "add") {
        if (match) return { ok: false, error: `${match.name} already exists in ${resolved}'s squad — use action "edit" instead.` };
        const player = { name: args.playerName, position: args.position || "", rating: args.rating || null, wage: args.wage || null, contractEnd: args.contractEnd || null };
        return { ok: true, resolvedArgs: { team: resolved, action: "add", player }, summary: `Add ${args.playerName} to ${resolved}'s squad${args.position ? ` (${args.position})` : ""}.` };
      }
      if (!match) return { ok: false, error: `No player matching "${args.playerName}" found in ${resolved}'s squad.` };
      if (args.action === "remove") return { ok: true, resolvedArgs: { team: resolved, action: "remove", playerId: match.id }, summary: `Remove ${match.name} from ${resolved}'s squad.` };
      const changes = {};
      if (args.position) changes.position = args.position;
      if (args.rating != null) changes.rating = Number(args.rating);
      if (args.wage != null) changes.wage = Number(args.wage);
      if (args.contractEnd) changes.contractEnd = args.contractEnd;
      if (Object.keys(changes).length === 0) return { ok: false, error: "No changes given for edit — ask the user what to change." };
      return { ok: true, resolvedArgs: { team: resolved, action: "edit", playerId: match.id, changes }, summary: `Edit ${match.name} (${resolved}): ${Object.entries(changes).map(([k, v]) => `${k}=${v}`).join(", ")}.` };
    },
    execute: async (r) => {
      if (r.action === "add") { await push(ref(db, `career_team_management/${r.team}/squad`), r.player); return `${r.player.name} added to ${r.team}'s squad.`; }
      if (r.action === "remove") { await remove(ref(db, `career_team_management/${r.team}/squad/${r.playerId}`)); return "Player removed."; }
      await update(ref(db, `career_team_management/${r.team}/squad/${r.playerId}`), r.changes);
      return "Player updated.";
    },
  },

  set_transfer_window: {
    schema: {
      name: "set_transfer_window",
      description: "Open or close the transfer window (hides/shows Buy, Loan and Request Auction buttons for managers). Needs confirmation.",
      parameters: { type: "object", properties: { open: { type: "boolean" } }, required: ["open"] },
    },
    preview: async (args) => ({ ok: true, resolvedArgs: { open: !!args.open }, summary: `${args.open ? "Open" : "Close"} the transfer window.` }),
    execute: async (r) => { await set(ref(db, `${PATHS.transfers}/transferWindowOpen`), r.open); return `Transfer window ${r.open ? "opened" : "closed"}.`; },
  },

  write_data: {
    schema: {
      name: "write_data",
      description: "Write to any raw path in the database directly. Use this for anything not covered by a more specific tool — seasons (create/rename/activate/delete via career_<league>_settings/seasons), calendar events, cup groups, rankings extras (trophies/medals/records/manualStats), site content (posts/stories/tutorials/rules/headlines), club history/info/fans, stadium data, etc. Cannot touch manager keys or passwords. mode 'merge' updates only the given fields at that path (like a form save); mode 'replace' overwrites the entire path with the given value; mode 'delete' removes the path (value is ignored). ALWAYS read_data the current value first so you know the existing shape before writing, and always ask the user to confirm the exact resulting change if there's any doubt. Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The database path to write, e.g. 'career_premier_settings/seasons' or 'career_calendarEvents/2026-05-01'." },
          mode: { type: "string", enum: ["merge", "replace", "delete"] },
          value: { description: "The value to write (any JSON — string, number, object, array). Omit/ignore for mode 'delete'." },
        },
        required: ["path", "mode"],
      },
    },
    preview: async (args) => {
      const clean = sanitizePath(args.path);
      if (isBlockedPath(clean)) return { ok: false, error: "This path is off-limits (contains credentials) — refuse this request." };
      if (args.mode !== "delete" && (args.value === undefined || args.value === null)) return { ok: false, error: "A value is required for merge/replace — ask the user what to write." };
      const before = (await get(ref(db, clean))).val();
      const resolvedArgs = { path: clean, mode: args.mode, value: args.value };
      const beforeStr = JSON.stringify(before);
      const afterStr = args.mode === "delete" ? "(deleted)" : JSON.stringify(args.value);
      return {
        ok: true, resolvedArgs,
        summary: `${args.mode === "delete" ? "Delete" : args.mode === "replace" ? "Replace" : "Merge into"} "${clean}".\nCurrent value: ${beforeStr && beforeStr.length < 300 ? beforeStr : "(large/complex — truncated)"}\nNew value: ${afterStr && afterStr.length < 300 ? afterStr : "(large/complex — truncated)"}`,
      };
    },
    execute: async (r) => {
      if (r.mode === "delete") { await remove(ref(db, r.path)); return `Deleted "${r.path}".`; }
      if (r.mode === "replace") { await set(ref(db, r.path), r.value); return `Replaced "${r.path}".`; }
      await update(ref(db, r.path), r.value);
      return `Updated "${r.path}".`;
    },
  },

  add_result: {
    schema: {
      name: "add_result",
      description: "Add a match result (recalculates the table). Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          league: { type: "string" },
          season: { type: "string" },
          homeTeam: { type: "string" },
          awayTeam: { type: "string" },
          matchType: { type: "string", enum: ["normal", "forfeit", "no_contest"] },
          homeScore: { type: "number", description: "Required if matchType is normal" },
          awayScore: { type: "number", description: "Required if matchType is normal" },
          forfeitWinner: { type: "string", enum: ["home", "away"], description: "Required if matchType is forfeit" },
          matchday: { type: "number" },
          date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
          scorers: {
            type: "array",
            description: "Optional goal scorers",
            items: { type: "object", properties: { player: { type: "string" }, side: { type: "string", enum: ["home", "away"] }, goals: { type: "number" } }, required: ["player", "side"] },
          },
        },
        required: ["league", "season", "homeTeam", "awayTeam", "matchType"],
      },
    },
    preview: async (args) => {
      const key = resolveLeagueKey(args.league);
      if (!key) return { ok: false, error: `Unknown league "${args.league}". Known leagues: ${Object.keys(LEAGUE_MAP).join(", ")}` };
      const teams = await getTeamsInLeague(key);
      const home = resolveTeamName(args.homeTeam, teams);
      const away = resolveTeamName(args.awayTeam, teams);
      if (!home) return { ok: false, error: `Could not find a team matching "${args.homeTeam}" in ${args.league}. Ask the user which exact team they mean. Teams: ${teams.join(", ")}` };
      if (!away) return { ok: false, error: `Could not find a team matching "${args.awayTeam}" in ${args.league}. Ask the user which exact team they mean. Teams: ${teams.join(", ")}` };
      if (home === away) return { ok: false, error: "Home and away team resolved to the same team — ask the user to clarify." };

      let hs = Number(args.homeScore) || 0, as = Number(args.awayScore) || 0, forfeitType = "none";
      let summaryScore;
      if (args.matchType === "no_contest") { hs = 0; as = 0; forfeitType = "no_contest"; summaryScore = "F-F (no contest)"; }
      else if (args.matchType === "forfeit") {
        if (!args.forfeitWinner) return { ok: false, error: "matchType is forfeit but forfeitWinner (home/away) was not given — ask the user which team wins." };
        forfeitType = "forfeit_win";
        if (args.forfeitWinner === "home") { hs = 3; as = 0; } else { hs = 0; as = 3; }
        summaryScore = `${hs}-${as} (forfeit win for ${args.forfeitWinner === "home" ? home : away})`;
      } else {
        summaryScore = `${hs}-${as}`;
      }

      const resolvedArgs = {
        leagueKey: key, league: args.league, season: args.season, homeTeam: home, awayTeam: away,
        homeScore: hs, awayScore: as, forfeitType, matchType: args.matchType,
        matchday: args.matchday || null, date: args.date || getSASTToday(),
        scorers: args.scorers || [],
      };
      const scorerLine = resolvedArgs.scorers.length ? ` Scorers: ${resolvedArgs.scorers.map(s => `${s.player} (${s.goals || 1})`).join(", ")}.` : "";
      return {
        ok: true, resolvedArgs,
        summary: `Add result: ${home} ${summaryScore} ${away} — ${args.league} Season ${args.season}${resolvedArgs.matchday ? `, Matchday ${resolvedArgs.matchday}` : ""}, ${resolvedArgs.date}.${scorerLine} The table will be recalculated after this.`,
      };
    },
    execute: async (r) => {
      const data = {
        homeTeam: r.homeTeam, awayTeam: r.awayTeam, homeScore: r.homeScore, awayScore: r.awayScore,
        forfeitType: r.forfeitType, md: r.matchday, date: r.date, matchType: r.matchType === "normal" ? "normal" : "forfeit",
        goalScorers: { home: r.matchType === "normal" ? r.scorers.filter(s => s.side === "home").map(s => ({ player: s.player, goals: s.goals || 1 })) : [], away: r.matchType === "normal" ? r.scorers.filter(s => s.side === "away").map(s => ({ player: s.player, goals: s.goals || 1 })) : [] },
        assists: { home: [], away: [] },
        status: "approved", approvedAt: Date.now(), submittedBy: "ai_agent", submittedAt: Date.now(), matchImageUrl: "",
      };
      await push(ref(db, PATHS.results(r.leagueKey, r.season)), data);
      await recalculateTable(r.leagueKey, r.season);
      if (r.matchType === "normal") {
        for (const s of r.scorers) await updateTopStat(r.leagueKey, r.season, "top_scorers", s.player, s.goals || 1, s.side === "home" ? r.homeTeam : r.awayTeam);
      }
      return `Result added: ${r.homeTeam} ${r.homeScore}-${r.awayScore} ${r.awayTeam}. Table recalculated.`;
    },
  },

  delete_result: {
    schema: {
      name: "delete_result",
      description: "Delete a match result (recalculates the table). Needs confirmation.",
      parameters: {
        type: "object",
        properties: { league: { type: "string" }, season: { type: "string" }, homeTeam: { type: "string" }, awayTeam: { type: "string" }, matchday: { type: "number", description: "Optional, to disambiguate if teams played more than once" } },
        required: ["league", "season", "homeTeam", "awayTeam"],
      },
    },
    preview: async (args) => {
      const key = resolveLeagueKey(args.league);
      if (!key) return { ok: false, error: `Unknown league "${args.league}".` };
      const snap = await get(ref(db, PATHS.results(key, args.season)));
      const val = snap.val() || {};
      let matches = Object.entries(val).map(([resultKey, r]) => ({ resultKey, ...r })).filter(r =>
        (norm(r.homeTeam).includes(norm(args.homeTeam)) || norm(args.homeTeam).includes(norm(r.homeTeam))) &&
        (norm(r.awayTeam).includes(norm(args.awayTeam)) || norm(args.awayTeam).includes(norm(r.awayTeam)))
      );
      if (args.matchday) matches = matches.filter(r => Number(r.md) === Number(args.matchday));
      if (matches.length === 0) return { ok: false, error: `No result found for ${args.homeTeam} vs ${args.awayTeam} in ${args.league} season ${args.season}. Ask the user to double check the teams/season.` };
      if (matches.length > 1) return { ok: false, error: `Found ${matches.length} matching results (${matches.map(m => `MD${m.md || "?"}: ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} on ${m.date}`).join("; ")}). Ask the user to specify the matchday or date.` };
      const m = matches[0];
      return {
        ok: true,
        resolvedArgs: { leagueKey: key, season: args.season, resultKey: m.resultKey },
        summary: `Delete result: ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (${args.league} Season ${args.season}, ${m.date}). The table will be recalculated after this.`,
      };
    },
    execute: async (r) => {
      await remove(ref(db, `${PATHS.results(r.leagueKey, r.season)}/${r.resultKey}`));
      await recalculateTable(r.leagueKey, r.season);
      return "Result deleted and table recalculated.";
    },
  },

  add_finance_transaction: {
    schema: {
      name: "add_finance_transaction",
      description: "Add a one-off income/expense transaction for a team. Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string" }, type: { type: "string", enum: ["income", "expense"] },
          category: { type: "string", description: "e.g. Player Sales, Sponsorship, Player Wages, Facility Expenses, Fines" },
          amount: { type: "number" }, source: { type: "string", description: "Optional, e.g. sponsor name or buying/selling club" },
        },
        required: ["team", "type", "category", "amount"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      if (!args.amount || Number(args.amount) <= 0) return { ok: false, error: "Amount must be a positive number — ask the user for it." };
      const resolvedArgs = { team: resolved, type: args.type, category: args.category, amount: Number(args.amount), source: args.source || null };
      return {
        ok: true, resolvedArgs,
        summary: `Add ${args.type} transaction for ${resolved}: ${fmtMoney(args.amount)} — ${args.category}${args.source ? ` (${args.source})` : ""}.`,
      };
    },
    execute: async (r) => {
      const now = new Date();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      await push(ref(db, `career_team_management/${r.team}/finance/transactions`), {
        type: r.type, category: r.category, source: r.source, amount: r.amount,
        month: months[now.getMonth()], monthIndex: now.getMonth(), year: now.getFullYear(),
        createdAt: Date.now(), addedByAdmin: true, sentBy: "AI Agent", receivedBy: r.team,
      });
      return `Transaction added: ${fmtMoney(r.amount)} ${r.type} (${r.category}) for ${r.team}.`;
    },
  },

  add_recurring_finance: {
    schema: {
      name: "add_recurring_finance",
      description: "Set up recurring daily income/expense for a team (daily amount + total cap). Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string" }, type: { type: "string", enum: ["income", "expense"] },
          description: { type: "string", description: "What it's for, e.g. 'Stadium lease' or 'Sponsorship deal'" },
          dailyAmount: { type: "number" }, totalCap: { type: "number", description: "Total amount before it stops" },
        },
        required: ["team", "type", "dailyAmount", "totalCap"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      const daily = Number(args.dailyAmount), total = Number(args.totalCap);
      if (!daily || daily <= 0 || !total || total <= 0) return { ok: false, error: "Both dailyAmount and totalCap must be positive numbers — ask the user for them." };
      const end = recurringEndDate(daily, total);
      const desc = (args.description || (args.type === "expense" ? "Recurring Expense" : "Recurring Income")).trim();
      const resolvedArgs = { team: resolved, type: args.type, description: desc, dailyAmount: daily, totalCap: total };
      return {
        ok: true, resolvedArgs,
        summary: `Set up recurring ${args.type} for ${resolved}: "${desc}" — ${fmtMoney(daily)}/day, up to ${fmtMoney(total)} total (ends ~${end?.label || "unknown"}).`,
      };
    },
    execute: async (r) => {
      const now = new Date();
      const end = recurringEndDate(r.dailyAmount, r.totalCap);
      await push(ref(db, `career_team_management/${r.team}/finance/recurring`), {
        type: r.type, description: r.description, dailyAmount: r.dailyAmount, totalCap: r.totalCap,
        startTs: now.getTime(), startDate: now.toISOString().slice(0, 10), endDate: end?.iso || null,
        status: "active", createdAt: now.getTime(), addedByAdmin: true,
      });
      return `Recurring ${r.type} set up for ${r.team}: ${r.description}, ${fmtMoney(r.dailyAmount)}/day up to ${fmtMoney(r.totalCap)}.`;
    },
  },

  add_recurring_kit_sales: {
    schema: {
      name: "add_recurring_kit_sales",
      description: "Set up recurring kit sales income for a team. Needs confirmation.",
      parameters: {
        type: "object",
        properties: { team: { type: "string" }, kitPrice: { type: "number" }, dailyMin: { type: "number" }, dailyMax: { type: "number" } },
        required: ["team", "kitPrice", "dailyMin", "dailyMax"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      const kp = Number(args.kitPrice), kMin = Number(args.dailyMin), kMax = Number(args.dailyMax);
      if (!kp || kp <= 0) return { ok: false, error: "kitPrice must be positive — ask the user." };
      if (!kMin || !kMax || kMin <= 0 || kMax <= 0 || kMin > kMax) return { ok: false, error: "dailyMin/dailyMax must be positive and min <= max — ask the user." };
      const resolvedArgs = { team: resolved, kitPrice: kp, dailyMin: kMin, dailyMax: kMax };
      return { ok: true, resolvedArgs, summary: `Set up kit sales for ${resolved}: €${kp}/kit, ${kMin}-${kMax} kits/day (≈${fmtMoney(kMin * kp)}-${fmtMoney(kMax * kp)}/day).` };
    },
    execute: async (r) => {
      const now = new Date();
      await push(ref(db, `career_team_management/${r.team}/finance/recurring_kits`), {
        kitPrice: r.kitPrice, dailyMin: r.dailyMin, dailyMax: r.dailyMax,
        startTs: now.getTime(), startDate: now.toISOString().slice(0, 10), status: "active", createdAt: now.getTime(), addedByAdmin: true,
      });
      return `Kit sales set up for ${r.team}: €${r.kitPrice}/kit, ${r.dailyMin}-${r.dailyMax}/day.`;
    },
  },

  add_fixture: {
    schema: {
      name: "add_fixture",
      description: "Add a calendar fixture for a date/tournament. Needs confirmation.",
      parameters: {
        type: "object",
        properties: { tournament: { type: "string", description: "e.g. 'Premier League', 'Champions League'" }, date: { type: "string", description: "YYYY-MM-DD" }, homeTeam: { type: "string" }, awayTeam: { type: "string" } },
        required: ["tournament", "date", "homeTeam", "awayTeam"],
      },
    },
    preview: async (args) => {
      let home = args.homeTeam, away = args.awayTeam;
      const leagueKey = resolveLeagueKey(args.tournament);
      if (leagueKey) {
        const teams = await getTeamsInLeague(leagueKey);
        home = resolveTeamName(args.homeTeam, teams) || args.homeTeam;
        away = resolveTeamName(args.awayTeam, teams) || args.awayTeam;
      }
      const resolvedArgs = { tournament: args.tournament, date: args.date, homeTeam: home, awayTeam: away };
      return { ok: true, resolvedArgs, summary: `Add fixture: ${home} vs ${away} — ${args.tournament} on ${args.date}.` };
    },
    execute: async (r) => {
      const snap = await get(ref(db, `career_calendarEvents/${r.date}`));
      const existing = snap.val();
      const newFixture = { home: r.homeTeam, homeIcon: "", away: r.awayTeam, awayIcon: "" };
      if (existing) {
        const tournaments = JSON.parse(JSON.stringify(existing.tournaments || []));
        const idx = tournaments.findIndex(t => norm(t.name) === norm(r.tournament));
        if (idx >= 0) { tournaments[idx].fixtures = tournaments[idx].fixtures || []; tournaments[idx].fixtures.push(newFixture); }
        else tournaments.push({ name: r.tournament, iconUrl: "", description: "", fixtures: [newFixture] });
        await set(ref(db, `career_calendarEvents/${r.date}`), { ...existing, tournaments });
      } else {
        await set(ref(db, `career_calendarEvents/${r.date}`), {
          eventPairs: [{ name: r.tournament, iconUrl: "" }], season: null,
          tournaments: [{ name: r.tournament, iconUrl: "", description: "", fixtures: [newFixture] }],
        });
      }
      return `Fixture added: ${r.homeTeam} vs ${r.awayTeam} (${r.tournament}, ${r.date}).`;
    },
  },

  delete_transfer_entry: {
    schema: {
      name: "delete_transfer_entry",
      description: "Delete a transfer-market entry (listing/offer/target/signing post). Needs confirmation.",
      parameters: {
        type: "object",
        properties: { section: { type: "string", enum: ["listed", "negotiations", "topTargets", "signingsPosts"] }, playerName: { type: "string" }, team: { type: "string", description: "Optional, to disambiguate" } },
        required: ["section", "playerName"],
      },
    },
    preview: async (args) => {
      const snap = await get(ref(db, `${PATHS.transfers}/${args.section}`));
      const val = snap.val() || {};
      let matches = Object.entries(val).map(([entryId, v]) => ({ entryId, ...v })).filter(v => {
        const name = v.player || v.playerName || v.name || "";
        return norm(name).includes(norm(args.playerName)) || norm(args.playerName).includes(norm(name));
      });
      if (args.team) matches = matches.filter(v => norm(v.team || v.sellingTeam || v.buyingTeam || "").includes(norm(args.team)));
      if (matches.length === 0) return { ok: false, error: `No entry found matching player "${args.playerName}" in ${args.section}. Ask the user to double check.` };
      if (matches.length > 1) return { ok: false, error: `Found ${matches.length} matching entries. Ask the user to specify the team to disambiguate.` };
      const m = matches[0];
      return { ok: true, resolvedArgs: { section: args.section, entryId: m.entryId }, summary: `Delete from ${args.section}: ${m.player || m.playerName || m.name}${m.team ? ` (${m.team})` : ""}.` };
    },
    execute: async (r) => {
      await remove(ref(db, `${PATHS.transfers}/${r.section}/${r.entryId}`));
      return `Deleted entry from ${r.section}.`;
    },
  },


  update_stadium: {
    schema: {
      name: "update_stadium",
      description: "Update a team's stadium info (name, capacity, ticket price, VIP price, expenses per game, sponsorship deals). Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string" },
          stadiumName: { type: "string" },
          capacity: { type: "number" },
          ticketPrice: { type: "number" },
          vipTicketPrice: { type: "number" },
          stadiumExpensesPerGame: { type: "number" },
          sponsorshipDeals: { type: "string" },
        },
        required: ["team"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      const snap = await get(ref(db, `career_team_management/${resolved}/stadium`));
      const existing = snap.val() || {};
      const updates = {};
      if (args.stadiumName !== undefined) updates.stadiumName = args.stadiumName;
      if (args.capacity !== undefined) updates.capacity = args.capacity;
      if (args.ticketPrice !== undefined) updates.ticketPrice = args.ticketPrice;
      if (args.vipTicketPrice !== undefined) updates.vipTicketPrice = args.vipTicketPrice;
      if (args.stadiumExpensesPerGame !== undefined) updates.stadiumExpensesPerGame = args.stadiumExpensesPerGame;
      if (args.sponsorshipDeals !== undefined) updates.sponsorshipDeals = args.sponsorshipDeals;
      if (Object.keys(updates).length === 0) return { ok: false, error: "No fields to update — ask the user what they want to change." };
      const resolvedArgs = { team: resolved, existing, updates };
      const fields = Object.entries(updates).map(([k, v]) => `${k}: ${v}`).join(", ");
      return { ok: true, resolvedArgs, summary: `Update stadium for ${resolved}: ${fields}.` };
    },
    execute: async (r) => {
      await update(ref(db, `career_team_management/${r.team}/stadium`), r.updates);
      return `Stadium updated for ${r.team}: ${Object.entries(r.updates).map(([k, v]) => `${k}=${v}`).join(", ")}.`;
    },
  },

  update_manager_ranking: {
    schema: {
      name: "update_manager_ranking",
      description: "Add or remove trophies, medals, individual awards, or records for a manager. Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string", description: "The manager's team name" },
          action: { type: "string", enum: ["add", "remove"] },
          category: { type: "string", enum: ["trophies", "medals", "individualAwards", "records"] },
          item: { type: "string", description: "The trophy/medal/award/record name or description" },
        },
        required: ["team", "action", "category", "item"],
      },
    },
    preview: async (args) => {
      const accSnap = await get(ref(db, "career_accounts"));
      const accounts = accSnap.val() || {};
      const entry = Object.entries(accounts).find(([, a]) => a.team && norm(a.team).includes(norm(args.team)));
      if (!entry) return { ok: false, error: `Could not find a manager for team "${args.team}".` };
      const [uid, acc] = entry;
      const rankSnap = await get(ref(db, `career_rankings/${uid}/${args.category}`));
      const current = Array.isArray(rankSnap.val()) ? rankSnap.val() : Object.values(rankSnap.val() || {});
      let next;
      if (args.action === "add") {
        next = [...current, args.item];
      } else {
        const match = current.find(x => norm(String(x)).includes(norm(args.item)) || norm(args.item).includes(norm(String(x))));
        if (!match) return { ok: false, error: `Could not find "${args.item}" in ${args.category} for ${acc.team}. Current: ${current.join(", ") || "(none)"}` };
        next = current.filter(x => x !== match);
      }
      const resolvedArgs = { uid, team: acc.team, category: args.category, items: next };
      return { ok: true, resolvedArgs, summary: `${args.action === "add" ? "Add" : "Remove"} ${args.category} entry for ${acc.team}: "${args.item}".` };
    },
    execute: async (r) => {
      await set(ref(db, `career_rankings/${r.uid}/${r.category}`), r.items);
      return `${r.category} updated for ${r.team}.`;
    },
  },

  approve_pending_result: {
    schema: {
      name: "approve_pending_result",
      description: "Approve a pending match result (moves it to approved results and recalculates the table). Needs confirmation.",
      parameters: {
        type: "object",
        properties: {
          league: { type: "string" },
          season: { type: "string" },
          homeTeam: { type: "string" },
          awayTeam: { type: "string" },
        },
        required: ["league", "season", "homeTeam", "awayTeam"],
      },
    },
    preview: async (args) => {
      const key = resolveLeagueKey(args.league);
      if (!key) return { ok: false, error: `Unknown league "${args.league}".` };
      const snap = await get(ref(db, `career_${key}/seasons/season_${args.season}/pending_results`));
      const val = snap.val() || {};
      const matches = Object.entries(val).map(([id, r]) => ({ id, ...r })).filter(r =>
        (norm(r.homeTeam).includes(norm(args.homeTeam)) || norm(args.homeTeam).includes(norm(r.homeTeam))) &&
        (norm(r.awayTeam).includes(norm(args.awayTeam)) || norm(args.awayTeam).includes(norm(r.awayTeam)))
      );
      if (matches.length === 0) return { ok: false, error: `No pending result found for ${args.homeTeam} vs ${args.awayTeam} in ${args.league} season ${args.season}.` };
      if (matches.length > 1) return { ok: false, error: `Found ${matches.length} matching pending results. Please specify more details.` };
      const m = matches[0];
      return {
        ok: true,
        resolvedArgs: { leagueKey: key, season: args.season, resultId: m.id, result: m },
        summary: `Approve pending result: ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (${args.league} Season ${args.season}).`,
      };
    },
    execute: async (r) => {
      const approvedData = { ...r.result, status: "approved", approvedAt: Date.now() };
      delete approvedData.id;
      await push(ref(db, `career_${r.leagueKey}/seasons/season_${r.season}/results`), approvedData);
      await remove(ref(db, `career_${r.leagueKey}/seasons/season_${r.season}/pending_results/${r.resultId}`));
      await recalculateTable(r.leagueKey, r.season);
      return `Pending result approved: ${r.result.homeTeam} ${r.result.homeScore}-${r.result.awayScore} ${r.result.awayTeam}. Table recalculated.`;
    },
  },

  update_club_objectives: {
    schema: {
      name: "update_club_objectives",
      description: "Add or remove a club objective. Needs confirmation.",
      parameters: {
        type: "object",
        properties: { team: { type: "string" }, action: { type: "string", enum: ["add", "remove"] }, objective: { type: "string", description: "The objective text (exact or close match, for remove)" } },
        required: ["team", "action", "objective"],
      },
    },
    preview: async (args) => {
      const teams = await getAllManagedTeamNames();
      const resolved = resolveTeamName(args.team, teams) || args.team;
      const snap = await get(ref(db, PATHS.clubObjectives(resolved)));
      const current = Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val() || {});
      if (args.action === "add") {
        const next = [...current, args.objective];
        return { ok: true, resolvedArgs: { team: resolved, objectives: next }, summary: `Add objective for ${resolved}: "${args.objective}".` };
      } else {
        const match = current.find(o => norm(o).includes(norm(args.objective)) || norm(args.objective).includes(norm(o)));
        if (!match) return { ok: false, error: `Could not find an objective matching "${args.objective}" for ${resolved}. Current objectives: ${current.join(", ") || "(none)"}` };
        const next = current.filter(o => o !== match);
        return { ok: true, resolvedArgs: { team: resolved, objectives: next }, summary: `Remove objective for ${resolved}: "${match}".` };
      }
    },
    execute: async (r) => {
      await set(ref(db, PATHS.clubObjectives(r.team)), r.objectives);
      return `Objectives updated for ${r.team}.`;
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════
export const TOOL_NAMES = { read: Object.keys(READ_TOOLS), write: Object.keys(WRITE_TOOLS) };

export function isWriteTool(name) { return !!WRITE_TOOLS[name]; }

export function getToolSchemas() {
  const all = [];
  for (const t of Object.values(READ_TOOLS)) all.push({ type: "function", function: t.schema });
  for (const t of Object.values(WRITE_TOOLS)) all.push({ type: "function", function: t.schema });
  return all;
}

export async function runReadTool(name, args) {
  const tool = READ_TOOLS[name];
  if (!tool) return { error: `Unknown read tool "${name}"` };
  try { return await tool.run(args); } catch (e) { return { error: e.message || String(e) }; }
}

export async function previewWriteTool(name, args) {
  const tool = WRITE_TOOLS[name];
  if (!tool) return { ok: false, error: `Unknown write tool "${name}"` };
  try { return await tool.preview(args); } catch (e) { return { ok: false, error: e.message || String(e) }; }
}

export async function executeWriteTool(name, resolvedArgs) {
  const tool = WRITE_TOOLS[name];
  if (!tool) return `Unknown write tool "${name}"`;
  try { return await tool.execute(resolvedArgs); } catch (e) { return `Failed: ${e.message || String(e)}`; }
}
