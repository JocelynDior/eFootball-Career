import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, onValue } from "firebase/database";
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

const FREQUENCIES = [
  { value: "day", label: "Every day" },
  { value: "week", label: "Every week" },
  { value: "month", label: "Every month" },
];

function fmt(n) {
  return `€${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// Peer-to-peer club loan request. Nothing is charged here — the request is only
// stored as "pending". Money moves once the lending club accepts it.
export default function RequestFinanceLoanModal({ team, onClose }) {
  const { manager } = useAdmin();
  const [clubs, setClubs] = useState([]);
  const [targetClub, setTargetClub] = useState("");
  const [amount, setAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [frequency, setFrequency] = useState("week");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const list = [...new Set(Object.values(data).filter(a => a.team).map(a => a.team))]
        .filter(t => t !== team)
        .sort((a, b) => a.localeCompare(b));
      setClubs(list);
    });
    return () => unsub();
  }, [team]);

  const amountNum = Number(amount);
  const repayNum = Number(repayAmount);
  const instNum = Math.floor(Number(installments));
  const showPreview = amountNum > 0 && repayNum >= amountNum && instNum >= 1;
  const perInstallment = showPreview ? repayNum / instNum : 0;
  const interest = showPreview ? repayNum - amountNum : 0;

  async function handleSubmit() {
    setError("");
    if (!manager || manager.team !== team) { setError("Only this club's manager can request a loan."); return; }
    if (!targetClub) { setError("Please pick the club you want to borrow from."); return; }
    if (!(amountNum > 0)) { setError("Enter the amount you want to borrow."); return; }
    if (!(repayNum > 0)) { setError("Enter the amount you will repay."); return; }
    if (repayNum < amountNum) { setError("Repay amount can't be lower than the amount borrowed."); return; }
    if (!Number.isInteger(Number(installments)) || instNum < 1) { setError("Installments must be a whole number of 1 or more."); return; }

    setSubmitting(true);
    try {
      await push(ref(db, PATHS.clubLoans), {
        borrowerClub: team,
        lenderClub: targetClub,
        amount: amountNum,
        repayAmount: repayNum,
        installments: instNum,
        frequency,
        status: "pending",
        requestedByUid: manager.uid,
        requestedByName: manager.username || "",
        createdAt: Date.now(),
      });
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError("Failed to send loan request: " + e.message);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px", marginBottom: "4px" }}>
        🏦 Request Club Loan
      </h3>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "20px", fontSize: "0.9rem" }}>
        Ask another club for a loan. No money moves until they accept.
      </p>

      <label style={labelStyle}>Borrow From (Club)</label>
      <select value={targetClub} onChange={e => setTargetClub(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
        <option value="">— Select a club —</option>
        {clubs.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <label style={labelStyle}>Amount You Want To Borrow (€)</label>
      <input
        value={amount} onChange={e => setAmount(e.target.value)}
        placeholder="e.g. 50000000" style={inputStyle} type="number" min="0"
      />

      <label style={labelStyle}>Amount You Will Repay (€)</label>
      <input
        value={repayAmount} onChange={e => setRepayAmount(e.target.value)}
        placeholder="Must be equal to or more than the amount borrowed" style={inputStyle} type="number" min="0"
      />

      <label style={labelStyle}>Number of Installments</label>
      <input
        value={installments} onChange={e => setInstallments(e.target.value)}
        placeholder="e.g. 5" style={inputStyle} type="number" min="1" step="1"
      />

      <label style={labelStyle}>Repayment Frequency</label>
      <select value={frequency} onChange={e => setFrequency(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
        {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {showPreview && (
        <div style={{ marginTop: "16px", padding: "12px 16px", background: "rgba(68,170,255,0.08)", border: "1px solid rgba(68,170,255,0.25)", borderRadius: "12px", color: "rgba(255,255,255,0.75)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          You receive <strong style={{ color: "#00ff88" }}>{fmt(amountNum)}</strong> and repay <strong style={{ color: "#ff6b6b" }}>{fmt(repayNum)}</strong>
          {interest > 0 && <> (extra {fmt(interest)})</>}
          {" "}in <strong>{instNum}</strong> installment{instNum > 1 ? "s" : ""} of about <strong>{fmt(perInstallment)}</strong>, {FREQUENCIES.find(f => f.value === frequency).label.toLowerCase()}.
        </div>
      )}

      {error && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginTop: "12px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "8px" }}>{error}</div>}

      {done ? (
        <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "14px", background: "rgba(0,255,136,0.1)", borderRadius: "12px", marginTop: "16px" }}>
          ✅ Loan Request Sent!
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button onClick={handleSubmit} disabled={submitting || !manager} style={{
            flex: 1, padding: "14px", background: "#FF1493", border: "none",
            borderRadius: "12px", color: "#fff", fontWeight: 700,
            cursor: submitting || !manager ? "not-allowed" : "pointer",
            opacity: submitting || !manager ? 0.6 : 1,
          }}>
            {submitting ? "Sending..." : "Send Loan Request"}
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
