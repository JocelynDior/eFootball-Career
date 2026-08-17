import { useState } from "react";
import { useAdmin } from "../context/AdminContext";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

export default function LeagueTable({ teams, onEdit, onDelete, showLast5, results = [] }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [showManagerNames, setShowManagerNames] = useState(false);
  const [showFormArrows, setShowFormArrows] = useState(false);
  const [showLast5State, setShowLast5State] = useState(showLast5 !== false);
  const [popupOpen, setPopupOpen] = useState(false);

  const sorted = [...teams].sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.gd || 0) - (a.gd || 0));

  function getLast5(teamName) {
    const teamResults = results
      .filter(r => r.homeTeam === teamName || r.awayTeam === teamName)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);
    return teamResults.map(r => {
      const isHome = r.homeTeam === teamName;
      const myScore = isHome ? r.homeScore : r.awayScore;
      const oppScore = isHome ? r.awayScore : r.homeScore;
      if (r.forfeitType === "no_contest") return "F";
      if (myScore > oppScore) return "W";
      if (myScore < oppScore) return "L";
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

  const posColors = [
    "#FF1493", "#FF1493", "#FF1493", "#4169E1", "#4169E1",
  ];

  const resultColors = { W: "#22c55e", L: "#ef4444", D: "#6b7280", F: "#ef4444" };

  const thStyle = {
    padding: "14px 16px", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem",
    fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px",
    background: "rgba(255,20,147,0.2)", borderBottom: "2px solid #FF1493",
    whiteSpace: "nowrap", textAlign: "center"
  };

  return (
    <div style={{ borderRadius: "20px", overflow: "hidden", ...GLASS }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", background: "rgba(255,20,147,0.15)",
        borderBottom: "2px solid #FF1493"
      }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "3px", color: "#fff" }}>🏆 League Table</span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isAdmin && (
            <button onClick={() => onEdit(null)} style={{
              background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.5)",
              color: "#fff", padding: "8px 18px", borderRadius: "30px",
              fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit"
            }}>+ Add Team</button>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={() => setPopupOpen(p => !p)} style={{
              background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.5)",
              color: "#fff", width: "40px", height: "40px", borderRadius: "50%",
              fontSize: "1.4rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}>⋮</button>
            {popupOpen && (
              <div onClick={() => setPopupOpen(false)} style={{
                position: "absolute", right: 0, top: "110%", zIndex: 50,
                background: "rgba(0,0,30,0.98)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,20,147,0.3)", borderRadius: "16px",
                minWidth: "220px", overflow: "hidden"
              }}>
                {[
                  ["Show Manager Names", () => setShowManagerNames(p => !p)],
                  ["Toggle Form Arrows", () => setShowFormArrows(p => !p)],
                  ["Toggle Last 5", () => setShowLast5State(p => !p)],
                ].map(([label, fn]) => (
                  <div key={label} onClick={fn} style={{
                    padding: "14px 20px", color: "#fff", cursor: "pointer",
                    fontSize: "0.95rem", fontWeight: 600, transition: "background 0.2s"
                  }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.2)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >{label}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, position: "sticky", left: 0, zIndex: 20, background: "rgba(255,20,147,0.2)", minWidth: "64px" }}>Pos</th>
              <th style={{ ...thStyle, textAlign: "left", position: "sticky", left: "64px", zIndex: 20, background: "rgba(255,20,147,0.2)", minWidth: "240px", boxShadow: "4px 0 12px rgba(0,0,0,0.5)" }}>Club</th>
              {["P","W","D","L","GS","GC","GD","Pts"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
              {showLast5State && <th style={thStyle}>Last 5</th>}
              {isAdmin && <th style={thStyle}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, idx) => {
              const pos = idx + 1;
              const last5 = getLast5(team.name);
              const arrow = getArrow(team.name);
              const gd = team.gd || 0;
              const isSepRow = pos === 4 || pos === 6;

              return (
                <tr key={team.key}
                  style={{ borderBottom: isSepRow ? "2px dashed rgba(255,255,255,0.4)" : "1px solid rgba(255,20,147,0.1)", transition: "background 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Position */}
                  <td style={{ padding: "14px 16px", textAlign: "center", position: "sticky", left: 0, background: "rgba(0,0,30,0.95)", zIndex: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      {posColors[idx] && (
                        <span style={{ width: "5px", height: "28px", borderRadius: "3px", background: posColors[idx], display: "inline-block", flexShrink: 0 }} />
                      )}
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "#fff" }}>
                        {pos <= 3 ? ["🥇","🥈","🥉"][pos-1] : pos}
                      </span>
                      {showFormArrows && arrow && (
                        <span style={{ color: arrow.color, fontSize: "1.2rem", fontWeight: 900 }}>{arrow.symbol}</span>
                      )}
                    </div>
                  </td>

                  {/* Club name */}
                  <td style={{ padding: "14px 18px", position: "sticky", left: "64px", background: "rgba(0,0,30,0.95)", zIndex: 10, boxShadow: "4px 0 12px rgba(0,0,0,0.5)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {teamIconsCache[team.name] && (
                        <img src={teamIconsCache[team.name]} alt="" style={{ width: "44px", height: "44px", objectFit: "contain" }} />
                      )}
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", color: "#fff", letterSpacing: "0.5px" }}>
                        {team.name}
                      </span>
                    </div>
                  </td>

                  {/* Stats */}
                  {[team.p||0, team.w||0, team.d||0, team.l||0, team.gs||0, team.gc||0, gd > 0 ? `+${gd}` : gd].map((val, i) => (
                    <td key={i} style={{ padding: "14px 16px", textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "#fff", whiteSpace: "nowrap" }}>{val}</td>
                  ))}

                  {/* Points */}
                  <td style={{ padding: "14px 16px", textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#FF1493", fontWeight: 900 }}>{team.pts||0}</td>

                  {/* Last 5 */}
                  {showLast5State && (
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                        {[...Array(5)].map((_, i) => {
                          const r = last5[i];
                          return (
                            <span key={i} style={{
                              width: "28px", height: "28px", borderRadius: "50%",
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.7rem", fontWeight: 800,
                              background: r ? resultColors[r] : "rgba(255,255,255,0.1)",
                              color: "#fff"
                            }}>{r || ""}</span>
                          );
                        })}
                      </div>
                    </td>
                  )}

                  {/* Admin actions */}
                  {isAdmin && (
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => onEdit(team)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>✏️</button>
                        <button onClick={() => onDelete(team.key)} style={{ background: "rgba(255,0,0,0.2)", border: "1px solid rgba(255,0,0,0.4)", color: "#ff6b6b", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ padding: "12px 20px", background: "rgba(255,20,147,0.1)", display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center", borderTop: "1px solid rgba(255,20,147,0.2)" }}>
        {[
          { color: "#FF1493", label: "Champions League" },
          { color: "#4169E1", label: "Europa League" },
        ].map(item => (
          <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
            <span style={{ width: "5px", height: "20px", borderRadius: "3px", background: item.color, display: "inline-block" }} />
            {item.label}
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
          <span style={{ display: "inline-block", width: "24px", height: "2px", borderBottom: "2px dashed rgba(255,255,255,0.5)" }} />
          Club World Cup
        </span>
      </div>
    </div>
  );
}
