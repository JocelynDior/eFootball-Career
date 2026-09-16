import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { db, PATHS } from "../firebase";
import { ref, push, set, onValue, get } from "firebase/database";
import { getTeamIcon } from "../utils/teamIcons";
import AutoCalcModal from "./AutoCalcModal";

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
  const [autoCalcOpen, setAutoCalcOpen] = useState(false);
  const [matchLog, setMatchLog] = useState([]);
  const [calcStats, setCalcStats] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
          stats.p += 1; stats.l += 1;
          log.push({ opponent, side, outcome: "L", score: "F-F", type: "No Contest" });

        } else if (ft === "forfeit_win") {
          // The winner is NOT always homeTeam — AddResultModal keeps
          // homeTeam/awayTeam as whichever teams were picked, and encodes
          // the winner via the score (3-0 home win, 0-3 away win). So the
          // winner has to be worked out the same way as a normal match.
          stats.p += 1;
          const hs = Number(result.homeScore) || 0;
          const as = Number(result.awayScore) || 0;
          const won = isHome ? hs > as : as > hs;
          if (won) {
            stats.w += 1; stats.pts += 3;
            log.push({ opponent, side, outcome: "W", score: `${hs}-${as} (F)`, type: "Forfeit" });
          } else {
            stats.l += 1;
            log.push({ opponent, side, outcome: "L", score: `${hs}-${as} (F)`, type: "Forfeit" });
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

      setMatchLog(log);
      setCalcStats(stats);
      setAutoCalcOpen(true);
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
        p: +form.p, w: +form.w, d: +form.d, l: +form.l,
        gs: +form.gs, gc: +form.gc, gd: +form.gd, pts: +form.pts,
      };
      if (isEdit) await set(ref(db, `${PATHS.table(league, season)}/${team.key}`), data);
      else {
        await push(ref(db, PATHS.table(league, season)), data);
        // If team doesn't exist in career_team_management, add it
        const exists = clubs.find(c => c.name.trim().toLowerCase() === form.name.trim().toLowerCase());
        if (!exists) {
          await push(ref(db, "career_team_management"), { name: form.name.trim() });
        }
      }
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
    <>
      {/* Portal renders AutoCalcModal directly on document.body — completely escapes Modal.jsx */}
      {autoCalcOpen && calcStats && createPortal(
        <AutoCalcModal
          league={league}
          season={season}
          team={team}
          matchLog={matchLog}
          stats={calcStats}
          onBack={() => setAutoCalcOpen(false)}
          onConfirm={() => { setAutoCalcOpen(false); onClose(); }}
        />,
        document.body
      )}

      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>
          {isEdit ? "✏️ Edit Team" : "➕ Add Team"}
        </h3>

        <label style={labelStyle}>Team</label>
        <div style={{ position: "relative", marginBottom: 16 }}>
          {selectedIcon && (
            <img src={selectedIcon} alt="" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, objectFit: "contain", zIndex: 2, pointerEvents: "none" }} />
          )}
          <input
            type="text"
            value={form.name}
            onChange={e => { handleChange("name", e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            disabled={isEdit}
            placeholder="Type new team or select existing..."
            style={{ ...inputStyle, paddingLeft: selectedIcon ? 48 : 14, cursor: isEdit ? "not-allowed" : "text", opacity: isEdit ? 0.7 : 1 }}
          />
          {showSuggestions && !isEdit && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 99999, background: "rgba(0,0,20,0.99)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.7)", maxHeight: 220, overflowY: "auto" }}>
              {clubs.filter(c => !form.name || c.name.toLowerCase().includes(form.name.toLowerCase())).length === 0 && (
                <div style={{ padding: "10px 14px", color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>No existing teams match — a new team will be created</div>
              )}
              {clubs.filter(c => !form.name || c.name.toLowerCase().includes(form.name.toLowerCase())).map(c => {
                const icon = getTeamIcon(c.name);
                return (
                  <div key={c.name} onMouseDown={() => { handleChange("name", c.name); setShowSuggestions(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", background: form.name === c.name ? "rgba(255,20,147,0.15)" : "transparent", transition: "background 0.15s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"} onMouseOut={e => e.currentTarget.style.background = form.name === c.name ? "rgba(255,20,147,0.15)" : "transparent"}>
                    {icon ? <img src={icon} alt="" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} /> : <div style={{ width: 26, height: 26, background: "rgba(255,255,255,0.08)", borderRadius: 4, flexShrink: 0 }} />}
                    <span style={{ color: "#fff", fontSize: "0.88rem", fontWeight: 600 }}>{c.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleAutoCalculate}
          disabled={autoCalcing || !form.name.trim()}
          style={{
            width: "100%", padding: "12px 16px", marginBottom: 16,
            background: "rgba(255,20,147,0.15)",
            border: "1px solid rgba(255,20,147,0.5)",
            borderRadius: 10, color: "#FF1493",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.05rem",
            letterSpacing: 1.5, cursor: autoCalcing || !form.name.trim() ? "not-allowed" : "pointer",
            opacity: !form.name.trim() ? 0.4 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {autoCalcing ? "⏳ Calculating..." : "⚡ AUTO CALCULATE FROM RESULTS"}
        </button>

        {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: 12 }}>{status}</div>}

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
    </>
  );
}
