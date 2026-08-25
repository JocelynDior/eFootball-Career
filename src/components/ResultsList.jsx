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

function getTeamBadge(teamName, cache = {}) {
  const url = cache[teamName];
  if (url) {
    return (
      <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <img src={url} alt={teamName} style={{ width: 84, height: 84, objectFit: "contain" }} />
      </div>
    );
  }
  const initials = (teamName || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
  return (
    <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "#fff", letterSpacing: 2 }}>{initials}</span>
    </div>
  );
}

export default function ResultsList({ league, season, onEdit, onDelete }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/results`), snap => {
      const d = snap.val();
      setResults(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, [league, season]);

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
  const sorted = [...results].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0) || (b.date || "").localeCompare(a.date || ""));

  if (loading) return <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)" }}>Loading…</div>;

  if (!sorted.length) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏆</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: 3 }}>No Results Yet</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {sorted.map(r => {
        const isNoContest = r.forfeitType === "no_contest";
        const isForfeit = r.forfeitType && r.forfeitType !== "none" && !isNoContest;
        const homeScorers = r.goalScorers?.home || [];
        const awayScorers = r.goalScorers?.away || [];

        return (
          <div key={r.key} style={{ borderRadius: 32, padding: "36px 40px", transition: "all 0.2s", ...GLASS }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
              {/* Home team */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
                {getTeamBadge(r.homeTeam, combined)}
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", letterSpacing: 1, lineHeight: 1.1 }}>{r.homeTeam}</span>
                {homeScorers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                    {homeScorers.map((s, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", padding: "4px 14px", borderRadius: 40, fontSize: "0.85rem", color: "#ddd" }}>
                        {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />}
                        ⚽ {s.player}{s.goals > 1 ? ` (${s.goals})` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Score */}
              <div style={{ flexShrink: 0, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 160 }}>
                {isNoContest ? (
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#ffaaaa", letterSpacing: 4, background: "rgba(0,0,0,0.6)", padding: "14px 32px", borderRadius: 60, border: "2px solid #ffaaaa" }}>F — F</div>
                ) : (
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.8rem", color: "#fff", letterSpacing: 6, background: "rgba(0,0,0,0.3)", padding: "14px 40px", borderRadius: 60, border: "2px solid rgba(255,255,255,0.25)" }}>
                    {r.homeScore} — {r.awayScore}
                  </div>
                )}
                {isForfeit && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", fontFamily: "'Inter', sans-serif" }}>Forfeit</span>}
                {r.aggregate && <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", fontFamily: "'Rajdhani', sans-serif" }}>Agg: {r.aggregate}</span>}
              </div>

              {/* Away team */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
                {getTeamBadge(r.awayTeam, combined)}
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", letterSpacing: 1, lineHeight: 1.1 }}>{r.awayTeam}</span>
                {awayScorers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                    {awayScorers.map((s, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", padding: "4px 14px", borderRadius: 40, fontSize: "0.85rem", color: "#ddd" }}>
                        {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />}
                        ⚽ {s.player}{s.goals > 1 ? ` (${s.goals})` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 24, justifyContent: "center" }}>
              {r.date && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', sans-serif" }}>📅 {r.date}</span>}
              {r.venue && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', sans-serif" }}>📍 {r.venue}</span>}
              {r.matchType && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', sans-serif" }}>{r.matchType}</span>}
              {r.md && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', sans-serif" }}>MD {r.md}</span>}
            </div>

            {isAdmin && (
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                {onEdit && <button onClick={() => onEdit(r)} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}>✏️ Edit</button>}
                {onDelete && <button onClick={() => onDelete(r.key)} style={{ background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}>🗑️ Delete</button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
