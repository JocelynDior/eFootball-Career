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
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "16px" }}>
      {isAdmin && (
        <button onClick={() => setCreateOpen(true)} style={{
          width: "100%", padding: "14px", marginBottom: "20px",
          background: "linear-gradient(135deg, #FF1493, #FF69B4)",
          border: "none", borderRadius: "14px", color: "#fff",
          fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(255,20,147,0.35)"
        }}>➕ Create New Post</button>
      )}

      {!posts.length ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>
          No posts yet.
        </div>
      ) : (
        <>
          {/* Instagram-style 3-column grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "3px",
          }}>
            {posts.map(post => {
              const media = post.media || (post.imageUrl ? [{ type: "image", url: post.imageUrl }] : []);
              const thumb = media[0];
              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  style={{
                    aspectRatio: "1/1",
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "4px",
                  }}
                >
                  {thumb ? (
                    thumb.type === "video" ? (
                      <div style={{
                        width: "100%", height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "#111",
                        fontSize: "2.5rem"
                      }}>▶️</div>
                    ) : (
                      <img
                        src={thumb.url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    )
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(255,20,147,0.08)",
                      fontSize: "1.6rem"
                    }}>📝</div>
                  )}

                  {/* Hover overlay */}
                  <div className="grid-overlay" style={{
                    position: "absolute", inset: 0,
                    background: "rgba(0,0,0,0)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: "12px",
                    transition: "background 0.2s"
                  }}>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Post detail modal */}
          {selectedPost && (
            <div
              onClick={() => setSelectedPost(null)}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,20,0.85)",
                backdropFilter: "blur(10px)",
                zIndex: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "20px"
              }}
            >
              <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "500px" }}>
                <FeedPost
                  post={selectedPost}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onEdit={p => { setEditPost(p); setSelectedPost(null); }}
                />
                <button
                  onClick={() => setSelectedPost(null)}
                  style={{
                    display: "block", margin: "0 auto",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,20,147,0.3)",
                    color: "#fff", padding: "10px 28px",
                    borderRadius: "20px", cursor: "pointer",
                    fontSize: "0.9rem", fontWeight: 600
                  }}
                >Close</button>
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
        .grid-overlay:hover { background: rgba(0,0,0,0.35) !important; }
      `}</style>
    </div>
  );
}
