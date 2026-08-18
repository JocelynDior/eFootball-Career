import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, update } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import FeedPost from "./FeedPost";
import Modal from "./Modal";
import CreatePostModal from "../modals/CreatePostModal";
import LoadingSpinner from "./LoadingSpinner";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const { isAdmin } = useAdmin();
  const [likedPosts, setLikedPosts] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("careerLikedPosts") || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    const dbRef = ref(db, PATHS.posts);
    const unsub = onValue(dbRef, snap => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.timestamp - a.timestamp);
        setPosts(arr);
      } else setPosts([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleLike(postId) {
    if (likedPosts.has(postId)) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const newLikes = Math.min((post.likes || 0) + 1, 10000);
    await update(ref(db, `${PATHS.posts}/${postId}`), { likes: newLikes });
    const updated = new Set(likedPosts);
    updated.add(postId);
    setLikedPosts(updated);
    localStorage.setItem("careerLikedPosts", JSON.stringify([...updated]));
  }

  async function handleDelete(postId) {
    if (!confirm("Delete this post?")) return;
    await remove(ref(db, `${PATHS.posts}/${postId}`));
    if (selectedPost?.id === postId) setSelectedPost(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ width: "100%", padding: "0 0 40px" }}>
      {isAdmin && (
        <div style={{ padding: "0 16px 20px" }}>
          <button onClick={() => setCreateOpen(true)} style={{ width: "100%", padding: "18px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "16px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(255,20,147,0.4)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(255,20,147,0.5)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,20,147,0.4)"; }}>
            ➕ Create New Post
          </button>
        </div>
      )}

      {!posts.length ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.4)", fontSize: "1.2rem" }}>No posts yet.</div>
      ) : (
        <>
          {/* 3-column Instagram-style grid, full width */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px" }}>
            {posts.map(post => {
              const media = post.media || (post.imageUrl ? [{ type: "image", url: post.imageUrl }] : []);
              const thumb = media[0];
              return (
                <div key={post.id} onClick={() => setSelectedPost(post)} style={{ aspectRatio: "1/2", overflow: "hidden", cursor: "pointer", position: "relative", background: "rgba(255,255,255,0.04)", transition: "transform 0.2s, filter 0.2s" }}
                  onMouseOver={e => { e.currentTarget.style.filter = "brightness(0.75)"; }}
                  onMouseOut={e => { e.currentTarget.style.filter = "brightness(1)"; }}>
                  {thumb ? (
                    thumb.type === "video" ? (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", fontSize: "4rem" }}>▶️</div>
                    ) : (
                      <img src={thumb.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,20,147,0.08)", fontSize: "3.5rem" }}>📝</div>
                  )}
                  {/* Multi-media indicator */}
                  {media.length > 1 && (
                    <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "4px 8px", fontSize: "0.85rem", color: "#fff" }}>⧉</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Post detail modal */}
          {selectedPost && (
            <div onClick={() => setSelectedPost(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,20,0.88)", backdropFilter: "blur(12px)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease" }}>
              <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "680px", maxHeight: "92vh", overflowY: "auto", borderRadius: "28px", background: "rgba(0,0,30,0.6)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,20,147,0.2)", padding: "8px", animation: "scaleIn 0.25s ease" }}>
                <FeedPost post={selectedPost} onLike={handleLike} onDelete={handleDelete} onEdit={p => { setEditPost(p); setSelectedPost(null); }} hideLikes />
                <button onClick={() => setSelectedPost(null)} style={{ display: "block", margin: "0 auto 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,20,147,0.3)", color: "#fff", padding: "14px 48px", borderRadius: "22px", cursor: "pointer", fontSize: "1rem", fontWeight: 600, transition: "background 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal active={createOpen} onClose={() => setCreateOpen(false)}>
        <CreatePostModal onClose={() => setCreateOpen(false)} />
      </Modal>
      <Modal active={!!editPost} onClose={() => setEditPost(null)}>
        <CreatePostModal post={editPost} onClose={() => setEditPost(null)} />
      </Modal>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
