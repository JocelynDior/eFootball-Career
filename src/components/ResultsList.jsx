import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const GLASS = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const BATCH = 5;

function TeamBadge({ teamName, iconUrl, size = 100 }) {
  if (iconUrl) {
    return <img src={iconUrl} alt={teamName} style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", color: "#fff" }}>
        {(teamName || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
      </span>
    </div>
  );
}

export default function ResultsList({ league, season, onEdit, onDelete }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [allResults, setAllResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fullyLoaded, setFullyLoaded] = useState(false);
  const [badges, setBadges] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/results`), snap => {
      const d = snap.val();
      const list = d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : [];
      list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0) || (b.date || "").localeCompare(a.date || ""));
      setAllResults(list);
      setVisibleCount(BATCH);
      setFullyLoaded(false);
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

  useEffect(() => {
    if (allResults.length === 0) { setFullyLoaded(true); return; }
    if (visibleCount >= allResults.length) { setFullyLoaded(true); setLoadingMore(false); return; }
    setLoadingMore(true);
    timerRef.current = setTimeout(() => {
      setVisibleCount(prev => {
        const next = prev + BATCH;
        if (next >= allResults.length) setFullyLoaded(true);
        return next;
      });
      setLoadingMore(false);
    }, 600);
    return () => clearTimeout(timerRef.current);
  }, [visibleCount, allResults.length]);

  const combined = { ...teamIconsCache, ...badges };
  const visible = allResults.slice(0, visibleCount);

  if (!allResults.length && fullyLoaded) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏆</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: 3 }}>No Results Yet</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {visible.map(r => {
        const isNoContest = r.forfeitType === "no_contest";
        const isForfeit = r.forfeitType && r.forfeitType !== "none" && !isNoContest;
        const homeScorers = r.goalScorers?.home || [];
        const awayScorers = r.goalScorers?.away || [];

        return (
          <div key={r.key} style={{ borderRadius: 32, overflow: "hidden", transition: "all 0.2s", ...GLASS }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          >
            {/* Match image - shown at top of card if present */}
            {r.matchImageUrl && (
              <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden" }}>
                <img
                  src={r.matchImageUrl}
                  alt="Match"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
                {r.md && (
                  <div style={{ position: "absolute", bottom: 12, left: 20, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", letterSpacing: 2 }}>
                    MATCHDAY {r.md}
                  </div>
                )}
                {r.date && (
                  <div style={{ position: "absolute", bottom: 12, right: 20, fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                    📅 {r.date}
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: "36px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                {/* Home team */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
                  <TeamBadge teamName={r.homeTeam} iconUrl={combined[r.homeTeam]} size={100} />
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
                  {isForfeit && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>Forfeit</span>}
                  {r.aggregate && <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>Agg: {r.aggregate}</span>}
                </div>

                {/* Away team */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
                  <TeamBadge teamName={r.awayTeam} iconUrl={combined[r.awayTeam]} size={100} />
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

              {/* Meta - only show if no match image (otherwise shown on image) */}
              {!r.matchImageUrl && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 24, justifyContent: "center" }}>
                  {r.date && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)" }}>📅 {r.date}</span>}
                  {r.md && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)" }}>MD {r.md}</span>}
                  {r.matchType && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)" }}>{r.matchType}</span>}
                </div>
              )}

              {/* Admin actions */}
              {isAdmin && (
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                  {onEdit && <button onClick={() => onEdit(r)} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}>✏️ Edit</button>}
                  {onDelete && <button onClick={() => onDelete(r.key)} style={{ background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}>🗑️ Delete</button>}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {!fullyLoaded && (
        <div style={{ textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ width: 18, height: 18, border: "2px solid rgba(255,20,147,0.3)", borderTop: "2px solid #FF1493", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Loading more results…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
