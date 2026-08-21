import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import { db, PATHS } from "../firebase";
import { ref, set, onValue, remove, push, update } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";

const POSITIONS = ["GK", "LB", "CB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"];

const STARTING_SLOTS = ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CM", "RW", "ST", "LW"];
const BENCH_SLOTS = ["GK", "DEF", "DEF", "MID", "MID", "MID", "MID", "ATT", "ATT", "ATT", "SUB", "SUB"];

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

// Doubled styles for the popup
const inputStyle = {
  width: "100%",
  padding: "28px 36px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "12px",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: "2rem",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  color: "rgba(255,255,255,0.65)",
  fontSize: "1.7rem",
  display: "block",
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  fontWeight: 700,
};

// ── Player Popup (no AI, manual entry + admin verification) ──────────────
function PlayerSlotPopup({ slotIndex, role, existingPlayer, teamPath, team, isAdmin, onClose }) {
  const [name, setName] = useState(existingPlayer?.name || "");
  const [shirtNumber, setShirtNumber] = useState(existingPlayer?.shirtNumber || "");
  const [position, setPosition] = useState(existingPlayer?.position || "");
  const [wage, setWage] = useState(existingPlayer?.wage || "");
  const [verified, setVerified] = useState(existingPlayer?.verified || false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("Player name is required."); return; }
    if (!position) { setError("Please select a position."); return; }
    setSaving(true);
    setError("");
    try {
      const playerId = existingPlayer?.id || `${role}_${slotIndex}_${Date.now()}`;
      await set(ref(db, `${teamPath}/${playerId}`), {
        id: playerId,
        name: name.trim(),
        shirtNumber: shirtNumber || "",
        position,
        wage: wage || "",
        verified: verified,
        role,
        slotIndex,
      });
      onClose();
    } catch (e) {
      setError("Save failed: " + e.message);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!existingPlayer?.id) return;
    if (!window.confirm("Remove this player?")) return;
    setDeleting(true);
    try {
      await remove(ref(db, `${teamPath}/${existingPlayer.id}`));
      onClose();
    } catch (e) {
      setError("Delete failed: " + e.message);
    }
    setDeleting(false);
  }

  // Toggle verification (admin only)
  function toggleVerified() {
    if (!isAdmin) return;
    setVerified(!verified);
  }

  return ReactDOM.createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Inter', sans-serif", fontSize: "1rem" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#0a0015", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "24px", padding: "64px", maxWidth: "960px", width: "100%", position: "relative", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "64px", height: "64px", cursor: "pointer", fontSize: "1rem" }}>✕</button>

        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "2px", marginBottom: "6px" }}>
          {existingPlayer ? "EDIT PLAYER" : "ADD PLAYER"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.7rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>
          {role === "starting" ? `Starting XI · Slot ${slotIndex + 1}` : role === "bench" ? `Bench · Slot ${slotIndex + 1}` : `Reserve · Slot ${slotIndex + 1}`}
        </div>

        {/* Name */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Player Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kylian Mbappe" style={inputStyle} />
        </div>

        {/* Number & Position */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>Shirt Number</label>
            <input value={shirtNumber} onChange={e => setShirtNumber(e.target.value)} placeholder="#" style={inputStyle} type="number" />
          </div>
          <div>
            <label style={labelStyle}>Position</label>
            <select value={position} onChange={e => setPosition(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Select...</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Wage */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Weekly Wage</label>
          <input value={wage} onChange={e => setWage(e.target.value)} placeholder="e.g. €50,000" style={inputStyle} />
        </div>

        {/* Admin verification toggle */}
        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", padding: "16px 20px", background: "rgba(255,20,147,0.06)", borderRadius: "12px" }}>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.8rem", fontWeight: 600 }}>Verified Status:</span>
            <button
              onClick={toggleVerified}
              style={{
                padding: "10px 24px",
                background: verified ? "#00cc66" : "#ff4444",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.6rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {verified ? "✅ Verified" : "❌ Unverified"}
            </button>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem" }}>(Admin only)</span>
          </div>
        )}

        {/* Non‑admin sees status only */}
        {!isAdmin && existingPlayer && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", padding: "12px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.6rem" }}>Status:</span>
            <span style={{ color: verified ? "#00ff88" : "#ff6b6b", fontWeight: 700, fontSize: "1.8rem" }}>
              {verified ? "✅ Verified" : "❌ Unverified"}
            </span>
          </div>
        )}

        {error && (
          <div style={{ color: "#ff6b6b", fontSize: "1.8rem", marginBottom: "14px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "2rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : "💾 Save"}
          </button>
          {existingPlayer && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ flex: 1, padding: "14px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.4)", borderRadius: "12px", color: "#ff6b6b", fontWeight: 700, fontSize: "2rem", cursor: deleting ? "not-allowed" : "pointer" }}
            >
              {deleting ? "..." : "🗑️"}
            </button>
          )}
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "12px", color: "#fff", fontSize: "2rem", cursor: "pointer" }}
          >
            Discard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Player Slot ──────────────────────────────────────────────────────────
function PlayerSlot({ index, role, player, label, teamPath, team, isAdmin }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "14px 18px",
          background: player ? "rgba(255,20,147,0.06)" : "rgba(255,255,255,0.02)",
          border: player ? "1px solid rgba(255,20,147,0.25)" : "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.background = player ? "rgba(255,20,147,0.1)" : "rgba(255,255,255,0.05)"; }}
        onMouseOut={e => { e.currentTarget.style.borderColor = player ? "rgba(255,20,147,0.25)" : "rgba(255,255,255,0.07)"; e.currentTarget.style.background = player ? "rgba(255,20,147,0.06)" : "rgba(255,255,255,0.02)"; }}
      >
        <div style={{
          width: "42px", height: "42px", flexShrink: 0,
          background: player ? "#FF1493" : "rgba(255,255,255,0.06)",
          border: player ? "none" : "1px dashed rgba(255,255,255,0.15)",
          borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 900, fontSize: player ? "2rem" : "2.6rem",
        }}>
          {player ? (player.shirtNumber || "#") : "+"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {player ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {player.name}
                </span>
                {/* Verification badge */}
                <span style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  padding: "2px 12px",
                  borderRadius: "20px",
                  background: player.verified ? "rgba(0,255,136,0.15)" : "rgba(255,50,50,0.15)",
                  border: `1px solid ${player.verified ? "rgba(0,255,136,0.3)" : "rgba(255,50,50,0.3)"}`,
                  color: player.verified ? "#00ff88" : "#ff6b6b",
                  whiteSpace: "nowrap",
                }}>
                  {player.verified ? "✅ Verified" : "❌ Unverified"}
                </span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.6rem", marginTop: "2px" }}>
                {player.position} {player.wage ? `· ${player.wage}/wk` : ""}
              </div>
            </>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.8rem" }}>Add {label}</div>
          )}
        </div>

        {player ? (
          <span style={{ color: "rgba(255,20,147,0.6)", fontSize: "1.7rem", flexShrink: 0 }}>✏️</span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "2.4rem", flexShrink: 0 }}>+</span>
        )}
      </div>

      {open && (
        <PlayerSlotPopup
          slotIndex={index}
          role={role}
          existingPlayer={player}
          teamPath={teamPath}
          team={team}
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Main Squad Page ──────────────────────────────────────────────────────
export default function SquadPage() {
  const navigate = useNavigate();
  const { isAdmin, manager, managerLoading, teamIconsCache } = useAdmin();
  const [players, setPlayers] = useState([]);
  const [adminTeam, setAdminTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamIcon, setTeamIcon] = useState(null);
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);
  const [defaultError, setDefaultError] = useState("");

  const team = manager?.team || adminTeam;
  const teamPath = team ? `career_team_management/${team}/squad` : null;

  // Load team icon
  useEffect(() => {
    if (!team || !teamIconsCache) return;
    const icon = teamIconsCache?.[team];
    if (icon) setTeamIcon(icon);
  }, [team, teamIconsCache]);

  // Load squad from Firebase
  useEffect(() => {
    if (!teamPath) return;
    const unsub = onValue(ref(db, teamPath), snap => {
      const data = snap.val();
      setPlayers(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, [teamPath]);

  // Load teams for admin selector
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const t = [...new Set(Object.values(data).filter(a => a.team).map(a => a.team))];
      setTeams(t);
    });
    return () => unsub();
  }, [isAdmin]);

  const startingPlayers = players.filter(p => p.role === "starting");
  const benchPlayers = players.filter(p => p.role === "bench");
  const reservePlayers = players.filter(p => p.role === "reserve");

  function getPlayerForSlot(role, index) {
    const list = role === "starting" ? startingPlayers : role === "bench" ? benchPlayers : reservePlayers;
    return list.find(p => p.slotIndex === index) || null;
  }

  // ─── Add Reserve ──────────────────────────────────────────────────────
  async function handleAddReserve() {
    if (!teamPath) return;
    const maxSlot = reservePlayers.reduce((max, p) => Math.max(max, p.slotIndex || 0), -1);
    const newIndex = maxSlot + 1;
    const newId = `reserve_${newIndex}_${Date.now()}`;
    try {
      await set(ref(db, `${teamPath}/${newId}`), {
        id: newId,
        name: "",
        shirtNumber: "",
        position: "",
        wage: "",
        verified: false,
        role: "reserve",
        slotIndex: newIndex,
      });
    } catch (e) {
      console.error("Failed to add reserve slot:", e);
    }
  }

  // ─── Set Default Squad (Admin only, from Fotmob) ────────────────────
  async function handleSetDefaultSquad() {
    if (!team || !isAdmin) return;
    if (startingPlayers.length > 0 || benchPlayers.length > 0) {
      if (!window.confirm("This will overwrite your current Starting XI and Bench. Are you sure?")) return;
    }

    setIsLoadingDefault(true);
    setDefaultError("");

    try {
      const searchRes = await fetch(
        `https://www.fotmob.com/api/search?term=${encodeURIComponent(team)}`,
        { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
      );
      if (!searchRes.ok) throw new Error("Fotmob search failed");
      const searchData = await searchRes.json();
      const teamHit = searchData?.teams?.[0];
      if (!teamHit) throw new Error(`Team "${team}" not found on Fotmob.`);

      const teamId = teamHit.id;
      const squadRes = await fetch(
        `https://www.fotmob.com/api/teams?id=${teamId}`,
        { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
      );
      if (!squadRes.ok) throw new Error("Failed to fetch squad data");
      const squadData = await squadRes.json();
      const squad = squadData?.squad || [];
      if (!squad.length) throw new Error(`No squad data available for "${team}" on Fotmob.`);

      // Position mapping (same as before)
      const positionMap = {
        GK: "GK",
        LB: "LB", LWB: "LWB",
        RB: "RB", RWB: "RWB",
        CB: "CB",
        CDM: "CDM", CM: "CM", CAM: "CAM",
        LM: "LM", RM: "RM",
        LW: "LW", RW: "RW",
        CF: "CF", ST: "ST"
      };

      const startingSlotsCopy = [...STARTING_SLOTS];
      const benchSlotsCopy = [...BENCH_SLOTS];
      const assignedStarting = [];
      const assignedBench = [];
      const skipped = [];

      function findSlotIndex(position, slots, usedIndices) {
        for (let i = 0; i < slots.length; i++) {
          if (usedIndices.includes(i)) continue;
          const slotPos = slots[i];
          if (slotPos === position) return i;
        }
        return -1;
      }

      for (const p of squad) {
        const pos = p.position || "";
        let mappedPos = "";
        for (const [key, val] of Object.entries(positionMap)) {
          if (pos.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(pos.toLowerCase())) {
            mappedPos = val;
            break;
          }
        }
        if (!mappedPos) {
          skipped.push(p.name);
          continue;
        }

        let idx = findSlotIndex(mappedPos, startingSlotsCopy, assignedStarting);
        if (idx !== -1) {
          assignedStarting.push(idx);
          assignedStarting[idx] = {
            id: `default_starting_${idx}_${Date.now()}`,
            name: p.name || "Unknown",
            shirtNumber: p.shirtNumber || "",
            position: mappedPos,
            wage: p.wage || "",
            verified: false, // default unverified
            role: "starting",
            slotIndex: idx,
          };
          continue;
        }

        idx = findSlotIndex(mappedPos, benchSlotsCopy, assignedBench);
        if (idx !== -1) {
          assignedBench.push(idx);
          assignedBench[idx] = {
            id: `default_bench_${idx}_${Date.now()}`,
            name: p.name || "Unknown",
            shirtNumber: p.shirtNumber || "",
            position: mappedPos,
            wage: p.wage || "",
            verified: false,
            role: "bench",
            slotIndex: idx,
          };
          continue;
        }

        skipped.push(p.name);
      }

      const updates = {};
      const existingIds = players.filter(p => p.role === "starting" || p.role === "bench").map(p => p.id);
      for (const id of existingIds) {
        updates[`${teamPath}/${id}`] = null;
      }

      for (let i = 0; i < startingSlotsCopy.length; i++) {
        const p = assignedStarting[i];
        if (p) {
          updates[`${teamPath}/${p.id}`] = p;
        }
      }
      for (let i = 0; i < benchSlotsCopy.length; i++) {
        const p = assignedBench[i];
        if (p) {
          updates[`${teamPath}/${p.id}`] = p;
        }
      }

      await update(ref(db), updates);

      const totalAssigned = assignedStarting.filter(Boolean).length + assignedBench.filter(Boolean).length;
      let msg = `✅ Loaded ${totalAssigned} players (all unverified).`;
      if (skipped.length) {
        msg += ` ${skipped.length} player(s) couldn't be mapped and were skipped: ${skipped.join(", ")}`;
      }
      setDefaultError(msg);
      setTimeout(() => setDefaultError(""), 8000);
    } catch (e) {
      setDefaultError(e.message || "An error occurred while fetching the squad.");
    }
    setIsLoadingDefault(false);
  }

  // ─── Loading / Auth states ──────────────────────────────────────────
  if (managerLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo />
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin && !manager) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo />
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 20px" }}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "48px 36px", maxWidth: "480px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "7rem", marginBottom: "16px" }}>🔒</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "6rem", letterSpacing: "3px", color: "#FF1493", margin: "0 0 10px" }}>Manager Login Required</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "2.8rem" }}>Sign in as a manager to manage your squad.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin && !team) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo />
        <Navbar />
        <div style={{ padding: "32px 20px 80px" }}>
          <div style={{ ...GLASS, borderRadius: "20px", padding: "32px", maxWidth: "480px", margin: "60px auto", textAlign: "center" }}>
            <div style={{ fontSize: "6rem", marginBottom: "16px" }}>🔧</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px", color: "#FF1493", margin: "0 0 8px" }}>SELECT TEAM</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "24px", fontSize: "2rem" }}>Choose a team to edit their squad.</p>
            <select
              onChange={e => setAdminTeam(e.target.value)}
              defaultValue=""
              style={{ width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "14px", color: "#fff", fontFamily: "inherit", fontSize: "2.2rem", outline: "none", marginBottom: "16px", cursor: "pointer" }}
            >
              <option value="">— Select a team —</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={() => navigate("/team-management")}
              style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "2rem", fontFamily: "inherit" }}
            >
              ← Back to Team Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      <div style={{ padding: "32px 20px 80px", margin: "0 auto" }}>

        <button
          onClick={() => navigate("/team-management")}
          style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", padding: "10px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "12px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "1.9rem", fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.6)"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
        >
          ← Back to Team Management
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: "64px", height: "64px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {teamIcon ? (
                <img src={teamIcon} alt={team} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 0 16px rgba(255,20,147,0.4))" }} />
              ) : (
                <div style={{ width: "64px", height: "64px", background: "rgba(255,20,147,0.1)", border: "2px solid rgba(255,20,147,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>👥</div>
              )}
            </div>
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "6rem", letterSpacing: "4px", color: "#fff", margin: "0 0 4px" }}>
                SQUAD
              </h1>
              <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "2.2rem", letterSpacing: "1px" }}>{team}</div>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleSetDefaultSquad}
              disabled={isLoadingDefault}
              style={{
                padding: "16px 32px",
                background: isLoadingDefault ? "rgba(255,20,147,0.3)" : "#FF1493",
                border: "none",
                borderRadius: "14px",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.8rem",
                cursor: isLoadingDefault ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 0 20px rgba(255,20,147,0.3)",
              }}
            >
              {isLoadingDefault ? "⏳ Loading..." : "⚡ Set Default Squad"}
            </button>
          )}
        </div>

        {defaultError && (
          <div style={{
            padding: "16px 24px",
            borderRadius: "12px",
            marginBottom: "20px",
            background: defaultError.startsWith("✅") ? "rgba(0,255,136,0.1)" : "rgba(255,50,50,0.1)",
            border: `1px solid ${defaultError.startsWith("✅") ? "rgba(0,255,136,0.3)" : "rgba(255,50,50,0.3)"}`,
            color: defaultError.startsWith("✅") ? "#00ff88" : "#ff6b6b",
            fontSize: "1.8rem",
          }}>
            {defaultError}
          </div>
        )}

        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,20,147,0.4), transparent)", marginBottom: "28px" }} />

        {/* ─── DISCLAIMER ────────────────────────────────────────────────── */}
        <div style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: "14px", padding: "18px 24px", marginBottom: "28px" }}>
          <div style={{ color: "#ffaa00", fontWeight: 800, fontSize: "1.8rem", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>⚠️ DISCLAIMER</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.8rem", lineHeight: 1.6 }}>
            Only add real players currently signed to <strong>"{team}"</strong>. No retired or unsigned players.
            <br />
            <span style={{ color: "#ffaa00" }}>
              You may use players you have signed from other clubs, or players that don't belong to your original team, provided they are under 75 rating on eFootball and they don't belong to another manager in the community.
            </span>
          </div>
        </div>

        {/* ─── STARTING XI ────────────────────────────────────────────── */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "3px" }}>
              Starting XI
            </div>
            <span style={{ color: startingPlayers.length === 11 ? "#00ff88" : "rgba(255,255,255,0.3)", fontSize: "1.7rem", fontWeight: 700, background: startingPlayers.length === 11 ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${startingPlayers.length === 11 ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)"}` }}>
              {startingPlayers.length === 11 ? "✅ Full Squad" : `${startingPlayers.length} / 11`}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {STARTING_SLOTS.map((posLabel, i) => (
              <PlayerSlot
                key={i}
                index={i}
                role="starting"
                player={getPlayerForSlot("starting", i)}
                label={posLabel}
                teamPath={teamPath}
                team={team}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>

        {/* ─── BENCH ────────────────────────────────────────────────────── */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "3px" }}>
              Bench
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.7rem", fontWeight: 700, background: "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)" }}>
              {benchPlayers.length} / 12
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {BENCH_SLOTS.map((posLabel, i) => (
              <PlayerSlot
                key={i}
                index={i}
                role="bench"
                player={getPlayerForSlot("bench", i)}
                label={posLabel}
                teamPath={teamPath}
                team={team}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>

        {/* ─── RESERVES ────────────────────────────────────────────────── */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "3px" }}>
              Reserves
            </div>
            <button
              onClick={handleAddReserve}
              style={{
                padding: "12px 24px",
                background: "rgba(255,20,147,0.15)",
                border: "1px solid rgba(255,20,147,0.4)",
                borderRadius: "12px",
                color: "#FF1493",
                fontWeight: 700,
                fontSize: "1.8rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.3)"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.15)"; }}
            >
              ➕ Add Player
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {reservePlayers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontSize: "1.8rem" }}>
                No reserves added yet. Click "Add Player" to start.
              </div>
            ) : (
              reservePlayers.map((p) => (
                <PlayerSlot
                  key={p.id}
                  index={p.slotIndex}
                  role="reserve"
                  player={p}
                  label="Reserve"
                  teamPath={teamPath}
                  team={team}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </div>
        </div>

      </div>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
