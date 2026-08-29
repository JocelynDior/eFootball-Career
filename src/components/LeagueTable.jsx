import { useAdmin } from "../context/AdminContext";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useState, useEffect } from "react";

const PINK = "#FF1493";

// ── Form circle for Last 5 ──────────────────────────────────────────
function FormCircle({ result }) {
  if (result === "W") return (
    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#fff" }}>W</span>
    </div>
  );
  if (result === "L") return (
    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#fff" }}>L</span>
    </div>
  );
  // Draw
  return (
    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#fff" }}>—</span>
    </div>
  );
}

function TeamRow({ team, rank, onEdit, onDelete, iconUrl, form }) {
  const isTop = rank <= 4;

  const p   = team.p   ?? team.played ?? 0;
  const w   = team.w   ?? team.won    ?? 0;
  const d   = team.d   ?? team.drawn  ?? 0;
  const l   = team.l   ?? team.lost   ?? 0;
  const gs  = team.gs  ?? team.goalsFor     ?? 0;
  const gc  = team.gc  ?? team.goalsAgainst ?? 0;
  const gd  = team.gd  ?? (gs - gc);
  const pts = team.pts ?? team.points ?? 0;

  const stats = [p, w, d, l, gs, gc, gd, pts];
  const rowBg = rank % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent";

  return (
    <div
      style={{
        display: "flex", alignItems: "stretch",
        borderLeft: `6px solid ${isTop ? PINK : "transparent"}`,
        background: rowBg, transition: "background 0.15s",
        minHeight: 80,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.06)"}
      onMouseOut={e => e.currentTarget.style.background = rowBg}
    >
      {/* ── STICKY LEFT: POS + Badge + Club name ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 16px",
        minWidth: 240,
        position: "sticky", left: 0, zIndex: 2,
        background: "inherit",
        flexShrink: 0,
        height: "100%",
      }}>
        {/* Rank */}
        <span style={{ color: isTop ? PINK : "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", width: 36, textAlign: "center", flexShrink: 0 }}>
          {rank}
        </span>

        {/* Badge — doubled from 56 to 72 */}
        <div style={{ width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {iconUrl
            ? <img src={iconUrl} alt={team.name} style={{ width: 72, height: 72, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
            : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", color: "#fff" }}>
                  {(team.name || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
                </span>
              </div>
            )
          }
        </div>

        {/* Name — NOT bold, doubled height via fontSize */}
        <span style={{ color: "#fff", fontWeight: 400, fontSize: "1.5rem", whiteSpace: "nowrap", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
          {team.name || "—"}
        </span>
      </div>

      {/* ── STICKY VERTICAL DIVIDER — full height solid line ── */}
      <div style={{ width: 1, background: "rgba(255,255,255,0.15)", flexShrink: 0, alignSelf: "stretch" }} />

      {/* ── SCROLLABLE STATS ── */}
      <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
        {stats.map((val, i) => {
          const isGD = i === 6;
          const isPTS = i === 7;
          return (
            <span
              key={i}
              style={{
                minWidth: 72,
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
                fontFamily: isPTS ? "'Bebas Neue', sans-serif" : "inherit",
                fontSize: isPTS ? "2.2rem" : "1.5rem",
                color: isPTS
                  ? PINK
                  : isGD
                    ? (val > 0 ? "#22c55e" : val < 0 ? "#ff6b6b" : "rgba(255,255,255,0.4)")
                    : "rgba(255,255,255,0.7)",
                padding: "0 8px",
                borderRight: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {isGD && val > 0 ? `+${val}` : val}
            </span>
          );
        })}

        {/* ── Last 5 form circles ── */}
        <div style={{ minWidth: 140, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "0 12px", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
          {form && form.length > 0
            ? form.slice(-5).map((r, i) => <FormCircle key={i} result={r} />)
            : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>—</span>
          }
        </div>

        {/* Admin controls */}
        {(onEdit || onDelete) && (
          <div style={{ display: "flex", gap: 8, paddingLeft: 16, paddingRight: 12 }}>
            {onEdit && (
              <button onClick={() => onEdit(team)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 8, color: PINK, fontSize: "1rem", padding: "6px 12px", cursor: "pointer" }}>✏️</button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(team.key)} style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 8, color: "#ff6b6b", fontSize: "1rem", padding: "6px 12px", cursor: "pointer" }}>🗑️</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeagueTable({ league, season, teams = [], onEdit, onDelete, results = [] }) {
  const [icons, setIcons] = useState({});
  const [teamLinks, setTeamLinks] = useState({}); // { tableTeamName: fixturesTeamName }
  const [badges, setBadges] = useState({});       // from career_team_management

  // Load career_team_icons (admin-uploaded via TeamIconUploadModal)
  useEffect(() => {
    const unsub = onValue(ref(db, "career_team_icons"), snap => {
      setIcons(snap.val() || {});
    });
    return () => unsub();
  }, []);

  // Load team_management badges
  useEffect(() => {
    const unsub = onValue(ref(db, "career_team_management"), snap => {
      const d = snap.val() || {};
      const map = {};
      Object.entries(d).forEach(([teamName, val]) => {
        if (val?.info?.badge) map[teamName] = val.info.badge;
      });
      setBadges(map);
    });
    return () => unsub();
  }, []);

  // Load team links for this league
  useEffect(() => {
    if (!league) return;
    const unsub = onValue(ref(db, `career_${league}_settings/teamLinks`), snap => {
      setTeamLinks(snap.val() || {});
    });
    return () => unsub();
  }, [league]);

  // Resolve icon: check table team name → then linked fixtures team name → then fallback
  function getIcon(teamName) {
    if (!teamName) return null;
    const nameLower = teamName.toLowerCase();

    // 1. Direct match in career_team_icons
    const directKey = Object.keys(icons).find(k => k.toLowerCase() === nameLower);
    if (directKey) return icons[directKey];

    // 2. Direct match in career_team_management badges
    const badgeKey = Object.keys(badges).find(k => k.toLowerCase() === nameLower);
    if (badgeKey) return badges[badgeKey];

    // 3. Try linked name
    const linkedName = teamLinks[teamName];
    if (linkedName) {
      const linkedLower = linkedName.toLowerCase();
      const linkedIconKey = Object.keys(icons).find(k => k.toLowerCase() === linkedLower);
      if (linkedIconKey) return icons[linkedIconKey];
      const linkedBadgeKey = Object.keys(badges).find(k => k.toLowerCase() === linkedLower);
      if (linkedBadgeKey) return badges[linkedBadgeKey];
    }

    return null;
  }

  // Compute last 5 form for each team from results
  function getForm(teamName) {
    if (!results || results.length === 0) return [];
    const teamResults = results
      .filter(r => r.homeTeam === teamName || r.awayTeam === teamName)
      .filter(r => r.forfeitType !== "no_contest")
      .sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));

    return teamResults.slice(-5).map(r => {
      const isHome = r.homeTeam === teamName;
      const myScore = isHome ? (r.homeScore ?? 0) : (r.awayScore ?? 0);
      const theirScore = isHome ? (r.awayScore ?? 0) : (r.homeScore ?? 0);
      if (myScore > theirScore) return "W";
      if (myScore < theirScore) return "L";
      return "D";
    });
  }

  const sorted = [...teams].sort((a, b) => {
    const ptsA = a.pts ?? a.points ?? 0;
    const ptsB = b.pts ?? b.points ?? 0;
    const pts = ptsB - ptsA;
    if (pts !== 0) return pts;
    const gdA = a.gd ?? ((a.gs ?? a.goalsFor ?? 0) - (a.gc ?? a.goalsAgainst ?? 0));
    const gdB = b.gd ?? ((b.gs ?? b.goalsFor ?? 0) - (b.gc ?? b.goalsAgainst ?? 0));
    if (gdB !== gdA) return gdB - gdA;
    return (b.gs ?? b.goalsFor ?? 0) - (a.gs ?? a.goalsFor ?? 0);
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

  const STAT_HEADERS = ["P", "W", "D", "L", "GS", "GC", "GD", "PTS"];

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: 700 }}>

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "stretch", background: "rgba(255,20,147,0.08)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
            {/* Sticky left header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px",
              minWidth: 240,
              position: "sticky", left: 0, zIndex: 3,
              background: "rgba(10,0,20,0.85)",
              flexShrink: 0,
            }}>
              <span style={{ color: "rgba(255,20,147,0.7)", fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 36, textAlign: "center" }}>#</span>
              <span style={{ color: "rgba(255,20,147,0.7)", fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 72, textAlign: "center" }}></span>
              <span style={{ color: "rgba(255,20,147,0.7)", fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Club</span>
            </div>

            {/* Divider header */}
            <div style={{ width: 1, background: "rgba(255,255,255,0.15)", flexShrink: 0, alignSelf: "stretch" }} />

            {/* Stat headers */}
            <div style={{ display: "flex", flex: 1 }}>
              {STAT_HEADERS.map(h => (
                <span key={h} style={{ minWidth: 72, textAlign: "center", color: "rgba(255,20,147,0.7)", fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "10px 8px", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                  {h}
                </span>
              ))}
              {/* Last 5 header */}
              <span style={{ minWidth: 140, textAlign: "center", color: "rgba(255,20,147,0.7)", fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "10px 8px", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                Last 5
              </span>
            </div>
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
                form={getForm(team.name)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: PINK }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>Top 4 — Promotion / Champions</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FormCircle result="W" /><span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>Win</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FormCircle result="D" /><span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>Draw</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FormCircle result="L" /><span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>Loss</span>
        </div>
      </div>
    </div>
  );
}
