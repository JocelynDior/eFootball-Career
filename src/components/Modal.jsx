import { useEffect } from "react";

export default function Modal({ active, onClose, children, wide = false }) {
  useEffect(() => {
    if (active) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [active]);

  if (!active) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,20,0.85)",
      backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: "20px", animation: "fadeIn 0.2s ease"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "rgba(0,0,40,0.9)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,20,147,0.4)", borderRadius: "24px",
        padding: "36px", width: "100%", maxWidth: wide ? "900px" : "520px",
        maxHeight: "90vh", overflowY: "auto", position: "relative",
        animation: "scaleIn 0.25s ease", boxShadow: "0 20px 60px rgba(255,20,147,0.2)"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "16px", background: "transparent",
          border: "none", color: "rgba(255,255,255,0.6)", fontSize: "1.5rem",
          cursor: "pointer", lineHeight: 1, transition: "color 0.2s"
        }} onMouseOver={e => e.target.style.color = "#FF1493"}
          onMouseOut={e => e.target.style.color = "rgba(255,255,255,0.6)"}>✕</button>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
