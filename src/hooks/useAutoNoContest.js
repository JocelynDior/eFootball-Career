import { useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, get, push } from "firebase/database";
import { applyResultToTable } from "../utils/tableLogic";

const LEAGUE_TOURNAMENT_MAP = {
  premier: "premier league",
  seriea: "serie a",
  laliga: "la liga",
};

// Returns SAST midnight (UTC ms) for a given date string "YYYY-MM-DD"
function dateStrToSASTMidnightMs(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // SAST = UTC+2, so SAST midnight = UTC 22:00 previous day
  return Date.UTC(y, m - 1, d, 0, 0, 0) - 2 * 3600000;
}

// Check if two dates (strings "YYYY-MM-DD") are within 2 days of each other (either direction)
function withinTwoDays(dateA, dateB) {
  const msA = new Date(dateA).getTime();
  const msB = new Date(dateB).getTime();
  return Math.abs(msA - msB) <= 2 * 24 * 3600000;
}

export function useAutoNoContest(league, season) {
  useEffect(() => {
    if (!league || !season) return;

    async function runCheck() {
      const tournamentKey = LEAGUE_TOURNAMENT_MAP[league] || league;

      // Fetch calendar, results in parallel
      const [calSnap, resultsSnap] = await Promise.all([
        get(ref(db, "career_calendarEvents")),
        get(ref(db, PATHS.results(league, season))),
      ]);

      const calendarData = calSnap.val() || {};
      const resultsData = resultsSnap.val() || {};
      const existingResults = Object.values(resultsData);

      const nowMs = Date.now();

      // Collect all past fixtures whose 48hr deadline has expired
      for (const [dateStr, dayData] of Object.entries(calendarData)) {
        const deadlineMs = dateStrToSASTMidnightMs(dateStr) + 48 * 3600000;

        // Only process past deadlines
        if (nowMs < deadlineMs) continue;

        if (!dayData?.tournaments) continue;

        for (const tourn of Object.values(dayData.tournaments)) {
          if (!(tourn?.name || "").toLowerCase().includes(tournamentKey)) continue;

          for (const fix of Object.values(tourn?.fixtures || {})) {
            if (!fix?.home || !fix?.away) continue;

            const home = fix.home;
            const away = fix.away;

            // Check if a result exists for this team pair within 2 days either direction
            const resultFound = existingResults.some(r => {
              const teamsMatch =
                (r.homeTeam === home && r.awayTeam === away) ||
                (r.homeTeam === away && r.awayTeam === home);
              if (!teamsMatch) return false;
              const rDate = r.date ? String(r.date).slice(0, 10) : "";
              return withinTwoDays(dateStr, rDate);
            });

            if (resultFound) continue;

            // No result found — write auto no contest
            try {
              await push(ref(db, PATHS.results(league, season)), {
                homeTeam: home,
                awayTeam: away,
                homeScore: 0,
                awayScore: 0,
                forfeitType: "no_contest",
                matchType: "No Contest",
                md: fix.md || 0,
                date: dateStr,
                goalScorers: { home: [], away: [] },
                assists: { home: [], away: [] },
                submittedAt: Date.now(),
                status: "approved",
                approvedAt: Date.now(),
                autoNoContest: true,
              });
              await applyResultToTable(league, season, home, away, 0, 0, "no_contest");

              // Add the new result locally so we don't double-fire within this same run
              existingResults.push({
                homeTeam: home, awayTeam: away,
                date: dateStr, forfeitType: "no_contest",
              });
            } catch (e) {
              console.error("Auto no-contest error:", e);
            }
          }
        }
      }
    }

    runCheck();
  }, [league, season]);
}
