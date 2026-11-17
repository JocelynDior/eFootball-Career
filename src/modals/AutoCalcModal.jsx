import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, set } from "firebase/database";

export default function AutoCalcModal({ league, season, team, matchLog, stats, onBack, onConfirm }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSaving(true);
    setError("");
    try {
      const data = {
        name: team.name,
        p:   stats.p,
        w:   stats.w,
        d:   stats.d,
        l:   stats.l,
        gs:  stats.gs,
        gc:  stats.gc,
        gd:  stats.gd,
        pts: stats.pts,
      };
      await set(ref(db, `${PATHS.table(league, season)}/${team.key}`), data);
      onConfirm();
    } catch (e) {
      setError("Error saving: " + e.message);
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,20,0.97)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 0",
        borderBottom: "1px solid rgba(255,20,147,0.2)",
        paddingBottom: 16,
        position: "sticky", top: 0,
        background: "rgba(0,0,20,0.97)",
        zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <button onClick={onBack} style={{
            background: "none", border: "none",
            color: "rgba(255,255,255,0.6)", cursor: "pointer",
            fontSize: "20px", padding: 0, lineHeight: 1,
          }}>←</button>
          <div>
            <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", letterSpacing: 1 }}>
              AUTO CALC — {team.name}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
              {matchLog.length} match{matchLog.length !== 1 ? "es" : ""} found
            </div>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Calculated Stats</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            ["P", stats.p], ["W", stats.w], ["D", stats.d], ["L", stats.l],
            ["GS", stats.gs], ["GC", stats.gc], ["GD", stats.gd], ["PTS", stats.pts],
          ].map(([label, val]) => (
            <div key={label} style={{
              background: "rgba(255,20,147,0.08)",
              border: "1px solid rgba(255,20,147,0.25)",
              borderRadius: 10, padding: "10px 6px",
              textAlign: "center",
            }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", marginBottom: 4 }}>{label}</div>
              <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Match log */}
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Match Breakdown</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 100 }}>
          {matchLog.map((m, i) => {
            const outcomeColor = m.outcome === "W" ? "#22c55e" : m.outcome === "L" ? "#ef4444" : "#f59e0b";
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${outcomeColor}22`,
                borderLeft: `3px solid ${outcomeColor}`,
                borderRadius: 8, padding: "10px 14px",
              }}>
                <span style={{ color: outcomeColor, fontWeight: 700, fontSize: "14px", minWidth: 20 }}>{m.outcome}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", minWidth: 16 }}>{m.side}</span>
                <span style={{ color: "#fff", fontSize: "13px", flex: 1 }}>vs {m.opponent}</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600 }}>{m.score}</span>
                {m.type !== "Normal" && (
                  <span style={{
                    background: "rgba(255,255,255,0.08)", borderRadius: 4,
                    padding: "2px 6px", color: "rgba(255,255,255,0.4)", fontSize: "10px"
                  }}>{m.type}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "16px 20px",
        background: "rgba(0,0,20,0.98)",
        borderTop: "1px solid rgba(255,20,147,0.2)",
        display: "flex", gap: 12, zIndex: 10,
      }}>
        {error && <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: 8, width: "100%" }}>{error}</div>}
        <button onClick={onBack} style={{
          flex: 1, padding: "14px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12, color: "#fff",
          fontWeight: 700, cursor: "pointer", fontSize: "14px",
        }}>← Back</button>
        <button onClick={handleConfirm} disabled={saving} style={{
          flex: 2, padding: "14px",
          background: saving ? "rgba(255,20,147,0.3)" : "#FF1493",
          border: "none", borderRadius: 12, color: "#fff",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: "14px",
        }}>{saving ? "Saving..." : "✅ Confirm & Save"}</button>
      </div>
    </div>
  );
}
