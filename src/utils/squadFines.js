// ─────────────────────────────────────────────────────────────────────────
// Squad-completion fines.
//
// A club must have: a squad image, all 11 Starting XI slots filled, all 11
// Original Squad names filled in, and all 12 Bench slots filled. Any club
// with a manager that is missing any of these is fined 5,000,000 for every
// full day it stays that way. There is no grace period.
//
// Safety rules (getting this wrong is worse than under-fining):
//   • A club is NEVER fined for "today" — only for days that have fully
//     finished, so a snapshot mid-day can't misjudge the day.
//   • The very first check for a club (or the first after fines are
//     re-enabled) only records a baseline. It never backfills, because we
//     don't know what the squad looked like on earlier days.
//   • A gap between two checks is only backfilled as fined when the squad
//     was confirmed incomplete at BOTH the last check and this one — if it
//     was complete at either end, none of the days in between are charged.
//   • If the squad's data fails to load, that club is skipped for this run
//     — never treated as incomplete because of a loading problem.
//   • A club that is complete right now is never fined, full stop.
//   • Each calendar day is claimed with a Firebase transaction before its
//     fine is written, so the same day can never be charged twice even if
//     two people load the app at the same moment.
// ─────────────────────────────────────────────────────────────────────────
import { db, PATHS } from "../firebase";
import { ref, get, update, runTransaction } from "firebase/database";
import { getSASTToday } from "./sastTime";

export const FINE_AMOUNT = 5_000_000;
export const FINE_CATEGORY = "Fines";
export const FINE_DESCRIPTION = "Incomplete Squad List";

const ALL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function dateToTs(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - 2 * 3600000; // SAST midnight, same convention as the rest of the app
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/* ─── Completeness check ──────────────────────────────────────────────── */
// Returns { ok, complete, missing } — ok:false means "couldn't confirm, skip
// this club", never treated as incomplete.
export async function checkSquadCompleteness(team) {
  try {
    const [infoSnap, squadSnap] = await Promise.all([
      get(ref(db, `career_team_management/${team}/squad_info`)),
      get(ref(db, `career_team_management/${team}/squad`)),
    ]);
    const info = infoSnap.val() || {};
    const squad = squadSnap.val() || {};
    const players = Object.values(squad);

    const hasImage = !!info.image;
    const original = Array.isArray(info.originalSquad) ? info.originalSquad : [];
    const hasOriginal11 = original.filter((n) => (n || "").trim()).length >= 11;
    const startingCount = players.filter((p) => p?.role === "starting" && (p.name || "").trim()).length;
    const benchCount = players.filter((p) => p?.role === "bench" && (p.name || "").trim()).length;

    const missing = [];
    if (!hasImage) missing.push("squad image");
    if (startingCount < 11) missing.push("starting XI");
    if (!hasOriginal11) missing.push("original 11");
    if (benchCount < 12) missing.push("bench");

    return { ok: true, complete: missing.length === 0, missing };
  } catch (e) {
    console.error(`Squad fine check failed for ${team}:`, e);
    return { ok: false, complete: null, missing: [] };
  }
}

export function describeMissing(missing) {
  if (!missing || missing.length === 0) return "";
  if (missing.length === 1) return missing[0];
  return missing.slice(0, -1).join(", ") + " and " + missing[missing.length - 1];
}

/* ─── Global on/off switch ────────────────────────────────────────────── */
export async function getSquadFinesSettings() {
  const snap = await get(ref(db, PATHS.globalSettings));
  const s = snap.val() || {};
  return { enabled: !!s.squadFinesEnabled, enabledSince: s.squadFinesEnabledSince || null };
}

export async function setSquadFinesEnabled(enabled) {
  const updates = { [`${PATHS.globalSettings}/squadFinesEnabled`]: !!enabled };
  if (enabled) updates[`${PATHS.globalSettings}/squadFinesEnabledSince`] = getSASTToday();
  await update(ref(db), updates);
}

/* ─── One club's fine sweep ───────────────────────────────────────────── */
async function claimDate(team, dateStr) {
  const result = await runTransaction(ref(db, `career_team_management/${team}/squad_info/finedDates/${dateStr}`), (cur) => {
    if (cur) return; // already claimed — abort, don't overwrite
    return true;
  });
  return result.committed;
}

async function fineDay(team, dateStr) {
  const claimed = await claimDate(team, dateStr);
  if (!claimed) return false;
  const ts = dateToTs(dateStr);
  const d = new Date(ts);
  await update(ref(db), {
    [`career_team_management/${team}/finance/transactions/squadfine_${dateStr}`]: {
      type: "expense",
      category: FINE_CATEGORY,
      source: FINE_DESCRIPTION,
      amount: FINE_AMOUNT,
      month: ALL_MONTHS[d.getUTCMonth()],
      monthIndex: d.getUTCMonth(),
      year: d.getUTCFullYear(),
      createdAt: ts,
      debitDate: dateStr,
      squadFine: true,
      sentBy: "System (Squad Fine)",
    },
  });
  return true;
}

async function sweepClub(team, enabledSince, yesterday) {
  const statePath = `career_team_management/${team}/squad_info/fineState`;
  const [stateSnap, check] = await Promise.all([get(ref(db, statePath)), checkSquadCompleteness(team)]);
  if (!check.ok) return; // couldn't confirm — never guess

  const state = stateSnap.val();
  const today = getSASTToday();
  const hasUsableBaseline = state && state.lastCheckedDate && state.lastCheckedDate >= enabledSince;

  if (hasUsableBaseline && state.lastCheckedDate !== today) {
    // Only backfill the gap when BOTH ends were confirmed incomplete.
    if (state.lastCheckedComplete === false && check.complete === false) {
      let d = addDays(state.lastCheckedDate, 1);
      while (d <= yesterday) {
        await fineDay(team, d);
        d = addDays(d, 1);
      }
    }
  }

  await update(ref(db, statePath), { lastCheckedDate: today, lastCheckedComplete: check.complete });
}

/* ─── Whole-app sweep — call once per app load ────────────────────────── */
export async function processSquadFinesForAllClubs() {
  try {
    const settings = await getSquadFinesSettings();
    if (!settings.enabled) return;

    const today = getSASTToday();
    const yesterday = addDays(today, -1);
    if (yesterday < settings.enabledSince) return; // not even one full day has passed yet

    const accSnap = await get(ref(db, PATHS.accounts));
    const accounts = accSnap.val() || {};
    const teams = [...new Set(Object.values(accounts).filter((a) => a?.team).map((a) => a.team))];

    for (const team of teams) {
      try {
        await sweepClub(team, settings.enabledSince, yesterday);
      } catch (e) {
        console.error(`Squad fine sweep failed for ${team}:`, e);
      }
    }
  } catch (e) {
    console.error("Squad fine sweep error:", e);
  }
}

/* ─── Admin overview: current status for every managed club ─────────────── */
export async function getAllSquadStatuses() {
  const accSnap = await get(ref(db, PATHS.accounts));
  const accounts = accSnap.val() || {};
  const teams = [...new Set(Object.values(accounts).filter((a) => a?.team).map((a) => a.team))].sort((a, b) => a.localeCompare(b));

  const results = await Promise.all(
    teams.map(async (team) => {
      const check = await checkSquadCompleteness(team);
      const finedSnap = await get(ref(db, `career_team_management/${team}/squad_info/finedDates`));
      const finedCount = Object.keys(finedSnap.val() || {}).length;
      return { team, ...check, totalFined: finedCount * FINE_AMOUNT, daysFined: finedCount };
    })
  );
  return results;
}
