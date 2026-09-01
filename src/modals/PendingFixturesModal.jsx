import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, push, set, get } from "firebase/database";
import { applyResultToTable } from "../utils/tableLogic";

// SAST helpers
function getSASTDateStr(offsetDays = 0) {
  const d = new Date(Date.now() + 2 * 3600000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split("T")[0];
}
function getSASTMidnightMs(offsetDays = 0) {
  const sastNow = new Date(Date.now() + 2 * 3600000);
  return (
    new Date(
      Date.UTC(
        sastNow.getUTCFullYear(),
        sastNow.getUTCMonth(),
        sastNow.getUTCDate() + offsetDays,
        0, 0, 0
      ) - 2 * 3600000
    ).getTime()
  );
}

// Map LEAGUE constant → tournament name substring in calendar
const LEAGUE_NAME_MAP = {
  laliga: "la liga",
  seriea: "serie a",
  premier: "premier league",
};

// ── Live countdown hook ───────────────────────────────────────────────────────
function useCountdown(deadlineMs) {
  const [remaining, setRemaining] = useState(Math.max(0, deadlineMs - Date.now()));
  useEffect(() => {
    function tick() { setRemaining(Math.max(0, deadlineMs - Date.now())); }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);
  return remaining;
}

// ── Countdown display for a single fixture card ───────────────────────────────
function FixtureCountdown({ deadlineMs, accent = "#FF1493" }) {
  const remaining = useCountdown(deadlineMs);
  const h = String(Math.floor(remaining / 3600000)).padStart(2, "0");
  const m = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  const expired = remaining === 0;
  const color = expired ? "#ff4444" : remaining < 3600000 ? "#ff6b6b" : remaining < 7200000 ? "#FFB347" : accent;
  return (
    <span style={{ color, fontFamily: "monospace", fontWeight: 700, fontSize: "0.85rem" }}>
      {expired ? "⌛ EXPIRED" : `⏱ ${h}:${m}:${s}`}
    </span>
  );
}

// ── Single fixture card (calendar fixture not yet uploaded) ───────────────────
function CalendarFixtureCard({ fixture, deadlineMs, onNoContest, declaring }) {
  const remaining = useCountdown(deadlineMs);
  const expired = remaining === 0;
  const accent = "#FF1493";

  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: `1px solid ${expired ? "rgba(255,68,68,0.4)" : "rgba(255,20,147,0.2)"}`,
      borderRadius: 16, padding: "16px 20px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
            {fixture.home} <span style={{ color: accent }}>vs</span> {fixture.away}
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: 3 }}>
            {fixture.date} {fixture.md ? `· MD ${fixture.md}` : ""}
          </div>
        </div>
        <FixtureCountdown deadlineMs={deadlineMs} accent={accent} />
      </div>
      <button
        onClick={() => onNoContest(fixture)}
        disabled={declaring === fixture.key}
        style={{
          width: "100%", padding: "9px 0",
          background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)",
          borderRadius: 10, color: "#ffaaaa", fontWeight: 700,
          cursor: declaring === fixture.key ? "not-allowed" : "pointer",
          fontSize: "0.85rem", opacity: declaring === fixture.key ? 0.6 : 1,
          fontFamily: "inherit",
        }}
      >
        {declaring === fixture.key ? "Declaring..." : "🚫 Declare No Contest"}
      </button>
    </div>
  );
}

// ── Pending submission card (manager submitted, awaiting admin approval) ──────
function PendingSubmissionCard({ item, deadlineMs, onApprove, onNoContest, onReject }) {
  const remaining = useCountdown(deadlineMs);
  const expired = remaining === 0;
  const accent = "#FF1493";
  const color = expired ? "#ff4444" : remaining < 3600000 ? "#ff6b6b" : remaining < 7200000 ? "#FFB347" : "#22c55e";

  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,20,147,0.25)",
      borderRadius: 16, padding: "16px 20px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
            {item.homeTeam} <span style={{ color: accent }}>{item.homeScore ?? "?"} — {item.awayScore ?? "?"}</span> {item.awayTeam}
          </div>
          {item.md && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: 2 }}>MD {item.md} · {item.date || ""}</div>}
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: 4 }}>by {item.submittedBy || "manager"}</div>
        </div>
        <span style={{ color, fontFamily: "monospace", fontWeight: 700, fontSize: "0.85rem" }}>
          {expired ? "⌛ EXPIRED" : `⏱ ${String(Math.floor(remaining / 3600000)).padStart(2, "0")}:${String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => onApprove(item)} style={{ flex: 1, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e", padding: "8px 0", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>✅ Approve</button>
        <button onClick={() => onNoContest(item)} style={{ flex: 1, background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.4)", color: "#FFB347", padding: "8px 0", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>🟡 No Contest</button>
        <button onClick={() => onReject(item)} style={{ flex: 1, background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "8px 0", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>🗑️ Reject</button>
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{
        display: "inline-block",
        background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)",
        borderRadius: 30, padding: "5px 16px",
        color: "#fff", fontWeight: 700, fontSize: "0.82rem", letterSpacing: 1,
        textTransform: "uppercase",
      }}>{children}</div>
      {badge !== undefined && (
        <div style={{ background: "#FF1493", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>{badge}</div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function PendingFixturesModal({ league, season, onClose }) {
  const [calendarData, setCalendarData] = useState({});
  const [results, setResults] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [autoNoContest, setAutoNoContest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [declaring, setDeclaring] = useState(null);
  const autoFiredRef = useRef(new Set()); // track which fixtures we've already auto-fired

  const todayStr = getSASTDateStr(0);
  const yesterdayStr = getSASTDateStr(-1);
  const todayDeadlineMs = getSASTMidnightMs(0) + 48 * 3600000;
  const yesterdayDeadlineMs = getSASTMidnightMs(-1) + 48 * 3600000;

  // Load everything
  useEffect(() => {
    const unsubs = [
      onValue(ref(db, "career_calendarEvents"), snap => {
        setCalendarData(snap.val() || {});
      }),
      onValue(ref(db, PATHS.results(league, season)), snap => {
        setResults(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : []);
      }),
      onValue(ref(db, PATHS.pendingResults(league, season)), snap => {
        setPendingSubmissions(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : []);
        setLoading(false);
      }),
      onValue(ref(db, `career_${league}_settings/autoNoContest`), snap => {
        setAutoNoContest(snap.val() === true);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [league, season]);

  // ── Parse calendar fixtures for this league (today + yesterday only) ────────
  const tournamentKey = LEAGUE_NAME_MAP[league] || league.replace(/_/g, " ");

  function getCalendarFixturesForDate(dateStr) {
    const dayData = calendarData[dateStr];
    if (!dayData?.tournaments) return [];
    const fixtures = [];
    for (const tourn of Object.values(dayData.tournaments)) {
      if ((tourn?.name || "").toLowerCase().includes(tournamentKey)) {
        for (const [fKey, f] of Object.entries(tourn?.fixtures || {})) {
          if (f?.home && f?.away) {
            fixtures.push({ key: fKey, home: f.home, away: f.away, date: dateStr, md: f.md });
          }
        }
      }
    }
    return fixtures;
  }

  // ── Check if result already uploaded (home + away + date) ───────────────────
  function resultExists(home, away, date) {
    return results.some(r => {
      const rDate = r.date ? String(r.date).slice(0, 10) : "";
      return rDate === date &&
        ((r.homeTeam === home && r.awayTeam === away) ||
         (r.homeTeam === away && r.awayTeam === home));
    });
  }

  // ── Check if pending submission exists for a calendar fixture ────────────────
  function pendingSubmissionExists(home, away, date) {
    return pendingSubmissions.some(p => {
      const pDate = p.date ? String(p.date).slice(0, 10) : "";
      return pDate === date &&
        ((p.homeTeam === home && p.awayTeam === away) ||
         (p.homeTeam === away && p.awayTeam === home));
    });
  }

  // ── Calendar fixtures that still need action ─────────────────────────────────
  const calendarToday = getCalendarFixturesForDate(todayStr).filter(
    f => !resultExists(f.home, f.away, f.date) && !pendingSubmissionExists(f.home, f.away, f.date)
  );
  const calendarYesterday = getCalendarFixturesForDate(yesterdayStr).filter(
    f => !resultExists(f.home, f.away, f.date) && !pendingSubmissionExists(f.home, f.away, f.date)
  );

  // ── Pending submissions grouped by date ──────────────────────────────────────
  const submissionsToday = pendingSubmissions.filter(p => {
    if (!p.submittedAt) return true;
    return new Date(p.submittedAt + 2 * 3600000).toISOString().split("T")[0] === todayStr;
  });
  const submissionsYesterday = pendingSubmissions.filter(p => {
    if (!p.submittedAt) return false;
    return new Date(p.submittedAt + 2 * 3600000).toISOString().split("T")[0] === yesterdayStr;
  });

  // ── Stable refs so the auto no-contest interval never stale-closes over arrays ─
  const calendarTodayRef     = useRef([]);
  const calendarYesterdayRef = useRef([]);
  calendarTodayRef.current     = calendarToday;
  calendarYesterdayRef.current = calendarYesterday;

  // ── Auto no-contest logic ────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoNoContest) return;

    async function fireNoContest(fixture, deadlineMs) {
      const fireKey = `${fixture.home}__${fixture.away}__${fixture.date}`;
      if (autoFiredRef.current.has(fireKey)) return;
      if (Date.now() < deadlineMs) return;

      // Mark immediately to prevent concurrent double-fires
      autoFiredRef.current.add(fireKey);

      // Double-check against Firebase directly (source of truth)
      const snap = await get(ref(db, PATHS.results(league, season)));
      const existingResults = snap.val() ? Object.values(snap.val()) : [];
      const alreadyDone = existingResults.some(r => {
        const rDate = r.date ? String(r.date).slice(0, 10) : "";
        return rDate === fixture.date &&
          ((r.homeTeam === fixture.home && r.awayTeam === fixture.away) ||
           (r.homeTeam === fixture.away && r.awayTeam === fixture.home));
      });
      if (alreadyDone) return; // already recorded, keep key in set to suppress future checks

      try {
        await push(ref(db, PATHS.results(league, season)), {
          homeTeam: fixture.home, awayTeam: fixture.away,
          homeScore: 0, awayScore: 0,
          forfeitType: "no_contest", matchType: "No Contest",
          md: fixture.md || 0, date: fixture.date,
          goalScorers: { home: [], away: [] }, assists: { home: [], away: [] },
          submittedAt: Date.now(), status: "approved", approvedAt: Date.now(),
          autoFired: true,
        });
        await applyResultToTable(league, season, fixture.home, fixture.away, 0, 0, "no_contest");
      } catch (e) {
        // Allow retry on next tick
        autoFiredRef.current.delete(fireKey);
        console.error("Auto no-contest failed:", e);
      }
    }

    function runChecks() {
      calendarTodayRef.current.forEach(f => fireNoContest(f, todayDeadlineMs));
      calendarYesterdayRef.current.forEach(f => fireNoContest(f, yesterdayDeadlineMs));
    }

    // Run immediately when enabled, then every 10 s
    runChecks();
    const interval = setInterval(runChecks, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNoContest, todayDeadlineMs, yesterdayDeadlineMs, league, season]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleNoContestCalendar(fixture) {
    if (!window.confirm(`Declare No Contest for ${fixture.home} vs ${fixture.away}?\n\nBoth teams receive a loss. This cannot be undone.`)) return;
    setDeclaring(fixture.key);
    try {
      await push(ref(db, PATHS.results(league, season)), {
        homeTeam: fixture.home, awayTeam: fixture.away,
        homeScore: 0, awayScore: 0,
        forfeitType: "no_contest", matchType: "No Contest",
        md: fixture.md || 0, date: fixture.date,
        goalScorers: { home: [], away: [] }, assists: { home: [], away: [] },
        submittedAt: Date.now(), status: "approved", approvedAt: Date.now(),
      });
      await applyResultToTable(league, season, fixture.home, fixture.away, 0, 0, "no_contest");
    } catch (e) { alert("Error: " + e.message); }
    setDeclaring(null);
  }

  async function handleApproveSubmission(item) {
    if (!window.confirm(`Approve: ${item.homeTeam} ${item.homeScore} - ${item.awayScore} ${item.awayTeam}?`)) return;
    try {
      await push(ref(db, PATHS.results(league, season)), { ...item, status: "approved", approvedAt: Date.now() });
      await applyResultToTable(league, season, item.homeTeam, item.awayTeam, item.homeScore, item.awayScore, item.forfeitType || "none");
      await remove(ref(db, `${PATHS.pendingResults(league, season)}/${item.key}`));
    } catch (e) { alert("Error approving: " + e.message); }
  }

  async function handleNoContestSubmission(item) {
    if (!window.confirm(`No Contest: ${item.homeTeam} vs ${item.awayTeam}?`)) return;
    try {
      await push(ref(db, PATHS.results(league, season)), {
        homeTeam: item.homeTeam, awayTeam: item.awayTeam,
        homeScore: 0, awayScore: 0,
        forfeitType: "no_contest", matchType: "No Contest",
        md: item.md, date: item.date,
        goalScorers: { home: [], away: [] }, assists: { home: [], away: [] },
        submittedBy: item.submittedBy, submittedAt: item.submittedAt,
        status: "approved", approvedAt: Date.now(),
      });
      await applyResultToTable(league, season, item.homeTeam, item.awayTeam, 0, 0, "no_contest");
      await remove(ref(db, `${PATHS.pendingResults(league, season)}/${item.key}`));
    } catch (e) { alert("Error: " + e.message); }
  }

  async function handleRejectSubmission(item) {
    if (!window.confirm("Reject and delete this submission?")) return;
    try { await remove(ref(db, `${PATHS.pendingResults(league, season)}/${item.key}`)); }
    catch (e) { alert("Error: " + e.message); }
  }

  async function toggleAutoNoContest() {
    const next = !autoNoContest;
    setAutoNoContest(next);
    await set(ref(db, `career_${league}_settings/autoNoContest`), next);
  }

  const totalToday = calendarToday.length + submissionsToday.length;
  const totalYesterday = calendarYesterday.length + submissionsYesterday.length;
  const hasAnything = totalToday > 0 || totalYesterday > 0;

  if (loading) return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>⏳ Pending Results</h3>
      <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 40 }}>Loading...</div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", margin: 0 }}>
          ⏳ Pending Results
        </h3>
        {/* Auto No-Contest Toggle */}
        <div
          onClick={toggleAutoNoContest}
          style={{
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
            background: autoNoContest ? "rgba(255,20,147,0.12)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${autoNoContest ? "rgba(255,20,147,0.5)" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 30, padding: "8px 16px", transition: "all 0.2s",
          }}
        >
          <div style={{
            width: 38, height: 20, borderRadius: 10,
            background: autoNoContest ? "#FF1493" : "rgba(255,255,255,0.15)",
            position: "relative", transition: "background 0.2s", flexShrink: 0,
          }}>
            <div style={{
              position: "absolute", top: 2,
              left: autoNoContest ? 20 : 2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#fff", transition: "left 0.2s",
            }} />
          </div>
          <span style={{ color: autoNoContest ? "#FF1493" : "rgba(255,255,255,0.5)", fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>
            Auto No-Contest {autoNoContest ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {autoNoContest && (
        <div style={{ background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>
          ⚡ Auto mode is <strong style={{ color: "#FF1493" }}>ON</strong> — any fixture whose 48hr deadline expires will automatically receive a No Contest result.
        </div>
      )}

      {/* ── TODAY ── */}
      {totalToday > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel badge={totalToday}>📅 TODAY — 48hr deadline</SectionLabel>

          {calendarToday.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Awaiting Result Upload
              </div>
              {calendarToday.map(f => (
                <CalendarFixtureCard
                  key={f.key}
                  fixture={f}
                  deadlineMs={todayDeadlineMs}
                  onNoContest={handleNoContestCalendar}
                  declaring={declaring}
                />
              ))}
            </div>
          )}

          {submissionsToday.length > 0 && (
            <div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Submitted — Awaiting Approval
              </div>
              {submissionsToday.map(item => (
                <PendingSubmissionCard
                  key={item.key}
                  item={item}
                  deadlineMs={todayDeadlineMs}
                  onApprove={handleApproveSubmission}
                  onNoContest={handleNoContestSubmission}
                  onReject={handleRejectSubmission}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── YESTERDAY ── */}
      {totalYesterday > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionLabel badge={totalYesterday}>📅 YESTERDAY — 24hr deadline</SectionLabel>

          {calendarYesterday.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Awaiting Result Upload
              </div>
              {calendarYesterday.map(f => (
                <CalendarFixtureCard
                  key={f.key}
                  fixture={f}
                  deadlineMs={yesterdayDeadlineMs}
                  onNoContest={handleNoContestCalendar}
                  declaring={declaring}
                />
              ))}
            </div>
          )}

          {submissionsYesterday.length > 0 && (
            <div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Submitted — Awaiting Approval
              </div>
              {submissionsYesterday.map(item => (
                <PendingSubmissionCard
                  key={item.key}
                  item={item}
                  deadlineMs={yesterdayDeadlineMs}
                  onApprove={handleApproveSubmission}
                  onNoContest={handleNoContestSubmission}
                  onReject={handleRejectSubmission}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!hasAnything && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: 3 }}>All Clear</div>
          <div style={{ fontSize: "0.85rem", marginTop: 8 }}>No pending fixtures or submissions for today or yesterday.</div>
        </div>
      )}

      <button onClick={onClose} style={{ width: "100%", marginTop: 16, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "0.95rem" }}>
        Close
      </button>
    </div>
  );
}
