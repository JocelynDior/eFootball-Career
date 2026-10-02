import { useState } from "react";
import { db } from "../firebase";
import { ref, update } from "firebase/database";

const PINK = "#FF1493";
const PINK_BORDER = "rgba(255,20,147,0.28)";
const GLASS = {
  background: "rgba(20,20,28,0.92)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const inputStyle = {
  width: "100%", padding: "14px 18px", background: "rgba(255,255,255,0.05)",
  border: `1px solid ${PINK_BORDER}`, borderRadius: "12px", color: "#fff",
  fontFamily: "inherit", fontSize: "1.5rem", outline: "none", boxSizing: "border-box",
  textAlign: "center",
};
const labelStyle = {
  color: "rgba(255,255,255,0.5)", fontSize: "1.3rem", textTransform: "uppercase",
  letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: "8px", textAlign: "center",
};

function sortSeasons(seasons) {
  return [...(seasons || [])].sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
}

export default function AwardInfoModal({ award, tabKey, isAdmin, onClose }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const seasons = sortSeasons(award.seasons);

  function startEdit() {
    setDraft(
      seasons.map(s => ({
        number: String(s.number ?? ""),
        winner: s.winner || "",
        nominees: (s.nominees || []).join("\n"),
      }))
    );
    setError("");
    setEditing(true);
  }

  function updateRow(i, field, value) {
    setDraft(d => d.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    const next = draft.reduce((m, r) => Math.max(m, Number(r.number) || 0), 0) + 1;
    setDraft(d => [...d, { number: String(next), winner: "", nominees: "" }]);
  }

  function removeRow(i) {
    setDraft(d => d.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const seen = new Set();
    for (const row of draft) {
      const n = Number(row.number);
      if (!n || n < 1) { setError("Every season needs a number (1 or higher)."); return; }
      if (seen.has(n)) { setError(`Season ${n} is listed twice.`); return; }
      seen.add(n);
      if (!row.winner.trim()) { setError(`Season ${n} needs a winner.`); return; }
    }
    setSaving(true); setError("");
    try {
      const cleaned = draft.map(row => ({
        number: Number(row.number),
        winner: row.winner.trim(),
        nominees: row.nominees.split("\n").map(x => x.trim()).filter(Boolean),
      }));
      await update(ref(db, `career_awards/${tabKey}/${award.id}`), {
        seasons: cleaned,
        updatedAt: Date.now(),
      });
      setEditing(false);
    } catch (e) {
      setError("Failed to save: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{ ...GLASS, border: `1px solid ${PINK_BORDER}`, borderRadius: "22px", padding: "36px 28px", maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative", textAlign: "center" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer", fontSize: "1.4rem" }}>✕</button>

        <h3 style={{ color: PINK, fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.4rem", letterSpacing: "3px", margin: "0 0 20px", textAlign: "center" }}>
          {award.title}
        </h3>

        {!editing && (
          <>
            {seasons.length === 0 && (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.6rem", margin: "20px 0" }}>
                {isAdmin ? "No info yet. Tap Edit Info to add seasons." : "No info published yet."}
              </p>
            )}

            {seasons.map(s => (
              <div key={s.number} style={{ borderTop: `1px solid ${PINK_BORDER}`, padding: "22px 0", textAlign: "center" }}>
                <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem", letterSpacing: "2px", marginBottom: "12px" }}>
                  SEASON {s.number}
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.3rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Winner</div>
                <div style={{ color: "#fff", fontSize: "2rem", fontWeight: 700, margin: "4px 0 14px" }}>{s.winner}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.3rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Nominees</div>
                {s.nominees && s.nominees.length > 0 ? (
                  s.nominees.map((n, i) => (
                    <div key={i} style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.7rem", marginTop: "4px" }}>{n}</div>
                  ))
                ) : (
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.7rem", marginTop: "4px" }}>No nominees</div>
                )}
              </div>
            ))}

            {isAdmin && (
              <button onClick={startEdit} style={{ marginTop: "12px", padding: "14px 32px", background: PINK, border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1.5rem", cursor: "pointer" }}>
                ✏️ Edit Info
              </button>
            )}
          </>
        )}

        {editing && (
          <>
            {draft.map((row, i) => (
              <div key={i} style={{ borderTop: `1px solid ${PINK_BORDER}`, padding: "20px 0", textAlign: "center" }}>
                <label style={labelStyle}>Season number</label>
                <input type="number" min="1" value={row.number} onChange={e => updateRow(i, "number", e.target.value)} style={{ ...inputStyle, marginBottom: "14px" }} />
                <label style={labelStyle}>Winner</label>
                <input value={row.winner} onChange={e => updateRow(i, "winner", e.target.value)} placeholder="Winner name" style={{ ...inputStyle, marginBottom: "14px" }} />
                <label style={labelStyle}>Nominees (one per line, leave empty if none)</label>
                <textarea value={row.nominees} onChange={e => updateRow(i, "nominees", e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6", marginBottom: "12px" }} />
                <button onClick={() => removeRow(i)} style={{ padding: "10px 22px", background: "rgba(255,80,80,0.18)", border: "1px solid rgba(255,80,80,0.35)", borderRadius: "10px", color: "#ff6b6b", cursor: "pointer", fontWeight: 700, fontSize: "1.3rem" }}>
                  Remove season
                </button>
              </div>
            ))}

            <button onClick={addRow} style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.05)", border: `1px dashed ${PINK_BORDER}`, borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "1.5rem", marginBottom: "16px" }}>
              ➕ Add Season
            </button>

            {error && <div style={{ color: "#ff6b6b", background: "rgba(255,0,0,0.08)", borderRadius: "10px", padding: "12px", marginBottom: "16px", fontSize: "1.4rem" }}>{error}</div>}

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: PINK, border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1.5rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "💾 Save"}
              </button>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.05)", border: `1px solid ${PINK_BORDER}`, borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "1.5rem" }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
