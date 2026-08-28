import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Modal from "./Modal";
import MatchDetailsModal from "../modals/MatchDetailsModal";

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
  const initials = (teamName || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "#fff" }}>{initials}</span>
    </div>
  );
}

function ScoreDisplay({ r }) {
  const isNoContest = r.forfeitType === "no_contest";
  const isForfeit = r.forfeitType && r.forfeitType !== "none" && !isNoContest;

  if (isNoContest) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#ffaaaa", letterSpacing: 4, background: "rgba(0,0,0,0.6)", padding: "14px 32px", borderRadius: 60, border: "2px solid rgba(255,170,170,0.5)" }}>F — F</div>
        <span style={{ color: "rgba(255,170,170,0.7)", fontSize: "0.78rem", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>No Contest</span>
      </div>
    );
  }

  if (isForfeit) {
    const homeWon = (r.homeScore || 0) > (r.awayScore || 0);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", color: "#fff", letterSpacing: 4, background: "rgba(0,0,0,0.3)", padding: "14px 36px", borderRadius: 60, border: "2px solid rgba(255,165,0,0.4)" }}>
          {r.homeScore ?? 3} — {r.awayScore ?? 0}
        </div>
        <span style={{ color: "#FFB347", fontSize: "0.78rem", fontWeight: 700, letterSpacing: 1, background: "rgba(255,165,0,0.12)", border: "1px solid rgba(255,165,0,0.3)", padding: "3px 14px", borderRadius: 20 }}>
          {homeWon ? r.homeTeam : r.awayTeam} win (F)
        </span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.8rem", color: "#fff", letterSpacing: 6, background: "rgba(0,0,0,0.3)", padding: "14px 40px", borderRadius: 60, border: "2px solid rgba(255,255,255,0.25)" }}>
      {r.homeScore} — {r.awayScore}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, border: "4px solid rgba(255,20,147,0.2)", borderTop: "4px solid #FF1493", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: 2 }}>Loading Results...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ResultsList({ league, season, onEdit, onDelete }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [allResults, setAllResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fullyLoaded, setFullyLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [badges, setBadges] = useState({});
  const [selectedResult, setSelectedResult] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setInitialLoading(true);
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/results`), snap => {
      const d = snap.val();
      const list = d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : [];
      list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0) || (b.date || "").localeCompare(a.date || ""));
      setAllResults(list);
      setVisibleCount(BATCH);
      setFullyLoaded(false);
      setInitialLoading(false);
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

  if (initialLoading) return <Spinner />;

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
          <div
            key={r.key}
            onClick={() => setSelectedResult(r)}
            style={{ borderRadius: 32, overflow: "hidden", transition: "all 0.2s", cursor: "pointer", position: "relative", ...GLASS }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={e => e.currentTarget.style.background = GLASS.background}
          >
            {/* Tap hint */}
            <div style={{ position: "absolute", top: 12, right: 16, color: "rgba(255,255,255,0.2)", fontSize: "0.7rem", letterSpacing: 1, zIndex: 2 }}>TAP FOR DETAILS</div>

            {/* Match image preview intentionally removed */}

            <div style={{ padding: "36px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                {/* Home */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
                  <TeamBadge teamName={r.homeTeam} iconUrl={combined[r.homeTeam]} size={100} />
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", letterSpacing: 1, lineHeight: 1.1 }}>{r.homeTeam}</span>
                  {!isNoContest && homeScorers.length > 0 && (
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
                <div style={{ flexShrink: 0, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 180 }}>
                  <ScoreDisplay r={r} />
                  {r.aggregate && <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>Agg: {r.aggregate}</span>}
                </div>

                {/* Away */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
                  <TeamBadge teamName={r.awayTeam} iconUrl={combined[r.awayTeam]} size={100} />
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", letterSpacing: 1, lineHeight: 1.1 }}>{r.awayTeam}</span>
                  {!isNoContest && awayScorers.length > 0 && (
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
              {(
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 24, justifyContent: "center" }}>
                  {r.date && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)" }}>📅 {r.date}</span>}
                  {r.md && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)" }}>MD {r.md}</span>}
                  {isNoContest && <span style={{ fontSize: "0.95rem", color: "#ffaaaa", background: "rgba(255,100,100,0.1)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,100,100,0.25)" }}>No Contest</span>}
                  {isForfeit && <span style={{ fontSize: "0.95rem", color: "#FFB347", background: "rgba(255,165,0,0.1)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,165,0,0.25)" }}>Forfeit</span>}
                </div>
              )}

              {/* Admin actions — stop propagation so click doesn't open modal */}
              {isAdmin && (
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                  {onEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); onEdit(r); }}
                      style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}
                    >✏️ Edit</button>
                  )}
                  {onDelete && (
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(r.key); }}
                      style={{ background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}
                    >🗑️ Delete</button>
                  )}
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

      {/* Match details popup */}
      <Modal active={!!selectedResult} onClose={() => setSelectedResult(null)}>
        {selectedResult && (
          <MatchDetailsModal fixture={selectedResult} onClose={() => setSelectedResult(null)} />
        )}
      </Modal>
    </div>
  );
}
