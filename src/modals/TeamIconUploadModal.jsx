import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, set } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import { uploadToImgBB } from "../utils/imgUpload";

const inputStyle = {
  width: "100%", padding: "12px 16px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.4)",
  borderRadius: 12, color: "#fff",
  fontFamily: "inherit", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

export default function TeamIconUploadModal({ onClose }) {
  const { updateTeamIcon } = useAdmin();
  const [teamName, setTeamName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  function handleImageChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    const r = new FileReader();
    r.onload = ev => setImagePreview(ev.target.result);
    r.readAsDataURL(f);
  }

  async function handleSave() {
    if (!teamName.trim()) { setStatus("Please enter the team name."); return; }
    if (!imageFile) { setStatus("Please select an image."); return; }
    setSaving(true);
    setStatus("Uploading...");
    try {
      const url = await uploadToImgBB(imageFile);
      // Save to career_team_icons/[teamName]
      await set(ref(db, `${PATHS.teamIcons}/${teamName.trim()}`), { imageUrl: url, updatedAt: Date.now() });
      // Also update AdminContext cache so all components update instantly
      updateTeamIcon(teamName.trim(), url);
      setStatus("✅ Team icon saved!");
      setTimeout(onClose, 1200);
    } catch (e) {
      setStatus("Error: " + e.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginBottom: 8, letterSpacing: 2 }}>
        🏷️ Add Team Icon
      </h3>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", marginBottom: 24, lineHeight: 1.5 }}>
        Type the exact team name as it appears in the table, fixtures, and results. The icon will replace all circles for that team across every tab.
      </p>

      <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
        Team Name (exact match)
      </label>
      <input
        type="text"
        value={teamName}
        onChange={e => setTeamName(e.target.value)}
        placeholder="e.g. Manchester City"
        style={{ ...inputStyle, marginBottom: 20 }}
      />

      <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
        Team Icon / Badge
      </label>

      {imagePreview ? (
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
          <img src={imagePreview} alt="Preview" style={{ width: 100, height: 100, objectFit: "contain", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", padding: 8 }} />
          <div>
            <div style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>{imageFile?.name}</div>
            <label style={{ cursor: "pointer", color: "#FF1493", fontSize: "0.85rem", fontWeight: 700 }}>
              Change image
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
            </label>
          </div>
        </div>
      ) : (
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", padding: "32px", background: "rgba(255,20,147,0.05)", border: "2px dashed rgba(255,20,147,0.4)", borderRadius: 14, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>
          <span style={{ fontSize: "2.5rem" }}>📷</span>
          <span style={{ fontSize: "0.9rem" }}>Tap to upload badge / icon</span>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>PNG, JPG, WEBP — transparent background recommended</span>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
        </label>
      )}

      {status && (
        <div style={{ color: status.startsWith("✅") ? "#22c55e" : status.startsWith("Error") ? "#ff6b6b" : "#FFB347", fontSize: "0.9rem", marginBottom: 16, textAlign: "center", fontWeight: 700 }}>
          {status}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontSize: "1rem", fontFamily: "inherit" }}
        >
          {saving ? "Saving..." : "Save Icon"}
        </button>
        <button
          onClick={onClose}
          style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
