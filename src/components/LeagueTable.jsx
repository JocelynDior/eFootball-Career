import { useAdmin } from "../context/AdminContext";

// Drop-in replacement for SeasonSelector — now lives inside the table header bar
export default function LeagueTableHeader({
  title,
  currentSeason,
  seasons,
  onPrev,
  onNext,
  onAdd,
  onRename,
  onSetActive,
  onMenuOpen, // callback for 3-dot menu
}) {
  const { isAdmin } = useAdmin();
  const idx = seasons.indexOf(currentSeason);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,20,147,0.2)",
      borderRadius: "20px",
      padding: "14px 20px",
      marginBottom: 16,
      gap: 12,
    }}>
      {/* Title */}
      <span style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "1.5rem",
        letterSpacing: 3,
        color: "#FF1493",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        {title}
      </span>

      {/* Season selector — centered */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={onPrev}
          disabled={idx <= 0}
          style={{
            background: idx <= 0 ? "rgba(255,20,147,0.08)" : "#FF1493",
            border: "none", color: "#fff",
            width: 36, height: 36, borderRadius: "50%",
            fontSize: "1.3rem", cursor: idx <= 0 ? "not-allowed" : "pointer",
            opacity: idx <= 0 ? 0.3 : 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", flexShrink: 0,
          }}
        >‹</button>

        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "1.2rem",
          letterSpacing: 2,
          color: "#fff",
          background: "rgba(255,20,147,0.15)",
          border: "1px solid rgba(255,20,147,0.3)",
          padding: "6px 18px",
          borderRadius: 30,
          whiteSpace: "nowrap",
          minWidth: 110,
          textAlign: "center",
        }}>
          Season {currentSeason}
        </span>

        <button
          onClick={onNext}
          disabled={idx >= seasons.length - 1}
          style={{
            background: idx >= seasons.length - 1 ? "rgba(255,20,147,0.08)" : "rgba(255,20,147,0.2)",
            border: "1px solid rgba(255,20,147,0.4)",
            color: "#fff",
            width: 36, height: 36, borderRadius: "50%",
            fontSize: "1.3rem", cursor: idx >= seasons.length - 1 ? "not-allowed" : "pointer",
            opacity: idx >= seasons.length - 1 ? 0.3 : 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", flexShrink: 0,
          }}
        >›</button>

        {/* Admin season controls */}
        {isAdmin && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["+ New", onAdd], ["Rename", onRename], ["Set Active", onSetActive]].map(([label, fn]) => (
              <button key={label} onClick={fn} style={{
                background: "rgba(255,20,147,0.12)",
                border: "1px solid rgba(255,20,147,0.3)",
                color: "rgba(255,255,255,0.7)",
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* 3-dot menu */}
      {onMenuOpen && (
        <button
          onClick={onMenuOpen}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,20,147,0.3)",
            borderRadius: "50%",
            width: 36, height: 36,
            color: "#fff",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.2)"}
          onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          ⋯
        </button>
      )}
    </div>
  );
}
