import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, set } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import SeasonSelector from "../components/SeasonSelector";
import TabBar from "../components/TabBar";
import LeagueTable from "../components/LeagueTable";
import ResultsList from "../components/ResultsList";
import TopScorers from "../components/TopScorers";
import TopAssistants from "../components/TopAssistants";
import WatchMatch from "../components/WatchMatch";
import Modal from "../components/Modal";
import AddTeamModal from "../modals/AddTeamModal";
import AddResultModal from "../modals/AddResultModal";
import StatPlayerModal from "../modals/StatPlayerModal";
import ManagerKeyModal from "../modals/ManagerKeyModal";
import LeagueRulesModal from "../modals/LeagueRulesModal";
import LeagueAdminSettingsModal from "../modals/LeagueAdminSettingsModal";
import ResultsHistoryModal from "../modals/ResultsHistoryModal";
import ManagerSubmitResultModal from "../modals/ManagerSubmitResultModal";
import LoadingSpinner from "../components/LoadingSpinner";
import LeagueHeadlineSlideshow from "../components/LeagueHeadlineSlideshow";
import { useManagerKey } from "../hooks/useManagerKey";

const LEAGUE = "bundesliga";
const LEAGUE_NAME = "Bundesliga";
const TABS = [
  { id: "table", label: "TABLE" },
  { id: "results", label: "RESULTS" },
  { id: "scorers", label: "TOP SCORERS" },
  { id: "assists", label: "ASSISTS" },
  { id: "watch", label: "WATCH" },
  { id: "records", label: "RECORDS" },
  { id: "champions", label: "CHAMPIONS" },
];

export default function BundesligaPage() {
  const { isAdmin, manager, teamIconsCache } = useAdmin();
  const { savedKey } = useManagerKey();
  const [season, setSeason] = useState("1");
  const [seasons, setSeasons] = useState(["1"]);
  const [tab, setTab] = useState("table");
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTeam, setEditTeam] = useState(undefined);
  const [editResult, setEditResult] = useState(undefined);
  const [editStat, setEditStat] = useState(undefined);
  const [statType, setStatType] = useState("scorer");
  const [adminOpen, setAdminOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    onValue(ref(db, `career_${LEAGUE}_settings`), snap => {
      const d = snap.val();
      if (d?.seasons) setSeasons(d.seasons.map(String));
    });
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
      onValue(ref(db, PATHS.topScorers(LEAGUE, season)), snap =>
        setScorers(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : [])),
      onValue(ref(db, PATHS.topAssistants(LEAGUE, season)), snap =>
        setAssistants(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : [])),
    ];
    return () => unsubs.forEach(u => u());
  }, [season]);

  async function handleAddSeason() {
    const n = prompt("New season number:");
    if (!n) return;
    const updated = [...seasons, n];
    setSeasons(updated);
    setSeason(n);
    await set(ref(db, `career_${LEAGUE}_settings/seasons`), updated);
  }

  function handleAddResults() {
    if (manager && manager.team) setSubmitOpen(true);
    else setManagerOpen(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar
        showPlusMenu
        onPlusAddResults={handleAddResults}
        onPlusLeagueRules={() => setRulesOpen(true)}
        onPlusAdminSettings={() => setAdminOpen(true)}
        onPlusResultsHistory={() => setHistoryOpen(true)}
      />
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
            {tab === "table" && <LeagueTable teams={teams} onEdit={setEditTeam} onDelete={async k => { if (confirm("Delete?")) await remove(ref(db, `${PATHS.table(LEAGUE, season)}/${k}`)); }} showLast5 results={results} />}
            {tab === "results" && <ResultsList results={results} onEdit={isAdmin ? setEditResult : () => {}} onDelete={isAdmin ? async k => { if (confirm("Delete?")) await remove(ref(db, `${PATHS.results(LEAGUE, season)}/${k}`)); } : () => {}} teamIconsCache={teamIconsCache} />}
            {tab === "scorers" && <TopScorers scorers={scorers} onAdd={() => { setStatType("scorer"); setEditStat(null); }} onEdit={p => { setStatType("scorer"); setEditStat(p); }} onDelete={async k => await remove(ref(db, `${PATHS.topScorers(LEAGUE, season)}/${k}`))} teamIconsCache={teamIconsCache} />}
            {tab === "assists" && <TopAssistants assistants={assistants} onAdd={() => { setStatType("assistant"); setEditStat(null); }} onEdit={p => { setStatType("assistant"); setEditStat(p); }} onDelete={async k => await remove(ref(db, `${PATHS.topAssistants(LEAGUE, season)}/${k}`))} teamIconsCache={teamIconsCache} />}
            {tab === "watch" && <WatchMatch league={LEAGUE} />}
            {tab === "records" && <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)", fontSize: "1.1rem" }}>Records coming soon…</div>}
            {tab === "champions" && <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)", fontSize: "1.1rem" }}>Champions history coming soon…</div>}
          </>
        )}
      </div>
      <Modal active={editTeam !== undefined} onClose={() => setEditTeam(undefined)}><AddTeamModal league={LEAGUE} season={season} team={editTeam} onClose={() => setEditTeam(undefined)} /></Modal>
      <Modal active={editResult !== undefined} onClose={() => setEditResult(undefined)}><AddResultModal league={LEAGUE} season={season} teams={teams} result={editResult} onClose={() => setEditResult(undefined)} /></Modal>
      <Modal active={editStat !== undefined} onClose={() => setEditStat(undefined)}><StatPlayerModal league={LEAGUE} season={season} type={statType} teams={teams} player={editStat} onClose={() => setEditStat(undefined)} /></Modal>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)}><LeagueAdminSettingsModal league={LEAGUE} season={season} teams={teams} onClose={() => setAdminOpen(false)} /></Modal>
      <Modal active={rulesOpen} onClose={() => setRulesOpen(false)}><LeagueRulesModal league={LEAGUE} leagueName={LEAGUE_NAME} onClose={() => setRulesOpen(false)} /></Modal>
      <Modal active={historyOpen} onClose={() => setHistoryOpen(false)} wide><ResultsHistoryModal league={LEAGUE} season={season} onClose={() => setHistoryOpen(false)} /></Modal>
      <Modal active={managerOpen} onClose={() => setManagerOpen(false)}><ManagerKeyModal onVerified={() => { setManagerOpen(false); setSubmitOpen(true); }} onClose={() => setManagerOpen(false)} /></Modal>
      <Modal active={submitOpen} onClose={() => setSubmitOpen(false)}><ManagerSubmitResultModal league={LEAGUE} season={season} teams={teams} onClose={() => setSubmitOpen(false)} /></Modal>
    </div>
  );
}
