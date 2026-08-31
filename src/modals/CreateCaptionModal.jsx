import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, update } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

export default function CreateCaptionModal({ post = null, onClose }) {
  const { manager, isAdmin } = useAdmin();
  const isEdit = !!post;

  const defaultUsername = post?.username || (isAdmin ? "Admin" : manager?.username || "");
  const defaultAvatar = post?.userAvatar || manager?.profilePhoto || "";

  const [username, setUsername] = useState(defaultUsername);
  const [caption, setCaption] = useState(post?.caption || "");
  const [verified, setVerified] = useState(post?.verified || false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(defaultAvatar);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!caption.trim()) { setStatus("Caption is required."); return; }
    setSaving(true);
    setStatus("Saving...");
    try {
      let avatarUrl = post?.userAvatar
        || `https://ui-avatars.com/api/?name=${(username[0] || "A")}&background=FF1493&color=fff`;

      if (avatarFile) {
        const { uploadToImgBB } = await import("../utils/imgUpload");
        avatarUrl = await uploadToImgBB(avatarFile);
      }

      const data = {
        username: isAdmin ? username : (manager?.username || "Anonymous"),
        caption,
        verified,
        media: [],
        userAvatar: isAdmin ? avatarUrl : (manager?.profilePhoto || avatarUrl),
        timestamp: post?.timestamp || Date.now(),
      };

      if (isEdit) await update(ref(db, `${PATHS.posts}/${post.id}`), data);
      else await push(ref(db, PATHS.posts), { ...data, likes: 0 });

      onClose();
    } catch (e) { setStatus("Error: " + e.message); }
    setSaving(false);
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.4)",
    borderRadius: "12px", color: "#fff",
    fontFamily: "inherit", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box", marginBottom: "16px",
  };
  const labelStyle = {
    color: "rgba(255,255,255,0.6)", fontSize: "0.8rem",
    display: "block", marginBottom: "6px",
    textTransform: "uppercase", letterSpacing: "0.5px",
  };

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>
        {isEdit ? "✏️ Edit Caption" : "✍️ Create Caption"}
      </h3>

      {/* Admin-only: custom username & avatar */}
      {isAdmin && (
        <>
          <label style={labelStyle}>Profile Name *</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Name" style={inputStyle} />
          <label style={labelStyle}>Profile Photo</label>
          <div style={{ marginBottom: "16px" }}>
            {avatarPreview && (
              <img src={avatarPreview} alt="" style={{ width: "60px", height: "60px", borderRadius: "50%", border: "2px solid #FF1493", objectFit: "cover", marginBottom: "8px", display: "block" }} />
            )}
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }} />
          </div>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "16px" }}>
            <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />
            <span style={{ color: "#fff" }}>Verified Badge ✓</span>
          </label>
        </>
      )}

      <label style={labelStyle}>Caption *</label>
      <textarea
        value={caption}
        onChange={e => setCaption(e.target.value)}
        rows={5}
        placeholder="What's on your mind?"
        style={{ ...inputStyle, resize: "vertical" }}
      />

      {status && (
        <div style={{ color: status.startsWith("Error") ? "#ff6b6b" : "#FF1493", fontSize: "0.85rem", marginBottom: "12px" }}>
          {status}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontSize: "0.95rem" }}
        >
          {saving ? "Saving..." : isEdit ? "Update Caption" : "Post Caption"}
        </button>
        <button
          onClick={onClose}
          style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "0.95rem" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
