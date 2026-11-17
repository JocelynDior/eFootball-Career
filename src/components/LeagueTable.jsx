import { useAdmin } from "../context/AdminContext";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useState, useEffect } from "react";
import { getTeamIcon } from "../utils/teamIcons";

const PINK = "#FF1493";

function FormCircle({ result }) {
  if (result === "W") return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#fff" }}>W</span>
    </div>
  );
  if (result === "L") return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#fff" }}>L</span>
    </div>
  );
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#fff" }}>—</span>
    </div>
  );
}

const COL_W = 88;

function StatCell({ val, color, size = "2rem", bold = false }) {
  return (
    <div style={{
      width: COL_W, minWidth: COL_W, maxWidth: COL_W,
      textAlign: "center",
      fontVariantNumeric: "tabular-nums",
      fontSize: size,
      fontWeight: bold ? 800 : 400,
      color,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      alignSelf: "stretch",
      fontFamily: "'Bebas Neue', sans-serif",
    }}>
      {val}
    </div>
  );
}

// Fixed-width left column — wide enough for long names, never clips
const LEFT_W = 360;

function TeamRow({ team, rank, onEdit, onDelete, iconUrl, form, zoneColor }) {
  const p   = team.p   ?? team.played ?? 0;
  const w   = team.w   ?? team.won    ?? 0;
  const d   = team.d   ?? team.drawn  ?? 0;
  const l   = team.l   ?? team.lost   ?? 0;
  const gs  = team.gs  ?? team.goalsFor     ?? 0;
  const gc  = team.gc  ?? team.goalsAgainst ?? 0;
  const gd  = team.gd !== undefined ? team.gd : (gs - gc);
  const pts = team.pts ?? team.points ?? 0;
  const gdStr = gd > 0 ? `+${gd}` : String(gd);
  const gdColor = gd > 0 ? "#22c55e" : gd < 0 ? "#ff6b6b" : "rgba(255,255,255,0.4)";

  const rowBg = rank % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        borderLeft: `6px solid ${zoneColor || "transparent"}`,
        background: rowBg,
        transition: "background 0.15s",
        minHeight: 90,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.06)"}
      onMouseOut={e => e.currentTarget.style.background = rowBg}
    >
      {/* ── STICKY LEFT: Rank + Icon + Full Name ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        paddingLeft: 10, paddingRight: 0,
        width: LEFT_W, minWidth: LEFT_W,
        position: "sticky", left: 0, zIndex: 2,
        background: rank % 2 === 0 ? "rgb(14,4,28)" : "rgb(10,2,22)",
        flexShrink: 0,
        boxSizing: "border-box",
      }}>
        {/* Rank */}
        <span style={{
          color: zoneColor || "rgba(255,255,255,0.35)",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "2.4rem",
          width: 40, textAlign: "center", flexShrink: 0,
        }}>
          {rank}
        </span>

        {/* Icon */}
        <div style={{ width: 56, height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {iconUrl
            ? <img src={iconUrl} alt={team.name} style={{ width: 56, height: 56, objectFit: "contain" }}
                onError={e => { e.target.style.display = "none"; }} />
            : (
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", color: "#fff" }}>
                  {(team.name || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
                </span>
              </div>
            )
          }
        </div>

        {/* Full name */}
        <span style={{
          color: "#fff",
          fontWeight: 400,
          fontSize: "1.75rem",
          whiteSpace: "nowrap",
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: 1,
          flex: 1,
          paddingRight: 12,
        }}>
          {team.name || "—"}
        </span>
      </div>

      {/* ── FULL-HEIGHT SOLID DIVIDER ── */}
      <div style={{
        width: 3,
        minWidth: 3,
        background: "rgba(255,255,255,0.28)",
        flexShrink: 0,
        alignSelf: "stretch",
      }} />

      {/* ── SCROLLABLE STATS ── */}
      <StatCell val={p}      color="rgba(255,255,255,0.7)" />
      <StatCell val={w}      color="rgba(255,255,255,0.7)" />
      <StatCell val={d}      color="rgba(255,255,255,0.7)" />
      <StatCell val={l}      color="rgba(255,255,255,0.7)" />
      <StatCell val={gs}     color="rgba(255,255,255,0.7)" />
      <StatCell val={gc}     color="rgba(255,255,255,0.7)" />
      <StatCell val={gdStr}  color={gdColor} />
      <StatCell val={pts}    color={PINK} size="2.6rem" bold />

      {/* Last 5 */}
      <div style={{
        minWidth: 170, width: 170,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 5, paddingLeft: 10, paddingRight: 10,
        borderRight: "1px solid rgba(255,255,255,0.08)",
        alignSelf: "stretch",
      }}>
        {form && form.length > 0
          ? form.slice(-5).map((r, i) => <FormCircle key={i} result={r} />)
          : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1rem" }}>—</span>
        }
      </div>

      {/* Admin controls */}
      {(onEdit || onDelete) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 12, paddingRight: 12 }}>
          {onEdit && <button onClick={() => onEdit(team)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 8, color: PINK, fontSize: "1.1rem", padding: "6px 12px", cursor: "pointer" }}>✏️</button>}
          {onDelete && <button onClick={() => onDelete(team.key)} style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 8, color: "#ff6b6b", fontSize: "1.1rem", padding: "6px 12px", cursor: "pointer" }}>🗑️</button>}
        </div>
      )}
    </div>
  );
}

export default function LeagueTable({ league, season, teams = [], onEdit, onDelete, results = [] }) {
  const [teamLinks, setTeamLinks] = useState({});
  const [zones, setZones]         = useState([]);
  const [dashedLines, setDashedLines] = useState([]);

  useEffect(() => {
    if (!league) return;
    const unsub = onValue(ref(db, `career_${league}_settings/teamLinks`), snap => {
      setTeamLinks(snap.val() || {});
    });
    return () => unsub();
  }, [league]);

  useEffect(() => {
    if (!league) return;
    const unsub = onValue(ref(db, `career_${league}_settings/zones`), snap => {
      const d = snap.val() || {};
      setZones(d.colorZones || []);
      setDashedLines(d.dashedLines || []);
    });
    return () => unsub();
  }, [league]);

  function getIcon(teamName) {
    if (!teamName) return null;
    // Try direct local lookup first
    const direct = getTeamIcon(teamName);
    if (direct) return direct;
    // Try via teamLinks (e.g. table name differs from fixture name)
    const linked = teamLinks[teamName];
    if (linked) return getTeamIcon(linked);
    return null;
  }

  function getZoneColor(rank) {
    for (const z of zones) {
      if (rank >= z.from && rank <= z.to) return z.color;
    }
    return null;
  }

  function isDashedAfter(rank) {
    return dashedLines.some(d => d.afterPosition === rank);
  }

  function getForm(teamName) {
    if (!results || results.length === 0) return [];
    return results
      .filter(r => (r.homeTeam === teamName || r.awayTeam === teamName) && r.forfeitType !== "no_contest")
      .sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0))
      .slice(-5)
      .map(r => {
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
    const gdA = a.gd !== undefined ? a.gd : ((a.gs ?? 0) - (a.gc ?? 0));
    const gdB = b.gd !== undefined ? b.gd : ((b.gs ?? 0) - (b.gc ?? 0));
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
        <div style={{ minWidth: 900 }}>

          {/* ── HEADER ── */}
          <div style={{ display: "flex", alignItems: "stretch", background: "rgba(255,20,147,0.08)", borderBottom: "2px solid rgba(255,255,255,0.18)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              paddingLeft: 10, paddingRight: 0,
              width: LEFT_W, minWidth: LEFT_W,
              position: "sticky", left: 0, zIndex: 3,
              background: "rgb(10,2,22)",
              flexShrink: 0,
              boxSizing: "border-box",
            }}>
              <span style={{ color: "rgba(255,20,147,0.7)", fontSize: "1.2rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 40, textAlign: "center" }}>#</span>
              <span style={{ width: 56 }} />
              <span style={{ color: "rgba(255,20,147,0.7)", fontSize: "1.2rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Club</span>
            </div>

            <div style={{ width: 3, minWidth: 3, background: "rgba(255,255,255,0.28)", flexShrink: 0, alignSelf: "stretch" }} />

            {STAT_HEADERS.map(h => (
              <div key={h} style={{
                width: COL_W, minWidth: COL_W,
                textAlign: "center", color: "rgba(255,20,147,0.7)",
                fontSize: "1.2rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1,
                padding: "12px 0",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRight: "1px solid rgba(255,255,255,0.08)",
              }}>
                {h}
              </div>
            ))}

            <div style={{
              minWidth: 170, width: 170,
              textAlign: "center", color: "rgba(255,20,147,0.7)",
              fontSize: "1.2rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1,
              padding: "12px 0",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRight: "1px solid rgba(255,255,255,0.08)",
            }}>
              Last 5
            </div>
          </div>

          {/* ── ROWS ── */}
          <div>
            {sorted.map((team, i) => {
              const rank = i + 1;
              return (
                <div key={team.key || i}>
                  <TeamRow
                    team={team}
                    rank={rank}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    iconUrl={getIcon(team.name)}
                    form={getForm(team.name)}
                    zoneColor={getZoneColor(rank)}
                  />
                  {isDashedAfter(rank) && (
                    <div style={{ borderTop: "2px dashed rgba(255,255,255,0.25)", margin: "0 8px", position: "relative" }}>
                      {dashedLines.filter(d => d.afterPosition === rank).map((d, di) => (
                        <span key={di} style={{ position: "absolute", top: -10, left: 16, background: "rgba(10,0,20,0.9)", color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, letterSpacing: 1 }}>{d.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── LEGEND ── */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        {zones.map((z, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: z.color }} />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>Pos {z.from}–{z.to}: {z.label}</span>
          </div>
        ))}
        {[["W", "#22c55e", "Win"], ["D", "#6b7280", "Draw"], ["L", "#ef4444", "Loss"]].map(([l, c, t]) => (
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
