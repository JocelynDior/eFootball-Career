import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, set } from "firebase/database";
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

const LEAGUE = "bundesliga";
const LEAGUE_NAME = "Bundesliga";

export default function BundesligaPage() {
  const { isAdmin } = useAdmin();
  const [season, setSeason] = useState("1");
  const [seasons, setSeasons] = useState(["1"]);
  const [tab, setTab] = useState("main");
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabMode, setTabMode] = useState("table");

  const [editTeam, setEditTeam] = useState(undefined);
  const [editResult, setEditResult] = useState(undefined);
  const [editStat, setEditStat] = useState(undefined);
  const [statType, setStatType] = useState("scorer");
  const [adminOpen, setAdminOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
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
            {tab === "main" && tabMode === "table" && <LeagueTable league={LEAGUE} season={season} teams={teams} onEdit={isAdmin ? setEditTeam : undefined} onDelete={isAdmin ? async k => { if (confirm("Delete?")) await remove(ref(db, `${PATHS.table(LEAGUE, season)}/${k}`)); } : undefined} results={results} />}
            {tab === "main" && tabMode === "groupStage" && <GroupStageModal league={LEAGUE} season={season} />}
            {tab === "fixtures" && <FixturesList tournamentName="Bundesliga" />}
            {tab === "results" && <ResultsList league={LEAGUE} season={season} onEdit={isAdmin ? setEditResult : undefined} onDelete={isAdmin ? async k => { if (confirm("Delete?")) await remove(ref(db, `${PATHS.results(LEAGUE, season)}/${k}`)); } : undefined} />}
            {tab === "scorers" && <TopScorers league={LEAGUE} season={season} onAdd={() => { setStatType("scorer"); setEditStat(null); }} onEdit={p => { setStatType("scorer"); setEditStat(p); }} onDelete={async k => await remove(ref(db, `${PATHS.topScorers(LEAGUE, season)}/${k}`))} />}
            {tab === "assists" && <TopAssistants league={LEAGUE} season={season} onAdd={() => { setStatType("assistant"); setEditStat(null); }} onEdit={p => { setStatType("assistant"); setEditStat(p); }} onDelete={async k => await remove(ref(db, `${PATHS.topAssistants(LEAGUE, season)}/${k}`))} />}
          </>
        )}
      </div>
      <Modal active={editTeam !== undefined} onClose={() => setEditTeam(undefined)}><AddTeamModal league={LEAGUE} season={season} team={editTeam || null} onClose={() => setEditTeam(undefined)} /></Modal>
      <Modal active={editResult !== undefined} onClose={() => setEditResult(undefined)}><AddResultModal league={LEAGUE} season={season} teams={teams} result={editResult} onClose={() => setEditResult(undefined)} /></Modal>
      <Modal active={editStat !== undefined} onClose={() => setEditStat(undefined)}><StatPlayerModal league={LEAGUE} season={season} type={statType} teams={teams} player={editStat} onClose={() => setEditStat(undefined)} /></Modal>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)}><LeagueAdminSettingsModal league={LEAGUE} season={season} teams={teams} onClose={() => setAdminOpen(false)} /></Modal>
      <Modal active={rulesOpen} onClose={() => setRulesOpen(false)}><LeagueRulesModal league={LEAGUE} leagueName={LEAGUE_NAME} onClose={() => setRulesOpen(false)} /></Modal>
      <Modal active={managerOpen} onClose={() => setManagerOpen(false)}><ManagerKeyModal onVerified={() => { setManagerOpen(false); setSubmitOpen(true); }} onClose={() => setManagerOpen(false)} /></Modal>
      <Modal active={submitOpen} onClose={() => setSubmitOpen(false)}><SubmitResultModal league={LEAGUE} season={season} teams={teams} onClose={() => setSubmitOpen(false)} /></Modal>
    </div>
  );
}
