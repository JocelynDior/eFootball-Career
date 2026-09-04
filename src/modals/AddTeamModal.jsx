import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, set, onValue } from "firebase/database";
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
  const [status, setStatus] = useState("");

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

      {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: 12 }}>{status}</div>}

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
