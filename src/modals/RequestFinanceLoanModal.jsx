      import { useState } from "react";
import { db } from "../firebase";
import { ref, push } from "firebase/database";
import Modal from "../components/Modal";

const ALL_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const inputStyle = {
  width: "100%", padding: "20px 24px",
  background: "rgba(255,255,255,0.06)",
  border: "2px solid rgba(68,170,255,0.35)",
  borderRadius: "16px", color: "#fff",
  fontFamily: "inherit", fontSize: "1.6rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  color: "rgba(255,255,255,0.6)", fontSize: "1.2rem",
  display: "block", marginBottom: "10px",
  textTransform: "uppercase", letterSpacing: "1px",
  marginTop: "24px", fontWeight: 700,
};

export default function RequestFinanceLoanModal({ team, onClose }) {
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("");
  const [frequency, setFrequency] = useState("month");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const principal = Number(amount) || 0;
  const totalRepayable = principal * 2; // hardcoded 100% interest
  const installmentCount = Number(installments) || 0;
  const installmentAmount = installmentCount > 0 ? totalRepayable / installmentCount : 0;

  async function handleSubmit() {
    if (!principal || principal <= 0) { setError("Enter a valid loan amount."); return; }
    if (!installmentCount || installmentCount <= 0) { setError("Enter how many installments you want to repay in."); return; }
    setSaving(true);
    setError("");
    try {
      const now = new Date();
      // Loan is credited to the club immediately
      await push(ref(db, `career_team_management/${team}/finance/transactions`), {
        type: "income",
        category: "Loan Received",
        source: `Loan (${installmentCount} ${frequency} installments)`,
        amount: principal,
        month: ALL_MONTHS[now.getMonth()],
        monthIndex: now.getMonth(),
        year: now.getFullYear(),
        createdAt: now.getTime(),
      });
      await push(ref(db, `career_team_management/${team}/finance/loans`), {
        principal,
        totalRepayable,
        installments: installmentCount,
        installmentAmount,
        frequency,
        interestRate: 100,
        startTs: now.getTime(),
        startDate: now.toISOString().slice(0, 10),
        status: "active",
        createdAt: now.getTime(),
      });
      setDone(true);
      setTimeout(onClose, 1600);
    } catch (e) {
      setError("Failed: " + e.message);
      setSaving(false);
    }
  }

  return (
    <Modal active onClose={onClose}>
      <div style={{ padding: "40px", minWidth: "340px", maxWidth: "520px" }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#44aaff", letterSpacing: "2px", marginBottom: "8px" }}>
          🏦 Request Loan
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem", marginBottom: "8px" }}>
          Borrowed funds are credited immediately. Interest is fixed at 100% — borrow €10, repay €20 total.
        </p>

        <label style={labelStyle}>Loan Amount (€)</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Any amount" style={inputStyle} />

        <label style={labelStyle}>Interest</label>
        <input value="100% (fixed)" disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />

        <label style={labelStyle}>Number of Installments</label>
        <input type="number" min={1} value={installments} onChange={e => setInstallments(e.target.value)} placeholder="e.g. 10" style={inputStyle} />

        <label style={labelStyle}>Repay Per</label>
        <div style={{ display: "flex", gap: "14px" }}>
          {[["day", "Day"], ["week", "Week"], ["month", "Month"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFrequency(val)}
              style={{
                flex: 1, padding: "18px", borderRadius: "14px", cursor: "pointer",
                fontFamily: "inherit", fontWeight: 700, fontSize: "1.3rem",
                background: frequency === val ? "#44aaff" : "rgba(68,170,255,0.1)",
                border: `2px solid ${frequency === val ? "#44aaff" : "rgba(68,170,255,0.3)"}`,
                color: "#fff", transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {principal > 0 && installmentCount > 0 && (
          <div style={{ marginTop: "28px", padding: "22px", background: "rgba(68,170,255,0.08)", border: "1px solid rgba(68,170,255,0.3)", borderRadius: "16px" }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.2rem", marginBottom: "6px" }}>You'll repay</div>
            <div style={{ color: "#44aaff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "1px" }}>
              €{totalRepayable.toLocaleString()} total
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.15rem", marginTop: "8px" }}>
              €{installmentAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} per {frequency} × {installmentCount}
            </div>
          </div>
        )}

        {error && <div style={{ color: "#ff6b6b", fontSize: "1.15rem", marginTop: "20px" }}>{error}</div>}

        {done ? (
          <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, fontSize: "1.4rem", padding: "20px", background: "rgba(0,255,136,0.1)", borderRadius: "16px", marginTop: "24px" }}>
            ✅ Loan issued — funds credited!
          </div>
        ) : (
          <div style={{ display: "flex", gap: "16px", marginTop: "28px" }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              flex: 1, padding: "20px", background: "#44aaff", border: "none",
              borderRadius: "16px", color: "#fff", fontWeight: 700, fontSize: "1.4rem",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
              fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "1px",
            }}>
              {saving ? "Processing..." : "Confirm Loan"}
            </button>
            <button onClick={onClose} style={{
              flex: 1, padding: "20px", background: "rgba(255,255,255,0.06)",
              border: "2px solid rgba(255,255,255,0.2)", borderRadius: "16px",
              color: "#fff", cursor: "pointer", fontSize: "1.4rem",
              fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "1px",
            }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
