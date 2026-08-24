import { useState, useEffect, useRef, useCallback } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, update, query, orderByChild, limitToLast } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import FeedPost from "./FeedPost";
import Modal from "./Modal";
import CreatePostModal from "../modals/CreatePostModal";

const PAGE_SIZE = 10;
const CACHE_KEY = "careerFeedImageCache";
const LIKED_KEY = "careerLikedPosts";

function getCachedImages() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}

function cachePostImages(posts) {
  const cache = getCachedImages();
  posts.forEach(post => {
    const media = post.media || (post.imageUrl ? [{ type: "image", url: post.imageUrl }] : []);
    media.forEach(m => {
      if (m.type === "image" && m.url) cache[post.id + "_" + m.url] = m.url;
    });
    if (post.userAvatar) cache["avatar_" + post.id] = post.userAvatar;
  });
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

export default function Feed({ onInitialLoaded }) {
  const [allPosts, setAllPosts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState(null);
  const { isAdmin } = useAdmin();

  const [likedPosts, setLikedPosts] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")); } catch { return new Set(); }
  });

  const sentinelRef = useRef(null);

  // Load all posts from Firebase (sorted newest first)
  useEffect(() => {
    const dbRef = ref(db, PATHS.posts);
    const unsub = onValue(dbRef, snap => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setAllPosts(arr);
        // Cache images for top 10
        cachePostImages(arr.slice(0, PAGE_SIZE));
        if (onInitialLoaded) onInitialLoaded();
      } else {
        setAllPosts([]);
        if (onInitialLoaded) onInitialLoaded();
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, allPosts.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [allPosts.length]);

  async function handleLike(postId) {
    if (likedPosts.has(postId)) return;
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    const newLikes = Math.min((post.likes || 0) + 1, 99999);
    await update(ref(db, `${PATHS.posts}/${postId}`), { likes: newLikes });
    const updated = new Set(likedPosts);
    updated.add(postId);
    setLikedPosts(updated);
    localStorage.setItem(LIKED_KEY, JSON.stringify([...updated]));
  }

  async function handleDelete(postId) {
    if (!confirm("Delete this post?")) return;
    await remove(ref(db, `${PATHS.posts}/${postId}`));
  }

  const visiblePosts = allPosts.slice(0, visibleCount);

  if (loading) return null; // parent handles loading spinner

  return (
    <div style={{ width: "100%", maxWidth: "680px", margin: "0 auto", paddingBottom: "100px" }}>
      {!allPosts.length ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>
          No posts yet.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {visiblePosts.map(post => (
              <FeedPost
                key={post.id}
                post={post}
                onLike={handleLike}
                onDelete={handleDelete}
                onEdit={p => setEditPost(p)}
                likedPosts={likedPosts}
              />
            ))}
          </div>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} style={{ height: "40px" }} />

          {visibleCount < allPosts.length && (
            <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
              Loading more posts...
            </div>
          )}
        </>
      )}

      <Modal active={!!editPost} onClose={() => setEditPost(null)}>
        <CreatePostModal post={editPost} onClose={() => setEditPost(null)} />
      </Modal>
    </div>
  );
}
