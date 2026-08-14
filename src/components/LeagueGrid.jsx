import { useNavigate } from "react-router-dom";

const leagues = [
  { id: "premier", name: "Premier League", path: "/premier-league", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "laliga", name: "La Liga", path: "/la-liga", emoji: "🇪🇸" },
  { id: "seriea", name: "Serie A", path: "/serie-a", emoji: "🇮🇹" },
  { id: "ucl", name: "Champions League", path: "/champions-league", emoji: "⭐" },
  { id: "uel", name: "Europa League", path: "/europa-league", emoji: "🟠" },
  { id: "wc", name: "World Cup", path: "/world-cup", emoji: "🌍" },
  { id: "cwc", name: "Club World Cup", path: "/club-world-cup", emoji: "🏆" },
  { id: "sc", name: "UEFA Super Cup", path: "/super-cup", emoji: "🥇" },
];

export default function LeagueGrid() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      {leagues.map(league => (
        <div key={league.id} onClick={() => navigate(league.path)} style={{
          background: "rgba(255,20,147,0.08)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,20,147,0.25)", borderRadius: "14px",
          padding: "20px 12px", textAlign: "center", cursor: "pointer",
          transition: "all 0.3s"
        }}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.18)"; e.currentTarget.style.borderColor = "#FF1493"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{league.emoji}</div>
          <div style={{ color: "#FF1493", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.3 }}>{league.name}</div>
        </div>
      ))}
    </div>
  );
}
