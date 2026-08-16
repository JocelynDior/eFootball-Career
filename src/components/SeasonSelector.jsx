import { useAdmin } from "../context/AdminContext";

export default function SeasonSelector({ currentSeason, seasons, onPrev, onNext, onAdd, onRename, onSetActive }) {
  const { isAdmin } = useAdmin();
  const idx = seasons.indexOf(currentSeason);

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "24px 0" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,20,147,0.2)", borderRadius: "50px",
        padding: "12px 28px", flexWrap: "wrap", justifyContent: "center"
      }}>
        <button onClick={onPrev} disabled={idx <= 0} style={{
          background: idx <= 0 ? "rgba(255,20,147,0.1)" : "#FF1493",
          border: "none", color: "#fff", width: "48px", height: "48px",
          borderRadius: "50%", fontSize: "1.6rem", cursor: idx <= 0 ? "not-allowed" : "pointer",
          opacity: idx <= 0 ? 0.3 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center"
        }}>‹</button>

        <span style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem",
          letterSpacing: "3px", color: "#000033", minWidth: "160px", textAlign: "center",
          background: "rgba(255,255,255,0.85)", padding: "6px 20px", borderRadius: "30px"
        }}>Season {currentSeason}</span>

        <button onClick={onNext} disabled={idx >= seasons.length - 1} style={{
          background: idx >= seasons.length - 1 ? "rgba(255,20,147,0.1)" : "#000033",
          border: "1px solid #FF1493", color: "#fff", width: "48px", height: "48px",
          borderRadius: "50%", fontSize: "1.6rem", cursor: idx >= seasons.length - 1 ? "not-allowed" : "pointer",
          opacity: idx >= seasons.length - 1 ? 0.3 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center"
        }}>›</button>

        {isAdmin && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[["+ New", onAdd], ["Rename", onRename], ["Set Active", onSetActive]].map(([label, fn]) => (
              <button key={label} onClick={fn} style={{
                background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)",
                color: "#fff", padding: "8px 16px", borderRadius: "30px",
                fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
              }}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
