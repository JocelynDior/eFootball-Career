import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, set, onValue } from "firebase/database";

const FORMATIONS = [
  "4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2",
  "4-1-4-1", "3-4-3", "5-4-1", "4-5-1", "3-6-1",
];

const POSITIONS = ["GK", "LB", "CB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"];

// Formation layout: positions on pitch [x%, y%] from top-left
const FORMATION_LAYOUTS = {
  "4-3-3": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "LB", x: 15, y: 72 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 85, y: 72 },
      { pos: "CM", x: 25, y: 52 }, { pos: "CM", x: 50, y: 52 }, { pos: "CM", x: 75, y: 52 },
      { pos: "LW", x: 15, y: 28 }, { pos: "ST", x: 50, y: 22 }, { pos: "RW", x: 85, y: 28 },
    ],
  },
  "4-4-2": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "LB", x: 15, y: 72 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 85, y: 72 },
      { pos: "LM", x: 15, y: 50 }, { pos: "CM", x: 35, y: 50 }, { pos: "CM", x: 65, y: 50 }, { pos: "RM", x: 85, y: 50 },
      { pos: "ST", x: 35, y: 24 }, { pos: "ST", x: 65, y: 24 },
    ],
  },
  "4-2-3-1": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "LB", x: 15, y: 72 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 85, y: 72 },
      { pos: "CDM", x: 35, y: 56 }, { pos: "CDM", x: 65, y: 56 },
      { pos: "LW", x: 15, y: 38 }, { pos: "CAM", x: 50, y: 38 }, { pos: "RW", x: 85, y: 38 },
      { pos: "ST", x: 50, y: 20 },
    ],
  },
  "3-5-2": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "CB", x: 25, y: 72 }, { pos: "CB", x: 50, y: 72 }, { pos: "CB", x: 75, y: 72 },
      { pos: "LWB", x: 10, y: 52 }, { pos: "CDM", x: 30, y: 52 }, { pos: "CM", x: 50, y: 52 }, { pos: "CM", x: 70, y: 52 }, { pos: "RWB", x: 90, y: 52 },
      { pos: "ST", x: 35, y: 24 }, { pos: "ST", x: 65, y: 24 },
    ],
  },
  "5-3-2": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "LWB", x: 10, y: 70 }, { pos: "CB", x: 28, y: 74 }, { pos: "CB", x: 50, y: 75 }, { pos: "CB", x: 72, y: 74 }, { pos: "RWB", x: 90, y: 70 },
      { pos: "CM", x: 25, y: 50 }, { pos: "CM", x: 50, y: 48 }, { pos: "CM", x: 75, y: 50 },
      { pos: "ST", x: 35, y: 24 }, { pos: "ST", x: 65, y: 24 },
    ],
  },
  "4-1-4-1": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "LB", x: 15, y: 72 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 85, y: 72 },
      { pos: "CDM", x: 50, y: 58 },
      { pos: "LM", x: 12, y: 42 }, { pos: "CM", x: 35, y: 42 }, { pos: "CM", x: 65, y: 42 }, { pos: "RM", x: 88, y: 42 },
      { pos: "ST", x: 50, y: 20 },
    ],
  },
  "3-4-3": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "CB", x: 25, y: 72 }, { pos: "CB", x: 50, y: 72 }, { pos: "CB", x: 75, y: 72 },
      { pos: "LM", x: 12, y: 52 }, { pos: "CM", x: 35, y: 52 }, { pos: "CM", x: 65, y: 52 }, { pos: "RM", x: 88, y: 52 },
      { pos: "LW", x: 15, y: 26 }, { pos: "ST", x: 50, y: 20 }, { pos: "RW", x: 85, y: 26 },
    ],
  },
  "5-4-1": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "LWB", x: 10, y: 70 }, { pos: "CB", x: 28, y: 74 }, { pos: "CB", x: 50, y: 75 }, { pos: "CB", x: 72, y: 74 }, { pos: "RWB", x: 90, y: 70 },
      { pos: "LM", x: 15, y: 48 }, { pos: "CM", x: 35, y: 48 }, { pos: "CM", x: 65, y: 48 }, { pos: "RM", x: 85, y: 48 },
      { pos: "ST", x: 50, y: 22 },
    ],
  },
  "4-5-1": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "LB", x: 15, y: 72 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 85, y: 72 },
      { pos: "LM", x: 10, y: 48 }, { pos: "CM", x: 28, y: 50 }, { pos: "CM", x: 50, y: 48 }, { pos: "CM", x: 72, y: 50 }, { pos: "RM", x: 90, y: 48 },
      { pos: "ST", x: 50, y: 22 },
    ],
  },
  "3-6-1": {
    starting: [
      { pos: "GK", x: 50, y: 90 },
      { pos: "CB", x: 25, y: 72 }, { pos: "CB", x: 50, y: 72 }, { pos: "CB", x: 75, y: 72 },
      { pos: "LM", x: 8, y: 52 }, { pos: "CDM", x: 25, y: 52 }, { pos: "CM", x: 40, y: 52 }, { pos: "CM", x: 60, y: 52 }, { pos: "CDM", x: 75, y: 52 }, { pos: "RM", x: 92, y: 52 },
      { pos: "ST", x: 50, y: 22 },
    ],
  },
};

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
  textTransform: "uppercase", letterSpacing: "0.8px",
  fontWeight: 700,
};

export default function SquadModal({ team, onClose }) {
  const [formation, setFormation] = useState("4-3-3");
  const [players, setPlayers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Add player form
  const [newName, setNewName] = useState("");
  const [newShirt, setNewShirt] = useState("");
  const [newPosition, setNewPosition] = useState("ST");
  const [newRole, setNewRole] = useState("starting");

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/squad`), snap => {
      const data = snap.val();
      if (data) {
        setPlayers(Object.entries(data).map(([id, p]) => ({ id, ...p })));
      }
    });
    return () => unsub();
  }, [team]);

  function addPlayer() {
    if (!newName.trim()) return;
    if (players.length >= 23) {
      setError("Maximum squad size is 23 players.");
      return;
    }
    setError("");
    const player = {
      id: Date.now().toString(),
      name: newName.trim(),
      shirtNumber: newShirt || "?",
      position: newPosition,
      role: newRole,
    };
    setPlayers(prev => [...prev, player]);
    setNewName("");
    setNewShirt("");
  }

  function removePlayer(id) {
    setPlayers(prev => prev.filter(p => p.id !== id));
  }

  async function handleSave() {
    const starting = players.filter(p => p.role === "starting");
    if (starting.length < 11) {
      setError("You need at least 11 players in the starting lineup.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const squadObj = {};
      players.forEach(p => { squadObj[p.id] = p; });
      await set(ref(db, `career_team_management/${team}/squad`), squadObj);
      await set(ref(db, `career_team_management/${team}/formation`), formation);
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError("Save failed: " + e.message);
    }
    setSaving(false);
  }

  const layout = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-3-3"];
  const startingSlots = layout.starting;
  const startingPlayers = players.filter(p => p.role === "starting");
  const benchPlayers = players.filter(p => p.role === "bench");

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", marginBottom: "8px", letterSpacing: "3px" }}>
        👥 SQUAD BUILDER
      </h3>

      {/* Disclaimer — always visible */}
      <div style={{
        background: "rgba(255,170,0,0.1)", border: "2px solid rgba(255,170,0,0.5)",
        borderRadius: "14px", padding: "18px 20px", marginBottom: "28px",
      }}>
        <div style={{ color: "#ffaa00", fontWeight: 800, fontSize: "1rem", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
          ⚠️ Disclaimer
        </div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "1rem", lineHeight: 1.6 }}>
          Your squad must have at least <strong>11 players that play for "{team}"</strong> in real life.
          You may <strong>not</strong> use retired players, or players you have not officially signed.
        </div>
      </div>

      {/* Formation */}
      <div style={{ marginBottom: "24px" }}>
        <label style={labelStyle}>Formation</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {FORMATIONS.map(f => (
            <button key={f} onClick={() => setFormation(f)} style={{
              padding: "12px 20px", borderRadius: "24px", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, fontSize: "1rem",
              background: formation === f ? "#FF1493" : "rgba(255,20,147,0.1)",
              border: `1px solid ${formation === f ? "#FF1493" : "rgba(255,20,147,0.3)"}`,
              color: "#fff", transition: "all 0.2s",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Pitch visualization */}
      <div style={{ marginBottom: "28px" }}>
        <label style={labelStyle}>Pitch View — {formation} ({startingPlayers.length}/11)</label>
        <div style={{
          position: "relative", width: "100%", paddingBottom: "140%",
          background: "linear-gradient(180deg, #1a5c1a 0%, #2d8c2d 20%, #1a5c1a 40%, #2d8c2d 60%, #1a5c1a 80%, #2d8c2d 100%)",
          borderRadius: "16px", border: "3px solid rgba(255,255,255,0.15)",
          overflow: "hidden",
        }}>
          {/* Pitch markings */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 140" preserveAspectRatio="none">
            {/* Outline */}
            <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            {/* Center line */}
            <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            {/* Center circle */}
            <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            <circle cx="50" cy="70" r="1" fill="rgba(255,255,255,0.4)" />
            {/* Penalty areas */}
            <rect x="22" y="2" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            <rect x="22" y="118" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            {/* Goal areas */}
            <rect x="36" y="2" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            <rect x="36" y="130" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          </svg>

          {/* Players on pitch */}
          {startingSlots.map((slot, i) => {
            const player = startingPlayers[i];
            return (
              <div key={i} style={{
                position: "absolute",
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                transform: "translate(-50%, -50%)",
                display: "flex", flexDirection: "column", alignItems: "center",
                zIndex: 2,
              }}>
                {/* Shirt */}
                <div style={{
                  width: "36px", height: "36px",
                  background: player ? "#FF1493" : "rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  border: player ? "2px solid #fff" : "2px dashed rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: player ? "0 2px 10px rgba(255,20,147,0.6)" : "none",
                  transition: "all 0.2s",
                }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: "0.8rem" }}>
                    {player ? (player.shirtNumber || "#") : slot.pos}
                  </span>
                </div>
                {/* Name */}
                <div style={{
                  color: player ? "#fff" : "rgba(255,255,255,0.3)",
                  fontSize: "0.55rem", fontWeight: 700,
                  marginTop: "3px", textAlign: "center",
                  maxWidth: "50px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  background: "rgba(0,0,0,0.4)", borderRadius: "4px", padding: "1px 4px",
                }}>
                  {player ? player.name.split(" ").pop() : slot.pos}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add player form */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", marginBottom: "16px" }}>
          ➕ Add Player ({players.length}/23)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "10px", marginBottom: "12px" }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Player name" style={inputStyle} onKeyDown={e => e.key === "Enter" && addPlayer()} />
          <input value={newShirt} onChange={e => setNewShirt(e.target.value)} placeholder="#" style={inputStyle} type="number" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
          <div>
            <label style={labelStyle}>Position</label>
            <select value={newPosition} onChange={e => setNewPosition(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="starting">Starting XI</option>
              <option value="bench">Bench</option>
            </select>
          </div>
        </div>
        <button onClick={addPlayer} disabled={players.length >= 23} style={{
          width: "100%", padding: "14px", background: players.length >= 23 ? "rgba(255,20,147,0.2)" : "#FF1493",
          border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem",
          cursor: players.length >= 23 ? "not-allowed" : "pointer",
        }}>
          {players.length >= 23 ? "Squad Full (23/23)" : "Add Player"}
        </button>
      </div>

      {/* Starting XI list */}
      {startingPlayers.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Starting XI ({startingPlayers.length}/11)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {startingPlayers.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", background: "#FF1493", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "0.85rem" }}>
                    {p.shirtNumber || "#"}
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>{p.position}</div>
                  </div>
                </div>
                <button onClick={() => removePlayer(p.id)} style={{ background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", color: "#ff6b6b", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem" }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bench list */}
      {benchPlayers.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Bench ({benchPlayers.length})</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {benchPlayers.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", background: "rgba(255,255,255,0.1)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "0.85rem" }}>
                    {p.shirtNumber || "#"}
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>{p.position}</div>
                  </div>
                </div>
                <button onClick={() => removePlayer(p.id)} style={{ background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", color: "#ff6b6b", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem" }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "16px", padding: "14px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>}

      {saved ? (
        <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "20px", background: "rgba(0,255,136,0.1)", borderRadius: "14px", fontSize: "1.1rem" }}>✅ Squad Saved!</div>
      ) : (
        <div style={{ display: "flex", gap: "14px" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "18px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "💾 Save Squad"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
