import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, set, push, get } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import { useAutoNoContest } from "../hooks/useAutoNoContest";
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
import PendingFixturesModal from "../modals/PendingFixturesModal";
import LoadingSpinner from "../components/LoadingSpinner";
import LeagueHeadlineSlideshow from "../components/LeagueHeadlineSlideshow";
import LeagueTableHeader from "../components/LeagueTableHeader";
import MatchdayCountdowns from "../components/MatchdayCountdowns";
import { applyResultToTable } from "../utils/tableLogic";

const LEAGUE = "laliga";
const LEAGUE_NAME = "La Liga";
// Must match the tournament name substring in career_calendarEvents
const TOURNAMENT_NAME_KEY = "la liga";

function getSASTNow() { return new Date(Date.now() + 2 * 60 * 60 * 1000); }
function getSASTDateStr(offsetDays = 0) {
  const d = new Date(Date.now() + 2 * 3600000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
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

// ── Matchday number resolver ──────────────────────────────────────────────────
// Reads career_calendarEvents, finds all unique dates with fixtures for this
// tournament (sorted ascending), returns the 1-based index of the given dateStr.
function useMatchdayNumber(dateStr) {
  const [md, setMd] = useState(null);
  useEffect(() => {
    const unsub = onValue(ref(db, "career_calendarEvents"), snap => {
      const data = snap.val() || {};
      const dates = new Set();
      for (const [date, dayData] of Object.entries(data)) {
        for (const tourn of Object.values(dayData?.tournaments || {})) {
          if ((tourn?.name || "").toLowerCase().includes(TOURNAMENT_NAME_KEY)) {
            const hasFixtures = Object.values(tourn?.fixtures || {}).some(f => f?.home && f?.away);
            if (hasFixtures) dates.add(date);
          }
        }
      }
      const sorted = [...dates].sort();
      const idx = sorted.indexOf(dateStr);
      setMd(idx >= 0 ? idx + 1 : null);
    });
    return () => unsub();
  }, [dateStr]);
  return md;
}

// ── Countdown card ────────────────────────────────────────────────────────────
function Countdown({ title, startMs, durationMs, accent = "#FF1493", matchday }) {
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
      <div style={{ color: urgency, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.7rem", letterSpacing: 2, textAlign: "center" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[parts.h, parts.m, parts.s].map((val, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 88, height: 104, background: "rgba(0,0,20,0.8)", border: `3px solid ${urgency}66`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${urgency}22` }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", color: urgency, lineHeight: 1 }}>{val}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.1rem", letterSpacing: 1, marginTop: 6 }}>{["HRS", "MIN", "SEC"][i]}</span>
            </div>
            {i < 2 && <span style={{ color: urgency, fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", marginBottom: 28, opacity: 0.6 }}>:</span>}
          </div>
        ))}
      </div>
      {/* Matchday label */}
      <div style={{
        background: `${urgency}18`, border: `1px solid ${urgency}44`,
        borderRadius: 30, padding: "6px 20px",
        fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem",
        color: urgency, letterSpacing: 2,
      }}>
        {matchday !== null && matchday !== undefined ? `MATCHDAY ${matchday}` : "—"}
      </div>
      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{ width: `${parts.pct * 100}%`, height: "100%", background: urgency, borderRadius: 3, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

export default function LaLigaPage() {
  const { isAdmin } = useAdmin();
  const [season, setSeason] = useState("1");
  useAutoNoContest(LEAGUE, season);
  const [seasons, setSeasons] = useState(["1"]);
  const [tab, setTab] = useState("main");
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabMode, setTabMode] = useState("table");

  const [editTeam, setEditTeam] = useState(undefined);
  const [editResult, setEditResult] = useState(undefined);
  const [editStat, setEditStat] = useState(undefined);
  const [statType, setStatType] = useState("scorer");
  const [adminOpen, setAdminOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  const todayStr = getSASTDateStr(0);
  const yesterdayStr = getSASTDateStr(-1);
  const todayMd = useMatchdayNumber(todayStr);
  const yesterdayMd = useMatchdayNumber(yesterdayStr);

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
  ];

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar leagueMenuProps={{ league: LEAGUE, season, teams, onEditTeamIcon: () => setEditTeam(null), onAddPlayerIcon: () => { setStatType("scorer"); setEditStat(null); } }} />
      <LeagueHeadlineSlideshow league={LEAGUE} />

      <div style={{ padding: "20px 20px 0" }}>
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

        {/* Countdown blocks with matchday labels */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <Countdown
            title="⏮ PREVIOUS MATCHDAY DEADLINE"
            startMs={yesterdayMidnight}
            durationMs={D48}
            accent="#FF1493"
            matchday={yesterdayMd}
          />
          <Countdown
            title="📅 CURRENT MATCHDAY DEADLINE"
            startMs={todayMidnight}
            durationMs={D48}
            accent="#a855f7"
            matchday={todayMd}
          />
        </div>

        {/* Admin pending button */}
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button
              onClick={() => setPendingOpen(true)}
              style={{
                background: pending.length > 0 ? "rgba(255,20,147,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${pending.length > 0 ? "rgba(255,20,147,0.5)" : "rgba(255,255,255,0.15)"}`,
                color: pending.length > 0 ? "#FF1493" : "rgba(255,255,255,0.5)",
                padding: "9px 20px", borderRadius: 30, cursor: "pointer",
                fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: 1,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              ⏳ PENDING RESULTS
              {pending.length > 0 && (
                <span style={{ background: "#FF1493", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, fontFamily: "inherit" }}>
                  {pending.length}
                </span>
              )}
            </button>
          </div>
        )}

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
          </>
        )}
      </div>

      {/* Modals */}
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
      <Modal active={pendingOpen} onClose={() => setPendingOpen(false)}>
        <PendingFixturesModal league={LEAGUE} season={season} onClose={() => setPendingOpen(false)} />
      </Modal>
    </div>
  );
}
