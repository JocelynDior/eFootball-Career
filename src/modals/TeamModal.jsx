import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { db } from "../firebase";
import { ref, set, onValue, update, remove } from "firebase/database";
import { askGroq } from "../utils/groq";

const POSITIONS = ["GK","LB","CB","RB","LWB","RWB","CDM","CM","CAM","LM","RM","LW","RW","CF","ST"];

const STARTING_SLOTS = [
  "GK","RB","CB","CB","LB","CDM","CM","CM","RW","ST","LW"
];
const BENCH_SLOTS = [
  "GK","DEF","DEF","MID","MID","MID","MID","ATT","ATT","ATT","SUB","SUB"
];

const inputStyle = {
  width: "100%", padding: "14px 18px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "12px", color: "#fff",
  fontFamily: "inherit", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  color: "rgba(255,255,255,0.65)", fontSize: "0.85rem",
  display: "block", marginBottom: "8px",
  textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700,
};

// ── Player Search Popup ───────────────────────────────────────────────────────
function PlayerSlotPopup({ slotIndex, role, existingPlayer, teamPath, team, onClose }) {
  const [searchName, setSearchName] = useState(existingPlayer?.name || "");
  const [kitNumber, setKitNumber] = useState(existingPlayer?.shirtNumber || "");
  const [position, setPosition] = useState(existingPlayer?.position || "");
  const [age, setAge] = useState(existingPlayer?.age || "");
  const [wage, setWage] = useState(existingPlayer?.wage || "");
  const [fullName, setFullName] = useState(existingPlayer?.name || "");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(!!existingPlayer);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSearch() {
    if (!searchName.trim()) return;
    setSearching(true);
    setError("");
    try {
      // Step 1: Groq resolves the full name
      const raw = await askGroq(
        `You are a football data expert. Return ONLY valid JSON, no markdown, no <think> tags.`,
        `What is the full official name of the football player known as "${searchName}"? Return: {"fullName":"..."}`
      );
      const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const resolved = JSON.parse(match ? match[0] : clean);
      const resolvedName = resolved.fullName || searchName;

      // Step 2: Search Fotmob with full name
      let fotmobData = null;
      try {
        const searchRes = await fetch(
          `https://www.fotmob.com/api/search?term=${encodeURIComponent(resolvedName)}`,
          { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
        );
        const searchData = await searchRes.json();
        const playerHit = searchData?.players?.[0];

        if (playerHit?.id) {
          const detailRes = await fetch(
            `https://www.fotmob.com/api/playerData?id=${playerHit.id}`,
            { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
          );
          const detail = await detailRes.json();
          fotmobData = {
            fullName: detail.name || resolvedName,
            position: detail.positionDescription?.primaryPosition?.label || "",
            age: detail.meta?.age || "",
            wage: detail.contractInfo?.wage || "",
          };
        }
      } catch (_) {}

      if (fotmobData) {
        setFullName(fotmobData.fullName);
        setPosition(fotmobData.position || position);
        setAge(String(fotmobData.age || age));
        setWage(fotmobData.wage || wage);
      } else {
        // Fallback: Groq fills in the details
        const raw2 = await askGroq(
          `You are a football data expert. Return ONLY valid JSON, no markdown, no <think> tags.`,
          `Give me current details for footballer "${resolvedName}". Return: {"fullName":"...","position":"...","age":0,"wage":"€X,XXX"}`
        );
        const clean2 = raw2.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json|```/g, "").trim();
        const match2 = clean2.match(/\{[\s\S]*\}/);
        const data = JSON.parse(match2 ? match2[0] : clean2);
        setFullName(data.fullName || resolvedName);
        setPosition(data.position || position);
        setAge(String(data.age || ""));
        setWage(data.wage || "");
      }

      setSearched(true);
    } catch (e) {
      setError("Search failed: " + e.message);
    }
    setSearching(false);
  }

  async function handleSave() {
    if (!fullName.trim()) { setError("Search for a player first."); return; }
    setSaving(true);
    setError("");
    try {
      const playerId = existingPlayer?.id || `${role}_${slotIndex}_${Date.now()}`;
      await set(ref(db, `${teamPath}/${playerId}`), {
        id: playerId,
        name: fullName,
        shirtNumber: kitNumber,
        position,
        age,
        wage,
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
    setDeleting(true);
    try {
      await remove(ref(db, `${teamPath}/${existingPlayer.id}`));
      onClose();
    } catch (e) {
      setError("Delete failed: " + e.message);
    }
    setDeleting(false);
  }

  return ReactDOM.createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Inter', sans-serif", fontSize: "1rem" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#0a0015", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "24px", padding: "32px", maxWidth: "480px", width: "100%", position: "relative", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "1rem" }}>✕</button>

        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "2px", marginBottom: "6px" }}>
          {existingPlayer ? "EDIT PLAYER" : "ADD PLAYER"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>
          {role === "starting" ? `Starting XI · Slot ${slotIndex + 1}` : `Bench · Slot ${slotIndex + 1}`}
        </div>

        {/* Search */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Player Name</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="e.g. Mbappe, Haaland..."
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{ padding: "14px 20px", background: searching ? "rgba(255,20,147,0.2)" : "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: searching ? "not-allowed" : "pointer", whiteSpace: "nowrap", fontSize: "0.95rem" }}
            >
              {searching ? "..." : "Search"}
            </button>
          </div>
        </div>

        {searching && (
          <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,20,147,0.7)", fontSize: "0.95rem" }}>
            🔍 Researching player...
          </div>
        )}

        {searched && !searching && (
          <>
            {/* Full Name */}
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              {/* Kit Number */}
              <div>
                <label style={labelStyle}>Kit Number</label>
                <input value={kitNumber} onChange={e => setKitNumber(e.target.value)} placeholder="#" style={inputStyle} type="number" />
              </div>
              {/* Position */}
              <div>
                <label style={labelStyle}>Position</label>
                <select value={position} onChange={e => setPosition(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Select...</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              {/* Age */}
              <div>
                <label style={labelStyle}>Age</label>
                <input value={age} onChange={e => setAge(e.target.value)} style={inputStyle} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
              </div>
              {/* Wage */}
              <div>
                <label style={labelStyle}>Weekly Wage</label>
                <input value={wage} onChange={e => setWage(e.target.value)} style={{ ...inputStyle, opacity: 0.7 }} readOnly />
              </div>
            </div>

            {error && (
              <div style={{ color: "#ff6b6b", fontSize: "0.9rem", marginBottom: "14px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 2, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving..." : "💾 Save"}
              </button>
              {existingPlayer && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ flex: 1, padding: "14px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.4)", borderRadius: "12px", color: "#ff6b6b", fontWeight: 700, fontSize: "1rem", cursor: deleting ? "not-allowed" : "pointer" }}
                >
                  {deleting ? "..." : "🗑️"}
                </button>
              )}
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "12px", color: "#fff", fontSize: "1rem", cursor: "pointer" }}
              >
                Discard
              </button>
            </div>
          </>
        )}

        {!searched && !searching && (
          <>
            {error && (
              <div style={{ color: "#ff6b6b", fontSize: "0.9rem", marginBottom: "14px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>
            )}
            <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.2)", fontSize: "0.95rem" }}>
              Type a player name and press Search
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Player Slot ───────────────────────────────────────────────────────────────
function PlayerSlot({ index, role, player, label, teamPath, team, canEdit }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => canEdit && setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "14px 18px",
          background: player ? "rgba(255,20,147,0.06)" : "rgba(255,255,255,0.02)",
          border: player ? "1px solid rgba(255,20,147,0.25)" : "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          cursor: canEdit ? "pointer" : "default",
          transition: "all 0.2s",
        }}
        onMouseOver={e => { if (canEdit) e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; }}
        onMouseOut={e => { e.currentTarget.style.borderColor = player ? "rgba(255,20,147,0.25)" : "rgba(255,255,255,0.07)"; }}
      >
        {/* Kit number / slot number */}
        <div style={{
          width: "42px", height: "42px", flexShrink: 0,
          background: player ? "#FF1493" : "rgba(255,255,255,0.06)",
          border: player ? "none" : "1px dashed rgba(255,255,255,0.15)",
          borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 900, fontSize: player ? "1rem" : "1.3rem",
        }}>
          {player ? (player.shirtNumber || "#") : "+"}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {player ? (
            <>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: "2px" }}>
                {player.position}{player.age ? ` · ${player.age} yrs` : ""}
                {player.wage ? ` · ${player.wage}/wk` : ""}
              </div>
            </>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.9rem" }}>
              {canEdit ? `Add ${label}` : `Empty slot`}
            </div>
          )}
        </div>

        {/* Right indicator */}
        {player && canEdit && (
          <span style={{ color: "rgba(255,20,147,0.6)", fontSize: "0.85rem", flexShrink: 0 }}>✏️</span>
        )}
        {!player && canEdit && (
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "1.2rem", flexShrink: 0 }}>+</span>
        )}
      </div>

      {open && (
        <PlayerSlotPopup
          slotIndex={index}
          role={role}
          existingPlayer={player}
          teamPath={teamPath}
          team={team}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function TeamModal({ team, onClose }) {
  const [players, setPlayers] = useState([]);
  const teamPath = `career_team_management/${team}/squad`;

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, teamPath), snap => {
      const data = snap.val();
      setPlayers(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, [team]);

  const startingPlayers = players.filter(p => p.role === "starting");
  const benchPlayers = players.filter(p => p.role === "bench");

  function getPlayerForSlot(role, index) {
    const list = role === "starting" ? startingPlayers : benchPlayers;
    return list.find(p => p.slotIndex === index) || null;
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", marginBottom: "4px", letterSpacing: "3px" }}>
        👥 TEAM
      </h3>
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.9rem", marginBottom: "28px" }}>
        Team: <span style={{ color: "#FF1493", fontWeight: 700 }}>{team}</span>
      </div>

      {/* Disclaimer */}
      <div style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: "14px", padding: "14px 18px", marginBottom: "28px" }}>
        <div style={{ color: "#ffaa00", fontWeight: 800, fontSize: "0.9rem", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>⚠️ Disclaimer</div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Only add real players currently signed to <strong>"{team}"</strong>. No retired or unsigned players.
        </div>
      </div>

      {/* Starting XI */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Starting XI ({startingPlayers.length}/11)</label>
          <div style={{ height: "1px", flex: 1, margin: "0 16px", background: "rgba(255,20,147,0.2)" }} />
          <span style={{ color: startingPlayers.length === 11 ? "#00ff88" : "rgba(255,255,255,0.3)", fontSize: "0.8rem", fontWeight: 700 }}>
            {startingPlayers.length === 11 ? "✅ Full" : `${11 - startingPlayers.length} needed`}
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
              canEdit={true}
            />
          ))}
        </div>
      </div>

      {/* Bench */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Bench ({benchPlayers.length}/12)</label>
          <div style={{ height: "1px", flex: 1, margin: "0 16px", background: "rgba(255,20,147,0.2)" }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", fontWeight: 700 }}>
            {12 - benchPlayers.length} slots open
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
              canEdit={true}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onClose}
        style={{ width: "100%", padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1rem", fontFamily: "inherit" }}
      >
        Close
      </button>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
