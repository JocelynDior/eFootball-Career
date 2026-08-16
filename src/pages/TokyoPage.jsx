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

const LEAGUE = "tokyo";
const LEAGUE_NAME = "Tokyo Off Season";
const LEAGUE_EMOJI = "🗼";
const TABS = [{ id: "results", label: "RESULTS" }, { id: "watch", label: "WATCH" }];

export default function TokyoPage() {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [tab, setTab] = useState("results");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${LEAGUE}_results`), snap => { const d = snap.val(); setResults(d ? Object.entries(d).map(([k, v]) => ({ key: k, ...v })) : []); setLoading(false); });
    return () => unsub();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "4rem", marginBottom: "8px" }}>{LEAGUE_EMOJI}</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.5rem", letterSpacing: "6px", color: "#FF1493", margin: 0, textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>{LEAGUE_NAME}</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginTop: "8px" }}>Off Season Tournament</p>
        </div>
        {isAdmin && <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}><button onClick={() => setAdminOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "12px 24px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit" }}>⚙️ Admin</button></div>}
        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
        {loading ? <LoadingSpinner /> : (
          <>
            {tab === "results" && <ResultsList results={results} onEdit={() => {}} onDelete={() => {}} teamIconsCache={teamIconsCache} />}
            {tab === "watch" && <WatchMatch league={LEAGUE} />}
          </>
        )}
      </div>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)} wide><AdminSettingsModal league={LEAGUE} season="1" onClose={() => setAdminOpen(false)} backgroundVideo="" onSaveVideo={() => {}} onAddSeason={() => {}} onRenameSeason={() => {}} onSetActiveSeason={() => {}} /></Modal>
    </div>
  );
}
