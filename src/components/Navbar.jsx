import { useState, useRef, useEffect } from "react";
import { useAdmin } from "../context/AdminContext";
import SideMenu from "./SideMenu";
import LeagueGrid from "./LeagueGrid";
import Modal from "./Modal";

// These props are passed from league pages
export default function Navbar({ onPlusAdminSettings, onPlusAddResults, onPlusLeagueRules, onPlusResultsHistory, showPlusMenu = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const { isAdmin } = useAdmin();
  const plusRef = useRef(null);

  // Close plus dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (plusRef.current && !plusRef.current.contains(e.target)) setPlusOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <nav style={{ background: "linear-gradient(90deg, #FF1493, #FF69B4)", padding: "0 1.2rem", height: "128px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 500, boxShadow: "0 4px 20px rgba(255,20,147,0.4)" }}>
        <button onClick={() => setLeagueOpen(true)} style={{ background: "rgba(0,0,51,0.7)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.3)", color: "#fff", padding: "16px 36px", borderRadius: "20px", fontWeight: 700, fontSize: "1.7rem", cursor: "pointer", transition: "all 0.3s", fontFamily: "inherit" }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(0,0,51,0.9)"}
          onMouseOut={e => e.currentTarget.style.background = "rgba(0,0,51,0.7)"}>
          View League
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Plus button — only shown on league pages */}
          {showPlusMenu && (
            <div ref={plusRef} style={{ position: "relative" }}>
              <button
                onClick={() => setPlusOpen(v => !v)}
                style={{ background: "#000033", border: "1.5px solid #FF1493", width: "72px", height: "72px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", color: "#FF1493", fontSize: "2.2rem", fontWeight: 300 }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                onMouseOut={e => e.currentTarget.style.background = "#000033"}
              >
                +
              </button>
              {plusOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: "rgba(0,0,30,0.98)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "18px", minWidth: "220px", zIndex: 600, overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.5)", animation: "dropDown 0.2s ease" }}>
                  {onPlusAddResults && (
                    <button onClick={() => { setPlusOpen(false); onPlusAddResults(); }} style={{ width: "100%", padding: "18px 22px", background: "transparent", border: "none", color: "#fff", fontSize: "1rem", fontWeight: 600, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", fontFamily: "inherit", transition: "background 0.15s" }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: "1.3rem" }}>⚽</span> Add Results
                    </button>
                  )}
                  {onPlusLeagueRules && (
                    <button onClick={() => { setPlusOpen(false); onPlusLeagueRules(); }} style={{ width: "100%", padding: "18px 22px", background: "transparent", border: "none", color: "#fff", fontSize: "1rem", fontWeight: 600, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", fontFamily: "inherit", transition: "background 0.15s" }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: "1.3rem" }}>📜</span> League Rules
                    </button>
                  )}
                  {isAdmin && onPlusResultsHistory && (
                    <button onClick={() => { setPlusOpen(false); onPlusResultsHistory(); }} style={{ width: "100%", padding: "18px 22px", background: "transparent", border: "none", color: "#fff", fontSize: "1rem", fontWeight: 600, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", fontFamily: "inherit", transition: "background 0.15s" }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: "1.3rem" }}>📋</span> Results History
                    </button>
                  )}
                  {isAdmin && onPlusAdminSettings && (
                    <button onClick={() => { setPlusOpen(false); onPlusAdminSettings(); }} style={{ width: "100%", padding: "18px 22px", background: "transparent", border: "none", color: "#FF1493", fontSize: "1rem", fontWeight: 600, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", fontFamily: "inherit", transition: "background 0.15s", borderTop: "1px solid rgba(255,20,147,0.15)" }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: "1.3rem" }}>⚙️</span> Admin Settings
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(true)} style={{ background: "#000033", border: "1.5px solid #FF1493", width: "80px", height: "80px", borderRadius: "10px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: "block", width: "40px", height: "5px", background: "#FF1493", borderRadius: "2px" }} />
            ))}
          </button>
        </div>
      </nav>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {leagueOpen && (
        <div onClick={() => setLeagueOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,20,0.75)", backdropFilter: "blur(12px)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}>
            <LeagueGrid onClose={() => setLeagueOpen(false)} />
          </div>
        </div>
      )}

      <style>{`@keyframes dropDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
