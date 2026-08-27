import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push } from "firebase/database";
import { getSASTToday } from "../utils/sastTime";
import { useAdmin } from "../context/AdminContext";
import { uploadToImgBB } from "../utils/imgUpload";

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.4)",
  borderRadius: 10, color: "#fff",
  fontFamily: "inherit", fontSize: "0.9rem",
  outline: "none", boxSizing: "border-box", marginBottom: 14,
};
const labelStyle = {
  color: "rgba(255,255,255,0.6)", fontSize: "0.75rem",
  display: "block", marginBottom: 4,
  textTransform: "uppercase", letterSpacing: "0.5px",
};

export default function SubmitResultModal({ league, season, teams, onClose }) {
  const { manager } = useAdmin();
  const myTeam = manager?.team || "";

  const [opponent, setOpponent] = useState("");
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [matchday, setMatchday] = useState("");
  const [date, setDate] = useState(getSASTToday());
  const [scorers, setScorers] = useState([]);
  const [assists, setAssists] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false); // confirmation screen

  const [scorerName, setScorerName] = useState("");
  const [scorerGoals, setScorerGoals] = useState(1);
  const [scorerImg, setScorerImg] = useState(null);
  const [scorerImgPreview, setScorerImgPreview] = useState("");

  const [assistName, setAssistName] = useState("");
  const [assistCount, setAssistCount] = useState(1);
  const [assistImg, setAssistImg] = useState(null);
  const [assistImgPreview, setAssistImgPreview] = useState("");

  const others = teams.filter(t => t.name !== myTeam).map(t => t.name).sort();

  function handleScorerImgChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setScorerImg(f);
    const r = new FileReader();
    r.onload = ev => setScorerImgPreview(ev.target.result);
    r.readAsDataURL(f);
  }

  function handleAssistImgChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setAssistImg(f);
    const r = new FileReader();
    r.onload = ev => setAssistImgPreview(ev.target.result);
    r.readAsDataURL(f);
  }

  function addScorer() {
    if (!scorerName.trim()) return;
    setScorers(prev => [...prev, { player: scorerName.trim(), goals: +scorerGoals, imageFile: scorerImg, imagePreview: scorerImgPreview }]);
    setScorerName(""); setScorerGoals(1); setScorerImg(null); setScorerImgPreview("");
  }

  function removeScorer(i) { setScorers(prev => prev.filter((_, idx) => idx !== i)); }

  function addAssist() {
    if (!assistName.trim()) return;
    setAssists(prev => [...prev, { player: assistName.trim(), assists: +assistCount, imageFile: assistImg, imagePreview: assistImgPreview }]);
    setAssistName(""); setAssistCount(1); setAssistImg(null); setAssistImgPreview("");
  }

  function removeAssist(i) { setAssists(prev => prev.filter((_, idx) => idx !== i)); }

  function handleSubmitClick() {
    if (!opponent) { setStatus("Please select an opponent."); return; }
    if (!matchday) { setStatus("Matchday is required."); return; }
    setStatus("");
    setConfirming(true);
  }

  async function handleConfirmSubmit() {
    setSaving(true);
    setStatus("Uploading images...");
    try {
      const scorersData = await Promise.all(scorers.map(async s => {
        let imageUrl = s.imagePreview || "";
        if (s.imageFile) { try { imageUrl = await uploadToImgBB(s.imageFile); } catch (e) {} }
        return { player: s.player, goals: s.goals, imageUrl };
      }));

      const assistsData = await Promise.all(assists.map(async a => {
        let imageUrl = a.imagePreview || "";
        if (a.imageFile) { try { imageUrl = await uploadToImgBB(a.imageFile); } catch (e) {} }
        return { player: a.player, assists: a.assists, imageUrl };
      }));

      await push(ref(db, PATHS.pendingResults(league, season)), {
        homeTeam: myTeam,
        awayTeam: opponent,
        homeScore: +myScore,
        awayScore: +oppScore,
        forfeitType: "none",
        matchType: "normal",
        md: +matchday,
        date,
        goalScorers: { home: scorersData, away: [] },
        assists: { home: assistsData, away: [] },
        submittedBy: manager?.uid || myTeam,
        submittedAt: Date.now(),
        status: "pending",
      });

      setStatus("✅ Result submitted! Awaiting admin approval.");
      setTimeout(onClose, 2000);
    } catch (e) {
      setStatus("Error: " + e.message);
      setConfirming(false);
    }
    setSaving(false);
  }

  if (!myTeam) {
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16 }}>⚽ Submit Result</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "40px 0" }}>You must have a team assigned to submit results.</p>
        <button onClick={onClose} style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
      </div>
    );
  }

  // Confirmation screen
  if (confirming) {
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20, textAlign: "center" }}>⚠️ Confirm Submission</h3>

        {/* Result summary */}
        <div style={{ background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", marginBottom: 8, letterSpacing: 1 }}>
            {myTeam} <span style={{ color: "#FF1493" }}>{myScore} — {oppScore}</span> {opponent}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>Matchday {matchday} &nbsp;·&nbsp; {date}</div>
          {scorers.length > 0 && (
            <div style={{ marginTop: 10, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
              ⚽ {scorers.map(s => `${s.player}${s.goals > 1 ? ` (${s.goals})` : ""}`).join(", ")}
            </div>
          )}
          {assists.length > 0 && (
            <div style={{ marginTop: 6, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
              🎯 {assists.map(a => `${a.player}${a.assists > 1 ? ` (${a.assists})` : ""}`).join(", ")}
            </div>
          )}
        </div>

        <div style={{ background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, color: "rgba(255,200,100,0.9)", fontSize: "0.85rem", textAlign: "center", lineHeight: 1.6 }}>
          Are you sure you want to submit? This action can't be undone.
        </div>

        {status && (
          <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", margin: "0 0 12px", textAlign: "center" }}>{status}</div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleConfirmSubmit}
            disabled={saving}
            style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontSize: "1rem" }}
          >
            {saving ? "Submitting..." : "✅ Submit"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={saving}
            style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: "1rem" }}
          >
            🔍 Review
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16 }}>⚽ Submit Result</h3>

      <div style={{ background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.35)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "rgba(255,200,100,0.9)", fontSize: "0.82rem", lineHeight: 1.5 }}>
        ⚠️ Please ensure your results are correct, false results will be a 6 point deduction and the match will be declared a forfeit loss, admin will review results.
      </div>

      <div style={{ background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#FF1493", fontWeight: 700 }}>
        Your Team: {myTeam}
      </div>

      <label style={labelStyle}>Opponent</label>
      <select value={opponent} onChange={e => setOpponent(e.target.value)} style={inputStyle}>
        <option value="">— Select opponent —</option>
        {others.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Your Score</label>
          <input type="number" min={0} value={myScore} onChange={e => setMyScore(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Opponent Score</label>
          <input type="number" min={0} value={oppScore} onChange={e => setOppScore(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <label style={labelStyle}>Matchday <span style={{ color: "#FF1493" }}>*</span></label>
      <input type="number" min={1} value={matchday} onChange={e => setMatchday(e.target.value)} placeholder="e.g. 5" style={inputStyle} />

      <label style={labelStyle}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />

      {/* Goal Scorers */}
      <div style={{ borderTop: "1px solid rgba(255,20,147,0.2)", marginTop: 8, paddingTop: 16 }}>
        <div style={{ color: "#fff", fontWeight: 700, marginBottom: 10, fontSize: "0.95rem" }}>⚽ Your Goal Scorers</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <input value={scorerName} onChange={e => setScorerName(e.target.value)} placeholder="Player name" style={{ ...inputStyle, flex: 2, minWidth: 120, marginBottom: 0 }} />
          <input type="number" value={scorerGoals} onChange={e => setScorerGoals(e.target.value)} min={1} style={{ ...inputStyle, width: 80, marginBottom: 0 }} />
          <label style={{ cursor: "pointer", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, padding: "10px 14px", color: "#FF1493", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
            {scorerImgPreview ? <img src={scorerImgPreview} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} /> : "📷"}
            <input type="file" accept="image/*" onChange={handleScorerImgChange} style={{ display: "none" }} />
          </label>
          <button onClick={addScorer} style={{ background: "#FF1493", border: "none", borderRadius: 10, color: "#fff", padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>Add</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {scorers.map((s, i) => (
            <span key={i} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 30, padding: "5px 14px", fontSize: "0.85rem", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {s.imagePreview && <img src={s.imagePreview} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />}
              ⚽ {s.player} ({s.goals})
              <button onClick={() => removeScorer(i)} style={{ background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✖</button>
            </span>
          ))}
        </div>
      </div>

      {/* Assists */}
      <div style={{ borderTop: "1px solid rgba(255,20,147,0.2)", marginTop: 8, paddingTop: 16 }}>
        <div style={{ color: "#fff", fontWeight: 700, marginBottom: 10, fontSize: "0.95rem" }}>🎯 Your Assists</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <input value={assistName} onChange={e => setAssistName(e.target.value)} placeholder="Player name" style={{ ...inputStyle, flex: 2, minWidth: 120, marginBottom: 0 }} />
          <input type="number" value={assistCount} onChange={e => setAssistCount(e.target.value)} min={1} style={{ ...inputStyle, width: 80, marginBottom: 0 }} />
          <label style={{ cursor: "pointer", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, padding: "10px 14px", color: "#FF1493", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
            {assistImgPreview ? <img src={assistImgPreview} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} /> : "📷"}
            <input type="file" accept="image/*" onChange={handleAssistImgChange} style={{ display: "none" }} />
          </label>
          <button onClick={addAssist} style={{ background: "#FF1493", border: "none", borderRadius: 10, color: "#fff", padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>Add</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {assists.map((a, i) => (
            <span key={i} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 30, padding: "5px 14px", fontSize: "0.85rem", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {a.imagePreview && <img src={a.imagePreview} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />}
              🎯 {a.player} ({a.assists})
              <button onClick={() => removeAssist(i)} style={{ background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✖</button>
            </span>
          ))}
        </div>
      </div>

      {status && (
        <div style={{ color: "#ff6b6b", fontSize: "0.85rem", margin: "12px 0", textAlign: "center" }}>{status}</div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button onClick={handleSubmitClick} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>
          Submit Result
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
