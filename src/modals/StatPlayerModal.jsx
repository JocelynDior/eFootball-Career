import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, set } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";

export default function StatPlayerModal({ league, season, type = "scorer", teams, player = null, onClose }) {
  const isEdit = !!player;
  const [name, setName] = useState(player?.name || "");
  const [team, setTeam] = useState(player?.team || "");
  const [count, setCount] = useState(player?.count || 0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(player?.imageUrl || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const path = type === "scorer" ? PATHS.topScorers(league, season) : PATHS.topAssistants(league, season);
  const label = type === "scorer" ? "Goals" : "Assists";

  function handleImage(e) {
    const file = e.target.files[0]; if (!file) return;
    setImageFile(file);
    const r = new FileReader(); r.onload = ev => setImagePreview(ev.target.result); r.readAsDataURL(file);
  }

  async function handleSave() {
    if (!name.trim() || !team) { setStatus("Name and team required."); return; }
    setSaving(true);
    try {
      let imageUrl = player?.imageUrl || "";
      if (imageFile) imageUrl = await uploadToImgBB(imageFile);
      const data = { name: name.trim(), team, count: +count, imageUrl };
      if (isEdit) await set(ref(db, `${path}/${player.key}`), data);
      else await push(ref(db, path), data);
      onClose();
    } catch (e) { setStatus("Error: " + e.message); }
    setSaving(false);
  }

  const inputStyle = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", marginBottom: "14px" };
  const labelStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" };

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>{isEdit ? "✏️ Edit" : "➕ Add"} {type === "scorer" ? "Scorer" : "Assistant"}</h3>
      <label style={labelStyle}>Player Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
      <label style={labelStyle}>Team</label>
      <select value={team} onChange={e => setTeam(e.target.value)} style={inputStyle}>
        <option value="">Select team</option>
        {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
      </select>
      <label style={labelStyle}>{label}</label>
      <input type="number" value={count} onChange={e => setCount(e.target.value)} style={inputStyle} />
      <label style={labelStyle}>Player Photo</label>
      {imagePreview && <img src={imagePreview} alt="" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "12px", border: "2px solid #FF1493", marginBottom: "10px", display: "block" }} />}
      <input type="file" accept="image/*" onChange={handleImage} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "16px", display: "block" }} />
      {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: "12px" }}>{status}</div>}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
