import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, remove, get, set } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import SeasonSelector from "../components/SeasonSelector";
import TabBar from "../components/TabBar";
import LeagueTable from "../components/LeagueTable";
import ResultsList from "../components/ResultsList";
import FixturesList from "../components/FixturesList";
import TopScorers from "../components/TopScorers";
import TopAssistants from "../components/TopAssistants";
import WatchMatch from "../components/WatchMatch";
import Modal from "../components/Modal";
import AddTeamModal from "../modals/AddTeamModal";
import AddResultModal from "../modals/AddResultModal";
import StatPlayerModal from "../modals/StatPlayerModal";
import AdminSettingsModal from "../modals/AdminSettingsModal";
import ManagerKeyModal from "../modals/ManagerKeyModal";
import ManagerActionHub from "../modals/ManagerActionHub";
import LeagueRulesModal from "../modals/LeagueRulesModal";
import LoadingSpinner from "../components/LoadingSpinner";
import { useManagerKey } from "../hooks/useManagerKey";

const LEAGUE = "premier";
const LEAGUE_NAME = "Premier League";

const TABS = [
  { id: "table", label: "Table" },
  { id: "results", label: "Results" },
  { id: "fixtures", label: "Fixtures" },
  { id: "scorers", label: "Top Scorers" },
  { id: "assists", label: "Assists" },
  { id: "watch", label: "Watch" },
];

export default function PremierLeaguePage() {
  const { isAdmin, teamIconsCache } = useAdmin();
  const { savedKey } = useManagerKey();
  const [season, setSeason] = useState("1");
  const [seasons, setSeasons] = useState(["1"]);
  const [tab, setTab] = useState("table");
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [backgroundVideo, setBackgroundVideo] = useState("");
  const [loading, setLoading] = useState(true);
  const [editTeam, setEditTeam] = useState(undefined);
  const [editResult, setEditResult] = useState(undefined);
  const [editStat, setEditStat] = useState(undefined);
  const [statType, setStatType] = useState("scorer");
  const [adminOpen, setAdminOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerData, setManagerData] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    const settingsRef = ref(db, `career_${LEAGUE}_settings`);
    onValue(settingsRef, snap => {
      const d = snap.val();
      if (d?.backgroundVideo) setBackgroundVideo(d.backgroundVideo);
      if (d?.activeSeason) setSeason(String(d.activeSeason));
      if (d?.seasons) setSeasons(d.seasons.map(String));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const refs = [
      [PATHS.table(LEAGUE, season), d => setTeams(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : [])],
      [PATHS.results(LEAGUE, season), d => setResults(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : [])],
      [`career_fixtures`, d => setFixtures(d ? Object.values(d).filter(f => f.league === LEAGUE && f.season === season) : [])],
      [PATHS.topScorers(LEAGUE, season), d => setScorers(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : [])],
      [PATHS.topAssistants(LEAGUE, season), d => setAssistants(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : [])],
    ];
    const unsubs = refs.map(([path, setter]) => onValue(ref(db, path), snap => { setter(snap.val()); setLoading(false); }));
    return () => unsubs.forEach(u => u());
  }, [season]);

  async function handleDeleteTeam(key) {
    if (!confirm("Delete this team?")) return;
    await remove(ref(db, `${PATHS.table(LEAGUE, season)}/${key}`));
  }

  async function handleDeleteResult(key) {
    if (!confirm("Delete this result?")) return;
    await remove(ref(db, `${PATHS.results(LEAGUE, season)}/${key}`));
  }

  async function handleAddSeason() {
    const name = prompt("New season name:");
    if (!name) return;
    const updated = [...seasons, name];
    setSeasons(updated);
    setSeason(name);
    await set(ref(db, `career_${LEAGUE}_settings/seasons`), updated);
  }

  function handleManagerVerified(data) { setManagerData(data); setManagerOpen(false); }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo videoUrl={backgroundVideo} />
      <Navbar title={LEAGUE_NAME} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 16px" }}>
        <SeasonSelector currentSeason={season} seasons={seasons}
          onPrev={() => { const i = seasons.indexOf(season); if (i > 0) setSeason(seasons[i - 1]); }}
          onNext={() => { const i = seasons.indexOf(season); if (i < seasons.length - 1) setSeason(seasons[i + 1]); }}
          onAdd={handleAddSeason} onRename={() => {}} onSetActive={() => {}} />

        <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
          <button onClick={() => setRulesOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit" }}>📜 Rules</button>
          {!isAdmin && <button onClick={() => savedKey ? setManagerData(savedKey) : setManagerOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit" }}>🔑 {savedKey ? "Submit Result" : "Manager Login"}</button>}
          {isAdmin && <button onClick={() => setAdminOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit" }}>⚙️ Admin</button>}
          {isAdmin && tab === "results" && <button onClick={() => setEditResult(null)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit" }}>+ Add Result</button>}
        </div>

        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />

        {loading ? <LoadingSpinner /> : (
          <>
            {tab === "table" && <LeagueTable teams={teams} onEdit={setEditTeam} onDelete={handleDeleteTeam} showLast5 results={results} />}
            {tab === "results" && <ResultsList results={results} onEdit={setEditResult} onDelete={handleDeleteResult} teamIconsCache={teamIconsCache} />}
            {tab === "fixtures" && <FixturesList fixtures={fixtures} teamIconsCache={teamIconsCache} />}
            {tab === "scorers" && <TopScorers scorers={scorers} onAdd={() => { setStatType("scorer"); setEditStat(null); }} onEdit={p => { setStatType("scorer"); setEditStat(p); }} onDelete={async k => { await remove(ref(db, `${PATHS.topScorers(LEAGUE, season)}/${k}`)); }} teamIconsCache={teamIconsCache} />}
            {tab === "assists" && <TopAssistants assistants={assistants} onAdd={() => { setStatType("assistant"); setEditStat(null); }} onEdit={p => { setStatType("assistant"); setEditStat(p); }} onDelete={async k => { await remove(ref(db, `${PATHS.topAssistants(LEAGUE, season)}/${k}`)); }} teamIconsCache={teamIconsCache} />}
            {tab === "watch" && <WatchMatch league={LEAGUE} />}
          </>
        )}
      </div>

      <Modal active={editTeam !== undefined} onClose={() => setEditTeam(undefined)}>
        <AddTeamModal league={LEAGUE} season={season} team={editTeam} onClose={() => setEditTeam(undefined)} />
      </Modal>
      <Modal active={editResult !== undefined} onClose={() => setEditResult(undefined)}>
        <AddResultModal league={LEAGUE} season={season} teams={teams} result={editResult} onClose={() => setEditResult(undefined)} />
      </Modal>
      <Modal active={editStat !== undefined} onClose={() => setEditStat(undefined)}>
        <StatPlayerModal league={LEAGUE} season={season} type={statType} teams={teams} player={editStat} onClose={() => setEditStat(undefined)} />
      </Modal>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)} wide>
        <AdminSettingsModal league={LEAGUE} season={season} onClose={() => setAdminOpen(false)} backgroundVideo={backgroundVideo} onSaveVideo={setBackgroundVideo} onAddSeason={handleAddSeason} onRenameSeason={() => {}} onSetActiveSeason={() => {}} />
      </Modal>
      <Modal active={managerOpen} onClose={() => setManagerOpen(false)}>
        <ManagerKeyModal onVerified={handleManagerVerified} onClose={() => setManagerOpen(false)} />
      </Modal>
      <Modal active={!!managerData && !managerOpen} onClose={() => setManagerData(null)}>
        {managerData && <ManagerActionHub managerData={managerData} league={LEAGUE} season={season} teams={teams} onClose={() => setManagerData(null)} />}
      </Modal>
      <Modal active={rulesOpen} onClose={() => setRulesOpen(false)}>
        <LeagueRulesModal league={LEAGUE_NAME} onClose={() => setRulesOpen(false)} />
      </Modal>
    </div>
  );
}
