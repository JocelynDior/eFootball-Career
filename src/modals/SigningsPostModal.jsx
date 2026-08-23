import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, onValue, remove, set, get } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const PREFS_PATH = "career_global_settings/signingsPostPrefs";

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── CREATE POST MODAL ────────────────────────────────────────────────────
export function CreateSigningsPostModal({ onClose, onSuccess }) {
  const [username, setUsername] = useState("");
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load saved prefs (username + profile pic)
  useEffect(() => {
    get(ref(db, PREFS_PATH)).then(snap => {
      const prefs = snap.val();
      if (prefs?.username) setUsername(prefs.username);
      if (prefs?.profilePicUrl) { setProfilePicUrl(prefs.profilePicUrl); setProfilePicPreview(prefs.profilePicUrl); }
    });
  }, []);

  function handleProfilePic(e) {
    const f = e.target.files[0];
    if (!f) return;
    setProfilePicFile(f);
    const r = new FileReader();
    r.onload = ev => setProfilePicPreview(ev.target.result);
    r.readAsDataURL(f);
  }

  function handleImage(e) {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    const r = new FileReader();
    r.onload = ev => setImagePreview(ev.target.result);
    r.readAsDataURL(f);
  }

  async function handleSubmit() {
    if (!imageFile || !caption.trim() || !username.trim()) {
      setError("Please fill in username, image and caption."); return;
    }
    setSaving(true); setError("");
    try {
      // Upload post image
      const postImageUrl = await uploadToImgBB(imageFile);

      // Upload profile pic only if changed
      let finalProfilePicUrl = profilePicUrl;
      if (profilePicFile) {
        finalProfilePicUrl = await uploadToImgBB(profilePicFile);
      }

      // Save prefs for next time
      await set(ref(db, PREFS_PATH), { username: username.trim(), profilePicUrl: finalProfilePicUrl });

      // Save post
      await push(ref(db, `${PATHS.transfers}/signingsPosts`), {
        username: username.trim(),
        profilePicUrl: finalProfilePicUrl,
        imageUrl: postImageUrl,
        caption: caption.trim(),
        createdAt: Date.now(),
      });

      onSuccess?.();
      onClose();
    } catch (e) { setError("Failed: " + e.message); }
    setSaving(false);
  }

  const inputStyle = {
    width: "100%", padding: "14px 18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.35)",
    borderRadius: "12px", color: "#fff",
    fontFamily: "inherit", fontSize: "1rem",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", marginBottom: "24px" }}>📸 New Signing Post</div>

      {/* Profile section */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,20,147,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {profilePicPreview ? <img src={profilePicPreview} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "1.8rem" }}>👤</span>}
          </div>
          <label style={{ position: "absolute", bottom: "-4px", right: "-4px", background: "#FF1493", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.75rem" }}>
            ✏️
            <input type="file" accept="image/*" onChange={handleProfilePic} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "6px", fontWeight: 700 }}>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. SkySportsNews" style={inputStyle} />
        </div>
      </div>

      {/* Post image */}
      <div style={{ marginBottom: "18px" }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px", fontWeight: 700 }}>Post Image *</label>
        {imagePreview && (
          <img src={imagePreview} alt="preview" style={{ width: "100%", borderRadius: "12px", marginBottom: "10px", maxHeight: "300px", objectFit: "cover" }} />
        )}
        <label style={{ display: "block", padding: "14px", background: "rgba(255,20,147,0.08)", border: "2px dashed rgba(255,20,147,0.4)", borderRadius: "12px", textAlign: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
          {imageFile ? "✅ Image selected — click to change" : "📷 Click to upload image"}
          <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
        </label>
      </div>

      {/* Caption */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px", fontWeight: 700 }}>Caption *</label>
        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write your signing caption..." rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </div>

      {error && <div style={{ color: "#ff6b6b", fontSize: "0.9rem", marginBottom: "14px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "16px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Posting..." : "📸 Post"}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── SIGNINGS FEED ────────────────────────────────────────────────────────
export function SigningsFeed({ isAdmin }) {
  const [posts, setPosts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.transfers}/signingsPosts`), snap => {
      const data = snap.val();
      const list = data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : [];
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPosts(list);
    });
    return () => unsub();
  }, []);

  async function handleDelete(id) {
    if (!window.confirm("Delete this post?")) return;
    await remove(ref(db, `${PATHS.transfers}/signingsPosts/${id}`));
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      {/* Add Post button */}
      <button onClick={() => setShowCreate(true)} style={{ width: "100%", padding: "20px", background: "linear-gradient(135deg, #FF1493, #cc0077)", border: "none", borderRadius: "16px", color: "#fff", fontWeight: 800, fontSize: "1.3rem", cursor: "pointer", marginBottom: "32px", letterSpacing: "1px", boxShadow: "0 4px 20px rgba(255,20,147,0.35)" }}>
        📸 Add Signing Post
      </button>

      {/* Feed */}
      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📸</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Posts Yet</div>
        </div>
      ) : posts.map(post => (
        <div key={post.id} style={{ ...GLASS, borderRadius: "20px", overflow: "hidden", marginBottom: "32px", position: "relative" }}>
          {/* Post header */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "18px 20px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,20,147,0.4)", flexShrink: 0 }}>
              {post.profilePicUrl ? <img src={post.profilePicUrl} alt={post.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>👤</div>}
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>{post.username}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>{timeAgo(post.createdAt)}</div>
            </div>
            {isAdmin && (
              <button onClick={() => handleDelete(post.id)} style={{ marginLeft: "auto", background: "rgba(255,0,0,0.2)", border: "1px solid rgba(255,0,0,0.3)", borderRadius: "8px", color: "#ff6b6b", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>🗑️</button>
            )}
          </div>

          {/* Post image — full width */}
          <div style={{ width: "100%" }}>
            <img src={post.imageUrl} alt="signing" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: "600px" }} />
          </div>

          {/* Caption + timestamp */}
          <div style={{ padding: "20px" }}>
            <div style={{ color: "#fff", fontSize: "1.4rem", lineHeight: 1.6, marginBottom: "10px", fontWeight: 500 }}>
              <span style={{ color: "#FF1493", fontWeight: 800, marginRight: "8px" }}>{post.username}</span>
              {post.caption}
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
            </div>
          </div>
        </div>
      ))}

      {/* Create post modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" }} onClick={() => setShowCreate(false)}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "520px", width: "100%", position: "relative", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCreate(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
            <CreateSigningsPostModal onClose={() => setShowCreate(false)} onSuccess={() => setShowCreate(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
