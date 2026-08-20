import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const FORMATION_LAYOUTS = {
  "4-3-3": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"CM",x:25,y:52 },{ pos:"CM",x:50,y:52 },{ pos:"CM",x:75,y:52 },
    { pos:"LW",x:15,y:28 },{ pos:"ST",x:50,y:22 },{ pos:"RW",x:85,y:28 },
  ],
  "4-4-2": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"LM",x:15,y:50 },{ pos:"CM",x:35,y:50 },{ pos:"CM",x:65,y:50 },{ pos:"RM",x:85,y:50 },
    { pos:"ST",x:35,y:24 },{ pos:"ST",x:65,y:24 },
  ],
  "4-2-3-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"CDM",x:35,y:56 },{ pos:"CDM",x:65,y:56 },
    { pos:"LW",x:15,y:38 },{ pos:"CAM",x:50,y:38 },{ pos:"RW",x:85,y:38 },
    { pos:"ST",x:50,y:20 },
  ],
  "3-5-2": [
    { pos:"GK",x:50,y:90 },
    { pos:"CB",x:25,y:72 },{ pos:"CB",x:50,y:72 },{ pos:"CB",x:75,y:72 },
    { pos:"LWB",x:10,y:52 },{ pos:"CDM",x:30,y:52 },{ pos:"CM",x:50,y:52 },{ pos:"CM",x:70,y:52 },{ pos:"RWB",x:90,y:52 },
    { pos:"ST",x:35,y:24 },{ pos:"ST",x:65,y:24 },
  ],
  "5-3-2": [
    { pos:"GK",x:50,y:90 },
    { pos:"LWB",x:10,y:70 },{ pos:"CB",x:28,y:74 },{ pos:"CB",x:50,y:75 },{ pos:"CB",x:72,y:74 },{ pos:"RWB",x:90,y:70 },
    { pos:"CM",x:25,y:50 },{ pos:"CM",x:50,y:48 },{ pos:"CM",x:75,y:50 },
    { pos:"ST",x:35,y:24 },{ pos:"ST",x:65,y:24 },
  ],
  "4-1-4-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"CDM",x:50,y:58 },
    { pos:"LM",x:12,y:42 },{ pos:"CM",x:35,y:42 },{ pos:"CM",x:65,y:42 },{ pos:"RM",x:88,y:42 },
    { pos:"ST",x:50,y:20 },
  ],
  "3-4-3": [
    { pos:"GK",x:50,y:90 },
    { pos:"CB",x:25,y:72 },{ pos:"CB",x:50,y:72 },{ pos:"CB",x:75,y:72 },
    { pos:"LM",x:12,y:52 },{ pos:"CM",x:35,y:52 },{ pos:"CM",x:65,y:52 },{ pos:"RM",x:88,y:52 },
    { pos:"LW",x:15,y:26 },{ pos:"ST",x:50,y:20 },{ pos:"RW",x:85,y:26 },
  ],
  "5-4-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"LWB",x:10,y:70 },{ pos:"CB",x:28,y:74 },{ pos:"CB",x:50,y:75 },{ pos:"CB",x:72,y:74 },{ pos:"RWB",x:90,y:70 },
    { pos:"LM",x:15,y:48 },{ pos:"CM",x:35,y:48 },{ pos:"CM",x:65,y:48 },{ pos:"RM",x:85,y:48 },
    { pos:"ST",x:50,y:22 },
  ],
  "4-5-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"LM",x:10,y:48 },{ pos:"CM",x:28,y:50 },{ pos:"CM",x:50,y:48 },{ pos:"CM",x:72,y:50 },{ pos:"RM",x:90,y:48 },
    { pos:"ST",x:50,y:22 },
  ],
  "3-6-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"CB",x:25,y:72 },{ pos:"CB",x:50,y:72 },{ pos:"CB",x:75,y:72 },
    { pos:"LM",x:8,y:52 },{ pos:"CDM",x:25,y:52 },{ pos:"CM",x:40,y:52 },{ pos:"CM",x:60,y:52 },{ pos:"CDM",x:75,y:52 },{ pos:"RM",x:92,y:52 },
    { pos:"ST",x:50,y:22 },
  ],
};

const POS_GROUP = {
  GK:["GK"], LB:["LB","LWB"], RB:["RB","RWB"], LWB:["LWB","LB"], RWB:["RWB","RB"],
  CB:["CB"], CDM:["CDM","CM"], CM:["CM","CDM","CAM"], CAM:["CAM","CM"],
  LM:["LM","LW"], RM:["RM","RW"], LW:["LW","LM"], RW:["RW","RM"],
  CF:["CF","ST"], ST:["ST","CF"],
};

function buildPitchDisplay(slots, startingPlayers) {
  const used = new Set();
  return slots.map(slot => {
    let match = startingPlayers.find(p => !used.has(p.id) && p.position === slot.pos);
    if (!match) {
      const group = POS_GROUP[slot.pos] || [slot.pos];
      match = startingPlayers.find(p => !used.has(p.id) && group.includes(p.position));
    }
    if (match) used.add(match.id);
    return { slot, player: match || null };
  });
}

// ── Squad Popup ──────────────────────────────────────────────────────────────
function SquadPopup({ manager, onClose }) {
  const [squad, setSquad] = useState([]);
  const [formation, setFormation] = useState("4-3-3");

  useEffect(() => {
    if (!manager?.team) return;
    const unsub = onValue(ref(db, `career_team_management/${manager.team}/squad`), snap => {
      const data = snap.val();
      setSquad(data ? Object.entries(data).map(([id, p]) => ({ id, ...p })) : []);
    });
    const fUnsub = onValue(ref(db, `career_team_management/${manager.team}/formation`), snap => {
      if (snap.val()) setFormation(snap.val());
    });
    return () => { unsub(); fUnsub(); };
  }, [manager?.team]);

  const slots = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-3-3"];
  const startingPlayers = squad.filter(p => p.role === "starting");
  const benchPlayers = squad.filter(p => p.role === "bench");
  const pitchDisplay = buildPitchDisplay(slots, startingPlayers);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={onClose}>
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 80px" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", maxWidth: "900px", margin: "0 auto 24px" }}>
          <div>
            <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "4px" }}>{manager.team}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.1rem" }}>@{manager.username} · Formation: <span style={{ color: "#fff", fontWeight: 700 }}>{formation}</span></div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "50%", width: "48px", height: "48px", cursor: "pointer", fontSize: "1.4rem", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {squad.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.25)" }}>
              <div style={{ fontSize: "4rem", marginBottom: "16px" }}>👥</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px" }}>No Squad Set Up Yet</div>
            </div>
          ) : (
            <>
              {/* Pitch */}
              <div style={{ position: "relative", width: "100%", paddingBottom: "140%", background: "linear-gradient(180deg,#1a5c1a 0%,#2d8c2d 20%,#1a5c1a 40%,#2d8c2d 60%,#1a5c1a 80%,#2d8c2d 100%)", borderRadius: "20px", border: "3px solid rgba(255,255,255,0.15)", overflow: "hidden", marginBottom: "32px" }}>
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 140" preserveAspectRatio="none">
                  <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <rect x="22" y="2" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <rect x="22" y="118" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                </svg>
                {pitchDisplay.map(({ slot, player }, i) => (
                  <div key={i} style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                    <div style={{ width: "80px", height: "80px", background: player ? "#FF1493" : "rgba(255,255,255,0.12)", borderRadius: "12px", border: player ? "2px solid #fff" : "2px dashed rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: player ? "0 2px 18px rgba(255,20,147,0.6)" : "none" }}>
                      <span style={{ color: "#fff", fontWeight: 900, fontSize: "1.5rem" }}>{player ? (player.shirtNumber || "#") : slot.pos}</span>
                    </div>
                    <div style={{ color: player ? "#fff" : "rgba(255,255,255,0.25)", fontSize: "0.8rem", fontWeight: 700, marginTop: "4px", textAlign: "center", maxWidth: "72px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 4px rgba(0,0,0,0.9)", background: "rgba(0,0,0,0.5)", borderRadius: "4px", padding: "2px 6px" }}>
                      {player ? player.name.split(" ").pop() : slot.pos}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bench */}
              {benchPlayers.length > 0 && (
                <div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "14px" }}>Bench ({benchPlayers.length})</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
                    {benchPlayers.map((p, i) => (
                      <div key={i} style={{ ...GLASS, borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "42px", height: "42px", background: "rgba(255,255,255,0.1)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "1rem", flexShrink: 0 }}>{p.shirtNumber || "#"}</div>
                        <div>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.name}</div>
                          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>{p.position}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Manager Card ─────────────────────────────────────────────────────────────
function ManagerCard({ manager, teamIcon, onViewSquad }) {
  return (
    <div style={{ ...GLASS, borderRadius: "20px", overflow: "hidden", transition: "all 0.25s" }}
      onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Top accent */}
      <div style={{ height: "4px", background: "linear-gradient(90deg, #FF1493, #ff69b4, transparent)" }} />

      <div style={{ padding: "24px" }}>
        {/* Profile + rank */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: "2.5px solid #FF1493", overflow: "hidden", background: "rgba(255,20,147,0.1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(255,20,147,0.3)" }}>
              {manager.profilePhoto
                ? <img src={manager.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "2rem" }}>👤</span>
              }
            </div>
            {/* Rank badge */}
            <div style={{ position: "absolute", bottom: "-6px", right: "-6px", background: "#FF1493", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 900, color: "#fff", border: "2px solid #0a0015" }}>
              #{manager.rank ?? 0}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{manager.username}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "2px" }}>Manager</div>
          </div>

          {/* Team icon */}
          {teamIcon && (
            <img src={teamIcon} alt={manager.team} style={{ width: "44px", height: "44px", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,20,147,0.3))", flexShrink: 0 }} />
          )}
        </div>

        {/* Team name */}
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "2px", marginBottom: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {manager.team || "No Club Assigned"}
        </div>

        {/* View Squad button */}
        <button
          onClick={() => onViewSquad(manager)}
          style={{ width: "100%", padding: "14px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.45)", borderRadius: "12px", color: "#FF1493", fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", letterSpacing: "0.5px" }}
          onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}
        >
          👥 View Squad
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RivalsSquadPage() {
  const [managers, setManagers] = useState([]);
  const [teamIcons, setTeamIcons] = useState({});
  const [search, setSearch] = useState("");
  const [viewingManager, setViewingManager] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const mgrs = Object.entries(data)
        .filter(([, a]) => a.role === "manager" && a.team)
        .map(([uid, a]) => ({ uid, ...a, rank: a.rank ?? 0 }))
        .sort((a, b) => (a.rank || 999) - (b.rank || 999));
      setManagers(mgrs);
    });
    const iconUnsub = onValue(ref(db, PATHS.teamIcons), snap => {
      if (snap.val()) setTeamIcons(snap.val());
    });
    return () => { unsub(); iconUnsub(); };
  }, []);

  const filtered = managers.filter(m =>
    m.team?.toLowerCase().includes(search.toLowerCase()) ||
    m.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      <div style={{ padding: "32px 20px 80px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(3rem,8vw,5.5rem)", letterSpacing: "6px", color: "#fff", margin: "0 0 8px", textShadow: "0 0 40px rgba(255,20,147,0.4)" }}>
            ⚔️ RIVALS SQUADS
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.1rem", margin: 0 }}>
            Scout your competition — view every manager's squad
          </p>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: "32px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by team name or manager..."
            style={{ width: "100%", maxWidth: "600px", padding: "18px 24px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "16px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,20,147,0.4), transparent)", marginBottom: "32px" }} />

        {/* Count */}
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>
          {filtered.length} {filtered.length === 1 ? "Manager" : "Managers"} Found
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: "4rem", marginBottom: "16px" }}>⚔️</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px" }}>
              {search ? "No Matches Found" : "No Managers Yet"}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {filtered.map(m => (
              <ManagerCard
                key={m.uid}
                manager={m}
                teamIcon={teamIcons[m.team]}
                onViewSquad={setViewingManager}
              />
            ))}
          </div>
        )}
      </div>

      {viewingManager && (
        <SquadPopup manager={viewingManager} onClose={() => setViewingManager(null)} />
      )}

      <style>{`input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
