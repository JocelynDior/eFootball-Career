import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { db, PATHS } from "../firebase";
import { ref, set, push, remove, onValue, get } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";
import SideMenu from "./SideMenu";
import LeagueGrid from "./LeagueGrid";
import Modal from "./Modal";
import AddPlayerModal from "../modals/AddPlayerModal";
import ResultsHistoryModal from "../modals/ResultsHistoryModal";
import PendingFixturesModal from "../modals/PendingFixturesModal";
import AddTeamModal from "../modals/AddTeamModal";

function getSASTDateString() {
  const formatter = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return formatter.format(new Date());
}

const TRANSFER_TABS = ["topTargets", "listed", "scouts", "signings", "auction"];
const TAB_LABELS = { topTargets: "Top Targets", listed: "Listed", scouts: "Scouts", signings: "Signings", auction: "Auction" };

export default function Navbar({ tokyoMenuItems, leagueMenuProps } = {}) {
  // leagueMenuProps: { league, season, teams, onAddTeam, onEditTeamIcon, onAddPlayerIcon }
  const location = useLocation();
  const { isAdmin, teamIconsCache, updateTeamIcon } = useAdmin();
  const isTransferPage = location.pathname === "/transfer-market";

  const [menuOpen, setMenuOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const plusRef = useRef(null);

  // Install prompt state
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Modals
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [addImageOpen, setAddImageOpen] = useState(false);
  const [addIconOpen, setAddIconOpen] = useState(false);
  const [deletePlayerOpen, setDeletePlayerOpen] = useState(false);
  const [addCountdownOpen, setAddCountdownOpen] = useState(false);
  const [auctionDeadlineOpen, setAuctionDeadlineOpen] = useState(false);
  const [addSlideOpen, setAddSlideOpen] = useState(false);

  // League page modals
  const [resultsHistoryOpen, setResultsHistoryOpen] = useState(false);
  const [pendingResultsOpen, setPendingResultsOpen] = useState(false);
  const [addLeagueTeamOpen, setAddLeagueTeamOpen] = useState(false);

  // Video form
  const [videoUrl, setVideoUrl] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);

  // Image form
  const [players, setPlayers] = useState({});
  const [selectedPlayerTab, setSelectedPlayerTab] = useState("topTargets");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [savingImage, setSavingImage] = useState(false);

  // Team icon form
  const [iconClubName, setIconClubName] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState("");
  const [savingIcon, setSavingIcon] = useState(false);

  // Delete form
  const [deleteTab, setDeleteTab] = useState("topTargets");
  const [deletePlayerId, setDeletePlayerId] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Countdown form
  const [cdName, setCdName] = useState("");
  const [cdDate, setCdDate] = useState("");
  const [cdTime, setCdTime] = useState("");
  const [savingCd, setSavingCd] = useState(false);
  const [countdowns, setCountdowns] = useState([]);

  // Auction Deadline
  const [auctionDeadlineDate, setAuctionDeadlineDate] = useState("");
  const [auctionDeadlineTime, setAuctionDeadlineTime] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [currentDeadline, setCurrentDeadline] = useState(null);

  // Transfer Slides
  const [slideFile, setSlideFile] = useState(null);
  const [slidePreview, setSlidePreview] = useState("");
  const [slideCaption, setSlideCaption] = useState("");
  const [savingSlide, setSavingSlide] = useState(false);
  const [slides, setSlides] = useState([]);

  // ── Install prompt handler ──────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      localStorage.setItem("app-installed", "true");
    };

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    } else if (localStorage.getItem("app-installed") === "true") {
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handlePromptInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      localStorage.setItem("app-installed", "true");
    }
    setInstallPrompt(null);
  }

  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAdmin || !isTransferPage) return;
    onValue(ref(db, "career_global_settings/auctionDeadline"), snap => {
      setCurrentDeadline(snap.val() ? Number(snap.val()) : null);
    });
    onValue(ref(db, "career_global_settings/transferSlides"), snap => {
      const data = snap.val();
      setSlides(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
    });
  }, [isAdmin, isTransferPage]);

  useEffect(() => {
    if (!isAdmin || !isTransferPage) return;
    TRANSFER_TABS.forEach(t => {
      onValue(ref(db, `${PATHS.transfers}/${t}`), snap => {
        const data = snap.val();
        setPlayers(prev => ({ ...prev, [t]: data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : [] }));
      });
    });
    onValue(ref(db, `${PATHS.globalSettings}/transferCountdowns`), snap => {
      const data = snap.val();
      setCountdowns(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
    });
  }, [isAdmin, isTransferPage]);

  useEffect(() => {
    function handleClick(e) {
      if (plusRef.current && !plusRef.current.contains(e.target)) setPlusOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSaveVideo() {
    if (!videoUrl.trim()) return;
    setSavingVideo(true);
    await set(ref(db, `${PATHS.globalSettings}/transferHeadlineVideo`), videoUrl.trim());
    setSavingVideo(false); setAddVideoOpen(false); setVideoUrl("");
  }

  async function handleSaveImage() {
    if (!imageFile || !selectedPlayerId) return;
    setSavingImage(true);
    try {
      const url = await uploadToImgBB(imageFile);
      await set(ref(db, `${PATHS.transfers}/${selectedPlayerTab}/${selectedPlayerId}/imageUrl`), url);
      setAddImageOpen(false); setImageFile(null); setImagePreview(""); setSelectedPlayerId("");
    } catch (e) {}
    setSavingImage(false);
  }

  async function handleSaveIcon() {
    if (!iconFile || !iconClubName.trim()) return;
    setSavingIcon(true);
    try {
      const url = await uploadToImgBB(iconFile);
      await set(ref(db, `${PATHS.teamIcons}/${iconClubName.trim()}`), url);
      updateTeamIcon(iconClubName.trim(), url);
      setAddIconOpen(false); setIconFile(null); setIconPreview(""); setIconClubName("");
    } catch (e) {}
    setSavingIcon(false);
  }

  async function handleDeletePlayer() {
    if (!deletePlayerId) return;
    if (!window.confirm("Delete this player?")) return;
    setDeleting(true);
    await remove(ref(db, `${PATHS.transfers}/${deleteTab}/${deletePlayerId}`));
    setDeleting(false); setDeletePlayerId(""); setDeletePlayerOpen(false);
  }

  async function handleAddCountdown() {
    if (!cdName || !cdDate) return;
    setSavingCd(true);
    const target = new Date(`${cdDate}T${cdTime || "00:00"}`).getTime();
    await push(ref(db, `${PATHS.globalSettings}/transferCountdowns`), { name: cdName, target, createdAt: Date.now() });
    setCdName(""); setCdDate(""); setCdTime("");
    setSavingCd(false);
  }

  async function handleDeleteCountdown(id) {
    await remove(ref(db, `${PATHS.globalSettings}/transferCountdowns/${id}`));
  }

  async function handleSaveDeadline() {
    if (!auctionDeadlineDate) return;
    setSavingDeadline(true);
    const target = new Date(`${auctionDeadlineDate}T${auctionDeadlineTime || "00:00"}`).getTime();
    await set(ref(db, "career_global_settings/auctionDeadline"), target);
    setSavingDeadline(false); setAuctionDeadlineOpen(false); setAuctionDeadlineDate(""); setAuctionDeadlineTime("");
  }

  async function handleResetDeadline() {
    await set(ref(db, "career_global_settings/auctionDeadline"), null);
    setCurrentDeadline(null);
  }

  async function handleSaveSlide() {
    if (!slideFile) return;
    setSavingSlide(true);
    try {
      const url = await uploadToImgBB(slideFile);
      await push(ref(db, "career_global_settings/transferSlides"), {
        imageUrl: url,
        caption: slideCaption.trim(),
        createdAt: Date.now(),
      });
      setAddSlideOpen(false); setSlideFile(null); setSlidePreview(""); setSlideCaption("");
    } catch (e) {}
    setSavingSlide(false);
  }

  async function handleDeleteSlide(id) {
    await remove(ref(db, `career_global_settings/transferSlides/${id}`));
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.4)",
    borderRadius: "12px", color: "#fff",
    fontFamily: "inherit", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box", marginBottom: "12px",
  };

  const dropdownItems = [
    { icon: "🖼️", label: "Add Transfer Slide", action: () => { setAddSlideOpen(true); setPlusOpen(false); } },
    { icon: "⏱️", label: "Add Countdown", action: () => { setAddCountdownOpen(true); setPlusOpen(false); } },
    { icon: "➕", label: "Add Player", action: () => { setAddPlayerOpen(true); setPlusOpen(false); } },
    { icon: "🖼️", label: "Add Player Image", action: () => { setAddImageOpen(true); setPlusOpen(false); } },
    { icon: "🏆", label: "Add Team Icon", action: () => { setAddIconOpen(true); setPlusOpen(false); } },
    { icon: "🗑️", label: "Delete Player", action: () => { setDeletePlayerOpen(true); setPlusOpen(false); } },
    { icon: "⏰", label: "Auction Deadline", action: () => { setAuctionDeadlineOpen(true); setPlusOpen(false); } },
  ];

  const sastDate = getSASTDateString();

  return (
    <>
      <nav style={{ background: "linear-gradient(90deg, #FF1493, #FF69B4)", padding: "0 1.2rem", height: "128px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 500, boxShadow: "0 4px 20px rgba(255,20,147,0.4)" }}>
        <button onClick={() => setLeagueOpen(true)} style={{ background: "rgba(0,0,51,0.7)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.3)", color: "#fff", padding: "16px 36px", borderRadius: "20px", fontWeight: 700, fontSize: "1.7rem", cursor: "pointer", transition: "all 0.3s", fontFamily: "inherit" }}>View League</button>

        {/* Date/Install section */}
        <div style={{ flex: 1, textAlign: "center" }}>
          {!isInstalled && installPrompt ? (
            <button
              onClick={handlePromptInstall}
              style={{
                background: "rgba(0,0,51,0.9)",
                border: "2px solid #fff",
                color: "#fff",
                padding: "12px 28px",
                borderRadius: "18px",
                fontWeight: 700,
                fontSize: "1.5rem",
                cursor: "pointer",
                transition: "all 0.3s",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "rgba(0,0,51,1)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "rgba(0,0,51,0.9)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              ⬇️ Install App
            </button>
          ) : (
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", fontWeight: "bold", letterSpacing: "2px", whiteSpace: "nowrap" }}>
              {sastDate}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {isAdmin && (isTransferPage || tokyoMenuItems || leagueMenuProps) && (
            <div ref={plusRef} style={{ position: "relative" }}>
              <button onClick={() => setPlusOpen(v => !v)} style={{ background: plusOpen ? "#FF1493" : "rgba(0,0,51,0.85)", border: "2px solid #FF1493", width: "60px", height: "60px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.25s", fontSize: "2rem", color: "#fff", boxShadow: plusOpen ? "0 0 20px rgba(255,20,147,0.5)" : "none" }}>
                {plusOpen ? "✕" : "+"}
              </button>
              {plusOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, background: "rgba(0,0,30,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "20px", padding: "10px", minWidth: "340px", boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,20,147,0.1)", zIndex: 600, animation: "dropIn 0.2s ease" }}>
                  {leagueMenuProps ? (
                    // League page plus menu
                    [
                      { icon: "📋", label: "Results History", action: () => { setResultsHistoryOpen(true); setPlusOpen(false); } },
                      { icon: "⏳", label: "Pending Results", action: () => { setPendingResultsOpen(true); setPlusOpen(false); } },
                      { icon: "➕", label: "Add Team", action: () => { setAddLeagueTeamOpen(true); setPlusOpen(false); } },
                      { icon: "🏆", label: "Edit Team Icon", action: () => { leagueMenuProps.onEditTeamIcon?.(); setPlusOpen(false); } },
                      { icon: "🧑", label: "Add Player Icon", action: () => { leagueMenuProps.onAddPlayerIcon?.(); setPlusOpen(false); } },
                    ].map(({ icon, label, action }) => (
                      <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: "18px", width: "100%", padding: "22px 24px", background: "transparent", border: "none", color: "#fff", fontFamily: "inherit", fontSize: "1.6rem", fontWeight: 600, cursor: "pointer", borderRadius: "14px", transition: "all 0.15s", textAlign: "left" }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                        onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontSize: "2rem" }}>{icon}</span>
                        {label}
                      </button>
                    ))
                  ) : (
                    (isTransferPage ? dropdownItems : tokyoMenuItems).map(({ icon, label, action }) => (
                      <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: "18px", width: "100%", padding: "22px 24px", background: "transparent", border: "none", color: "#fff", fontFamily: "inherit", fontSize: "1.6rem", fontWeight: 600, cursor: "pointer", borderRadius: "14px", transition: "all 0.15s", textAlign: "left" }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                        onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontSize: "2rem" }}>{icon}</span>
                        {label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <button onClick={() => setMenuOpen(true)} style={{ background: "#000033", border: "1.5px solid #FF1493", width: "80px", height: "80px", borderRadius: "10px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            {[0, 1, 2].map(i => <span key={i} style={{ display: "block", width: "40px", height: "5px", background: "#FF1493", borderRadius: "2px" }} />)}
          </button>
        </div>
      </nav>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* League page modals */}
      {leagueMenuProps && (
        <>
          <Modal active={resultsHistoryOpen} onClose={() => setResultsHistoryOpen(false)}>
            <ResultsHistoryModal league={leagueMenuProps.league} season={leagueMenuProps.season} onClose={() => setResultsHistoryOpen(false)} />
          </Modal>
          <Modal active={pendingResultsOpen} onClose={() => setPendingResultsOpen(false)}>
            <PendingFixturesModal league={leagueMenuProps.league} season={leagueMenuProps.season} onClose={() => setPendingResultsOpen(false)} />
          </Modal>
          <Modal active={addLeagueTeamOpen} onClose={() => setAddLeagueTeamOpen(false)}>
            <AddTeamModal league={leagueMenuProps.league} season={leagueMenuProps.season} onClose={() => setAddLeagueTeamOpen(false)} />
          </Modal>
        </>
      )}

      {leagueOpen && (
        <div onClick={() => setLeagueOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,20,0.75)", backdropFilter: "blur(12px)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}><LeagueGrid onClose={() => setLeagueOpen(false)} /></div>
        </div>
      )}

      <Modal active={addPlayerOpen} onClose={() => setAddPlayerOpen(false)}>
        <AddPlayerModal onClose={() => setAddPlayerOpen(false)} />
      </Modal>

      {/* Add Transfer Slide */}
      <Modal active={addSlideOpen} onClose={() => setAddSlideOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px", letterSpacing: "2px" }}>🖼️ Add Transfer Slide</h3>
        {slidePreview && <img src={slidePreview} alt="" style={{ width: "100%", borderRadius: "12px", marginBottom: "12px", maxHeight: "220px", objectFit: "cover" }} />}
        <label style={{ display: "block", padding: "14px", background: "rgba(255,20,147,0.08)", border: "2px dashed rgba(255,20,147,0.4)", borderRadius: "12px", textAlign: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginBottom: "12px" }}>
          {slideFile ? "✅ Image selected — click to change" : "📷 Click to upload slide image"}
          <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (!f) return; setSlideFile(f); const r = new FileReader(); r.onload = ev => setSlidePreview(ev.target.result); r.readAsDataURL(f); }} style={{ display: "none" }} />
        </label>
        <input value={slideCaption} onChange={e => setSlideCaption(e.target.value)} placeholder="Optional caption (e.g. Transfer Window Open)" style={inputStyle} />
        <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
          <button onClick={handleSaveSlide} disabled={savingSlide || !slideFile} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: !slideFile ? 0.5 : 1 }}>{savingSlide ? "Uploading..." : "Add Slide"}</button>
          <button onClick={() => setAddSlideOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
        {/* Existing slides */}
        {slides.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>Current Slides</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
              {slides.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px" }}>
                  <img src={s.imageUrl} alt="" style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "6px" }} />
                  <div style={{ flex: 1, color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{s.caption || "No caption"}</div>
                  <button onClick={() => handleDeleteSlide(s.id)} style={{ background: "rgba(255,0,0,0.2)", border: "none", color: "#ff6b6b", padding: "6px 10px", borderRadius: "8px", cursor: "pointer" }}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal active={addVideoOpen} onClose={() => setAddVideoOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px", letterSpacing: "2px" }}>🎬 Transfer Window Video</h3>
        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Paste Cloudinary video URL" style={inputStyle} />
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSaveVideo} disabled={savingVideo} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{savingVideo ? "Saving..." : "Save"}</button>
          <button onClick={() => setAddVideoOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>

      <Modal active={addCountdownOpen} onClose={() => setAddCountdownOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px", letterSpacing: "2px" }}>⏱️ Transfer Window Countdown</h3>
        <input value={cdName} onChange={e => setCdName(e.target.value)} placeholder="e.g. Transfer Window Closes" style={inputStyle} />
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Target Date</label>
        <input type="date" value={cdDate} onChange={e => setCdDate(e.target.value)} style={inputStyle} />
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Target Time (optional)</label>
        <input type="time" value={cdTime} onChange={e => setCdTime(e.target.value)} style={inputStyle} />
        <button onClick={handleAddCountdown} disabled={savingCd} style={{ width: "100%", padding: "12px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", marginBottom: "20px" }}>{savingCd ? "Adding..." : "Add Countdown"}</button>
        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
          {countdowns.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,20,147,0.06)", borderRadius: "12px", marginBottom: "8px" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>{c.name}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>{new Date(c.target).toLocaleString()}</div>
              </div>
              <button onClick={() => handleDeleteCountdown(c.id)} style={{ background: "rgba(255,0,0,0.2)", border: "none", color: "#ff6b6b", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>🗑️</button>
            </div>
          ))}
        </div>
      </Modal>

      <Modal active={addImageOpen} onClose={() => setAddImageOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px", letterSpacing: "2px" }}>🖼️ Add Player Image</h3>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Tab</label>
        <select value={selectedPlayerTab} onChange={e => { setSelectedPlayerTab(e.target.value); setSelectedPlayerId(""); }} style={{ ...inputStyle, cursor: "pointer" }}>
          {TRANSFER_TABS.map(t => <option key={t} value={t}>{TAB_LABELS[t]}</option>)}
        </select>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Player</label>
        <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="">Select player...</option>
          {(players[selectedPlayerTab] || []).map(p => <option key={p.id} value={p.id}>{p.name} — {p.club}</option>)}
        </select>
        {imagePreview && <img src={imagePreview} alt="" style={{ width: "100%", borderRadius: "12px", marginBottom: "12px", maxHeight: "180px", objectFit: "cover" }} />}
        <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (!f) return; setImageFile(f); const r = new FileReader(); r.onload = ev => setImagePreview(ev.target.result); r.readAsDataURL(f); }} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "16px", display: "block" }} />
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSaveImage} disabled={savingImage || !selectedPlayerId || !imageFile} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: (!selectedPlayerId || !imageFile) ? 0.5 : 1 }}>{savingImage ? "Uploading..." : "Save Image"}</button>
          <button onClick={() => setAddImageOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>

      <Modal active={addIconOpen} onClose={() => setAddIconOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px", letterSpacing: "2px" }}>🏆 Add Team Icon</h3>
        <input value={iconClubName} onChange={e => setIconClubName(e.target.value)} placeholder="Club name (must match exactly)" style={inputStyle} />
        {iconPreview && <img src={iconPreview} alt="" style={{ width: "80px", height: "80px", objectFit: "contain", borderRadius: "12px", marginBottom: "12px", display: "block" }} />}
        <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (!f) return; setIconFile(f); const r = new FileReader(); r.onload = ev => setIconPreview(ev.target.result); r.readAsDataURL(f); }} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "16px", display: "block" }} />
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSaveIcon} disabled={savingIcon || !iconClubName || !iconFile} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: (!iconClubName || !iconFile) ? 0.5 : 1 }}>{savingIcon ? "Uploading..." : "Save Icon"}</button>
          <button onClick={() => setAddIconOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>

      <Modal active={deletePlayerOpen} onClose={() => setDeletePlayerOpen(false)}>
        <h3 style={{ color: "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px", letterSpacing: "2px" }}>🗑️ Delete Player</h3>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Tab</label>
        <select value={deleteTab} onChange={e => { setDeleteTab(e.target.value); setDeletePlayerId(""); }} style={{ ...inputStyle, cursor: "pointer" }}>
          {TRANSFER_TABS.map(t => <option key={t} value={t}>{TAB_LABELS[t]}</option>)}
        </select>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Player</label>
        <select value={deletePlayerId} onChange={e => setDeletePlayerId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="">Select player...</option>
          {(players[deleteTab] || []).map(p => <option key={p.id} value={p.id}>{p.name} — {p.club}</option>)}
        </select>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleDeletePlayer} disabled={deleting || !deletePlayerId} style={{ flex: 1, padding: "14px", background: "#cc0000", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: !deletePlayerId ? 0.5 : 1 }}>{deleting ? "Deleting..." : "Delete"}</button>
          <button onClick={() => setDeletePlayerOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>

      <Modal active={auctionDeadlineOpen} onClose={() => setAuctionDeadlineOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px", letterSpacing: "2px" }}>⏰ Auction Deadline</h3>
        {currentDeadline && (
          <div style={{ marginBottom: "16px", padding: "14px", background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Current Deadline</div>
            <div style={{ color: "#fff", fontWeight: 700 }}>{new Date(currentDeadline).toLocaleString()}</div>
            <button onClick={handleResetDeadline} style={{ marginTop: "10px", padding: "8px 16px", background: "rgba(255,68,68,0.2)", border: "1px solid rgba(255,68,68,0.4)", borderRadius: "8px", color: "#ff6b6b", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>🗑️ Clear Deadline</button>
          </div>
        )}
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Deadline Date</label>
        <input type="date" value={auctionDeadlineDate} onChange={e => setAuctionDeadlineDate(e.target.value)} style={inputStyle} />
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Deadline Time</label>
        <input type="time" value={auctionDeadlineTime} onChange={e => setAuctionDeadlineTime(e.target.value)} style={inputStyle} />
        <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
          <button onClick={handleSaveDeadline} disabled={savingDeadline || !auctionDeadlineDate} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: !auctionDeadlineDate ? 0.5 : 1 }}>{savingDeadline ? "Saving..." : "Set Deadline"}</button>
          <button onClick={() => setAuctionDeadlineOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        select option { background: #000033; color: #fff; }
      `}</style>
    </>
  );
}
