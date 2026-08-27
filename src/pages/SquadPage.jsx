import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import { db, PATHS } from "../firebase";
import { ref, set, onValue, remove, push, update, get } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import { uploadToImgBB } from "../utils/imgUpload";
import { askGroq } from "../utils/groq";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";

const POSITIONS = ["GK","LB","CB","RB","LWB","RWB","CDM","CM","CAM","LM","RM","LW","RW","CF","ST"];
const STARTING_SLOTS = ["GK","RB","CB","CB","LB","CDM","CM","CM","RW","ST","LW"];
const BENCH_SLOTS = ["GK","DEF","DEF","MID","MID","MID","MID","ATT","ATT","ATT","SUB","SUB"];

const SQUAD_TABS = [
  { id: "squad", label: "SQUAD" },
  { id: "transfers", label: "TRANSFERS" },
  { id: "performance", label: "PERFORMANCE" },
];

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

// ── Groq Team Total Season Wage Search ───────────────────────────────────────
async function searchTeamWageWithGroq(teamName) {
  const system = `You are a professional football finance data analyst. When given a football club name, return ONLY a valid JSON object with their total season wage bill. No preamble, no markdown, no explanation, no <think> tags. You MUST always provide a best estimate even if uncertain.

Return exactly this JSON structure:
{
  "totalSeasonWages": "€152,000,000/season"
}`;

  const raw = await askGroq(system, `Football club: ${teamName}`);
  const clean = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json|```/g, "")
    .trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  const data = JSON.parse(match[0]);
  return data.totalSeasonWages;
}

// ── Player Popup ──────────────────────────────────────────────────────────────
function PlayerSlotPopup({ slotIndex, role, existingPlayer, allPlayers, teamPath, team, isAdmin, onClose }) {
  const [name, setName] = useState(existingPlayer?.name || "");
  const [position, setPosition] = useState(existingPlayer?.position || "");
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
      } else if (finalRole === "bench") {
        const occupiedSlots = targetPlayers.map(p => p.slotIndex);
        for (let i = 0; i < BENCH_SLOTS.length; i++) {
          if (!occupiedSlots.includes(i)) { finalSlotIndex = i; break; }
        }
      } else {
        const maxSlot = targetPlayers.reduce((max, p) => Math.max(max, p.slotIndex || 0), -1);
        finalSlotIndex = maxSlot + 1;
      }
    }

    setSaving(true); setError("");
    try {
      const playerId = existingPlayer?.id || `${role}_${slotIndex}_${Date.now()}`;
      const updates = {
        id: playerId,
        name: name.trim(),
        position,
        role: finalRole,
        slotIndex: finalSlotIndex,
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
    if (!existingPlayer?.id || isLoanedOut || !isAdmin) return;
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
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.7rem", marginBottom: "28px", textTransform: "uppercase", letterSpacing: "1px" }}>
          {role === "starting" ? `Starting XI · Slot ${slotIndex + 1}` : role === "bench" ? `Bench · Slot ${slotIndex + 1}` : `Reserve · Slot ${slotIndex + 1}`}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Player Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kylian Mbappe" style={inputStyle} disabled={isLoanedOut} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Position</label>
          <select value={position} onChange={e => setPosition(e.target.value)} style={{ ...inputStyle, cursor: isLoanedOut ? "default" : "pointer" }} disabled={isLoanedOut}>
            <option value="">Select...</option>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {isLoanedIn && (
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Assign Squad Role</label>
            <select value={roleSelection} onChange={e => setRoleSelection(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="reserve">Reserve</option>
              <option value="bench">Bench</option>
              <option value="starting">Starting</option>
            </select>
          </div>
        )}

        {error && <div style={{ color: "#ff6b6b", fontSize: "1.8rem", marginBottom: "14px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px" }}>
          {!isLoanedOut && (
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "14px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "2rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "💾 Save"}
            </button>
          )}
          {existingPlayer && !isLoanedOut && isAdmin && (
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

// ── Player Slot Row ───────────────────────────────────────────────────────────
function PlayerSlot({ index, role, player, label, allPlayers, teamPath, team, isAdmin }) {
  const [open, setOpen] = useState(false);
  const isLoanedOut = player?.loanStatus === "out";
  const isLoanedIn = player?.loanStatus === "in";
  const canOpen = true;

  let loanLabel = null;
  if (isLoanedOut) loanLabel = <span style={{ color: "#ffaa44", fontWeight: 700, fontSize: "1.6rem", marginLeft: "10px" }}>🔁 On Loan to {player.loanClub || "..."}</span>;
  else if (isLoanedIn) loanLabel = <span style={{ color: "#ffaa44", fontWeight: 700, fontSize: "1.6rem", marginLeft: "10px" }}>🔁 On Loan from {player.loanFrom || "..."}</span>;

  return (
    <>
      <div
        onClick={() => canOpen && setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px",
          background: player ? (isLoanedOut ? "rgba(255,170,0,0.08)" : "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.02)",
          border: player ? (isLoanedOut ? "1px solid rgba(255,170,0,0.4)" : "1px solid rgba(255,255,255,0.1)") : "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", cursor: canOpen ? "pointer" : "default", transition: "all 0.2s",
        }}
        onMouseOver={e => { if (!canOpen) return; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = player ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)"; }}
        onMouseOut={e => { if (!canOpen) return; e.currentTarget.style.borderColor = player ? (isLoanedOut ? "rgba(255,170,0,0.4)" : "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.07)"; e.currentTarget.style.background = player ? (isLoanedOut ? "rgba(255,170,0,0.08)" : "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.02)"; }}
      >
        <div style={{ width: "42px", height: "36px", flexShrink: 0, background: player ? (isLoanedOut ? "#ffaa44" : "rgba(255,255,255,0.12)") : "rgba(255,255,255,0.04)", border: player ? "none" : "1px dashed rgba(255,255,255,0.12)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: "1.3rem" }}>
          {label}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {player ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</span>
                {loanLabel}
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.5rem", marginTop: "2px" }}>
                {player.position}
              </div>
            </>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.7rem" }}>Add {label}</div>
          )}
        </div>
        {player && !isLoanedOut && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.5rem", flexShrink: 0 }}>✏️</span>}
        {player && isLoanedOut && <span style={{ color: "#ffaa44", fontSize: "1.5rem", flexShrink: 0 }}>🔒</span>}
        {!player && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "2.2rem", flexShrink: 0 }}>+</span>}
      </div>
      {open && (
        <PlayerSlotPopup
          slotIndex={index} role={role} existingPlayer={player}
          allPlayers={allPlayers} teamPath={teamPath} team={team}
          isAdmin={isAdmin} onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Squad Photo Block ─────────────────────────────────────────────────────────
function SquadPhotoBlock({ team, isAdmin, squadInfo, onInfoUpdated, players, managers }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editingWage, setEditingWage] = useState(false);
  const [wageInput, setWageInput] = useState("");
  const [savingWage, setSavingWage] = useState(false);
  const [autoCalcLoading, setAutoCalcLoading] = useState(false);
  const [autoCalcStatus, setAutoCalcStatus] = useState("");
  const [confirmWage, setConfirmWage] = useState(null);
  const fileRef = useRef();

  const infoPath = `career_team_management/${team}/squad_info`;
  const squadImage = squadInfo?.image || null;
  const totalWages = squadInfo?.seasonWages || null;
  const currentManager = managers?.find(m => m.team === team);

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError("");
    try {
      const url = await uploadToImgBB(file);
      await update(ref(db, infoPath), { image: url });
      onInfoUpdated();
    } catch (err) { setUploadError("Upload failed: " + err.message); }
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

  async function handleAutoCalculate() {
    if (!team) return;
    setAutoCalcLoading(true);
    setAutoCalcStatus("Searching for team's total season wage bill...");
    try {
      const result = await searchTeamWageWithGroq(team);
      setConfirmWage(result);
      setAutoCalcStatus(`Found: ${result} – please confirm below.`);
    } catch (e) {
      setAutoCalcStatus("Failed to fetch wage bill. Please enter manually.");
    }
    setAutoCalcLoading(false);
  }

  async function handleConfirmAutoWage() {
    if (!confirmWage) return;
    setSavingWage(true);
    try {
      await update(ref(db, infoPath), { seasonWages: confirmWage });
      onInfoUpdated();
      setConfirmWage(null);
      setAutoCalcStatus("✅ Total season wages updated.");
      setTimeout(() => setAutoCalcStatus(""), 5000);
    } catch (err) {
      setAutoCalcStatus("Failed to save wage.");
    }
    setSavingWage(false);
  }

  return (
    <div style={{ marginBottom: "28px" }}>
      {/* Image upload section – available to both admin and manager */}
      <div style={{ background: "#000", borderRadius: "16px 16px 0 0", overflow: "hidden", position: "relative" }}>
        {squadImage ? (
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/7" }}>
            <img src={squadImage} alt="Squad" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: "80px", height: "100%", background: "linear-gradient(to right, rgba(0,0,20,0.8), transparent)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "100%", background: "linear-gradient(to left, rgba(0,0,20,0.8), transparent)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to top, rgba(0,0,20,0.7), transparent)", pointerEvents: "none" }} />
            <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: "16px", right: "16px", padding: "10px 20px", background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", color: "#fff", fontSize: "1.6rem", cursor: "pointer", fontWeight: 600 }}>
              {uploading ? "Uploading..." : "📷 Change Photo"}
            </button>
          </div>
        ) : (
          <div onClick={() => fileRef.current?.click()} style={{ width: "100%", aspectRatio: "16/7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed rgba(255,255,255,0.12)", borderRadius: "16px 16px 0 0", gap: "12px" }}>
            <div style={{ fontSize: "5rem" }}>📷</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2rem", fontWeight: 600 }}>{uploading ? "Uploading..." : "Upload Squad Photo"}</div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
      </div>
      {uploadError && <div style={{ color: "#ff6b6b", fontSize: "1.6rem", padding: "10px 16px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{uploadError}</div>}

      {/* Wages + Manager card */}
      <div style={{ textAlign: "center", padding: "40px 20px 28px", background: "#000", borderRadius: "0 0 16px 16px" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4.5rem", letterSpacing: "4px", color: "#fff", marginBottom: "14px" }}>
          Total Season Wages
        </div>

        {isAdmin ? (
          editingWage ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <input value={wageInput} onChange={e => setWageInput(e.target.value)} placeholder="e.g. €152,000,000/season" style={{ padding: "14px 24px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontSize: "2.2rem", outline: "none", minWidth: "280px", textAlign: "center" }} />
              <button onClick={handleSaveWage} disabled={savingWage} style={{ padding: "14px 28px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "2rem", cursor: "pointer" }}>{savingWage ? "Saving..." : "Save"}</button>
              <button onClick={() => setEditingWage(false)} style={{ padding: "14px 28px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "rgba(255,255,255,0.5)", fontSize: "2rem", cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ color: totalWages ? "#fff" : "rgba(255,255,255,0.2)", fontSize: "3.5rem", fontWeight: 800 }}>{totalWages || "Not set"}</div>
              <button onClick={() => { setWageInput(totalWages || ""); setEditingWage(true); }} style={{ padding: "8px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "rgba(255,255,255,0.6)", fontSize: "1.6rem", cursor: "pointer" }}>✏️ Edit</button>
            </div>
          )
        ) : (
          <div style={{ color: totalWages ? "#fff" : "rgba(255,255,255,0.2)", fontSize: "3.5rem", fontWeight: 800 }}>{totalWages || "—"}</div>
        )}

        {isAdmin && !editingWage && (
          <div style={{ marginTop: "16px" }}>
            <button
              onClick={handleAutoCalculate}
              disabled={autoCalcLoading}
              style={{ padding: "12px 32px", background: autoCalcLoading ? "rgba(255,255,255,0.04)" : "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: autoCalcLoading ? "rgba(255,255,255,0.4)" : "#FF1493", fontWeight: 700, fontSize: "1.7rem", cursor: autoCalcLoading ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            >
              {autoCalcLoading ? "⏳ Calculating..." : "⚡ Auto Calculate"}
            </button>
            {autoCalcStatus && (
              <div style={{ marginTop: "12px", color: autoCalcStatus.startsWith("✅") ? "#00ff88" : "rgba(255,255,255,0.55)", fontSize: "1.6rem" }}>{autoCalcStatus}</div>
            )}
            {confirmWage && !autoCalcLoading && (
              <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ color: "#fff", fontSize: "2rem", fontWeight: 700 }}>{confirmWage}</span>
                <button onClick={handleConfirmAutoWage} disabled={savingWage} style={{ padding: "10px 20px", background: "rgba(0,255,136,0.15)", border: "1px solid rgba(0,255,136,0.4)", borderRadius: "10px", color: "#00ff88", fontWeight: 700, fontSize: "1.6rem", cursor: "pointer" }}>
                  {savingWage ? "Saving..." : "Confirm & Save"}
                </button>
                <button onClick={() => setConfirmWage(null)} style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "rgba(255,255,255,0.5)", fontSize: "1.6rem", cursor: "pointer" }}>Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* Current Manager */}
        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.7rem" }}>Current Manager: </span>
          <span style={{ color: currentManager ? "#fff" : "rgba(255,255,255,0.2)", fontWeight: 700, fontSize: "1.7rem" }}>
            {currentManager ? `@${currentManager.username}` : "Unassigned"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Original Squad Block ──────────────────────────────────────────────────────
function OriginalSquadBlock({ team, squadInfo, onInfoUpdated }) {
  const [squadPlayers, setSquadPlayers] = useState(Array(11).fill(""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const infoPath = `career_team_management/${team}/squad_info`;

  useEffect(() => {
    if (squadInfo?.originalSquad) {
      const arr = Array(11).fill("");
      squadInfo.originalSquad.forEach((name, i) => { if (i < 11) arr[i] = name || ""; });
      setSquadPlayers(arr);
    }
  }, [squadInfo]);

  function updatePlayer(i, val) {
    setSquadPlayers(prev => { const next = [...prev]; next[i] = val; return next; });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await update(ref(db, infoPath), { originalSquad: squadPlayers });
      onInfoUpdated();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {}
    setSaving(false);
  }

  const filledCount = squadPlayers.filter(p => p.trim()).length;

  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "28px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "3px" }}>11 Original {team} Players</div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.6rem", marginTop: "4px" }}>Optional — enter your original squad members</div>
        </div>
        <span style={{ color: filledCount === 11 ? "#00ff88" : "rgba(255,255,255,0.3)", fontSize: "1.7rem", fontWeight: 700, background: filledCount === 11 ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${filledCount === 11 ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)"}` }}>
          {filledCount} / 11
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {squadPlayers.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}>
            <div style={{ width: "32px", height: "32px", flexShrink: 0, background: "rgba(255,255,255,0.08)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: "1.6rem" }}>{i + 1}</div>
            <input value={p} onChange={e => updatePlayer(i, e.target.value)} placeholder={`Player ${i + 1}`} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "1.8rem", fontFamily: "inherit" }} />
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "16px", background: saved ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.08)", border: `1px solid ${saved ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.15)"}`, borderRadius: "12px", color: saved ? "#00ff88" : "#fff", fontWeight: 700, fontSize: "2rem", cursor: saving ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
        {saving ? "Saving..." : saved ? "✅ Saved!" : "💾 Save Original Squad"}
      </button>
    </div>
  );
}

// ── Transfer Block (auto-filled from finance transactions) ────────────────────
function TransferBlock({ title, colorRgb, icon, entries }) {
  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "24px", marginBottom: "20px", borderColor: `rgba(${colorRgb},0.25)` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px" }}>
          {icon} {title}
        </div>
        <span style={{ color: `rgb(${colorRgb})`, fontSize: "1.5rem", fontWeight: 700, background: `rgba(${colorRgb},0.1)`, padding: "4px 14px", borderRadius: "20px", border: `1px solid rgba(${colorRgb},0.3)` }}>
          {entries.length} {entries.length === 1 ? "Entry" : "Entries"}
        </span>
      </div>

      {entries.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.7rem", textAlign: "center", padding: "32px 0" }}>
          No transactions recorded yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {entries.map((entry, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", background: `rgba(${colorRgb},0.05)`, border: `1px solid rgba(${colorRgb},0.15)`, borderRadius: "14px" }}>
              <div style={{ width: "40px", height: "40px", flexShrink: 0, background: `rgba(${colorRgb},0.15)`, border: `1px solid rgba(${colorRgb},0.3)`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.source || "Unknown Player"}
                </div>
                <div style={{ color: `rgb(${colorRgb})`, fontSize: "1.5rem", marginTop: "3px" }}>
                  {entry.category}
                  {entry.month && entry.year ? ` · ${entry.month} ${entry.year}` : ""}
                </div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 800, fontSize: "1.8rem", flexShrink: 0 }}>
                {entry.amount
                  ? `€${Number(entry.amount).toLocaleString()}`
                  : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Transfers Tab ─────────────────────────────────────────────────────────────
function TransfersTab({ team }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const unsub = onValue(ref(db, `career_team_management/${team}/finance/transactions`), snap => {
      const data = snap.val();
      setTransactions(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, [team]);

  const bought = transactions.filter(t => t.category === "Player Purchase");
  const sold = transactions.filter(t => t.category === "Player Sales");
  const loanedIn = transactions.filter(t => t.category === "Player Loans" && t.type === "expense");
  const loanedOut = transactions.filter(t => t.category === "Player Loans" && t.type === "income");

  return (
    <div>
      <TransferBlock title="Players Bought" colorRgb="0,255,136" icon="✅" entries={bought} />
      <TransferBlock title="Players Sold" colorRgb="255,107,107" icon="💸" entries={sold} />
      <TransferBlock title="Players Loaned In" colorRgb="255,170,0" icon="🔁" entries={loanedIn} />
      <TransferBlock title="Players Loaned Out" colorRgb="100,180,255" icon="✈️" entries={loanedOut} />
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
  const [infoTick, setInfoTick] = useState(0);
  const [activeTab, setActiveTab] = useState("squad");
  const [allManagers, setAllManagers] = useState([]);

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
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const mgrs = Object.values(data).filter(a => a.role === "manager" && a.team);
      setAllManagers(mgrs);
      if (isAdmin) {
        const t = [...new Set(mgrs.map(a => a.team))];
        setTeams(t);
      }
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
      await set(ref(db, `${teamPath}/${newId}`), { id: newId, name: "", position: "", role: "reserve", slotIndex: newIndex });
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

      const positionMap = { GK:"GK",LB:"LB",LWB:"LWB",RB:"RB",RWB:"RWB",CB:"CB",CDM:"CDM",CM:"CM",CAM:"CAM",LM:"LM",RM:"RM",LW:"LW",RW:"RW",CF:"CF",ST:"ST" };
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
        let idx = findSlotIndex(mappedPos, STARTING_SLOTS, assignedStarting.map((_, i) => i).filter(i => assignedStarting[i]));
        if (idx !== -1) { assignedStarting[idx] = { id: `default_starting_${idx}_${Date.now()}`, name: p.name || "Unknown", position: mappedPos, role: "starting", slotIndex: idx }; continue; }
        idx = findSlotIndex(mappedPos, BENCH_SLOTS, assignedBench.map((_, i) => i).filter(i => assignedBench[i]));
        if (idx !== -1) { assignedBench[idx] = { id: `default_bench_${idx}_${Date.now()}`, name: p.name || "Unknown", position: mappedPos, role: "bench", slotIndex: idx }; continue; }
        skipped.push(p.name);
      }

      const updates = {};
      players.filter(p => p.role === "starting" || p.role === "bench").forEach(p => { updates[`${teamPath}/${p.id}`] = null; });
      assignedStarting.filter(Boolean).forEach(p => { updates[`${teamPath}/${p.id}`] = p; });
      assignedBench.filter(Boolean).forEach(p => { updates[`${teamPath}/${p.id}`] = p; });
      await update(ref(db), updates);

      const total = assignedStarting.filter(Boolean).length + assignedBench.filter(Boolean).length;
      let msg = `✅ Loaded ${total} players.`;
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
            <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "2.8rem" }}>Sign in as a manager to view your squad.</p>
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
            <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "24px", fontSize: "2rem" }}>Choose a team to manage their squad.</p>
            <select onChange={e => setAdminTeam(e.target.value)} defaultValue="" style={{ width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "14px", color: "#fff", fontFamily: "inherit", fontSize: "2.2rem", outline: "none", marginBottom: "16px", cursor: "pointer" }}>
              <option value="">— Select a team —</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => navigate("/team-management")} style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "2rem", fontFamily: "inherit" }}>← Back to Team Management</button>
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

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: "64px", height: "64px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {teamIcon
                ? <img src={teamIcon} alt={team} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 0 16px rgba(255,255,255,0.2))" }} />
                : <div style={{ width: "64px", height: "64px", background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>👥</div>
              }
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

        {/* Disclaimer */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "18px 24px", marginBottom: "28px" }}>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "1.8rem", lineHeight: 1.7 }}>
            Your squad should include 11 original current <strong style={{ color: "#fff" }}>"{team}"</strong> players and players you have signed.{" "}
            <span
              onClick={() => navigate("/rules-and-tutorials")}
              style={{ color: "#FF1493", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}
            >
              View the Rules and Tutorials page
            </span>{" "}
            for more rules on squads.
          </div>
        </div>

        {/* Squad Photo + Wages — always above tabs */}
        <SquadPhotoBlock
          team={team}
          isAdmin={isAdmin}
          squadInfo={squadInfo}
          onInfoUpdated={() => setInfoTick(t => t + 1)}
          players={players}
          managers={allManagers}
        />

        {/* Tabs */}
        <TabBar tabs={SQUAD_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ── SQUAD TAB ── */}
        {activeTab === "squad" && (
          <>
            <OriginalSquadBlock team={team} squadInfo={squadInfo} onInfoUpdated={() => setInfoTick(t => t + 1)} />

            {/* Starting XI */}
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

            {/* Bench */}
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

            {/* Reserves */}
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
                  <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontSize: "1.8rem" }}>
                    No reserves added yet. Click "Add Player" to start.
                  </div>
                ) : (
                  reservePlayers.map(p => (
                    <PlayerSlot key={p.id} index={p.slotIndex} role="reserve" player={p} label="RES" allPlayers={players} teamPath={teamPath} team={team} isAdmin={isAdmin} />
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ── TRANSFERS TAB ── */}
        {activeTab === "transfers" && <TransfersTab team={team} />}

        {/* ── PERFORMANCE TAB ── */}
        {activeTab === "performance" && (
          <div style={{ ...GLASS, borderRadius: "20px", padding: "60px 28px", textAlign: "center" }}>
            <div style={{ fontSize: "6rem", marginBottom: "16px" }}>📊</div>
            <div style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px" }}>Coming Soon</div>
          </div>
        )}

      </div>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
