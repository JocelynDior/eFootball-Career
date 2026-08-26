import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, get } from "firebase/database";
import { reverseResultFromTable } from "../utils/tableLogic";

const GLASS = {
  background: "rgba(255,20,147,0.06)",
  border: "1px solid rgba(255,20,147,0.2)",
  borderRadius: 14,
  padding: 16,
  marginBottom: 10,
};

export default function ResultsHistoryModal({ league, season, onClose }) {
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState(null); // result being reviewed
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.results(league, season)), snap => {
      const d = snap.val();
      const list = d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : [];
      // Sort latest to oldest
      list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0) || (b.date || "").localeCompare(a.date || ""));
      setResults(list);
    });
    return () => unsub();
  }, [league, season]);

  const filtered = results.filter(r =>
    !search || [r.homeTeam, r.awayTeam].some(t => t?.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleRevoke(item) {
    if (!window.confirm(`Revoke result: ${item.homeTeam} ${item.homeScore} - ${item.awayScore} ${item.awayTeam}?\n\nThis will reverse all table stats, scorer and assist contributions.`)) return;
    setRevoking(item.key);
    try {
      // Reverse table
      await reverseResultFromTable(league, season, item.homeTeam, item.awayTeam, item.homeScore, item.awayScore, item.forfeitType);

      // Reverse top scorers
      const scorerSnap = await get(ref(db, PATHS.topScorers(league, season)));
      const scorerData = scorerSnap.val() || {};
      const homeScorers = item.goalScorers?.home || [];
      for (const s of homeScorers) {
        for (const [key, val] of Object.entries(scorerData)) {
          if (val.name === s.player) {
            const newCount = Math.max(0, (val.count || 0) - (s.goals || 0));
            await import("firebase/database").then(({ ref: r, set: sv }) => sv(r(db, `${PATHS.topScorers(league, season)}/${key}`), { ...val, count: newCount }));
          }
        }
      }

      // Reverse top assistants
      const assistsHome = item.assists?.home || [];
      if (assistsHome.length > 0) {
        const assistSnap = await get(ref(db, PATHS.topAssistants(league, season)));
        const assistData = assistSnap.val() || {};
        for (const a of assistsHome) {
          for (const [key, val] of Object.entries(assistData)) {
            if (val.name === a.player) {
              const newCount = Math.max(0, (val.count || 0) - (a.assists || 0));
              await import("firebase/database").then(({ ref: r, set: sv }) => sv(r(db, `${PATHS.topAssistants(league, season)}/${key}`), { ...val, count: newCount }));
            }
          }
        }
      }

      // Delete result
      await remove(ref(db, `${PATHS.results(league, season)}/${item.key}`));
    } catch (e) {
      alert("Error revoking: " + e.message);
    }
    setRevoking(null);
  }

  // Review modal
  if (reviewing) {
    const r = reviewing;
    const homeScorers = r.goalScorers?.home || [];
    const awayScorers = r.goalScorers?.away || [];
    const homeAssists = r.assists?.home || [];
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16 }}>🔍 Review Result</h3>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", marginBottom: 8 }}>
            {r.homeTeam} <span style={{ color: "#FF1493" }}>{r.homeScore} — {r.awayScore}</span> {r.awayTeam}
          </div>
          {r.md && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>Matchday {r.md}</div>}
          {r.date && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>📅 {r.date}</div>}
        </div>

        {(homeScorers.length > 0 || awayScorers.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Goal Scorers</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {[...homeScorers, ...awayScorers].map((s, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,20,147,0.4)" }} />}
                  <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 700 }}>{s.player}</span>
                  <span style={{ color: "#FF1493", fontSize: "0.8rem" }}>⚽ {s.goals}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {homeAssists.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Assists</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {homeAssists.map((a, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {a.imageUrl && <img src={a.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,20,147,0.4)" }} />}
                  <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 700 }}>{a.player}</span>
                  <span style={{ color: "#FF1493", fontSize: "0.8rem" }}>🎯 {a.assists}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setReviewing(null)} style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer", marginTop: 8 }}>← Back</button>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16 }}>📋 Results History</h3>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Search by team..."
        style={{ width: "100%", boxSizing: "border-box", marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none" }}
      />

      {!filtered.length && (
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px" }}>No results found.</div>
      )}

      {filtered.map(item => (
        <div key={item.key} style={GLASS}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem", textAlign: "center", marginBottom: 6 }}>
            {item.homeTeam} <span style={{ color: "#FF1493" }}>{item.homeScore} — {item.awayScore}</span> {item.awayTeam}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginBottom: 12 }}>
            <span>MD {item.md || "—"}</span>
            <span>{item.date || ""}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setReviewing(item)} style={{ flex: 1, padding: "9px 0", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>🔍 Review</button>
            <button onClick={() => handleRevoke(item)} disabled={revoking === item.key} style={{ flex: 1, padding: "9px 0", background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 10, color: "#ff6b6b", fontWeight: 700, cursor: revoking === item.key ? "not-allowed" : "pointer", fontSize: "0.85rem", opacity: revoking === item.key ? 0.6 : 1 }}>
              {revoking === item.key ? "Revoking..." : "🗑️ Revoke"}
            </button>
          </div>
        </div>
      ))}

      <button onClick={onClose} style={{ width: "100%", marginTop: 12, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
