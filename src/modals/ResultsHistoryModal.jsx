import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { formatDate } from "../utils/formatters";

export default function ResultsHistoryModal({ league, season, onClose }) {
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.results(league, season)), snap => {
      const d = snap.val();
      setResults(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []);
    });
    return () => unsub();
  }, [league, season]);

  const filtered = results.filter(r =>
    !search || [r.homeTeam, r.awayTeam].some(t => t?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px" }}>📋 Results History</h3>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Search by team..."
        style={{ width: "100%", boxSizing: "border-box", marginBottom: "16px", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none" }}
      />

      {!filtered.length && (
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px" }}>No results found.</div>
      )}

      {filtered.map(item => (
        <div key={item.key} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px", padding: "16px", marginBottom: "10px" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem", textAlign: "center", marginBottom: "6px" }}>
            {item.homeTeam} <span style={{ color: "#FF1493" }}>{item.homeScore} — {item.awayScore}</span> {item.awayTeam}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>
            <span>GW {item.gameweek || "—"}</span>
            <span>{formatDate(item.date)}</span>
          </div>
        </div>
      ))}

      <button onClick={onClose} style={{ width: "100%", marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
