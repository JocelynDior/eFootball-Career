import { useState, useEffect, useCallback } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, set, push, get } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import SeasonSelector from "../components/SeasonSelector";
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
import ManagerKeyModal from "../modals/ManagerKeyModal";
import LeagueRulesModal from "../modals/LeagueRulesModal";
import LeagueAdminSettingsModal from "../modals/LeagueAdminSettingsModal";
import SubmitResultModal from "../modals/SubmitResultModal";
import LoadingSpinner from "../components/LoadingSpinner";
import LeagueHeadlineSlideshow from "../components/LeagueHeadlineSlideshow";
import { applyResultToTable } from "../utils/tableLogic";

const LEAGUE = "laliga";
const LEAGUE_NAME = "La Liga";

function getSASTNow() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}
function getSASTDateStr(offsetDays = 0) {
  const d = getSASTNow();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

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

// Countdown display
function Countdown({ expiresAt }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function tick() {
      const diff = expiresAt - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const diff = expiresAt - Date.now();
  const color = diff < 3600000 ? "#ff6b6b" : diff < 7200000 ? "#FFB347" : "#22c55e";
  return <span style={{ color, fontWeight: 700, fontFamily: "monospace", fontSize: "0.85rem" }}>⏱ {remaining}</span>;
}

// Pending card for admin
function PendingCard({ r, section, onApprove, onNoContest, onReject }) {
  // section: "today" = 48h from submittedAt, "yesterday" = 24h from submittedAt
  const hours = section === "today" ? 48 : 24;
  const expiresAt = (r.submittedAt || Date.now()) + hours * 3600000;

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 16, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
            {r.homeTeam} <span style={{ color: "#FF1493" }}>{r.homeScore ?? "?"} — {r.awayScore ?? "?"}</span> {r.awayTeam}
          </div>
          {r.md && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: 2 }}>MD {r.md} · {r.date || ""}</div>}
          {r.forfeitType && r.forfeitType !== "none" && (
            <div style={{ color: "#FFB347", fontSize: "0.78rem", marginTop: 2 }}>🚫 {r.forfeitType}</div>
          )}
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: 4 }}>by {r.submittedBy || "manager"}</div>
        </div>
        <Countdown expiresAt={expiresAt} />
      </div>

      {/* Match image */}
      {r.matchImageUrl && (
        <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", maxHeight: 160 }}>
          <img src={r.matchImageUrl} alt="Match" style={{ width: "100%", height: 160, objectFit: "cover" }} />
        </div>
      )}

      {/* Scorers */}
      {(r.goalScorers?.home?.length > 0 || r.goalScorers?.away?.length > 0) && (
        <div style={{ marginBottom: 10, fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
          {r.goalScorers?.home?.map((s, i) => <span key={i} style={{ marginRight: 8 }}>⚽ {s.player} ({s.goals})</span>)}
          {r.goalScorers?.away?.map((s, i) => <span key={i} style={{ marginRight: 8 }}>⚽ {s.player} ({s.goals})</span>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => onApprove(r)} style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e", padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>✅ Approve</button>
        <button onClick={() => onNoContest(r)} style={{ background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.4)", color: "#FFB347", padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>🟡 No Contest</button>
        <button onClick={() => onReject(r)} style={{ background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", color: "#ff6b6b", padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>🗑️ Reject</button>
      </div>
    </div>
  );
}

export default function LaLigaPage() {
  const { isAdmin, manager } = useAdmin();
  const [season, setSeason] = useState("1");
  const [seasons, setSeasons] = useState(["1"]);
  const [tab, setTab] = useState("main");
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabMode, setTabMode] = useState("table");

  const [editTeam, setEditTeam] = useState(undefined);
  const [editResult, setEditResult] = useState(undefined);
  const [editStat, setEditStat] = useState(undefined);
  const [statType, setStatType] = useState("scorer");
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

  // Auto-expire pending results
  useEffect(() => {
    const interval = setInterval(async () => {
      const today = getSASTDateStr(0);
      const yesterday = getSASTDateStr(-1);
      for (const r of pending) {
        const submittedDate = r.submittedAt
          ? new Date(r.submittedAt + 2 * 3600000).toISOString().split("T")[0]
          : today;
        const hours = submittedDate === today ? 48 : 24;
        const expiresAt = (r.submittedAt || Date.now()) + hours * 3600000;
        if (Date.now() > expiresAt) {
          await remove(ref(db, `${PATHS.pendingResults(LEAGUE, season)}/${r.key}`));
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [pending, season]);

  async function handleAddSeason() {
    const n = prompt("New season number:");
    if (!n) return;
    const updated = [...seasons, n];
    setSeasons(updated);
    setSeason(n);
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
      await push(ref(db, PATHS.results(LEAGUE, season)), {
        homeTeam: r.homeTeam, awayTeam: r.awayTeam,
        homeScore: r.homeScore, awayScore: r.awayScore,
        forfeitType: r.forfeitType || "none",
        matchType: r.matchType || "normal",
        md: r.md, date: r.date,
        matchImageUrl: r.matchImageUrl || "",
        goalScorers: r.goalScorers || { home: [], away: [] },
        assists: r.assists || { home: [], away: [] },
        submittedBy: r.submittedBy, submittedAt: r.submittedAt,
        status: "approved", approvedAt: Date.now(),
      });
      await applyResultToTable(LEAGUE, season, r.homeTeam, r.awayTeam, r.homeScore, r.awayScore, r.forfeitType || "none");
      // Update top scorers/assists
      for (const s of (r.goalScorers?.home || [])) {
        await updateTopStat(LEAGUE, season, "top_scorers", s.player, s.goals || 1, s.imageUrl || "", r.homeTeam);
      }
      for (const s of (r.goalScorers?.away || [])) {
        await updateTopStat(LEAGUE, season, "top_scorers", s.player, s.goals || 1, s.imageUrl || "", r.awayTeam);
      }
      for (const a of (r.assists?.home || [])) {
        await updateTopStat(LEAGUE, season, "top_assistants", a.player, a.assists || 1, a.imageUrl || "", r.homeTeam);
      }
      for (const a of (r.assists?.away || [])) {
        await updateTopStat(LEAGUE, season, "top_assistants", a.player, a.assists || 1, a.imageUrl || "", r.awayTeam);
      }
      await remove(ref(db, `${PATHS.pendingResults(LEAGUE, season)}/${r.key}`));
    } catch (e) { alert("Error approving: " + e.message); }
  }

  async function handleNoContest(r) {
    if (!confirm(`Mark as No Contest (F-F): ${r.homeTeam} vs ${r.awayTeam}?`)) return;
    try {
      await push(ref(db, PATHS.results(LEAGUE, season)), {
        homeTeam: r.homeTeam, awayTeam: r.awayTeam,
        homeScore: 0, awayScore: 0,
        forfeitType: "no_contest", matchType: "forfeit",
        md: r.md, date: r.date,
        matchImageUrl: r.matchImageUrl || "",
        goalScorers: { home: [], away: [] },
        assists: { home: [], away: [] },
        submittedBy: r.submittedBy, submittedAt: r.submittedAt,
        status: "approved", approvedAt: Date.now(),
      });
      await applyResultToTable(LEAGUE, season, r.homeTeam, r.awayTeam, 0, 0, "no_contest");
      await remove(ref(db, `${PATHS.pendingResults(LEAGUE, season)}/${r.key}`));
    } catch (e) { alert("Error: " + e.message); }
  }

  async function handleRejectPending(r) {
    if (!confirm("Reject and delete this pending result?")) return;
    try { await remove(ref(db, `${PATHS.pendingResults(LEAGUE, season)}/${r.key}`)); }
    catch (e) { alert("Error: " + e.message); }
  }

  // Split pending into today/yesterday
  const todayStr = getSASTDateStr(0);
  const yesterdayStr = getSASTDateStr(-1);
  const pendingToday = pending.filter(r => {
    if (!r.submittedAt) return true;
    const d = new Date(r.submittedAt + 2 * 3600000).toISOString().split("T")[0];
    return d === todayStr;
  });
  const pendingYesterday = pending.filter(r => {
    if (!r.submittedAt) return false;
    const d = new Date(r.submittedAt + 2 * 3600000).toISOString().split("T")[0];
    return d === yesterdayStr;
  });

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
      <div style={{ padding: "28px 20px" }}>
        <SeasonSelector
          currentSeason={season} seasons={seasons}
          onPrev={() => { const i = seasons.indexOf(season); if (i > 0) setSeason(seasons[i - 1]); }}
          onNext={() => { const i = seasons.indexOf(season); if (i < seasons.length - 1) setSeason(seasons[i + 1]); }}
          onAdd={handleAddSeason} onRename={() => {}} onSetActive={() => {}}
        />
        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
        {loading ? <LoadingSpinner /> : (
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
                  <button onClick={() => isAdmin ? setEditResult(null) : setSubmitOpen(true)} style={{ background: "linear-gradient(135deg, #FF1493, #FF69B4)", border: "none", color: "#fff", padding: "14px 32px", borderRadius: 30, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: 2, cursor: "pointer", boxShadow: "0 4px 20px rgba(255,20,147,0.4)" }}>
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
                    <div style={{ display: "inline-block", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 30, padding: "6px 20px", marginBottom: 16, color: "#22c55e", fontWeight: 700, fontSize: "0.85rem", letterSpacing: 1 }}>
                      📅 TODAY — 48hr to review
                    </div>
                    {pendingToday.map(r => (
                      <PendingCard key={r.key} r={r} section="today"
                        onApprove={handleApprovePending}
                        onNoContest={handleNoContest}
                        onReject={handleRejectPending}
                      />
                    ))}
                  </div>
                )}

                {pendingYesterday.length > 0 && (
                  <div>
                    <div style={{ display: "inline-block", background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)", borderRadius: 30, padding: "6px 20px", marginBottom: 16, color: "#FFB347", fontWeight: 700, fontSize: "0.85rem", letterSpacing: 1 }}>
                      📅 YESTERDAY — 24hr to review
                    </div>
                    {pendingYesterday.map(r => (
                      <PendingCard key={r.key} r={r} section="yesterday"
                        onApprove={handleApprovePending}
                        onNoContest={handleNoContest}
                        onReject={handleRejectPending}
                      />
                    ))}
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
      <Modal active={submitOpen} onClose={() => setSubmitOpen(false)}>
        <SubmitResultModal league={LEAGUE} season={season} teams={teams} onClose={() => setSubmitOpen(false)} />
      </Modal>
    </div>
  );
}
