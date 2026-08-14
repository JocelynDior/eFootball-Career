import { useState } from "react";
import { useManagerKey } from "../hooks/useManagerKey";

export default function ManagerKeyModal({ onVerified, onClose }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { verifyKey, saveKey } = useManagerKey();

  async function handleVerify() {
    if (!input.trim()) { setError("Enter your manager key."); return; }
    setLoading(true); setError("");
    const result = await verifyKey(input.trim());
    if (result) {
      saveKey(result.key, result.teamName);
      onVerified(result);
    } else {
      setError("Invalid manager key. Contact admin.");
    }
    setLoading(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "8px" }}>🔑 Manager Key</h3>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", marginBottom: "24px" }}>Enter your unique manager key to submit results.</p>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleVerify()}
        type="text" placeholder="e.g. ABC123" style={{ width: "100%", padding: "14px 18px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,20,147,0.5)", borderRadius: "14px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "4px", fontWeight: 700, marginBottom: "12px" }} />
      {error && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" }}>{error}</div>}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={handleVerify} disabled={loading} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontSize: "0.95rem" }}>{loading ? "Verifying..." : "Verify Key"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
