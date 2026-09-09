import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Each slot: front = league, back = cup (null = no flip for that position)
const SLOTS = [
  {
    front: { id: "premier",    name: "Premier League",   path: "/premier-league",   img: "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-49-28-AM.png" },
    back:  { id: "facup",      name: "FA Cup",           path: "/fa-cup",            img: "/images/leagues/62902133-af8f-469e-a866-bbc254222694.png" },
  },
  {
    front: { id: "laliga",     name: "La Liga",          path: "/la-liga",           img: "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-57-59-AM.png" },
    back:  { id: "copadelrey", name: "Copa del Rey",     path: "/copa-del-rey",      img: "/images/leagues/b9e2de24-7373-436f-bba6-cb097088a374.png" },
  },
  {
    front: { id: "seriea",     name: "Serie A",          path: "/serie-a",           img: "/images/leagues/69132ef8-dee8-4910-baa6-21d60a54db45 (1).png" },
    back:  { id: "coppaitalia",name: "Coppa Italia",     path: "/coppa-italia",      img: "/images/leagues/6e746ba3-b3ca-4b77-bf8c-91107b7bb520.png" },
  },
  {
    front: { id: "bundesliga", name: "Bundesliga",       path: "/bundesliga",        img: "/images/leagues/Chat-GPT-Image-Aug-17-2026-01-09-40-AM-1.png" },
    back:  { id: "dfbpokal",   name: "DFB Pokal",        path: "/dfb-pokal",         img: "/images/leagues/78ca6619-65fb-4d26-80c8-0e0a989571f0.png" },
  },
  {
    front: { id: "ligue1",     name: "Ligue 1",          path: "/ligue-1",           img: "/images/leagues/Chat-GPT-Image-Aug-17-2026-01-05-16-AM.png" },
    back:  { id: "coupedefrance", name: "Coupe de France", path: "/coupe-de-france", img: "/images/leagues/b49e5dc4-5041-4c43-99a6-fe3b413db5b7.png" },
  },
  {
    front: { id: "ucl",        name: "Champions League", path: "/champions-league",  img: "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-59-24-AM.png" },
    back: null,
  },
  {
    front: { id: "uel",        name: "Europa League",    path: "/europa-league",     img: "/images/leagues/Gemini-Generated-Image-2gc5l72gc5l72gc5.jpg" },
    back: null,
  },
  {
    front: { id: "cwc",        name: "Club World Cup",   path: "/club-world-cup",    img: "/images/leagues/5ef5dd0d-4bf3-4e2d-a696-5627906c6977.jpg" },
    back: null,
  },
  {
    front: { id: "sc",         name: "UEFA Super Cup",   path: "/super-cup",         img: "/images/leagues/2c4467ee-57b6-4438-86cd-372a9928ab63.jpg" },
    back: null,
  },
];

function getCirclePosition(index, total, radiusPx) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.cos(angle) * radiusPx,
    y: Math.sin(angle) * radiusPx,
  };
}

// ── Single flip card ──────────────────────────────────────────────────────────
function FlipCard({ slot, isFlipped, isHovered, onHoverEnter, onHoverLeave, onClick, circleSize }) {
  const active = isFlipped && slot.back ? slot.back : slot.front;
  const showFlippable = !!slot.back;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      style={{
        width: circleSize,
        height: circleSize,
        perspective: "800px",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* The card that flips */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isFlipped && slot.back ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          borderRadius: "50%",
          overflow: "hidden",
          border: isHovered ? "6px solid #FF1493" : "5px solid rgba(255,20,147,0.5)",
          background: "rgba(0,0,40,0.85)",
          backdropFilter: "blur(8px)",
          boxShadow: isHovered
            ? "0 0 60px rgba(255,20,147,0.8), inset 0 0 30px rgba(255,20,147,0.1)"
            : "0 0 28px rgba(255,20,147,0.3)",
          transform: "rotateY(0deg)",
          transition: "border 0.25s, box-shadow 0.25s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img src={slot.front.img} alt={slot.front.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          {isHovered && !isFlipped && (
            <div style={{
              position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
              color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "1.1rem", letterSpacing: 1,
              padding: "4px 12px", borderRadius: 20,
              whiteSpace: "nowrap", pointerEvents: "none",
            }}>{slot.front.name}</div>
          )}
          {showFlippable && (
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(255,20,147,0.85)", borderRadius: "50%",
              width: 18, height: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.6rem", color: "#fff", fontWeight: 900,
              pointerEvents: "none",
            }}>⇄</div>
          )}
        </div>

        {/* BACK (cup) */}
        {slot.back && (
          <div style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: "50%",
            overflow: "hidden",
            border: isHovered ? "6px solid #FF1493" : "5px solid rgba(255,20,147,0.5)",
            background: "rgba(0,0,40,0.85)",
            backdropFilter: "blur(8px)",
            boxShadow: isHovered
              ? "0 0 60px rgba(255,20,147,0.8), inset 0 0 30px rgba(255,20,147,0.1)"
              : "0 0 28px rgba(255,20,147,0.3)",
            transform: "rotateY(180deg)",
            transition: "border 0.25s, box-shadow 0.25s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src={slot.back.img} alt={slot.back.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            {isHovered && isFlipped && (
              <div style={{
                position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
                color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "1.1rem", letterSpacing: 1,
                padding: "4px 12px", borderRadius: 20,
                whiteSpace: "nowrap", pointerEvents: "none",
              }}>{slot.back.name}</div>
            )}
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(255,20,147,0.85)", borderRadius: "50%",
              width: 18, height: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.6rem", color: "#fff", fontWeight: 900,
              pointerEvents: "none",
            }}>⇄</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Grid ─────────────────────────────────────────────────────────────────
export default function LeagueGrid({ onClose }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId]   = useState(null);
  const [flipped, setFlipped]       = useState(false); // global flip state
  const [switching, setSwitching]   = useState(false); // pulse animation on switch btn

  const circleSize  = 240;
  const radius      = 480;
  const containerSize = (radius + circleSize) * 2 + 20;
  const center = containerSize / 2;

  function handleSwitch() {
    setSwitching(true);
    setFlipped(f => !f);
    setTimeout(() => setSwitching(false), 600);
  }

  function handleNav(slot) {
    const target = flipped && slot.back ? slot.back : slot.front;
    navigate(target.path);
    if (onClose) onClose();
  }

  return (
    <div style={{ position: "relative", width: containerSize, height: containerSize }}>

      {/* ── SWITCH button in centre ── */}
      <div
        onClick={handleSwitch}
        style={{
          position: "absolute",
          left: center - circleSize / 2,
          top:  center - circleSize / 2,
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          background: "#FF1493",
          border: "5px solid #001133",
          boxShadow: switching
            ? "0 0 80px rgba(255,20,147,1), 0 0 40px rgba(255,20,147,0.8)"
            : "0 0 40px rgba(255,20,147,0.6), inset 0 0 20px rgba(0,0,60,0.4)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
          transition: "box-shadow 0.3s",
          transform: switching ? "scale(0.93)" : "scale(1)",
          userSelect: "none",
        }}
      >
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "2.8rem",
          color: "#001133",
          letterSpacing: 4,
          lineHeight: 1,
        }}>
          SWITCH
        </span>
        <span style={{
          fontSize: "1.6rem",
          color: "#001133",
          marginTop: 4,
          opacity: 0.75,
          transition: "transform 0.6s",
          transform: flipped ? "rotate(180deg)" : "rotate(0deg)",
          display: "inline-block",
        }}>⇄</span>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "0.9rem",
          color: "#001133",
          letterSpacing: 2,
          opacity: 0.6,
          marginTop: 2,
        }}>
          {flipped ? "CUPS" : "LEAGUES"}
        </span>
      </div>

      {/* ── League/Cup orbit circles ── */}
      {SLOTS.map((slot, i) => {
        const { x, y } = getCirclePosition(i, SLOTS.length, radius);
        const cx = center + x - circleSize / 2;
        const cy = center + y - circleSize / 2;
        const activeId = flipped && slot.back ? slot.back.id : slot.front.id;
        const isHovered = hoveredId === activeId;

        return (
          <div
            key={slot.front.id}
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: circleSize,
              height: circleSize,
              transform: isHovered ? "scale(1.18)" : "scale(1)",
              transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
              zIndex: isHovered ? 5 : 1,
            }}
          >
            <FlipCard
              slot={slot}
              isFlipped={flipped}
              isHovered={isHovered}
              onHoverEnter={() => setHoveredId(activeId)}
              onHoverLeave={() => setHoveredId(null)}
              onClick={() => handleNav(slot)}
              circleSize={circleSize}
            />
          </div>
        );
      })}
    </div>
  );
}
