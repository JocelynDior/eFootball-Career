import { useState, useEffect } from "react";

function useCountdown(targetDate, targetHour = 0) {
  const [time, setTime] = useState({ h: "00", m: "00", s: "00" });

  useEffect(() => {
    function update() {
      const now = new Date();
      let target;
      if (targetDate) {
        target = new Date(targetDate);
        target.setHours(targetHour, 0, 0, 0);
      } else {
        target = new Date();
        target.setHours(24, 0, 0, 0);
      }
      const diff = Math.max(0, target - now);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ h: String(h).padStart(2, "0"), m: String(m).padStart(2, "0"), s: String(s).padStart(2, "0") });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate, targetHour]);

  return time;
}

function CountdownBlock({ title, targetDate, targetHour }) {
  const { h, m, s } = useCountdown(targetDate, targetHour);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(255,20,147,0.06)", backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px",
      padding: "10px 16px", flex: 1
    }}>
      <span style={{ color: "#FF1493", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</span>
      <div style={{ display: "flex", gap: "8px" }}>
        {[h, m, s].map((val, i) => (
          <div key={i} style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "rgba(0,0,40,0.6)", border: "1.5px solid #FF1493",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ color: "#FF1493", fontSize: "0.85rem", fontWeight: 700, lineHeight: 1 }}>{val}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.5rem", textTransform: "uppercase" }}>{["H","M","S"][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CountdownTimers() {
  return (
    <div style={{ display: "flex", gap: "10px", padding: "10px 16px", flexWrap: "wrap" }}>
      <CountdownBlock title="⚽ Matchday" />
      <CountdownBlock title="⏸️ Postponed" targetHour={17} />
    </div>
  );
}
