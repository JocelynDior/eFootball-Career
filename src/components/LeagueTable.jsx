import { useAdmin } from "../context/AdminContext";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useState, useEffect } from "react";

const PINK = "#FF1493";

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
  return (
    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#fff" }}>—</span>
    </div>
  );
}

const DIVIDER = { width: 1, background: "rgba(255,255,255,0.18)", flexShrink: 0, alignSelf: "stretch" };
const COL_W = 72;

function StatCell({ val, color, size = "1.5rem", isLast }) {
  return (
    <div style={{
      width: COL_W, minWidth: COL_W, maxWidth: COL_W,
      textAlign: "center",
      fontVariantNumeric: "tabular-nums",
      fontSize: size,
      color,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRight: isLast ? "none" : "1px solid rgba(255,255,255,0.08)",
      alignSelf: "stretch",
    }}>
      {val}
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
  const gdStr = gd > 0 ? `+${gd}` : String(gd);

  const rowBg = rank % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        borderLeft: `5px solid ${isTop ? PINK : "transparent"}`,
        background: rowBg,
        transition: "background 0.15s",
        minHeight: 76,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.06)"}
      onMouseOut={e => e.currentTarget.style.background = rowBg}
    >
      {/* ── STICKY LEFT ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        paddingLeft: 8, paddingRight: 12,
        minWidth: 260, width: 260,
        position: "sticky", left: 0, zIndex: 2,
        background: "inherit",
        flexShrink: 0,
      }}>
        <span style={{ color: isTop ? PINK : "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", width: 30, textAlign: "center", flexShrink: 0 }}>
          {rank}
        </span>

        {/* Icon — same size and logic as FixturesList */}
        <div style={{ width: 60, height: 60, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {iconUrl
            ? <img src={iconUrl} alt={team.name} style={{ width: 60, height: 60, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
            : (
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", color: "#fff" }}>
                  {(team.name || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
                </span>
              </div>
            )
          }
        </div>

        {/* Name — 1.6rem matching fixtures tab */}
        <span style={{ color: "#fff", fontWeight: 400, fontSize: "1.6rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
          {team.name || "—"}
        </span>
      </div>

      {/* ── FULL-HEIGHT SOLID DIVIDER ── */}
      <div style={DIVIDER} />

      {/* ── STATS — each cell has its own right border acting as grid lines ── */}
      <StatCell val={p}   color="rgba(255,255,255,0.7)" />
      <StatCell val={w}   color="rgba(255,255,255,0.7)" />
      <StatCell val={d}   color="rgba(255,255,255,0.7)" />
      <StatCell val={l}   color="rgba(255,255,255,0.7)" />
      <StatCell val={gs}  color="rgba(255,255,255,0.7)" />
      <StatCell val={gc}  color="rgba(255,255,255,0.7)" />
      <StatCell val={gdStr} color={gd > 0 ? "#22c55e" : gd < 0 ? "#ff6b6b" : "rgba(255,255,255,0.4)"} />
      <StatCell val={pts} color={PINK} size="2rem" />

      {/* ── LAST 5 ── */}
      <div style={{ width: 150, minWidth: 150, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, paddingLeft: 10, paddingRight: 10, borderRight: "1px solid rgba(255,255,255,0.08)", alignSelf: "stretch" }}>
        {form && form.length > 0
          ? form.slice(-5).map((r, i) => <FormCircle key={i} result={r} />)
          : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>—</span>
        }
      </div>

      {/* Admin controls */}
      {(onEdit || onDelete) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 12, paddingRight: 12 }}>
          {onEdit && <button onClick={() => onEdit(team)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 8, color: PINK, fontSize: "1rem", padding: "6px 12px", cursor: "pointer" }}>✏️</button>}
          {onDelete && <button onClick={() => onDelete(team.key)} style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 8, color: "#ff6b6b", fontSize: "1rem", padding: "6px 12px", cursor: "pointer" }}>🗑️</button>}
        </div>
      )}
    </div>
  );
}

export default function LeagueTable({ league, season, teams = [], onEdit, onDelete, results = [] }) {
  const { teamIconsCache } = useAdmin();
  const [badges, setBadges] = useState({});     // from career_team_management (same as fixtures)
  const [teamLinks, setTeamLinks] = useState({}); // { tableTeamName: fixturesTeamName }

  // Load career_team_management badges — EXACTLY like FixturesList
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

  // Load team links
  useEffect(() => {
    if (!league) return;
    const unsub = onValue(ref(db, `career_${league}_settings/teamLinks`), snap => {
      setTeamLinks(snap.val() || {});
    });
    return () => unsub();
  }, [league]);

  // Combined icons — same merge as fixtures: teamIconsCache (admin-uploaded) + badges
  const combined = { ...teamIconsCache, ...badges };

  function getIcon(teamName) {
    if (!teamName) return null;
    const nameLower = teamName.toLowerCase();

    // 1. Direct match
    const directKey = Object.keys(combined).find(k => k.toLowerCase() === nameLower);
    if (directKey) return combined[directKey];

    // 2. Via team link: table team → fixtures team name
    const linkedName = teamLinks[teamName];
    if (linkedName) {
      const linkedKey = Object.keys(combined).find(k => k.toLowerCase() === linkedName.toLowerCase());
      if (linkedKey) return combined[linkedKey];
    }

    return null;
  }

  function getForm(teamName) {
    if (!results || results.length === 0) return [];
    const teamResults = results
      .filter(r => r.homeTeam === teamName || r.awayTeam === teamName)
      .filter(r => r.forfeitType !== "no_contest")
      .sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));
    return teamResults.slice(-5).map(r => {
      const isHome = r.homeTeam === teamName;
      const my = isHome ? (r.homeScore ?? 0) : (r.awayScore ?? 0);
      const their = isHome ? (r.awayScore ?? 0) : (r.homeScore ?? 0);
      if (my > their) return "W";
      if (my < their) return "L";
      return "D";
    });
  }

  const sorted = [...teams].sort((a, b) => {
    const ptsA = a.pts ?? a.points ?? 0;
    const ptsB = b.pts ?? b.points ?? 0;
    if (ptsB !== ptsA) return ptsB - ptsA;
    const gdA = a.gd ?? ((a.gs ?? 0) - (a.gc ?? 0));
    const gdB = b.gd ?? ((b.gs ?? 0) - (b.gc ?? 0));
    if (gdB !== gdA) return gdB - gdA;
    return (b.gs ?? 0) - (a.gs ?? 0);
  });

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.25)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏟️</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: 3 }}>No Teams Yet</div>
        {onEdit && <p style={{ marginTop: 8, fontSize: "0.9rem", color: "rgba(255,255,255,0.2)" }}>Add teams via the admin controls above</p>}
      </div>
    );
  }

  const STAT_HEADERS = ["P", "W", "D", "L", "GS", "GC", "GD", "PTS"];

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: 700 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "stretch", background: "rgba(255,20,147,0.08)", borderBottom: "2px solid rgba(255,255,255,0.18)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              paddingLeft: 8, paddingRight: 12,
              minWidth: 260, width: 260,
              position: "sticky", left: 0, zIndex: 3,
              background: "rgba(10,0,20,0.92)",
              flexShrink: 0,
            }}>
              <span style={{ color: "rgba(255,20,147,0.7)", fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 30, textAlign: "center" }}>#</span>
              <span style={{ color: "rgba(255,20,147,0.7)", fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 60 }}></span>
              <span style={{ color: "rgba(255,20,147,0.7)", fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Club</span>
            </div>

            <div style={DIVIDER} />

            {STAT_HEADERS.map((h, i) => (
              <div key={h} style={{
                width: COL_W, minWidth: COL_W,
                textAlign: "center",
                color: "rgba(255,20,147,0.7)",
                fontSize: "1rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1,
                padding: "10px 0",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRight: i < STAT_HEADERS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}>
                {h}
              </div>
            ))}

            <div style={{ width: 150, minWidth: 150, textAlign: "center", color: "rgba(255,20,147,0.7)", fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "10px 0", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "none", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              Last 5
            </div>
          </div>

          {/* Rows */}
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
      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: PINK }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>Top 4 — Promotion / Champions</span>
        </div>
        {[["W","#22c55e","Win"],["D","#6b7280","Draw"],["L","#ef4444","Loss"]].map(([l,c,t]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "0.5rem", color: "#fff", fontWeight: 900 }}>{l === "D" ? "—" : l}</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
