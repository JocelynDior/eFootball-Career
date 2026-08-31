import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import Modal from "./Modal";
import CreatePostModal from "../modals/CreatePostModal";
import CreateCaptionModal from "../modals/CreateCaptionModal";

// ── SVG Icons ──────────────────────────────────────────────────────────────

function HomeIcon({ active }) {
  const c = active ? "#FF1493" : "rgba(255,255,255,0.45)";
  return (
    <svg width="56" height="56" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 11.9L14 3.5L24.5 11.9V24.5H18.667V17.111H9.333V24.5H3.5V11.9Z"
        stroke={c} strokeWidth="2" strokeLinejoin="round" fill={active ? "rgba(255,20,147,0.15)" : "none"} />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="60" height="60" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="5" x2="15" y2="25" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <line x1="5" y1="15" x2="25" y2="15" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ active }) {
  const c = active ? "#FF1493" : "rgba(255,255,255,0.45)";
  return (
    <svg width="56" height="56" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="10.5" stroke={c} strokeWidth="2" />
      {[0,60,120,180,240,300].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 14 + 9 * Math.cos(rad);
        const y1 = 14 + 9 * Math.sin(rad);
        const x2 = 14 + 12.5 * Math.cos(rad);
        const y2 = 14 + 12.5 * Math.sin(rad);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2.5" strokeLinecap="round" />;
      })}
      <circle cx="14" cy="14" r="3.5" stroke={c} strokeWidth="2" fill={active ? "rgba(255,20,147,0.25)" : "none"} />
    </svg>
  );
}

// ── Post type picker popup ─────────────────────────────────────────────────

function PostTypePicker({ onPost, onCaption, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,20,0.6)", backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "520px",
          background: "rgba(0,0,40,0.97)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,20,147,0.3)",
          borderRadius: "28px 28px 0 0",
          padding: "12px 20px 48px",
          animation: "slideUp 0.25s ease",
        }}
      >
        {/* Handle bar */}
        <div style={{ width: "48px", height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.2)", margin: "0 auto 36px" }} />

        {/* Create Post */}
        <button
          onClick={onPost}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "24px",
            padding: "28px 28px", marginBottom: "16px",
            background: "rgba(255,20,147,0.08)",
            border: "1px solid rgba(255,20,147,0.25)",
            borderRadius: "20px", cursor: "pointer",
            transition: "all 0.18s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.18)"}
          onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
        >
          <div style={{ width: "72px", height: "72px", borderRadius: "18px", background: "rgba(255,20,147,0.2)", border: "1.5px solid rgba(255,20,147,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="36" height="36" viewBox="0 0 26 26" fill="none">
              <rect x="2" y="2" width="22" height="16" rx="3" stroke="#FF1493" strokeWidth="1.8" />
              <path d="M2 13l5-5 4 4 4-4 5 5" stroke="#FF1493" strokeWidth="1.8" strokeLinejoin="round" />
              <line x1="2" y1="21" x2="24" y2="21" stroke="#FF1493" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="2" y1="24.5" x2="18" y2="24.5" stroke="rgba(255,20,147,0.5)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.7rem" }}>Create Post</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.2rem", marginTop: "5px" }}>Image or video with caption</div>
          </div>
        </button>

        {/* Create Caption */}
        <button
          onClick={onCaption}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "24px",
            padding: "28px 28px",
            background: "rgba(255,20,147,0.08)",
            border: "1px solid rgba(255,20,147,0.25)",
            borderRadius: "20px", cursor: "pointer",
            transition: "all 0.18s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.18)"}
          onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
        >
          <div style={{ width: "72px", height: "72px", borderRadius: "18px", background: "rgba(255,20,147,0.2)", border: "1.5px solid rgba(255,20,147,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="36" height="36" viewBox="0 0 26 26" fill="none">
              <path d="M3 3.5H23C23.828 3.5 24.5 4.172 24.5 5V17C24.5 17.828 23.828 18.5 23 18.5H7L1.5 24V5C1.5 4.172 2.172 3.5 3 3.5Z"
                stroke="#FF1493" strokeWidth="1.8" strokeLinejoin="round" />
              <line x1="6.5" y1="9.5" x2="19.5" y2="9.5" stroke="#FF1493" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="6.5" y1="13.5" x2="14.5" y2="13.5" stroke="rgba(255,20,147,0.5)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.7rem" }}>Create Caption</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.2rem", marginTop: "5px" }}>Text only, like a tweet</div>
          </div>
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Main BottomNavBar ──────────────────────────────────────────────────────

export default function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, manager } = useAdmin();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createCaptionOpen, setCreateCaptionOpen] = useState(false);

  const canPost = isAdmin || !!manager;
  const isHome = location.pathname === "/";
  const isSettings = location.pathname === "/settings";

  function handlePlus() {
    if (!canPost) return;
    setPickerOpen(true);
  }

  return (
    <>
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: "128px",
        background: "rgba(0,0,30,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,20,147,0.2)",
        display: "flex", alignItems: "center", justifyContent: "space-around",
        zIndex: 900,
        padding: "0 8px",
      }}>
        {/* Home */}
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "14px", transition: "background 0.2s" }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
          onMouseOut={e => e.currentTarget.style.background = "none"}
        >
          <HomeIcon active={isHome} />
          <span style={{ color: isHome ? "#FF1493" : "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.5px" }}>HOME</span>
        </button>

        {/* Plus — centered */}
        <button
          onClick={handlePlus}
          style={{
            background: canPost ? "linear-gradient(135deg, #FF1493, #cc0066)" : "rgba(255,20,147,0.2)",
            border: "none", cursor: canPost ? "pointer" : "default",
            width: "80px", height: "80px", borderRadius: "22px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: canPost ? "0 4px 20px rgba(255,20,147,0.5)" : "none",
            transition: "all 0.2s",
          }}
          onMouseOver={e => { if (canPost) e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <PlusIcon />
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate("/settings")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "14px", transition: "background 0.2s" }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
          onMouseOut={e => e.currentTarget.style.background = "none"}
        >
          <SettingsIcon active={isSettings} />
          <span style={{ color: isSettings ? "#FF1493" : "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.5px" }}>SETTINGS</span>
        </button>
      </nav>

      {/* Post type picker */}
      {pickerOpen && (
        <PostTypePicker
          onClose={() => setPickerOpen(false)}
          onPost={() => { setPickerOpen(false); setCreatePostOpen(true); }}
          onCaption={() => { setPickerOpen(false); setCreateCaptionOpen(true); }}
        />
      )}

      {/* Create Post Modal */}
      <Modal active={createPostOpen} onClose={() => setCreatePostOpen(false)}>
        <CreatePostModal onClose={() => setCreatePostOpen(false)} />
      </Modal>

      {/* Create Caption Modal */}
      <Modal active={createCaptionOpen} onClose={() => setCreateCaptionOpen(false)}>
        <CreateCaptionModal onClose={() => setCreateCaptionOpen(false)} />
      </Modal>
    </>
  );
}
