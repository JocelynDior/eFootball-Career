import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAdmin } from "../context/AdminContext";

const inputStyle = {
  width: "100%",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,20,147,0.3)",
  borderRadius: "12px",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.95rem",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  color: "rgba(255,255,255,0.5)",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  marginBottom: "6px",
};

function StatBadge({ icon, label, value }) {
  return (
    <div style={{
      background: "rgba(255,20,147,0.07)",
      border: "1px solid rgba(255,20,147,0.18)",
      borderRadius: "16px",
      padding: "18px 20px",
      flex: 1,
      minWidth: "140px",
    }}>
      <div style={{ fontSize: "1.6rem", marginBottom: "6px" }}>{icon}</div>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", marginTop: "4px" }}>{value}</div>
    </div>
  );
}

export default function ManagerProfilePage() {
  const navigate = useNavigate();
  const { manager, logoutManager, updateManagerField } = useAdmin();

  const [editSection, setEditSection] = useState(null); // "email" | "password" | null
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
        <div style={{ maxWidth: "500px", margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,20,147,0.2)", borderRadius: "24px", padding: "48px 36px"
          }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>👤</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#FF1493", marginBottom: "12px" }}>
              Not Signed In
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "28px" }}>
              You need a manager account to view this page.
            </p>
            <button
              onClick={() => navigate("/create-account")}
              style={{
                padding: "14px 36px", background: "linear-gradient(135deg, #FF1493, #FF69B4)",
                border: "none", borderRadius: "14px", color: "#fff",
                fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif"
              }}
            >Create / Sign In</button>
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

  const balance = manager.balance ?? 1000000000;
  const formattedBalance = "€" + balance.toLocaleString("en-EU");

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "36px 20px 80px" }}>

        {/* Notifications */}
        {successMsg && (
          <div style={{
            background: "rgba(0,200,100,0.12)", border: "1px solid rgba(0,200,100,0.3)",
            borderRadius: "12px", padding: "12px 20px", color: "#4ade80",
            fontSize: "0.9rem", textAlign: "center", marginBottom: "20px"
          }}>{successMsg}</div>
        )}
        {errorMsg && (
          <div style={{
            background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)",
            borderRadius: "12px", padding: "12px 20px", color: "#ff6b6b",
            fontSize: "0.9rem", textAlign: "center", marginBottom: "20px"
          }}>{errorMsg}</div>
        )}

        {/* ── Profile header ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,20,147,0.2)",
          borderRadius: "24px",
          padding: "36px",
          marginBottom: "20px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Glow accent */}
          <div style={{
            position: "absolute", top: "-60px", right: "-60px",
            width: "200px", height: "200px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,20,147,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: "100px", height: "100px", borderRadius: "50%",
              border: "3px solid #FF1493",
              boxShadow: "0 0 28px rgba(255,20,147,0.45)",
              overflow: "hidden",
              background: "rgba(255,20,147,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {manager.profilePhoto ? (
                <img src={manager.profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "3rem" }}>👤</span>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem",
                color: "#fff", letterSpacing: "2px", lineHeight: 1
              }}>{manager.username}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "6px" }}>
                {manager.email}
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.25)",
                borderRadius: "20px", padding: "4px 14px", marginTop: "10px"
              }}>
                <span style={{ color: "#FF1493", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1px" }}>
                  MANAGER
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => { logoutManager(); navigate("/create-account"); }}
              style={{
                background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
                color: "#ff6b6b", padding: "10px 20px", borderRadius: "12px",
                cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                fontFamily: "'Inter', sans-serif",
              }}
            >Sign Out</button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
          <StatBadge
            icon="🏆"
            label="Rank"
            value={manager.rank ? `#${manager.rank}` : "Unranked"}
          />
          <StatBadge
            icon="⚽"
            label="Team"
            value={manager.team || "Not Assigned"}
          />
          <StatBadge
            icon="💰"
            label="Balance"
            value={formattedBalance}
          />
        </div>

        {/* ── Profile photo note ── */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,20,147,0.12)",
          borderRadius: "18px",
          padding: "18px 24px",
          marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "14px"
        }}>
          <span style={{ fontSize: "1.4rem" }}>📸</span>
          <div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "0.9rem" }}>
              Profile Photo
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: "2px" }}>
              Assigned by the admin. Contact your league admin to update your photo.
            </div>
          </div>
        </div>

        {/* ── Account settings ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,20,147,0.2)",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem",
            color: "#FF1493", letterSpacing: "2px", marginBottom: "24px"
          }}>Account Settings</h2>

          {/* Change Email */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: editSection === "email" ? "16px" : "0"
            }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>Email Address</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", marginTop: "3px" }}>{manager.email}</div>
              </div>
              <button
                onClick={() => setEditSection(editSection === "email" ? null : "email")}
                style={{
                  background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)",
                  color: "#FF1493", padding: "8px 18px", borderRadius: "10px",
                  cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", fontFamily: "'Inter', sans-serif"
                }}
              >{editSection === "email" ? "Cancel" : "Change"}</button>
            </div>

            {editSection === "email" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div><label style={labelStyle}>New Email</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@email.com" style={inputStyle} /></div>
                <div><label style={labelStyle}>Current Password (to confirm)</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Your current password" style={inputStyle} /></div>
                <button onClick={handleSaveEmail} disabled={saving} style={{
                  padding: "12px", background: "linear-gradient(135deg, #FF1493, #FF69B4)",
                  border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700,
                  cursor: "pointer", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif",
                  opacity: saving ? 0.7 : 1
                }}>{saving ? "Saving…" : "Save Email"}</button>
              </div>
            )}
          </div>

          <div style={{ height: "1px", background: "rgba(255,20,147,0.12)", margin: "4px 0 20px" }} />

          {/* Change Password */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: editSection === "password" ? "16px" : "0"
            }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>Password</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", marginTop: "3px" }}>••••••••</div>
              </div>
              <button
                onClick={() => setEditSection(editSection === "password" ? null : "password")}
                style={{
                  background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)",
                  color: "#FF1493", padding: "8px 18px", borderRadius: "10px",
                  cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", fontFamily: "'Inter', sans-serif"
                }}
              >{editSection === "password" ? "Cancel" : "Change"}</button>
            </div>

            {editSection === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div><label style={labelStyle}>Current Password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" style={inputStyle} /></div>
                <div><label style={labelStyle}>New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle} /></div>
                <div><label style={labelStyle}>Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" style={inputStyle} /></div>
                <button onClick={handleSavePassword} disabled={saving} style={{
                  padding: "12px", background: "linear-gradient(135deg, #FF1493, #FF69B4)",
                  border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700,
                  cursor: "pointer", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif",
                  opacity: saving ? 0.7 : 1
                }}>{saving ? "Saving…" : "Save Password"}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
