import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, push, get } from "firebase/database";
import { applyResultToTable } from "../utils/tableLogic";

function getDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export default function PendingFixturesModal({ league, season, onClose }) {
  const [fixtures, setFixtures] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [declaring, setDeclaring] = useState(null);

  const today = getDateString(0);
  const yesterday = getDateString(-1);

  useEffect(() => {
    // Load fixtures
    const unsubF = onValue(ref(db, `career_${league}/seasons/season_${season}/fixtures`), snap => {
      const d = snap.val();
      setFixtures(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []);
    });
    // Load pending results to know which fixtures already have a submission
    const unsubP = onValue(ref(db, PATHS.pendingResults(league, season)), snap => {
      const d = snap.val();
      setPending(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []);
      setLoading(false);
    });
    return () => { unsubF(); unsubP(); };
  }, [league, season]);

  // Filter fixtures for today and yesterday
  const todayYesterday = fixtures.filter(f => {
    const d = f.date ? String(f.date).slice(0, 10) : "";
    return d === today || d === yesterday;
  });

  // Check if a fixture has a pending result
  function hasPending(f) {
    return pending.some(p =>
      (p.homeTeam === (f.home || f.homeTeam) && p.awayTeam === (f.away || f.awayTeam)) ||
      (p.homeTeam === (f.away || f.awayTeam) && p.awayTeam === (f.home || f.homeTeam))
    );
  }

  async function declareNoContest(f) {
    const homeTeam = f.home || f.homeTeam;
    const awayTeam = f.away || f.awayTeam;
    if (!window.confirm(`Declare No Contest for ${homeTeam} vs ${awayTeam}?\n\nBoth teams will receive a loss (F-F). This cannot be undone.`)) return;
    setDeclaring(f.key);
    try {
      // Save F-F result
      await push(ref(db, PATHS.results(league, season)), {
        homeTeam,
        awayTeam,
        homeScore: 0,
        awayScore: 0,
        forfeitType: "no_contest",
        matchType: "No Contest",
        md: f.md || 0,
        date: f.date || today,
        goalScorers: { home: [], away: [] },
        submittedAt: Date.now(),
        status: "approved",
      });
      // Apply to table — both get a loss
      await applyResultToTable(league, season, homeTeam, awayTeam, 0, 0, "no_contest");
    } catch (e) {
      alert("Error: " + e.message);
    }
    setDeclaring(null);
  }

  // Also show pending results (submitted by managers, awaiting approval)
  async function approvePending(item) {
    await push(ref(db, PATHS.results(league, season)), { ...item, status: "approved", approvedAt: Date.now() });
    await applyResultToTable(league, season, item.homeTeam, item.awayTeam, item.homeScore, item.awayScore, item.forfeitType);
    await remove(ref(db, `${PATHS.pendingResults(league, season)}/${item.key}`));
  }

  async function rejectPending(key) {
    await remove(ref(db, `${PATHS.pendingResults(league, season)}/${key}`));
  }

  if (loading) return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>📋 Pending Results</h3>
      <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 40 }}>Loading...</div>
    </div>
  );

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>📋 Pending Results</h3>

      {/* Today & Yesterday Fixtures */}
      {todayYesterday.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Fixtures — Today & Yesterday</div>
          {todayYesterday.map(f => {
            const homeTeam = f.home || f.homeTeam;
            const awayTeam = f.away || f.awayTeam;
            const pend = hasPending(f);
            return (
              <div key={f.key} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <div style={{ color: "#fff", fontWeight: 700, marginBottom: 6, textAlign: "center" }}>
                  {homeTeam} <span style={{ color: "rgba(255,255,255,0.4)" }}>vs</span> {awayTeam}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", marginBottom: 12 }}>
                  <span>MD {f.md || "—"}</span>
                  <span>{f.date}</span>
                </div>
                {pend ? (
                  <div style={{ textAlign: "center", color: "#22c55e", fontSize: "0.85rem", fontWeight: 700 }}>✅ Result submitted — see below</div>
                ) : (
                  <button
                    onClick={() => declareNoContest(f)}
                    disabled={declaring === f.key}
                    style={{ width: "100%", padding: "10px 0", background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 10, color: "#ffaaaa", fontWeight: 700, cursor: declaring === f.key ? "not-allowed" : "pointer", fontSize: "0.85rem", opacity: declaring === f.key ? 0.6 : 1 }}
                  >
                    {declaring === f.key ? "Declaring..." : "🚫 Declare No Contest (F-F)"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submitted pending results */}
      {pending.length > 0 && (
        <div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Submitted Results — Awaiting Approval</div>
          {pending.map(item => (
            <div key={item.key} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 14, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ color: "#fff", fontWeight: 700 }}>{item.homeTeam} {item.homeScore} — {item.awayScore} {item.awayTeam}</div>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>MD {item.md || "—"}</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginBottom: 12 }}>{item.date}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approvePending(item)} style={{ flex: 1, padding: 10, background: "#22c55e", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>✅ Approve</button>
                <button onClick={() => rejectPending(item.key)} style={{ flex: 1, padding: 10, background: "rgba(255,0,0,0.2)", border: "1px solid #cc3333", borderRadius: 10, color: "#ffaaaa", fontWeight: 700, cursor: "pointer" }}>❌ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!todayYesterday.length && !pending.length && (
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 40 }}>No pending fixtures or results.</div>
      )}

      <button onClick={onClose} style={{ width: "100%", marginTop: 12, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
