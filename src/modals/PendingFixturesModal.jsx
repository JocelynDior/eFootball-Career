import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, set } from "firebase/database";
import { applyResultToTable } from "../utils/tableLogic";
import { formatDate } from "../utils/formatters";

export default function PendingFixturesModal({ league, season, onClose }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dbRef = ref(db, PATHS.pendingResults(league, season));
    const unsub = onValue(dbRef, snap => {
      const data = snap.val();
      if (data) setPending(Object.entries(data).map(([k, v]) => ({ key: k, ...v })));
      else setPending([]);
      setLoading(false);
    });
    return () => unsub();
  }, [league, season]);

  async function approve(item) {
    await set(ref(db, `${PATHS.results(league, season)}/${item.key}`), { ...item, status: "approved", approvedAt: Date.now() });
    await applyResultToTable(league, season, item.homeTeam, item.awayTeam, item.homeScore, item.awayScore, item.forfeitType);
    await remove(ref(db, `${PATHS.pendingResults(league, season)}/${item.key}`));
  }

  async function reject(key) {
    await remove(ref(db, `${PATHS.pendingResults(league, season)}/${key}`));
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>📋 Pending Results</h3>
      {loading && <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "40px" }}>Loading...</div>}
      {!loading && !pending.length && <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px" }}>No pending results.</div>}
      {pending.map(item => (
        <div key={item.key} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ color: "#fff", fontWeight: 700 }}>{item.homeTeam} {item.homeScore} — {item.awayScore} {item.awayTeam}</div>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{formatDate(item.date)}</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginBottom: "12px" }}>By: {item.submittedBy} · {item.forfeitType !== "none" ? item.forfeitType : "Normal"}</div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => approve(item)} style={{ flex: 1, padding: "10px", background: "#22c55e", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>✅ Approve</button>
            <button onClick={() => reject(item.key)} style={{ flex: 1, padding: "10px", background: "rgba(255,0,0,0.2)", border: "1px solid #cc3333", borderRadius: "10px", color: "#ffaaaa", fontWeight: 700, cursor: "pointer" }}>❌ Reject</button>
          </div>
        </div>
      ))}
      <button onClick={onClose} style={{ width: "100%", marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
