import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, set } from "firebase/database";

export default function AddTeamModal({ league, season, team = null, onClose }) {
  const isEdit = !!team;
  const [form, setForm] = useState({
    name: team?.name || "", p: team?.p || 0, w: team?.w || 0, d: team?.d || 0,
    l: team?.l || 0, gs: team?.gs || 0, gc: team?.gc || 0, gd: team?.gd || 0, pts: team?.pts || 0
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  function handleChange(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setStatus("Team name required."); return; }
    setSaving(true);
    try {
      const data = { ...form, p: +form.p, w: +form.w, d: +form.d, l: +form.l, gs: +form.gs, gc: +form.gc, gd: +form.gd, pts: +form.pts };
      if (isEdit) await set(ref(db, `${PATHS.table(league, season)}/${team.key}`), data);
      else await push(ref(db, PATHS.table(league, season)), data);
      onClose();
    } catch (e) { setStatus("Error: " + e.message); }
    setSaving(false);
  }

  const inputStyle = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
  const labelStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" };

  const fields = [["name","Team Name","text"],["p","Played","number"],["w","Wins","number"],["d","Draws","number"],["l","Losses","number"],["gs","Goals Scored","number"],["gc","Goals Conceded","number"],["gd","Goal Difference","number"],["pts","Points","number"]];

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>{isEdit ? "✏️ Edit Team" : "➕ Add Team"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        {fields.map(([field, label, type]) => (
          <div key={field} style={{ gridColumn: field === "name" ? "1 / -1" : "auto" }}>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={form[field]} onChange={e => handleChange(field, e.target.value)} style={inputStyle} />
          </div>
        ))}
      </div>
      {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: "12px" }}>{status}</div>}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
