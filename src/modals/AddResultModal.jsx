import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, set, get } from "firebase/database";
import { applyResultToTable, reverseResultFromTable } from "../utils/tableLogic";
import { getSASTToday } from "../utils/sastTime";

async function updateTopStat(league, season, pathKey, playerName, count, imageUrl, team) {
  const listRef = ref(db, `career_${league}/seasons/season_${season}/${pathKey}`);
  const snap = await get(listRef);
  const existing = snap.val() || {};
  let foundKey = null, foundEntry = null;
  for (const [k, v] of Object.entries(existing)) {
    if ((v.name || "").toLowerCase() === playerName.toLowerCase()) {
      foundKey = k; foundEntry = v; break;
    }
  }
  if (foundKey) {
    await set(ref(db, `career_${league}/seasons/season_${season}/${pathKey}/${foundKey}`), {
      ...foundEntry,
      count: (foundEntry.count || 0) + count,
      imageUrl: imageUrl || foundEntry.imageUrl || "",
      team: team || foundEntry.team || "",
    });
  } else {
    await push(ref(db, `career_${league}/seasons/season_${season}/${pathKey}`), {
      name: playerName, count, imageUrl: imageUrl || "", team: team || "",
    });
  }
}

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.4)",
  borderRadius: "10px", color: "#fff",
  fontFamily: "inherit", fontSize: "0.9rem",
  outline: "none", boxSizing: "border-box", marginBottom: "14px",
};
const labelStyle = {
  color: "rgba(255,255,255,0.6)", fontSize: "0.75rem",
  display: "block", marginBottom: "4px",
  textTransform: "uppercase", letterSpacing: "0.5px",
};

export default function AddResultModal({ league, season, teams, result = null, onClose }) {
  const isEdit = !!result;

  // Step 1 for new results: pick match type
  const [matchType, setMatchType] = useState(
    result
      ? (result.forfeitType === "no_contest" ? "no_contest" : result.forfeitType && result.forfeitType !== "none" ? "forfeit" : "normal")
      : null
  );

  const [homeTeam, setHomeTeam] = useState(result?.homeTeam || "");
  const [awayTeam, setAwayTeam] = useState(result?.awayTeam || "");
  const [homeScore, setHomeScore] = useState(result?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(result?.awayScore ?? 0);
  const [matchday, setMatchday] = useState(result?.md || "");
  const [date, setDate] = useState(result?.date || getSASTToday());
  // For forfeit: which team won (home or away)
  const [forfeitWinner, setForfeitWinner] = useState("home");
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
  function removeScorer(side, index) {
    if (side === "home") setScorersHome(prev => prev.filter((_, i) => i !== index));
    else setScorersAway(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!homeTeam || !awayTeam) { setStatus("Select both teams."); return; }
    if (homeTeam === awayTeam) { setStatus("Teams must be different."); return; }
    setSaving(true);
    setStatus("Saving...");

    try {
      let finalHomeScore = +homeScore;
      let finalAwayScore = +awayScore;
      let forfeitType = "none";
      let finalMatchType = "normal";

      if (matchType === "no_contest") {
        forfeitType = "no_contest";
        finalMatchType = "forfeit";
        finalHomeScore = 0;
        finalAwayScore = 0;
      } else if (matchType === "forfeit") {
        forfeitType = "forfeit_win";
        finalMatchType = "forfeit";
        // Winner gets 3-0
        if (forfeitWinner === "home") {
          finalHomeScore = 3; finalAwayScore = 0;
        } else {
          finalHomeScore = 0; finalAwayScore = 3;
        }
      }

      const data = {
        homeTeam, awayTeam,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        forfeitType,
        md: matchday ? +matchday : null,
        date,
        matchType: finalMatchType,
        goalScorers: { home: matchType === "normal" ? scorersHome : [], away: matchType === "normal" ? scorersAway : [] },
        assists: result?.assists || { home: [], away: [] },
        status: "approved",
        approvedAt: Date.now(),
        submittedBy: "admin",
        submittedAt: result?.submittedAt || Date.now(),
        matchImageUrl: result?.matchImageUrl || "",
      };

      if (isEdit) {
        setStatus("Reversing old table stats...");
        await reverseResultFromTable(
          league, season,
          result.homeTeam, result.awayTeam,
          result.homeScore, result.awayScore,
          result.forfeitType || "none"
        );
        setStatus("Applying new stats...");
        await applyResultToTable(league, season, homeTeam, awayTeam, finalHomeScore, finalAwayScore, forfeitType);
        await set(ref(db, `${PATHS.results(league, season)}/${result.key}`), data);
      } else {
        await push(ref(db, PATHS.results(league, season)), data);
        await applyResultToTable(league, season, homeTeam, awayTeam, finalHomeScore, finalAwayScore, forfeitType);
        // Push scorers to top_scorers
        if (matchType === "normal") {
          for (const s of scorersHome) {
            await updateTopStat(league, season, "top_scorers", s.player, s.goals || 1, "", homeTeam);
          }
          for (const s of scorersAway) {
            await updateTopStat(league, season, "top_scorers", s.player, s.goals || 1, "", awayTeam);
          }
        }
      }

      onClose();
    } catch (e) {
      setStatus("Error: " + e.message);
      setSaving(false);
    }
  }

  // ─── Step 1: Match type selection (new results only) ───
  if (!isEdit && !matchType) {
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 24 }}>
          ⚽ Add Result
        </h3>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 20, textAlign: "center" }}>Select match type:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { type: "normal", icon: "⚽", label: "NORMAL MATCH", desc: "Regular result with score" },
            { type: "forfeit", icon: "🚫", label: "FORFEIT WIN", desc: "3-0 awarded to winner" },
            { type: "no_contest", icon: "🤝", label: "NO CONTEST", desc: "F-F, no stats" },
          ].map(opt => (
            <button key={opt.type} onClick={() => setMatchType(opt.type)}
              style={{ background: "rgba(255,20,147,0.08)", border: "2px solid rgba(255,20,147,0.4)", borderRadius: 16, padding: "24px 12px", cursor: "pointer", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s" }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.2)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
            >
              <span style={{ fontSize: "2rem" }}>{opt.icon}</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: 1 }}>{opt.label}</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>{opt.desc}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    );
  }

  // ─── Main form ───
  const isNoContest = matchType === "no_contest";
  const isForfeit = matchType === "forfeit";
  const isNormal = matchType === "normal";

  const matchTypeLabel = isNoContest ? "🤝 No Contest" : isForfeit ? "🚫 Forfeit Win" : "⚽ Normal Match";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        {!isEdit && (
          <button onClick={() => setMatchType(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "1.1rem" }}>← Back</button>
        )}
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem" }}>
          {isEdit ? "✏️ Edit Result" : matchTypeLabel}
        </h3>
      </div>

      {/* Team selectors - always shown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
      </div>

      <label style={labelStyle}>Matchday</label>
      <input type="number" min={1} value={matchday} onChange={e => setMatchday(e.target.value)} placeholder="e.g. 5" style={inputStyle} />

      <label style={labelStyle}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />

      {/* Normal match: scores + scorers */}
      {isNormal && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Home Score</label>
              <input type="number" min={0} value={homeScore} onChange={e => setHomeScore(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Away Score</label>
              <input type="number" min={0} value={awayScore} onChange={e => setAwayScore(e.target.value)} style={inputStyle} />
            </div>
          </div>

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
                {scorersHome.map((s, i) => (
                  <span key={i} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", padding: "4px 12px", borderRadius: "20px", color: "#fff", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    H: {s.player} ({s.goals})
                    <button onClick={() => removeScorer("home", i)} style={{ background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 16, height: 16, cursor: "pointer", fontSize: 10 }}>✖</button>
                  </span>
                ))}
                {scorersAway.map((s, i) => (
                  <span key={i} style={{ background: "rgba(65,105,225,0.2)", border: "1px solid rgba(65,105,225,0.4)", padding: "4px 12px", borderRadius: "20px", color: "#fff", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    A: {s.player} ({s.goals})
                    <button onClick={() => removeScorer("away", i)} style={{ background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 16, height: 16, cursor: "pointer", fontSize: 10 }}>✖</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Forfeit: pick winner */}
      {isForfeit && (
        <div style={{ background: "rgba(255,100,0,0.08)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ color: "#FFB347", fontWeight: 700, marginBottom: 12, fontSize: "0.9rem" }}>🚫 Which team wins the forfeit? (3-0 awarded)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => setForfeitWinner("home")} style={{ padding: "12px", borderRadius: 10, border: `2px solid ${forfeitWinner === "home" ? "#FF1493" : "rgba(255,255,255,0.2)"}`, background: forfeitWinner === "home" ? "rgba(255,20,147,0.2)" : "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
              🏠 {homeTeam || "Home"} wins
            </button>
            <button onClick={() => setForfeitWinner("away")} style={{ padding: "12px", borderRadius: 10, border: `2px solid ${forfeitWinner === "away" ? "#FF1493" : "rgba(255,255,255,0.2)"}`, background: forfeitWinner === "away" ? "rgba(255,20,147,0.2)" : "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
              ✈️ {awayTeam || "Away"} wins
            </button>
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: 10, textAlign: "center" }}>
            Result will show as 3-0 (F) for the winner
          </div>
        </div>
      )}

      {/* No contest info */}
      {isNoContest && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 16, marginBottom: 14, textAlign: "center" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>F — F</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>No contest — no points awarded, no stats recorded</div>
        </div>
      )}

      {isEdit && (
        <div style={{ background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "rgba(255,200,100,0.9)", fontSize: "0.82rem" }}>
          ⚠️ Editing will reverse the old result from the table and apply the new one.
        </div>
      )}

      {status && (
        <div style={{ color: status.startsWith("Error") ? "#ff6b6b" : "#22c55e", fontSize: "0.85rem", marginBottom: "12px" }}>{status}</div>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
