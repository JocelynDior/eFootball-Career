import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, get, set, update } from "firebase/database";
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

// Upsert a player's stat in top_scorers or top_assistants
async function updateTopStat(league, season, pathKey, playerName, count, team) {
  const listRef = ref(db, `career_${league}/seasons/season_${season}/${pathKey}`);
  const snap = await get(listRef);
  const existing = snap.val() || {};
  let foundKey = null;
  let foundEntry = null;
  for (const [k, v] of Object.entries(existing)) {
    if ((v.name || "").toLowerCase() === playerName.toLowerCase()) {
      foundKey = k; foundEntry = v; break;
    }
  }
  if (foundKey) {
    await set(ref(db, `career_${league}/seasons/season_${season}/${pathKey}/${foundKey}`), {
      ...foundEntry,
      count: (foundEntry.count || 0) + count,
      team: team || foundEntry.team || "",
    });
  } else {
    await push(ref(db, `career_${league}/seasons/season_${season}/${pathKey}`), {
      name: playerName, count, team: team || "",
    });
  }
}

// Check if a result for the same match (same two teams + same matchday) already exists
// Returns the existing result entry if found, else null
async function findExistingResult(league, season, myTeam, opponent, matchday) {
  const snap = await get(ref(db, PATHS.results(league, season)));
  const data = snap.val() || {};
  for (const [key, val] of Object.entries(data)) {
    const sameMatchday = String(val.md) === String(matchday);
    const sameTeams =
      (val.homeTeam === myTeam && val.awayTeam === opponent) ||
      (val.homeTeam === opponent && val.awayTeam === myTeam);
    if (sameMatchday && sameTeams) {
      return { key, ...val };
    }
  }
  return null;
}

export default function SubmitResultModal({ league, season, teams, onClose }) {
  const { manager } = useAdmin();
  const myTeam = manager?.team || "";

  const [matchType, setMatchType] = useState(null); // null | "normal" | "forfeit"

  const [opponent, setOpponent] = useState("");
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [matchday, setMatchday] = useState("");
  const [date, setDate] = useState(getSASTToday());
  const [scorers, setScorers] = useState([]);
  const [assists, setAssists] = useState([]);
  const [scorerName, setScorerName] = useState("");
  const [scorerGoals, setScorerGoals] = useState(1);
  const [scorerImg, setScorerImg] = useState(null);
  const [scorerImgPreview, setScorerImgPreview] = useState("");
  const [assistName, setAssistName] = useState("");
  const [assistCount, setAssistCount] = useState(1);
  const [assistImg, setAssistImg] = useState(null);
  const [assistImgPreview, setAssistImgPreview] = useState("");

  const [matchImage, setMatchImage] = useState(null);
  const [matchImagePreview, setMatchImagePreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);

  // 2nd manager state
  const [existingResult, setExistingResult] = useState(null); // existing result from manager 1
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [isSecondManager, setIsSecondManager] = useState(false); // true when manager 2

  const others = teams.filter(t => t.name !== myTeam).map(t => t.name).sort();

  // When opponent + matchday both filled, check for existing result
  useEffect(() => {
    if (!opponent || !matchday || matchType !== "normal") {
      setExistingResult(null);
      setIsSecondManager(false);
      return;
    }
    let cancelled = false;
    setCheckingDuplicate(true);
    findExistingResult(league, season, myTeam, opponent, matchday).then(found => {
      if (cancelled) return;
      if (found) {
        // Only treat as 2nd manager if we didn't submit it
        if (found.submittedBy !== (manager?.uid || myTeam)) {
          setExistingResult(found);
          setIsSecondManager(true);
          // Auto-fill score from manager 1
          const iAmHome = found.homeTeam === myTeam;
          setMyScore(iAmHome ? (found.homeScore ?? 0) : (found.awayScore ?? 0));
          setOppScore(iAmHome ? (found.awayScore ?? 0) : (found.homeScore ?? 0));
        }
      } else {
        setExistingResult(null);
        setIsSecondManager(false);
      }
      setCheckingDuplicate(false);
    });
    return () => { cancelled = true; };
  }, [opponent, matchday, matchType, league, season, myTeam, manager]);

  function handleMatchImageChange(e) {
    const f = e.target.files[0]; if (!f) return;
    setMatchImage(f);
    const r = new FileReader(); r.onload = ev => setMatchImagePreview(ev.target.result); r.readAsDataURL(f);
  }
  function handleScorerImgChange(e) {
    const f = e.target.files[0]; if (!f) return;
    setScorerImg(f);
    const r = new FileReader(); r.onload = ev => setScorerImgPreview(ev.target.result); r.readAsDataURL(f);
  }
  function handleAssistImgChange(e) {
    const f = e.target.files[0]; if (!f) return;
    setAssistImg(f);
    const r = new FileReader(); r.onload = ev => setAssistImgPreview(ev.target.result); r.readAsDataURL(f);
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
    setStatus(""); setConfirming(true);
  }

  async function handleConfirmSubmit() {
    setSaving(true);
    try {
      setStatus("Uploading match image...");
      const matchImageUrl = await uploadToImgBB(matchImage);

      // Note: imageUrl is NOT stored for scorers/assists in top stats
      // We still upload it so match result card can show it, but it won't appear in scorers tab
      const scorersData = await Promise.all(scorers.map(async s => {
        return { player: s.player, goals: s.goals, team: myTeam };
      }));
      const assistsData = await Promise.all(assists.map(async a => {
        return { player: a.player, assists: a.assists, team: myTeam };
      }));

      const homeScore = +myScore;
      const awayScore = +oppScore;
      const isForfeit = matchType === "forfeit";

      if (isSecondManager && existingResult) {
        // ── SECOND MANAGER: update existing result with our scorers, don't touch table ──
        setStatus("Adding your scorers to match result...");

        const iAmHome = existingResult.homeTeam === myTeam;
        const side = iAmHome ? "home" : "away";

        // Merge scorers & assists into existing result
        const existingScorers = existingResult.goalScorers || { home: [], away: [] };
        const existingAssists = existingResult.assists || { home: [], away: [] };

        const updatedScorers = {
          ...existingScorers,
          [side]: [...(existingScorers[side] || []), ...scorersData],
        };
        const updatedAssists = {
          ...existingAssists,
          [side]: [...(existingAssists[side] || []), ...assistsData],
        };

        await update(ref(db, `${PATHS.results(league, season)}/${existingResult.key}`), {
          goalScorers: updatedScorers,
          assists: updatedAssists,
          [`matchImageUrl_${side}`]: matchImageUrl,
          secondManagerSubmittedBy: manager?.uid || myTeam,
          secondManagerSubmittedAt: Date.now(),
        });

        // Update top scorers / assists stats only
        setStatus("Updating stats...");
        for (const s of scorersData) {
          await updateTopStat(league, season, "top_scorers", s.player, s.goals, myTeam);
        }
        for (const a of assistsData) {
          await updateTopStat(league, season, "top_assistants", a.player, a.assists, myTeam);
        }

        // Table is NOT updated — manager 1 already did that

      } else {
        // ── FIRST MANAGER: create new result and update table ──
        setStatus("Saving result...");
        await push(ref(db, PATHS.results(league, season)), {
          homeTeam: myTeam, awayTeam: opponent,
          homeScore: isForfeit ? 3 : homeScore,
          awayScore: isForfeit ? 0 : awayScore,
          forfeitType: isForfeit ? "forfeit_win" : "none",
          matchType: isForfeit ? "forfeit" : "normal",
          md: +matchday, date, matchImageUrl,
          goalScorers: { home: isForfeit ? [] : scorersData, away: [] },
          assists: { home: isForfeit ? [] : assistsData, away: [] },
          submittedBy: manager?.uid || myTeam,
          submittedAt: Date.now(),
          status: "approved",
        });

        setStatus("Updating table...");
        await applyResultToTable(league, season, myTeam, opponent,
          isForfeit ? 3 : homeScore,
          isForfeit ? 0 : awayScore,
          isForfeit ? "forfeit_win" : "none"
        );

        if (!isForfeit) {
          setStatus("Updating stats...");
          for (const s of scorersData) {
            await updateTopStat(league, season, "top_scorers", s.player, s.goals, myTeam);
          }
          for (const a of assistsData) {
            await updateTopStat(league, season, "top_assistants", a.player, a.assists, myTeam);
          }
        }
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

  if (!matchType) {
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 8 }}>⚽ Submit Result</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 28, fontSize: "0.9rem" }}>Your Team: <strong style={{ color: "#FF1493" }}>{myTeam}</strong></p>

        <div style={{ background: "rgba(255,165,0,0.12)", border: "2px solid rgba(255,165,0,0.5)", borderRadius: 14, padding: "18px 20px", marginBottom: 28, color: "#FFB347", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.5, textAlign: "center" }}>
          ⚠️ FALSE RESULTS WILL RESULT IN A 6 POINT DEDUCTION AND THE MATCH WILL BE DECLARED A FORFEIT LOSS.
        </div>

        <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 20, textAlign: "center", fontWeight: 700, fontSize: "1.1rem" }}>Select match type:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <button onClick={() => setMatchType("normal")} style={{ background: "rgba(255,20,147,0.1)", border: "2px solid rgba(255,20,147,0.5)", borderRadius: 20, padding: "32px 16px", cursor: "pointer", color: "#fff", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.1)"}
          >
            <span style={{ fontSize: "2.5rem" }}>⚽</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: 2 }}>NORMAL MATCH</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>Goals, scorers, assists</span>
          </button>
          <button onClick={() => setMatchType("forfeit")} style={{ background: "rgba(255,100,0,0.1)", border: "2px solid rgba(255,100,0,0.5)", borderRadius: 20, padding: "32px 16px", cursor: "pointer", color: "#fff", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,100,0,0.22)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,100,0,0.1)"}
          >
            <span style={{ fontSize: "2.5rem" }}>🚫</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: 2 }}>FORFEIT WIN</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>Opponent didn't show</span>
          </button>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    );
  }

  const isForfeit = matchType === "forfeit";

  // ─── Confirmation screen ───
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
            {myTeam} <span style={{ color: "#FF1493" }}>{isForfeit ? "3 — 0 (W)" : `${myScore} — ${oppScore}`}</span> {opponent}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
            {isForfeit ? "Forfeit Win" : isSecondManager ? "Adding your scorers to existing result" : "Normal Match"} &nbsp;·&nbsp; Matchday {matchday} &nbsp;·&nbsp; {date}
          </div>
          {!isForfeit && scorers.length > 0 && (
            <div style={{ marginTop: 10, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
              ⚽ {scorers.map(s => `${s.player}${s.goals > 1 ? ` (${s.goals})` : ""}`).join(", ")}
            </div>
          )}
          {!isForfeit && assists.length > 0 && (
            <div style={{ marginTop: 6, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
              🎯 {assists.map(a => `${a.player}${a.assists > 1 ? ` (${a.assists})` : ""}`).join(", ")}
            </div>
          )}
          {isSecondManager && (
            <div style={{ marginTop: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "8px 14px", color: "#22c55e", fontSize: "0.85rem" }}>
              ✅ Score auto-filled from opponent's submission. Table will NOT be updated again.
            </div>
          )}
        </div>
        <div style={{ background: "rgba(255,165,0,0.12)", border: "2px solid rgba(255,165,0,0.5)", borderRadius: 14, padding: "14px 18px", marginBottom: 24, color: "#FFB347", fontSize: "1.4rem", fontWeight: 800, textAlign: "center", lineHeight: 1.5 }}>
          ⚠️ FALSE RESULTS = 6 POINT DEDUCTION + FORFEIT LOSS
        </div>
        {status && <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", margin: "0 0 12px", textAlign: "center" }}>{status}</div>}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleConfirmSubmit} disabled={saving} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontSize: "1rem" }}>
            {saving ? "Submitting..." : "✅ Submit"}
          </button>
          <button onClick={() => setConfirming(false)} disabled={saving} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>
            🔍 Review
          </button>
        </div>
      </div>
    );
  }

  // ─── Forfeit form ───
  if (isForfeit) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => setMatchType(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "1.2rem" }}>← Back</button>
          <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem" }}>🚫 Forfeit Win</h3>
        </div>

        <div style={{ background: "rgba(255,165,0,0.12)", border: "2px solid rgba(255,165,0,0.5)", borderRadius: 14, padding: "16px 18px", marginBottom: 20, color: "#FFB347", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.5 }}>
          ⚠️ FALSE RESULTS WILL RESULT IN A 6 POINT DEDUCTION AND THE MATCH WILL BE DECLARED A FORFEIT LOSS.
        </div>

        <div style={{ background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#FF1493", fontWeight: 700 }}>
          Your Team: {myTeam}
        </div>

        <label style={labelStyle}>Opponent</label>
        <select value={opponent} onChange={e => setOpponent(e.target.value)} style={inputStyle}>
          <option value="">— Select opponent —</option>
          {others.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <label style={labelStyle}>Matchday <span style={{ color: "#FF1493" }}>*</span></label>
        <input type="number" min={1} value={matchday} onChange={e => setMatchday(e.target.value)} placeholder="e.g. 5" style={inputStyle} />

        <label style={labelStyle}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />

        <div style={{ border: "2px dashed rgba(255,20,147,0.5)", borderRadius: 14, padding: "16px", marginBottom: 16, background: "rgba(255,20,147,0.05)" }}>
          <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>
            📸 Match Image <span style={{ color: "#ff6b6b" }}>* Required</span>
          </div>
          {matchImagePreview ? (
            <div style={{ position: "relative" }}>
              <img src={matchImagePreview} alt="Match" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10 }} />
              <button onClick={() => { setMatchImage(null); setMatchImagePreview(""); }} style={{ position: "absolute", top: 8, right: 8, background: "#cc3333", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14 }}>✖</button>
            </div>
          ) : (
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", padding: "20px", background: "rgba(255,20,147,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
              📷 Tap to upload match image
              <input type="file" accept="image/*" onChange={handleMatchImageChange} style={{ display: "none" }} />
            </label>
          )}
        </div>

        {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", margin: "12px 0", textAlign: "center" }}>{status}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button onClick={() => {
            if (!opponent) { setStatus("Please select an opponent."); return; }
            if (!matchday) { setStatus("Matchday is required."); return; }
            if (!matchImage) { setStatus("A match image is required."); return; }
            setStatus(""); setConfirming(true);
          }} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>
            Submit Forfeit
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  // ─── Normal match form ───
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => setMatchType(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "1.2rem" }}>← Back</button>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem" }}>⚽ Normal Match</h3>
      </div>

      <div style={{ background: "rgba(255,165,0,0.12)", border: "2px solid rgba(255,165,0,0.5)", borderRadius: 14, padding: "16px 18px", marginBottom: 20, color: "#FFB347", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.5 }}>
        ⚠️ FALSE RESULTS WILL RESULT IN A 6 POINT DEDUCTION AND THE MATCH WILL BE DECLARED A FORFEIT LOSS.
      </div>

      <div style={{ background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#FF1493", fontWeight: 700 }}>
        Your Team: {myTeam}
      </div>

      <label style={labelStyle}>Opponent</label>
      <select value={opponent} onChange={e => setOpponent(e.target.value)} style={inputStyle}>
        <option value="">— Select opponent —</option>
        {others.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* 2nd manager notice */}
      {checkingDuplicate && (
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginBottom: 10 }}>🔍 Checking for existing result...</div>
      )}
      {isSecondManager && existingResult && (
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#22c55e", fontSize: "0.9rem", fontWeight: 600 }}>
          ✅ Your opponent already submitted this result. Score has been auto-filled below.<br />
          <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 400, fontSize: "0.8rem" }}>You can only add your scorers & assists. The table will not be updated again.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Your Score</label>
          <input
            type="number" min={0} value={myScore}
            onChange={e => setMyScore(e.target.value)}
            style={{ ...inputStyle, opacity: isSecondManager ? 0.6 : 1 }}
            disabled={isSecondManager}
          />
        </div>
        <div>
          <label style={labelStyle}>Opponent Score</label>
          <input
            type="number" min={0} value={oppScore}
            onChange={e => setOppScore(e.target.value)}
            style={{ ...inputStyle, opacity: isSecondManager ? 0.6 : 1 }}
            disabled={isSecondManager}
          />
        </div>
      </div>

      <label style={labelStyle}>Matchday <span style={{ color: "#FF1493" }}>*</span></label>
      <input type="number" min={1} value={matchday} onChange={e => setMatchday(e.target.value)} placeholder="e.g. 5" style={inputStyle} />

      <label style={labelStyle}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />

      {/* Match image */}
      <div style={{ border: "2px dashed rgba(255,20,147,0.5)", borderRadius: 14, padding: "16px", marginBottom: 16, background: "rgba(255,20,147,0.05)" }}>
        <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>
          📸 Match Image <span style={{ color: "#ff6b6b" }}>* Required</span>
        </div>
        {matchImagePreview ? (
          <div style={{ position: "relative" }}>
            <img src={matchImagePreview} alt="Match" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10 }} />
            <button onClick={() => { setMatchImage(null); setMatchImagePreview(""); }} style={{ position: "absolute", top: 8, right: 8, background: "#cc3333", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14 }}>✖</button>
          </div>
        ) : (
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", padding: "20px", background: "rgba(255,20,147,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
            📷 Tap to upload match image
            <input type="file" accept="image/*" onChange={handleMatchImageChange} style={{ display: "none" }} />
          </label>
        )}
      </div>

      {/* Scorers */}
      <div style={{ borderTop: "1px solid rgba(255,20,147,0.2)", paddingTop: 16, marginTop: 8 }}>
        <div style={{ color: "#fff", fontWeight: 700, marginBottom: 10, fontSize: "0.95rem" }}>⚽ Your Goal Scorers</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <input value={scorerName} onChange={e => setScorerName(e.target.value)} placeholder="Player name" style={{ ...inputStyle, flex: 2, minWidth: 120, marginBottom: 0 }} />
          <input type="number" value={scorerGoals} onChange={e => setScorerGoals(e.target.value)} min={1} style={{ ...inputStyle, width: 80, marginBottom: 0 }} />
          <button onClick={addScorer} style={{ background: "#FF1493", border: "none", borderRadius: 10, color: "#fff", padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>Add</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {scorers.map((s, i) => (
            <span key={i} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 30, padding: "5px 14px", fontSize: "0.85rem", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
              ⚽ {s.player} ({s.goals})
              <button onClick={() => removeScorer(i)} style={{ background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✖</button>
            </span>
          ))}
        </div>
      </div>

      {/* Assists */}
      <div style={{ borderTop: "1px solid rgba(255,20,147,0.2)", paddingTop: 16, marginTop: 8 }}>
        <div style={{ color: "#fff", fontWeight: 700, marginBottom: 10, fontSize: "0.95rem" }}>🎯 Your Assists</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <input value={assistName} onChange={e => setAssistName(e.target.value)} placeholder="Player name" style={{ ...inputStyle, flex: 2, minWidth: 120, marginBottom: 0 }} />
          <input type="number" value={assistCount} onChange={e => setAssistCount(e.target.value)} min={1} style={{ ...inputStyle, width: 80, marginBottom: 0 }} />
          <button onClick={addAssist} style={{ background: "#FF1493", border: "none", borderRadius: 10, color: "#fff", padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>Add</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {assists.map((a, i) => (
            <span key={i} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 30, padding: "5px 14px", fontSize: "0.85rem", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
              🎯 {a.player} ({a.assists})
              <button onClick={() => removeAssist(i)} style={{ background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✖</button>
            </span>
          ))}
        </div>
      </div>

      {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", margin: "12px 0", textAlign: "center" }}>{status}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={handleSubmitClick} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>Submit Result</button>
        <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
