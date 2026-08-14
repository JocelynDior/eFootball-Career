import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push, remove } from "firebase/database";

export default function ManagerKeysModal({ onClose }) {
  const [keys, setKeys] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [keyVal, setKeyVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.managerKeys), snap => {
      const d = snap.val();
      setKeys(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    return () => unsub();
  }, []);

  async function handleAdd() {
    if (!teamName.trim() || !keyVal.trim()) { setStatus("Team and key required."); return; }
    const exists = keys.find(k => k.key === keyVal.trim().toUpperCase());
    if (exists) { setStatus("Key already exists."); return; }
    setSaving(true);
    await push(ref(db, PATHS.managerKeys), { teamName: teamName.trim(), key: keyVal.trim().toUpperCase() });
    setTeamName(""); setKeyVal(""); setStatus("✅ Key created!"); setSaving(false);
    setTimeout(() => setStatus(""), 2000);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this manager key?")) return;
    await remove(ref(db, `${PATHS.managerKeys}/${id}`));
  }

  const inputStyle = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", marginBottom: "12px" };

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>🔑 Manager Keys</h3>
      <div style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
        <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name" style={inputStyle} />
        <input value={keyVal} onChange={e => setKeyVal(e.target.value)} placeholder="Key (e.g. ARSENAL01)" style={inputStyle} />
        {status && <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", marginBottom: "8px" }}>{status}</div>}
        <button onClick={handleAdd} disabled={saving} style={{ width: "100%", padding: "12px", background: "#FF1493", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ Create Key</button>
      </div>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {!keys.length && <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "20px" }}>No keys yet.</div>}
        {keys.map(k => (
          <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "12px", marginBottom: "8px" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700 }}>{k.teamName}</div>
              <div style={{ color: "#FF1493", fontSize: "0.85rem", fontFamily: "monospace", letterSpacing: "2px" }}>{k.key}</div>
            </div>
            <button onClick={() => handleDelete(k.id)} style={{ background: "rgba(255,0,0,0.2)", border: "1px solid #cc3333", color: "#ffaaaa", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>🗑️</button>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ width: "100%", marginTop: "16px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
