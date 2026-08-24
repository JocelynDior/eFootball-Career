import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, update } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";
import { useAdmin } from "../context/AdminContext";

export default function CreatePostModal({ post = null, onClose }) {
  const { manager, isAdmin } = useAdmin();
  const isEdit = !!post;

  // Auto-fill from manager session if not editing
  const defaultUsername = post?.username || (isAdmin ? "Admin" : manager?.username || "");
  const defaultAvatar = post?.userAvatar || manager?.profilePhoto || "";

  const [username, setUsername] = useState(defaultUsername);
  const [caption, setCaption] = useState(post?.caption || "");
  const [verified, setVerified] = useState(post?.verified || false);
  const [mediaItems, setMediaItems] = useState(post?.media || []);
  const [videoLink, setVideoLink] = useState("");
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

  async function handleImageAdd(e) {
    const files = Array.from(e.target.files);
    setStatus("Uploading images...");
    for (const file of files) {
      const url = await uploadToImgBB(file);
      setMediaItems(prev => [...prev, { type: "image", url }]);
    }
    setStatus("");
  }

  function addVideoLink() {
    if (!videoLink.trim()) return;
    setMediaItems(prev => [...prev, { type: "video", url: videoLink.trim() }]);
    setVideoLink("");
  }

  function removeMedia(idx) {
    setMediaItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!username.trim() || !caption.trim()) { setStatus("Name and caption required."); return; }
    setSaving(true);
    setStatus("Saving...");
    try {
      let avatarUrl = post?.userAvatar || `https://ui-avatars.com/api/?name=${username[0]}&background=FF1493&color=fff`;
      if (avatarFile) avatarUrl = await uploadToImgBB(avatarFile);

      const data = { username, caption, verified, media: mediaItems, userAvatar: avatarUrl, likes: post?.likes || 0, comments: post?.comments || {}, timestamp: post?.timestamp || Date.now() };

      if (isEdit) await update(ref(db, `${PATHS.posts}/${post.id}`), data);
      else await push(ref(db, PATHS.posts), data);

      onClose();
    } catch (e) { setStatus("Error: " + e.message); }
    setSaving(false);
  }

  const inputStyle = { width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#fff", fontFamily: "inherit", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", marginBottom: "16px" };
  const labelStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" };

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>{isEdit ? "✏️ Edit Post" : "➕ Create Post"}</h3>
      <label style={labelStyle}>Profile Name *</label>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Name" style={inputStyle} />
      <label style={labelStyle}>Caption *</label>
      <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} placeholder="Write a caption..." style={{ ...inputStyle, resize: "vertical" }} />
      <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "16px" }}>
        <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />
        <span style={{ color: "#fff" }}>Verified Badge ✓</span>
      </label>
      <label style={labelStyle}>Profile Photo</label>
      <div style={{ marginBottom: "16px" }}>
        {avatarPreview && <img src={avatarPreview} alt="" style={{ width: "60px", height: "60px", borderRadius: "50%", border: "2px solid #FF1493", objectFit: "cover", marginBottom: "8px", display: "block" }} />}
        <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }} />
      </div>
      <label style={labelStyle}>Add Images</label>
      <input type="file" accept="image/*" multiple onChange={handleImageAdd} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "16px", display: "block" }} />
      <label style={labelStyle}>Add Video Link (Cloudinary/YouTube)</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input value={videoLink} onChange={e => setVideoLink(e.target.value)} placeholder="Paste video URL" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
        <button onClick={addVideoLink} style={{ background: "#FF1493", border: "none", color: "#fff", padding: "0 16px", borderRadius: "12px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>Add</button>
      </div>
      {mediaItems.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Media ({mediaItems.length})</label>
          {mediaItems.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "rgba(255,20,147,0.08)", borderRadius: "10px", marginBottom: "6px" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.type === "video" ? "🎥" : "🖼️"} {item.url.substring(0, 40)}...</span>
              <button onClick={() => removeMedia(i)} style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "1rem" }}>✕</button>
            </div>
          ))}
        </div>
      )}
      {status && <div style={{ color: status.startsWith("Error") ? "#ff6b6b" : "#FF1493", fontSize: "0.85rem", marginBottom: "12px" }}>{status}</div>}
      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontSize: "0.95rem" }}>{saving ? "Saving..." : isEdit ? "Update Post" : "Post"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "0.95rem" }}>Cancel</button>
      </div>
    </div>
  );
}
