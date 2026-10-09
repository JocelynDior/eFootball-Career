import Modal from "../components/Modal";

// Confirmation popup for the sidebar "Shut Down" option.
// mode = "down" → turning maintenance ON, mode = "up" → bringing the site back.
export default function ShutDownModal({ active, mode = "down", busy = false, onConfirm, onClose }) {
  const goingDown = mode === "down";

  return (
    <Modal active={active} onClose={busy ? () => {} : onClose}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: "5rem", marginBottom: "16px" }}>{goingDown ? "🔴" : "🟢"}</div>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "2px",
          color: "#fff", margin: "0 0 14px", fontWeight: 400,
        }}>
          {goingDown ? "Shut down website?" : "Bring website back online?"}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.7)", margin: "0 0 32px", lineHeight: 1.4 }}>
          {goingDown
            ? "Do you want to set the website down for maintenance? Everyone except admins will see the maintenance screen."
            : "Do you want to turn maintenance off? The website will be available to everyone again."}
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1, maxWidth: "260px", cursor: busy ? "default" : "pointer",
              background: goingDown ? "#E24B4A" : "#22c55e", border: "none",
              borderRadius: "14px", color: "#fff", fontWeight: 700, fontFamily: "inherit",
              opacity: busy ? 0.6 : 1,
            }}
          >{busy ? "Please wait…" : "Yes"}</button>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1, maxWidth: "260px", cursor: busy ? "default" : "pointer",
              background: "transparent", border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: "14px", color: "#fff", fontWeight: 700, fontFamily: "inherit",
            }}
          >No</button>
        </div>
      </div>
    </Modal>
  );
}
