import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const inputStyle = {
  width: "100%", padding: "12px 16px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "12px", color: "#fff",
  fontFamily: "inherit", fontSize: "0.95rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  color: "rgba(255,255,255,0.55)", fontSize: "0.75rem",
  display: "block", marginBottom: "6px",
  textTransform: "uppercase", letterSpacing: "0.8px",
  marginTop: "14px",
};

export default function AuctionBidModal({ player, playerId, onClose }) {
  const { manager } = useAdmin();
  const [bidAmount, setBidAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const playerValue = player.value?.replace(/[^0-9]/g, "") || "0";

  async function handleSubmit() {
    if (!manager) { setError("You must be logged in as a manager."); return; }
    if (!bidAmount) { setError("Please enter a bid amount."); return; }
    if (Number(bidAmount) <= 0) { setError("Bid must be greater than zero."); return; }
    setSubmitting(true);
    setError("");
    try {
      const bidData = {
        type: "auction",
        playerName: player.name,
        playerClub: player.club,
        playerId,
        bidAmount: `€${Number(bidAmount).toLocaleString()}`,
        bidAmountRaw: Number(bidAmount),
        fromManagerUid: manager.uid,
        fromManagerName: manager.username,
        fromClub: manager.team || "Unknown Club",
        status: "pending",
        createdAt: Date.now(),
      };
      await push(ref(db, `${PATHS.transfers}/negotiations`), bidData);
      await push(ref(db, `${PATHS.transfers}/auction/${playerId}/bids`), bidData);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError("Failed to submit bid: " + e.message);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px", marginBottom: "4px" }}>
        🔨 Place Bid
      </h3>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "20px", fontSize: "0.9rem" }}>
        {player.name} · {player.club}
      </p>

      {!manager && (
        <div style={{ background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: "12px", padding: "14px", marginBottom: "16px", color: "#ffaa44", fontSize: "0.9rem" }}>
          ⚠️ You must be logged in as a manager to place bids.
        </div>
      )}

      <div style={{ background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px", padding: "16px", marginBottom: "20px", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Player Value</div>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: "2px" }}>{player.value || "Unknown"}</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginTop: "4px" }}>Set by AI · Auction closes at Transfer Window deadline</div>
      </div>

      <label style={labelStyle}>Your Bid Amount (€)</label>
      <input
        value={bidAmount} onChange={e => setBidAmount(e.target.value)}
        placeholder="Enter your bid..."
        style={inputStyle} type="number"
      />

      {bidAmount && manager && (
        <div style={{ marginTop: "10px", padding: "10px 14px", background: "rgba(255,20,147,0.06)", borderRadius: "10px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
          Bidding as: <strong style={{ color: "#FF1493" }}>{manager.username}</strong> ({manager.team || "No Club"})
          <br />Bid: <strong style={{ color: "#fff" }}>€{Number(bidAmount).toLocaleString()}</strong>
        </div>
      )}

      {error && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginTop: "12px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "8px" }}>{error}</div>}

      {done ? (
        <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "14px", background: "rgba(0,255,136,0.1)", borderRadius: "12px", marginTop: "16px" }}>
          ✅ Bid Placed! Highest bid wins at deadline.
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button onClick={handleSubmit} disabled={submitting || !manager} style={{
            flex: 1, padding: "14px", background: "#FF1493", border: "none",
            borderRadius: "12px", color: "#fff", fontWeight: 700,
            cursor: submitting || !manager ? "not-allowed" : "pointer",
            opacity: submitting || !manager ? 0.6 : 1, fontSize: "1rem",
          }}>
            {submitting ? "Placing Bid..." : "🔨 Place Bid"}
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px",
            color: "#fff", cursor: "pointer",
          }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
