import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function LeagueHeadlineSlideshow({ league }) {
  const [headlines, setHeadlines] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}_settings/headlines`), snap => {
      const d = snap.val();
      setHeadlines(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
      setIdx(0);
    });
    return () => unsub();
  }, [league]);

  // Auto-advance
  useEffect(() => {
    if (headlines.length < 2) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % headlines.length), 5000);
    return () => clearTimeout(t);
  }, [idx, headlines.length]);

  if (!headlines.length) return null;

  const current = headlines[idx];

  return (
    <div style={{ width: "100%", position: "relative", overflow: "hidden", marginBottom: "0" }}>
      <div style={{ width: "100%", aspectRatio: "16/6", position: "relative", transition: "all 0.5s ease" }}>
        <img
          src={current.imageUrl}
          alt={current.caption || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.5s ease" }}
          key={current.id}
        />
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
        {current.caption && (
          <div style={{ position: "absolute", bottom: "20px", left: "24px", right: "24px" }}>
            <p style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px", margin: 0, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{current.caption}</p>
          </div>
        )}
        {/* Dots */}
        {headlines.length > 1 && (
          <div style={{ position: "absolute", bottom: "12px", right: "20px", display: "flex", gap: "6px" }}>
            {headlines.map((_, i) => (
              <span key={i} onClick={() => setIdx(i)} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === idx ? "#FF1493" : "rgba(255,255,255,0.4)", display: "block", cursor: "pointer", transition: "background 0.3s" }} />
            ))}
          </div>
        )}
        {/* Left/right arrows */}
        {headlines.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + headlines.length) % headlines.length)} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "#FF1493", fontSize: "1.8rem", padding: "14px 10px", cursor: "pointer" }}>‹</button>
            <button onClick={() => setIdx(i => (i + 1) % headlines.length)} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "#FF1493", fontSize: "1.8rem", padding: "14px 10px", cursor: "pointer" }}>›</button>
          </>
        )}
      </div>
    </div>
  );
}
