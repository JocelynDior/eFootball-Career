import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

function TeamCircle({ name, iconUrl, size = 90 }) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        style={{ width: size, height: size, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(255,20,147,0.3))" }}
      />
    );
  }
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, rgba(255,20,147,0.2), rgba(255,20,147,0.05))",
      border: "2px solid rgba(255,20,147,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 20px rgba(255,20,147,0.15)",
    }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: size * 0.28 + "px", color: "#FF1493", letterSpacing: 2 }}>
        {initials}
      </span>
    </div>
  );
}

function StadiumSlideshow({ images }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  if (!images.length) {
    return (
      <div style={{ width: "100%", height: 160, background: "rgba(255,255,255,0.04)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.85rem" }}>No stadium photos</span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: 180, borderRadius: 16, overflow: "hidden" }}>
      <img
        src={images[idx]}
        alt="Stadium"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.5s" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.6) 100%)" }} />
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
          {images.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 4, background: i === idx ? "#FF1493" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.3s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MatchDetailsModal({ fixture, onClose }) {
  const { teamIconsCache } = useAdmin();
  const [localIcons, setLocalIcons] = useState({});
  const [stadiumData, setStadiumData] = useState(null);
  const [homeManager, setHomeManager] = useState(null);
  const [awayManager, setAwayManager] = useState(null);
  const [loading, setLoading] = useState(true);

  const homeTeam = fixture?.homeTeam || fixture?.home || "";
  const awayTeam = fixture?.awayTeam || fixture?.away || "";
  const isResult = fixture?.homeScore !== undefined;

  // Load team icons
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.teamIcons), snap => {
      const d = snap.val() || {};
      const map = {};
      for (const [k, v] of Object.entries(d)) {
        map[k] = v?.imageUrl || v;
      }
      setLocalIcons(map);
    });
    return () => unsub();
  }, []);

  // Load home team stadium data
  useEffect(() => {
    if (!homeTeam) return;
    const unsub = onValue(ref(db, `career_team_management/${homeTeam}/stadium`), snap => {
      setStadiumData(snap.val() || null);
    });
    return () => unsub();
  }, [homeTeam]);

  // Load manager names from accounts
  useEffect(() => {
    if (!homeTeam && !awayTeam) return;
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const accounts = snap.val() || {};
      let hm = null, am = null;
      for (const acc of Object.values(accounts)) {
        if (acc.team === homeTeam && acc.role === "manager") hm = acc.username || acc.email;
        if (acc.team === awayTeam && acc.role === "manager") am = acc.username || acc.email;
      }
      setHomeManager(hm);
      setAwayManager(am);
      setLoading(false);
    });
    return () => unsub();
  }, [homeTeam, awayTeam]);

  const combined = { ...localIcons, ...teamIconsCache };
  const homeIcon = combined[homeTeam];
  const awayIcon = combined[awayTeam];
  const stadiumImages = stadiumData?.images || [];
  const stadiumName = stadiumData?.stadiumName || "";

  // Score display
  const isNoContest = fixture?.forfeitType === "no_contest";
  const isForfeit = fixture?.forfeitType && fixture.forfeitType !== "none" && !isNoContest;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Header close */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%", width: 36, height: 36, color: "#fff", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Teams row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        {/* Home */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <TeamCircle name={homeTeam} iconUrl={homeIcon} size={80} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", color: "#fff", letterSpacing: 1, textAlign: "center", lineHeight: 1.1 }}>{homeTeam}</span>
        </div>

        {/* Score or VS */}
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          {isResult ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {isNoContest ? (
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", color: "#ffaaaa", letterSpacing: 4, background: "rgba(0,0,0,0.4)", padding: "10px 20px", borderRadius: 40, border: "1px solid rgba(255,170,170,0.4)" }}>F — F</div>
              ) : (
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#fff", letterSpacing: 4, background: "rgba(0,0,0,0.3)", padding: "10px 24px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.2)" }}>
                  {fixture.homeScore} — {fixture.awayScore}
                </div>
              )}
              {isForfeit && <span style={{ color: "#FFB347", fontSize: "0.75rem", fontWeight: 700 }}>FORFEIT</span>}
              {fixture.md && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>MD {fixture.md}</span>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "rgba(255,255,255,0.35)", letterSpacing: 6 }}>VS</span>
              {fixture.date && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>📅 {fixture.date}</span>}
              {fixture.md && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>MD {fixture.md}</span>}
            </div>
          )}
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <TeamCircle name={awayTeam} iconUrl={awayIcon} size={80} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", color: "#fff", letterSpacing: 1, textAlign: "center", lineHeight: 1.1 }}>{awayTeam}</span>
        </div>
      </div>

      {/* Venue */}
      {stadiumName && (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", textAlign: "center", marginBottom: 8 }}>
          🏟 Venue: <span style={{ color: "#FF1493" }}>{stadiumName}</span>
        </div>
      )}

      {/* Stadium slideshow */}
      <div style={{ marginBottom: 20 }}>
        <StadiumSlideshow images={stadiumImages} />
      </div>

      {/* Divider + Managers */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginBottom: 16 }}>
        {/* Home manager */}
        <div style={{ flex: 1, padding: "14px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "16px 0 0 16px", border: "1px solid rgba(255,255,255,0.08)", borderRight: "none", textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Manager</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem" }}>
            {homeManager ? `@${homeManager}` : <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, fontSize: "0.85rem" }}>Unassigned</span>}
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: "rgba(255,20,147,0.3)", flexShrink: 0 }} />

        {/* Away manager */}
        <div style={{ flex: 1, padding: "14px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "0 16px 16px 0", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "none", textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Manager</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem" }}>
            {awayManager ? `@${awayManager}` : <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, fontSize: "0.85rem" }}>Unassigned</span>}
          </div>
        </div>
      </div>

      {/* Scorers (results only) */}
      {isResult && !isNoContest && (
        <>
          {(fixture.goalScorers?.home?.length > 0 || fixture.goalScorers?.away?.length > 0) && (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, textAlign: "center" }}>⚽ Goal Scorers</div>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  {(fixture.goalScorers?.home || []).map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />}
                      <span style={{ color: "#fff", fontSize: "0.85rem" }}>⚽ {s.player}{s.goals > 1 ? ` (${s.goals})` : ""}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                <div style={{ flex: 1 }}>
                  {(fixture.goalScorers?.away || []).map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, justifyContent: "flex-end" }}>
                      <span style={{ color: "#fff", fontSize: "0.85rem" }}>⚽ {s.player}{s.goals > 1 ? ` (${s.goals})` : ""}</span>
                      {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", marginTop: 12 }}>Loading details...</div>
      )}
    </div>
  );
}
