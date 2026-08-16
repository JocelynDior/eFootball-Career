import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";

const leagues = [
  { id: "premier", name: "Premier League", path: "/premier-league", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "laliga", name: "La Liga", path: "/la-liga", emoji: "🇪🇸" },
  { id: "seriea", name: "Serie A", path: "/serie-a", emoji: "🇮🇹" },
  { id: "bundesliga", name: "Bundesliga", path: "/bundesliga", emoji: "🇩🇪" },
  { id: "ligue1", name: "Ligue 1", path: "/ligue-1", emoji: "🇫🇷" },
  { id: "ucl", name: "Champions League", path: "/champions-league", emoji: "⭐" },
  { id: "uel", name: "Europa League", path: "/europa-league", emoji: "🟠" },
  { id: "cwc", name: "Club World Cup", path: "/club-world-cup", emoji: "🌍" },
  { id: "sc", name: "UEFA Super Cup", path: "/super-cup", emoji: "🥇" },
  { id: "tokyo", name: "Tokyo Off Season", path: "/tokyo", emoji: "🗼" },
];

export default function LeagueGrid({ onClose }) {
  const navigate = useNavigate();
  const [leagueImages, setLeagueImages] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/leagueImages`), snap => {
      if (snap.val()) setLeagueImages(snap.val());
    });
    return () => unsub();
  }, []);

  function handleNav(path) {
    navigate(path);
    if (onClose) onClose();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
      {leagues.map(league => (
        <div key={league.id} onClick={() => handleNav(league.path)} style={{ cursor: "pointer" }}>
          <div style={{
            background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,20,147,0.25)", borderRadius: "14px",
            aspectRatio: "1/1", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "3rem", transition: "all 0.3s",
            overflow: "hidden"
          }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.15)"; e.currentTarget.style.borderColor = "#FF1493"; e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            {leagueImages[league.id]
              ? <img src={leagueImages[league.id]} alt={league.name} style={{ width: "75%", height: "75%", objectFit: "contain" }} />
              : <span>{league.emoji}</span>
            }
          </div>
          <div style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 700, textAlign: "center", marginTop: "8px", letterSpacing: "0.3px" }}>{league.name}</div>
        </div>
      ))}
    </div>
  );
}
