import { useAdmin } from "../context/AdminContext";

export default function TopScorers({ scorers, type = "scorer", onAdd, onEdit, onDelete, teamIconsCache = {} }) {
  const { isAdmin } = useAdmin();
  const sorted = [...scorers].sort((a, b) => (b.count || 0) - (a.count || 0));
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const emoji = type === "scorer" ? "⚽" : "🎯";
  const label = type === "scorer" ? "Goals" : "Assists";

  return (
    <div>
      {top3.length > 0 && (
        <div style={{ display: "flex", gap: 0, marginBottom: "24px", borderRadius: "20px", overflow: "hidden" }}>
          {top3.map((p, i) => {
            const medals = ["🥇","🥈","🥉"];
            const teamIcon = teamIconsCache[p.team];
            return (
              <div key={p.key} style={{ flex: 1, position: "relative", transition: "transform 0.3s" }}
                onMouseOver={e => e.currentTarget.style.transform = "translateY(-6px)"}
                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "#000033", border: "2px solid rgba(255,20,147,0.3)", position: "relative" }}>
                  <img src={p.imageUrl || `https://via.placeholder.com/300x300/000033/FF1493?text=${p.name?.[0] || "?"}`}
                    alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: "10px", left: "10px", fontSize: "2rem" }}>{medals[i]}</div>
                  {isAdmin && <div onClick={() => onEdit(p)} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", border: "1px solid #FF1493", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.9rem" }}>✏️</div>}
                  <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", padding: "4px 12px", borderRadius: "30px", color: "#fff", fontWeight: 700, fontSize: "0.85rem", borderLeft: "3px solid #FF1493" }}>{p.name}</div>
                  {teamIcon && <div style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(0,0,0,0.5)", borderRadius: "50%", padding: "4px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}><img src={teamIcon} alt="" style={{ width: "32px", height: "32px", objectFit: "contain" }} /></div>}
                </div>
                <div style={{ textAlign: "center", padding: "8px 0", color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "1px" }}>{emoji} {p.count || 0}</div>
              </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(255,20,147,0.2)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,20,147,0.15)" }}>
                {["#", "Player", "Team", label, ...(isAdmin ? [""] : [])].map(h => (
                  <th key={h} style={{ padding: "12px 16px", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid rgba(255,20,147,0.2)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((p, i) => (
                <tr key={p.key} style={{ borderBottom: "1px solid rgba(255,20,147,0.1)" }}>
                  <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{i + 4}</td>
                  <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {teamIconsCache[p.team] && <img src={teamIconsCache[p.team]} alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} />}
                      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem" }}>{p.team}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", padding: "4px 14px", borderRadius: "30px", fontWeight: 700, fontSize: "0.9rem" }}>{p.count || 0}</span>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: "12px 16px" }}>
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
      )}

      {isAdmin && (
        <button onClick={onAdd} style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,20,147,0.15)", border: "2px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "14px 32px", borderRadius: "50px", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", fontFamily: "inherit" }}>
          + Add {type === "scorer" ? "Scorer" : "Assistant"}
        </button>
      )}

      {!sorted.length && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>No {type === "scorer" ? "scorers" : "assistants"} yet.</div>
      )}
    </div>
  );
}
