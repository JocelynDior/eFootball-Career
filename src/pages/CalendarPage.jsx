import { useState } from "react";
import Navbar from "../components/Navbar";
import { getSASTDateObj } from "../utils/sastTime";

export default function CalendarPage() {
  const today = getSASTDateObj();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isToday = (d) => d && d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Calendar" />
      <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "24px", padding: "32px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <button onClick={prevMonth} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", width: "40px", height: "40px", borderRadius: "50%", fontSize: "1.2rem", cursor: "pointer" }}>‹</button>
            <span style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "3px" }}>{monthNames[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", width: "40px", height: "40px", borderRadius: "50%", fontSize: "1.2rem", cursor: "pointer" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", marginBottom: "10px" }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} style={{ textAlign: "center", color: "#FF1493", fontWeight: 700, fontSize: "0.75rem" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
            {days.map((d, i) => (
              <div key={i} style={{
                aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", fontSize: "0.9rem", fontWeight: d ? 600 : 400,
                background: isToday(d) ? "#FF1493" : "transparent",
                color: isToday(d) ? "#fff" : d ? "#fff" : "transparent",
                border: isToday(d) ? "none" : d ? "1px solid rgba(255,20,147,0.1)" : "none",
                cursor: d ? "pointer" : "default",
                transition: "all 0.2s"
              }}
                onMouseOver={e => { if (d && !isToday(d)) e.currentTarget.style.background = "rgba(255,20,147,0.15)"; }}
                onMouseOut={e => { if (d && !isToday(d)) e.currentTarget.style.background = "transparent"; }}
              >{d}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
