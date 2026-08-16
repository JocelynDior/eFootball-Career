import { useState, useEffect, useRef } from "react";

function useCountdown(target) {
  const [parts, setParts] = useState({ d: "00", h: "00", m: "00", s: "00" });

  useEffect(() => {
    function update() {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setParts({
        d: String(d).padStart(2, "0"),
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0")
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  return parts;
}

function SingleCountdown({ countdown }) {
  const { d, h, m, s } = useCountdown(countdown.target);
  const units = [
    { label: "D", val: d },
    { label: "H", val: h },
    { label: "M", val: m },
    { label: "S", val: s }
  ];

  return (
    <div style={{ textAlign: "center", padding: "16px" }}>
      <div style={{
        color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "1.3rem", letterSpacing: "3px", marginBottom: "16px",
        textShadow: "0 0 20px rgba(255,20,147,0.5)"
      }}>{countdown.name}</div>
      <div style={{
        display: "flex", justifyContent: "center",
        gap: "10px", flexWrap: "nowrap", padding: "0 16px"
      }}>
        {units.map(({ label, val }) => (
          <div key={label} style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: "6px", flex: "0 0 auto"
          }}>
            <div style={{
              width: "68px", height: "68px", borderRadius: "50%",
              background: "#FF1493",
              boxShadow: "0 0 18px rgba(255,20,147,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{
                color: "#000033", fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "1.7rem", fontWeight: 900, lineHeight: 1
              }}>{val}</span>
            </div>
            <span style={{
              color: "rgba(255,255,255,0.6)", fontSize: "0.65rem",
              fontWeight: 700, letterSpacing: "2px"
            }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CountdownSlideshow({ countdowns }) {
  const [idx, setIdx] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (countdowns.length <= 1 || paused) return;
    const id = setInterval(() => {
      setFlipping(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % countdowns.length);
        setFlipping(false);
      }, 400);
    }, 3000);
    return () => clearInterval(id);
  }, [countdowns, paused, idx]);

  if (!countdowns.length) return null;

  return (
    <div
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      style={{ userSelect: "none" }}
    >
      <div style={{
        opacity: flipping ? 0 : 1,
        transform: flipping ? "rotateX(90deg) scale(0.95)" : "rotateX(0deg) scale(1)",
        transition: "all 0.4s ease"
      }}>
        <SingleCountdown countdown={countdowns[idx]} />
      </div>
      {countdowns.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", paddingBottom: "12px" }}>
          {countdowns.map((_, i) => (
            <span key={i} onClick={() => setIdx(i)} style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: i === idx ? "#FF1493" : "rgba(255,255,255,0.3)",
              cursor: "pointer", display: "block", transition: "all 0.3s"
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
