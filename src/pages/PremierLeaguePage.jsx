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
const LEAGUE_EMOJI = "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
const TABS = [
  { id: "table", label: "TABLE" },
  { id: "results", label: "RESULTS" },
  { id: "fixtures", label: "FIXTURES" },
  { id: "scorers", label: "TOP SCORERS" },
  { id: "assists", label: "ASSISTS" },
  { id: "watch", label: "WATCH" },
];

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

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
    onValue(ref(db, `career_${LEAGUE}_settings`), snap => {
      const d = snap.val();
      if (d?.activeSeason) setSeason(String(d.activeSeason));
      if (d?.seasons) setSeasons(d.seasons.map(String));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubs = [
      onValue(ref(db, PATHS.table(LEAGUE, season)), snap => { setTeams(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : []); setLoading(false); }),
      onValue(ref(db, PATHS.results(LEAGUE, season)), snap => setResults(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : [])),
      onValue(ref(db, PATHS.topScorers(LEAGUE, season)), snap => setScorers(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : [])),
      onValue(ref(db, PATHS.topAssistants(LEAGUE, season)), snap => setAssistants(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : [])),
    ];
    return () => unsubs.forEach(u => u());
  }, [season]);

  async function handleAddSeason() {
    const n = prompt("New season name:");
    if (!n) return;
    const updated = [...seasons, n];
    setSeasons(updated);
    setSeason(n);
    await set(ref(db, `career_${LEAGUE}_settings/seasons`), updated);
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 32px" }}>
        {/* League Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>{LEAGUE_EMOJI}</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "6px", color: "#FF1493", margin: 0, textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>{LEAGUE_NAME}</h1>
        </div>

        <SeasonSelector currentSeason={season} seasons={seasons}
          onPrev={() => { const i = seasons.indexOf(season); if (i > 0) setSeason(seasons[i - 1]); }}
          onNext={() => { const i = seasons.indexOf(season); if (i < seasons.length - 1) setSeason(seasons[i + 1]); }}
          onAdd={handleAddSeason} onRename={() => {}} onSetActive={() => {}} />

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
          <button onClick={() => setRulesOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "12px 24px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit" }}>📜 League Rules</button>
          {!isAdmin && (
            <button onClick={() => savedKey ? setManagerData(savedKey) : setManagerOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "12px 24px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit" }}>
              🔑 {savedKey ? "Submit Result" : "Manager Login"}
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={() => setAdminOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "12px 24px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit" }}>⚙️ Admin Settings</button>
              {tab === "results" && <button onClick={() => setEditResult(null)} style={{ background: "#FF1493", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit" }}>+ Add Result</button>}
              {tab === "table" && <button onClick={() => setEditTeam(null)} style={{ background: "#FF1493", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit" }}>+ Add Team</button>}
            </>
          )}
        </div>

        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />

        {loading ? <LoadingSpinner /> : (
          <>
            {tab === "table" && <LeagueTable teams={teams} onEdit={setEditTeam} onDelete={async k => { if (confirm("Delete?")) await remove(ref(db, `${PATHS.table(LEAGUE, season)}/${k}`)); }} showLast5 results={results} />}
            {tab === "results" && <ResultsList results={results} onEdit={setEditResult} onDelete={async k => { if (confirm("Delete?")) await remove(ref(db, `${PATHS.results(LEAGUE, season)}/${k}`)); }} teamIconsCache={teamIconsCache} />}
            {tab === "fixtures" && <FixturesList fixtures={fixtures} teamIconsCache={teamIconsCache} />}
            {tab === "scorers" && <TopScorers scorers={scorers} onAdd={() => { setStatType("scorer"); setEditStat(null); }} onEdit={p => { setStatType("scorer"); setEditStat(p); }} onDelete={async k => await remove(ref(db, `${PATHS.topScorers(LEAGUE, season)}/${k}`))} teamIconsCache={teamIconsCache} />}
            {tab === "assists" && <TopAssistants assistants={assistants} onAdd={() => { setStatType("assistant"); setEditStat(null); }} onEdit={p => { setStatType("assistant"); setEditStat(p); }} onDelete={async k => await remove(ref(db, `${PATHS.topAssistants(LEAGUE, season)}/${k}`))} teamIconsCache={teamIconsCache} />}
            {tab === "watch" && <WatchMatch league={LEAGUE} />}
          </>
        )}
      </div>

      <Modal active={editTeam !== undefined} onClose={() => setEditTeam(undefined)}><AddTeamModal league={LEAGUE} season={season} team={editTeam} onClose={() => setEditTeam(undefined)} /></Modal>
      <Modal active={editResult !== undefined} onClose={() => setEditResult(undefined)}><AddResultModal league={LEAGUE} season={season} teams={teams} result={editResult} onClose={() => setEditResult(undefined)} /></Modal>
      <Modal active={editStat !== undefined} onClose={() => setEditStat(undefined)}><StatPlayerModal league={LEAGUE} season={season} type={statType} teams={teams} player={editStat} onClose={() => setEditStat(undefined)} /></Modal>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)} wide><AdminSettingsModal league={LEAGUE} season={season} onClose={() => setAdminOpen(false)} backgroundVideo="" onSaveVideo={() => {}} onAddSeason={handleAddSeason} onRenameSeason={() => {}} onSetActiveSeason={() => {}} /></Modal>
      <Modal active={managerOpen} onClose={() => setManagerOpen(false)}><ManagerKeyModal onVerified={d => { setManagerData(d); setManagerOpen(false); }} onClose={() => setManagerOpen(false)} /></Modal>
      <Modal active={!!managerData && !managerOpen} onClose={() => setManagerData(null)}>{managerData && <ManagerActionHub managerData={managerData} league={LEAGUE} season={season} teams={teams} onClose={() => setManagerData(null)} />}</Modal>
      <Modal active={rulesOpen} onClose={() => setRulesOpen(false)}><LeagueRulesModal league={LEAGUE_NAME} onClose={() => setRulesOpen(false)} /></Modal>
    </div>
  );
}
