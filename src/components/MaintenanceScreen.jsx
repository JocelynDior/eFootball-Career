import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import BackgroundVideo from "./BackgroundVideo";
import HeadlineSlideshow from "./HeadlineSlideshow";

// Mobile runs on the fixed 1200px canvas scaled down (see main.jsx), so controls
// need to be bigger there to stay readable — same trick the side menu uses.
const IS_MOBILE = typeof window !== "undefined" && window.screen.width < 900;
const S = IS_MOBILE ? 2 : 1;

export default function MaintenanceScreen() {
  const navigate = useNavigate();
  const { loginAdmin } = useAdmin();

  const [headlines, setHeadlines] = useState([]);
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/headlines`), snap => {
      const d = snap.val();
      setHeadlines(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    return () => unsub();
  }, []);

  function submitKey() {
    // On success the admin flag flips, the lock lifts and App re-renders the full site.
    if (!loginAdmin(keyInput.trim())) {
      setKeyError("Invalid key");
    }
  }

  const btn = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
    minWidth: `${11 * S}rem`, padding: `${0.9 * S}rem ${2.2 * S}rem`,
    background: "rgba(255,20,147,0.12)", border: "1.5px solid #FF1493",
    borderRadius: "999px", color: "#FF1493", fontWeight: 700,
    fontSize: `${1.2 * S}rem`, fontFamily: "inherit", cursor: "pointer",
    transition: "all 0.2s",
  };
  const hover = {
    onMouseOver: e => { e.currentTarget.style.background = "rgba(255,20,147,0.28)"; },
    onMouseOut: e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; },
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Headline slideshow */}
        <div style={{
          background: "rgba(0,0,20,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,20,147,0.15)",
        }}>
          <HeadlineSlideshow headlines={headlines} />
        </div>

        {/* Maintenance message */}
        <div style={{ textAlign: "center", padding: `${3 * S}rem 1.5rem ${2 * S}rem` }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400, margin: 0,
            fontSize: IS_MOBILE ? "9vw" : "clamp(3.5rem, 7vw, 7rem)",
            lineHeight: 1, letterSpacing: "3px", color: "#fff",
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
          }}>
            WEBSITE DOWN FOR <span style={{ color: "#FF1493" }}>MAINTENANCE</span>
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.6)", fontSize: `${1.1 * S}rem`,
            margin: `${1 * S}rem 0 ${2.2 * S}rem`,
          }}>
            We'll be back shortly. You can still check the calendar below.
          </p>

          {/* Calendar + Admin side by side */}
          <div style={{ display: "flex", gap: `${1 * S}rem`, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={btn} {...hover} onClick={() => navigate("/calendar")}>📅 Calendar</button>
            <button style={btn} {...hover} onClick={() => { setShowKey(v => !v); setKeyError(""); }}>🔐 Admin</button>
          </div>

          {/* Admin key entry */}
          {showKey && (
            <div style={{
              maxWidth: `${22 * S}rem`, margin: `${1.6 * S}rem auto 0`, padding: `${1.2 * S}rem`,
              background: "rgba(0,0,20,0.85)", border: "1px solid rgba(255,20,147,0.4)",
              borderRadius: "20px", backdropFilter: "blur(12px)",
            }}>
              <input
                autoFocus
                type="password"
                value={keyInput}
                onChange={e => { setKeyInput(e.target.value); setKeyError(""); }}
                onKeyDown={e => e.key === "Enter" && submitKey()}
                placeholder="Enter admin key"
                style={{
                  width: "100%", padding: `${0.8 * S}rem ${1 * S}rem`,
                  background: "rgba(255,255,255,0.06)", border: "1px solid #FF1493",
                  borderRadius: "12px", color: "#fff", fontFamily: "inherit",
                  fontSize: `${1.1 * S}rem`, outline: "none", boxSizing: "border-box",
                }}
              />
              {keyError && (
                <div style={{ color: "#ff6b6b", fontSize: `${0.95 * S}rem`, marginTop: "10px" }}>{keyError}</div>
              )}
              <button
                onClick={submitKey}
                style={{
                  width: "100%", marginTop: `${0.9 * S}rem`, padding: `${0.8 * S}rem`,
                  background: "#FF1493", border: "none", borderRadius: "12px",
                  color: "#fff", fontWeight: 700, cursor: "pointer",
                  fontSize: `${1.1 * S}rem`, fontFamily: "inherit",
                }}
              >Verify</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
