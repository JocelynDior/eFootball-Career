import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push } from "firebase/database";
import { getSASTToday } from "../utils/sastTime";

export default function ForfeitModal({ managerData, league, season, teams, onClose }) {
  const [opponent, setOpponent] = useState("");
  const [forfeitType, setForfeitType] = useState("no_contest");
  const [date, setDate] = useState(getSASTToday());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const others = teams.filter(t => t.name !== managerData.teamName).map(t => t.name).sort();

  async function handleSubmit() {
    if (!opponent) { setStatus("Select opponent."); return; }
    setSaving(true);
    await push(ref(db, PATHS.pendingResults(league, season)), {
      homeTeam: managerData.teamName, awayTeam: opponent,
      homeScore: 0, awayScore: 0, forfeitType, matchType: "forfeit", date,
      submittedBy: managerData.key, submittedAt: Date.now(), status: "pending"
    });
    setStatus("✅ Forfeit reported! Awaiting admin approval.");
    setTimeout(onClose, 2000);
    setSaving(false);
  }

  const inputStyle = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", marginBottom: "14px" };
  const labelStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" };

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>🚫 Report Forfeit</h3>
      <div style={{ background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", color: "#FF1493", fontWeight: 700 }}>Your Team: {managerData.teamName}</div>
      <label style={labelStyle}>Opponent</label>
      <select value={opponent} onChange={e => setOpponent(e.target.value)} style={inputStyle}>
        <option value="">Select opponent</option>
        {others.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <label style={labelStyle}>Forfeit Type</label>
      <select value={forfeitType} onChange={e => setForfeitType(e.target.value)} style={inputStyle}>
        <option value="no_contest">No Contest (F-F)</option>
        <option value="forfeit_win">Forfeit Win (my favour)</option>
      </select>
      <label style={labelStyle}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
      {status && <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" }}>{status}</div>}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Submitting..." : "Submit"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
