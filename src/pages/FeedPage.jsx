import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import StoryCarousel from "../components/StoryCarousel";
import Feed from "../components/Feed";
import CountdownTimers from "../components/CountdownTimers";
import Modal from "../components/Modal";

export default function FeedPage() {
  const { isAdmin } = useAdmin();
  const [bgVideo, setBgVideo] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/backgroundVideo`), snap => {
      if (snap.val()) setBgVideo(snap.val());
    });
    return () => unsub();
  }, []);

  async function handleSaveVideo() {
    setSaving(true);
    await set(ref(db, `${PATHS.globalSettings}/backgroundVideo`), videoInput.trim());
    setBgVideo(videoInput.trim());
    setSaving(false);
    setVideoModalOpen(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      {bgVideo && (
        <>
          <video autoPlay muted loop playsInline style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -2, opacity: 0.35 }} src={bgVideo} />
          <div style={{ position: "fixed", inset: 0, zIndex: -1, background: "linear-gradient(135deg, rgba(0,0,51,0.75) 0%, rgba(0,0,30,0.85) 100%)" }} />
        </>
      )}

      <Navbar />
      <StoryCarousel />
      <CountdownTimers />

      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 16px 0" }}>
          <button onClick={() => { setVideoInput(bgVideo); setVideoModalOpen(true); }} style={{
            background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)",
            color: "#FF1493", padding: "10px 24px", borderRadius: "30px",
            cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit"
          }}>🎬 {bgVideo ? "Change Background Video" : "Set Background Video"}</button>
        </div>
      )}

      <Feed />

      <Modal active={videoModalOpen} onClose={() => setVideoModalOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "8px" }}>🎬 Global Background Video</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "20px" }}>This video will show across the entire site on all pages.</p>
        <input value={videoInput} onChange={e => setVideoInput(e.target.value)} placeholder="Paste Cloudinary video URL" style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#fff", fontFamily: "inherit", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSaveVideo} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save"}</button>
          <button onClick={() => setVideoModalOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
