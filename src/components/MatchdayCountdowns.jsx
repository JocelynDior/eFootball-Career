import { useState, useEffect } from "react";

// Get SAST midnight of today as a timestamp
function getSASTMidnightToday() {
  const now = new Date();
  // SAST = UTC+2
  const sastNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  // Midnight today SAST
  const midnightSAST = new Date(
    Date.UTC(
      sastNow.getUTCFullYear(),
      sastNow.getUTCMonth(),
      sastNow.getUTCDate(),
      0, 0, 0, 0
    ) - 2 * 60 * 60 * 1000 // convert back to UTC
  );
  return midnightSAST.getTime();
}

function useMatchdayCountdown(startMs, durationMs) {
  const [parts, setParts] = useState({ h: "48", m: "00", s: "00", total: durationMs });

  useEffect(() => {
    function tick() {
      const elapsed = Date.now() - startMs;
      // How far into the current cycle
      const cycleElapsed = elapsed % durationMs;
      const remaining = durationMs - cycleElapsed;
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setParts({
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
        total: remaining,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs, durationMs]);

  return parts;
}

function FlipDigit({ value, label }) {
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true);
      const t = setTimeout(() => {
        setPrev(value);
        setFlipping(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: 52, height: 64,
        background: "linear-gradient(180deg, rgba(20,0,40,0.95) 50%, rgba(10,0,20,0.95) 50%)",
        border: "1.5px solid rgba(255,20,147,0.5)",
        borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        boxShadow: "0 4px 16px rgba(255,20,147,0.2)",
      }}>
        {/* Top half */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%",
          background: "rgba(255,20,147,0.06)",
          borderBottom: "1px solid rgba(255,20,147,0.3)",
        }} />
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "2rem",
          color: "#FF1493",
          letterSpacing: 1,
          transform: flipping ? "rotateX(90deg)" : "rotateX(0deg)",
          transition: "transform 0.3s ease",
          display: "block",
          textShadow: "0 0 12px rgba(255,20,147,0.6)",
        }}>
          {value}
        </span>
      </div>
      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function CountdownCard({ title, startMs, durationMs, accent }) {
  const { h, m, s, total } = useMatchdayCountdown(startMs, durationMs);

  // Progress ring
  const pct = total / durationMs;
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;

  const urgencyColor = total < 3600000 ? "#ff4444" : total < 10800000 ? "#FFB347" : accent;

  return (
    <div style={{
      flex: 1,
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: `1px solid ${urgencyColor}33`,
      borderRadius: 24,
      padding: "20px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 14,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow bg */}
      <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 120, height: 120, borderRadius: "50%", background: `${urgencyColor}15`, filter: "blur(30px)", pointerEvents: "none" }} />

      {/* Title */}
      <div style={{ color: urgencyColor, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: 2, textAlign: "center", zIndex: 1 }}>
        {title}
      </div>

      {/* Flip digits */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, zIndex: 1 }}>
        <FlipDigit value={h} label="HRS" />
        <span style={{ color: urgencyColor, fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginBottom: 16, opacity: 0.7 }}>:</span>
        <FlipDigit value={m} label="MIN" />
        <span style={{ color: urgencyColor, fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginBottom: 16, opacity: 0.7 }}>:</span>
        <FlipDigit value={s} label="SEC" />
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", zIndex: 1 }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: `linear-gradient(90deg, ${urgencyColor}88, ${urgencyColor})`, borderRadius: 2, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

export default function MatchdayCountdowns() {
  const todayMidnight = getSASTMidnightToday();
  const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000;
  const DURATION_48H = 48 * 60 * 60 * 1000;

  return (
    <div style={{ padding: "0 20px 20px", display: "flex", gap: 12 }}>
      {/* Previous Matchday — started yesterday, no reset, just runs out */}
      <CountdownCard
        title="⏮ Previous Matchday Deadline"
        startMs={yesterdayMidnight}
        durationMs={DURATION_48H}
        accent="#FF1493"
      />
      {/* Current Matchday — started today at midnight, resets every 48h from today's midnight */}
      <CountdownCard
        title="📅 Current Matchday Deadline"
        startMs={todayMidnight}
        durationMs={DURATION_48H}
        accent="#a855f7"
      />
    </div>
  );
}
