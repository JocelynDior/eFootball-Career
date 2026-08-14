import { useAdmin } from "../context/AdminContext";
import { formatDate } from "../utils/formatters";

export default function ResultsList({ results, onEdit, onDelete, teamIconsCache = {} }) {
  const { isAdmin } = useAdmin();

  const sorted = [...results].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {!sorted.length && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>No results yet.</div>
      )}
      {sorted.map(r => {
        const isForfeit = r.matchType === "forfeit";
        const isNoContest = r.forfeitType === "no_contest";
        const homeIcon = teamIconsCache[r.homeTeam];
        const awayIcon = teamIconsCache[r.awayTeam];
        return (
          <div key={r.key} style={{
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,20,147,0.2)", borderRadius: "20px",
            padding: "24px 28px", transition: "all 0.25s"
          }}
            onMouseOver={e => e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,20,147,0.2)"}
            onMouseOut={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flex: 1, textAlign: "center" }}>
                {homeIcon && <img src={homeIcon} alt="" style={{ width: "48px", height: "48px", objectFit: "contain" }} />}
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{r.homeTeam}</span>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                {isNoContest
                  ? <div style={{ color: "#ffaaaa", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "4px" }}>F — F</div>
                  : <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "6px", background: "rgba(0,0,0,0.3)", padding: "8px 24px", borderRadius: "50px", border: "1px solid rgba(255,20,147,0.3)" }}>{r.homeScore} — {r.awayScore}</div>
                }
                {r.forfeitType && r.forfeitType !== "none" && (
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginTop: "4px" }}>
                    {r.forfeitType === "no_contest" ? "No Contest" : r.forfeitType === "forfeit_win" ? "Forfeit Win" : "Forfeit"}
                  </div>
                )}
                {r.date && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: "6px" }}>📅 {formatDate(r.date)}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flex: 1, textAlign: "center" }}>
                {awayIcon && <img src={awayIcon} alt="" style={{ width: "48px", height: "48px", objectFit: "contain" }} />}
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{r.awayTeam}</span>
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
                <button onClick={() => onEdit(r)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#fff", padding: "6px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "0.85rem" }}>✏️ Edit</button>
                <button onClick={() => onDelete(r.key)} style={{ background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.3)", color: "#ff6b6b", padding: "6px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "0.85rem" }}>🗑️ Delete</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
