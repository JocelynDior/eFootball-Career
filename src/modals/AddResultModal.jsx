import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, set } from "firebase/database";
import { applyResultToTable } from "../utils/tableLogic";
import { getSASTToday } from "../utils/sastTime";

export default function AddResultModal({ league, season, teams, result = null, onClose }) {
  const isEdit = !!result;
  const [homeTeam, setHomeTeam] = useState(result?.homeTeam || "");
  const [awayTeam, setAwayTeam] = useState(result?.awayTeam || "");
  const [homeScore, setHomeScore] = useState(result?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(result?.awayScore ?? 0);
  const [forfeitType, setForfeitType] = useState(result?.forfeitType || "none");
  const [date, setDate] = useState(result?.date || getSASTToday());
  const [scorersHome, setScorersHome] = useState(result?.goalScorers?.home || []);
  const [scorersAway, setScorersAway] = useState(result?.goalScorers?.away || []);
  const [scorerName, setScorerName] = useState("");
  const [scorerGoals, setScorerGoals] = useState(1);
  const [scorerSide, setScorerSide] = useState("home");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const teamNames = teams.map(t => t.name).sort();

  function addScorer() {
    if (!scorerName.trim()) return;
    const entry = { player: scorerName.trim(), goals: +scorerGoals };
    if (scorerSide === "home") setScorersHome(prev => [...prev, entry]);
    else setScorersAway(prev => [...prev, entry]);
    setScorerName(""); setScorerGoals(1);
  }

  async function handleSave() {
    if (!homeTeam || !awayTeam) { setStatus("Select both teams."); return; }
    setSaving(true);
    try {
      const data = {
        homeTeam, awayTeam, homeScore: +homeScore, awayScore: +awayScore,
        forfeitType, date, matchType: forfeitType === "none" ? "normal" : "forfeit",
        goalScorers: { home: scorersHome, away: scorersAway },
        status: "approved", approvedAt: Date.now(), submittedBy: "admin"
      };
      if (isEdit) await set(ref(db, `${PATHS.results(league, season)}/${result.key}`), data);
      else {
        await push(ref(db, PATHS.results(league, season)), data);
        await applyResultToTable(league, season, homeTeam, awayTeam, +homeScore, +awayScore, forfeitType);
      }
      onClose();
    } catch (e) { setStatus("Error: " + e.message); }
    setSaving(false);
  }

  const inputStyle = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", marginBottom: "14px" };
  const labelStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" };

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "20px" }}>{isEdit ? "✏️ Edit Result" : "⚽ Add Result"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "4px" }}>
        <div>
          <label style={labelStyle}>Home Team</label>
          <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)} style={inputStyle}>
            <option value="">Select</option>
            {teamNames.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Away Team</label>
          <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)} style={inputStyle}>
            <option value="">Select</option>
            {teamNames.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Home Score</label>
          <input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Away Score</label>
          <input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <label style={labelStyle}>Forfeit Type</label>
      <select value={forfeitType} onChange={e => setForfeitType(e.target.value)} style={inputStyle}>
        <option value="none">Normal Result</option>
        <option value="no_contest">No Contest (F-F)</option>
        <option value="forfeit_win">Forfeit Win</option>
      </select>
      <label style={labelStyle}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />

      <div style={{ padding: "14px", background: "rgba(255,20,147,0.06)", borderRadius: "12px", border: "1px solid rgba(255,20,147,0.2)", marginBottom: "14px" }}>
        <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "0.85rem", marginBottom: "10px" }}>⚽ Add Scorers</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select value={scorerSide} onChange={e => setScorerSide(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto", flex: "0 0 90px" }}>
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
          <input value={scorerName} onChange={e => setScorerName(e.target.value)} placeholder="Player name" style={{ ...inputStyle, marginBottom: 0, flex: 1, minWidth: "120px" }} />
          <input type="number" value={scorerGoals} onChange={e => setScorerGoals(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "60px", flex: "0 0 60px" }} />
          <button onClick={addScorer} style={{ background: "#FF1493", border: "none", color: "#fff", padding: "0 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 700 }}>Add</button>
        </div>
        {(scorersHome.length > 0 || scorersAway.length > 0) && (
          <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {scorersHome.map((s, i) => <span key={i} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", padding: "4px 12px", borderRadius: "20px", color: "#fff", fontSize: "0.8rem" }}>H: {s.player} ({s.goals})</span>)}
            {scorersAway.map((s, i) => <span key={i} style={{ background: "rgba(65,105,225,0.2)", border: "1px solid rgba(65,105,225,0.4)", padding: "4px 12px", borderRadius: "20px", color: "#fff", fontSize: "0.8rem" }}>A: {s.player} ({s.goals})</span>)}
          </div>
        )}
      </div>

      {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: "12px" }}>{status}</div>}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
