import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.4)",
  borderRadius: 10, color: "#fff",
  fontFamily: "inherit", fontSize: "0.9rem",
  outline: "none", boxSizing: "border-box",
};

const BATCH = 5;

function TeamBadge({ teamName, iconUrl, size = 80 }) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={teamName}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  const initials = (teamName || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", color: "#fff", letterSpacing: 2 }}>{initials}</span>
    </div>
  );
}

export default function FixturesList({ tournamentName }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [allFixtures, setAllFixtures] = useState([]);
  const [teamFilter, setTeamFilter] = useState("all");
  const [badges, setBadges] = useState({});
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fullyLoaded, setFullyLoaded] = useState(false);
  const timerRef = useRef(null);

  const normalizedTarget = (tournamentName || "").trim().toLowerCase().replace(/\s+/g, " ");

  useEffect(() => {
    if (!normalizedTarget) return;
    const unsub = onValue(ref(db, "career_calendarEvents"), snap => {
      const data = snap.val() || {};
      const fixtures = [];
      for (const [dateKey, dateData] of Object.entries(data)) {
        if (!dateData?.tournaments) continue;
        for (const [tournKey, tourn] of Object.entries(dateData.tournaments)) {
          if (!tourn?.name) continue;
          const normalized = tourn.name.trim().toLowerCase().replace(/\s+/g, " ");
          if (normalized !== normalizedTarget) continue;
          for (const [fixKey, fix] of Object.entries(tourn.fixtures || {})) {
            if (fix?.home && fix?.away) {
              fixtures.push({
                date: dateKey,
                home: fix.home,
                away: fix.away,
                tournament: tourn.name,
                // Store all keys needed for delete
                dateKey,
                tournKey,
                fixKey,
              });
            }
          }
        }
      }
      fixtures.sort((a, b) => a.date.localeCompare(b.date));
      setAllFixtures(fixtures);
      setVisibleCount(BATCH);
      setFullyLoaded(false);
    });
    return () => unsub();
  }, [normalizedTarget]);

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

  const allTeams = [...new Set(allFixtures.flatMap(f => [f.home, f.away]))].sort();
  const filtered = teamFilter === "all"
    ? allFixtures
    : allFixtures.filter(f => f.home === teamFilter || f.away === teamFilter);

  // Progressive reveal over filtered list
  useEffect(() => {
    if (filtered.length === 0) { setFullyLoaded(true); return; }
    if (visibleCount >= filtered.length) { setFullyLoaded(true); setLoadingMore(false); return; }

    setLoadingMore(true);
    timerRef.current = setTimeout(() => {
      setVisibleCount(prev => {
        const next = prev + BATCH;
        if (next >= filtered.length) setFullyLoaded(true);
        return next;
      });
      setLoadingMore(false);
    }, 600);

    return () => clearTimeout(timerRef.current);
  }, [visibleCount, filtered.length]);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(BATCH);
    setFullyLoaded(false);
  }, [teamFilter]);

  async function handleDeleteFixture(fix) {
    if (!confirm(`Delete fixture: ${fix.home} vs ${fix.away}?`)) return;
    try {
      await remove(ref(db, `career_calendarEvents/${fix.dateKey}/tournaments/${fix.tournKey}/fixtures/${fix.fixKey}`));
    } catch (e) {
      alert("Error deleting fixture: " + e.message);
    }
  }

  const visibleFixtures = filtered.slice(0, visibleCount);

  // Group visible fixtures by date
  const grouped = {};
  for (const fix of visibleFixtures) {
    if (!grouped[fix.date]) grouped[fix.date] = [];
    grouped[fix.date].push(fix);
  }

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  if (!allFixtures.length) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📅</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "3px" }}>No Fixtures Found</div>
        <div style={{ fontSize: "0.85rem", marginTop: 8, color: "rgba(255,255,255,0.25)" }}>
          Add "{tournamentName}" fixtures in the Calendar page.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Team filter */}
      <div style={{ marginBottom: 20 }}>
        <select
          value={teamFilter}
          onChange={e => setTeamFilter(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320, cursor: "pointer" }}
        >
          <option value="all">All Teams</option>
          {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>
          No fixtures for selected team.
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([dateStr, fixes]) => (
            <div key={dateStr} style={{ marginBottom: 32 }}>
              <div style={{ display: "inline-block", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 30, padding: "6px 20px", marginBottom: 16, color: "#FF1493", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "1px" }}>
                📅 {formatDate(dateStr)}
              </div>

              {fixes.map((fix, fi) => (
                <div key={`${fix.dateKey}-${fix.tournKey}-${fix.fixKey}`} style={{ ...GLASS, borderRadius: 20, padding: "28px 32px", marginBottom: 14, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
                    {/* Home */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                      <TeamBadge teamName={fix.home} iconUrl={combined[fix.home]} size={80} />
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#fff", letterSpacing: 1, lineHeight: 1.1 }}>{fix.home}</span>
                    </div>

                    {/* VS */}
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "rgba(255,255,255,0.4)", letterSpacing: "6px" }}>VS</span>
                    </div>

                    {/* Away */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                      <TeamBadge teamName={fix.away} iconUrl={combined[fix.away]} size={80} />
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#fff", letterSpacing: 1, lineHeight: 1.1 }}>{fix.away}</span>
                    </div>
                  </div>

                  {/* Admin delete button */}
                  {isAdmin && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                      <button
                        onClick={() => handleDeleteFixture(fix)}
                        style={{ background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "8px 20px", borderRadius: 20, cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, fontFamily: "inherit" }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Loading more indicator */}
          {!fullyLoaded && (
            <div style={{ textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 18, height: 18, border: "2px solid rgba(255,20,147,0.3)", borderTop: "2px solid #FF1493", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Loading more fixtures…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </>
      )}
    </div>
  );
}
