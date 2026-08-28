import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, set, push, get } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";
import LeagueTable from "../components/LeagueTable";
import GroupStageModal from "../modals/GroupStageModal";
import FixturesList from "../components/FixturesList";
import ResultsList from "../components/ResultsList";
import TopScorers from "../components/TopScorers";
import TopAssistants from "../components/TopAssistants";
import Modal from "../components/Modal";
import AddTeamModal from "../modals/AddTeamModal";
import AddResultModal from "../modals/AddResultModal";
import StatPlayerModal from "../modals/StatPlayerModal";
import LeagueRulesModal from "../modals/LeagueRulesModal";
import LeagueAdminSettingsModal from "../modals/LeagueAdminSettingsModal";
import SubmitResultModal from "../modals/SubmitResultModal";
import LoadingSpinner from "../components/LoadingSpinner";
import LeagueHeadlineSlideshow from "../components/LeagueHeadlineSlideshow";
import LeagueTableHeader from "../components/LeagueTableHeader";
import MatchdayCountdowns from "../components/MatchdayCountdowns";
import { applyResultToTable } from "../utils/tableLogic";

const LEAGUE = "laliga";
const LEAGUE_NAME = "La Liga";

function getSASTNow() { return new Date(Date.now() + 2 * 60 * 60 * 1000); }
function getSASTDateStr(offsetDays = 0) {
  const d = getSASTNow(); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

async function updateTopStat(league, season, pathKey, playerName, count, imageUrl, team) {
  const listRef = ref(db, `career_${league}/seasons/season_${season}/${pathKey}`);
  const snap = await get(listRef);
  const existing = snap.val() || {};
  let foundKey = null, foundEntry = null;
  for (const [k, v] of Object.entries(existing)) {
    if ((v.name || "").toLowerCase() === playerName.toLowerCase()) { foundKey = k; foundEntry = v; break; }
  }
  if (foundKey) {
    await set(ref(db, `career_${league}/seasons/season_${season}/${pathKey}/${foundKey}`), {
      ...foundEntry, count: (foundEntry.count || 0) + count,
      imageUrl: imageUrl || foundEntry.imageUrl || "", team: team || foundEntry.team || "",
    });
  } else {
    await push(ref(db, `career_${league}/seasons/season_${season}/${pathKey}`), {
      name: playerName, count, imageUrl: imageUrl || "", team: team || "",
    });
  }
}

// Per-tab loading state wrapper
function TabContent({ loading, children, emptyCheck }) {
  if (loading) return <LoadingSpinner />;
  return <>{children}</>;
}

// Countdown card
function Countdown({ title, startMs, durationMs, accent = "#FF1493" }) {
  const [parts, setParts] = useState({ h: "48", m: "00", s: "00", pct: 1 });
  useEffect(() => {
    function tick() {
      const elapsed = Date.now() - startMs;
      const cycleElapsed = durationMs > 0 ? elapsed % durationMs : 0;
      const remaining = Math.max(0, durationMs - cycleElapsed);
      setParts({
        h: String(Math.floor(remaining / 3600000)).padStart(2, "0"),
        m: String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0"),
        pct: remaining / durationMs,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs, durationMs]);

  const urgency = parts.pct < 0.1 ? "#ff4444" : parts.pct < 0.25 ? "#FFB347" : accent;

  return (
    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: `1px solid ${urgency}33`, borderRadius: 20, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ color: urgency, fontFamily: "\'Bebas Neue\', sans-serif", fontSize: "1.7rem", letterSpacing: 2, textAlign: "center" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[parts.h, parts.m, parts.s].map((val, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 88, height: 104, background: "rgba(0,0,20,0.8)", border: `3px solid ${urgency}66`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${urgency}22` }}>
                <span style={{ fontFamily: "\'Bebas Neue\', sans-serif", fontSize: "3.6rem", color: urgency, lineHeight: 1 }}>{val}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.1rem", letterSpacing: 1, marginTop: 6 }}>{["HRS", "MIN", "SEC"][i]}</span>
            </div>
            {i < 2 && <span style={{ color: urgency, fontFamily: "\'Bebas Neue\', sans-serif", fontSize: "3rem", marginBottom: 28, opacity: 0.6 }}>:</span>}
          </div>
        ))}
      </div>
      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{ width: `${parts.pct * 100}%`, height: "100%", background: urgency, borderRadius: 3, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}) {
  const [parts, setParts] = useState({ h: "48", m: "00", s: "00", pct: 1 });
  useEffect(() => {
    function tick() {
      const elapsed = Date.now() - startMs;
      const cycleElapsed = durationMs > 0 ? elapsed % durationMs : 0;
      const remaining = Math.max(0, durationMs - cycleElapsed);
      setParts({
        h: String(Math.floor(remaining / 3600000)).padStart(2, "0"),
        m: String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0"),
        pct: remaining / durationMs,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs, durationMs]);

  const urgency = parts.pct < 0.1 ? "#ff4444" : parts.pct < 0.25 ? "#FFB347" : accent;

  return (
    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: `1px solid ${urgency}33`, borderRadius: 20, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ color: urgency, fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.85rem", letterSpacing: 2, textAlign: "center" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {[parts.h, parts.m, parts.s].map((val, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 44, height: 52, background: "rgba(0,0,20,0.8)", border: `1.5px solid ${urgency}66`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 12px ${urgency}22` }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: urgency, lineHeight: 1 }}>{val}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.55rem", letterSpacing: 1, marginTop: 3 }}>{["HRS", "MIN", "SEC"][i]}</span>
            </div>
            {i < 2 && <span style={{ color: urgency, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", marginBottom: 14, opacity: 0.6 }}>:</span>}
          </div>
        ))}
      </div>
      <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
        <div style={{ width: `${parts.pct * 100}%`, height: "100%", background: urgency, borderRadius: 2, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

function PendingCard({ r, section, onApprove, onNoContest, onReject }) {
  // Countdown synced with matchday deadline:
  // Today section: 48hr from today\'s SAST midnight
  // Yesterday section: 24hr from yesterday\'s SAST midnight
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function getSASTMidnightMs(offsetDays = 0) {
      const sastNow = new Date(Date.now() + 2 * 3600000);
      return new Date(Date.UTC(sastNow.getUTCFullYear(), sastNow.getUTCMonth(), sastNow.getUTCDate() + offsetDays, 0, 0, 0) - 2 * 3600000).getTime();
    }
    const midnightMs = section === "today" ? getSASTMidnightMs(0) : getSASTMidnightMs(-1);
    const durationMs = section === "today" ? 48 * 3600000 : 24 * 3600000;
    const deadlineMs = midnightMs + durationMs;

    function tick() {
      const diff = deadlineMs - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [section]);

  const diff = remaining === "Expired" ? 0 : (() => {
    const parts = remaining.match(/(\d+)h (\d+)m (\d+)s/);
    if (!parts) return Infinity;
    return (+parts[1]) * 3600000 + (+parts[2]) * 60000 + (+parts[3]) * 1000;
  })();
  const countColor = remaining === "Expired" ? "#ff4444" : diff < 3600000 ? "#ff6b6b" : diff < 7200000 ? "#FFB347" : "#22c55e";

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 16, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", fontFamily: "\'Bebas Neue\', sans-serif", letterSpacing: 1 }}>
            {r.homeTeam} <span style={{ color: "#FF1493" }}>{r.homeScore ?? "?"} — {r.awayScore ?? "?"}</span> {r.awayTeam}
          </div>
          {r.md && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: 2 }}>MD {r.md} · {r.date || ""}</div>}
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: 4 }}>by {r.submittedBy || "manager"}</div>
        </div>
        <span style={{ color: countColor, fontWeight: 700, fontFamily: "monospace", fontSize: "0.85rem" }}>⏱ {remaining}</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => onApprove(r)} style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>✅ Approve</button>
        <button onClick={() => onNoContest(r)} style={{ background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.4)", color: "#FFB347", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>🟡 No Contest</button>
        <button onClick={() => onReject(r)} style={{ background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>🗑️ Reject</button>
      </div>
    </div>
  );
}) {
  const hours = section === "today" ? 48 : 24;
  const expiresAt = (r.submittedAt || Date.now()) + hours * 3600000;
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function tick() {
      const diff = expiresAt - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [expiresAt]);

  const diff = expiresAt - Date.now();
  const countColor = diff < 3600000 ? "#ff6b6b" : diff < 7200000 ? "#FFB347" : "#22c55e";

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 16, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
            {r.homeTeam} <span style={{ color: "#FF1493" }}>{r.homeScore ?? "?"} — {r.awayScore ?? "?"}</span> {r.awayTeam}
          </div>
          {r.md && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: 2 }}>MD {r.md} · {r.date || ""}</div>}
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: 4 }}>by {r.submittedBy || "manager"}</div>
        </div>
        <span style={{ color: countColor, fontWeight: 700, fontFamily: "monospace", fontSize: "0.85rem" }}>⏱ {remaining}</span>
      </div>
      {r.matchImageUrl && <div style={{ marginBottom: 10, borderRadius: 10, overflow: "hidden", maxHeight: 140 }}><img src={r.matchImageUrl} alt="Match" style={{ width: "100%", height: 140, objectFit: "cover" }} /></div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => onApprove(r)} style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>✅ Approve</button>
        <button onClick={() => onNoContest(r)} style={{ background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.4)", color: "#FFB347", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>🟡 No Contest</button>
        <button onClick={() => onReject(r)} style={{ background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>🗑️ Reject</button>
      </div>
    </div>
  );
}

export default function LaLigaPage() {
  const { isAdmin } = useAdmin();
  const [season, setSeason] = useState("1");
  const [seasons, setSeasons] = useState(["1"]);
  const [tab, setTab] = useState("main");
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabMode, setTabMode] = useState("table");
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const [editTeam, setEditTeam] = useState(undefined);
  const [editResult, setEditResult] = useState(undefined);
  const [editStat, setEditStat] = useState(undefined);
  const [statType, setStatType] = useState("scorer");
  const [adminOpen, setAdminOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${LEAGUE}_settings`), snap => {
      const d = snap.val() || {};
      if (d.seasons) setSeasons(d.seasons.map(String));
      setTabMode(d.tabMode || "table");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubs = [
      onValue(ref(db, PATHS.table(LEAGUE, season)), snap => {
        setTeams(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : []);
        setLoading(false);
      }),
      onValue(ref(db, PATHS.results(LEAGUE, season)), snap =>
        setResults(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : [])),
      onValue(ref(db, PATHS.pendingResults(LEAGUE, season)), snap =>
        setPending(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : [])),
    ];
    return () => unsubs.forEach(u => u());
  }, [season]);

  // Tab change shows spinner briefly
  function handleTabChange(t) {
    setTabLoading(true);
    setTab(t);
    setTimeout(() => setTabLoading(false), 400);
  }

  async function handleAddSeason() {
    const n = prompt("New season number:"); if (!n) return;
    const updated = [...seasons, n];
    setSeasons(updated); setSeason(n);
    await set(ref(db, `career_${LEAGUE}_settings/seasons`), updated);
  }

  async function handleDeleteResult(key) {
    if (!confirm("Delete this result? Table stats will NOT be reversed.")) return;
    try { await remove(ref(db, `${PATHS.results(LEAGUE, season)}/${key}`)); }
    catch (e) { alert("Error: " + e.message); }
  }

  async function handleApprovePending(r) {
    if (!confirm(`Approve: ${r.homeTeam} ${r.homeScore} - ${r.awayScore} ${r.awayTeam}?`)) return;
    try {
      await push(ref(db, PATHS.results(LEAGUE, season)), { ...r, status: "approved", approvedAt: Date.now() });
      await applyResultToTable(LEAGUE, season, r.homeTeam, r.awayTeam, r.homeScore, r.awayScore, r.forfeitType || "none");
      for (const s of (r.goalScorers?.home || [])) await updateTopStat(LEAGUE, season, "top_scorers", s.player, s.goals || 1, s.imageUrl || "", r.homeTeam);
      for (const s of (r.goalScorers?.away || [])) await updateTopStat(LEAGUE, season, "top_scorers", s.player, s.goals || 1, s.imageUrl || "", r.awayTeam);
      for (const a of (r.assists?.home || [])) await updateTopStat(LEAGUE, season, "top_assistants", a.player, a.assists || 1, a.imageUrl || "", r.homeTeam);
      for (const a of (r.assists?.away || [])) await updateTopStat(LEAGUE, season, "top_assistants", a.player, a.assists || 1, a.imageUrl || "", r.awayTeam);
      await remove(ref(db, `${PATHS.pendingResults(LEAGUE, season)}/${r.key}`));
    } catch (e) { alert("Error approving: " + e.message); }
  }

  async function handleNoContest(r) {
    if (!confirm(`No Contest: ${r.homeTeam} vs ${r.awayTeam}?`)) return;
    try {
      await push(ref(db, PATHS.results(LEAGUE, season)), { homeTeam: r.homeTeam, awayTeam: r.awayTeam, homeScore: 0, awayScore: 0, forfeitType: "no_contest", matchType: "forfeit", md: r.md, date: r.date, matchImageUrl: r.matchImageUrl || "", goalScorers: { home: [], away: [] }, assists: { home: [], away: [] }, submittedBy: r.submittedBy, submittedAt: r.submittedAt, status: "approved", approvedAt: Date.now() });
      await applyResultToTable(LEAGUE, season, r.homeTeam, r.awayTeam, 0, 0, "no_contest");
      await remove(ref(db, `${PATHS.pendingResults(LEAGUE, season)}/${r.key}`));
    } catch (e) { alert("Error: " + e.message); }
  }

  async function handleRejectPending(r) {
    if (!confirm("Reject and delete?")) return;
    try { await remove(ref(db, `${PATHS.pendingResults(LEAGUE, season)}/${r.key}`)); }
    catch (e) { alert("Error: " + e.message); }
  }

  const todayStr = getSASTDateStr(0);
  const yesterdayStr = getSASTDateStr(-1);
  const pendingToday = pending.filter(r => { if (!r.submittedAt) return true; return new Date(r.submittedAt + 2 * 3600000).toISOString().split("T")[0] === todayStr; });
  const pendingYesterday = pending.filter(r => { if (!r.submittedAt) return false; return new Date(r.submittedAt + 2 * 3600000).toISOString().split("T")[0] === yesterdayStr; });

  // Countdowns
  function getSASTMidnight(offsetDays = 0) {
    const sastNow = new Date(Date.now() + 2 * 3600000);
    return new Date(Date.UTC(sastNow.getUTCFullYear(), sastNow.getUTCMonth(), sastNow.getUTCDate() + offsetDays, 0, 0, 0) - 2 * 3600000).getTime();
  }
  const todayMidnight = getSASTMidnight(0);
  const yesterdayMidnight = getSASTMidnight(-1);
  const D48 = 48 * 3600000;

  const TABS = [
    { id: "main", label: tabMode === "groupStage" ? "GROUP STAGE" : "TABLE" },
    { id: "fixtures", label: "FIXTURES" },
    { id: "results", label: "RESULTS" },
    { id: "scorers", label: "TOP SCORERS" },
    { id: "assists", label: "TOP ASSISTS" },
    ...(isAdmin && pending.length > 0 ? [{ id: "pending", label: `PENDING (${pending.length})` }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar leagueMenuProps={{ league: LEAGUE, season, teams, onEditTeamIcon: () => setEditTeam(null), onAddPlayerIcon: () => { setStatType("scorer"); setEditStat(null); } }} />
      <LeagueHeadlineSlideshow league={LEAGUE} />

      <div style={{ padding: "20px 20px 0" }}>
        {/* League table header with season selector integrated */}
        <LeagueTableHeader
          title={LEAGUE_NAME}
          currentSeason={season}
          seasons={seasons}
          onPrev={() => { const i = seasons.indexOf(season); if (i > 0) setSeason(seasons[i - 1]); }}
          onNext={() => { const i = seasons.indexOf(season); if (i < seasons.length - 1) setSeason(seasons[i + 1]); }}
          onAdd={handleAddSeason}
          onRename={() => {}}
          onSetActive={() => {}}
          onMenuOpen={isAdmin ? () => setAdminOpen(true) : undefined}
        />

        {/* Countdown circles — where season selector used to be */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <Countdown
            title="⏮ PREVIOUS MATCHDAY DEADLINE"
            startMs={yesterdayMidnight}
            durationMs={D48}
            accent="#FF1493"
          />
          <Countdown
            title="📅 CURRENT MATCHDAY DEADLINE"
            startMs={todayMidnight}
            durationMs={D48}
            accent="#a855f7"
          />
        </div>

        <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />
      </div>

      <div style={{ padding: "0 20px 40px" }}>
        {loading || tabLoading ? <LoadingSpinner /> : (
          <>
            {tab === "main" && tabMode === "table" && (
              <LeagueTable league={LEAGUE} season={season} teams={teams}
                onEdit={isAdmin ? setEditTeam : undefined}
                onDelete={isAdmin ? async k => { if (confirm("Delete?")) await remove(ref(db, `${PATHS.table(LEAGUE, season)}/${k}`)); } : undefined}
                results={results}
              />
            )}
            {tab === "main" && tabMode === "groupStage" && <GroupStageModal league={LEAGUE} season={season} />}
            {tab === "fixtures" && <FixturesList tournamentName="La Liga" />}
            {tab === "results" && (
              <>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <button
                    onClick={() => isAdmin ? setEditResult(null) : setSubmitOpen(true)}
                    style={{ background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", color: "#fff", padding: "14px 32px", borderRadius: 30, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: 2, cursor: "pointer", boxShadow: "0 4px 20px rgba(255,20,147,0.4)" }}
                  >
                    + ADD RESULT
                  </button>
                </div>
                <ResultsList league={LEAGUE} season={season}
                  onEdit={isAdmin ? r => setEditResult(r) : undefined}
                  onDelete={isAdmin ? handleDeleteResult : undefined}
                />
              </>
            )}
            {tab === "scorers" && (
              <TopScorers league={LEAGUE} season={season}
                onAdd={() => { setStatType("scorer"); setEditStat(null); }}
                onEdit={p => { setStatType("scorer"); setEditStat(p); }}
                onDelete={async k => await remove(ref(db, `${PATHS.topScorers(LEAGUE, season)}/${k}`))}
              />
            )}
            {tab === "assists" && (
              <TopAssistants league={LEAGUE} season={season}
                onAdd={() => { setStatType("assistant"); setEditStat(null); }}
                onEdit={p => { setStatType("assistant"); setEditStat(p); }}
                onDelete={async k => await remove(ref(db, `${PATHS.topAssistants(LEAGUE, season)}/${k}`))}
              />
            )}
            {tab === "pending" && isAdmin && (
              <div>
                <h2 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: 2, marginBottom: 24 }}>⏳ Pending Results</h2>
                {pendingToday.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ display: "inline-block", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 30, padding: "6px 20px", marginBottom: 16, color: "#22c55e", fontWeight: 700, fontSize: "0.85rem", letterSpacing: 1 }}>📅 TODAY — 48hr to review</div>
                    {pendingToday.map(r => <PendingCard key={r.key} r={r} section="today" onApprove={handleApprovePending} onNoContest={handleNoContest} onReject={handleRejectPending} />)}
                  </div>
                )}
                {pendingYesterday.length > 0 && (
                  <div>
                    <div style={{ display: "inline-block", background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)", borderRadius: 30, padding: "6px 20px", marginBottom: 16, color: "#FFB347", fontWeight: 700, fontSize: "0.85rem", letterSpacing: 1 }}>📅 YESTERDAY — 24hr to review</div>
                    {pendingYesterday.map(r => <PendingCard key={r.key} r={r} section="yesterday" onApprove={handleApprovePending} onNoContest={handleNoContest} onReject={handleRejectPending} />)}
                  </div>
                )}
                {pending.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.3)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: 12 }}>✅</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: 3 }}>No Pending Results</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Modal active={editTeam !== undefined} onClose={() => setEditTeam(undefined)}>
        <AddTeamModal league={LEAGUE} season={season} team={editTeam || null} onClose={() => setEditTeam(undefined)} />
      </Modal>
      <Modal active={editResult !== undefined} onClose={() => setEditResult(undefined)}>
        <AddResultModal league={LEAGUE} season={season} teams={teams} result={editResult} onClose={() => setEditResult(undefined)} />
      </Modal>
      <Modal active={editStat !== undefined} onClose={() => setEditStat(undefined)}>
        <StatPlayerModal league={LEAGUE} season={season} type={statType} teams={teams} player={editStat} onClose={() => setEditStat(undefined)} />
      </Modal>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)}>
        <LeagueAdminSettingsModal league={LEAGUE} season={season} teams={teams} onClose={() => setAdminOpen(false)} />
      </Modal>
      <Modal active={rulesOpen} onClose={() => setRulesOpen(false)}>
        <LeagueRulesModal league={LEAGUE} leagueName={LEAGUE_NAME} onClose={() => setRulesOpen(false)} />
      </Modal>
      <Modal active={submitOpen} onClose={() => setSubmitOpen(false)}>
        <SubmitResultModal league={LEAGUE} season={season} teams={teams} onClose={() => setSubmitOpen(false)} />
      </Modal>
    </div>
  );
}
