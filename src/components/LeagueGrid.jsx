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

const CACHE_KEY = "careerLeagueImages";

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}

function saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

// Place leagues in a circular pattern
// We have 10 leagues — we'll put 5 on top arc, 5 on bottom arc
// Arranged like positions on a clock face
function getCirclePosition(index, total, radiusPx) {
  // Start from top (-90deg) and go clockwise
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radiusPx;
  const y = Math.sin(angle) * radiusPx;
  return { x, y };
}

export default function LeagueGrid({ onClose }) {
  const navigate = useNavigate();
  const [leagueImages, setLeagueImages] = useState(getCache);

  useEffect(() => {
    const cached = getCache();
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/leagueImages`), snap => {
      const data = snap.val();
      if (!data) return;
      const hasChanges = Object.entries(data).some(([k, v]) => cached[k] !== v);
      if (hasChanges) {
        const merged = { ...cached, ...data };
        setLeagueImages(merged);
        saveCache(merged);
      }
    });
    return () => unsub();
  }, []);

  function handleNav(path) {
    navigate(path);
    if (onClose) onClose();
  }

  const circleSize = 80;    // diameter of each league circle in px
  const radius = 160;        // radius of the arrangement circle
  const containerSize = (radius + circleSize) * 2 + 20; // total container size

  return (
    <div style={{
      position: "relative",
      width: `${containerSize}px`,
      height: `${containerSize}px`,
    }}>
      {leagues.map((league, i) => {
        const { x, y } = getCirclePosition(i, leagues.length, radius);
        const cx = containerSize / 2 + x - circleSize / 2;
        const cy = containerSize / 2 + y - circleSize / 2;

        return (
          <div
            key={league.id}
            onClick={() => handleNav(league.path)}
            style={{
              position: "absolute",
              left: `${cx}px`,
              top: `${cy}px`,
              width: `${circleSize}px`,
              height: `${circleSize}px`,
              borderRadius: "50%",
              overflow: "hidden",
              cursor: "pointer",
              border: "2.5px solid rgba(255,20,147,0.5)",
              background: "rgba(0,0,40,0.85)",
              boxShadow: "0 0 18px rgba(255,20,147,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              transition: "all 0.25s",
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = "#FF1493";
              e.currentTarget.style.transform = "scale(1.18)";
              e.currentTarget.style.boxShadow = "0 0 28px rgba(255,20,147,0.7)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 0 18px rgba(255,20,147,0.3)";
            }}
          >
            {leagueImages[league.id] ? (
              <img
                src={leagueImages[league.id]}
                alt={league.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%"
                }}
              />
            ) : (
              <span>{league.emoji}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
