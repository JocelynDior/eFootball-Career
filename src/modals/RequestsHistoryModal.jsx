import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { formatDate, formatTimestamp } from "../utils/formatters";

export default function RequestsHistoryModal({ league, season, onClose }) {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [tab, setTab] = useState("pending");

  useEffect(() => {
    const p = ref(db, PATHS.pendingResults(league, season));
    const a = ref(db, PATHS.results(league, season));
    const u1 = onValue(p, snap => { const d = snap.val(); setPending(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []); });
    const u2 = onValue(a, snap => { const d = snap.val(); setApproved(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []); });
    return () => { u1(); u2(); };
  }, [league, season]);

  const rows = tab === "pending" ? pending : approved;

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px" }}>📜 Submission History</h3>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["pending", "approved"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", background: tab === t ? "#FF1493" : "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "10px", color: "#fff", cursor: "pointer", fontWeight: 700, textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>
      {!rows.length && <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px" }}>No {tab} submissions.</div>}
      {rows.map(item => (
        <div key={item.key} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px", padding: "16px", marginBottom: "10px" }}>
          <div style={{ color: "#fff", fontWeight: 700, marginBottom: "4px" }}>{item.homeTeam} {item.homeScore} — {item.awayScore} {item.awayTeam}</div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>
            <span>By: {item.submittedBy}</span>
            <span>{formatDate(item.date)}</span>
          </div>
        </div>
      ))}
      <button onClick={onClose} style={{ width: "100%", marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
