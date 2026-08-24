import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, update, remove } from "firebase/database";

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

const sectionStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,20,147,0.12)",
  borderRadius: "16px",
  padding: "20px 22px",
  marginBottom: "14px",
};

export default function AdminManagerModal({ mgr, onClose, onSaved }) {
  const [view, setView] = useState("main"); // main | resetPassword | changeTeam | deleteConfirm

  // Reset password
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  // Change team
  const [newTeam, setNewTeam] = useState(mgr.team || "");
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamMsg, setTeamMsg] = useState("");

  // Delete
  const [deleting, setDeleting] = useState(false);

  // Team history
  const teamHistory = mgr.teamHistory
    ? Object.values(mgr.teamHistory).sort((a, b) => (b.assignedAt || 0) - (a.assignedAt || 0))
    : [];

  async function handleResetPassword() {
    if (newPassword.length < 6) { setPwMsg("Password must be at least 6 characters."); return; }
    setPwSaving(true);
    await update(ref(db, `${PATHS.accounts}/${mgr.uid}`), { password: newPassword });
    setPwSaving(false);
    setPwMsg("Password reset successfully!");
    setNewPassword("");
    setTimeout(() => { setPwMsg(""); setView("main"); onSaved(); }, 1500);
  }

  async function handleChangeTeam() {
    if (!newTeam.trim()) { setTeamMsg("Team name cannot be empty."); return; }
    setTeamSaving(true);
    const now = Date.now();
    const historyEntry = {
      team: mgr.team || "None",
      assignedAt: mgr.teamAssignedAt || now,
      removedAt: now,
    };
    const updates = {
      [`${PATHS.accounts}/${mgr.uid}/team`]: newTeam.trim(),
      [`${PATHS.accounts}/${mgr.uid}/teamAssignedAt`]: now,
      [`${PATHS.accounts}/${mgr.uid}/teamHistory/${now}`]: historyEntry,
    };
    await update(ref(db), updates);
    setTeamSaving(false);
    setTeamMsg("Team updated!");
    setTimeout(() => { setTeamMsg(""); setView("main"); onSaved(); }, 1500);
  }

  async function handleDelete() {
    setDeleting(true);
    await remove(ref(db, `${PATHS.accounts}/${mgr.uid}`));
    setDeleting(false);
    onSaved();
    onClose();
  }

  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

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

        {/* Manager identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <div style={{
            width: "60px", height: "60px", borderRadius: "50%",
            border: "2px solid #FF1493",
            background: "rgba(255,20,147,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", flexShrink: 0,
          }}>
            {mgr.profilePhoto
              ? <img src={mgr.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: "1.8rem" }}>👤</span>
            }
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{mgr.username}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{mgr.email}</div>
            <div style={{ color: "#FF69B4", fontSize: "0.75rem", marginTop: "2px" }}>{mgr.team || "No Team"}</div>
          </div>
        </div>

        {/* ── MAIN VIEW ── */}
        {view === "main" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

            {/* Reset Password */}
            <button
              onClick={() => setView("resetPassword")}
              style={{
                width: "100%", padding: "16px 20px",
                background: "rgba(255,20,147,0.08)",
                border: "1px solid rgba(255,20,147,0.25)",
                borderRadius: "14px", color: "#fff",
                cursor: "pointer", fontWeight: 600,
                fontSize: "0.95rem", textAlign: "left",
                display: "flex", alignItems: "center", gap: "14px",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.18)"; e.currentTarget.style.borderColor = "#FF1493"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; }}
            >
              <span style={{ fontSize: "1.3rem" }}>🔑</span>
              <div>
                <div>Reset Password</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: "2px" }}>Set a new password for this manager</div>
              </div>
              <span style={{ marginLeft: "auto", color: "rgba(255,20,147,0.6)" }}>›</span>
            </button>

            {/* Change Team */}
            <button
              onClick={() => { setView("changeTeam"); setNewTeam(mgr.team || ""); }}
              style={{
                width: "100%", padding: "16px 20px",
                background: "rgba(255,20,147,0.08)",
                border: "1px solid rgba(255,20,147,0.25)",
                borderRadius: "14px", color: "#fff",
                cursor: "pointer", fontWeight: 600,
                fontSize: "0.95rem", textAlign: "left",
                display: "flex", alignItems: "center", gap: "14px",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.18)"; e.currentTarget.style.borderColor = "#FF1493"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; }}
            >
              <span style={{ fontSize: "1.3rem" }}>⚽</span>
              <div>
                <div>Change Team</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: "2px" }}>Reassign manager to a different club</div>
              </div>
              <span style={{ marginLeft: "auto", color: "rgba(255,20,147,0.6)" }}>›</span>
            </button>

            {/* Delete Account */}
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
                fontFamily: "inherit",
                transition: "all 0.2s",
                marginTop: "4px",
              }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(255,60,60,0.18)"; e.currentTarget.style.borderColor = "#ff6b6b"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(255,60,60,0.08)"; e.currentTarget.style.borderColor = "rgba(255,60,60,0.25)"; }}
            >
              <span style={{ fontSize: "1.3rem" }}>🗑️</span>
              <div>
                <div>Delete Account</div>
                <div style={{ color: "rgba(255,100,100,0.6)", fontSize: "0.78rem", marginTop: "2px" }}>Permanently remove this manager</div>
              </div>
              <span style={{ marginLeft: "auto", color: "rgba(255,60,60,0.6)" }}>›</span>
            </button>

            {/* Team History */}
            {teamHistory.length > 0 && (
              <div style={{ ...sectionStyle, marginTop: "8px" }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
                  📋 Team History
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {teamHistory.map((entry, i) => (
                    <div key={i} style={{
                      background: "rgba(255,20,147,0.05)",
                      border: "1px solid rgba(255,20,147,0.1)",
                      borderRadius: "10px",
                      padding: "12px 14px",
                    }}>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>{entry.team}</div>
                      <div style={{ display: "flex", gap: "16px", marginTop: "5px" }}>
                        <div>
                          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", textTransform: "uppercase" }}>Assigned </span>
                          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.78rem" }}>{formatDate(entry.assignedAt)}</span>
                        </div>
                        <div>
                          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", textTransform: "uppercase" }}>Left </span>
                          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.78rem" }}>{formatDate(entry.removedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RESET PASSWORD VIEW ── */}
        {view === "resetPassword" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", padding: 0, fontFamily: "inherit" }}>← Back</button>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "2px" }}>Reset Password</div>
            <div>
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#FF1493"}
                onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
              />
            </div>
            {pwMsg && (
              <div style={{
                background: pwMsg.includes("success") ? "rgba(0,200,100,0.12)" : "rgba(255,80,80,0.12)",
                border: `1px solid ${pwMsg.includes("success") ? "rgba(0,200,100,0.3)" : "rgba(255,80,80,0.3)"}`,
                borderRadius: "10px", padding: "10px", fontSize: "0.85rem", textAlign: "center",
                color: pwMsg.includes("success") ? "#4ade80" : "#ff6b6b",
              }}>{pwMsg}</div>
            )}
            <button
              onClick={handleResetPassword}
              disabled={!!pwSaving}
              style={{ padding: "14px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif", opacity: pwSaving ? 0.7 : 1 }}
            >{pwSaving ? "Saving…" : "Set New Password"}</button>
          </div>
        )}

        {/* ── CHANGE TEAM VIEW ── */}
        {view === "changeTeam" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", padding: 0, fontFamily: "inherit" }}>← Back</button>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "2px" }}>Change Team</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>
              Current team: <span style={{ color: "#FF69B4", fontWeight: 600 }}>{mgr.team || "None"}</span>
            </div>
            <div>
              <label style={labelStyle}>New Team</label>
              <input
                value={newTeam}
                onChange={e => setNewTeam(e.target.value)}
                placeholder="e.g. Real Madrid"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#FF1493"}
                onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
              />
            </div>
            {teamMsg && (
              <div style={{
                background: teamMsg.includes("updated") ? "rgba(0,200,100,0.12)" : "rgba(255,80,80,0.12)",
                border: `1px solid ${teamMsg.includes("updated") ? "rgba(0,200,100,0.3)" : "rgba(255,80,80,0.3)"}`,
                borderRadius: "10px", padding: "10px", fontSize: "0.85rem", textAlign: "center",
                color: teamMsg.includes("updated") ? "#4ade80" : "#ff6b6b",
              }}>{teamMsg}</div>
            )}
            <button
              onClick={handleChangeTeam}
              disabled={teamSaving}
              style={{ padding: "14px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif", opacity: teamSaving ? 0.7 : 1 }}
            >{teamSaving ? "Saving…" : "Confirm Team Change"}</button>
          </div>
        )}

        {/* ── DELETE CONFIRM VIEW ── */}
        {view === "deleteConfirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", padding: 0, fontFamily: "inherit" }}>← Back</button>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>⚠️</div>
              <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px", marginBottom: "10px" }}>Delete Account?</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.88rem", marginBottom: "6px" }}>
                You are about to permanently delete:
              </div>
              <div style={{ color: "#FF69B4", fontWeight: 700, fontSize: "1rem", marginBottom: "20px" }}>{mgr.username}</div>
              <div style={{ color: "rgba(255,100,100,0.8)", fontSize: "0.82rem", background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", borderRadius: "10px", padding: "12px", marginBottom: "20px" }}>
                This action cannot be undone. All data for this account will be lost.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                onClick={() => setView("main")}
                style={{ padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", color: "#fff", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit" }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: "14px", background: "rgba(255,60,60,0.2)", border: "1px solid rgba(255,60,60,0.4)", borderRadius: "14px", color: "#ff6b6b", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit", opacity: deleting ? 0.7 : 1 }}
              >{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
