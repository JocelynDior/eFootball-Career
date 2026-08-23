import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import { useAdmin } from "../context/AdminContext";
import { db } from "../firebase";
import { ref, onValue, push, update, remove } from "firebase/database";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

// ── WhatsApp-style audio player ──────────────────────────────────────────
function AudioPlayer({ url, index }) {
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
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setError(true));
    }
  }

  function handleRewind() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  }

  function handleSeek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * duration;
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // Generate waveform bars
  const bars = Array.from({ length: 30 }, (_, i) => {
    const heights = [0.3, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7, 0.5, 1.0, 0.6, 0.4, 0.8, 0.5, 0.7, 0.3, 0.9, 0.5, 0.6, 0.8, 0.4, 0.7, 0.5, 0.9, 0.3, 0.6, 0.8, 0.4, 0.5, 0.7, 0.6];
    return heights[i % heights.length];
  });
  const filledBars = Math.floor((progress / 100) * 30);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      background: "rgba(255,20,147,0.08)",
      border: "1px solid rgba(255,20,147,0.2)",
      borderRadius: "24px",
      padding: "14px 18px",
      marginTop: "10px",
    }}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        disabled={error}
        style={{
          width: "48px", height: "48px", borderRadius: "50%",
          background: error ? "rgba(255,80,80,0.2)" : "linear-gradient(135deg, #FF1493, #ff69b4)",
          border: "none", cursor: error ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem", flexShrink: 0,
          boxShadow: "0 4px 16px rgba(255,20,147,0.4)",
          transition: "transform 0.15s",
        }}
        onMouseOver={e => { if (!error) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
      >
        {loading ? "⏳" : error ? "⚠️" : playing ? "⏸" : "▶"}
      </button>

      {/* Rewind 10s */}
      <button
        onClick={handleRewind}
        disabled={error}
        style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,20,147,0.25)",
          cursor: error ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.85rem", color: "#fff", flexShrink: 0,
          transition: "all 0.15s",
        }}
        onMouseOver={e => { if (!error) e.currentTarget.style.background = "rgba(255,20,147,0.2)"; }}
        onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
        title="Rewind 10 seconds"
      >
        ↩10
      </button>

      {/* Waveform + progress */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          onClick={handleSeek}
          style={{
            display: "flex", alignItems: "center", gap: "2px",
            height: "36px", cursor: "pointer", padding: "4px 0",
          }}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 100}%`,
                borderRadius: "2px",
                background: i < filledBars
                  ? "linear-gradient(to top, #FF1493, #ff69b4)"
                  : "rgba(255,255,255,0.2)",
                transition: "background 0.1s",
                minHeight: "3px",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
            {formatTime(currentTime)}
          </span>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Mic icon */}
      <div style={{ color: "rgba(255,20,147,0.6)", fontSize: "1.1rem", flexShrink: 0 }}>🎙️</div>
    </div>
  );
}

// ── Admin: Add/Edit Rule Modal ──────────────────────────────────────────
function RuleModal({ existing, onClose }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [audioLinks, setAudioLinks] = useState(existing?.audioLinks || [""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addAudioField() {
    setAudioLinks(prev => [...prev, ""]);
  }

  function removeAudioField(i) {
    setAudioLinks(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateAudioField(i, val) {
    setAudioLinks(prev => prev.map((v, idx) => idx === i ? val : v));
  }

  async function handleSave() {
    if (!title.trim()) { setError("Please enter a rule title."); return; }
    const links = audioLinks.map(l => l.trim()).filter(Boolean);
    if (links.length === 0) { setError("Please add at least one audio link."); return; }

    setSaving(true);
    setError("");
    try {
      const data = {
        title: title.trim(),
        audioLinks: links,
        updatedAt: Date.now(),
      };
      if (existing?.id) {
        await update(ref(db, `career_rules/${existing.id}`), data);
      } else {
        data.createdAt = Date.now();
        await push(ref(db, "career_rules"), data);
      }
      onClose();
    } catch (e) {
      setError("Failed to save: " + e.message);
    }
    setSaving(false);
  }

  const inputStyle = {
    width: "100%", padding: "16px 20px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.35)",
    borderRadius: "14px", color: "#fff",
    fontFamily: "inherit", fontSize: "1.1rem",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "540px", width: "100%", position: "relative", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>

        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px", marginBottom: "24px" }}>
          {existing ? "✏️ EDIT RULE" : "➕ ADD RULE"}
        </h3>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, display: "block", marginBottom: "8px" }}>Rule Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Transfer Rules, Match Conduct..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, display: "block", marginBottom: "12px" }}>
            Audio Links
          </label>
          {audioLinks.map((link, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input
                value={link}
                onChange={e => updateAudioField(i, e.target.value)}
                placeholder={`Audio URL ${i + 1} (direct mp3/wav/ogg link)`}
                style={{ ...inputStyle, flex: 1 }}
              />
              {audioLinks.length > 1 && (
                <button
                  onClick={() => removeAudioField(i)}
                  style={{ padding: "0 16px", background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: "12px", color: "#ff6b6b", cursor: "pointer", fontSize: "1.1rem", flexShrink: 0 }}
                >🗑️</button>
              )}
            </div>
          ))}
          <button
            onClick={addAudioField}
            style={{ width: "100%", padding: "12px", background: "rgba(255,20,147,0.1)", border: "1px dashed rgba(255,20,147,0.4)", borderRadius: "12px", color: "#FF1493", cursor: "pointer", fontWeight: 600, fontSize: "1rem", marginTop: "4px" }}
          >
            + Add Another Audio
          </button>
        </div>

        {error && <div style={{ color: "#ff6b6b", fontSize: "0.95rem", marginBottom: "14px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, padding: "16px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : "💾 Save Rule"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function RulesAndTutorialsPage() {
  const { isAdmin } = useAdmin();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "career_rules"), snap => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data)
          .map(([id, r]) => ({ id, ...r }))
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setRules(arr);
      } else {
        setRules([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleDelete(id) {
    try {
      await remove(ref(db, `career_rules/${id}`));
      setDeleteId(null);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      <div style={{ padding: "32px 20px 100px", maxWidth: "860px", margin: "0 auto" }}>

        {/* Page Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>📋</div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(2.8rem, 8vw, 4.5rem)",
            color: "#fff",
            letterSpacing: "6px",
            margin: "0 0 10px",
            textShadow: "0 0 30px rgba(255,20,147,0.4)",
          }}>RULES & TUTORIALS</h1>
          <div style={{ height: "3px", width: "80px", background: "linear-gradient(to right, #FF1493, transparent)", margin: "0 auto 12px" }} />
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", margin: 0 }}>
            Official league rules and tutorials set by the admin
          </p>
        </div>

        {/* Admin Add Button */}
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
            <button
              onClick={() => { setEditRule(null); setShowModal(true); }}
              style={{
                padding: "14px 28px",
                background: "linear-gradient(135deg, #FF1493, #ff69b4)",
                border: "none", borderRadius: "14px",
                color: "#fff", fontWeight: 700, fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(255,20,147,0.4)",
                transition: "transform 0.15s",
              }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              ➕ Add Rule
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px" }}>Loading...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && rules.length === 0 && (
          <div style={{ ...GLASS, borderRadius: "24px", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📭</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "rgba(255,255,255,0.4)", letterSpacing: "3px" }}>
              {isAdmin ? "No Rules Yet — Add One Above" : "No Rules Published Yet"}
            </div>
          </div>
        )}

        {/* Rules List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {rules.map((rule, rIdx) => (
            <div
              key={rule.id}
              style={{
                ...GLASS,
                borderRadius: "22px",
                padding: "28px 32px",
                animation: `fadeSlideIn 0.4s ease ${rIdx * 0.05}s both`,
              }}
            >
              {/* Rule header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(255,20,147,0.3), rgba(255,20,147,0.1))",
                    border: "1px solid rgba(255,20,147,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem",
                    color: "#FF1493", flexShrink: 0,
                  }}>
                    {rIdx + 1}
                  </div>
                  <h2 style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "1.8rem", color: "#fff",
                    letterSpacing: "2px", margin: 0,
                    lineHeight: 1.2,
                  }}>
                    {rule.title}
                  </h2>
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => { setEditRule(rule); setShowModal(true); }}
                      style={{ padding: "8px 16px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "10px", color: "#FF1493", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700 }}
                    >✏️ Edit</button>
                    <button
                      onClick={() => setDeleteId(rule.id)}
                      style={{ padding: "8px 16px", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: "10px", color: "#ff6b6b", cursor: "pointer", fontSize: "0.9rem" }}
                    >🗑️</button>
                  </div>
                )}
              </div>

              {/* Audio count badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.25)",
                borderRadius: "20px", padding: "4px 14px", marginBottom: "14px",
              }}>
                <span style={{ fontSize: "0.8rem" }}>🎙️</span>
                <span style={{ color: "#FF1493", fontSize: "0.8rem", fontWeight: 700 }}>
                  {rule.audioLinks?.length || 0} Audio {(rule.audioLinks?.length || 0) === 1 ? "Note" : "Notes"}
                </span>
              </div>

              {/* Audio players */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(rule.audioLinks || []).map((url, aIdx) => (
                  <div key={aIdx}>
                    {rule.audioLinks.length > 1 && (
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Part {aIdx + 1}
                      </div>
                    )}
                    <AudioPlayer url={url} index={`${rule.id}-${aIdx}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <RuleModal
          existing={editRule}
          onClose={() => { setShowModal(false); setEditRule(null); }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "40px", maxWidth: "420px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⚠️</div>
            <h3 style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginBottom: "12px", letterSpacing: "2px" }}>DELETE RULE?</h3>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "28px" }}>This will permanently remove the rule and all its audio notes.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "14px", background: "rgba(255,80,80,0.2)", border: "1px solid rgba(255,80,80,0.4)", borderRadius: "14px", color: "#ff6b6b", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}>Delete</button>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1rem" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
