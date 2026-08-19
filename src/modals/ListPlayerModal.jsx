import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const inputStyle = {
  width: "100%", padding: "18px 20px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "14px", color: "#fff",
  fontFamily: "inherit", fontSize: "1.1rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  color: "rgba(255,255,255,0.65)", fontSize: "0.9rem",
  display: "block", marginBottom: "8px",
  textTransform: "uppercase", letterSpacing: "0.8px",
  fontWeight: 700,
};

export default function ListPlayerModal({ onClose }) {
  const { manager } = useAdmin();
  const [squad, setSquad] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [listingType, setListingType] = useState("sale"); // "sale" | "loan"
  const [price, setPrice] = useState("");
  const [loanTerm, setLoanTerm] = useState("3");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!manager?.team) return;
    // Load squad from team management
    const squadRef = ref(db, `career_team_management/${manager.team}/squad`);
    const unsub = onValue(squadRef, snap => {
      const data = snap.val();
      if (data) {
        const players = Object.entries(data).map(([id, p]) => ({ id, ...p }));
        setSquad(players);
      }
    });
    return () => unsub();
  }, [manager?.team]);

  async function handleList() {
    if (!selectedPlayer || !price) {
      setError("Please select a player and set a price.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const listing = {
        name: selectedPlayer.name,
        club: manager.team,
        position: selectedPlayer.position,
        squadNumber: selectedPlayer.shirtNumber,
        value: `€${Number(price).toLocaleString()}`,
        price: `€${Number(price).toLocaleString()}`,
        listingType,
        loanTerm: listingType === "loan" ? `${loanTerm} months` : null,
        listedBy: manager.username,
        listedByUid: manager.uid,
        createdAt: Date.now(),
        bids: {},
        tab: "listed",
      };
      await push(ref(db, `${PATHS.transfers}/listed`), listing);
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError("Failed to list player: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", marginBottom: "8px", letterSpacing: "3px" }}>
        📋 LIST PLAYER
      </h3>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", marginBottom: "28px" }}>
        Listing as: <span style={{ color: "#FF1493", fontWeight: 700 }}>{manager?.username}</span> — {manager?.team}
      </div>

      {squad.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>👥</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px" }}>No Squad Found</div>
          <div style={{ fontSize: "0.95rem", marginTop: "8px" }}>Add players to your squad in Team Management first.</div>
        </div>
      ) : (
        <>
          {/* Select player */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Select Player from Your Squad</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "260px", overflowY: "auto", paddingRight: "4px" }}>
              {squad.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  style={{
                    padding: "16px 20px",
                    background: selectedPlayer?.id === p.id ? "rgba(255,20,147,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedPlayer?.id === p.id ? "#FF1493" : "rgba(255,20,147,0.2)"}`,
                    borderRadius: "14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem" }}>{p.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem" }}>{p.position} · #{p.shirtNumber}</div>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>{p.role === "bench" ? "Bench" : "Starting XI"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Listing type */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Listing Type</label>
            <div style={{ display: "flex", gap: "12px" }}>
              {["sale", "loan"].map(type => (
                <button
                  key={type}
                  onClick={() => setListingType(type)}
                  style={{
                    flex: 1, padding: "16px", borderRadius: "14px", cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 700, fontSize: "1.1rem",
                    background: listingType === type ? "#FF1493" : "rgba(255,20,147,0.1)",
                    border: `1px solid ${listingType === type ? "#FF1493" : "rgba(255,20,147,0.3)"}`,
                    color: "#fff",
                  }}
                >
                  {type === "sale" ? "💰 For Sale" : "🔄 For Loan"}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>{listingType === "sale" ? "Asking Price (€)" : "Loan Fee (€)"}</label>
            <input
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 50000000"
              style={inputStyle}
              type="number"
            />
          </div>

          {/* Loan terms */}
          {listingType === "loan" && (
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Loan Term (default: 3 months)</label>
              <select value={loanTerm} onChange={e => setLoanTerm(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
              </select>
            </div>
          )}

          {error && (
            <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "16px", padding: "14px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>
          )}

          {saved ? (
            <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "20px", background: "rgba(0,255,136,0.1)", borderRadius: "14px", fontSize: "1.1rem" }}>
              ✅ Player Listed Successfully!
            </div>
          ) : (
            <div style={{ display: "flex", gap: "14px" }}>
              <button onClick={handleList} disabled={saving} style={{ flex: 1, padding: "18px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Listing..." : "📋 List Player"}
              </button>
              <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
