import { useState } from "react";
import Modal from "../components/Modal";
import ManagerKeysModal from "./ManagerKeysModal";
import ManagerHistoryModal from "./ManagerHistoryModal";
import PendingFixturesModal from "./PendingFixturesModal";
import RequestsHistoryModal from "./RequestsHistoryModal";
import { db } from "../firebase";
import { ref, set } from "firebase/database";

export default function AdminSettingsModal({ league, season, onClose, onAddSeason, onRenameSeason, onSetActiveSeason, backgroundVideo, onSaveVideo }) {
  const [view, setView] = useState("main");
  const [videoInput, setVideoInput] = useState(backgroundVideo || "");
  const [saving, setSaving] = useState(false);

  if (view === "keys") return <Modal active onClose={() => setView("main")}><ManagerKeysModal onClose={() => setView("main")} /></Modal>;
  if (view === "history") return <Modal active onClose={() => setView("main")}><ManagerHistoryModal league={league} season={season} onClose={() => setView("main")} /></Modal>;
  if (view === "pending") return <Modal active onClose={() => setView("main")}><PendingFixturesModal league={league} season={season} onClose={() => setView("main")} /></Modal>;
  if (view === "requests") return <Modal active onClose={() => setView("main")}><RequestsHistoryModal league={league} season={season} onClose={() => setView("main")} /></Modal>;

  async function handleSaveVideo() {
    setSaving(true);
    await set(ref(db, `career_${league}_settings/backgroundVideo`), videoInput.trim());
    onSaveVideo(videoInput.trim());
    setSaving(false);
  }

  const btnStyle = { width: "100%", padding: "16px 20px", background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem", textAlign: "left", display: "flex", alignItems: "center", gap: "14px", transition: "all 0.2s", marginBottom: "10px", fontFamily: "inherit" };

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>⚙️ Admin Settings</h3>

      <div style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>🎬 Background Video (Cloudinary URL)</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={videoInput} onChange={e => setVideoInput(e.target.value)} placeholder="Paste Cloudinary video URL" style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none" }} />
          <button onClick={handleSaveVideo} disabled={saving} style={{ background: "#FF1493", border: "none", color: "#fff", padding: "0 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 700 }}>{saving ? "..." : "Save"}</button>
        </div>
      </div>

      {[
        ["📋", "Pending Results", "pending"],
        ["📜", "Submission History", "requests"],
        ["🔑", "Manager Keys", "keys"],
        ["📋", "Manager History", "history"],
      ].map(([icon, label, id]) => (
        <button key={id} onClick={() => setView(id)} style={btnStyle}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.18)"; e.currentTarget.style.borderColor = "#FF1493"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; }}>
          <span style={{ fontSize: "1.4rem" }}>{icon}</span>{label}<span style={{ marginLeft: "auto", color: "#FF1493" }}>›</span>
        </button>
      ))}

      <button onClick={onClose} style={{ width: "100%", marginTop: "8px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
