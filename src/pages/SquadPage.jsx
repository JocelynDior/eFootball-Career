import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import { db, PATHS } from "../firebase";
import { ref, set, onValue, remove, push, update, get } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import { uploadToImgBB } from "../utils/imgUpload";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";

const POSITIONS = ["GK", "LB", "CB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"];
const STARTING_SLOTS = ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CM", "RW", "ST", "LW"];
const BENCH_SLOTS = ["GK", "DEF", "DEF", "MID", "MID", "MID", "MID", "ATT", "ATT", "ATT", "SUB", "SUB"];

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const inputStyle = {
  width: "100%",
  padding: "28px 36px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
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

// ── Player Popup ──────────────────────────────────────────────────────────────
function PlayerSlotPopup({ slotIndex, role, existingPlayer, allPlayers, teamPath, team, isAdmin, onClose }) {
  const [name, setName] = useState(existingPlayer?.name || "");
  const [shirtNumber, setShirtNumber] = useState(existingPlayer?.shirtNumber || "");
  const [position, setPosition] = useState(existingPlayer?.position || "");
  const [wage, setWage] = useState(existingPlayer?.wage || "");
  const [verified, setVerified] = useState(existingPlayer?.verified || false);
  const [roleSelection, setRoleSelection] = useState(role);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const isLoanedOut = existingPlayer?.loanStatus === "out";
  const isLoanedIn = existingPlayer?.loanStatus === "in";

  async function handleSave() {
    if (isLoanedOut) { onClose(); return; }
    if (!name.trim()) { setError("Player name is required."); return; }
    if (!position) { setError("Please select a position."); return; }

    let finalRole = role;
    let finalSlotIndex = slotIndex;
    if (isLoanedIn && roleSelection !== role) {
      finalRole = roleSelection;
      const targetPlayers = allPlayers.filter(p => p.role === finalRole && p.id !== existingPlayer?.id);
      if (finalRole === "starting") {
        const occupiedSlots = targetPlayers.map(p => p.slotIndex);
        for (let i = 0; i < STARTING_SLOTS.length; i++) {
          if (!occupiedSlots.includes(i)) { finalSlotIndex = i; break; }
        }
        if (finalSlotIndex === undefined) { setError("No available slot in Starting XI."); return; }
      } else if (finalRole === "bench") {
        const occupiedSlots = targetPlayers.map(p => p.slotIndex);
        for (let i = 0; i < BENCH_SLOTS.length; i++) {
          if (!occupiedSlots.includes(i)) { finalSlotIndex = i; break; }
        }
        if (finalSlotIndex === undefined) { setError("No available slot on Bench."); return; }
      } else {
        const maxSlot = targetPlayers.reduce((max, p) => Math.max(max, p.slotIndex || 0), -1);
        finalSlotIndex = maxSlot + 1;
      }
    }

    setSaving(true); setError("");
    try {
      const playerId = existingPlayer?.id || `${role}_${slotIndex}_${Date.now()}`;
      const updates = {
        id: playerId, name: name.trim(), shirtNumber: shirtNumber || "",
        position, wage: wage || "", verified, role: finalRole, slotIndex: finalSlotIndex,
      };
      if (existingPlayer?.loanStatus) {
        updates.loanStatus = existingPlayer.loanStatus;
        if (existingPlayer.loanClub) updates.loanClub = existingPlayer.loanClub;
        if (existingPlayer.loanFrom) updates.loanFrom = existingPlayer.loanFrom;
      }
      await set(ref(db, `${teamPath}/${playerId}`), updates);
      onClose();
    } catch (e) { setError("Save failed: " + e.message); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!existingPlayer?.id || isLoanedOut) return;
    if (!window.confirm("Remove this player?")) return;
    setDeleting(true);
    try { await remove(ref(db, `${teamPath}/${existingPlayer.id}`)); onClose(); }
    catch (e) { setError("Delete failed: " + e.message); }
    setDeleting(false);
  }

  return ReactDOM.createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Inter', sans-serif" }} onClick={onClose}>
      <div style={{ background: "#0a0015", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "64px", maxWidth: "960px", width: "100%", position: "relative", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "64px", height: "64px", cursor: "pointer", fontSize: "1rem" }}>✕</button>

        {isLoanedOut && <div style={{ background: "rgba(255,170,0,0.15)", border: "1px solid #ffaa44", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", color: "#ffaa44", fontSize: "2rem", fontWeight: 700 }}>🔁 On Loan to {existingPlayer.loanClub || "another club"}</div>}
        {isLoanedIn && <div style={{ background: "rgba(255,170,0,0.15)", border: "1px solid #ffaa44", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", color: "#ffaa44", fontSize: "2rem", fontWeight: 700 }}>🔁 On Loan from {existingPlayer.loanFrom || "another club"}</div>}

        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "2px", marginBottom: "6px" }}>
          {existingPlayer ? (isLoanedOut ? "LOANED OUT" : "EDIT PLAYER") : "ADD PLAYER"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.7rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>
          {role === "starting" ? `Starting XI · Slot ${slotIndex + 1}` : role === "bench" ? `Bench · Slot ${slotIndex + 1}` : `Reserve · Slot ${slotIndex + 1}`}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Player Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kylian Mbappe" style={inputStyle} disabled={isLoanedOut} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>Shirt Number</label>
            <input value={shirtNumber} onChange={e => setShirtNumber(e.target.value)} placeholder="#" style={inputStyle} type="number" disabled={isLoanedOut} />
          </div>
          <div>
            <label style={labelStyle}>Position</label>
            <select value={position} onChange={e => setPosition(e.target.value)} style={{ ...inputStyle, cursor: isLoanedOut ? "default" : "pointer" }} disabled={isLoanedOut}>
              <option value="">Select...</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Weekly Wage</label>
          <input value={wage} onChange={e => setWage(e.target.value)} placeholder="e.g. €50,000" style={inputStyle} disabled={isLoanedOut} />
        </div>

        {isLoanedIn && (
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Assign Role</label>
            <select value={roleSelection} onChange={e => setRoleSelection(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="reserve">Reserve</option>
              <option value="bench">Bench</option>
              <option value="starting">Starting</option>
            </select>
          </div>
        )}

        {isAdmin && !isLoanedOut && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", padding: "16px 20px", background: "rgba(255,255,255,0.04)", borderRadius: "12px" }}>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.8rem", fontWeight: 600 }}>Verified Status:</span>
            <button onClick={() => setVerified(!verified)} style={{ padding: "10px 24px", background: verified ? "#00cc66" : "#ff4444", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "1.6rem", cursor: "pointer" }}>
              {verified ? "✅ Verified" : "❌ Unverified"}
            </button>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem" }}>(Admin only)</span>
          </div>
        )}

        {!isAdmin && existingPlayer && !isLoanedOut && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", padding: "12px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.6rem" }}>Status:</span>
            <span style={{ color: verified ? "#00ff88" : "#ff6b6b", fontWeight: 700, fontSize: "1.8rem" }}>{verified ? "✅ Verified" : "❌ Unverified"}</span>
          </div>
        )}

        {error && <div style={{ color: "#ff6b6b", fontSize: "1.8rem", marginBottom: "14px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px" }}>
          {!isLoanedOut && (
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "14px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "2rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "💾 Save"}
            </button>
          )}
          {existingPlayer && !isLoanedOut && (
            <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "14px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.4)", borderRadius: "12px", color: "#ff6b6b", fontWeight: 700, fontSize: "2rem", cursor: deleting ? "not-allowed" : "pointer" }}>
              {deleting ? "..." : "🗑️"}
            </button>
          )}
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "2rem", cursor: "pointer" }}>
            {isLoanedOut ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Player Slot ───────────────────────────────────────────────────────────────
function PlayerSlot({ index, role, player, label, allPlayers, teamPath, team, isAdmin }) {
  const [open, setOpen] = useState(false);
  const isLoanedOut = player?.loanStatus === "out";
  const isLoanedIn = player?.loanStatus === "in";

  let loanLabel = null;
  if (isLoanedOut) loanLabel = <span style={{ color: "#ffaa44", fontWeight: 700, fontSize: "1.7rem", marginLeft: "12px" }}>🔁 On Loan to {player.loanClub || "..."}</span>;
  else if (isLoanedIn) loanLabel = <span style={{ color: "#ffaa44", fontWeight: 700, fontSize: "1.7rem", marginLeft: "12px" }}>🔁 On Loan from {player.loanFrom || "..."}</span>;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px",
          background: player ? (isLoanedOut ? "rgba(255,170,0,0.08)" : "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.02)",
          border: player ? (isLoanedOut ? "1px solid rgba(255,170,0,0.4)" : "1px solid rgba(255,255,255,0.1)") : "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", cursor: isLoanedOut ? "default" : "pointer", transition: "all 0.2s", opacity: isLoanedOut ? 0.8 : 1,
        }}
        onMouseOver={e => { if (isLoanedOut) return; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = player ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)"; }}
        onMouseOut={e => { if (isLoanedOut) return; e.currentTarget.style.borderColor = player ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.07)"; e.currentTarget.style.background = player ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"; }}
      >
        <div style={{ width: "42px", height: "42px", flexShrink: 0, background: player ? (isLoanedOut ? "#ffaa44" : "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.06)", border: player ? "none" : "1px dashed rgba(255,255,255,0.15)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: player ? "2rem" : "2.6rem" }}>
          {player ? (player.shirtNumber || "#") : "+"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {player ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</span>
                {loanLabel}
                <span style={{ fontSize: "1.4rem", fontWeight: 700, padding: "2px 12px", borderRadius: "20px", background: player.verified ? "rgba(0,255,136,0.15)" : "rgba(255,50,50,0.15)", border: `1px solid ${player.verified ? "rgba(0,255,136,0.3)" : "rgba(255,50,50,0.3)"}`, color: player.verified ? "#00ff88" : "#ff6b6b" }}>
                  {player.verified ? "✅ Verified" : "❌ Unverified"}
                </span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.6rem", marginTop: "2px" }}>{player.position} {player.wage ? `· ${player.wage}/wk` : ""}</div>
            </>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.8rem" }}>Add {label}</div>
          )}
        </div>
        {player && !isLoanedOut ? <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.7rem", flexShrink: 0 }}>✏️</span>
          : player && isLoanedOut ? <span style={{ color: "#ffaa44", fontSize: "1.7rem", flexShrink: 0 }}>🔒</span>
          : <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "2.4rem", flexShrink: 0 }}>+</span>}
      </div>
      {open && <PlayerSlotPopup slotIndex={index} role={role} existingPlayer={player} allPlayers={allPlayers} teamPath={teamPath} team={team} isAdmin={isAdmin} onClose={() => setOpen(false)} />}
    </>
  );
}

// ── Squad Photo Block ─────────────────────────────────────────────────────────
function SquadPhotoBlock({ team, isAdmin, squadInfo, onInfoUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editingWage, setEditingWage] = useState(false);
  const [wageInput, setWageInput] = useState("");
  const [savingWage, setSavingWage] = useState(false);
  const fileRef = useRef();

  const infoPath = `career_team_management/${team}/squad_info`;
  const squadImage = squadInfo?.image || null;
  const seasonWages = squadInfo?.seasonWages || null;

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError("");
    try {
      const url = await uploadToImgBB(file);
      await update(ref(db, infoPath), { image: url });
      onInfoUpdated();
    } catch (err) {
      setUploadError("Upload failed: " + err.message);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleSaveWage() {
    if (!wageInput.trim()) return;
    setSavingWage(true);
    try {
      await update(ref(db, infoPath), { seasonWages: wageInput.trim() });
      onInfoUpdated();
      setEditingWage(false);
    } catch (err) {}
    setSavingWage(false);
  }

  return (
    <div style={{ marginBottom: "28px" }}>
      {/* Photo upload block */}
      <div style={{ background: "#000", borderRadius: "16px", overflow: "hidden", marginBottom: "0", position: "relative" }}>
        {squadImage ? (
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/7" }}>
            <img src={squadImage} alt="Squad" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: "80px", height: "100%", background: "linear-gradient(to right, rgba(0,0,20,0.8), transparent)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "100%", background: "linear-gradient(to left, rgba(0,0,20,0.8), transparent)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to top, rgba(0,0,20,0.7), transparent)", pointerEvents: "none" }} />
            <button
              onClick={() => fileRef.current?.click()}
              style={{ position: "absolute", bottom: "16px", right: "16px", padding: "10px 20px", background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", color: "#fff", fontSize: "1.6rem", cursor: "pointer", fontWeight: 600 }}
            >
              {uploading ? "Uploading..." : "📷 Change Photo"}
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ width: "100%", aspectRatio: "16/7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed rgba(255,255,255,0.15)", borderRadius: "16px", gap: "12px" }}
          >
            <div style={{ fontSize: "5rem" }}>📷</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "2rem", fontWeight: 600 }}>{uploading ? "Uploading..." : "Upload Squad Photo"}</div>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "1.6rem" }}>Click to select an image</div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
      </div>

      {uploadError && <div style={{ color: "#ff6b6b", fontSize: "1.6rem", marginTop: "8px", padding: "10px 16px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{uploadError}</div>}

      {/* Season Wages */}
      <div style={{ textAlign: "center", padding: "40px 20px 28px", background: "#000", marginTop: "2px", borderRadius: "0 0 16px 16px" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "5rem", letterSpacing: "4px", color: "#fff", marginBottom: "12px" }}>
          Squad Season Wages
        </div>
        {isAdmin ? (
          editingWage ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <input
                value={wageInput}
                onChange={e => setWageInput(e.target.value)}
                placeholder="e.g. €4,200,000"
                style={{ padding: "14px 24px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontSize: "2.2rem", outline: "none", minWidth: "280px", textAlign: "center" }}
              />
              <button onClick={handleSaveWage} disabled={savingWage} style={{ padding: "14px 28px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "2rem", cursor: "pointer" }}>
                {savingWage ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditingWage(false)} style={{ padding: "14px 28px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "rgba(255,255,255,0.5)", fontSize: "2rem", cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center" }}>
              <div style={{ color: seasonWages ? "#fff" : "rgba(255,255,255,0.2)", fontSize: "3.5rem", fontWeight: 800, letterSpacing: "1px" }}>
                {seasonWages || "Not set"}
              </div>
              <button onClick={() => { setWageInput(seasonWages || ""); setEditingWage(true); }} style={{ padding: "8px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "rgba(255,255,255,0.6)", fontSize: "1.6rem", cursor: "pointer" }}>
                ✏️ Edit
              </button>
            </div>
          )
        ) : (
          <div style={{ color: seasonWages ? "#fff" : "rgba(255,255,255,0.2)", fontSize: "3.5rem", fontWeight: 800, letterSpacing: "1px" }}>
            {seasonWages || "—"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Original Squad Block ──────────────────────────────────────────────────────
function OriginalSquadBlock({ team, squadInfo, onInfoUpdated }) {
  const [players, setPlayers] = useState(Array(11).fill(""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const infoPath = `career_team_management/${team}/squad_info`;

  useEffect(() => {
    if (squadInfo?.originalSquad) {
      const arr = Array(11).fill("");
      squadInfo.originalSquad.forEach((name, i) => { if (i < 11) arr[i] = name || ""; });
      setPlayers(arr);
    }
  }, [squadInfo]);

  function updatePlayer(i, val) {
    setPlayers(prev => { const next = [...prev]; next[i] = val; return next; });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await update(ref(db, infoPath), { originalSquad: players });
      onInfoUpdated();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {}
    setSaving(false);
  }

  const filledCount = players.filter(p => p.trim()).length;

  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "28px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "3px" }}>
            11 Original {team} Players
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.6rem", marginTop: "4px" }}>Optional — enter your original squad members</div>
        </div>
        <span style={{ color: filledCount === 11 ? "#00ff88" : "rgba(255,255,255,0.3)", fontSize: "1.7rem", fontWeight: 700, background: filledCount === 11 ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${filledCount === 11 ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)"}` }}>
          {filledCount} / 11
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {players.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}>
            <div style={{ width: "32px", height: "32px", flexShrink: 0, background: "rgba(255,255,255,0.08)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: "1.6rem" }}>
              {i + 1}
            </div>
            <input
              value={p}
              onChange={e => updatePlayer(i, e.target.value)}
              placeholder={`Player ${i + 1}`}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "1.8rem", fontFamily: "inherit" }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: "100%", padding: "16px", background: saved ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.08)", border: `1px solid ${saved ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.15)"}`, borderRadius: "12px", color: saved ? "#00ff88" : "#fff", fontWeight: 700, fontSize: "2rem", cursor: saving ? "not-allowed" : "pointer", transition: "all 0.2s" }}
      >
        {saving ? "Saving..." : saved ? "✅ Saved!" : "💾 Save Original Squad"}
      </button>
    </div>
  );
}

// ── Transfer Info Blocks ──────────────────────────────────────────────────────
function TransferInfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.5rem" }}>{label}</span>
      <span style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function PlayersOnLoanBlock({ players }) {
  const loanedOut = players.filter(p => p.loanStatus === "out");
  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "24px", flex: 1, minWidth: 0 }}>
      <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px", marginBottom: "16px" }}>
        🔁 Players on Loan
      </div>
      {loanedOut.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.7rem", textAlign: "center", padding: "32px 0" }}>No players currently on loan</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {loanedOut.map((p, i) => (
            <div key={i} style={{ padding: "14px 18px", background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: "12px" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.9rem" }}>{p.name}</div>
              <div style={{ color: "#ffaa44", fontSize: "1.5rem", marginTop: "4px" }}>On loan to {p.loanClub || "—"}</div>
              {p.position && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.4rem" }}>{p.position}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayersBoughtBlock({ negotiations, team }) {
  const bought = negotiations.filter(n => n.status === "accepted" && n.type === "buy" && n.fromClub === team);
  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "24px", flex: 1, minWidth: 0 }}>
      <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px", marginBottom: "16px" }}>
        ✅ Players Bought
      </div>
      {bought.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.7rem", textAlign: "center", padding: "32px 0" }}>No transfers completed yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bought.map((n, i) => (
            <div key={i} style={{ padding: "14px 18px", background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: "12px" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.9rem" }}>{n.playerName}</div>
              <div style={{ color: "#00ff88", fontSize: "1.5rem", marginTop: "4px" }}>From {n.toClub || n.playerClub || "—"}</div>
              {(n.offerAmount || n.bidAmount) && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.4rem" }}>{n.offerAmount || n.bidAmount}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayersSoldBlock({ negotiations, team }) {
  const sold = negotiations.filter(n =>
    n.status === "accepted" &&
    n.type === "buy" &&
    n.fromClub !== team &&
    (n.toClub === team || n.playerClub === team)
  );
  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "24px", marginTop: "20px" }}>
      <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px", marginBottom: "16px" }}>
        💸 Players Sold
      </div>
      {sold.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.7rem", textAlign: "center", padding: "32px 0" }}>No players sold yet</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
          {sold.map((n, i) => (
            <div key={i} style={{ padding: "14px 18px", background: "rgba(255,50,50,0.05)", border: "1px solid rgba(255,50,50,0.15)", borderRadius: "12px" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.9rem" }}>{n.playerName}</div>
              <div style={{ color: "#ff6b6b", fontSize: "1.5rem", marginTop: "4px" }}>To {n.fromClub || "—"}</div>
              {(n.offerAmount || n.bidAmount) && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.4rem" }}>{n.offerAmount || n.bidAmount}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Squad Page ───────────────────────────────────────────────────────────
export default function SquadPage() {
  const navigate = useNavigate();
  const { isAdmin, manager, managerLoading, teamIconsCache } = useAdmin();
  const [players, setPlayers] = useState([]);
  const [adminTeam, setAdminTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamIcon, setTeamIcon] = useState(null);
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);
  const [defaultError, setDefaultError] = useState("");
  const [squadInfo, setSquadInfo] = useState(null);
  const [negotiations, setNegotiations] = useState([]);
  const [infoTick, setInfoTick] = useState(0);

  const team = manager?.team || adminTeam;
  const teamPath = team ? `career_team_management/${team}/squad` : null;
  const infoPath = team ? `career_team_management/${team}/squad_info` : null;

  useEffect(() => {
    if (!team || !teamIconsCache) return;
    const icon = teamIconsCache?.[team];
    if (icon) setTeamIcon(icon);
  }, [team, teamIconsCache]);

  useEffect(() => {
    if (!teamPath) return;
    const unsub = onValue(ref(db, teamPath), snap => {
      const data = snap.val();
      setPlayers(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, [teamPath]);

  useEffect(() => {
    if (!infoPath) return;
    const unsub = onValue(ref(db, infoPath), snap => {
      setSquadInfo(snap.val() || null);
    });
    return () => unsub();
  }, [infoPath, infoTick]);

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.transfers}/negotiations`), snap => {
      const data = snap.val() || {};
      setNegotiations(Object.values(data));
    });
    return () => unsub();
  }, []);

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

  async function handleAddReserve() {
    if (!teamPath) return;
    const maxSlot = reservePlayers.reduce((max, p) => Math.max(max, p.slotIndex || 0), -1);
    const newIndex = maxSlot + 1;
    const newId = `reserve_${newIndex}_${Date.now()}`;
    try {
      await set(ref(db, `${teamPath}/${newId}`), { id: newId, name: "", shirtNumber: "", position: "", wage: "", verified: false, role: "reserve", slotIndex: newIndex });
    } catch (e) { console.error("Failed to add reserve slot:", e); }
  }

  async function handleSetDefaultSquad() {
    if (!team || !isAdmin) return;
    if (startingPlayers.length > 0 || benchPlayers.length > 0) {
      if (!window.confirm("This will overwrite your current Starting XI and Bench. Are you sure?")) return;
    }
    setIsLoadingDefault(true); setDefaultError("");
    try {
      const searchRes = await fetch(`https://www.fotmob.com/api/search?term=${encodeURIComponent(team)}`, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } });
      if (!searchRes.ok) throw new Error("Fotmob search failed");
      const searchData = await searchRes.json();
      const teamHit = searchData?.teams?.[0];
      if (!teamHit) throw new Error(`Team "${team}" not found on Fotmob.`);

      const teamId = teamHit.id;
      const squadRes = await fetch(`https://www.fotmob.com/api/teams?id=${teamId}`, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } });
      if (!squadRes.ok) throw new Error("Failed to fetch squad data");
      const squadData = await squadRes.json();
      const squad = squadData?.squad || [];
      if (!squad.length) throw new Error(`No squad data available for "${team}" on Fotmob.`);

      const positionMap = { GK: "GK", LB: "LB", LWB: "LWB", RB: "RB", RWB: "RWB", CB: "CB", CDM: "CDM", CM: "CM", CAM: "CAM", LM: "LM", RM: "RM", LW: "LW", RW: "RW", CF: "CF", ST: "ST" };
      const startingSlotsCopy = [...STARTING_SLOTS];
      const benchSlotsCopy = [...BENCH_SLOTS];
      const assignedStarting = [];
      const assignedBench = [];
      const skipped = [];

      function findSlotIndex(position, slots, usedIndices) {
        for (let i = 0; i < slots.length; i++) {
          if (usedIndices.includes(i)) continue;
          if (slots[i] === position) return i;
        }
        return -1;
      }

      for (const p of squad) {
        const pos = p.position || "";
        let mappedPos = "";
        for (const [key, val] of Object.entries(positionMap)) {
          if (pos.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(pos.toLowerCase())) { mappedPos = val; break; }
        }
        if (!mappedPos) { skipped.push(p.name); continue; }

        let idx = findSlotIndex(mappedPos, startingSlotsCopy, assignedStarting);
        if (idx !== -1) {
          assignedStarting.push(idx);
          assignedStarting[idx] = { id: `default_starting_${idx}_${Date.now()}`, name: p.name || "Unknown", shirtNumber: p.shirtNumber || "", position: mappedPos, wage: p.wage || "", verified: false, role: "starting", slotIndex: idx };
          continue;
        }
        idx = findSlotIndex(mappedPos, benchSlotsCopy, assignedBench);
        if (idx !== -1) {
          assignedBench.push(idx);
          assignedBench[idx] = { id: `default_bench_${idx}_${Date.now()}`, name: p.name || "Unknown", shirtNumber: p.shirtNumber || "", position: mappedPos, wage: p.wage || "", verified: false, role: "bench", slotIndex: idx };
          continue;
        }
        skipped.push(p.name);
      }

      const updates = {};
      const existingIds = players.filter(p => p.role === "starting" || p.role === "bench").map(p => p.id);
      for (const id of existingIds) updates[`${teamPath}/${id}`] = null;
      for (let i = 0; i < startingSlotsCopy.length; i++) { const p = assignedStarting[i]; if (p) updates[`${teamPath}/${p.id}`] = p; }
      for (let i = 0; i < benchSlotsCopy.length; i++) { const p = assignedBench[i]; if (p) updates[`${teamPath}/${p.id}`] = p; }
      await update(ref(db), updates);

      const totalAssigned = assignedStarting.filter(Boolean).length + assignedBench.filter(Boolean).length;
      let msg = `✅ Loaded ${totalAssigned} players (all unverified).`;
      if (skipped.length) msg += ` ${skipped.length} skipped: ${skipped.join(", ")}`;
      setDefaultError(msg);
      setTimeout(() => setDefaultError(""), 8000);
    } catch (e) { setDefaultError(e.message || "An error occurred."); }
    setIsLoadingDefault(false);
  }

  if (managerLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo /><Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin && !manager) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo /><Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 20px" }}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "48px 36px", maxWidth: "480px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "7rem", marginBottom: "16px" }}>🔒</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "6rem", letterSpacing: "3px", color: "#fff", margin: "0 0 10px" }}>Manager Login Required</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "2.8rem" }}>Sign in as a manager to manage your squad.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin && !team) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo /><Navbar />
        <div style={{ padding: "32px 20px 80px" }}>
          <div style={{ ...GLASS, borderRadius: "20px", padding: "32px", maxWidth: "480px", margin: "60px auto", textAlign: "center" }}>
            <div style={{ fontSize: "6rem", marginBottom: "16px" }}>🔧</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px", color: "#fff", margin: "0 0 8px" }}>SELECT TEAM</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "24px", fontSize: "2rem" }}>Choose a team to edit their squad.</p>
            <select onChange={e => setAdminTeam(e.target.value)} defaultValue="" style={{ width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "14px", color: "#fff", fontFamily: "inherit", fontSize: "2.2rem", outline: "none", marginBottom: "16px", cursor: "pointer" }}>
              <option value="">— Select a team —</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => navigate("/team-management")} style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "2rem", fontFamily: "inherit" }}>
              ← Back to Team Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      <div style={{ padding: "32px 20px 80px", margin: "0 auto" }}>

        <button
          onClick={() => navigate("/team-management")}
          style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", padding: "10px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "1.9rem", fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
        >
          ← Back to Team Management
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: "64px", height: "64px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {teamIcon ? (
                <img src={teamIcon} alt={team} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 0 16px rgba(255,255,255,0.2))" }} />
              ) : (
                <div style={{ width: "64px", height: "64px", background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>👥</div>
              )}
            </div>
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "6rem", letterSpacing: "4px", color: "#fff", margin: "0 0 4px" }}>SQUAD</h1>
              <div style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: "2.2rem", letterSpacing: "1px" }}>{team}</div>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleSetDefaultSquad}
              disabled={isLoadingDefault}
              style={{ padding: "16px 32px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.8rem", cursor: isLoadingDefault ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            >
              {isLoadingDefault ? "⏳ Loading..." : "⚡ Set Default Squad"}
            </button>
          )}
        </div>

        {defaultError && (
          <div style={{ padding: "16px 24px", borderRadius: "12px", marginBottom: "20px", background: defaultError.startsWith("✅") ? "rgba(0,255,136,0.1)" : "rgba(255,50,50,0.1)", border: `1px solid ${defaultError.startsWith("✅") ? "rgba(0,255,136,0.3)" : "rgba(255,50,50,0.3)"}`, color: defaultError.startsWith("✅") ? "#00ff88" : "#ff6b6b", fontSize: "1.8rem" }}>
            {defaultError}
          </div>
        )}

        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)", marginBottom: "28px" }} />

        {/* ── DISCLAIMER ──────────────────────────────────────────────────── */}
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

        {/* ── SQUAD PHOTO + WAGES ─────────────────────────────────────────── */}
        <SquadPhotoBlock
          team={team}
          isAdmin={isAdmin}
          squadInfo={squadInfo}
          onInfoUpdated={() => setInfoTick(t => t + 1)}
        />

        {/* ── ORIGINAL SQUAD ──────────────────────────────────────────────── */}
        <OriginalSquadBlock
          team={team}
          squadInfo={squadInfo}
          onInfoUpdated={() => setInfoTick(t => t + 1)}
        />

        {/* ── LOAN + BOUGHT (side by side) ────────────────────────────────── */}
        <div style={{ display: "flex", gap: "20px", marginBottom: "0", flexWrap: "wrap" }}>
          <PlayersOnLoanBlock players={players} />
          <PlayersBoughtBlock negotiations={negotiations} team={team} />
        </div>

        {/* ── PLAYERS SOLD ────────────────────────────────────────────────── */}
        <PlayersSoldBlock negotiations={negotiations} team={team} />

        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)", margin: "32px 0 28px" }} />

        {/* ── STARTING XI ─────────────────────────────────────────────────── */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "3px" }}>Starting XI</div>
            <span style={{ color: startingPlayers.length === 11 ? "#00ff88" : "rgba(255,255,255,0.3)", fontSize: "1.7rem", fontWeight: 700, background: startingPlayers.length === 11 ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${startingPlayers.length === 11 ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)"}` }}>
              {startingPlayers.length === 11 ? "✅ Full Squad" : `${startingPlayers.length} / 11`}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {STARTING_SLOTS.map((posLabel, i) => (
              <PlayerSlot key={i} index={i} role="starting" player={getPlayerForSlot("starting", i)} label={posLabel} allPlayers={players} teamPath={teamPath} team={team} isAdmin={isAdmin} />
            ))}
          </div>
        </div>

        {/* ── BENCH ───────────────────────────────────────────────────────── */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "3px" }}>Bench</div>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.7rem", fontWeight: 700, background: "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)" }}>
              {benchPlayers.length} / 12
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {BENCH_SLOTS.map((posLabel, i) => (
              <PlayerSlot key={i} index={i} role="bench" player={getPlayerForSlot("bench", i)} label={posLabel} allPlayers={players} teamPath={teamPath} team={team} isAdmin={isAdmin} />
            ))}
          </div>
        </div>

        {/* ── RESERVES ────────────────────────────────────────────────────── */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "3px" }}>Reserves</div>
            <button
              onClick={handleAddReserve}
              style={{ padding: "12px 24px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1.8rem", cursor: "pointer", transition: "all 0.2s" }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            >
              ➕ Add Player
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {reservePlayers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontSize: "1.8rem" }}>No reserves added yet. Click "Add Player" to start.</div>
            ) : (
              reservePlayers.map(p => (
                <PlayerSlot key={p.id} index={p.slotIndex} role="reserve" player={p} label="Reserve" allPlayers={players} teamPath={teamPath} team={team} isAdmin={isAdmin} />
              ))
            )}
          </div>
        </div>

      </div>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
