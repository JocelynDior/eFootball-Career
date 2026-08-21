import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAdmin } from "../context/AdminContext";

const inputStyle = {
  width: "100%",
  padding: "18px 22px",
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,20,147,0.3)",
  borderRadius: "14px",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  fontSize: "1.1rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const labelStyle = {
  display: "block",
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.9rem",
  fontWeight: 600,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  marginBottom: "8px",
};

function StatBadge({ icon, label, value }) {
  return (
    <div style={{ background: "rgba(255,20,147,0.07)", border: "1px solid rgba(255,20,147,0.18)", borderRadius: "20px", padding: "22px 24px", flex: 1, minWidth: "140px", animation: "fadeSlideIn 0.4s ease" }}>
      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{icon}</div>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem", marginTop: "6px" }}>{value}</div>
    </div>
  );
}

export default function ManagerProfilePage() {
  const navigate = useNavigate();
  const { manager, logoutManager, updateManagerField } = useAdmin();
  const [editSection, setEditSection] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!manager) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
        <Navbar />
        <div style={{ width: "100%", maxWidth: "640px", margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "28px", padding: "56px 40px", animation: "fadeSlideIn 0.4s ease" }}>
            <div style={{ fontSize: "4.5rem", marginBottom: "20px" }}>👤</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem", color: "#FF1493", marginBottom: "14px" }}>Not Signed In</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "32px", fontSize: "1.1rem" }}>You need a manager account to view this page.</p>
            <button onClick={() => navigate("/create-account")} style={{ padding: "18px 48px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "16px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 20px rgba(255,20,147,0.4)" }}>
              Create / Sign In
            </button>
          </div>
        </div>
        <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }`}</style>
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

  const balance = manager.balance ?? 0;
  const formattedBalance = "€" + balance.toLocaleString("en-EU");

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <div style={{ width: "100%", maxWidth: "860px", margin: "0 auto", padding: "36px 24px 80px" }}>

        {successMsg && <div style={{ background: "rgba(0,200,100,0.12)", border: "1px solid rgba(0,200,100,0.3)", borderRadius: "14px", padding: "14px 22px", color: "#4ade80", fontSize: "1rem", textAlign: "center", marginBottom: "20px", animation: "fadeSlideIn 0.3s ease" }}>{successMsg}</div>}
        {errorMsg && <div style={{ background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: "14px", padding: "14px 22px", color: "#ff6b6b", fontSize: "1rem", textAlign: "center", marginBottom: "20px", animation: "fadeSlideIn 0.3s ease" }}>{errorMsg}</div>}

        {/* Profile header */}
        <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "28px", padding: "40px", marginBottom: "24px", boxShadow: "0 8px 40px rgba(0,0,0,0.35)", position: "relative", overflow: "hidden", animation: "fadeSlideIn 0.4s ease" }}>
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,20,147,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "32px", flexWrap: "wrap" }}>
            <div style={{ width: "120px", height: "120px", borderRadius: "50%", border: "3px solid #FF1493", boxShadow: "0 0 32px rgba(255,20,147,0.45)", overflow: "hidden", background: "rgba(255,20,147,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {manager.profilePhoto ? <img src={manager.profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "3.5rem" }}>👤</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#fff", letterSpacing: "2px", lineHeight: 1 }}>{manager.username}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", marginTop: "8px" }}>{manager.email}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "20px", padding: "6px 18px", marginTop: "12px" }}>
                <span style={{ color: "#FF1493", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1px" }}>MANAGER</span>
              </div>
            </div>
            <button onClick={() => { logoutManager(); navigate("/create-account"); }} style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff6b6b", padding: "12px 24px", borderRadius: "14px", cursor: "pointer", fontWeight: 600, fontSize: "1rem", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,80,80,0.2)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(255,80,80,0.1)"}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "24px" }}>
          <StatBadge icon="🏆" label="Rank" value={manager.rank ? `#${manager.rank}` : "Unranked"} />
          <StatBadge icon="⚽" label="Team" value={manager.team || "Not Assigned"} />
          <StatBadge icon="💰" label="Balance" value={formattedBalance} />
        </div>

        {/* Profile photo note */}
        <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,20,147,0.12)", borderRadius: "20px", padding: "22px 28px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px", animation: "fadeSlideIn 0.5s ease" }}>
          <span style={{ fontSize: "1.8rem" }}>📸</span>
          <div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: "1.05rem" }}>Profile Photo</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginTop: "3px" }}>Assigned by the admin. Contact your league admin to update your photo.</div>
          </div>
        </div>

        {/* Account settings */}
        <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "28px", padding: "36px", boxShadow: "0 8px 40px rgba(0,0,0,0.3)", animation: "fadeSlideIn 0.6s ease" }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#FF1493", letterSpacing: "2px", marginBottom: "28px" }}>Account Settings</h2>

          {/* Change Email */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editSection === "email" ? "18px" : "0" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "1.1rem" }}>Email Address</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", marginTop: "4px" }}>{manager.email}</div>
              </div>
              <button onClick={() => setEditSection(editSection === "email" ? null : "email")} style={{ background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", padding: "10px 22px", borderRadius: "12px", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.12)"}>
                {editSection === "email" ? "Cancel" : "Change"}
              </button>
            </div>
            {editSection === "email" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", animation: "fadeSlideIn 0.25s ease" }}>
                <div><label style={labelStyle}>New Email</label><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@email.com" style={inputStyle} /></div>
                <div><label style={labelStyle}>Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Your current password" style={inputStyle} /></div>
                <button onClick={handleSaveEmail} disabled={saving} style={{ padding: "14px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem", fontFamily: "'Inter', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Email"}</button>
              </div>
            )}
          </div>

          <div style={{ height: "1px", background: "rgba(255,20,147,0.12)", margin: "4px 0 24px" }} />

          {/* Change Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editSection === "password" ? "18px" : "0" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "1.1rem" }}>Password</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", marginTop: "4px" }}>••••••••</div>
              </div>
              <button onClick={() => setEditSection(editSection === "password" ? null : "password")} style={{ background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", padding: "10px 22px", borderRadius: "12px", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.12)"}>
                {editSection === "password" ? "Cancel" : "Change"}
              </button>
            </div>
            {editSection === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", animation: "fadeSlideIn 0.25s ease" }}>
                <div><label style={labelStyle}>Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" style={inputStyle} /></div>
                <div><label style={labelStyle}>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle} /></div>
                <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" style={inputStyle} /></div>
                <button onClick={handleSavePassword} disabled={saving} style={{ padding: "14px", background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem", fontFamily: "'Inter', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Password"}</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
