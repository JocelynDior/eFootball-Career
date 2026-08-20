import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { db, PATHS } from "../firebase";
import { ref, set, push, remove, onValue } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";
import SideMenu from "./SideMenu";
import LeagueGrid from "./LeagueGrid";
import Modal from "./Modal";
import AddPlayerModal from "../modals/AddPlayerModal";

const TRANSFER_TABS = ["topTargets", "listed", "scouts", "signings", "auction"];
const TAB_LABELS = { topTargets: "Top Targets", listed: "Listed", scouts: "Scouts", signings: "Signings", auction: "Auction" };

export default function Navbar({ tokyoMenuItems } = {}) {
  const location = useLocation();
  const { isAdmin, teamIconsCache, updateTeamIcon } = useAdmin();
  const isTransferPage = location.pathname === "/transfer-market";

  const [menuOpen, setMenuOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const plusRef = useRef(null);

  // Modals
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [addImageOpen, setAddImageOpen] = useState(false);
  const [addIconOpen, setAddIconOpen] = useState(false);
  const [deletePlayerOpen, setDeletePlayerOpen] = useState(false);
  const [addCountdownOpen, setAddCountdownOpen] = useState(false);

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

  useEffect(() => {
    if (!isAdmin || !isTransferPage) return;
    TRANSFER_TABS.forEach(t => {
      onValue(ref(db, `${PATHS.transfers}/${t}`), snap => {
        const data = snap.val();
        setPlayers(prev => ({
          ...prev,
          [t]: data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : [],
        }));
      });
    });
    onValue(ref(db, `${PATHS.globalSettings}/transferCountdowns`), snap => {
      const data = snap.val();
      setCountdowns(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
    });
  }, [isAdmin, isTransferPage]);

  // Close dropdown on outside click
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
    setSavingVideo(false);
    setAddVideoOpen(false);
    setVideoUrl("");
  }

  async function handleSaveImage() {
    if (!imageFile || !selectedPlayerId) return;
    setSavingImage(true);
    try {
      const url = await uploadToImgBB(imageFile);
      await set(ref(db, `${PATHS.transfers}/${selectedPlayerTab}/${selectedPlayerId}/imageUrl`), url);
      setAddImageOpen(false);
      setImageFile(null);
      setImagePreview("");
      setSelectedPlayerId("");
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
      setAddIconOpen(false);
      setIconFile(null);
      setIconPreview("");
      setIconClubName("");
    } catch (e) {}
    setSavingIcon(false);
  }

  async function handleDeletePlayer() {
    if (!deletePlayerId) return;
    if (!window.confirm("Delete this player?")) return;
    setDeleting(true);
    await remove(ref(db, `${PATHS.transfers}/${deleteTab}/${deletePlayerId}`));
    setDeleting(false);
    setDeletePlayerId("");
    setDeletePlayerOpen(false);
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

  const inputStyle = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.4)",
    borderRadius: "12px", color: "#fff",
    fontFamily: "inherit", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box", marginBottom: "12px",
  };

  const dropdownItems = [
    { icon: "🎬", label: "Add Video", action: () => { setAddVideoOpen(true); setPlusOpen(false); } },
    { icon: "⏱️", label: "Add Countdown", action: () => { setAddCountdownOpen(true); setPlusOpen(false); } },
    { icon: "➕", label: "Add Player", action: () => { setAddPlayerOpen(true); setPlusOpen(false); } },
    { icon: "🖼️", label: "Add Player Image", action: () => { setAddImageOpen(true); setPlusOpen(false); } },
    { icon: "🏆", label: "Add Team Icon", action: () => { setAddIconOpen(true); setPlusOpen(false); } },
    { icon: "🗑️", label: "Delete Player", action: () => { setDeletePlayerOpen(true); setPlusOpen(false); } },
  ];

  return (
    <>
      <nav style={{
        background: "linear-gradient(90deg, #FF1493, #FF69B4)",
        padding: "0 1.2rem", height: "128px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 500,
        boxShadow: "0 4px 20px rgba(255,20,147,0.4)",
      }}>
        <button onClick={() => setLeagueOpen(true)} style={{
          background: "rgba(0,0,51,0.7)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)", color: "#fff",
          padding: "16px 36px", borderRadius: "20px", fontWeight: 700,
          fontSize: "1.7rem", cursor: "pointer", transition: "all 0.3s",
          fontFamily: "inherit",
        }}>View League</button>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Admin plus button — transfer market OR Tokyo page (via tokyoMenuItems) */}
          {isAdmin && (isTransferPage || tokyoMenuItems) && (
            <div ref={plusRef} style={{ position: "relative" }}>
              <button
                onClick={() => setPlusOpen(v => !v)}
                style={{
                  background: plusOpen ? "#FF1493" : "rgba(0,0,51,0.85)",
                  border: "2px solid #FF1493",
                  width: "60px", height: "60px", borderRadius: "16px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.25s",
                  fontSize: "2rem", color: "#fff",
                  boxShadow: plusOpen ? "0 0 20px rgba(255,20,147,0.5)" : "none",
                }}
              >
                {plusOpen ? "✕" : "+"}
              </button>

              {/* Dropdown */}
              {plusOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 12px)", right: 0,
                  background: "rgba(0,0,30,0.97)", backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,20,147,0.35)", borderRadius: "18px",
                  padding: "8px", minWidth: "220px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,20,147,0.1)",
                  zIndex: 600,
                  animation: "dropIn 0.2s ease",
                }}>
                  {(isTransferPage ? dropdownItems : tokyoMenuItems).map(({ icon, label, action }) => (
                    <button key={label} onClick={action} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      width: "100%", padding: "13px 16px",
                      background: "transparent", border: "none",
                      color: "#fff", fontFamily: "inherit", fontSize: "0.95rem",
                      fontWeight: 600, cursor: "pointer", borderRadius: "12px",
                      transition: "all 0.15s", textAlign: "left",
                    }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(true)} style={{
            background: "#000033", border: "1.5px solid #FF1493",
            width: "80px", height: "80px", borderRadius: "10px",
            display: "flex", flexDirection: "column", justifyContent: "center",
            alignItems: "center", gap: "10px", cursor: "pointer",
          }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: "block", width: "40px", height: "5px", background: "#FF1493", borderRadius: "2px" }} />
            ))}
          </button>
        </div>
      </nav>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {leagueOpen && (
        <div onClick={() => setLeagueOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,20,0.75)", backdropFilter: "blur(12px)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}>
            <LeagueGrid onClose={() => setLeagueOpen(false)} />
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      <Modal active={addPlayerOpen} onClose={() => setAddPlayerOpen(false)}>
        <AddPlayerModal onClose={() => setAddPlayerOpen(false)} />
      </Modal>

      {/* Add Video Modal */}
      <Modal active={addVideoOpen} onClose={() => setAddVideoOpen(false)}>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "16px", letterSpacing: "2px" }}>🎬 Transfer Window Video</h3>
        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Paste Cloudinary video URL" style={inputStyle} />
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSaveVideo} disabled={savingVideo} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{savingVideo ? "Saving..." : "Save"}</button>
          <button onClick={() => setAddVideoOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </div>
      </Modal>

      {/* Add Countdown Modal */}
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

      {/* Add Player Image Modal */}
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

      {/* Add Team Icon Modal */}
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

      {/* Delete Player Modal */}
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
