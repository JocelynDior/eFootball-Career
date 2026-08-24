import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set, push, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import { useMusic } from "../context/MusicContext";
import Navbar from "../components/Navbar";
import Feed from "../components/Feed";
import Modal from "../components/Modal";
import BackgroundVideo from "../components/BackgroundVideo";
import HeadlineSlideshow from "../components/HeadlineSlideshow";
import CountdownSlideshow from "../components/CountdownSlideshow";
import BottomNavBar from "../components/BottomNavBar";
import LoadingSpinner from "../components/LoadingSpinner";
import { uploadToImgBB } from "../utils/imgUpload";

// Preload an array of image URLs into the browser cache
function preloadImages(urls) {
  return Promise.all(
    urls.filter(Boolean).map(
      url => new Promise(resolve => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // never block on broken images
        img.src = url;
      })
    )
  );
}

export default function FeedPage() {
  const { isAdmin } = useAdmin();
  const { loadingVideoUrl, settingsLoaded } = useMusic();

  const [videoInput, setVideoInput] = useState("");
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [headlineModalOpen, setHeadlineModalOpen] = useState(false);
  const [countdownModalOpen, setCountdownModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [headlines, setHeadlines] = useState([]);
  const [countdowns, setCountdowns] = useState([]);

  // ── Loading gates ──────────────────────────────────────────────────────────
  // We wait for: headlines, countdowns, league icons, and first posts batch.
  // Only then do we signal dataReady → spinner fades / video finishes & fades.
  const [headlinesReady, setHeadlinesReady] = useState(false);
  const [countdownsReady, setCountdownsReady] = useState(false);
  const [leagueIconsReady, setLeagueIconsReady] = useState(false);
  const [postsReady, setPostsReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);   // all four gates open
  const [fadeOut, setFadeOut] = useState(false);       // used in no-video path
  const [pageReady, setPageReady] = useState(false);   // page becomes visible

  // Headline form
  const [hlCaption, setHlCaption] = useState("");
  const [hlFile, setHlFile] = useState(null);
  const [hlPreview, setHlPreview] = useState("");

  // Countdown form
  const [cdName, setCdName] = useState("");
  const [cdDate, setCdDate] = useState("");
  const [cdTime, setCdTime] = useState("");

  // ── Firebase subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub1 = onValue(ref(db, `${PATHS.globalSettings}/backgroundVideo`), snap => {
      if (snap.val()) setVideoInput(snap.val());
    });

    const unsub2 = onValue(ref(db, `${PATHS.globalSettings}/headlines`), snap => {
      const d = snap.val();
      const list = d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : [];
      setHeadlines(list);
      // Preload headline images
      preloadImages(list.map(h => h.imageUrl)).then(() => setHeadlinesReady(true));
    });

    const unsub3 = onValue(ref(db, `${PATHS.globalSettings}/countdowns`), snap => {
      const d = snap.val();
      setCountdowns(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
      setCountdownsReady(true);
    });

    // League icons — read from localStorage cache first, then Firebase
    const cachedIcons = (() => {
      try { return JSON.parse(localStorage.getItem("careerLeagueImages") || "{}"); } catch { return {}; }
    })();

    const unsub4 = onValue(ref(db, `${PATHS.globalSettings}/leagueImages`), snap => {
      const data = snap.val() || {};
      const merged = { ...cachedIcons, ...data };
      // Save updated cache
      try { localStorage.setItem("careerLeagueImages", JSON.stringify(merged)); } catch {}
      // Preload all league icon images
      preloadImages(Object.values(merged)).then(() => setLeagueIconsReady(true));
      // If Firebase has no icons at all, still mark ready
      if (!Object.keys(merged).length) setLeagueIconsReady(true);
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  // ── Gate: all four sources ready → signal dataReady ───────────────────────
  useEffect(() => {
    if (headlinesReady && countdownsReady && leagueIconsReady && postsReady) {
      setDataReady(true);
    }
  }, [headlinesReady, countdownsReady, leagueIconsReady, postsReady]);

  // ── No-video path: fade out spinner then reveal page ─────────────────────
  useEffect(() => {
    if (!dataReady || loadingVideoUrl) return;
    setFadeOut(true);
    setTimeout(() => setPageReady(true), 420);
  }, [dataReady, loadingVideoUrl]);

  // ── Video path: LoadingSpinner handles its own fade via dataReady prop,
  //    we just need to reveal the page after its opacity transition (0.5s) ──
  useEffect(() => {
    if (!dataReady || !loadingVideoUrl) return;
    // Wait for video loop boundary (~0.5s poll) + fade (0.5s) + small buffer
    const id = setTimeout(() => setPageReady(true), 1200);
    return () => clearTimeout(id);
  }, [dataReady, loadingVideoUrl]);

  // ── Admin handlers ─────────────────────────────────────────────────────────
  async function handleSaveVideo() {
    setSaving(true);
    await set(ref(db, `${PATHS.globalSettings}/backgroundVideo`), videoInput.trim());
    setSaving(false);
    setVideoModalOpen(false);
  }

  async function handleAddHeadline() {
    if (!hlFile && !hlPreview) return;
    setSaving(true);
    let imageUrl = hlPreview;
    if (hlFile) imageUrl = await uploadToImgBB(hlFile);
    await push(ref(db, `${PATHS.globalSettings}/headlines`), { imageUrl, caption: hlCaption, createdAt: Date.now() });
    setHlCaption(""); setHlFile(null); setHlPreview(""); setSaving(false);
  }

  async function handleDeleteHeadline(id) {
    await remove(ref(db, `${PATHS.globalSettings}/headlines/${id}`));
  }

  async function handleAddCountdown() {
    if (!cdName || !cdDate) return;
    setSaving(true);
    const target = new Date(`${cdDate}T${cdTime || "00:00"}`).getTime();
    await push(ref(db, `${PATHS.globalSettings}/countdowns`), { name: cdName, target, createdAt: Date.now() });
    setCdName(""); setCdDate(""); setCdTime(""); setSaving(false);
  }

  async function handleDeleteCountdown(id) {
    await remove(ref(db, `${PATHS.globalSettings}/countdowns/${id}`));
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.4)",
    borderRadius: "12px", color: "#fff",
    fontFamily: "inherit", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box", marginBottom: "12px",
  };

  const btnStyle = () => ({
    background: "rgba(255,20,147,0.15)",
    border: "1px solid rgba(255,20,147,0.4)",
    color: "#fff", padding: "10px 20px",
    borderRadius: "30px", cursor: "pointer",
    fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit",
  });

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />

      {/* Spinner — always mounted until pageReady, passes dataReady for video timing */}
      {!pageReady && (
        <LoadingSpinner fadeOut={fadeOut} dataReady={dataReady} />
      )}

      {/* Page — hidden until fully ready */}
      <div style={{ visibility: pageReady ? "visible" : "hidden" }}>
        <Navbar />

        {/* Sticky headline + countdown header */}
        <div style={{
          position: "sticky", top: "128px", zIndex: 400,
          background: "rgba(0,0,20,0.6)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,20,147,0.15)",
        }}>
          <HeadlineSlideshow headlines={headlines} />
          <CountdownSlideshow countdowns={countdowns} />
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", padding: "16px 16px 8px", flexWrap: "wrap" }}>
            <button onClick={() => setVideoModalOpen(true)} style={btnStyle()}>Background Video</button>
            <button onClick={() => setHeadlineModalOpen(true)} style={btnStyle()}>Headlines</button>
            <button onClick={() => setCountdownModalOpen(true)} style={btnStyle()}>Countdowns</button>
          </div>
        )}

        <Feed onInitialLoaded={() => setPostsReady(true)} />
        <BottomNavBar />
      </div>

      {/* ── Modals ── */}
      <Modal active={videoModalOpen} onClose={() => setVideoModalOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "8px" }}>Background Video</h3>
        <input value={videoInput} onChange={e => setVideoInput(e.target.value)} placeholder="Paste video URL" style={inputStyle} />
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSaveVideo} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving..." : "Save"}</button>
          <button onClick={() => setVideoModalOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>

      <Modal active={headlineModalOpen} onClose={() => setHeadlineModalOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px" }}>Manage Headlines</h3>
        <input value={hlCaption} onChange={e => setHlCaption(e.target.value)} placeholder="Caption" style={inputStyle} />
        {hlPreview && <img src={hlPreview} alt="" style={{ width: "100%", borderRadius: "12px", marginBottom: "12px", maxHeight: "200px", objectFit: "cover" }} />}
        <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (!f) return; setHlFile(f); const r = new FileReader(); r.onload = ev => setHlPreview(ev.target.result); r.readAsDataURL(f); }} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "12px", display: "block" }} />
        <button onClick={handleAddHeadline} disabled={saving} style={{ width: "100%", padding: "12px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", marginBottom: "20px" }}>{saving ? "Uploading..." : "Add Headline"}</button>
        <div style={{ maxHeight: "250px", overflowY: "auto" }}>
          {headlines.map(h => (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "rgba(255,20,147,0.06)", borderRadius: "12px", marginBottom: "8px" }}>
              <img src={h.imageUrl} alt="" style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "8px" }} />
              <span style={{ color: "#fff", flex: 1, fontSize: "0.85rem" }}>{h.caption || "No caption"}</span>
              <button onClick={() => handleDeleteHeadline(h.id)} style={{ background: "rgba(255,0,0,0.2)", border: "none", color: "#ff6b6b", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>Delete</button>
            </div>
          ))}
        </div>
      </Modal>

      <Modal active={countdownModalOpen} onClose={() => setCountdownModalOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px" }}>Manage Countdowns</h3>
        <input value={cdName} onChange={e => setCdName(e.target.value)} placeholder="Countdown name" style={inputStyle} />
        <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Target Date</label>
        <input type="date" value={cdDate} onChange={e => setCdDate(e.target.value)} style={inputStyle} />
        <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Target Time (optional)</label>
        <input type="time" value={cdTime} onChange={e => setCdTime(e.target.value)} style={inputStyle} />
        <button onClick={handleAddCountdown} disabled={saving} style={{ width: "100%", padding: "12px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", marginBottom: "20px" }}>{saving ? "Adding..." : "Add Countdown"}</button>
        <div style={{ maxHeight: "250px", overflowY: "auto" }}>
          {countdowns.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,20,147,0.06)", borderRadius: "12px", marginBottom: "8px" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700 }}>{c.name}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{new Date(c.target).toLocaleString()}</div>
              </div>
              <button onClick={() => handleDeleteCountdown(c.id)} style={{ background: "rgba(255,0,0,0.2)", border: "none", color: "#ff6b6b", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>Delete</button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
