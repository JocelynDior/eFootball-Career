import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push, remove } from "firebase/database";

const inputStyle = {
  width: "100%", padding: "16px 20px",
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

export default function TeamHistoryModal({ team, onClose }) {
  const [history, setHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/history`), snap => {
      const data = snap.val();
      if (data) {
        setHistory(Object.entries(data).map(([id, h]) => ({ id, ...h })).sort((a, b) => a.fromDate?.localeCompare(b.fromDate)));
      } else {
        setHistory([]);
      }
    });
    return () => unsub();
  }, [team]);

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const managers = Object.entries(data)
        .filter(([, a]) => a.role === "manager")
        .map(([uid, a]) => ({ uid, username: a.username, team: a.team }));
      setAccounts(managers);
    });
    return () => unsub();
  }, []);

  async function handleAdd() {
    if (!selectedUid || !fromDate) {
      setError("Please select a manager and set a from date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const manager = accounts.find(a => a.uid === selectedUid);
      await push(ref(db, `career_team_management/${team}/history`), {
        uid: selectedUid,
        username: manager?.username || "Unknown",
        fromDate,
        toDate: toDate || "Present",
        addedAt: Date.now(),
      });
      setSelectedUid("");
      setFromDate("");
      setToDate("");
    } catch (e) {
      setError("Failed to add: " + e.message);
    }
    setSaving(false);
  }

  async function handleRemove(id) {
    try {
      await remove(ref(db, `career_team_management/${team}/history/${id}`));
    } catch (e) {
      setError("Failed to remove: " + e.message);
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", marginBottom: "8px", letterSpacing: "3px" }}>
        📜 TEAM HISTORY
      </h3>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", marginBottom: "28px" }}>
        Team: <span style={{ color: "#FF1493", fontWeight: 700 }}>{team}</span>
      </div>

      {/* Add entry */}
      <div style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "28px" }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", marginBottom: "16px" }}>➕ Add Manager Entry</div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Manager</label>
          <select value={selectedUid} onChange={e => setSelectedUid(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">— Select Manager —</option>
            {accounts.map(a => (
              <option key={a.uid} value={a.uid}>{a.username} {a.team ? `(${a.team})` : ""}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>To Date (leave blank = Present)</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {error && <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "14px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}

        <button onClick={handleAdd} disabled={saving} style={{
          width: "100%", padding: "16px", background: saving ? "rgba(255,20,147,0.3)" : "#FF1493",
          border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.05rem",
          cursor: saving ? "not-allowed" : "pointer",
        }}>
          {saving ? "Saving..." : "Add to History"}
        </button>
      </div>

      {/* History list */}
      <div>
        <label style={labelStyle}>Manager History</label>
        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📋</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "2px" }}>No History Yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {history.map((h, i) => (
              <div key={h.id} style={{
                padding: "18px 20px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,20,147,0.2)",
                borderRadius: "14px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "40px", height: "40px", background: "rgba(255,20,147,0.15)",
                    border: "1px solid rgba(255,20,147,0.4)", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem",
                  }}>{i + 1}</div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{h.username}</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", marginTop: "2px" }}>
                      {h.fromDate} → {h.toDate || "Present"}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleRemove(h.id)} style={{
                  background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)",
                  color: "#ff6b6b", borderRadius: "10px", padding: "8px 16px",
                  cursor: "pointer", fontSize: "0.9rem", fontWeight: 700,
                }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "28px" }}>
        <button onClick={onClose} style={{ width: "100%", padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem", fontWeight: 700 }}>Close</button>
      </div>
    </div>
  );
}
