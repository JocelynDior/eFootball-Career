import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import WatchMatch from "../components/WatchMatch";
import Modal from "../components/Modal";
import AdminSettingsModal from "../modals/AdminSettingsModal";
import ResultsList from "../components/ResultsList";
import TabBar from "../components/TabBar";
import LoadingSpinner from "../components/LoadingSpinner";

const LEAGUE = "sc";
const LEAGUE_NAME = "UEFA Super Cup";
const TABS = [{ id: "results", label: "Results" }, { id: "watch", label: "Watch" }];

export default function SuperCupPage() {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [tab, setTab] = useState("results");
  const [results, setResults] = useState([]);
  const [backgroundVideo, setBackgroundVideo] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    onValue(ref(db, `career_${LEAGUE}_settings`), snap => { const d = snap.val(); if (d?.backgroundVideo) setBackgroundVideo(d.backgroundVideo); });
    const unsub = onValue(ref(db, `career_${LEAGUE}_results`), snap => { const d = snap.val(); setResults(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []); setLoading(false); });
    return () => unsub();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo videoUrl={backgroundVideo} />
      <Navbar title={LEAGUE_NAME} />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span style={{ fontSize: "4rem" }}>🥇</span>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", letterSpacing: "4px", color: "#FF1493", margin: "8px 0 0" }}>{LEAGUE_NAME}</h1>
        </div>
        {isAdmin && <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}><button onClick={() => setAdminOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>⚙️ Admin</button></div>}
        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
        {loading ? <LoadingSpinner /> : (
          <>
            {tab === "results" && <ResultsList results={results} onEdit={() => {}} onDelete={() => {}} teamIconsCache={teamIconsCache} />}
            {tab === "watch" && <WatchMatch league={LEAGUE} />}
          </>
        )}
      </div>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)} wide><AdminSettingsModal league={LEAGUE} season="1" onClose={() => setAdminOpen(false)} backgroundVideo={backgroundVideo} onSaveVideo={setBackgroundVideo} onAddSeason={() => {}} onRenameSeason={() => {}} onSetActiveSeason={() => {}} /></Modal>
    </div>
  );
}
