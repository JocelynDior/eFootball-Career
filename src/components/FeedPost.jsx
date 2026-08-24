import { useState } from "react";
import { useAdmin } from "../context/AdminContext";
import { formatTimestamp } from "../utils/formatters";
import { extractYoutubeId } from "../utils/imgUpload";

export default function FeedPost({ post, onLike, onDelete, onEdit, likedPosts = new Set() }) {
  const { isAdmin } = useAdmin();
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  const media = post.media || (post.imageUrl ? [{ type: "image", url: post.imageUrl }] : []);
  const liked = likedPosts.has(post.id);
  const likeCount = post.likes || 0;
  const commentCount = post.comments ? Object.keys(post.comments).length : 0;

  function renderMedia(item) {
    if (item.type === "video") {
      const ytId = extractYoutubeId(item.url);
      if (ytId) return (
        <iframe
          style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
          src={`https://www.youtube.com/embed/${ytId}`}
          allowFullScreen
        />
      );
      return <video controls src={item.url} style={{ width: "100%", height: "auto", background: "#000", display: "block" }} />;
    }
    return <img src={item.url} alt="" style={{ width: "100%", height: "auto", display: "block", background: "#000" }} />;
  }

  return (
    <div style={{
      background: "rgba(0,0,30,0.55)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      borderBottom: "1px solid rgba(255,20,147,0.12)",
      marginBottom: 0,
      animation: "fadeInUp 0.35s ease",
    }}>

      {/* Header row */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <img
          src={post.userAvatar}
          alt=""
          style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid #FF1493", objectFit: "cover", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{post.username}</span>
            {post.verified && (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#FF1493" d="M12 2l2.4 3.2L18 4l-.8 3.8L21 10l-2.8 2 .8 3.8-3.6-1.2L12 18l-3.4-3.4-3.6 1.2.8-3.8L3 10l3.8-2.2L6 4l3.6 1.2z" />
              </svg>
            )}
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.82rem" }}>&middot; {formatTimestamp(post.timestamp)}</span>
          </div>

          {/* Caption for text-only posts shown inline under name */}
          {media.length === 0 && post.caption && (
            <div style={{ color: "#fff", fontSize: "0.97rem", lineHeight: 1.5, marginTop: "6px", wordBreak: "break-word" }}>
              {post.caption}
            </div>
          )}
        </div>

        {/* 3-dot menu */}
        {isAdmin && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "1.4rem", cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}
            >
              &bull;&bull;&bull;
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: "100%",
                background: "rgba(0,0,40,0.98)", border: "1px solid rgba(255,20,147,0.3)",
                borderRadius: "14px", minWidth: "140px", zIndex: 10,
                overflow: "hidden", animation: "fadeIn 0.15s ease",
              }}>
                <div
                  onClick={() => { onEdit(post); setMenuOpen(false); }}
                  style={{ padding: "14px 18px", color: "#fff", cursor: "pointer", fontSize: "0.9rem" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                >Edit</div>
                <div
                  onClick={() => { onDelete(post.id); setMenuOpen(false); }}
                  style={{ padding: "14px 18px", color: "#ff6b6b", cursor: "pointer", fontSize: "0.9rem" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,0,0,0.12)"}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                >Delete</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media (full width, image posts) */}
      {media.length > 0 && (
        <>
          <div style={{ position: "relative", background: "#000", width: "100%" }}>
            {renderMedia(media[slideIdx])}
            {media.length > 1 && (
              <>
                <button onClick={() => setSlideIdx(i => Math.max(0, i - 1))} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#FF1493", fontSize: "1.8rem", padding: "14px 10px", cursor: "pointer" }}>&#8249;</button>
                <button onClick={() => setSlideIdx(i => Math.min(media.length - 1, i + 1))} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#FF1493", fontSize: "1.8rem", padding: "14px 10px", cursor: "pointer" }}>&#8250;</button>
                <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
                  {media.map((_, i) => (
                    <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: i === slideIdx ? "#FF1493" : "rgba(255,255,255,0.4)", display: "block", transition: "background 0.2s" }} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Caption below image */}
          {post.caption && (
            <div style={{ padding: "10px 16px 4px", color: "#fff", fontSize: "0.95rem", lineHeight: 1.5, wordBreak: "break-word" }}>
              <span style={{ color: "#FF1493", fontWeight: 700 }}>{post.username} </span>
              {post.caption}
            </div>
          )}
        </>
      )}

      {/* Action bar */}
      <div style={{ padding: "10px 16px 14px", display: "flex", alignItems: "center", gap: "0" }}>

        {/* Like */}
        <button
          onClick={() => onLike(post.id)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px 6px 0", transition: "transform 0.15s" }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? "#FF1493" : "none"}>
            <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z"
              stroke="#FF1493" strokeWidth="2" />
          </svg>
          {likeCount > 0 && <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>{likeCount}</span>}
        </button>

        {/* Comment */}
        <button
          onClick={() => setShowComments(!showComments)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", transition: "transform 0.15s" }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z" stroke="#FF1493" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          {commentCount > 0 && <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>{commentCount}</span>}
        </button>

        {/* Share */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: post.username, text: post.caption, url: window.location.href }).catch(() => {});
            } else {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", transition: "transform 0.15s" }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#FF1493" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,20,147,0.1)" }}>
          {post.comments && Object.values(post.comments).length > 0 ? (
            Object.values(post.comments).map((c, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <img src={c.userAvatar || `https://ui-avatars.com/api/?name=${c.username?.[0]}&background=FF1493&color=fff`} alt="" style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1.5px solid rgba(255,20,147,0.4)", objectFit: "cover", flexShrink: 0 }} />
                <div>
                  <span style={{ color: "#FF69B4", fontWeight: 700, fontSize: "0.88rem" }}>{c.username} </span>
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.88rem" }}>{c.text}</span>
                  {c.timestamp && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: "2px" }}>{formatTimestamp(c.timestamp)}</div>}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", padding: "12px 0" }}>No comments yet</div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
