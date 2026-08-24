import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, update, remove, set } from "firebase/database";

const inputStyle = {
  width: "100%",
  padding: "13px 16px",
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,20,147,0.3)",
  borderRadius: "12px",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  color: "rgba(255,255,255,0.5)",
  fontSize: "0.7rem",
  fontWeight: 600,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  marginBottom: "5px",
};

export default function AdminClubModal({ club, managers, onClose, onSaved }) {
  const [view, setView] = useState("main"); // main | objectives | changeManager | deleteConfirm | bankruptConfirm

  // Objectives
  const [objectives, setObjectives] = useState([]);
  const [newObjective, setNewObjective] = useState("");
  const [objSaving, setObjSaving] = useState(false);
  const [objMsg, setObjMsg] = useState("");

  // Change manager
  const [selectedManagerUid, setSelectedManagerUid] = useState("");
  const [managerSaving, setManagerSaving] = useState(false);
  const [managerMsg, setManagerMsg] = useState("");

  // Delete / bankrupt
  const [deleting, setDeleting] = useState(false);
  const [bankrupt, setBankrupt] = useState(false);

  // Load existing objectives
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.clubObjectives(club.name)), snap => {
      const data = snap.val();
      if (Array.isArray(data)) setObjectives(data);
      else if (data && typeof data === "object") setObjectives(Object.values(data));
      else setObjectives([]);
    });
    return () => unsub();
  }, [club.name]);

  // Load bankrupt status
  useEffect(() => {
    const unsub = onValue(ref(db, `career_team_management/${club.name}/bankrupt`), snap => {
      setBankrupt(!!snap.val());
    });
    return () => unsub();
  }, [club.name]);

  function addObjective() {
    if (!newObjective.trim()) return;
    setObjectives(prev => [...prev, newObjective.trim()]);
    setNewObjective("");
  }

  function removeObjective(i) {
    setObjectives(prev => prev.filter((_, idx) => idx !== i));
  }

  async function saveObjectives() {
    setObjSaving(true);
    await set(ref(db, PATHS.clubObjectives(club.name)), objectives);
    setObjSaving(false);
    setObjMsg("Objectives saved!");
    setTimeout(() => { setObjMsg(""); setView("main"); onSaved(); }, 1500);
  }

  async function handleChangeManager() {
    if (!selectedManagerUid) { setManagerMsg("Please select a manager."); return; }
    setManagerSaving(true);
    const now = Date.now();
    // Find current manager of club and add history entry
    const currentMgr = managers.find(m => m.team === club.name);
    const updates = {};
    if (currentMgr) {
      const histEntry = {
        team: club.name,
        assignedAt: currentMgr.teamAssignedAt || now,
        removedAt: now,
      };
      updates[`${PATHS.accounts}/${currentMgr.uid}/team`] = null;
      updates[`${PATHS.accounts}/${currentMgr.uid}/teamHistory/${now}`] = histEntry;
    }
    // Assign new manager
    updates[`${PATHS.accounts}/${selectedManagerUid}/team`] = club.name;
    updates[`${PATHS.accounts}/${selectedManagerUid}/teamAssignedAt`] = now;
    await update(ref(db), updates);
    setManagerSaving(false);
    setManagerMsg("Manager changed!");
    setTimeout(() => { setManagerMsg(""); setView("main"); onSaved(); }, 1500);
  }

  async function handleDeleteClub() {
    setDeleting(true);
    // Remove team from manager who owns it
    const currentMgr = managers.find(m => m.team === club.name);
    if (currentMgr) {
      await update(ref(db, `${PATHS.accounts}/${currentMgr.uid}`), { team: null });
    }
    // Remove club data
    await remove(ref(db, `career_team_management/${club.name}`));
    setDeleting(false);
    onSaved();
    onClose();
  }

  async function handleBankrupt() {
    await set(ref(db, `career_team_management/${club.name}/bankrupt`), true);
    onSaved();
    setView("main");
  }

  const currentManager = managers.find(m => m.team === club.name);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,20,0.88)",
        backdropFilter: "blur(14px)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "520px",
          background: "rgba(0,0,30,0.75)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255,20,147,0.25)",
          borderRadius: "24px",
          padding: "36px",
          boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "20px", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>

        {/* Club identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "14px",
            border: "2px solid #FF1493",
            background: "rgba(255,20,147,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", flexShrink: 0,
          }}>
            {club.badge ? <img src={club.badge} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🏟️"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.15rem" }}>{club.name}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: "2px" }}>
              Manager: <span style={{ color: "#FF69B4" }}>{currentManager?.username || "Unassigned"}</span>
            </div>
            {bankrupt && (
              <div style={{ display: "inline-block", background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.35)", borderRadius: "20px", padding: "2px 10px", marginTop: "6px", color: "#ff6b6b", fontSize: "0.72rem", fontWeight: 700 }}>
                🔴 BANKRUPT
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN VIEW ── */}
        {view === "main" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

            {[
              { icon: "🎯", label: "Set Objectives", sub: "Define what this club must achieve", action: () => setView("objectives") },
              { icon: "👤", label: "Change Manager", sub: "Assign a different manager to this club", action: () => setView("changeManager") },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: "100%", padding: "16px 20px",
                  background: "rgba(255,20,147,0.08)",
                  border: "1px solid rgba(255,20,147,0.25)",
                  borderRadius: "14px", color: "#fff",
                  cursor: "pointer", fontWeight: 600,
                  fontSize: "0.95rem", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "14px",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.18)"; e.currentTarget.style.borderColor = "#FF1493"; }}
                onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; }}
              >
                <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
                <div>
                  <div>{item.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: "2px" }}>{item.sub}</div>
                </div>
                <span style={{ marginLeft: "auto", color: "rgba(255,20,147,0.6)" }}>›</span>
              </button>
            ))}

            {/* Declare Bankrupt */}
            {!bankrupt && (
              <button
                onClick={() => setView("bankruptConfirm")}
                style={{
                  width: "100%", padding: "16px 20px",
                  background: "rgba(255,140,0,0.08)",
                  border: "1px solid rgba(255,140,0,0.25)",
                  borderRadius: "14px", color: "#ffaa33",
                  cursor: "pointer", fontWeight: 600,
                  fontSize: "0.95rem", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "14px",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "rgba(255,140,0,0.18)"; e.currentTarget.style.borderColor = "#ffaa33"; }}
                onMouseOut={e => { e.currentTarget.style.background = "rgba(255,140,0,0.08)"; e.currentTarget.style.borderColor = "rgba(255,140,0,0.25)"; }}
              >
                <span style={{ fontSize: "1.3rem" }}>💸</span>
                <div>
                  <div>Declare Bankrupt</div>
                  <div style={{ color: "rgba(255,180,80,0.5)", fontSize: "0.78rem", marginTop: "2px" }}>Mark this club as financially bankrupt</div>
                </div>
                <span style={{ marginLeft: "auto", color: "rgba(255,140,0,0.6)" }}>›</span>
              </button>
            )}

            {/* Delete Club */}
            <button
              onClick={() => setView("deleteConfirm")}
              style={{
                width: "100%", padding: "16px 20px",
                background: "rgba(255,60,60,0.08)",
                border: "1px solid rgba(255,60,60,0.25)",
                borderRadius: "14px", color: "#ff6b6b",
                cursor: "pointer", fontWeight: 600,
                fontSize: "0.95rem", textAlign: "left",
                display: "flex", alignItems: "center", gap: "14px",
                fontFamily: "inherit", transition: "all 0.2s",
                marginTop: "4px",
              }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(255,60,60,0.18)"; e.currentTarget.style.borderColor = "#ff6b6b"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(255,60,60,0.08)"; e.currentTarget.style.borderColor = "rgba(255,60,60,0.25)"; }}
            >
              <span style={{ fontSize: "1.3rem" }}>🗑️</span>
              <div>
                <div>Delete Club</div>
                <div style={{ color: "rgba(255,100,100,0.5)", fontSize: "0.78rem", marginTop: "2px" }}>Permanently remove this club from the system</div>
              </div>
              <span style={{ marginLeft: "auto", color: "rgba(255,60,60,0.6)" }}>›</span>
            </button>
          </div>
        )}

        {/* ── OBJECTIVES VIEW ── */}
        {view === "objectives" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", padding: 0, fontFamily: "inherit" }}>← Back</button>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "2px" }}>Set Club Objectives</div>

            {/* Add new objective */}
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={newObjective}
                onChange={e => setNewObjective(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addObjective()}
                placeholder="e.g. Win the league"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = "#FF1493"}
                onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
              />
              <button
                onClick={addObjective}
                style={{ padding: "0 18px", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#FF1493", fontWeight: 700, cursor: "pointer", fontSize: "1.1rem", flexShrink: 0 }}
              >+</button>
            </div>

            {/* Objectives list */}
            {objectives.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
                No objectives yet. Add one above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {objectives.map((obj, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    background: "rgba(255,20,147,0.06)",
                    border: "1px solid rgba(255,20,147,0.15)",
                    borderRadius: "12px", padding: "12px 16px",
                  }}>
                    <span style={{ color: "#FF69B4", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0 }}>•</span>
                    <span style={{ color: "#fff", fontSize: "0.9rem", flex: 1 }}>{obj}</span>
                    <button
                      onClick={() => removeObjective(i)}
                      style={{ background: "none", border: "none", color: "rgba(255,80,80,0.6)", cursor: "pointer", fontSize: "1rem", padding: "2px 6px", flexShrink: 0 }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {objMsg && (
              <div style={{ background: "rgba(0,200,100,0.12)", border: "1px solid rgba(0,200,100,0.3)", borderRadius: "10px", padding: "10px", color: "#4ade80", fontSize: "0.85rem", textAlign: "center" }}>{objMsg}</div>
            )}

            <button
              onClick={saveObjectives}
              disabled={objSaving}
              style={{ padding: "14px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif", opacity: objSaving ? 0.7 : 1 }}
            >{objSaving ? "Saving…" : "Save Objectives"}</button>
          </div>
        )}

        {/* ── CHANGE MANAGER VIEW ── */}
        {view === "changeManager" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", padding: 0, fontFamily: "inherit" }}>← Back</button>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "2px" }}>Change Manager</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>
              Current: <span style={{ color: "#FF69B4", fontWeight: 600 }}>{currentManager?.username || "Unassigned"}</span>
            </div>
            <div>
              <label style={labelStyle}>Select New Manager</label>
              <select
                value={selectedManagerUid}
                onChange={e => setSelectedManagerUid(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={e => e.target.style.borderColor = "#FF1493"}
                onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
              >
                <option value="" style={{ background: "#0a0018" }}>— Select a manager —</option>
                {managers
                  .filter(m => m.uid !== currentManager?.uid)
                  .map(m => (
                    <option key={m.uid} value={m.uid} style={{ background: "#0a0018" }}>
                      {m.username} {m.team ? `(${m.team})` : "(No Team)"}
                    </option>
                  ))
                }
              </select>
            </div>
            {managerMsg && (
              <div style={{
                background: managerMsg.includes("changed") ? "rgba(0,200,100,0.12)" : "rgba(255,80,80,0.12)",
                border: `1px solid ${managerMsg.includes("changed") ? "rgba(0,200,100,0.3)" : "rgba(255,80,80,0.3)"}`,
                borderRadius: "10px", padding: "10px", fontSize: "0.85rem", textAlign: "center",
                color: managerMsg.includes("changed") ? "#4ade80" : "#ff6b6b",
              }}>{managerMsg}</div>
            )}
            <button
              onClick={handleChangeManager}
              disabled={managerSaving}
              style={{ padding: "14px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif", opacity: managerSaving ? 0.7 : 1 }}
            >{managerSaving ? "Saving…" : "Confirm Change"}</button>
          </div>
        )}

        {/* ── BANKRUPT CONFIRM ── */}
        {view === "bankruptConfirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", padding: 0, fontFamily: "inherit" }}>← Back</button>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>💸</div>
              <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px", marginBottom: "10px" }}>Declare Bankrupt?</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.88rem", marginBottom: "6px" }}>
                This will mark <span style={{ color: "#ffaa33", fontWeight: 700 }}>{club.name}</span> as financially bankrupt.
              </div>
              <div style={{ color: "rgba(255,180,80,0.8)", fontSize: "0.82rem", background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.2)", borderRadius: "10px", padding: "12px", marginTop: "12px" }}>
                The club will be flagged as bankrupt in the system.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => setView("main")} style={{ padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", color: "#fff", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleBankrupt} style={{ padding: "14px", background: "rgba(255,140,0,0.2)", border: "1px solid rgba(255,140,0,0.4)", borderRadius: "14px", color: "#ffaa33", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
            </div>
          </div>
        )}

        {/* ── DELETE CONFIRM ── */}
        {view === "deleteConfirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", padding: 0, fontFamily: "inherit" }}>← Back</button>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>⚠️</div>
              <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px", marginBottom: "10px" }}>Delete Club?</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.88rem" }}>
                You are about to permanently delete <span style={{ color: "#FF69B4", fontWeight: 700 }}>{club.name}</span>.
              </div>
              <div style={{ color: "rgba(255,100,100,0.8)", fontSize: "0.82rem", background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", borderRadius: "10px", padding: "12px", marginTop: "14px" }}>
                This cannot be undone. The club and all its data will be removed.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => setView("main")} style={{ padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", color: "#fff", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleDeleteClub} disabled={deleting} style={{ padding: "14px", background: "rgba(255,60,60,0.2)", border: "1px solid rgba(255,60,60,0.4)", borderRadius: "14px", color: "#ff6b6b", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit", opacity: deleting ? 0.7 : 1 }}>{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
