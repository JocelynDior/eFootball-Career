import { useAdmin } from "../context/AdminContext";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useState, useEffect } from "react";

const PINK = "#FF1493";

function TeamRow({ team, rank, onEdit, onDelete, iconUrl }) {
  const isTop = rank <= 4;
  const isRelegation = false; // can be wired up later

  const accent = isTop ? PINK : "transparent";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "32px 36px 1fr 36px 36px 36px 36px 36px 48px",
      alignItems: "center",
      gap: 4,
      padding: "10px 14px",
      borderRadius: 12,
      background: rank % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
      borderLeft: `3px solid ${isTop ? PINK : "transparent"}`,
      transition: "background 0.15s",
    }}
      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.06)"}
      onMouseOut={e => e.currentTarget.style.background = rank % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"}
    >
      {/* Rank */}
      <span style={{ color: isTop ? PINK : "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", textAlign: "center" }}>
        {rank}
      </span>

      {/* Badge */}
      <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {iconUrl
          ? <img src={iconUrl} alt={team.name} style={{ width: 28, height: 28, objectFit: "contain" }} />
          : (
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.65rem", color: "#fff" }}>
                {(team.name || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
              </span>
            </div>
          )
        }
      </div>

      {/* Name */}
      <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {team.name || "—"}
      </span>

      {/* Stats */}
      {[team.played ?? 0, team.won ?? 0, team.drawn ?? 0, team.lost ?? 0, (team.goalsFor ?? 0) - (team.goalsAgainst ?? 0)].map((val, i) => (
        <span key={i} style={{ color: i === 4 ? (val > 0 ? "#22c55e" : val < 0 ? "#ff6b6b" : "rgba(255,255,255,0.4)") : "rgba(255,255,255,0.55)", fontSize: "0.85rem", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
          {i === 4 && val > 0 ? `+${val}` : val}
        </span>
      ))}

      {/* Points */}
      <span style={{ color: PINK, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
        {team.points ?? 0}
      </span>

      {/* Admin controls */}
      {(onEdit || onDelete) && (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          {onEdit && (
            <button onClick={() => onEdit(team)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 6, color: PINK, fontSize: "0.7rem", padding: "3px 7px", cursor: "pointer" }}>✏️</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(team.key)} style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 6, color: "#ff6b6b", fontSize: "0.7rem", padding: "3px 7px", cursor: "pointer" }}>🗑️</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeagueTable({ league, season, teams = [], onEdit, onDelete, results = [] }) {
  const [icons, setIcons] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(db, "career_team_icons"), snap => {
      setIcons(snap.val() || {});
    });
    return () => unsub();
  }, []);

  function getIcon(teamName) {
    if (!teamName) return null;
    const key = Object.keys(icons).find(k => k.toLowerCase() === teamName.toLowerCase());
    return key ? icons[key] : null;
  }

  const sorted = [...teams].sort((a, b) => {
    const pts = (b.points ?? 0) - (a.points ?? 0);
    if (pts !== 0) return pts;
    const gdA = (a.goalsFor ?? 0) - (a.goalsAgainst ?? 0);
    const gdB = (b.goalsFor ?? 0) - (b.goalsAgainst ?? 0);
    if (gdB !== gdA) return gdB - gdA;
    return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
  });

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.25)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏟️</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: 3 }}>No Teams Yet</div>
        {onEdit && (
          <p style={{ marginTop: 8, fontSize: "0.9rem", color: "rgba(255,255,255,0.2)" }}>Add teams via the admin controls above</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: 20, overflow: "hidden" }}>
      {/* Header row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "32px 36px 1fr 36px 36px 36px 36px 36px 48px",
        gap: 4,
        padding: "10px 14px",
        background: "rgba(255,20,147,0.08)",
        borderBottom: "1px solid rgba(255,20,147,0.15)",
      }}>
        {["#", "", "Club", "P", "W", "D", "L", "GD", "PTS"].map((h, i) => (
          <span key={i} style={{ color: "rgba(255,20,147,0.7)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, textAlign: i === 2 ? "left" : "center" }}>
            {h}
          </span>
        ))}
      </div>

      {/* Team rows */}
      <div>
        {sorted.map((team, i) => (
          <TeamRow
            key={team.key || i}
            team={team}
            rank={i + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            iconUrl={getIcon(team.name)}
          />
        ))}
      </div>

      {/* Top 4 legend */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: PINK }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>Top 4 — Promotion / Champions</span>
        </div>
      </div>
    </div>
  );
}
