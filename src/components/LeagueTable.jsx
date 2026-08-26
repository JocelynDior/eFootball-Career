import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const thStyle = {
  padding: "18px 16px",
  color: "rgba(255,255,255,0.8)",
  fontSize: "2.2rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "1px",
  background: "rgba(255,20,147,0.2)",
  borderBottom: "2px solid #FF1493",
  whiteSpace: "nowrap",
  textAlign: "center",
};

const tdStyle = {
  padding: "18px 16px",
  textAlign: "center",
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: "3.6rem",
  color: "#fff",
  whiteSpace: "nowrap",
};

export default function LeagueTable({ league, season, teams, onEdit, onDelete, results = [] }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [zones, setZones] = useState([]);
  const [dashedLines, setDashedLines] = useState([]);
  const [showManagerNames, setShowManagerNames] = useState(false);
  const [showFormArrows, setShowFormArrows] = useState(false);
  const [showLast5, setShowLast5] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [badges, setBadges] = useState({});
  const [managerMap, setManagerMap] = useState({}); // { teamName: username }

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}_settings/zones`), snap => {
      const d = snap.val();
      if (d) {
        setZones(d.colorZones || []);
        setDashedLines(d.dashedLines || []);
      }
    });
    return () => unsub();
  }, [league]);

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

  // Load manager names from career_accounts
  useEffect(() => {
    const unsub = onValue(ref(db, "career_accounts"), snap => {
      const d = snap.val() || {};
      const map = {};
      Object.values(d).forEach(acc => {
        if (acc?.role === "manager" && acc?.team && acc?.username) {
          map[acc.team] = acc.username;
        }
      });
      setManagerMap(map);
    });
    return () => unsub();
  }, []);

  const combined = { ...teamIconsCache, ...badges };
  const sorted = [...teams].sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.gd || 0) - (a.gd || 0));

  function getZoneBarColor(pos) {
    for (const z of zones) {
      if (pos >= z.from && pos <= z.to) return z.color;
    }
    return null;
  }

  function getDashedLineAfter(pos) {
    return dashedLines.find(l => l.afterPosition === pos) || null;
  }

  function getLast5(teamName) {
    return results
      .filter(r => r.homeTeam === teamName || r.awayTeam === teamName)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5)
      .map(r => {
        const isHome = r.homeTeam === teamName;
        const my = isHome ? r.homeScore : r.awayScore;
        const opp = isHome ? r.awayScore : r.homeScore;
        if (r.forfeitType === "no_contest") return "F";
        if (my > opp) return "W";
        if (my < opp) return "L";
        return "D";
      });
  }

  function getArrow(teamName) {
    const last = getLast5(teamName)[0];
    if (last === "W") return { symbol: "↑", color: "#22c55e" };
    if (last === "L") return { symbol: "↓", color: "#ef4444" };
    if (last === "D") return { symbol: "→", color: "#fff" };
    return null;
  }

  const resultColors = { W: "#22c55e", L: "#ef4444", D: "#6b7280", F: "#ef4444" };

  return (
    <div style={{ borderRadius: 20, overflow: "hidden", ...GLASS }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", background: "rgba(255,20,147,0.15)", borderBottom: "2px solid #FF1493" }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: 3, color: "#fff" }}>🏆 League Table</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isAdmin && onEdit && (
            <button onClick={() => onEdit(null)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.5)", color: "#fff", padding: "10px 22px", borderRadius: 30, fontWeight: 700, cursor: "pointer", fontSize: "1rem", fontFamily: "inherit" }}>
              + Add Team
            </button>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={() => setPopupOpen(p => !p)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.5)", color: "#fff", width: 46, height: 46, borderRadius: "50%", fontSize: "1.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⋮</button>
            {popupOpen && (
              <div onClick={() => setPopupOpen(false)} style={{ position: "absolute", right: 0, top: "110%", zIndex: 50, background: "rgba(0,0,30,0.98)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 16, minWidth: 260, overflow: "hidden" }}>
                {[
                  ["Show Manager Names", () => setShowManagerNames(p => !p)],
                  ["Toggle Form Arrows", () => setShowFormArrows(p => !p)],
                  ["Toggle Last 5", () => setShowLast5(p => !p)],
                ].map(([lbl, fn]) => (
                  <div key={lbl} onClick={fn} style={{ padding: "18px 26px", color: "#fff", cursor: "pointer", fontSize: "2rem", fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, transition: "background 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.2)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    {lbl}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, position: "sticky", left: 0, zIndex: 20, background: "rgba(255,20,147,0.2)", minWidth: 70 }}>Pos</th>
              <th style={{ ...thStyle, textAlign: "left", position: "sticky", left: 70, zIndex: 20, background: "rgba(255,20,147,0.2)", minWidth: 260, boxShadow: "4px 0 12px rgba(0,0,0,0.5)" }}>Club</th>
              {["P", "W", "D", "L", "GS", "GC", "GD", "Pts"].map(h => <th key={h} style={thStyle}>{h}</th>)}
              {showLast5 && <th style={thStyle}>Last 5</th>}
              {isAdmin && <th style={thStyle}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, idx) => {
              const pos = idx + 1;
              const last5 = getLast5(team.name);
              const arrow = getArrow(team.name);
              const gd = team.gd || 0;
              const barColor = getZoneBarColor(pos);
              const dashed = getDashedLineAfter(pos);
              const displayName = showManagerNames ? (managerMap[team.name] || team.name) : team.name;

              return (
                <>
                  <tr key={team.key}
                    style={{ borderBottom: "1px solid rgba(255,20,147,0.1)", transition: "background 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Position */}
                    <td style={{ padding: "18px 16px", textAlign: "center", position: "sticky", left: 0, background: "rgba(0,0,30,0.95)", zIndex: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                        {barColor && <span style={{ width: 6, height: 32, borderRadius: 3, background: barColor, display: "inline-block", flexShrink: 0 }} />}
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", color: "#fff" }}>{pos}</span>
                        {showFormArrows && arrow && <span style={{ color: arrow.color, fontSize: "1.3rem", fontWeight: 900 }}>{arrow.symbol}</span>}
                      </div>
                    </td>

                    {/* Club */}
                    <td style={{ padding: "18px 20px", position: "sticky", left: 70, background: "rgba(0,0,30,0.95)", zIndex: 10, boxShadow: "4px 0 12px rgba(0,0,0,0.5)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {combined[team.name] && (
                          <img src={combined[team.name]} alt="" style={{ width: 52, height: 52, objectFit: "contain" }} />
                        )}
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", color: "#fff", letterSpacing: "0.5px" }}>
                          {displayName}
                        </div>
                      </div>
                    </td>

                    {/* Stats */}
                    {[team.p || 0, team.w || 0, team.d || 0, team.l || 0, team.gs || 0, team.gc || 0, gd > 0 ? `+${gd}` : gd].map((val, i) => (
                      <td key={i} style={tdStyle}>{val}</td>
                    ))}

                    {/* Points */}
                    <td style={{ ...tdStyle, fontSize: "3.6rem", color: "#FF1493", fontWeight: 900 }}>{team.pts || 0}</td>

                    {/* Last 5 */}
                    {showLast5 && (
                      <td style={{ padding: "18px 16px" }}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                          {[...Array(5)].map((_, i) => {
                            const r = last5[i];
                            return <span key={i} style={{ width: 32, height: 32, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800, background: r ? resultColors[r] : "rgba(255,255,255,0.1)", color: "#fff" }}>{r || ""}</span>;
                          })}
                        </div>
                      </td>
                    )}

                    {/* Admin actions */}
                    {isAdmin && (
                      <td style={{ padding: "18px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {onEdit && <button onClick={() => onEdit(team)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#fff", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: "1rem" }}>✏️</button>}
                          {onDelete && <button onClick={() => onDelete(team.key)} style={{ background: "rgba(255,0,0,0.2)", border: "1px solid rgba(255,0,0,0.4)", color: "#ff6b6b", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: "1rem" }}>🗑️</button>}
                        </div>
                      </td>
                    )}
                  </tr>

                  {dashed && (
                    <tr key={`dashed-${pos}`}>
                      <td colSpan={99} style={{ padding: 0, border: "none" }}>
                        <div style={{ borderTop: "2px dashed #ef4444", margin: "0 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ background: "rgba(0,0,30,0.95)", padding: "0 10px", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, letterSpacing: 1 }}>{dashed.label}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {(zones.length > 0 || dashedLines.length > 0) && (
        <div style={{ padding: "14px 24px", background: "rgba(255,20,147,0.08)", display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center", borderTop: "1px solid rgba(255,20,147,0.2)" }}>
          {zones.map((z, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
              <span style={{ width: 6, height: 22, borderRadius: 3, background: z.color, display: "inline-block" }} />
              {z.label}
            </span>
          ))}
          {dashedLines.map((d, i) => (
            <span key={`dl-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
              <span style={{ display: "inline-block", width: 28, height: 3, background: "#ef4444", borderRadius: 2, borderTop: "2px dashed #ef4444" }} />
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
