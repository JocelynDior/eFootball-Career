import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

export default function CreateCommentModal({ onClose }) {
  const { manager, isAdmin } = useAdmin();
  const [postSearch, setPostSearch] = useState("");
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  function loadPosts() {
    if (loaded) return;
    setLoaded(true);
    onValue(ref(db, PATHS.posts), snap => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 20);
        setPosts(arr);
      }
    }, { onlyOnce: true });
  }

  const username = isAdmin ? "Admin" : (manager?.username || "");
  const userAvatar = manager?.profilePhoto || `https://ui-avatars.com/api/?name=${username[0] || "A"}&background=FF1493&color=fff`;

  const filtered = posts.filter(p =>
    !postSearch || (p.caption || "").toLowerCase().includes(postSearch.toLowerCase()) ||
    (p.username || "").toLowerCase().includes(postSearch.toLowerCase())
  );

  async function handleSubmit() {
    if (!selectedPost) { setStatus("Select a post first."); return; }
    if (!commentText.trim()) { setStatus("Comment cannot be empty."); return; }
    setSaving(true);
    setStatus("Posting...");
    try {
      await push(ref(db, `${PATHS.posts}/${selectedPost.id}/comments`), {
        username,
        userAvatar,
        text: commentText.trim(),
        timestamp: Date.now(),
      });
      setStatus("");
      onClose();
    } catch (e) {
      setStatus("Error: " + e.message);
    }
    setSaving(false);
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.4)",
    borderRadius: "12px", color: "#fff",
    fontFamily: "inherit", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>
        Create Comment
      </h3>

      {/* Post selector */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
          Select Post
        </label>
        <input
          value={postSearch}
          onChange={e => { setPostSearch(e.target.value); loadPosts(); }}
          onFocus={loadPosts}
          placeholder="Search posts..."
          style={{ ...inputStyle, marginBottom: "10px" }}
        />
        <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedPost(p)}
              style={{
                padding: "12px 16px",
                background: selectedPost?.id === p.id ? "rgba(255,20,147,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${selectedPost?.id === p.id ? "#FF1493" : "rgba(255,20,147,0.15)"}`,
                borderRadius: "12px", cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: "12px",
              }}
            >
              <img src={p.userAvatar} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,20,147,0.4)", flexShrink: 0 }} />
              <div style={{ overflow: "hidden" }}>
                <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "0.85rem" }}>{p.username}</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.caption}</div>
              </div>
            </div>
          ))}
          {loaded && filtered.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", textAlign: "center", padding: "12px" }}>No posts found</div>
          )}
          {!loaded && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", textAlign: "center", padding: "12px" }}>Click above to search posts</div>
          )}
        </div>
      </div>

      {/* Comment input */}
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
        Your Comment
      </label>
      <textarea
        value={commentText}
        onChange={e => setCommentText(e.target.value)}
        rows={4}
        placeholder="Write your comment..."
        style={{ ...inputStyle, resize: "vertical", marginBottom: "16px" }}
      />

      {status && (
        <div style={{ color: status.startsWith("Error") ? "#ff6b6b" : "#FF1493", fontSize: "0.85rem", marginBottom: "12px" }}>
          {status}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontSize: "0.95rem" }}
        >
          {saving ? "Posting..." : "Post Comment"}
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
