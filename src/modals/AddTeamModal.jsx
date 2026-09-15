import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, set, onValue, get } from "firebase/database";
import { getTeamIcon } from "../utils/teamIcons";

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.4)",
  borderRadius: 10, color: "#fff",
  fontFamily: "inherit", fontSize: "0.9rem",
  outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  color: "rgba(255,255,255,0.6)", fontSize: "0.75rem",
  display: "block", marginBottom: 4,
  textTransform: "uppercase", letterSpacing: "0.5px",
};

export default function AddTeamModal({ league, season, team = null, onClose }) {
  const isEdit = !!team;
  const [clubs, setClubs] = useState([]);
  const [form, setForm] = useState({
    name: team?.name || "",
    p:   team?.p   ?? team?.played        ?? 0,
    w:   team?.w   ?? team?.won           ?? 0,
    d:   team?.d   ?? team?.drawn         ?? 0,
    l:   team?.l   ?? team?.lost          ?? 0,
    gs:  team?.gs  ?? team?.goalsFor      ?? 0,
    gc:  team?.gc  ?? team?.goalsAgainst  ?? 0,
    gd:  team?.gd  ?? ((team?.goalsFor ?? 0) - (team?.goalsAgainst ?? 0)),
    pts: team?.pts ?? team?.points        ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [autoCalcing, setAutoCalcing] = useState(false);
  const [status, setStatus] = useState("");
  const [matchLog, setMatchLog] = useState([]);

  useEffect(() => {
    const unsub = onValue(ref(db, "career_team_management"), snap => {
      const d = snap.val() || {};
      const list = Object.keys(d)
        .map(name => ({ name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClubs(list);
    });
    return () => unsub();
  }, []);

  function handleChange(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function handleAutoCalculate() {
    if (!form.name.trim()) { setStatus("Please select a team first."); return; }
    setAutoCalcing(true);
    setStatus("");
    setMatchLog([]);
    try {
      const snap = await get(ref(db, PATHS.results(league, season)));
      const resultsVal = snap.val() || {};

      const stats = { p: 0, w: 0, d: 0, l: 0, gs: 0, gc: 0, gd: 0, pts: 0 };
      const teamName = form.name.trim();
      const log = [];

      for (const result of Object.values(resultsVal)) {
        if (!result?.homeTeam || !result?.awayTeam) continue;
        if (result.status && result.status !== "approved") continue;

        const isHome = result.homeTeam === teamName;
        const isAway = result.awayTeam === teamName;
        if (!isHome && !isAway) continue;

        const ft = result.forfeitType || "none";
        const opponent = isHome ? result.awayTeam : result.homeTeam;
        const side = isHome ? "H" : "A";

        if (ft === "no_contest") {
          stats.p += 1;
          stats.l += 1;
          log.push({ opponent, side, outcome: "L", score: "F-F", type: "No Contest" });

        } else if (ft === "forfeit_win") {
          stats.p += 1;
          if (isHome) {
            stats.w += 1; stats.pts += 3;
            log.push({ opponent, side, outcome: "W", score: "3-0 (F)", type: "Forfeit" });
          } else {
            stats.l += 1;
            log.push({ opponent, side, outcome: "L", score: "0-3 (F)", type: "Forfeit" });
          }

        } else {
          const hs = Number(result.homeScore) || 0;
          const as = Number(result.awayScore) || 0;
          stats.p += 1;

          if (isHome) {
            stats.gs += hs; stats.gc += as; stats.gd += hs - as;
            if (hs > as)      { stats.w += 1; stats.pts += 3; log.push({ opponent, side, outcome: "W", score: `${hs}-${as}`, type: "Normal" }); }
            else if (hs < as) { stats.l += 1;                 log.push({ opponent, side, outcome: "L", score: `${hs}-${as}`, type: "Normal" }); }
            else              { stats.d += 1; stats.pts += 1; log.push({ opponent, side, outcome: "D", score: `${hs}-${as}`, type: "Normal" }); }
          } else {
            stats.gs += as; stats.gc += hs; stats.gd += as - hs;
            if (as > hs)      { stats.w += 1; stats.pts += 3; log.push({ opponent, side, outcome: "W", score: `${hs}-${as}`, type: "Normal" }); }
            else if (as < hs) { stats.l += 1;                 log.push({ opponent, side, outcome: "L", score: `${hs}-${as}`, type: "Normal" }); }
            else              { stats.d += 1; stats.pts += 1; log.push({ opponent, side, outcome: "D", score: `${hs}-${as}`, type: "Normal" }); }
          }
        }
      }

      setForm(prev => ({ ...prev, ...stats }));
      setMatchLog(log);
      setStatus(`✅ Calculated from ${stats.p} result${stats.p !== 1 ? "s" : ""} found.`);
    } catch (e) {
      setStatus("Error: " + e.message);
    }
    setAutoCalcing(false);
  }

  async function handleSave() {
    if (!form.name.trim()) { setStatus("Please select a team."); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        p:   +form.p,
        w:   +form.w,
        d:   +form.d,
        l:   +form.l,
        gs:  +form.gs,
        gc:  +form.gc,
        gd:  +form.gd,
        pts: +form.pts,
      };
      if (isEdit) await set(ref(db, `${PATHS.table(league, season)}/${team.key}`), data);
      else await push(ref(db, PATHS.table(league, season)), data);
      onClose();
    } catch (e) {
      setStatus("Error: " + e.message);
    }
    setSaving(false);
  }

  const selectedIcon = getTeamIcon(form.name);
  const statFields = [
    ["p", "Played"], ["w", "Wins"], ["d", "Draws"], ["l", "Losses"],
    ["gs", "Goals Scored"], ["gc", "Goals Conceded"], ["gd", "Goal Difference"], ["pts", "Points"],
  ];

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>
        {isEdit ? "✏️ Edit Team" : "➕ Add Team"}
      </h3>

      {/* Team dropdown */}
      <label style={labelStyle}>Team</label>
      <div style={{ position: "relative", marginBottom: 16 }}>
        {selectedIcon && (
          <img src={selectedIcon} alt="" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, objectFit: "contain", zIndex: 2, pointerEvents: "none" }} />
        )}
        <select
          value={form.name}
          onChange={e => handleChange("name", e.target.value)}
          disabled={isEdit}
          style={{ ...inputStyle, paddingLeft: selectedIcon ? 48 : 14, cursor: isEdit ? "not-allowed" : "pointer", opacity: isEdit ? 0.7 : 1 }}
        >
          <option value="">— Select a team —</option>
          {clubs.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Auto Calculate */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={handleAutoCalculate}
          disabled={autoCalcing || !form.name.trim()}
          style={{
            width: "100%", padding: "12px 16px",
            background: autoCalcing ? "rgba(255,20,147,0.1)" : "rgba(255,20,147,0.15)",
            border: "1px solid rgba(255,20,147,0.5)",
            borderRadius: 10, color: "#FF1493",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.05rem",
            letterSpacing: 1.5, cursor: autoCalcing || !form.name.trim() ? "not-allowed" : "pointer",
            opacity: !form.name.trim() ? 0.4 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "opacity 0.2s",
          }}
        >
          {autoCalcing ? "⏳ Calculating..." : "⚡ AUTO CALCULATE FROM RESULTS"}
        </button>
      </div>

      {status && <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", marginBottom: 12 }}>{status}</div>}

      {/* Match breakdown log */}
      {matchLog.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Match Breakdown
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {matchLog.map((m, i) => {
              const outcomeColor = m.outcome === "W" ? "#22c55e" : m.outcome === "L" ? "#ef4444" : "#f59e0b";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 12px" }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", color: outcomeColor, minWidth: 16 }}>{m.outcome}</span>
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", minWidth: 18 }}>{m.side}</span>
                  <span style={{ color: "#fff", fontSize: "0.85rem", flex: 1 }}>vs {m.opponent}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem" }}>{m.score}</span>
                  {m.type !== "Normal" && (
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem" }}>{m.type}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {statFields.map(([field, lbl]) => (
          <div key={field}>
            <label style={labelStyle}>{lbl}</label>
            <input
              type="number"
              value={form[field]}
              onChange={e => handleChange(field, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
