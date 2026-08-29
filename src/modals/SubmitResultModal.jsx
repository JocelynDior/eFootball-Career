import { useState, useEffect, useCallback } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, get, set, update } from "firebase/database";
import { applyResultToTable } from "../utils/tableLogic";
import { getSASTToday } from "../utils/sastTime";
import { useAdmin } from "../context/AdminContext";
import { uploadToImgBB } from "../utils/imgUpload";

// ── League → tournament name mapping (matches FixturesList tournamentName prop) ──
const LEAGUE_TOURNAMENT = {
  premier: "Premier League",
  serie_a: "Serie A",
  la_liga: "La Liga",
};

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

// ── Upsert scorer/assistant in top stats ──────────────────────────────────────
async function updateTopStat(league, season, pathKey, playerName, count, team) {
  const listRef = ref(db, `career_${league}/seasons/season_${season}/${pathKey}`);
  const snap    = await get(listRef);
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
      team: team || foundEntry.team || "",
    });
  } else {
    await push(ref(db, `career_${league}/seasons/season_${season}/${pathKey}`), {
      name: playerName, count, team: team || "",
    });
  }
}

// ── Fetch home/away from calendar fixtures (±2 days) ─────────────────────────
async function detectHomeAway(league, myTeam, opponent) {
  const tournamentName = LEAGUE_TOURNAMENT[league] || "";
  const today = new Date();
  const dates = [];
  for (let offset = -2; offset <= 2; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    dates.push(d.toISOString().slice(0, 10));
  }

  const snap = await get(ref(db, "career_calendarEvents"));
  const data = snap.val() || {};

  for (const dateStr of dates) {
    const dateData = data[dateStr];
    if (!dateData?.tournaments) continue;
    for (const tourn of Object.values(dateData.tournaments)) {
      if (!tourn?.name) continue;
      if (tourn.name.trim().toLowerCase() !== tournamentName.trim().toLowerCase()) continue;
      for (const fix of Object.values(tourn.fixtures || {})) {
        const homeMatch = fix.home?.toLowerCase() === myTeam.toLowerCase() && fix.away?.toLowerCase() === opponent.toLowerCase();
        const awayMatch = fix.home?.toLowerCase() === opponent.toLowerCase() && fix.away?.toLowerCase() === myTeam.toLowerCase();
        if (homeMatch) return { homeTeam: fix.home, awayTeam: fix.away };
        if (awayMatch) return { homeTeam: fix.home, awayTeam: fix.away };
      }
    }
  }
  // Default: submitting manager is home
  return { homeTeam: myTeam, awayTeam: opponent };
}

// ── Check for existing result (same teams + matchday) — re-run at submit time ─
async function findExistingResult(league, season, myTeam, opponent, matchday) {
  const snap = await get(ref(db, PATHS.results(league, season)));
  const data = snap.val() || {};
  for (const [key, val] of Object.entries(data)) {
    if (String(val.md) !== String(matchday)) continue;
    const sameTeams =
      (val.homeTeam === myTeam && val.awayTeam === opponent) ||
      (val.homeTeam === opponent && val.awayTeam === myTeam);
    if (sameTeams) return { key, ...val };
  }
  return null;
}

// ── Existing-player picker sheet ─────────────────────────────────────────────
function PlayerPickerSheet({ title, players, myTeam, onSelectExisting, onAddNew, onClose }) {
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  const myPlayers = players.filter(p => (p.team || "").toLowerCase() === myTeam.toLowerCase());

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", maxHeight: "75vh", background: "rgba(10,0,25,0.98)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "24px 24px 0 0", padding: "24px 20px", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: 2, marginBottom: 16 }}>{title}</div>

        {myPlayers.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Your existing players</div>
            {myPlayers.map(p => (
              <button
                key={p.key}
                onClick={() => onSelectExisting(p)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 8, cursor: "pointer", color: "#fff" }}
              >
                <span style={{ fontWeight: 700, fontSize: "1rem" }}>{p.name}</span>
                <span style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem" }}>{p.count || 0}</span>
              </button>
            ))}
          </div>
        )}

        {!showNew ? (
          <button
            onClick={() => setShowNew(true)}
            style={{ width: "100%", padding: "14px 0", background: "rgba(255,255,255,0.06)", border: "2px dashed rgba(255,20,147,0.4)", borderRadius: 12, color: "#FF1493", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}
          >
            + Add Different Player
          </button>
        ) : (
          <div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>New player name</div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Player name..."
              style={inputStyle}
              onKeyDown={e => { if (e.key === "Enter" && newName.trim()) { onAddNew(newName.trim()); } }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { if (newName.trim()) onAddNew(newName.trim()); }} style={{ flex: 1, padding: 12, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add</button>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Back</button>
            </div>
          </div>
        )}

        <button onClick={onClose} style={{ width: "100%", marginTop: 12, padding: 12, background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.9rem" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Count picker ─────────────────────────────────────────────────────────────
function CountPicker({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>{label}</span>
      <button onClick={() => onChange(Math.max(1, value - 1))} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: "1.2rem", cursor: "pointer" }}>−</button>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "#FF1493", minWidth: 30, textAlign: "center" }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: "1.2rem", cursor: "pointer" }}>+</button>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function SubmitResultModal({ league, season, teams, onClose }) {
  const { manager } = useAdmin();
  const myTeam = manager?.team || "";

  const [matchType, setMatchType] = useState(null);

  // Form fields
  const [opponent,   setOpponent]   = useState("");
  const [myScore,    setMyScore]    = useState(0);
  const [oppScore,   setOppScore]   = useState(0);
  const [matchday,   setMatchday]   = useState("");
  const [date,       setDate]       = useState(getSASTToday());

  // Scorers & assists
  const [scorers,  setScorers]  = useState([]); // [{ player, goals }]
  const [assists,  setAssists]  = useState([]); // [{ player, assists }]

  // Existing players from Firebase (for picker)
  const [existingScorers,  setExistingScorers]  = useState([]);
  const [existingAssists,  setExistingAssists]  = useState([]);

  // Picker sheet state
  const [pickerType,   setPickerType]   = useState(null); // "scorer" | "assist" | null
  const [pendingCount, setPendingCount] = useState(1);    // how many goals/assists to assign

  // Match image (single upload)
  const [matchImage,        setMatchImage]        = useState(null);
  const [matchImagePreview, setMatchImagePreview] = useState("");

  // Duplicate / 2nd manager
  const [existingResult,   setExistingResult]   = useState(null);
  const [isSecondManager,  setIsSecondManager]  = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Home/away detection
  const [detectedHome, setDetectedHome] = useState(null);
  const [detectedAway, setDetectedAway] = useState(null);

  const [saving,     setSaving]     = useState(false);
  const [status,     setStatus]     = useState("");
  const [confirming, setConfirming] = useState(false);

  const others = teams.filter(t => t.name !== myTeam).map(t => t.name).sort();

  // Load existing scorers & assists from Firebase for picker
  useEffect(() => {
    if (!league || !season) return;
    get(ref(db, `career_${league}/seasons/season_${season}/top_scorers`)).then(snap => {
      const d = snap.val() || {};
      setExistingScorers(Object.entries(d).map(([k, v]) => ({ key: k, ...v })));
    });
    get(ref(db, `career_${league}/seasons/season_${season}/top_assistants`)).then(snap => {
      const d = snap.val() || {};
      setExistingAssists(Object.entries(d).map(([k, v]) => ({ key: k, ...v })));
    });
  }, [league, season]);

  // When opponent + matchday are set: detect home/away AND check for duplicate
  useEffect(() => {
    if (!opponent || !matchday || matchType !== "normal") {
      setExistingResult(null);
      setIsSecondManager(false);
      setDetectedHome(null);
      setDetectedAway(null);
      return;
    }
    let cancelled = false;
    setCheckingDuplicate(true);

    Promise.all([
      detectHomeAway(league, myTeam, opponent),
      findExistingResult(league, season, myTeam, opponent, matchday),
    ]).then(([homeAway, existing]) => {
      if (cancelled) return;
      setDetectedHome(homeAway.homeTeam);
      setDetectedAway(homeAway.awayTeam);

      if (existing && existing.submittedBy !== (manager?.uid || myTeam)) {
        setExistingResult(existing);
        setIsSecondManager(true);
        const iAmHome = homeAway.homeTeam === myTeam;
        setMyScore(iAmHome ? (existing.homeScore ?? 0) : (existing.awayScore ?? 0));
        setOppScore(iAmHome ? (existing.awayScore ?? 0) : (existing.homeScore ?? 0));
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

  // Scorer picker callbacks
  function openScorerPicker() { setPendingCount(1); setPickerType("scorer"); }
  function openAssistPicker() { setPendingCount(1); setPickerType("assist"); }

  function handleSelectExistingScorer(player) {
    setScorers(prev => {
      const idx = prev.findIndex(s => s.player.toLowerCase() === player.name.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], goals: updated[idx].goals + pendingCount };
        return updated;
      }
      return [...prev, { player: player.name, goals: pendingCount }];
    });
    setPickerType(null);
  }

  function handleAddNewScorer(name) {
    setScorers(prev => {
      const idx = prev.findIndex(s => s.player.toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], goals: updated[idx].goals + pendingCount };
        return updated;
      }
      return [...prev, { player: name, goals: pendingCount }];
    });
    setPickerType(null);
  }

  function handleSelectExistingAssist(player) {
    setAssists(prev => {
      const idx = prev.findIndex(a => a.player.toLowerCase() === player.name.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], assists: updated[idx].assists + pendingCount };
        return updated;
      }
      return [...prev, { player: player.name, assists: pendingCount }];
    });
    setPickerType(null);
  }

  function handleAddNewAssist(name) {
    setAssists(prev => {
      const idx = prev.findIndex(a => a.player.toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], assists: updated[idx].assists + pendingCount };
        return updated;
      }
      return [...prev, { player: name, assists: pendingCount }];
    });
    setPickerType(null);
  }

  function removeScorer(i) { setScorers(prev => prev.filter((_, idx) => idx !== i)); }
  function removeAssist(i) { setAssists(prev => prev.filter((_, idx) => idx !== i)); }

  function handleSubmitClick() {
    if (!opponent) { setStatus("Please select an opponent."); return; }
    if (!matchday) { setStatus("Matchday is required."); return; }
    if (!matchImage) { setStatus("A match image is required."); return; }
    setStatus(""); setConfirming(true);
  }

  async function handleConfirmSubmit() {
    setSaving(true);
    try {
      // ── Re-check duplicate at submit time (race condition guard) ──
      const existingNow = await findExistingResult(league, season, myTeam, opponent, matchday);
      const isSecondNow = existingNow && existingNow.submittedBy !== (manager?.uid || myTeam);

      // ── Detect home/away at submit time ──
      const homeAway = await detectHomeAway(league, myTeam, opponent);
      const homeTeam = homeAway.homeTeam;
      const awayTeam = homeAway.awayTeam;
      const iAmHome  = homeTeam === myTeam || homeTeam.toLowerCase() === myTeam.toLowerCase();

      setStatus("Uploading match image...");
      const matchImageUrl = await uploadToImgBB(matchImage);

      const isForfeit  = matchType === "forfeit";
      const homeScore  = isForfeit ? 3 : (iAmHome ? +myScore : +oppScore);
      const awayScore  = isForfeit ? 0 : (iAmHome ? +oppScore : +myScore);

      const scorersData = scorers.map(s => ({ player: s.player, goals: s.goals, team: myTeam }));
      const assistsData = assists.map(a => ({ player: a.player, assists: a.assists, team: myTeam }));

      if (isSecondNow && existingNow) {
        // ── 2nd MANAGER: add scorers to existing result, skip table update ──
        setStatus("Adding your scorers to match result...");
        const side = iAmHome ? "home" : "away";
        const existingGoalScorers = existingNow.goalScorers || { home: [], away: [] };
        const existingAssistsData = existingNow.assists    || { home: [], away: [] };

        await update(ref(db, `${PATHS.results(league, season)}/${existingNow.key}`), {
          goalScorers: {
            ...existingGoalScorers,
            [side]: [...(existingGoalScorers[side] || []), ...scorersData],
          },
          assists: {
            ...existingAssistsData,
            [side]: [...(existingAssistsData[side] || []), ...assistsData],
          },
          [`matchImageUrl_${side}`]: matchImageUrl,
          secondManagerSubmittedBy: manager?.uid || myTeam,
          secondManagerSubmittedAt: Date.now(),
        });

        setStatus("Updating stats...");
        for (const s of scorersData) await updateTopStat(league, season, "top_scorers",    s.player, s.goals,   myTeam);
        for (const a of assistsData) await updateTopStat(league, season, "top_assistants", a.player, a.assists, myTeam);

      } else {
        // ── 1st MANAGER: create result and update table ──
        setStatus("Saving result...");
        await push(ref(db, PATHS.results(league, season)), {
          homeTeam, awayTeam,
          homeScore, awayScore,
          forfeitType: isForfeit ? "forfeit_win" : "none",
          matchType:   isForfeit ? "forfeit"      : "normal",
          md: +matchday, date, matchImageUrl,
          goalScorers: {
            home: iAmHome ? scorersData : [],
            away: iAmHome ? [] : scorersData,
          },
          assists: {
            home: iAmHome ? assistsData : [],
            away: iAmHome ? [] : assistsData,
          },
          submittedBy:  manager?.uid || myTeam,
          submittedAt:  Date.now(),
          status: "approved",
        });

        setStatus("Updating table...");
        await applyResultToTable(league, season, homeTeam, awayTeam, homeScore, awayScore, isForfeit ? "forfeit_win" : "none");

        if (!isForfeit) {
          setStatus("Updating stats...");
          for (const s of scorersData) await updateTopStat(league, season, "top_scorers",    s.player, s.goals,   myTeam);
          for (const a of assistsData) await updateTopStat(league, season, "top_assistants", a.player, a.assists, myTeam);
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

  // ── No team assigned ──────────────────────────────────────────────────────
  if (!myTeam) {
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16 }}>⚽ Submit Result</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "40px 0" }}>You must have a team assigned to submit results.</p>
        <button onClick={onClose} style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
      </div>
    );
  }

  // ── Step 1: Match type ────────────────────────────────────────────────────
  if (!matchType) {
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 8 }}>⚽ Submit Result</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 28, fontSize: "0.9rem" }}>Your Team: <strong style={{ color: "#FF1493" }}>{myTeam}</strong></p>
        <div style={{ background: "rgba(255,165,0,0.12)", border: "2px solid rgba(255,165,0,0.5)", borderRadius: 14, padding: "18px 20px", marginBottom: 28, color: "#FFB347", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.5, textAlign: "center" }}>
          ⚠️ FALSE RESULTS WILL RESULT IN A 6 POINT DEDUCTION AND THE MATCH WILL BE DECLARED A FORFEIT LOSS.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <button onClick={() => setMatchType("normal")} style={{ background: "rgba(255,20,147,0.1)", border: "2px solid rgba(255,20,147,0.5)", borderRadius: 20, padding: "32px 16px", cursor: "pointer", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.22)"} onMouseOut={e => e.currentTarget.style.background = "rgba(255,20,147,0.1)"}>
            <span style={{ fontSize: "2.5rem" }}>⚽</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: 2 }}>NORMAL MATCH</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>Goals, scorers, assists</span>
          </button>
          <button onClick={() => setMatchType("forfeit")} style={{ background: "rgba(255,100,0,0.1)", border: "2px solid rgba(255,100,0,0.5)", borderRadius: 20, padding: "32px 16px", cursor: "pointer", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,100,0,0.22)"} onMouseOut={e => e.currentTarget.style.background = "rgba(255,100,0,0.1)"}>
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

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (confirming) {
    const homeDisplay = detectedHome || myTeam;
    const awayDisplay = detectedAway || opponent;
    const iAmHome = homeDisplay === myTeam || homeDisplay.toLowerCase() === myTeam.toLowerCase();
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
            {homeDisplay} <span style={{ color: "#FF1493" }}>
              {isForfeit
                ? (iAmHome ? "3 — 0" : "0 — 3")
                : (iAmHome ? `${myScore} — ${oppScore}` : `${oppScore} — ${myScore}`)
              }
            </span> {awayDisplay}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
            {isForfeit ? "Forfeit Win" : isSecondManager ? "Adding your scorers to existing result" : "Normal Match"}
            &nbsp;·&nbsp; Matchday {matchday} &nbsp;·&nbsp; {date}
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
              ✅ Score auto-filled. Table will NOT be updated again.
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

  // ── Forfeit form ──────────────────────────────────────────────────────────
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
          <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>📸 Match Image <span style={{ color: "#ff6b6b" }}>* Required</span></div>
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
          }} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>Submit Forfeit</button>
          <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── Normal match form ─────────────────────────────────────────────────────
  return (
    <div>
      {/* Picker sheet */}
      {pickerType === "scorer" && (
        <PlayerPickerSheet
          title="⚽ Add Goal Scorer"
          players={existingScorers}
          myTeam={myTeam}
          onSelectExisting={handleSelectExistingScorer}
          onAddNew={handleAddNewScorer}
          onClose={() => setPickerType(null)}
        />
      )}
      {pickerType === "assist" && (
        <PlayerPickerSheet
          title="🎯 Add Assist"
          players={existingAssists}
          myTeam={myTeam}
          onSelectExisting={handleSelectExistingAssist}
          onAddNew={handleAddNewAssist}
          onClose={() => setPickerType(null)}
        />
      )}

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

      {/* Home/Away detected */}
      {detectedHome && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
          🏟️ <strong style={{ color: "#fff" }}>{detectedHome}</strong> (Home) vs <strong style={{ color: "#fff" }}>{detectedAway}</strong> (Away)
          <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 8, fontSize: "0.75rem" }}>Detected from fixtures</span>
        </div>
      )}

      {/* 2nd manager notice */}
      {checkingDuplicate && (
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginBottom: 10 }}>🔍 Checking for existing result...</div>
      )}
      {isSecondManager && existingResult && (
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#22c55e", fontSize: "0.9rem", fontWeight: 600 }}>
          ✅ Opponent already submitted. Score auto-filled — you can only add your scorers & assists. Table will not be updated again.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Your Score</label>
          <input type="number" min={0} value={myScore} onChange={e => setMyScore(e.target.value)} style={{ ...inputStyle, opacity: isSecondManager ? 0.5 : 1 }} disabled={isSecondManager} />
        </div>
        <div>
          <label style={labelStyle}>Opponent Score</label>
          <input type="number" min={0} value={oppScore} onChange={e => setOppScore(e.target.value)} style={{ ...inputStyle, opacity: isSecondManager ? 0.5 : 1 }} disabled={isSecondManager} />
        </div>
      </div>

      <label style={labelStyle}>Matchday <span style={{ color: "#FF1493" }}>*</span></label>
      <input type="number" min={1} value={matchday} onChange={e => setMatchday(e.target.value)} placeholder="e.g. 5" style={inputStyle} />

      <label style={labelStyle}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />

      {/* ── SINGLE MATCH IMAGE ── */}
      <div style={{ border: "2px dashed rgba(255,20,147,0.5)", borderRadius: 14, padding: "16px", marginBottom: 20, background: "rgba(255,20,147,0.05)" }}>
        <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>📸 Match Image <span style={{ color: "#ff6b6b" }}>* Required</span></div>
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

      {/* ── SCORERS ── */}
      <div style={{ borderTop: "1px solid rgba(255,20,147,0.2)", paddingTop: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>⚽ Goal Scorers</div>
          <button
            onClick={openScorerPicker}
            style={{ background: "#FF1493", border: "none", borderRadius: 20, color: "#fff", padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
          >
            + Add Scorer
          </button>
        </div>
        {scorers.length === 0 && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>No scorers added yet.</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {scorers.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 30, padding: "6px 14px" }}>
              <span style={{ color: "#fff", fontSize: "0.9rem" }}>⚽ {s.player}</span>
              <CountPicker label="" value={s.goals} onChange={v => setScorers(prev => { const u = [...prev]; u[i] = { ...u[i], goals: v }; return u; })} />
              <button onClick={() => removeScorer(i)} style={{ background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✖</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── ASSISTS ── */}
      <div style={{ borderTop: "1px solid rgba(255,20,147,0.2)", paddingTop: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>🎯 Assists</div>
          <button
            onClick={openAssistPicker}
            style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.5)", borderRadius: 20, color: "#FF1493", padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
          >
            + Add Assist
          </button>
        </div>
        {assists.length === 0 && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>No assists added yet.</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {assists.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 30, padding: "6px 14px" }}>
              <span style={{ color: "#fff", fontSize: "0.9rem" }}>🎯 {a.player}</span>
              <CountPicker label="" value={a.assists} onChange={v => setAssists(prev => { const u = [...prev]; u[i] = { ...u[i], assists: v }; return u; })} />
              <button onClick={() => removeAssist(i)} style={{ background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✖</button>
            </div>
          ))}
        </div>
      </div>

      {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", margin: "12px 0", textAlign: "center" }}>{status}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button onClick={handleSubmitClick} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>Submit Result</button>
        <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
