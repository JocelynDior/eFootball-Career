import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue, push, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import { extractYoutubeId } from "../utils/imgUpload";
import Modal from "./Modal";

export default function WatchMatch({ league }) {
  const [videos, setVideos] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAdmin();

  const path = `career_${league}_watch_videos`;

  useEffect(() => {
    const dbRef = ref(db, path);
    const unsub = onValue(dbRef, snap => {
      const data = snap.val();
      if (data) setVideos(Object.entries(data).map(([id, v]) => ({ id, ...v })));
      else setVideos([]);
    });
    return () => unsub();
  }, [league]);

  function renderEmbed(videoUrl) {
    const ytId = extractYoutubeId(videoUrl);
    if (ytId) return <iframe style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: "12px" }} src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen />;
    return (
      <video controls src={videoUrl} style={{ width: "100%", aspectRatio: "16/9", borderRadius: "12px", background: "#000" }} />
    );
  }

  async function handleAdd() {
    if (!url.trim()) return;
    setSaving(true);
    await push(ref(db, path), { title: title.trim() || "Match Video", url: url.trim() });
    setTitle(""); setUrl(""); setSaving(false); setAddOpen(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this video?")) return;
    await remove(ref(db, `${path}/${id}`));
  }

  return (
    <div>
      {!videos.length && <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>No match videos yet.</div>}
      {videos.map(v => (
        <div key={v.id} style={{ marginBottom: "32px" }}>
          {renderEmbed(v.url)}
          <div style={{ textAlign: "center", marginTop: "10px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "2px" }}>{v.title}</div>
          {isAdmin && <button onClick={() => handleDelete(v.id)} style={{ display: "block", margin: "8px auto 0", background: "rgba(255,0,0,0.2)", border: "1px solid #cc3333", color: "#ffaaaa", padding: "6px 20px", borderRadius: "20px", cursor: "pointer", fontSize: "0.85rem" }}>🗑️ Delete</button>}
        </div>
      ))}
      {isAdmin && <button onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,20,147,0.15)", border: "2px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "14px 32px", borderRadius: "50px", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", fontFamily: "inherit", margin: "0 auto" }}>➕ Add Video</button>}

      <Modal active={addOpen} onClose={() => setAddOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>🎬 Add Match Video</h3>
        <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", display: "block", marginBottom: "6px" }}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Arsenal vs Liverpool" style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#fff", fontFamily: "inherit", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
        <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", display: "block", marginBottom: "6px" }}>YouTube or Cloudinary URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste video link here" style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#fff", fontFamily: "inherit", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", marginBottom: "20px" }} />
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Adding..." : "Add Video"}</button>
          <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
