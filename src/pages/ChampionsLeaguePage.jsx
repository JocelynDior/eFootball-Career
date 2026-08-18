import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import WatchMatch from "../components/WatchMatch";
import Modal from "../components/Modal";
import ResultsList from "../components/ResultsList";
import TabBar from "../components/TabBar";
import LoadingSpinner from "../components/LoadingSpinner";
import LeagueHeadlineSlideshow from "../components/LeagueHeadlineSlideshow";
import LeagueAdminSettingsModal from "../modals/LeagueAdminSettingsModal";
import LeagueRulesModal from "../modals/LeagueRulesModal";
import ResultsHistoryModal from "../modals/ResultsHistoryModal";

const LEAGUE = "ucl";
const LEAGUE_NAME = "Champions League";
const TABS = [
  { id: "results", label: "RESULTS" },
  { id: "watch", label: "WATCH" },
  { id: "records", label: "RECORDS" },
  { id: "champions", label: "CHAMPIONS" },
];

export default function ChampionsLeaguePage() {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [tab, setTab] = useState("results");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${LEAGUE}_results`), snap => {
      const d = snap.val();
      setResults(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar
        showPlusMenu
        onPlusLeagueRules={() => setRulesOpen(true)}
        onPlusAdminSettings={() => setAdminOpen(true)}
        onPlusResultsHistory={() => setHistoryOpen(true)}
      />
      <LeagueHeadlineSlideshow league={LEAGUE} />
      <div style={{ padding: "28px 20px" }}>
        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
        {loading ? <LoadingSpinner /> : (
          <>
            {tab === "results" && <ResultsList results={results} onEdit={() => {}} onDelete={isAdmin ? async k => { if (confirm("Delete?")) await remove(ref(db, `career_${LEAGUE}_results/${k}`)); } : () => {}} teamIconsCache={teamIconsCache} />}
            {tab === "watch" && <WatchMatch league={LEAGUE} />}
            {tab === "records" && <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)", fontSize: "1.1rem" }}>Records coming soon…</div>}
            {tab === "champions" && <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)", fontSize: "1.1rem" }}>Champions history coming soon…</div>}
          </>
        )}
      </div>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)}><LeagueAdminSettingsModal league={LEAGUE} season="1" teams={[]} onClose={() => setAdminOpen(false)} /></Modal>
      <Modal active={rulesOpen} onClose={() => setRulesOpen(false)}><LeagueRulesModal league={LEAGUE} leagueName={LEAGUE_NAME} onClose={() => setRulesOpen(false)} /></Modal>
      <Modal active={historyOpen} onClose={() => setHistoryOpen(false)} wide><ResultsHistoryModal league={LEAGUE} season="1" onClose={() => setHistoryOpen(false)} /></Modal>
    </div>
  );
}
