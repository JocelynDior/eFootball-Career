import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue, set, get, push, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "./Navbar";
import BackgroundVideo from "./BackgroundVideo";
import LeagueHeadlineSlideshow from "./LeagueHeadlineSlideshow";
import LeagueTableHeader from "./LeagueTableHeader";
import LoadingSpinner from "./LoadingSpinner";
import { uploadToImgBB } from "../utils/imgUpload";
import { renameSeason, setActiveSeason } from "../utils/seasonActions";

async function deleteSuperCupSeason(league, season, seasons, setSeasons, setSeason) {
  if (seasons.length <= 1) { alert("Can't delete the only season."); return; }
  if (!confirm(`Delete Season ${season}? This permanently removes its photo(s). This cannot be undone.`)) return;
  try {
    await remove(ref(db, `career_${league}/seasons/season_${season}`));
    const updated = seasons.filter(s => s !== season);
    setSeasons(updated);
    setSeason(updated[0]);
    await set(ref(db, `career_${league}_settings/seasons`), updated);
  } catch (e) {
    alert("Error deleting season: " + e.message);
  }
}

function WinnerCircle({ img, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 120, height: 120, borderRadius: "50%", overflow: "hidden",
        border: "4px solid rgba(255,20,147,0.5)", background: "rgba(0,0,40,0.85)",
        boxShadow: "0 0 28px rgba(255,20,147,0.3)",
      }}>
        <img src={img} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: 3, color: "#FF1493" }}>WINNER</div>
      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>{label}</div>
    </div>
  );
}

function PhotoSlideshow({ league, season, isAdmin }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/photos`), snap => {
      const d = snap.val() || {};
      setPhotos(Object.entries(d).map(([k, v]) => ({ key: k, url: v.url })));
      setIdx(0);
      setLoading(false);
    });
    return () => unsub();
  }, [league, season]);

  async function handleUpload(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadToImgBB(f);
      await push(ref(db, `career_${league}/seasons/season_${season}/photos`), { url, uploadedAt: Date.now() });
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(key) {
    if (!confirm("Remove this photo?")) return;
    await remove(ref(db, `career_${league}/seasons/season_${season}/photos/${key}`));
  }

  if (loading) return null;

  return (
    <div style={{ marginTop: 28 }}>
      {photos.length === 0 ? (
        isAdmin ? (
          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 10, cursor: uploading ? "default" : "pointer", padding: "48px 20px",
            background: "rgba(255,20,147,0.06)", border: "2px dashed rgba(255,20,147,0.4)", borderRadius: 16,
            color: "rgba(255,255,255,0.6)",
          }}>
            <span style={{ fontSize: "2rem" }}>📷</span>
            <span>{uploading ? "Uploading..." : "Tap to upload this season's photo"}</span>
            <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
          </label>
        ) : (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "40px 0" }}>No photo uploaded yet for this season.</div>
        )
      ) : (
        <div style={{ position: "relative" }}>
          <img
            src={photos[idx].url}
            alt=""
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16 }}
            key={photos[idx].key}
          />
          {isAdmin && (
            <button
              onClick={() => handleDelete(photos[idx].key)}
              style={{ position: "absolute", top: 10, right: 10, background: "#cc3333", border: "none", borderRadius: "50%", width: 32, height: 32, color: "#fff", cursor: "pointer", fontSize: 14 }}
            >✖</button>
          )}
          {photos.length > 1 && (
            <>
              <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "#FF1493", fontSize: "1.8rem", padding: "14px 10px", cursor: "pointer" }}>‹</button>
              <button onClick={() => setIdx(i => (i + 1) % photos.length)} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "#FF1493", fontSize: "1.8rem", padding: "14px 10px", cursor: "pointer" }}>›</button>
              <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                {photos.map((_, i) => (
                  <span key={i} onClick={() => setIdx(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === idx ? "#FF1493" : "rgba(255,255,255,0.4)", cursor: "pointer" }} />
                ))}
              </div>
            </>
          )}
          {isAdmin && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14, cursor: uploading ? "default" : "pointer", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
              + Add another photo
              <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuperCupTemplate({ league, name, emoji, left, right }) {
  const { isAdmin } = useAdmin();
  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState("1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}_settings/seasons`), snap => {
      const d = snap.val();
      const list = Array.isArray(d) && d.length ? d : (d ? Object.values(d) : ["1"]);
      setSeasons(list);
      setSeason(prev => (list.includes(prev) ? prev : list[0]));
      setLoading(false);
    });
    return () => unsub();
  }, [league]);

  async function handleAddSeason() {
    const n = prompt("New season number:");
    if (!n || !n.trim()) return;
    const trimmed = n.trim();
    if (seasons.includes(trimmed)) { alert(`Season "${trimmed}" already exists.`); return; }
    const updated = [...seasons, trimmed];
    setSeasons(updated);
    setSeason(trimmed);
    await set(ref(db, `career_${league}_settings/seasons`), updated);
  }

  const idx = seasons.indexOf(season);

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar />
      <LeagueHeadlineSlideshow league={league} />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 32px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: "3rem", marginBottom: 6 }}>{emoji}</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem", letterSpacing: 5, color: "#FF1493", margin: 0, textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>{name}</h1>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            <LeagueTableHeader
              title={name}
              currentSeason={season}
              seasons={seasons}
              onPrev={() => idx > 0 && setSeason(seasons[idx - 1])}
              onNext={() => idx < seasons.length - 1 && setSeason(seasons[idx + 1])}
              onAdd={isAdmin ? handleAddSeason : undefined}
              onRename={() => renameSeason(league, season, seasons, setSeasons, setSeason)}
              onSetActive={() => setActiveSeason(league, season)}
              onDelete={() => deleteSuperCupSeason(league, season, seasons, setSeasons, setSeason)}
            />

            <div style={{ display: "flex", justifyContent: "center", gap: 60, margin: "28px 0" }}>
              <WinnerCircle img={left.img} label={left.label} />
              <WinnerCircle img={right.img} label={right.label} />
            </div>

            <PhotoSlideshow league={league} season={season} isAdmin={isAdmin} />
          </>
        )}
      </div>
    </div>
  );
}
