import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const GLASS = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TopScorers({ league, season, type = "scorer", onAdd, onEdit, onDelete }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [list, setList] = useState([]);
  const [badges, setBadges] = useState({});

  const pathKey = type === "scorer" ? "top_scorers" : "top_assistants";
  const emoji   = type === "scorer" ? "⚽" : "🎯";
  const label   = type === "scorer" ? "Goals" : "Assists";

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/${pathKey}`), snap => {
      const d = snap.val();
      setList(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []);
    });
    return () => unsub();
  }, [league, season, pathKey]);

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

  const combined = { ...teamIconsCache, ...badges };
  const sorted   = [...list].sort((a, b) => (b.count || 0) - (a.count || 0));
  const top3     = sorted.slice(0, 3);
  const rest     = sorted.slice(3);

  return (
    <div>
      {/* ── TOP 3 PODIUM ── */}
      {top3.length > 0 && (
        <div style={{ display: "flex", marginBottom: 32, borderRadius: 20, overflow: "hidden", ...GLASS }}>
          {top3.map((p, i) => {
            const teamBadge = combined[p.team];
            // Admin-set image via pencil edit — stored as p.imageUrl in Firebase
            const playerImg = p.imageUrl || null;

            return (
              <div
                key={p.key}
                style={{ flex: 1, position: "relative", transition: "transform 0.3s", cursor: "pointer" }}
                onMouseOver={e => e.currentTarget.style.transform = "translateY(-8px)"}
                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                {/* Player image — admin-set via ✏️ edit, or initials placeholder */}
                <div style={{
                  position: "relative", width: "100%", aspectRatio: "1/1",
                  overflow: "hidden", background: "#000033",
                  borderRight: i < 2 ? "2px solid rgba(255,255,255,0.15)" : "none",
                }}>
                  {playerImg ? (
                    <img
                      src={playerImg}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))" }}>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>
                        {(p.name || "?")[0]}
                      </span>
                    </div>
                  )}

                  {/* Medal */}
                  <div style={{ position: "absolute", top: 12, left: 12, fontSize: "2.2rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))", zIndex: 2 }}>
                    {MEDALS[i]}
                  </div>

                  {/* Admin edit button */}
                  {isAdmin && onEdit && (
                    <button
                      onClick={() => onEdit(p)}
                      style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.9rem", zIndex: 3 }}
                    >✏️</button>
                  )}

                  {/* Player name overlay */}
                  <div style={{ position: "absolute", bottom: 40, left: 12, background: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0.3))", color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "0.95rem", padding: "5px 14px", borderRadius: 30, backdropFilter: "blur(4px)", zIndex: 2, borderLeft: "3px solid rgba(255,255,255,0.6)", pointerEvents: "none" }}>
                    {p.name}
                  </div>

                  {/* Team badge */}
                  {teamBadge && (
                    <div style={{ position: "absolute", bottom: 10, right: 10, width: 40, height: 40, background: "rgba(0,0,0,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 4, zIndex: 2 }}>
                      <img src={teamBadge} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
                    </div>
                  )}
                </div>

                {/* Count */}
                <div style={{ textAlign: "center", padding: "10px 0", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#fff", letterSpacing: 2, background: "rgba(0,0,0,0.3)" }}>
                  {emoji} {p.count || 0}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4th AND BELOW ── */}
      {rest.length > 0 && (
        <div style={{ borderRadius: 16, overflow: "hidden", ...GLASS, marginBottom: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.08)" }}>
                  {["#", "Player", "Team", label, ...(isAdmin ? [""] : [])].map(h => (
                    <th key={h} style={{ padding: "14px 18px", color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, textAlign: h === "Player" || h === "Team" ? "left" : "center", borderBottom: "2px solid rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rest.map((p, i) => (
                  <tr key={p.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 18px", textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#fff" }}>{i + 4}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Show admin-set image in list rows too if available */}
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.2)" }} onError={e => { e.target.style.display = "none"; }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.4)" }}>{(p.name || "?")[0]}</span>
                          </div>
                        )}
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {combined[p.team] && <img src={combined[p.team]} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />}
                        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>{p.team}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "center" }}>
                      <span style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "4px 16px", borderRadius: 30, fontWeight: 800, fontSize: "1rem", fontFamily: "'Bebas Neue', sans-serif" }}>{p.count || 0}</span>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {onEdit   && <button onClick={() => onEdit(p)}       style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: "0.8rem" }}>✏️</button>}
                          {onDelete && <button onClick={() => onDelete(p.key)} style={{ background: "rgba(255,0,0,0.15)", border: "none", color: "#ff6b6b", padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: "0.8rem" }}>🗑️</button>}
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

      {isAdmin && onAdd && (
        <button
          onClick={onAdd}
          style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.25)", color: "#fff", padding: "16px 40px", borderRadius: 50, cursor: "pointer", fontWeight: 700, fontSize: "1rem", fontFamily: "inherit", transition: "all 0.2s" }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
        >
          + Add {type === "scorer" ? "Scorer" : "Assistant"}
        </button>
      )}

      {!sorted.length && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)", fontSize: "1.1rem" }}>
          No {type === "scorer" ? "scorers" : "assistants"} yet.
        </div>
      )}
    </div>
  );
}
