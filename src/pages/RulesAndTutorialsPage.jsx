import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import { useAdmin } from "../context/AdminContext";
import { db } from "../firebase";
import { ref, onValue, push, update, remove, set } from "firebase/database";

// ── Design tokens ──────────────────────────────────────────────────────────
const PINK = "#FF1493";
const PINK_DIM = "rgba(255,20,147,0.18)";
const PINK_BORDER = "rgba(255,20,147,0.28)";
const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: `1px solid rgba(255,20,147,0.28)`,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function getEmbedUrl(url) {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
  return url;
}
function getThumbnail(url) {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null;
}

// ── Audio Player ───────────────────────────────────────────────────────────
function AudioPlayer({ url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => { setDuration(audio.duration); setLoading(false); };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    const onError = () => { setError(true); setLoading(false); };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [url]);

  const bars = [0.3,0.5,0.8,0.6,0.9,0.4,0.7,0.5,1.0,0.6,0.4,0.8,0.5,0.7,0.3,0.9,0.5,0.6,0.8,0.4,0.7,0.5,0.9,0.3,0.6,0.8,0.4,0.5,0.7,0.6];
  const filledBars = Math.floor((progress / 100) * 30);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else audio.play().then(() => setPlaying(true)).catch(() => setError(true));
  }
  function handleRewind() {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
  }
  function handleSeek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }
  function fmt(s) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  }

  return (
    <div style={{ display:"flex", alignItems:"center", gap:"12px", background:"rgba(255,20,147,0.07)", border:`1px solid ${PINK_BORDER}`, borderRadius:"24px", padding:"14px 18px", marginTop:"12px" }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={togglePlay} disabled={error} style={{ width:"48px", height:"48px", borderRadius:"50%", background: error ? "rgba(255,80,80,0.2)" : `linear-gradient(135deg, ${PINK}, #ff69b4)`, border:"none", cursor: error ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem", flexShrink:0, boxShadow:`0 4px 16px rgba(255,20,147,0.35)` }}>
        {loading ? "⏳" : error ? "⚠️" : playing ? "⏸" : "▶"}
      </button>
      <button onClick={handleRewind} disabled={error} style={{ width:"36px", height:"36px", borderRadius:"50%", background:"rgba(255,255,255,0.07)", border:`1px solid ${PINK_BORDER}`, cursor: error ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.8rem", color:"#fff", flexShrink:0 }} title="Rewind 10s">↩10</button>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"6px" }}>
        <div onClick={handleSeek} style={{ display:"flex", alignItems:"center", gap:"2px", height:"36px", cursor:"pointer", padding:"4px 0" }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex:1, height:`${h*100}%`, borderRadius:"2px", background: i < filledBars ? `linear-gradient(to top, ${PINK}, #ff69b4)` : "rgba(255,255,255,0.18)", minHeight:"3px" }} />
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.73rem" }}>{fmt(currentTime)}</span>
          <span style={{ color:"rgba(255,255,255,0.3)", fontSize:"0.73rem" }}>{fmt(duration)}</span>
        </div>
      </div>
      <div style={{ color:"rgba(255,20,147,0.6)", fontSize:"1.1rem", flexShrink:0 }}>🎙️</div>
    </div>
  );
}

// ── Hero Video Banner ──────────────────────────────────────────────────────
function HeroBanner({ isAdmin }) {
  const [videoUrl, setVideoUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const thumb = getThumbnail(videoUrl);
  const yt = !!getYouTubeId(videoUrl);

  useEffect(() => {
    const unsub = onValue(ref(db, "career_rules_hero"), snap => {
      const val = snap.val();
      if (val) setVideoUrl(val);
    });
    return () => unsub();
  }, []);

  async function saveUrl() {
    if (!draft.trim()) return;
    setSaving(true);
    await set(ref(db, "career_rules_hero"), draft.trim());
    setEditing(false);
    setPlaying(false);
    setSaving(false);
  }

  return (
    <div style={{ position:"relative", width:"100%", overflow:"hidden", marginBottom:"32px" }}>
      <div style={{ position:"relative", width:"100%", aspectRatio:"16/7", background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center" }}>

        {!playing && videoUrl && (
          <>
            {thumb ? (
              <img src={thumb} alt="banner" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.6 }} />
            ) : (
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(255,20,147,0.12), rgba(0,0,0,0.8))" }} />
            )}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%)", pointerEvents:"none" }} />
            <button onClick={() => setPlaying(true)} style={{ position:"relative", zIndex:2, width:"80px", height:"80px", borderRadius:"50%", background:`linear-gradient(135deg, ${PINK}, #ff69b4)`, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem", boxShadow:`0 0 40px rgba(255,20,147,0.6), 0 0 80px rgba(255,20,147,0.2)`, transition:"transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.1)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>▶</button>
            <div style={{ position:"absolute", bottom:"20px", left:"24px", zIndex:2 }}>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.75rem", letterSpacing:"2px", textTransform:"uppercase", fontWeight:700, marginBottom:"4px" }}>Now Playing</div>
              <div style={{ color:"#fff", fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.6rem", letterSpacing:"3px", textShadow:"0 2px 12px rgba(0,0,0,0.8)" }}>LEAGUE ANNOUNCEMENT</div>
            </div>
          </>
        )}

        {!playing && !videoUrl && (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize:"3rem", marginBottom:"8px" }}>🎬</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.4rem", letterSpacing:"3px" }}>No Banner Video Set</div>
          </div>
        )}

        {playing && videoUrl && (
          <>
            {yt ? (
              <iframe src={getEmbedUrl(videoUrl)} style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none" }} allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <video autoPlay controls style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}>
                <source src={videoUrl} type="video/mp4" />
              </video>
            )}
            <button onClick={() => setPlaying(false)} style={{ position:"absolute", top:"12px", right:"12px", zIndex:10, background:"rgba(0,0,0,0.6)", border:"none", color:"#fff", borderRadius:"50%", width:"36px", height:"36px", cursor:"pointer", fontSize:"1rem", backdropFilter:"blur(8px)" }}>✕</button>
          </>
        )}
      </div>

      {isAdmin && !playing && (
        <button onClick={() => { setDraft(videoUrl); setEditing(true); }} style={{ position:"absolute", top:"12px", right:"12px", background:"rgba(0,0,0,0.55)", border:`1px solid ${PINK_BORDER}`, borderRadius:"10px", color:PINK, padding:"6px 14px", cursor:"pointer", fontSize:"0.82rem", fontWeight:700, backdropFilter:"blur(8px)", zIndex:5 }}>
          ✏️ Edit Banner URL
        </button>
      )}

      {editing && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={() => setEditing(false)}>
          <div style={{ ...GLASS, borderRadius:"20px", padding:"32px", maxWidth:"500px", width:"100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color:PINK, fontFamily:"'Bebas Neue', sans-serif", fontSize:"2rem", letterSpacing:"3px", marginBottom:"20px" }}>🎬 BANNER VIDEO URL</h3>
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="YouTube URL or direct MP4 link" style={{ width:"100%", padding:"14px 18px", background:"rgba(255,255,255,0.06)", border:`1px solid ${PINK_BORDER}`, borderRadius:"12px", color:"#fff", fontSize:"1rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:"20px" }} />
            <div style={{ display:"flex", gap:"12px" }}>
              <button onClick={saveUrl} disabled={saving} style={{ flex:1, padding:"14px", background:PINK, border:"none", borderRadius:"12px", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:"1rem" }}>{saving ? "Saving..." : "💾 Save"}</button>
              <button onClick={() => setEditing(false)} style={{ flex:1, padding:"14px", background:"rgba(255,255,255,0.06)", border:`1px solid ${PINK_BORDER}`, borderRadius:"12px", color:"#fff", cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rule Card ──────────────────────────────────────────────────────────────
function RuleCard({ rule, index, isAdmin, onEdit, onDelete }) {
  const hasAudio = rule.audioUrl && rule.audioUrl.trim();
  const hasText = rule.text && rule.text.trim();
  const hasBoth = hasAudio && hasText;
  const [view, setView] = useState(hasAudio ? "audio" : "text");

  return (
    <div style={{ ...GLASS, borderRadius:"20px", padding:"28px 28px 24px", animation:`fadeUp 0.4s ease ${index * 0.06}s both` }}>
      <div style={{ textAlign:"center", marginBottom:"18px" }}>
        <h2 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"2rem", color:PINK, letterSpacing:"3px", margin:0, textShadow:`0 0 20px rgba(255,20,147,0.4)` }}>{rule.title}</h2>
        <div style={{ height:"2px", width:"60px", background:`linear-gradient(to right, transparent, ${PINK}, transparent)`, margin:"8px auto 0" }} />
      </div>

      {hasBoth && (
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"16px" }}>
          <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:"30px", padding:"4px", border:`1px solid ${PINK_BORDER}` }}>
            {[{key:"audio",label:"🎙️ Audio"},{key:"text",label:"📝 Text"}].map(({key,label}) => (
              <button key={key} onClick={() => setView(key)} style={{ padding:"8px 20px", borderRadius:"26px", border:"none", cursor:"pointer", fontWeight:700, fontSize:"0.85rem", transition:"all 0.2s", background: view===key ? PINK : "transparent", color: view===key ? "#fff" : "rgba(255,255,255,0.45)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(!hasBoth || view === "audio") && hasAudio && <AudioPlayer url={rule.audioUrl} />}
      {(!hasBoth || view === "text") && hasText && (
        <div style={{ background:"rgba(255,20,147,0.05)", border:`1px solid ${PINK_BORDER}`, borderRadius:"14px", padding:"18px 20px", marginTop: hasBoth ? 0 : "12px" }}>
          <p style={{ color:"rgba(255,255,255,0.82)", margin:0, lineHeight:1.7, fontSize:"0.97rem", whiteSpace:"pre-wrap" }}>{rule.text}</p>
        </div>
      )}

      {isAdmin && (
        <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px" }}>
          <button onClick={() => onEdit(rule)} style={{ padding:"7px 16px", background:PINK_DIM, border:`1px solid ${PINK_BORDER}`, borderRadius:"10px", color:PINK, cursor:"pointer", fontSize:"0.85rem", fontWeight:700 }}>✏️ Edit</button>
          <button onClick={() => onDelete(rule.id)} style={{ padding:"7px 16px", background:"rgba(255,80,80,0.1)", border:"1px solid rgba(255,80,80,0.25)", borderRadius:"10px", color:"#ff6b6b", cursor:"pointer", fontSize:"0.85rem" }}>🗑️</button>
        </div>
      )}
    </div>
  );
}

// ── Rule Modal ─────────────────────────────────────────────────────────────
function RuleModal({ existing, onClose }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [audioUrl, setAudioUrl] = useState(existing?.audioUrl || "");
  const [text, setText] = useState(existing?.text || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = { width:"100%", padding:"14px 18px", background:"rgba(255,255,255,0.05)", border:`1px solid ${PINK_BORDER}`, borderRadius:"12px", color:"#fff", fontFamily:"inherit", fontSize:"1rem", outline:"none", boxSizing:"border-box" };

  async function handleSave() {
    if (!title.trim()) { setError("Please enter a title."); return; }
    if (!audioUrl.trim() && !text.trim()) { setError("Provide either an audio URL or text content."); return; }
    setSaving(true); setError("");
    try {
      const data = { title: title.trim(), audioUrl: audioUrl.trim(), text: text.trim(), updatedAt: Date.now() };
      if (existing?.id) {
        await update(ref(db, `career_rules/${existing.id}`), data);
      } else {
        data.createdAt = Date.now();
        await push(ref(db, "career_rules"), data);
      }
      onClose();
    } catch (e) { setError("Failed to save: " + e.message); }
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={onClose}>
      <div style={{ ...GLASS, borderRadius:"22px", padding:"36px", maxWidth:"520px", width:"100%", maxHeight:"90vh", overflowY:"auto", position:"relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:"14px", right:"14px", background:"rgba(255,255,255,0.08)", border:"none", color:"#fff", borderRadius:"50%", width:"34px", height:"34px", cursor:"pointer", fontSize:"1rem" }}>✕</button>
        <h3 style={{ color:PINK, fontFamily:"'Bebas Neue', sans-serif", fontSize:"2.2rem", letterSpacing:"3px", marginBottom:"24px" }}>{existing ? "✏️ EDIT RULE" : "➕ ADD RULE"}</h3>

        <div style={{ marginBottom:"18px" }}>
          <label style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"1px", fontWeight:700, display:"block", marginBottom:"8px" }}>Rule Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Transfer Rules, Match Conduct..." style={inputStyle} />
        </div>
        <div style={{ marginBottom:"18px" }}>
          <label style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"1px", fontWeight:700, display:"block", marginBottom:"8px" }}>Audio URL (MP3/WAV) — optional</label>
          <input value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="Direct audio file link..." style={inputStyle} />
        </div>
        <div style={{ marginBottom:"8px" }}>
          <label style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"1px", fontWeight:700, display:"block", marginBottom:"8px" }}>Text Content — optional</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type the rule here..." rows={6} style={{ ...inputStyle, resize:"vertical", lineHeight:"1.6" }} />
        </div>
        <p style={{ color:"rgba(255,255,255,0.28)", fontSize:"0.8rem", marginBottom:"20px" }}>Provide audio, text, or both. If both, users can toggle between them.</p>

        {error && <div style={{ color:"#ff6b6b", background:"rgba(255,0,0,0.08)", borderRadius:"10px", padding:"12px", marginBottom:"16px", fontSize:"0.9rem" }}>{error}</div>}

        <div style={{ display:"flex", gap:"12px" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"14px", background:PINK, border:"none", borderRadius:"12px", color:"#fff", fontWeight:700, fontSize:"1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "💾 Save Rule"}</button>
          <button onClick={onClose} style={{ flex:1, padding:"14px", background:"rgba(255,255,255,0.05)", border:`1px solid ${PINK_BORDER}`, borderRadius:"12px", color:"#fff", cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Tutorial Card ──────────────────────────────────────────────────────────
function TutorialCard({ tutorial, isAdmin, onEdit, onDelete }) {
  const [playing, setPlaying] = useState(false);
  const thumb = getThumbnail(tutorial.videoUrl);
  const yt = !!getYouTubeId(tutorial.videoUrl);

  return (
    <div style={{ flexShrink:0, width:"220px", borderRadius:"18px", overflow:"hidden", ...GLASS, transition:"transform 0.2s", position:"relative" }} onMouseOver={e => e.currentTarget.style.transform="translateY(-4px)"} onMouseOut={e => e.currentTarget.style.transform="translateY(0)"}>
      <div style={{ position:"relative", width:"100%", aspectRatio:"9/16", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        {!playing && (
          <>
            {thumb ? (
              <img src={thumb} alt={tutorial.title} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.75 }} />
            ) : (
              <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg, rgba(255,20,147,0.15), rgba(0,0,0,0.9))` }} />
            )}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)", pointerEvents:"none" }} />
            <button onClick={() => setPlaying(true)} style={{ position:"relative", zIndex:2, width:"56px", height:"56px", borderRadius:"50%", background:`linear-gradient(135deg, ${PINK}, #ff69b4)`, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", boxShadow:`0 0 24px rgba(255,20,147,0.6)`, transition:"transform 0.15s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.1)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>▶</button>
          </>
        )}
        {playing && (
          <>
            {yt ? (
              <iframe src={getEmbedUrl(tutorial.videoUrl)} style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none" }} allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <video autoPlay controls style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}>
                <source src={tutorial.videoUrl} type="video/mp4" />
              </video>
            )}
            <button onClick={() => setPlaying(false)} style={{ position:"absolute", top:"8px", right:"8px", zIndex:10, background:"rgba(0,0,0,0.6)", border:"none", color:"#fff", borderRadius:"50%", width:"28px", height:"28px", cursor:"pointer", fontSize:"0.8rem" }}>✕</button>
          </>
        )}
      </div>
      <div style={{ padding:"12px 14px 8px" }}>
        <p style={{ color:"#fff", fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.1rem", letterSpacing:"1.5px", margin:0, lineHeight:1.2, textAlign:"center" }}>{tutorial.title}</p>
      </div>
      {isAdmin && (
        <div style={{ display:"flex", gap:"6px", padding:"0 10px 10px", justifyContent:"center" }}>
          <button onClick={() => onEdit(tutorial)} style={{ padding:"5px 12px", background:PINK_DIM, border:`1px solid ${PINK_BORDER}`, borderRadius:"8px", color:PINK, cursor:"pointer", fontSize:"0.75rem", fontWeight:700 }}>✏️</button>
          <button onClick={() => onDelete(tutorial.id)} style={{ padding:"5px 12px", background:"rgba(255,80,80,0.1)", border:"1px solid rgba(255,80,80,0.25)", borderRadius:"8px", color:"#ff6b6b", cursor:"pointer", fontSize:"0.75rem" }}>🗑️</button>
        </div>
      )}
    </div>
  );
}

// ── Tutorial Modal ─────────────────────────────────────────────────────────
function TutorialModal({ existing, onClose }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = { width:"100%", padding:"14px 18px", background:"rgba(255,255,255,0.05)", border:`1px solid ${PINK_BORDER}`, borderRadius:"12px", color:"#fff", fontFamily:"inherit", fontSize:"1rem", outline:"none", boxSizing:"border-box" };

  async function handleSave() {
    if (!title.trim()) { setError("Please enter a title."); return; }
    if (!videoUrl.trim()) { setError("Please enter a video URL."); return; }
    setSaving(true); setError("");
    try {
      const data = { title: title.trim(), videoUrl: videoUrl.trim(), updatedAt: Date.now() };
      if (existing?.id) {
        await update(ref(db, `career_tutorials/${existing.id}`), data);
      } else {
        data.createdAt = Date.now();
        await push(ref(db, "career_tutorials"), data);
      }
      onClose();
    } catch (e) { setError("Failed to save: " + e.message); }
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={onClose}>
      <div style={{ ...GLASS, borderRadius:"22px", padding:"36px", maxWidth:"480px", width:"100%", position:"relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:"14px", right:"14px", background:"rgba(255,255,255,0.08)", border:"none", color:"#fff", borderRadius:"50%", width:"34px", height:"34px", cursor:"pointer", fontSize:"1rem" }}>✕</button>
        <h3 style={{ color:PINK, fontFamily:"'Bebas Neue', sans-serif", fontSize:"2.2rem", letterSpacing:"3px", marginBottom:"24px" }}>{existing ? "✏️ EDIT TUTORIAL" : "➕ ADD TUTORIAL"}</h3>
        <div style={{ marginBottom:"18px" }}>
          <label style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"1px", fontWeight:700, display:"block", marginBottom:"8px" }}>Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. How to Submit Results" style={inputStyle} />
        </div>
        <div style={{ marginBottom:"20px" }}>
          <label style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"1px", fontWeight:700, display:"block", marginBottom:"8px" }}>Video URL *</label>
          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube URL or direct video link" style={inputStyle} />
        </div>
        {error && <div style={{ color:"#ff6b6b", background:"rgba(255,0,0,0.08)", borderRadius:"10px", padding:"12px", marginBottom:"16px", fontSize:"0.9rem" }}>{error}</div>}
        <div style={{ display:"flex", gap:"12px" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"14px", background:PINK, border:"none", borderRadius:"12px", color:"#fff", fontWeight:700, fontSize:"1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "💾 Save"}</button>
          <button onClick={onClose} style={{ flex:1, padding:"14px", background:"rgba(255,255,255,0.05)", border:`1px solid ${PINK_BORDER}`, borderRadius:"12px", color:"#fff", cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Dialog ──────────────────────────────────────────────────
function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ ...GLASS, borderRadius:"22px", padding:"40px", maxWidth:"380px", width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:"2.8rem", marginBottom:"14px" }}>⚠️</div>
        <h3 style={{ color:"#fff", fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.8rem", marginBottom:"10px", letterSpacing:"2px" }}>DELETE {label}?</h3>
        <p style={{ color:"rgba(255,255,255,0.45)", marginBottom:"24px", fontSize:"0.9rem" }}>This is permanent and cannot be undone.</p>
        <div style={{ display:"flex", gap:"12px" }}>
          <button onClick={onConfirm} style={{ flex:1, padding:"14px", background:"rgba(255,80,80,0.18)", border:"1px solid rgba(255,80,80,0.35)", borderRadius:"12px", color:"#ff6b6b", cursor:"pointer", fontWeight:700 }}>Delete</button>
          <button onClick={onCancel} style={{ flex:1, padding:"14px", background:"rgba(255,255,255,0.05)", border:`1px solid ${PINK_BORDER}`, borderRadius:"12px", color:"#fff", cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function RulesAndTutorialsPage() {
  const { isAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState("rules");
  const [rules, setRules] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingTutorials, setLoadingTutorials] = useState(true);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [deleteRuleId, setDeleteRuleId] = useState(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [editTutorial, setEditTutorial] = useState(null);
  const [deleteTutorialId, setDeleteTutorialId] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "career_rules"), snap => {
      const data = snap.val();
      setRules(data ? Object.entries(data).map(([id, r]) => ({ id, ...r })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)) : []);
      setLoadingRules(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "career_tutorials"), snap => {
      const data = snap.val();
      setTutorials(data ? Object.entries(data).map(([id, t]) => ({ id, ...t })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)) : []);
      setLoadingTutorials(false);
    });
    return () => unsub();
  }, []);

  async function deleteRule(id) {
    try { await remove(ref(db, `career_rules/${id}`)); setDeleteRuleId(null); } catch (e) { console.error(e); }
  }
  async function deleteTutorial(id) {
    try { await remove(ref(db, `career_tutorials/${id}`)); setDeleteTutorialId(null); } catch (e) { console.error(e); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"transparent", fontFamily:"'Inter', sans-serif", position:"relative" }}>
      <BackgroundVideo />
      <Navbar />

      <HeroBanner isAdmin={isAdmin} />

      <div style={{ padding:"0 20px 100px", maxWidth:"860px", margin:"0 auto" }}>

        {/* Heading */}
        <div style={{ textAlign:"center", marginBottom:"36px" }}>
          <h1 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"clamp(2.4rem, 7vw, 4rem)", color:"#fff", letterSpacing:"6px", margin:"0 0 8px", textShadow:`0 0 30px rgba(255,20,147,0.35)` }}>
            COMMUNITY REGULATIONS
          </h1>
          <div style={{ height:"3px", width:"100px", background:`linear-gradient(to right, transparent, ${PINK}, transparent)`, margin:"0 auto" }} />
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"32px" }}>
          <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:"40px", padding:"5px", border:`1px solid ${PINK_BORDER}`, gap:"4px" }}>
            {[{ key:"rules", label:"📋 Rules" }, { key:"tutorials", label:"🎬 Tutorials" }].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ padding:"12px 32px", borderRadius:"36px", border:"none", cursor:"pointer", fontWeight:700, fontSize:"0.95rem", fontFamily:"inherit", transition:"all 0.25s", background: activeTab === key ? PINK : "transparent", color: activeTab === key ? "#fff" : "rgba(255,255,255,0.4)", boxShadow: activeTab === key ? `0 4px 20px rgba(255,20,147,0.4)` : "none", letterSpacing:"0.5px" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RULES TAB ── */}
        {activeTab === "rules" && (
          <>
            {isAdmin && (
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"20px" }}>
                <button onClick={() => { setEditRule(null); setShowRuleModal(true); }} style={{ padding:"12px 24px", background:`linear-gradient(135deg, ${PINK}, #ff69b4)`, border:"none", borderRadius:"14px", color:"#fff", fontWeight:700, fontSize:"1rem", cursor:"pointer", boxShadow:`0 4px 20px rgba(255,20,147,0.4)`, transition:"transform 0.15s" }} onMouseOver={e => e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform="translateY(0)"}>
                  ➕ Add Rule
                </button>
              </div>
            )}
            {loadingRules && (
              <div style={{ textAlign:"center", padding:"60px", color:"rgba(255,255,255,0.3)", fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.8rem", letterSpacing:"3px" }}>LOADING...</div>
            )}
            {!loadingRules && rules.length === 0 && (
              <div style={{ ...GLASS, borderRadius:"20px", padding:"60px 40px", textAlign:"center" }}>
                <div style={{ fontSize:"3.5rem", marginBottom:"12px" }}>📭</div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.8rem", color:"rgba(255,255,255,0.3)", letterSpacing:"3px" }}>{isAdmin ? "No Rules Yet — Add One Above" : "No Rules Published Yet"}</div>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
              {rules.map((rule, i) => (
                <RuleCard key={rule.id} rule={rule} index={i} isAdmin={isAdmin}
                  onEdit={r => { setEditRule(r); setShowRuleModal(true); }}
                  onDelete={id => setDeleteRuleId(id)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── TUTORIALS TAB ── */}
        {activeTab === "tutorials" && (
          <>
            {isAdmin && (
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"20px" }}>
                <button onClick={() => { setEditTutorial(null); setShowTutorialModal(true); }} style={{ padding:"12px 24px", background:`linear-gradient(135deg, ${PINK}, #ff69b4)`, border:"none", borderRadius:"14px", color:"#fff", fontWeight:700, fontSize:"1rem", cursor:"pointer", boxShadow:`0 4px 20px rgba(255,20,147,0.4)`, transition:"transform 0.15s" }} onMouseOver={e => e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform="translateY(0)"}>
                  ➕ Add Tutorial
                </button>
              </div>
            )}
            {loadingTutorials && (
              <div style={{ textAlign:"center", padding:"60px", color:"rgba(255,255,255,0.3)", fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.8rem", letterSpacing:"3px" }}>LOADING...</div>
            )}
            {!loadingTutorials && tutorials.length === 0 && (
              <div style={{ ...GLASS, borderRadius:"20px", padding:"60px 40px", textAlign:"center" }}>
                <div style={{ fontSize:"3.5rem", marginBottom:"12px" }}>🎬</div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.8rem", color:"rgba(255,255,255,0.3)", letterSpacing:"3px" }}>{isAdmin ? "No Tutorials Yet — Add One Above" : "No Tutorials Published Yet"}</div>
              </div>
            )}
            {tutorials.length > 0 && (
              <>
                <p style={{ color:"rgba(255,255,255,0.3)", fontSize:"0.8rem", textAlign:"center", marginBottom:"16px", letterSpacing:"1px", textTransform:"uppercase" }}>← Swipe to explore →</p>
                <div style={{ display:"flex", gap:"16px", overflowX:"auto", paddingBottom:"16px", paddingLeft:"4px", paddingRight:"4px", scrollbarWidth:"thin", scrollbarColor:`${PINK} rgba(255,255,255,0.05)` }}>
                  {tutorials.map(t => (
                    <TutorialCard key={t.id} tutorial={t} isAdmin={isAdmin}
                      onEdit={tut => { setEditTutorial(tut); setShowTutorialModal(true); }}
                      onDelete={id => setDeleteTutorialId(id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showRuleModal && <RuleModal existing={editRule} onClose={() => { setShowRuleModal(false); setEditRule(null); }} />}
      {showTutorialModal && <TutorialModal existing={editTutorial} onClose={() => { setShowTutorialModal(false); setEditTutorial(null); }} />}
      {deleteRuleId && <ConfirmDelete label="RULE" onConfirm={() => deleteRule(deleteRuleId)} onCancel={() => setDeleteRuleId(null)} />}
      {deleteTutorialId && <ConfirmDelete label="TUTORIAL" onConfirm={() => deleteTutorial(deleteTutorialId)} onCancel={() => setDeleteTutorialId(null)} />}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { height: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,20,147,0.4); border-radius: 4px; }
      `}</style>
    </div>
  );
}
