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

function getCirclePosition(index, total, radiusPx) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radiusPx;
  const y = Math.sin(angle) * radiusPx;
  return { x, y };
}

export default function LeagueGrid({ onClose }) {
  const navigate = useNavigate();
  const [leagueImages, setLeagueImages] = useState(getCache);
  const [hoveredId, setHoveredId] = useState(null);

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

  // 3× bigger: circleSize 240, radius 480
  const circleSize = 240;
  const radius = 480;
  const containerSize = (radius + circleSize) * 2 + 20;

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
        const isHovered = hoveredId === league.id;

        return (
          <div
            key={league.id}
            onClick={() => handleNav(league.path)}
            onMouseEnter={() => setHoveredId(league.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: "absolute",
              left: `${cx}px`,
              top: `${cy}px`,
              width: `${circleSize}px`,
              height: `${circleSize}px`,
              borderRadius: "50%",
              overflow: "hidden",
              cursor: "pointer",
              border: isHovered ? "6px solid #FF1493" : "5px solid rgba(255,20,147,0.5)",
              background: "rgba(0,0,40,0.85)",
              backdropFilter: "blur(8px)",
              boxShadow: isHovered
                ? "0 0 60px rgba(255,20,147,0.8), inset 0 0 30px rgba(255,20,147,0.1)"
                : "0 0 28px rgba(255,20,147,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "5rem",
              transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
              transform: isHovered ? "scale(1.18)" : "scale(1)",
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
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "4.5rem", lineHeight: 1 }}>{league.emoji}</div>
                <div style={{
                  color: "rgba(255,255,255,0.7)", fontSize: "1rem",
                  fontWeight: 700, marginTop: "8px",
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: "1px", textAlign: "center",
                  padding: "0 8px"
                }}>{league.name}</div>
              </div>
            )}

            {/* Name tooltip on hover for image circles */}
            {leagueImages[league.id] && isHovered && (
              <div style={{
                position: "absolute",
                bottom: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(6px)",
                color: "#FF1493",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "1.1rem",
                letterSpacing: "1px",
                padding: "4px 12px",
                borderRadius: "20px",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}>{league.name}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
