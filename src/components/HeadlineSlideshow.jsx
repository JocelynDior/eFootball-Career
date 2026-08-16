import { useState, useEffect, useRef } from "react";

export default function HeadlineSlideshow({ headlines }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sliding, setSliding] = useState(false);
  const intervalRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (!headlines.length || paused) return;
    intervalRef.current = setInterval(() => goNext(), 4000);
    return () => clearInterval(intervalRef.current);
  }, [headlines, paused, idx]);

  function goNext() {
    setSliding(true);
    setTimeout(() => { setIdx(i => (i + 1) % headlines.length); setSliding(false); }, 300);
  }

  function goPrev() {
    setSliding(true);
    setTimeout(() => { setIdx(i => (i - 1 + headlines.length) % headlines.length); setSliding(false); }, 300);
  }

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX; setPaused(true); }
  function handleTouchEnd(e) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
    setPaused(false);
  }

  if (!headlines.length) return null;

  const h = headlines[idx];

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden", userSelect: "none" }}
      onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div style={{
        position: "relative", width: "100%", aspectRatio: "16/7",
        opacity: sliding ? 0 : 1,
        transform: sliding ? "translateX(30px)" : "translateX(0)",
        transition: "all 0.3s ease"
      }}>
        <img src={h.imageUrl} alt={h.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

        {/* Left fade */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "80px", height: "100%", background: "linear-gradient(to right, rgba(0,0,20,0.8), transparent)", pointerEvents: "none" }} />
        {/* Right fade */}
        <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "100%", background: "linear-gradient(to left, rgba(0,0,20,0.8), transparent)", pointerEvents: "none" }} />
        {/* Bottom fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to top, rgba(0,0,20,0.7), transparent)", pointerEvents: "none" }} />

        {h.caption && (
          <div style={{
            position: "absolute", bottom: "16px", left: "16px",
            color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "1.8rem", letterSpacing: "2px", lineHeight: 1.1,
            textShadow: "0 2px 12px rgba(0,0,0,0.8)", maxWidth: "80%"
          }}>{h.caption}</div>
        )}

        {headlines.length > 1 && (
          <div style={{ position: "absolute", bottom: "8px", right: "12px", display: "flex", gap: "6px" }}>
            {headlines.map((_, i) => (
              <span key={i} onClick={() => setIdx(i)} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i === idx ? "#FF1493" : "rgba(255,255,255,0.4)", cursor: "pointer", display: "block" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
