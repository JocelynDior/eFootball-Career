import { useAdmin } from "../context/AdminContext";
import { formatDate } from "../utils/formatters";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

export default function ResultsList({ results, onEdit, onDelete, teamIconsCache = {} }) {
  const { isAdmin } = useAdmin();
  const sorted = [...results].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (!sorted.length) {
    return <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>No results yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {sorted.map(r => {
        const isNoContest = r.forfeitType === "no_contest";
        const homeIcon = teamIconsCache[r.homeTeam];
        const awayIcon = teamIconsCache[r.awayTeam];
        const homeScorers = r.goalScorers?.home || [];
        const awayScorers = r.goalScorers?.away || [];

        return (
          <div key={r.key} style={{ borderRadius: "24px", padding: "28px 36px", transition: "all 0.25s", ...GLASS }}
            onMouseOver={e => e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,20,147,0.2)"}
            onMouseOut={e => e.currentTarget.style.boxShadow = "none"}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
              {/* Home team */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
                {homeIcon && <img src={homeIcon} alt="" style={{ width: "64px", height: "64px", objectFit: "contain" }} />}
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#fff", letterSpacing: "0.5px" }}>{r.homeTeam}</span>
                {homeScorers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                    {homeScorers.map((s, i) => (
                      <span key={i} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.4)", padding: "3px 12px", borderRadius: "20px", fontSize: "0.8rem", color: "#fff" }}>⚽ {s.player}{s.goals > 1 ? ` (${s.goals})` : ""}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Score */}
              <div style={{ flexShrink: 0, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                {isNoContest
                  ? <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", color: "#ffaaaa", letterSpacing: "4px", background: "rgba(0,0,0,0.5)", padding: "10px 28px", borderRadius: "50px", border: "2px solid #ffaaaa" }}>F — F</div>
                  : <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", color: "#fff", letterSpacing: "6px", background: "rgba(0,0,0,0.3)", padding: "10px 32px", borderRadius: "50px", border: "2px solid rgba(255,20,147,0.3)" }}>{r.homeScore} — {r.awayScore}</div>
                }
                {r.forfeitType && r.forfeitType !== "none" && !isNoContest && (
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>
                    {r.forfeitType === "forfeit_win" ? "Forfeit Win" : r.forfeitType}
                  </span>
                )}
                {r.date && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>📅 {formatDate(r.date)}</span>}
              </div>

              {/* Away team */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
                {awayIcon && <img src={awayIcon} alt="" style={{ width: "64px", height: "64px", objectFit: "contain" }} />}
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#fff", letterSpacing: "0.5px" }}>{r.awayTeam}</span>
                {awayScorers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                    {awayScorers.map((s, i) => (
                      <span key={i} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.4)", padding: "3px 12px", borderRadius: "20px", fontSize: "0.8rem", color: "#fff" }}>⚽ {s.player}{s.goals > 1 ? ` (${s.goals})` : ""}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
                <button onClick={() => onEdit(r)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#fff", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", fontSize: "0.85rem" }}>✏️ Edit</button>
                <button onClick={() => onDelete(r.key)} style={{ background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.3)", color: "#ff6b6b", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", fontSize: "0.85rem" }}>🗑️ Delete</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
