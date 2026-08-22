import { useState } from "react";
import { useAdmin } from "../context/AdminContext";
import { useMusic } from "../context/MusicContext";
import Navbar from "../components/Navbar";

const card = {
  background: "rgba(255,20,147,0.06)",
  border: "1px solid rgba(255,20,147,0.18)",
  borderRadius: "20px",
  padding: "28px 32px",
  marginBottom: "24px",
};

const sectionTitle = {
  color: "#FF1493",
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: "1.4rem",
  letterSpacing: "2px",
  marginBottom: "20px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.3)",
  borderRadius: "12px",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
  marginBottom: "10px",
};

const btnPrimary = {
  padding: "12px 28px",
  background: "#FF1493",
  border: "none",
  borderRadius: "12px",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "1rem",
  transition: "opacity 0.2s",
};

const btnDanger = {
  padding: "8px 16px",
  background: "rgba(255,60,60,0.15)",
  border: "1px solid rgba(255,60,60,0.3)",
  borderRadius: "10px",
  color: "#ff6b6b",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.9rem",
  transition: "all 0.2s",
};

function Toggle({ enabled, onToggle, label, sublabel }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div>
        <div style={{ color: "#fff", fontWeight: 600, fontSize: "1.05rem" }}>{label}</div>
        {sublabel && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "3px" }}>{sublabel}</div>}
      </div>
      <div style={{
        width: "52px", height: "28px",
        background: enabled ? "#FF1493" : "rgba(255,255,255,0.12)",
        borderRadius: "14px",
        position: "relative",
        transition: "background 0.25s",
        flexShrink: 0,
        marginLeft: "20px",
      }}>
        <div style={{
          position: "absolute",
          top: "4px",
          left: enabled ? "26px" : "4px",
          width: "20px", height: "20px",
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.25s",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }} />
      </div>
    </div>
  );
}

function SongRow({ song, isMuted, onToggleMute, onRemove, isAdmin }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 18px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,20,147,0.12)",
      borderRadius: "12px",
      marginBottom: "10px",
      gap: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: "1.2rem",
          opacity: isMuted ? 0.3 : 1,
          transition: "opacity 0.2s",
        }}>🎵</span>
        <span style={{
          color: isMuted ? "rgba(255,255,255,0.35)" : "#fff",
          fontWeight: 600,
          fontSize: "1rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          transition: "color 0.2s",
        }}>{song.title}</span>
      </div>

      <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
        <button
          onClick={() => onToggleMute(song.id)}
          style={{
            padding: "7px 14px",
            background: isMuted ? "rgba(255,20,147,0.15)" : "rgba(255,255,255,0.07)",
            border: `1px solid ${isMuted ? "rgba(255,20,147,0.4)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: "10px",
            color: isMuted ? "#FF1493" : "rgba(255,255,255,0.6)",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.85rem",
            transition: "all 0.2s",
          }}
        >
          {isMuted ? "🔇 Muted" : "🔊 On"}
        </button>

        {isAdmin && (
          <button onClick={() => onRemove(song.id)} style={btnDanger}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { isAdmin } = useAdmin();
  const {
    playlist,
    isMutedAll,
    mutedSongs,
    soundEffectsEnabled,
    soundEffectUrl,
    loadingVideoUrl,
    loadingSpinnerEnabled,
    addSong,
    removeSong,
    updateSoundEffectUrl,
    updateLoadingVideoUrl,
    toggleMuteAll,
    toggleMuteSong,
    toggleSoundEffects,
    toggleLoadingSpinner,
  } = useMusic();

  // Admin form state
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongUrl, setNewSongUrl] = useState("");
  const [newSfxUrl, setNewSfxUrl] = useState(soundEffectUrl || "");
  const [newVideoUrl, setNewVideoUrl] = useState(loadingVideoUrl || "");
  const [addingSong, setAddingSong] = useState(false);
  const [savingSfx, setSavingSfx] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2500);
  }

  async function handleAddSong() {
    if (!newSongTitle.trim() || !newSongUrl.trim()) return;
    setAddingSong(true);
    await addSong(newSongTitle.trim(), newSongUrl.trim());
    setNewSongTitle("");
    setNewSongUrl("");
    setAddingSong(false);
    showSuccess("Song added to playlist!");
  }

  async function handleSaveSfx() {
    setSavingSfx(true);
    await updateSoundEffectUrl(newSfxUrl.trim());
    setSavingSfx(false);
    showSuccess("Sound effect updated!");
  }

  async function handleSaveVideo() {
    setSavingVideo(true);
    await updateLoadingVideoUrl(newVideoUrl.trim());
    setSavingVideo(false);
    showSuccess("Loading video updated!");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000020", color: "#fff" }}>
      <Navbar />

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "3rem",
            letterSpacing: "3px",
            color: "#fff",
            margin: 0,
          }}>⚙️ SETTINGS</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "8px", fontSize: "1rem" }}>
            {isAdmin ? "Admin & user settings" : "Personalise your experience"}
          </p>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div style={{
            position: "fixed", top: "90px", right: "24px",
            background: "#FF1493", color: "#fff",
            padding: "14px 24px", borderRadius: "14px",
            fontWeight: 700, fontSize: "1rem",
            zIndex: 9999,
            boxShadow: "0 4px 24px rgba(255,20,147,0.4)",
            animation: "fadeInDown 0.3s ease",
          }}>
            ✓ {successMsg}
            <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
          </div>
        )}

        {/* ── ADMIN SECTION ── */}
        {isAdmin && (
          <>
            <div style={{ ...card }}>
              <div style={sectionTitle}>🎵 Playlist Management</div>

              <div style={{ marginBottom: "24px" }}>
                <input
                  style={inputStyle}
                  placeholder="Song title (e.g. Champions Anthem)"
                  value={newSongTitle}
                  onChange={e => setNewSongTitle(e.target.value)}
                />
                <input
                  style={inputStyle}
                  placeholder="Cloudinary MP3 URL"
                  value={newSongUrl}
                  onChange={e => setNewSongUrl(e.target.value)}
                />
                <button
                  style={{ ...btnPrimary, opacity: addingSong ? 0.6 : 1 }}
                  onClick={handleAddSong}
                  disabled={addingSong}
                >
                  {addingSong ? "Adding..." : "+ Add Song"}
                </button>
              </div>

              {playlist.length === 0 && (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.95rem", textAlign: "center", padding: "20px 0" }}>
                  No songs in the playlist yet.
                </div>
              )}

              {playlist.map(song => (
                <SongRow
                  key={song.id}
                  song={song}
                  isMuted={mutedSongs[song.id]}
                  onToggleMute={toggleMuteSong}
                  onRemove={removeSong}
                  isAdmin={true}
                />
              ))}
            </div>

            <div style={{ ...card }}>
              <div style={sectionTitle}>🔊 Sound Effect</div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginBottom: "16px" }}>
                MP3 played when any button is clicked. Upload to Cloudinary and paste the URL.
              </p>
              <input
                style={inputStyle}
                placeholder="Cloudinary MP3 URL for click sound"
                value={newSfxUrl}
                onChange={e => setNewSfxUrl(e.target.value)}
              />
              <button
                style={{ ...btnPrimary, opacity: savingSfx ? 0.6 : 1 }}
                onClick={handleSaveSfx}
                disabled={savingSfx}
              >
                {savingSfx ? "Saving..." : "Save Sound Effect"}
              </button>
            </div>

            <div style={{ ...card }}>
              <div style={sectionTitle}>🎬 Loading Video</div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginBottom: "16px" }}>
                3-second video that loops while pages load. Upload to Cloudinary and paste the URL.
              </p>
              <input
                style={inputStyle}
                placeholder="Cloudinary video URL (.mp4)"
                value={newVideoUrl}
                onChange={e => setNewVideoUrl(e.target.value)}
              />
              <button
                style={{ ...btnPrimary, opacity: savingVideo ? 0.6 : 1 }}
                onClick={handleSaveVideo}
                disabled={savingVideo}
              >
                {savingVideo ? "Saving..." : "Save Loading Video"}
              </button>
            </div>
          </>
        )}

        {/* ── USER SECTION (everyone sees this) ── */}

        {/* Music */}
        <div style={{ ...card }}>
          <div style={sectionTitle}>🎶 Music</div>

          <Toggle
            enabled={!isMutedAll}
            onToggle={toggleMuteAll}
            label="Background Music"
            sublabel="Play music while you browse"
          />

          {playlist.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>
                Playlist · {playlist.length} song{playlist.length !== 1 ? "s" : ""}
              </div>
              {playlist.map(song => (
                <SongRow
                  key={song.id}
                  song={song}
                  isMuted={mutedSongs[song.id]}
                  onToggleMute={toggleMuteSong}
                  onRemove={removeSong}
                  isAdmin={false}
                />
              ))}
            </div>
          )}

          {playlist.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.95rem", padding: "16px 0" }}>
              No songs in the playlist yet.
            </div>
          )}
        </div>

        {/* Sound Effects */}
        <div style={{ ...card }}>
          <div style={sectionTitle}>🔊 Sound Effects</div>
          <Toggle
            enabled={soundEffectsEnabled}
            onToggle={toggleSoundEffects}
            label="Button Click Sounds"
            sublabel="Play a sound effect when clicking buttons"
          />
        </div>

        {/* Loading Spinner */}
        <div style={{ ...card }}>
          <div style={sectionTitle}>⏳ Loading Screen</div>
          <Toggle
            enabled={loadingSpinnerEnabled}
            onToggle={toggleLoadingSpinner}
            label="Loading Screen"
            sublabel="Show a video loading screen while pages load. Turn off to skip straight to the page."
          />
        </div>

      </div>
    </div>
  );
}
