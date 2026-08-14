import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { useState } from "react";

const menuItems = [
  { label: "🏠 Home", path: "/" },
  { label: "👤 Create Account", path: "/create-account" },
  { label: "💸 Transfer Market", path: "/transfer-market" },
  { label: "🛠️ Team Management", path: "/team-management" },
  { label: "📅 Calendar", path: "/calendar" },
  { label: "📊 Manager Rankings", path: "/manager-rankings" },
  { label: "📄 Terms of Service", path: "/terms" },
  { label: "🔒 Privacy Policy", path: "/privacy" },
];

export default function SideMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { isAdmin, loginAdmin, logoutAdmin } = useAdmin();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

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
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 700, backdropFilter: "blur(4px)" }} />}
      <div style={{
        position: "fixed", top: 0, right: open ? 0 : "-320px", width: "300px",
        height: "100%", background: "rgba(0,0,40,0.97)", backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(255,20,147,0.3)", zIndex: 800,
        padding: "30px 20px", transition: "right 0.35s cubic-bezier(.4,0,.2,1)",
        overflowY: "auto"
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.8rem", cursor: "pointer", float: "right", marginBottom: "30px" }}>✕</button>
        <div style={{ clear: "both", marginTop: "10px" }}>
          {menuItems.map(item => (
            <div key={item.path} onClick={() => handleNav(item.path)} style={{
              padding: "16px 18px", margin: "8px 0",
              background: "rgba(255,20,147,0.08)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px",
              cursor: "pointer", color: "#fff", fontWeight: 600, fontSize: "0.95rem",
              transition: "all 0.2s"
            }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.2)"; e.currentTarget.style.transform = "translateX(6px)"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.transform = "translateX(0)"; }}
            >{item.label}</div>
          ))}

          <div onClick={handleAdminToggle} style={{
            padding: "16px 18px", margin: "8px 0",
            background: isAdmin ? "rgba(255,20,147,0.25)" : "rgba(255,20,147,0.08)",
            border: `1px solid ${isAdmin ? "#FF1493" : "rgba(255,20,147,0.2)"}`,
            borderRadius: "14px", cursor: "pointer", color: "#FF1493",
            fontWeight: 700, fontSize: "0.95rem", transition: "all 0.2s"
          }}>🔐 {isAdmin ? "Exit Admin Mode" : "Admin Mode"}</div>

          {showKeyInput && (
            <div style={{ marginTop: "12px", padding: "16px", background: "rgba(0,0,0,0.3)", borderRadius: "14px", border: "1px solid rgba(255,20,147,0.3)" }}>
              <input value={keyInput} onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitKey()}
                type="password" placeholder="Enter admin key"
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid #FF1493", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
              {keyError && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginTop: "6px" }}>{keyError}</div>}
              <button onClick={submitKey} style={{ width: "100%", marginTop: "10px", padding: "10px", background: "#FF1493", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>Verify</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
