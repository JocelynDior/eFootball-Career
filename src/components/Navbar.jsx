import { useState } from "react";
import SideMenu from "./SideMenu";
import LeagueGrid from "./LeagueGrid";

export default function Navbar({ title = "Career League" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);

  return (
    <>
      <nav style={{
        background: "linear-gradient(90deg, #FF1493, #FF69B4)",
        padding: "0 1.2rem", height: "64px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 500,
        boxShadow: "0 4px 20px rgba(255,20,147,0.4)"
      }}>
        <button onClick={() => setLeagueOpen(true)} style={{
          background: "rgba(0,0,51,0.7)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)", color: "#fff",
          padding: "8px 18px", borderRadius: "20px", fontWeight: 700,
          fontSize: "0.85rem", cursor: "pointer", transition: "all 0.3s",
          fontFamily: "inherit"
        }}>View League</button>

        <span style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem",
          letterSpacing: "3px", color: "#fff",
          textShadow: "0 2px 8px rgba(0,0,0,0.3)"
        }}>{title}</span>

        <button onClick={() => setMenuOpen(true)} style={{
          background: "#000033", border: "1.5px solid #FF1493",
          width: "40px", height: "40px", borderRadius: "10px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          alignItems: "center", gap: "5px", cursor: "pointer"
        }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              display: "block", width: "20px", height: "2.5px",
              background: "#FF1493", borderRadius: "2px"
            }} />
          ))}
        </button>
      </nav>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {leagueOpen && (
        <div onClick={() => setLeagueOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,20,0.85)",
          backdropFilter: "blur(8px)", zIndex: 600, display: "flex",
          justifyContent: "flex-end"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "min(360px, 100vw)", height: "100%",
            background: "rgba(0,0,40,0.95)", backdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(255,20,147,0.3)",
            overflowY: "auto", padding: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ color: "#FF1493", fontWeight: 700, fontSize: "1rem", letterSpacing: "2px", textTransform: "uppercase" }}>Leagues & Cups</span>
              <button onClick={() => setLeagueOpen(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <LeagueGrid />
          </div>
        </div>
      )}
    </>
  );
}
