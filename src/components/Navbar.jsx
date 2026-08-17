import { useState } from "react";
import SideMenu from "./SideMenu";
import LeagueGrid from "./LeagueGrid";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);

  return (
    <>
      <nav style={{
        background: "linear-gradient(90deg, #FF1493, #FF69B4)",
        padding: "0 1.2rem", height: "128px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 500,
        boxShadow: "0 4px 20px rgba(255,20,147,0.4)"
      }}>
        <button onClick={() => setLeagueOpen(true)} style={{
          background: "rgba(0,0,51,0.7)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)", color: "#fff",
          padding: "16px 36px", borderRadius: "20px", fontWeight: 700,
          fontSize: "1.7rem", cursor: "pointer", transition: "all 0.3s",
          fontFamily: "inherit"
        }}>View League</button>

        <button onClick={() => setMenuOpen(true)} style={{
          background: "#000033", border: "1.5px solid #FF1493",
          width: "80px", height: "80px", borderRadius: "10px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          alignItems: "center", gap: "10px", cursor: "pointer"
        }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              display: "block", width: "40px", height: "5px",
              background: "#FF1493", borderRadius: "2px"
            }} />
          ))}
        </button>
      </nav>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {leagueOpen && (
        <div
          onClick={() => setLeagueOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,20,0.75)",
            backdropFilter: "blur(12px)",
            zIndex: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div onClick={e => e.stopPropagation()}>
            <LeagueGrid onClose={() => setLeagueOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
