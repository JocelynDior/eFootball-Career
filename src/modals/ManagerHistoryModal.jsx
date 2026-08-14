import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { formatDate } from "../utils/formatters";

export default function ManagerHistoryModal({ league, season, onClose }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.managerHistory(league, season)), snap => {
      const d = snap.val();
      setHistory(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => b.timestamp - a.timestamp) : []);
    });
    return () => unsub();
  }, [league, season]);

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>📋 Manager History</h3>
      {!history.length && <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px" }}>No history yet.</div>}
      {history.map(h => (
        <div key={h.id} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px", padding: "16px", marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>{h.teamName}</span>
            <span style={{ color: "#FF1493", fontFamily: "monospace", fontSize: "0.85rem" }}>{h.managerKey}</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{h.action} · {formatDate(new Date(h.timestamp).toISOString().split("T")[0])}</div>
        </div>
      ))}
      <button onClick={onClose} style={{ width: "100%", marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
