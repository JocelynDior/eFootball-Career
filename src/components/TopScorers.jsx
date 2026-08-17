import { useAdmin } from "../context/AdminContext";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

export default function TopScorers({ scorers, type = "scorer", onAdd, onEdit, onDelete, teamIconsCache = {} }) {
  const { isAdmin } = useAdmin();
  const sorted = [...scorers].sort((a, b) => (b.count || 0) - (a.count || 0));
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const emoji = type === "scorer" ? "⚽" : "🎯";
  const label = type === "scorer" ? "Goals" : "Assists";
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      {/* Top 3 Podium — side by side full width no gaps */}
      {top3.length > 0 && (
        <div style={{ display: "flex", marginBottom: "32px", borderRadius: "20px", overflow: "hidden", ...GLASS }}>
          {top3.map((p, i) => {
            const teamIcon = teamIconsCache[p.team];
            const imgUrl = p.imageUrl || `https://via.placeholder.com/400x400/000033/FF1493?text=${encodeURIComponent(p.name?.[0] || "?")}`;
            return (
              <div key={p.key} style={{ flex: 1, position: "relative", transition: "transform 0.3s", cursor: "pointer" }}
                onMouseOver={e => e.currentTarget.style.transform = "translateY(-8px)"}
                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                {/* Image */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden", background: "#000033", borderRight: i < 2 ? "2px solid rgba(255,20,147,0.3)" : "none" }}>
                  <img src={imgUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.src = `https://via.placeholder.com/400x400/000033/FF1493?text=${encodeURIComponent(p.name?.[0] || "?")}`} />

                  {/* Medal */}
                  <div style={{ position: "absolute", top: "12px", left: "12px", fontSize: "2.5rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))", zIndex: 2 }}>{medals[i]}</div>

                  {/* Admin edit */}
                  {isAdmin && (
                    <button onClick={() => onEdit(p)} style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.6)", border: "1px solid #FF1493", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.9rem", zIndex: 3 }}>✏️</button>
                  )}

                  {/* Player name overlay */}
                  <div style={{ position: "absolute", bottom: "40px", left: "12px", background: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0.3))", color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1rem", padding: "5px 14px", borderRadius: "30px", backdropFilter: "blur(4px)", zIndex: 2, borderLeft: "3px solid #FF1493", pointerEvents: "none" }}>{p.name}</div>

                  {/* Team icon */}
                  {teamIcon && (
                    <div style={{ position: "absolute", bottom: "10px", right: "10px", width: "44px", height: "44px", background: "rgba(0,0,0,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "4px", zIndex: 2 }}>
                      <img src={teamIcon} alt="" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
                    </div>
                  )}
                </div>

                {/* Count below image */}
                <div style={{ textAlign: "center", padding: "10px 0", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#FF1493", letterSpacing: "2px", background: "rgba(0,0,0,0.3)" }}>
                  {emoji} {p.count || 0}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest in table */}
      {rest.length > 0 && (
        <div style={{ borderRadius: "16px", overflow: "hidden", ...GLASS, marginBottom: "20px" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
              <thead>
                <tr style={{ background: "rgba(255,20,147,0.2)" }}>
                  {["#", "Player", "Team", label, ...(isAdmin ? [""] : [])].map(h => (
                    <th key={h} style={{ padding: "12px 18px", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", textAlign: h === "Player" || h === "Team" ? "left" : "center", borderBottom: "2px solid #FF1493", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rest.map((p, i) => (
                  <tr key={p.key} style={{ borderBottom: "1px solid rgba(255,20,147,0.1)", transition: "background 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 18px", textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "#fff" }}>{i + 4}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,20,147,0.4)" }} />}
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {teamIconsCache[p.team] && <img src={teamIconsCache[p.team]} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />}
                        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>{p.team}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "center" }}>
                      <span style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "4px 16px", borderRadius: "30px", fontWeight: 800, fontSize: "1rem", fontFamily: "'Bebas Neue', sans-serif" }}>{p.count || 0}</span>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => onEdit(p)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#fff", padding: "4px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}>✏️</button>
                          <button onClick={() => onDelete(p.key)} style={{ background: "rgba(255,0,0,0.15)", border: "none", color: "#ff6b6b", padding: "4px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && (
        <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,20,147,0.15)", border: "2px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "16px 40px", borderRadius: "50px", cursor: "pointer", fontWeight: 700, fontSize: "1rem", fontFamily: "inherit" }}>
          + Add {type === "scorer" ? "Scorer" : "Assistant"}
        </button>
      )}

      {!sorted.length && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>No {type === "scorer" ? "scorers" : "assistants"} yet.</div>
      )}
    </div>
  );
}
