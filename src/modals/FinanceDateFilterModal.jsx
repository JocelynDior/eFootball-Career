import { useState } from "react";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const PRESETS = [
  { label: "Last 7 Days",  days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "Last 180 Days", days: 180 },
  { label: "Last 365 Days", days: 365 },
  { label: "All Time",     days: null },
];

export default function FinanceDateFilterModal({ current, onApply, onClose }) {
  // current = { from: Date|null, to: Date|null, days: number|null }
  const [mode, setMode] = useState(current.days !== undefined ? "preset" : "custom");
  const [selectedDays, setSelectedDays] = useState(current.days ?? 30);
  const [fromStr, setFromStr] = useState(
    current.from ? current.from.toISOString().slice(0, 10) : ""
  );
  const [toStr, setToStr] = useState(
    current.to ? current.to.toISOString().slice(0, 10) : ""
  );
  const [error, setError] = useState("");

  function handleApply() {
    setError("");
    if (mode === "preset") {
      onApply({ days: selectedDays, from: null, to: null });
    } else {
      if (!fromStr || !toStr) {
        setError("Please select both a start and end date.");
        return;
      }
      const from = new Date(fromStr);
      const to = new Date(toStr);
      to.setHours(23, 59, 59, 999);
      if (from > to) {
        setError("Start date must be before end date.");
        return;
      }
      onApply({ days: null, from, to });
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "14px 18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.35)",
    borderRadius: "12px",
    color: "#fff",
    fontFamily: "inherit",
    fontSize: "1.1rem",
    outline: "none",
    boxSizing: "border-box",
    colorScheme: "dark",
  };

  const labelStyle = {
    color: "rgba(255,255,255,0.65)",
    fontSize: "0.9rem",
    display: "block",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    fontWeight: 700,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "480px", width: "100%", position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}
        >✕</button>

        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px", marginBottom: "6px" }}>
          📅 DATE FILTER
        </div>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", marginBottom: "24px" }}>
          Choose a period to calculate income, expenses and net profit/loss.
        </p>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          {["preset", "custom"].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: "12px", borderRadius: "12px", cursor: "pointer",
                fontFamily: "inherit", fontWeight: 700, fontSize: "1rem",
                background: mode === m ? "#FF1493" : "rgba(255,255,255,0.06)",
                border: `1px solid ${mode === m ? "#FF1493" : "rgba(255,20,147,0.3)"}`,
                color: "#fff", textTransform: "uppercase", letterSpacing: "1px",
              }}
            >
              {m === "preset" ? "⚡ Quick Select" : "📆 Custom Range"}
            </button>
          ))}
        </div>

        {mode === "preset" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setSelectedDays(p.days)}
                style={{
                  padding: "14px 10px", borderRadius: "12px", cursor: "pointer",
                  fontFamily: "inherit", fontWeight: 700, fontSize: "1rem",
                  background: selectedDays === p.days ? "rgba(255,20,147,0.25)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedDays === p.days ? "#FF1493" : "rgba(255,20,147,0.2)"}`,
                  color: selectedDays === p.days ? "#FF1493" : "rgba(255,255,255,0.6)",
                  transition: "all 0.2s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label style={labelStyle}>From</label>
              <input type="date" value={fromStr} onChange={e => setFromStr(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <input type="date" value={toStr} onChange={e => setToStr(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: "#ff6b6b", fontSize: "0.95rem", marginBottom: "14px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleApply}
            style={{ flex: 2, padding: "16px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer" }}
          >
            ✅ Apply Filter
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
