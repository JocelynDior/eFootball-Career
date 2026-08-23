import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";
import { useAdmin } from "../context/AdminContext";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const inputStyle = {
  width: "100%",
  padding: "24px 28px",
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,20,147,0.3)",
  borderRadius: "18px",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  fontSize: "3rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const labelStyle = {
  display: "block",
  color: "rgba(255,255,255,0.55)",
  fontSize: "2.4rem",
  fontWeight: 600,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  marginBottom: "12px",
};

const TABS = [
  { id: "career", label: "CAREER" },
  { id: "objectives", label: "OBJECTIVES" },
  { id: "account", label: "ACCOUNT" },
];

function formatBalance(num) {
  if (num === undefined || num === null) return "€0.00";
  return `€${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── 4-block stat grid ────────────────────────────────────────────────────
function StatBlock({ icon, label, value }) {
  return (
    <div style={{
      ...GLASS,
      borderRadius: "22px",
      padding: "36px 28px",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", textAlign: "center",
      gap: "10px",
    }}>
      <div style={{ fontSize: "3.6rem" }}>{icon}</div>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "2.1rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: "3rem", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function ManagerProfilePage() {
  const navigate = useNavigate();
  const { manager, logoutManager, updateManagerField, isAdmin } = useAdmin();
  const [tab, setTab] = useState("career");
  const [teamBalance, setTeamBalance] = useState(null);
  const [managingDirector, setManagingDirector] = useState("");

  // Account edit state
  const [editSection, setEditSection] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Profile photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // Load team balance from TeamManagement
  useEffect(() => {
    if (!manager?.team) return;
    const unsub = onValue(ref(db, `career_team_management/${manager.team}/finance/transactions`), snap => {
      const data = snap.val();
      if (!data) { setTeamBalance(0); return; }
      const txs = Object.values(data);
      const total = txs.reduce((sum, tx) => {
        const amt = Number(tx.amount) || 0;
        return tx.type === "income" ? sum + amt : sum - amt;
      }, 0);
      setTeamBalance(Math.max(0, total));
    });
    return () => unsub();
  }, [manager?.team]);

  // Load team managing director name
  useEffect(() => {
    if (!manager?.team) return;
    const unsub = onValue(ref(db, `career_team_management/${manager.team}/info`), snap => {
      const data = snap.val();
      if (data?.managingDirector) setManagingDirector(data.managingDirector);
    });
    return () => unsub();
  }, [manager?.team]);

  // Admin sets cover photo via manager's Firebase record — covered by updateManagerField
  // We also fetch it here if it exists
  const coverPhoto = manager?.coverPhoto || null;

  if (!manager) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo />
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "40px 20px" }}>
          <div style={{ ...GLASS, borderRadius: "28px", padding: "60px 48px", maxWidth: "540px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "6rem", marginBottom: "24px" }}>👤</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "5rem", color: "#FF1493", marginBottom: "18px", letterSpacing: "3px" }}>Not Signed In</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "40px", fontSize: "3rem" }}>You need a manager account to view this page.</p>
            <button onClick={() => navigate("/create-account")} style={{ padding: "24px 60px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "20px", color: "#fff", fontWeight: 700, fontSize: "2.8rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(255,20,147,0.4)" }}>
              Create / Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  function flash(msg, isError = false) {
    if (isError) { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 3500); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); }
  }

  async function handleSaveEmail() {
    if (!newEmail.trim()) return flash("Email cannot be empty.", true);
    if (currentPassword !== manager.password) return flash("Current password is incorrect.", true);
    setSaving(true);
    await updateManagerField(manager.uid, { email: newEmail.trim() });
    setSaving(false);
    setNewEmail(""); setCurrentPassword(""); setEditSection(null);
    flash("Email updated successfully.");
  }

  async function handleSavePassword() {
    if (currentPassword !== manager.password) return flash("Current password is incorrect.", true);
    if (newPassword.length < 6) return flash("New password must be at least 6 characters.", true);
    if (newPassword !== confirmPassword) return flash("Passwords do not match.", true);
    setSaving(true);
    await updateManagerField(manager.uid, { password: newPassword });
    setSaving(false);
    setNewPassword(""); setConfirmPassword(""); setCurrentPassword(""); setEditSection(null);
    flash("Password updated successfully.");
  }

  async function handleSaveUsername() {
    if (!newUsername.trim()) return flash("Username cannot be empty.", true);
    setSaving(true);
    await updateManagerField(manager.uid, { username: newUsername.trim() });
    setSaving(false);
    setNewUsername(""); setEditSection(null);
    flash("Username updated.");
  }

  async function handleSaveDescription() {
    setSaving(true);
    await updateManagerField(manager.uid, { description: newDescription.trim() });
    setSaving(false);
    setNewDescription(""); setEditSection(null);
    flash("Description updated.");
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadToImgBB(file);
      await updateManagerField(manager.uid, { profilePhoto: url });
      flash("Profile photo updated!");
    } catch (err) {
      flash("Photo upload failed: " + err.message, true);
    }
    setUploadingPhoto(false);
  }

  const managerBalance = manager.balance ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      {/* Cover photo */}
      <div style={{
        width: "100%", height: "260px",
        background: coverPhoto ? "transparent" : "linear-gradient(135deg, rgba(255,20,147,0.2), rgba(0,0,40,0.8))",
        position: "relative", overflow: "hidden",
      }}>
        {coverPhoto && (
          <img src={coverPhoto} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,10,0.9) 100%)" }} />
      </div>

      {/* Profile section */}
      <div style={{ width: "100%", padding: "0 24px", boxSizing: "border-box" }}>

        {/* Avatar + name row — Twitter/X style */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "-70px", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>

          {/* Left: avatar + name + description */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "24px", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: "140px", height: "140px", borderRadius: "50%",
                border: "4px solid #FF1493",
                boxShadow: "0 0 40px rgba(255,20,147,0.5)",
                overflow: "hidden",
                background: "rgba(255,20,147,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, cursor: "pointer", position: "relative",
                transition: "transform 0.15s",
              }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {manager.profilePhoto
                ? <img src={manager.profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "5rem" }}>👤</span>
              }
              {uploadingPhoto && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>⏳</div>
              )}
              <div style={{ position: "absolute", bottom: "6px", right: "6px", width: "32px", height: "32px", borderRadius: "50%", background: "#FF1493", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", border: "2px solid #000" }}>📷</div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />

            {/* Name + description */}
            <div style={{ paddingBottom: "8px" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "5rem", color: "#fff", letterSpacing: "3px", lineHeight: 1 }}>
                {manager.username}
              </div>
              {manager.description && (
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "2.4rem", marginTop: "6px", maxWidth: "500px" }}>
                  {manager.description}
                </div>
              )}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "20px", padding: "6px 20px", marginTop: "10px" }}>
                <span style={{ color: "#FF1493", fontSize: "2rem", fontWeight: 700, letterSpacing: "1px" }}>⚽ MANAGER</span>
              </div>
            </div>
          </div>

          {/* Right: fans, personal balance, managing director */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", paddingBottom: "12px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2rem", textTransform: "uppercase", letterSpacing: "1px" }}>Fans</div>
              <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "2px" }}>12,450</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2rem", textTransform: "uppercase", letterSpacing: "1px" }}>Personal Balance</div>
              <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "2px" }}>
                €{managerBalance.toLocaleString("en-US")}
              </div>
            </div>
            {(managingDirector || manager?.team) && (
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2rem", textTransform: "uppercase", letterSpacing: "1px" }}>Managing Director</div>
                <div style={{ color: "#fff", fontSize: "2.8rem", fontWeight: 700 }}>
                  {managingDirector || manager.team || "—"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Flash messages */}
        {successMsg && (
          <div style={{ background: "rgba(0,200,100,0.12)", border: "1px solid rgba(0,200,100,0.3)", borderRadius: "16px", padding: "18px 28px", color: "#4ade80", fontSize: "2.4rem", textAlign: "center", marginBottom: "20px" }}>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: "16px", padding: "18px 28px", color: "#ff6b6b", fontSize: "2.4rem", textAlign: "center", marginBottom: "20px" }}>
            {errorMsg}
          </div>
        )}

        {/* 4-block stat grid (2x2) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
          <StatBlock icon="🏆" label="Rank" value={manager.rank ? `#${manager.rank}` : "Unranked"} />
          <StatBlock icon="💰" label="Team Balance" value={teamBalance !== null ? formatBalance(teamBalance) : "Loading..."} />
          <StatBlock icon="💸" label="Monthly Wage" value={manager.monthlyWage ? `€${Number(manager.monthlyWage).toLocaleString()}` : "—"} />
          <StatBlock icon="🏟️" label="Clubs Owned" value="0" />
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: "24px" }}>
          <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
        </div>

        {/* Career Tab — empty */}
        {tab === "career" && (
          <div style={{ ...GLASS, borderRadius: "24px", padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "5rem", marginBottom: "20px" }}>📈</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", color: "rgba(255,255,255,0.3)", letterSpacing: "4px" }}>
              Career Stats Coming Soon
            </div>
          </div>
        )}

        {/* Objectives Tab — empty */}
        {tab === "objectives" && (
          <div style={{ ...GLASS, borderRadius: "24px", padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "5rem", marginBottom: "20px" }}>🎯</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", color: "rgba(255,255,255,0.3)", letterSpacing: "4px" }}>
              Objectives Coming Soon
            </div>
          </div>
        )}

        {/* Account Tab */}
        {tab === "account" && (
          <div style={{ ...GLASS, borderRadius: "24px", padding: "48px", marginBottom: "80px" }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4.2rem", color: "#FF1493", letterSpacing: "3px", marginBottom: "40px" }}>Account Settings</h2>

            {/* Change Profile Photo */}
            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "2.8rem" }}>Profile Photo</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2.2rem", marginTop: "6px" }}>Click your avatar above or tap Change</div>
                </div>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  style={{ background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", padding: "16px 32px", borderRadius: "16px", cursor: "pointer", fontWeight: 600, fontSize: "2.2rem", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.12)"}
                >
                  {uploadingPhoto ? "Uploading..." : "Change"}
                </button>
              </div>
            </div>

            <div style={{ height: "1px", background: "rgba(255,20,147,0.12)", margin: "4px 0 36px" }} />

            {/* Change Username */}
            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editSection === "username" ? "20px" : "0" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "2.8rem" }}>Username</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2.2rem", marginTop: "6px" }}>{manager.username}</div>
                </div>
                <button
                  onClick={() => { setEditSection(editSection === "username" ? null : "username"); setNewUsername(manager.username || ""); }}
                  style={{ background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", padding: "16px 32px", borderRadius: "16px", cursor: "pointer", fontWeight: 600, fontSize: "2.2rem", fontFamily: "'Inter', sans-serif" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.12)"}
                >
                  {editSection === "username" ? "Cancel" : "Change"}
                </button>
              </div>
              {editSection === "username" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div><label style={labelStyle}>New Username</label><input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Enter new username" style={inputStyle} /></div>
                  <button onClick={handleSaveUsername} disabled={saving} style={{ padding: "20px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "18px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "2.4rem", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Username"}</button>
                </div>
              )}
            </div>

            <div style={{ height: "1px", background: "rgba(255,20,147,0.12)", margin: "4px 0 36px" }} />

            {/* Change Description */}
            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editSection === "description" ? "20px" : "0" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "2.8rem" }}>Description / Bio</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2.2rem", marginTop: "6px" }}>{manager.description || "No description set"}</div>
                </div>
                <button
                  onClick={() => { setEditSection(editSection === "description" ? null : "description"); setNewDescription(manager.description || ""); }}
                  style={{ background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", padding: "16px 32px", borderRadius: "16px", cursor: "pointer", fontWeight: 600, fontSize: "2.2rem", fontFamily: "'Inter', sans-serif" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.12)"}
                >
                  {editSection === "description" ? "Cancel" : "Edit"}
                </button>
              </div>
              {editSection === "description" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>Bio / Description</label>
                    <textarea
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                      placeholder="Write something about yourself..."
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>
                  <button onClick={handleSaveDescription} disabled={saving} style={{ padding: "20px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "18px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "2.4rem", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Description"}</button>
                </div>
              )}
            </div>

            <div style={{ height: "1px", background: "rgba(255,20,147,0.12)", margin: "4px 0 36px" }} />

            {/* Change Email */}
            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editSection === "email" ? "20px" : "0" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "2.8rem" }}>Email Address</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2.2rem", marginTop: "6px" }}>{manager.email}</div>
                </div>
                <button onClick={() => setEditSection(editSection === "email" ? null : "email")} style={{ background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", padding: "16px 32px", borderRadius: "16px", cursor: "pointer", fontWeight: 600, fontSize: "2.2rem", fontFamily: "'Inter', sans-serif" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.12)"}>
                  {editSection === "email" ? "Cancel" : "Change"}
                </button>
              </div>
              {editSection === "email" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div><label style={labelStyle}>New Email</label><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@email.com" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Your current password" style={inputStyle} /></div>
                  <button onClick={handleSaveEmail} disabled={saving} style={{ padding: "20px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "18px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "2.4rem", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Email"}</button>
                </div>
              )}
            </div>

            <div style={{ height: "1px", background: "rgba(255,20,147,0.12)", margin: "4px 0 36px" }} />

            {/* Change Password */}
            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editSection === "password" ? "20px" : "0" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "2.8rem" }}>Password</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2.2rem", marginTop: "6px" }}>••••••••</div>
                </div>
                <button onClick={() => setEditSection(editSection === "password" ? null : "password")} style={{ background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", padding: "16px 32px", borderRadius: "16px", cursor: "pointer", fontWeight: 600, fontSize: "2.2rem", fontFamily: "'Inter', sans-serif" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.12)"}>
                  {editSection === "password" ? "Cancel" : "Change"}
                </button>
              </div>
              {editSection === "password" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div><label style={labelStyle}>Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" style={inputStyle} /></div>
                  <div><label style={labelStyle}>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" style={inputStyle} /></div>
                  <button onClick={handleSavePassword} disabled={saving} style={{ padding: "20px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "18px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "2.4rem", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Password"}</button>
                </div>
              )}
            </div>

            <div style={{ height: "1px", background: "rgba(255,20,147,0.12)", margin: "4px 0 36px" }} />

            {/* Sign Out */}
            <button
              onClick={() => { logoutManager(); navigate("/create-account"); }}
              style={{ width: "100%", padding: "24px", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff6b6b", borderRadius: "18px", cursor: "pointer", fontWeight: 700, fontSize: "2.8rem", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,80,80,0.2)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(255,80,80,0.1)"}
            >
              🚪 Sign Out
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
