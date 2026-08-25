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
      <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <img src={url} alt={teamName} style={{ width: 80, height: 80, objectFit: "contain" }} />
      </div>
    );
  }
  const initials = (teamName || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
  return (
    <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "#fff", letterSpacing: 2 }}>{initials}</span>
    </div>
  );
}

export default function FixturesList({ league, season, onEdit, onDelete, onAddResult }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  // load badges from career_team_management
  const [badges, setBadges] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/fixtures`), snap => {
      const d = snap.val();
      setFixtures(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []);
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

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sorted = [...fixtures].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    const ua = ta >= today.getTime();
    const ub = tb >= today.getTime();
    if (ua && !ub) return -1;
    if (!ua && ub) return 1;
    return ta - tb;
  });

  if (loading) return <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)" }}>Loading…</div>;

  if (!sorted.length) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📅</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: 3 }}>No Fixtures Scheduled</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {sorted.map(f => (
        <div key={f.key} style={{ borderRadius: 32, padding: "32px 40px", transition: "all 0.2s", ...GLASS }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          {/* Teams row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            {/* Home */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              {getTeamBadge(f.home || f.homeTeam, combined)}
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", letterSpacing: 1, lineHeight: 1.1 }}>{f.home || f.homeTeam}</span>
            </div>

            {/* Center */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0, minWidth: 120 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", color: "#fff", letterSpacing: 8 }}>VS</span>
              {f.aggregate && <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", fontFamily: "'Rajdhani', sans-serif" }}>Agg: {f.aggregate}</span>}
            </div>

            {/* Away */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              {getTeamBadge(f.away || f.awayTeam, combined)}
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", letterSpacing: 1, lineHeight: 1.1 }}>{f.away || f.awayTeam}</span>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 24, justifyContent: "center" }}>
            {f.date && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', sans-serif" }}>📅 {f.date}</span>}
            {f.venue && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', sans-serif" }}>📍 {f.venue}</span>}
            {f.description && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', sans-serif" }}>{f.description}</span>}
            {f.md && <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.25)", padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', sans-serif" }}>MD {f.md}</span>}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              {onAddResult && (
                <button onClick={() => onAddResult(f)} style={{ background: "rgba(50,200,100,0.2)", border: "1px solid rgba(50,200,100,0.3)", color: "#5dde8a", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}>+ Add Result</button>
              )}
              {onEdit && (
                <button onClick={() => onEdit(f)} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}>✏️ Edit</button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(f.key)} style={{ background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "10px 24px", borderRadius: 24, cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit" }}>🗑️ Delete</button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
