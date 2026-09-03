import { useNavigate } from "react-router-dom";
import { useState } from "react";

const leagues = [
  { id: "premier", name: "Premier League", path: "/premier-league", img: "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-49-28-AM.png" },
  { id: "laliga", name: "La Liga", path: "/la-liga", img: "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-57-59-AM.png" },
  { id: "seriea", name: "Serie A", path: "/serie-a", img: "/images/leagues/69132ef8-dee8-4910-baa6-21d60a54db45 (1).png" },
  { id: "bundesliga", name: "Bundesliga", path: "/bundesliga", img: "/images/leagues/Chat-GPT-Image-Aug-17-2026-01-09-40-AM-1.png" },
  { id: "ligue1", name: "Ligue 1", path: "/ligue-1", img: "/images/leagues/Chat-GPT-Image-Aug-17-2026-01-05-16-AM.png" },
  { id: "ucl", name: "Champions League", path: "/champions-league", img: "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-59-24-AM.png" },
  { id: "uel", name: "Europa League", path: "/europa-league", img: "/images/leagues/Gemini-Generated-Image-2gc5l72gc5l72gc5.jpg" },
  { id: "cwc", name: "Club World Cup", path: "/club-world-cup", img: "/images/leagues/5ef5dd0d-4bf3-4e2d-a696-5627906c6977.jpg" },
  { id: "sc", name: "UEFA Super Cup", path: "/super-cup", img: "/images/leagues/2c4467ee-57b6-4438-86cd-372a9928ab63.jpg" },
];

function getCirclePosition(index, total, radiusPx) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radiusPx;
  const y = Math.sin(angle) * radiusPx;
  return { x, y };
}

export default function LeagueGrid({ onClose }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);

  function handleNav(path) {
    navigate(path);
    if (onClose) onClose();
  }

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
              transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
              transform: isHovered ? "scale(1.18)" : "scale(1)",
            }}
          >
            <img
              src={league.img}
              alt={league.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%"
              }}
            />
            {isHovered && (
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
