import { useState } from "react";
import Modal from "../components/Modal";
import SubmitResultModal from "./SubmitResultModal";
import ForfeitModal from "./ForfeitModal";

export default function ManagerActionHub({ managerData, league, season, teams, onClose }) {
  const [view, setView] = useState("hub");

  if (view === "submit") return <SubmitResultModal managerData={managerData} league={league} season={season} teams={teams} onClose={onClose} />;
  if (view === "forfeit") return <ForfeitModal managerData={managerData} league={league} season={season} teams={teams} onClose={onClose} />;

  const actions = [
    { id: "submit", icon: "⚽", label: "Submit Result", desc: "Report a match you played" },
    { id: "forfeit", icon: "🚫", label: "Report Forfeit", desc: "Opponent didn't show / no contest" },
  ];

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "linear-gradient(135deg, #FF1493, #FF69B4)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }}>👔</div>
        <h3 style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px", margin: 0 }}>{managerData.teamName}</h3>
        <span style={{ color: "#FF1493", fontSize: "0.85rem", fontWeight: 600 }}>Manager: {managerData.key}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {actions.map(a => (
          <div key={a.id} onClick={() => setView(a.id)} style={{
            padding: "20px 24px", background: "rgba(255,20,147,0.08)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,20,147,0.25)", borderRadius: "16px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "16px", transition: "all 0.2s"
          }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.18)"; e.currentTarget.style.borderColor = "#FF1493"; }}
            onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; }}>
            <span style={{ fontSize: "2rem" }}>{a.icon}</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{a.label}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>{a.desc}</div>
            </div>
            <span style={{ marginLeft: "auto", color: "#FF1493", fontSize: "1.2rem" }}>›</span>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ width: "100%", marginTop: "20px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "0.95rem" }}>Close</button>
    </div>
  );
}
