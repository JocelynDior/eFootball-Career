import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
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

// ── Squad Popup ───────────────────────────────────────────────────────────────
function SquadPopup({ manager, onClose }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!manager?.team) return;
    const unsub = onValue(ref(db, `career_team_management/${manager.team}/squad`), snap => {
      const data = snap.val();
      setPlayers(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, [manager?.team]);

  const startingPlayers = players.filter(p => p.role === "starting").sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));
  const benchPlayers = players.filter(p => p.role === "bench").sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));

  return ReactDOM.createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif", fontSize: "1rem" }}
      onClick={onClose}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 80px" }} onClick={e => e.stopPropagation()}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <div>
              <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem", letterSpacing: "4px" }}>{manager.team}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem" }}>@{manager.username}</div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "50%", width: "44px", height: "44px", cursor: "pointer", fontSize: "1.2rem", flexShrink: 0 }}>✕</button>
          </div>

          {players.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>👥</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", letterSpacing: "3px" }}>No Team Set Up Yet</div>
            </div>
          ) : (
            <>
              {/* Starting XI */}
              {startingPlayers.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "12px" }}>
                    Starting XI ({startingPlayers.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {startingPlayers.map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "12px" }}>
                        <div style={{ width: "38px", height: "38px", background: "#FF1493", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "0.9rem", flexShrink: 0 }}>
                          {p.shirtNumber || "#"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>
                            {p.position}{p.age ? ` · ${p.age} yrs` : ""}
                          </div>
                        </div>
                        {p.wage && (
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", flexShrink: 0 }}>{p.wage}/wk</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bench */}
              {benchPlayers.length > 0 && (
                <div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "12px" }}>
                    Bench ({benchPlayers.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {benchPlayers.map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}>
                        <div style={{ width: "38px", height: "38px", background: "rgba(255,255,255,0.08)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "0.9rem", flexShrink: 0 }}>
                          {p.shirtNumber || "#"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>
                            {p.position}{p.age ? ` · ${p.age} yrs` : ""}
                          </div>
                        </div>
                        {p.wage && (
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", flexShrink: 0 }}>{p.wage}/wk</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Manager Card ──────────────────────────────────────────────────────────────
function ManagerCard({ manager, teamIcon, onViewSquad }) {
  return (
    <div
      style={{ ...GLASS, borderRadius: "20px", overflow: "hidden", transition: "all 0.25s" }}
      onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ height: "4px", background: "linear-gradient(90deg, #FF1493, #ff69b4, transparent)" }} />
      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: "2.5px solid #FF1493", overflow: "hidden", background: "rgba(255,20,147,0.1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(255,20,147,0.3)" }}>
              {manager.profilePhoto
                ? <img src={manager.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "2rem" }}>👤</span>
              }
            </div>
            <div style={{ position: "absolute", bottom: "-6px", right: "-6px", background: "#FF1493", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 900, color: "#fff", border: "2px solid #0a0015" }}>
              #{manager.rank ?? 0}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{manager.username}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "2px" }}>Manager</div>
          </div>
          {teamIcon && (
            <img src={teamIcon} alt={manager.team} style={{ width: "44px", height: "44px", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,20,147,0.3))", flexShrink: 0 }} />
          )}
        </div>

        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "2px", marginBottom: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {manager.team || "No Club Assigned"}
        </div>

        <button
          onClick={() => onViewSquad(manager)}
          style={{ width: "100%", padding: "14px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.45)", borderRadius: "12px", color: "#FF1493", fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", letterSpacing: "0.5px" }}
          onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}
        >
          👥 View Team
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
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(3rem,8vw,5.5rem)", letterSpacing: "6px", color: "#fff", margin: "0 0 8px", textShadow: "0 0 40px rgba(255,20,147,0.4)" }}>
            ⚔️ RIVALS SQUADS
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.1rem", margin: 0 }}>
            Scout your competition — view every manager's team
          </p>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by team name or manager..."
            style={{ width: "100%", maxWidth: "600px", padding: "18px 24px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "16px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,20,147,0.4), transparent)", marginBottom: "32px" }} />

        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>
          {filtered.length} {filtered.length === 1 ? "Manager" : "Managers"} Found
        </div>

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
