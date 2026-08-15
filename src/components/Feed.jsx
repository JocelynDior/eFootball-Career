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
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "16px" }}>
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
        posts.map(post => (
          <FeedPost key={post.id} post={post}
            onLike={handleLike}
            onDelete={handleDelete}
            onEdit={p => setEditPost(p)}
          />
        ))
      )}
      <Modal active={createOpen} onClose={() => setCreateOpen(false)}>
        <CreatePostModal onClose={() => setCreateOpen(false)} />
      </Modal>
      <Modal active={!!editPost} onClose={() => setEditPost(null)}>
        <CreatePostModal post={editPost} onClose={() => setEditPost(null)} />
      </Modal>
    </div>
  );
}
