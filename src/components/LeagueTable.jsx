import { useAdmin } from "../context/AdminContext";

export default function LeagueTable({ teams, onEdit, onDelete, showLast5, results }) {
  const { isAdmin, teamIconsCache } = useAdmin();

  function getLast5(teamName) {
    if (!results) return [];
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

  const sorted = [...teams].sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.gd || 0) - (a.gd || 0));

  const posColors = { 1: "#FF1493", 2: "#FF1493", 3: "#FF1493", 4: "#4169E1", 5: "#4169E1" };
  const resultColors = { W: "#22c55e", L: "#ef4444", D: "#6b7280", F: "#ef4444" };

  return (
    <div style={{ overflowX: "auto", borderRadius: "16px" }}>
      <div style={{ background: "rgba(255,20,147,0.1)", backdropFilter: "blur(10px)", borderRadius: "16px 16px 0 0", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #FF1493" }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "1px" }}>🏆 LEAGUE TABLE</span>
        {isAdmin && <button onClick={() => onEdit(null)} style={{ background: "#FF1493", border: "none", color: "#fff", padding: "6px 16px", borderRadius: "20px", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}>+ Add Team</button>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
        <thead>
          <tr style={{ background: "rgba(255,20,147,0.15)" }}>
            {["#", "Club", "P", "W", "D", "L", "GS", "GC", "GD", "Pts", ...(showLast5 ? ["Last 5"] : []), ...(isAdmin ? [""] : [])].map(h => (
              <th key={h} style={{ padding: "12px 14px", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: h === "Club" ? "left" : "center", whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,20,147,0.2)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, idx) => {
            const pos = idx + 1;
            const last5 = getLast5(team.name);
            return (
              <tr key={team.key} style={{ borderBottom: "1px solid rgba(255,20,147,0.1)", transition: "background 0.2s" }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
                onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                    {posColors[pos] && <span style={{ width: "4px", height: "24px", borderRadius: "2px", background: posColors[pos], display: "inline-block" }} />}
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{pos <= 3 ? ["🥇","🥈","🥉"][pos-1] : pos}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {teamIconsCache[team.name] && <img src={teamIconsCache[team.name]} alt="" style={{ width: "32px", height: "32px", objectFit: "contain" }} />}
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{team.name}</span>
                  </div>
                </td>
                {[team.p, team.w, team.d, team.l, team.gs, team.gc, team.gd >= 0 ? `+${team.gd || 0}` : team.gd].map((val, i) => (
                  <td key={i} style={{ padding: "12px 14px", textAlign: "center", color: i === 9 ? "#FF1493" : "#fff", fontWeight: i === 9 ? 800 : 600, fontSize: "0.9rem" }}>{val ?? 0}</td>
                ))}
                <td style={{ padding: "12px 14px", textAlign: "center", color: "#FF1493", fontWeight: 800, fontSize: "1rem" }}>{team.pts || 0}</td>
                {showLast5 && (
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{
                          width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex",
                          alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700,
                          background: last5[i] ? resultColors[last5[i]] : "rgba(255,255,255,0.1)",
                          color: "#fff"
                        }}>{last5[i] || ""}</span>
                      ))}
                    </div>
                  </td>
                )}
                {isAdmin && (
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => onEdit(team)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#fff", padding: "4px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}>✏️</button>
                      <button onClick={() => onDelete(team.key)} style={{ background: "rgba(255,0,0,0.2)", border: "1px solid rgba(255,0,0,0.4)", color: "#ff6b6b", padding: "4px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}>🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
