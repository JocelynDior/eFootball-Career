import { useAdmin } from "../context/AdminContext";

export default function SeasonSelector({ currentSeason, seasons, onPrev, onNext, onAdd, onRename, onSetActive }) {
  const { isAdmin } = useAdmin();
  const idx = seasons.indexOf(currentSeason);

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,20,147,0.25)", borderRadius: "50px",
        padding: "10px 24px"
      }}>
        <button onClick={onPrev} disabled={idx <= 0} style={{
          background: idx <= 0 ? "rgba(255,20,147,0.1)" : "#FF1493",
          border: "none", color: "#fff", width: "40px", height: "40px",
          borderRadius: "50%", fontSize: "1.4rem", cursor: idx <= 0 ? "not-allowed" : "pointer",
          opacity: idx <= 0 ? 0.3 : 1, transition: "all 0.2s"
        }}>‹</button>

        <span style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem",
          letterSpacing: "2px", color: "#fff", minWidth: "130px", textAlign: "center",
          background: "rgba(255,20,147,0.15)", padding: "4px 16px", borderRadius: "30px"
        }}>Season {currentSeason}</span>

        <button onClick={onNext} disabled={idx >= seasons.length - 1} style={{
          background: idx >= seasons.length - 1 ? "rgba(255,20,147,0.1)" : "#000033",
          border: "1px solid #FF1493", color: "#fff", width: "40px", height: "40px",
          borderRadius: "50%", fontSize: "1.4rem", cursor: idx >= seasons.length - 1 ? "not-allowed" : "pointer",
          opacity: idx >= seasons.length - 1 ? 0.3 : 1, transition: "all 0.2s"
        }}>›</button>

        {isAdmin && (
          <div style={{ display: "flex", gap: "8px", marginLeft: "8px" }}>
            {[["+ New", onAdd], ["Rename", onRename], ["Set Active", onSetActive]].map(([label, fn]) => (
              <button key={label} onClick={fn} style={{
                background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)",
                color: "#fff", padding: "6px 14px", borderRadius: "30px",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
              }}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
