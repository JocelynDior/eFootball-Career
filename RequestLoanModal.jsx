import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const inputStyle = {
  width: "100%", padding: "12px 16px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "12px", color: "#fff",
  fontFamily: "inherit", fontSize: "0.95rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  color: "rgba(255,255,255,0.55)", fontSize: "0.75rem",
  display: "block", marginBottom: "6px",
  textTransform: "uppercase", letterSpacing: "0.8px",
  marginTop: "14px",
};

export default function RequestLoanModal({ player, playerTab, playerId, onClose }) {
  const { manager } = useAdmin();
  const [loanAmount, setLoanAmount] = useState("");
  const [loanTerm, setLoanTerm] = useState("1");
  const [coverSalary, setCoverSalary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!manager) { setError("You must be logged in as a manager."); return; }
    if (!loanAmount) { setError("Please enter a loan amount."); return; }
    setSubmitting(true);
    setError("");
    try {
      const offerData = {
        type: "loan",
        playerName: player.name,
        playerClub: player.club,
        playerId,
        playerTab,
        loanAmount: `€${Number(loanAmount).toLocaleString()}`,
        loanTerm: `${loanTerm} Season${loanTerm > 1 ? "s" : ""}`,
        coverSalary,
        playerWeeklyWage: player.weeklyWage || null,
        fromManagerUid: manager.uid,
        fromManagerName: manager.username,
        fromClub: manager.team || "Unknown Club",
        toClub: player.club,
        status: "pending",
        createdAt: Date.now(),
      };
      await push(ref(db, `${PATHS.transfers}/negotiations`), offerData);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError("Failed to submit offer: " + e.message);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px", marginBottom: "4px" }}>
        🔄 Request Loan
      </h3>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "20px", fontSize: "0.9rem" }}>
        {player.name} · {player.club}
      </p>

      {!manager && (
        <div style={{ background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: "12px", padding: "14px", marginBottom: "16px", color: "#ffaa44", fontSize: "0.9rem" }}>
          ⚠️ You must be logged in as a manager to submit offers.
        </div>
      )}

      <label style={labelStyle}>Loan Fee (€)</label>
      <input
        value={loanAmount} onChange={e => setLoanAmount(e.target.value)}
        placeholder="Enter loan fee amount..."
        style={inputStyle} type="number"
      />

      <label style={labelStyle}>Loan Term</label>
      <select value={loanTerm} onChange={e => setLoanTerm(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
        <option value="1">1 Season</option>
        <option value="2">2 Seasons</option>
        <option value="3">3 Seasons</option>
      </select>

      <label style={labelStyle}>Cover Player's Salary?</label>
      <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
        {[true, false].map(val => (
          <button key={String(val)} onClick={() => setCoverSalary(val)} style={{
            flex: 1, padding: "12px", borderRadius: "12px", cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700, fontSize: "0.9rem",
            background: coverSalary === val ? "#FF1493" : "rgba(255,20,147,0.08)",
            border: `1px solid ${coverSalary === val ? "#FF1493" : "rgba(255,20,147,0.3)"}`,
            color: "#fff", transition: "all 0.2s",
          }}>
            {val ? "✅ Yes" : "❌ No"}
          </button>
        ))}
      </div>

      {coverSalary && player.weeklyWage && (
        <div style={{ marginTop: "10px", padding: "10px 14px", background: "rgba(255,20,147,0.08)", borderRadius: "10px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
          Player's wage: <strong style={{ color: "#FF1493" }}>{player.weeklyWage}/week</strong>
        </div>
      )}

      {error && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginTop: "12px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "8px" }}>{error}</div>}

      {done ? (
        <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "14px", background: "rgba(0,255,136,0.1)", borderRadius: "12px", marginTop: "16px" }}>
          ✅ Loan Request Submitted!
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button onClick={handleSubmit} disabled={submitting || !manager} style={{
            flex: 1, padding: "14px", background: "#FF1493", border: "none",
            borderRadius: "12px", color: "#fff", fontWeight: 700,
            cursor: submitting || !manager ? "not-allowed" : "pointer",
            opacity: submitting || !manager ? 0.6 : 1,
          }}>
            {submitting ? "Submitting..." : "Submit Loan Request"}
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px",
            color: "#fff", cursor: "pointer",
          }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
