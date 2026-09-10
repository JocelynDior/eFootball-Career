import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { useState } from "react";

const menuItems = [
  { label: "💸 Transfer Market", path: "/transfer-market" },
  { label: "🛠️ Team Management", path: "/team-management" },
  { label: "⚔️ Rivals Squads", path: "/rivals-squads" },
  { label: "📅 Calendar", path: "/calendar" },
  { label: "📊 Manager Rankings", path: "/manager-rankings" },
  { label: "📋 Rules & Tutorials", path: "/rules-tutorials" },
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

  function handleNav(path) {
    const resolvedPath = (path === "/calendar" && isAdmin) ? "/admin-calendar" : path;
    navigate(resolvedPath);
    onClose();
  }

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
        position: "fixed", top: 0, right: open ? 0 : "-700px", width: "680px",
        height: "100%", background: "rgba(0,0,40,0.97)", backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(255,20,147,0.3)", zIndex: 800,
        padding: "40px 32px", transition: "right 0.35s cubic-bezier(.4,0,.2,1)",
        overflowY: "auto",
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "#fff",
          fontSize: "4rem", cursor: "pointer", float: "right", marginBottom: "40px"
        }}>✕</button>

        <div style={{ clear: "both" }}>

          {/* ── Logged-in profile block (2x bigger) ── */}
          {(manager || isAdmin) && (
            <div
              onClick={() => handleNav(isAdmin ? "/admin-profile" : "/manager-profile")}
              style={{
                display: "flex", alignItems: "center", gap: "24px",
                padding: "40px 36px", marginBottom: "28px",
                background: "rgba(255,20,147,0.1)",
                border: "1px solid rgba(255,20,147,0.35)",
                borderRadius: "24px",
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
                width: "120px", height: "120px", borderRadius: "50%",
                border: "3px solid #FF1493",
                boxShadow: "0 0 24px rgba(255,20,147,0.4)",
                background: "rgba(255,20,147,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
              }}>
                {manager?.profilePhoto
                  ? <img src={manager.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: isAdmin ? "3.6rem" : "3.2rem" }}>{isAdmin ? "🛡️" : "👤"}</span>
                }
              </div>

              {/* Name + role */}
              <div>
                <div style={{
                  color: "#fff", fontWeight: 700, fontSize: "2.4rem",
                  fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "1px"
                }}>
                  {isAdmin ? (adminProfile.username || "Admin") : manager?.username}
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center",
                  background: isAdmin ? "rgba(255,20,147,0.2)" : "rgba(255,20,147,0.1)",
                  border: "1px solid rgba(255,20,147,0.3)",
                  borderRadius: "20px", padding: "6px 18px", marginTop: "8px",
                }}>
                  <span style={{ color: "#FF1493", fontSize: "1.4rem", fontWeight: 700, letterSpacing: "1px" }}>
                    {isAdmin ? "⚡ ADMIN" : "⚽ MANAGER"}
                  </span>
                </div>
              </div>

              <div style={{ marginLeft: "auto", color: "rgba(255,20,147,0.6)", fontSize: "2rem" }}>›</div>
            </div>
          )}

          {/* ── Sign in / create account (when not logged in) ── */}
          {!manager && !isAdmin && (
            <div
              onClick={() => handleNav("/create-account")}
              style={{
                display: "flex", alignItems: "center", gap: "24px",
                padding: "40px 36px", marginBottom: "28px",
                background: "rgba(255,20,147,0.06)",
                border: "1px dashed rgba(255,20,147,0.25)",
                borderRadius: "24px", cursor: "pointer",
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
                width: "120px", height: "120px", borderRadius: "50%",
                border: "2px dashed rgba(255,20,147,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,20,147,0.08)", flexShrink: 0,
                fontSize: "3.2rem",
              }}>👤</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "2.2rem" }}>Sign In / Register</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.6rem", marginTop: "6px" }}>
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
                padding: "32px 36px", margin: "12px 0",
                background: "rgba(255,20,147,0.06)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,20,147,0.15)", borderRadius: "20px",
                cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: "2.8rem",
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

          {/* ── Manager sign-out ── */}
          {manager && !isAdmin && (
            <div
              onClick={() => { logoutManager(); onClose(); }}
              style={{
                padding: "32px 36px", margin: "12px 0",
                background: "rgba(255,80,80,0.06)", border: "1px solid rgba(255,80,80,0.2)",
                borderRadius: "20px", cursor: "pointer", color: "#ff6b6b",
                fontWeight: 700, fontSize: "2.8rem", transition: "all 0.2s",
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
              padding: "32px 36px", margin: "12px 0",
              background: isAdmin ? "rgba(255,20,147,0.2)" : "rgba(255,20,147,0.06)",
              border: `1px solid ${isAdmin ? "#FF1493" : "rgba(255,20,147,0.15)"}`,
              borderRadius: "20px", cursor: "pointer", color: "#FF1493",
              fontWeight: 700, fontSize: "2.8rem", transition: "all 0.2s",
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
              marginTop: "16px", padding: "24px",
              background: "rgba(0,0,0,0.3)", borderRadius: "20px",
              border: "1px solid rgba(255,20,147,0.3)"
            }}>
              <input
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitKey()}
                type="password"
                placeholder="Enter admin key"
                style={{
                  width: "100%", padding: "18px 22px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid #FF1493", borderRadius: "14px",
                  color: "#fff", fontFamily: "inherit", fontSize: "2rem",
                  outline: "none", boxSizing: "border-box"
                }}
              />
              {keyError && <div style={{ color: "#ff6b6b", fontSize: "1.6rem", marginTop: "10px" }}>{keyError}</div>}
              <button
                onClick={submitKey}
                style={{
                  width: "100%", marginTop: "16px", padding: "20px",
                  background: "#FF1493", border: "none", borderRadius: "14px",
                  color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "2rem"
                }}
              >Verify</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
