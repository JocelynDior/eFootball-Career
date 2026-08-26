import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import TabBar from "../components/TabBar";
import BackgroundVideo from "../components/BackgroundVideo";
import LeagueTable from "../components/LeagueTable";
import GroupStageModal from "../modals/GroupStageModal";
import FixturesList from "../components/FixturesList";
import ResultsList from "../components/ResultsList";
import TopScorers from "../components/TopScorers";
import TopAssistants from "../components/TopAssistants";
import AddTeamModal from "../modals/AddTeamModal";
import StatPlayerModal from "../modals/StatPlayerModal";
import LeagueAdminSettingsModal from "../modals/LeagueAdminSettingsModal";
import { uploadToImgBB } from "../utils/imgUpload";
import LoadingSpinner from "../components/LoadingSpinner";

// ─── Constants ───────────────────────────────────────────────────────────────
const LEAGUE      = "tokyo";
const LEAGUE_NAME = "TOKYO LEAGUE";
const SEASON      = "1";

const SLIDESHOW_PATH = `career_${LEAGUE}/slideshow`;
const SETTINGS_PATH  = `career_${LEAGUE}/seasons/season_${SEASON}/settings`;

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

// ─── Slideshow (kept from original) ──────────────────────────────────────────
function Slideshow({ images }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length]);

  if (!images.length) return (
    <div style={{ width: "100%", aspectRatio: "16/7", background: "rgba(255,20,147,0.04)", border: "1px dashed rgba(255,20,147,0.2)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1rem" }}>No slideshow images</span>
    </div>
  );

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden", borderRadius: "20px", marginBottom: 28 }}>
      {images.map((url, i) => (
        <img key={i} src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: i === idx ? 1 : 0, transition: "opacity 0.7s ease" }} />
      ))}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {images.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{ width: 10, height: 10, borderRadius: "50%", background: i === idx ? "#FF1493" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Slideshow Manager (kept from original) ───────────────────────────────────
function SlideshowManager({ onClose }) {
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, SLIDESHOW_PATH), snap => setImages(snap.val() || []));
    return () => unsub();
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToImgBB(file);
      const updated = [...images, url];
      await set(ref(db, SLIDESHOW_PATH), updated);
      setImages(updated);
      setStatus("✅ Slide added!");
      setFile(null);
    } catch (e) { setStatus("❌ Failed: " + e.message); }
    setUploading(false);
  }

  async function handleDelete(i) {
    const updated = images.filter((_, idx) => idx !== i);
    await set(ref(db, SLIDESHOW_PATH), updated);
    setImages(updated);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>🎞️ Manage Slideshow</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {images.map((url, i) => (
          <div key={i} style={{ position: "relative", width: 120, height: 80, borderRadius: 8, overflow: "hidden" }}>
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button onClick={() => handleDelete(i)} style={{ position: "absolute", top: 4, right: 4, background: "#cc3333", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ))}
      </div>
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} style={{ marginBottom: 12, color: "#fff" }} />
      {status && <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", marginBottom: 10 }}>{status}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleUpload} disabled={uploading || !file} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", opacity: uploading || !file ? 0.6 : 1 }}>{uploading ? "Uploading..." : "Add Slide"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ─── Team Logo Modal (kept from original) ────────────────────────────────────
function TeamLogoModal({ onClose }) {
  const { updateTeamIcon } = useAdmin();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${LEAGUE}/seasons/season_${SEASON}/table`), snap => {
      const d = snap.val();
      setTeams(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => a.name.localeCompare(b.name)) : []);
    });
    return () => unsub();
  }, []);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
    setStatus("");
  }

  async function handleUpload() {
    if (!selectedTeam) { setStatus("Please select a team first."); return; }
    if (!file) { setStatus("Please choose an image first."); return; }
    setUploading(true);
    try {
      const url = await uploadToImgBB(file);
      await set(ref(db, `${PATHS.teamIcons}/${selectedTeam}`), url);
      updateTeamIcon(selectedTeam, url);
      setStatus("✅ Logo saved for " + selectedTeam);
      setFile(null); setPreview(""); setSelectedTeam(null);
    } catch (e) { setStatus("❌ Upload failed: " + e.message); }
    setUploading(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>🖼️ Add Team Logo</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {teams.map(t => (
          <button key={t.id} onClick={() => setSelectedTeam(t.name)} style={{ padding: "8px 16px", background: selectedTeam === t.name ? "#FF1493" : "rgba(255,20,147,0.1)", border: `1px solid ${selectedTeam === t.name ? "#FF1493" : "rgba(255,20,147,0.3)"}`, borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}>{t.name}</button>
        ))}
      </div>
      {preview && <img src={preview} alt="" style={{ width: 100, height: 100, objectFit: "contain", borderRadius: 12, marginBottom: 12 }} />}
      <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginBottom: 12, color: "#fff" }} />
      {status && <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", marginBottom: 10 }}>{status}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleUpload} disabled={uploading} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", opacity: uploading ? 0.6 : 1 }}>{uploading ? "Uploading..." : "Upload Logo"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TokyoPage() {
  const { isAdmin, teamIconsCache, updateTeamIcon } = useAdmin();
  const [tab, setTab] = useState("main");
  const [tabMode, setTabMode] = useState("table");
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editTeam, setEditTeam] = useState(undefined);
  const [editStat, setEditStat] = useState(undefined);
  const [statType, setStatType] = useState("scorer");
  const [adminOpen, setAdminOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [teamLogoOpen, setTeamLogoOpen] = useState(false);

  // Load settings
  useEffect(() => {
    const unsub = onValue(ref(db, `career_${LEAGUE}_settings`), snap => {
      const d = snap.val() || {};
      setTabMode(d.tabMode || "table");
    });
    return () => unsub();
  }, []);

  // Load slideshow
  useEffect(() => {
    const unsub = onValue(ref(db, SLIDESHOW_PATH), snap => setSlideshowImages(snap.val() || []));
    return () => unsub();
  }, []);

  // Load table & results
  useEffect(() => {
    setLoading(true);
    const unsubs = [
      onValue(ref(db, PATHS.table(LEAGUE, SEASON)), snap => {
        setTeams(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : []);
        setLoading(false);
      }),
      onValue(ref(db, PATHS.results(LEAGUE, SEASON)), snap =>
        setResults(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })) : [])),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Sync team logos into cache
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.teamIcons), snap => {
      const logos = snap.val() || {};
      Object.entries(logos).forEach(([teamName, url]) => updateTeamIcon(teamName, url));
    });
    return () => unsub();
  }, []);

  const TABS = [
    { id: "main", label: tabMode === "groupStage" ? "GROUP STAGE" : "LEAGUE PHASE" },
    { id: "fixtures", label: "FIXTURES" },
    { id: "results", label: "RESULTS" },
    { id: "scorers", label: "TOP SCORERS" },
    { id: "assists", label: "TOP ASSISTS" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar
        leagueMenuProps={{
          league: LEAGUE,
          season: SEASON,
          teams,
          onEditTeamIcon: () => setTeamLogoOpen(true),
          onAddPlayerIcon: () => { setStatType("scorer"); setEditStat(null); },
        }}
      />

      <div style={{ padding: "28px 24px 80px", maxWidth: "100%" }}>
        <Slideshow images={slideshowImages} />

        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />

        {loading ? <LoadingSpinner /> : (
          <>
            {tab === "main" && tabMode === "table" && (
              <LeagueTable
                league={LEAGUE} season={SEASON}
                teams={teams}
                onEdit={isAdmin ? setEditTeam : undefined}
                onDelete={isAdmin ? async k => { if (confirm("Delete this team?")) await remove(ref(db, `${PATHS.table(LEAGUE, SEASON)}/${k}`)); } : undefined}
                results={results}
              />
            )}
            {tab === "main" && tabMode === "groupStage" && (
              <GroupStageModal league={LEAGUE} season={SEASON} />
            )}
            {tab === "fixtures" && <FixturesList tournamentName="Tokyo Pre Season" />}
            {tab === "results" && (
              <ResultsList
                league={LEAGUE} season={SEASON}
                onDelete={isAdmin ? async k => { if (confirm("Delete?")) await remove(ref(db, `${PATHS.results(LEAGUE, SEASON)}/${k}`)); } : undefined}
              />
            )}
            {tab === "scorers" && (
              <TopScorers
                league={LEAGUE} season={SEASON}
                onAdd={() => { setStatType("scorer"); setEditStat(null); }}
                onEdit={p => { setStatType("scorer"); setEditStat(p); }}
                onDelete={async k => await remove(ref(db, `${PATHS.topScorers(LEAGUE, SEASON)}/${k}`))}
              />
            )}
            {tab === "assists" && (
              <TopAssistants
                league={LEAGUE} season={SEASON}
                onAdd={() => { setStatType("assistant"); setEditStat(null); }}
                onEdit={p => { setStatType("assistant"); setEditStat(p); }}
                onDelete={async k => await remove(ref(db, `${PATHS.topAssistants(LEAGUE, SEASON)}/${k}`))}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <Modal active={editTeam !== undefined} onClose={() => setEditTeam(undefined)}>
        <AddTeamModal league={LEAGUE} season={SEASON} team={editTeam || null} onClose={() => setEditTeam(undefined)} />
      </Modal>
      <Modal active={editStat !== undefined} onClose={() => setEditStat(undefined)}>
        <StatPlayerModal league={LEAGUE} season={SEASON} type={statType} teams={teams} player={editStat} onClose={() => setEditStat(undefined)} />
      </Modal>
      <Modal active={adminOpen} onClose={() => setAdminOpen(false)}>
        <LeagueAdminSettingsModal league={LEAGUE} season={SEASON} teams={teams} onClose={() => setAdminOpen(false)} />
      </Modal>
      <Modal active={slideshowOpen} onClose={() => setSlideshowOpen(false)} wide>
        <SlideshowManager onClose={() => setSlideshowOpen(false)} />
      </Modal>
      <Modal active={teamLogoOpen} onClose={() => setTeamLogoOpen(false)}>
        <TeamLogoModal onClose={() => setTeamLogoOpen(false)} />
      </Modal>

      <style>{`
        select option { background: #000033; color: #fff; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1); }
      `}</style>
    </div>
  );
}
