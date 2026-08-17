import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { useState } from "react";

const menuItems = [
  { label: "🏠 Home", path: "/" },
  { label: "💸 Transfer Market", path: "/transfer-market" },
  { label: "🛠️ Team Management", path: "/team-management" },
  { label: "📅 Calendar", path: "/calendar" },
  { label: "📊 Manager Rankings", path: "/manager-rankings" },
  { label: "📄 Terms of Service", path: "/terms" },
  { label: "🔒 Privacy Policy", path: "/privacy" },
];

export default function SideMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { isAdmin, loginAdmin, logoutAdmin, manager, logoutManager } = useAdmin();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  const adminProfile = (() => {
    try { return JSON.parse(localStorage.getItem("careerAdminProfile") || "{}"); } catch { return {}; }
  })();

  function handleNav(path) { navigate(path); onClose(); }

  function handleAdminToggle() {
    if (isAdmin) { logoutAdmin(); onClose(); return; }
    setShowKeyInput(true);
  }

  function submitKey() {
    const success = loginAdmin(keyInput);
    if (success) { setShowKeyInput(false); setKeyInput(""); setKeyError(""); onClose(); }
    else { setKeyError("Invalid key"); }
  }

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 700,
            backdropFilter: "blur(4px)"
          }}
        />
      )}

      <div style={{
        position: "fixed", top: 0, right: open ? 0 : "-620px", width: "600px",
        height: "100%", background: "rgba(0,0,40,0.97)", backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(255,20,147,0.3)", zIndex: 800,
        padding: "40px 32px", transition: "right 0.35s cubic-bezier(.4,0,.2,1)",
        overflowY: "auto",
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "#fff",
          fontSize: "3.2rem", cursor: "pointer", float: "right", marginBottom: "40px"
        }}>✕</button>

        <div style={{ clear: "both" }}>

          {/* ── Logged-in profile block ── */}
          {(manager || isAdmin) && (
            <div
              onClick={() => handleNav(isAdmin ? "/admin-profile" : "/manager-profile")}
              style={{
                display: "flex", alignItems: "center", gap: "18px",
                padding: "24px 28px", marginBottom: "24px",
                background: "rgba(255,20,147,0.1)",
                border: "1px solid rgba(255,20,147,0.35)",
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "rgba(255,20,147,0.18)";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "rgba(255,20,147,0.1)";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              {/* Avatar */}
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%",
                border: "2.5px solid #FF1493",
                boxShadow: "0 0 18px rgba(255,20,147,0.4)",
                background: "rgba(255,20,147,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
              }}>
                {manager?.profilePhoto
                  ? <img src={manager.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: isAdmin ? "2.2rem" : "2rem" }}>{isAdmin ? "🛡️" : "👤"}</span>
                }
              </div>

              {/* Name + role */}
              <div>
                <div style={{
                  color: "#fff", fontWeight: 700, fontSize: "1.4rem",
                  fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "1px"
                }}>
                  {isAdmin ? (adminProfile.username || "Admin") : manager?.username}
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center",
                  background: isAdmin ? "rgba(255,20,147,0.2)" : "rgba(255,20,147,0.1)",
                  border: "1px solid rgba(255,20,147,0.3)",
                  borderRadius: "20px", padding: "3px 12px", marginTop: "5px",
                }}>
                  <span style={{ color: "#FF1493", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1px" }}>
                    {isAdmin ? "⚡ ADMIN" : "⚽ MANAGER"}
                  </span>
                </div>
              </div>

              <div style={{ marginLeft: "auto", color: "rgba(255,20,147,0.6)", fontSize: "1.2rem" }}>›</div>
            </div>
          )}

          {/* ── Sign in / create account button (when not logged in) ── */}
          {!manager && !isAdmin && (
            <div
              onClick={() => handleNav("/create-account")}
              style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "24px 28px", marginBottom: "24px",
                background: "rgba(255,20,147,0.06)",
                border: "1px dashed rgba(255,20,147,0.25)",
                borderRadius: "20px", cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "rgba(255,20,147,0.12)";
                e.currentTarget.style.borderStyle = "solid";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "rgba(255,20,147,0.06)";
                e.currentTarget.style.borderStyle = "dashed";
              }}
            >
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%",
                border: "2px dashed rgba(255,20,147,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,20,147,0.08)", flexShrink: 0,
                fontSize: "2rem",
              }}>👤</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>Sign In / Register</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "3px" }}>
                  Create your manager account
                </div>
              </div>
            </div>
          )}

          {/* ── Nav items ── */}
          {menuItems.map(item => (
            <div
              key={item.path}
              onClick={() => handleNav(item.path)}
              style={{
                padding: "24px 28px", margin: "10px 0",
                background: "rgba(255,20,147,0.06)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,20,147,0.15)", borderRadius: "18px",
                cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: "1.5rem",
                transition: "all 0.2s",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "rgba(255,20,147,0.16)";
                e.currentTarget.style.transform = "translateX(6px)";
                e.currentTarget.style.borderColor = "rgba(255,20,147,0.4)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "rgba(255,20,147,0.06)";
                e.currentTarget.style.transform = "translateX(0)";
                e.currentTarget.style.borderColor = "rgba(255,20,147,0.15)";
              }}
            >{item.label}</div>
          ))}

          {/* ── Manager sign-out (when logged in as manager) ── */}
          {manager && !isAdmin && (
            <div
              onClick={() => { logoutManager(); onClose(); }}
              style={{
                padding: "24px 28px", margin: "10px 0",
                background: "rgba(255,80,80,0.06)", border: "1px solid rgba(255,80,80,0.2)",
                borderRadius: "18px", cursor: "pointer", color: "#ff6b6b",
                fontWeight: 700, fontSize: "1.5rem", transition: "all 0.2s",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "rgba(255,80,80,0.14)";
                e.currentTarget.style.transform = "translateX(6px)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "rgba(255,80,80,0.06)";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >🚪 Sign Out</div>
          )}

          {/* ── Admin toggle ── */}
          <div
            onClick={handleAdminToggle}
            style={{
              padding: "24px 28px", margin: "10px 0",
              background: isAdmin ? "rgba(255,20,147,0.2)" : "rgba(255,20,147,0.06)",
              border: `1px solid ${isAdmin ? "#FF1493" : "rgba(255,20,147,0.15)"}`,
              borderRadius: "18px", cursor: "pointer", color: "#FF1493",
              fontWeight: 700, fontSize: "1.5rem", transition: "all 0.2s",
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = "rgba(255,20,147,0.25)";
              e.currentTarget.style.transform = "translateX(6px)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = isAdmin ? "rgba(255,20,147,0.2)" : "rgba(255,20,147,0.06)";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >🔐 {isAdmin ? "Exit Admin Mode" : "Admin Mode"}</div>

          {showKeyInput && (
            <div style={{
              marginTop: "16px", padding: "20px",
              background: "rgba(0,0,0,0.3)", borderRadius: "18px",
              border: "1px solid rgba(255,20,147,0.3)"
            }}>
              <input
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitKey()}
                type="password"
                placeholder="Enter admin key"
                style={{
                  width: "100%", padding: "14px 18px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid #FF1493", borderRadius: "12px",
                  color: "#fff", fontFamily: "inherit", fontSize: "1.2rem",
                  outline: "none", boxSizing: "border-box"
                }}
              />
              {keyError && <div style={{ color: "#ff6b6b", fontSize: "1rem", marginTop: "8px" }}>{keyError}</div>}
              <button
                onClick={submitKey}
                style={{
                  width: "100%", marginTop: "14px", padding: "16px",
                  background: "#FF1493", border: "none", borderRadius: "12px",
                  color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1.2rem"
                }}
              >Verify</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
