import { useState } from "react";
import { useAdmin } from "../context/AdminContext";
import { formatTimestamp } from "../utils/formatters";
import { extractYoutubeId } from "../utils/imgUpload";

export default function FeedPost({ post, onLike, onDelete, onEdit, hideLikes = false }) {
  const { isAdmin } = useAdmin();
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  const media = post.media || (post.imageUrl ? [{ type: "image", url: post.imageUrl }] : []);

  function renderMedia(item) {
    if (item.type === "video") {
      const ytId = extractYoutubeId(item.url);
      if (ytId) return <iframe style={{ width: "100%", aspectRatio: "16/9", border: "none" }} src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen />;
      return <video controls src={item.url} style={{ width: "100%", height: "auto", background: "#000" }} />;
    }
    return <img src={item.url} alt="" style={{ width: "100%", height: "auto", display: "block", background: "#000" }} />;
  }

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: "20px", marginBottom: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.3)", animation: "fadeInUp 0.4s ease" }}>
      {/* Header */}
      <div style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src={post.userAvatar} alt="" style={{ width: "42px", height: "42px", borderRadius: "50%", border: "2px solid #FF1493", objectFit: "cover" }} />
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: "5px" }}>
              {post.username}
              {post.verified && <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#FF1493" d="M12 2l2.4 3.2L18 4l-.8 3.8L21 10l-2.8 2 .8 3.8-3.6-1.2L12 18l-3.4-3.4-3.6 1.2.8-3.8L3 10l3.8-2.2L6 4l3.6 1.2z"/></svg>}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>{formatTimestamp(post.timestamp)}</div>
          </div>
        </div>
        {isAdmin && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: "#FF1493", fontSize: "1.6rem", cursor: "pointer", padding: "4px" }}>⋮</button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "100%", background: "rgba(0,0,40,0.98)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", minWidth: "150px", zIndex: 10, overflow: "hidden", animation: "fadeIn 0.15s ease" }}>
                <div onClick={() => { onEdit(post); setMenuOpen(false); }} style={{ padding: "14px 18px", color: "#fff", cursor: "pointer", fontSize: "0.95rem", transition: "background 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}>✏️ Edit</div>
                <div onClick={() => { onDelete(post.id); setMenuOpen(false); }} style={{ padding: "14px 18px", color: "#ff6b6b", cursor: "pointer", fontSize: "0.95rem", transition: "background 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,0,0,0.12)"}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}>🗑️ Delete</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media */}
      {media.length > 0 && (
        <div style={{ position: "relative", background: "#000" }}>
          {renderMedia(media[slideIdx])}
          {media.length > 1 && (
            <>
              <button onClick={() => setSlideIdx(i => Math.max(0, i - 1))} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#FF1493", fontSize: "1.8rem", padding: "14px 10px", cursor: "pointer" }}>‹</button>
              <button onClick={() => setSlideIdx(i => Math.min(media.length - 1, i + 1))} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#FF1493", fontSize: "1.8rem", padding: "14px 10px", cursor: "pointer" }}>›</button>
              <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
                {media.map((_, i) => <span key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === slideIdx ? "#FF1493" : "rgba(255,255,255,0.4)", display: "block", transition: "background 0.2s" }} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "14px 18px 8px", display: "flex", gap: "18px", alignItems: "center" }}>
        <button onClick={() => onLike(post.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, transition: "transform 0.15s" }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.15)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" stroke="#FF1493" strokeWidth="2" />
          </svg>
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, transition: "transform 0.15s" }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.15)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z" stroke="#FF1493" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Caption */}
      <div style={{ padding: "0 18px 14px", color: "#fff", fontSize: "0.95rem" }}>
        <strong style={{ color: "#FF1493" }}>{post.username}</strong> {post.caption}
      </div>

      {/* Comments */}
      {showComments && post.comments && (
        <div style={{ padding: "0 18px 14px", borderTop: "1px solid rgba(255,20,147,0.1)" }}>
          {Object.values(post.comments).map((c, i) => (
            <div key={i} style={{ padding: "8px 0", color: "rgba(255,255,255,0.8)", fontSize: "0.9rem" }}>
              <strong style={{ color: "#FF69B4" }}>{c.username}</strong> {c.text}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
