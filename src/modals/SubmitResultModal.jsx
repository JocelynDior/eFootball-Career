import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, get } from "firebase/database";
import { applyResultToTable } from "../utils/tableLogic";
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

// Merge scorer entries by player name, summing goals
async function mergeScorersIntoPath(dbRef, newEntries, countField) {
  const snap = await get(dbRef);
  const existing = snap.val() || {};
  // Build a map of player name -> key for existing entries
  const nameToKey = {};
  for (const [k, v] of Object.entries(existing)) {
    nameToKey[v.name?.toLowerCase()] = k;
  }
  const { set, ref: fbRef } = await import("firebase/database");
  const { db: database } = await import("../firebase");
  for (const entry of newEntries) {
    const nameLower = entry.player?.toLowerCase();
    if (nameToKey[nameLower]) {
      // Update existing
      const existingEntry = existing[nameToKey[nameLower]];
      await set(fbRef(database, `${dbRef.toString().replace("https://careermode-f98d0-default-rtdb.firebaseio.com/", "")}/${nameToKey[nameLower]}`), {
        ...existingEntry,
        count: (existingEntry.count || 0) + (entry[countField] || 1),
        imageUrl: entry.imageUrl || existingEntry.imageUrl || "",
      });
    } else {
      // Push new
      const { push: fbPush } = await import("firebase/database");
      await fbPush(dbRef, {
        name: entry.player,
        team: entry.team || "",
        count: entry[countField] || 1,
        imageUrl: entry.imageUrl || "",
      });
    }
  }
}

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
  const [confirming, setConfirming] = useState(false);

  // Match image - mandatory
  const [matchImage, setMatchImage] = useState(null);
  const [matchImagePreview, setMatchImagePreview] = useState("");

  const [scorerName, setScorerName] = useState("");
  const [scorerGoals, setScorerGoals] = useState(1);
  const [scorerImg, setScorerImg] = useState(null);
  const [scorerImgPreview, setScorerImgPreview] = useState("");

  const [assistName, setAssistName] = useState("");
  const [assistCount, setAssistCount] = useState(1);
  const [assistImg, setAssistImg] = useState(null);
  const [assistImgPreview, setAssistImgPreview] = useState("");

  const others = teams.filter(t => t.name !== myTeam).map(t => t.name).sort();

  function handleMatchImageChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setMatchImage(f);
    const r = new FileReader();
    r.onload = ev => setMatchImagePreview(ev.target.result);
    r.readAsDataURL(f);
  }

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
    if (!matchImage) { setStatus("A match image is required before submitting."); return; }
    setStatus("");
    setConfirming(true);
  }

  async function handleConfirmSubmit() {
    setSaving(true);
    setStatus("Uploading images...");
    try {
      // Upload match image (mandatory)
      let matchImageUrl = "";
      if (matchImage) {
        matchImageUrl = await uploadToImgBB(matchImage);
      }

      // Upload scorer images
      const scorersData = await Promise.all(scorers.map(async s => {
        let imageUrl = "";
        if (s.imageFile) { try { imageUrl = await uploadToImgBB(s.imageFile); } catch (e) {} }
        return { player: s.player, goals: s.goals, imageUrl, team: myTeam };
      }));

      // Upload assist images
      const assistsData = await Promise.all(assists.map(async a => {
        let imageUrl = "";
        if (a.imageFile) { try { imageUrl = await uploadToImgBB(a.imageFile); } catch (e) {} }
        return { player: a.player, assists: a.assists, imageUrl, team: myTeam };
      }));

      const homeScore = +myScore;
      const awayScore = +oppScore;

      setStatus("Saving result...");

      // Save result to Firebase
      await push(ref(db, PATHS.results(league, season)), {
        homeTeam: myTeam,
        awayTeam: opponent,
        homeScore,
        awayScore,
        forfeitType: "none",
        matchType: "normal",
        md: +matchday,
        date,
        matchImageUrl,
        goalScorers: { home: scorersData, away: [] },
        assists: { home: assistsData, away: [] },
        submittedBy: manager?.uid || myTeam,
        submittedAt: Date.now(),
        status: "approved",
      });

      // Update league table
      await applyResultToTable(league, season, myTeam, opponent, homeScore, awayScore, "none");

      // Update top scorers
      setStatus("Updating stats...");
      for (const s of scorersData) {
        await updateTopStat(league, season, "top_scorers", s.player, s.goals, s.imageUrl, myTeam);
      }
      // Update top assists
      for (const a of assistsData) {
        await updateTopStat(league, season, "top_assistants", a.player, a.assists, a.imageUrl, myTeam);
      }

      setStatus("✅ Result submitted successfully!");
      setTimeout(onClose, 1500);
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

  if (confirming) {
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20, textAlign: "center" }}>⚠️ Confirm Submission</h3>

        {matchImagePreview && (
          <div style={{ marginBottom: 16, borderRadius: 16, overflow: "hidden", maxHeight: 200 }}>
            <img src={matchImagePreview} alt="Match" style={{ width: "100%", height: 200, objectFit: "cover" }} />
          </div>
        )}

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
          Are you sure? False results will result in a 6 point deduction and a forfeit loss.
        </div>

        {status && (
          <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", margin: "0 0 12px", textAlign: "center" }}>{status}</div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleConfirmSubmit} disabled={saving} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontSize: "1rem" }}>
            {saving ? "Submitting..." : "✅ Submit"}
          </button>
          <button onClick={() => setConfirming(false)} disabled={saving} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: "1rem" }}>
            🔍 Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16 }}>⚽ Submit Result</h3>

      <div style={{ background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.35)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "rgba(255,200,100,0.9)", fontSize: "0.82rem", lineHeight: 1.5 }}>
        ⚠️ Please ensure your results are correct. False results will be a 6 point deduction and a forfeit loss.
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

      {/* Match Image - mandatory */}
      <div style={{ border: "2px dashed rgba(255,20,147,0.5)", borderRadius: 14, padding: "16px", marginBottom: 16, background: "rgba(255,20,147,0.05)" }}>
        <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>
          📸 Match Image <span style={{ color: "#ff6b6b" }}>* Required</span>
        </div>
        {matchImagePreview ? (
          <div style={{ position: "relative" }}>
            <img src={matchImagePreview} alt="Match" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10 }} />
            <button
              onClick={() => { setMatchImage(null); setMatchImagePreview(""); }}
              style={{ position: "absolute", top: 8, right: 8, background: "#cc3333", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            >✖</button>
          </div>
        ) : (
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", padding: "20px", background: "rgba(255,20,147,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
            📷 Tap to upload match image
            <input type="file" accept="image/*" onChange={handleMatchImageChange} style={{ display: "none" }} />
          </label>
        )}
      </div>

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

// Helper: upsert a player's stat count in top_scorers or top_assistants
async function updateTopStat(league, season, pathKey, playerName, count, imageUrl, team) {
  const { db: database } = await import("../firebase");
  const { ref: fbRef, get: fbGet, set: fbSet, push: fbPush } = await import("firebase/database");
  const listRef = fbRef(database, `career_${league}/seasons/season_${season}/${pathKey}`);
  const snap = await fbGet(listRef);
  const existing = snap.val() || {};
  // Find if player already exists
  let foundKey = null;
  let foundEntry = null;
  for (const [k, v] of Object.entries(existing)) {
    if ((v.name || "").toLowerCase() === playerName.toLowerCase()) {
      foundKey = k; foundEntry = v; break;
    }
  }
  if (foundKey) {
    await fbSet(fbRef(database, `career_${league}/seasons/season_${season}/${pathKey}/${foundKey}`), {
      ...foundEntry,
      count: (foundEntry.count || 0) + count,
      imageUrl: imageUrl || foundEntry.imageUrl || "",
      team: team || foundEntry.team || "",
    });
  } else {
    await fbPush(listRef, { name: playerName, count, imageUrl: imageUrl || "", team: team || "" });
  }
}
