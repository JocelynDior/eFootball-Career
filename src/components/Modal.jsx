import { useEffect } from "react";

export default function Modal({ active, onClose, children, wide = false }) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [active]);

  if (!active) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,20,0.85)",
      backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: "20px", animation: "fadeIn 0.2s ease"
    }}>
      <div className="modal-inner" onClick={e => e.stopPropagation()} style={{
        background: "rgba(0,0,40,0.9)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,20,147,0.4)", borderRadius: "24px",
        padding: "48px 56px", width: "95vw", maxWidth: "95vw",
        maxHeight: "95vh", overflowY: "auto", position: "relative",
        animation: "scaleIn 0.25s ease", boxShadow: "0 20px 60px rgba(255,20,147,0.2)",
        fontSize: "2rem"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "20px", right: "24px", background: "transparent",
          border: "none", color: "rgba(255,255,255,0.6)", fontSize: "2.5rem",
          cursor: "pointer", lineHeight: 1, transition: "color 0.2s"
        }} onMouseOver={e => e.target.style.color = "#FF1493"}
          onMouseOut={e => e.target.style.color = "rgba(255,255,255,0.6)"}>✕</button>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .modal-inner h1, .modal-inner h2, .modal-inner h3, .modal-inner h4, .modal-inner h5, .modal-inner h6 { font-size: calc(var(--modal-base, 1rem) * 2) !important; }
        .modal-inner p, .modal-inner span, .modal-inner label, .modal-inner div, .modal-inner li, .modal-inner td, .modal-inner th { font-size: inherit; }
        .modal-inner input, .modal-inner select, .modal-inner textarea { font-size: 1.8rem !important; padding: 16px 20px !important; }
        .modal-inner button { font-size: 1.8rem !important; padding: 18px 24px !important; }
      `}</style>
    </div>
  );
}
