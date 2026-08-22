import { createContext, useContext, useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set, push, remove } from "firebase/database";

const MusicContext = createContext();

const SETTINGS_PATH = "career_music_settings";

export function MusicProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledOrder, setShuffledOrder] = useState([]);
  const [isMutedAll, setIsMutedAll] = useState(false);
  const [mutedSongs, setMutedSongs] = useState({});
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [soundEffectUrl, setSoundEffectUrl] = useState("");
  const [loadingVideoUrl, setLoadingVideoUrl] = useState("");
  const [loadingSpinnerEnabled, setLoadingSpinnerEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load user preferences from localStorage
  useEffect(() => {
    try {
      const mutedAll = localStorage.getItem("career_muted_all");
      if (mutedAll !== null) setIsMutedAll(mutedAll === "true");

      const mutedSongsRaw = localStorage.getItem("career_muted_songs");
      if (mutedSongsRaw) setMutedSongs(JSON.parse(mutedSongsRaw));

      const sfx = localStorage.getItem("career_sfx_enabled");
      if (sfx !== null) setSoundEffectsEnabled(sfx !== "false");

      const spinner = localStorage.getItem("career_spinner_enabled");
      if (spinner !== null) setLoadingSpinnerEnabled(spinner !== "false");
    } catch (e) {}
  }, []);

  // Sync playlist + admin settings from Firebase
  useEffect(() => {
    const playlistRef = ref(db, `${SETTINGS_PATH}/playlist`);
    const unsubPlaylist = onValue(playlistRef, snap => {
      const data = snap.val();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setPlaylist(items);
        setShuffledOrder(shuffleArray(items.map((_, i) => i)));
      } else {
        setPlaylist([]);
        setShuffledOrder([]);
      }
    });

    const adminRef = ref(db, `${SETTINGS_PATH}/admin`);
    const unsubAdmin = onValue(adminRef, snap => {
      const data = snap.val() || {};
      if (data.soundEffectUrl !== undefined) setSoundEffectUrl(data.soundEffectUrl || "");
      if (data.loadingVideoUrl !== undefined) setLoadingVideoUrl(data.loadingVideoUrl || "");
      setSettingsLoaded(true);
    });

    return () => { unsubPlaylist(); unsubAdmin(); };
  }, []);

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Admin: add song
  async function addSong(title, url) {
    const playlistRef = ref(db, `${SETTINGS_PATH}/playlist`);
    await push(playlistRef, { title, url, addedAt: Date.now() });
  }

  // Admin: remove song
  async function removeSong(id) {
    await remove(ref(db, `${SETTINGS_PATH}/playlist/${id}`));
  }

  // Admin: update sound effect URL
  async function updateSoundEffectUrl(url) {
    await set(ref(db, `${SETTINGS_PATH}/admin/soundEffectUrl`), url);
  }

  // Admin: update loading video URL
  async function updateLoadingVideoUrl(url) {
    await set(ref(db, `${SETTINGS_PATH}/admin/loadingVideoUrl`), url);
  }

  // User: toggle mute all
  function toggleMuteAll() {
    const next = !isMutedAll;
    setIsMutedAll(next);
    localStorage.setItem("career_muted_all", String(next));
  }

  // User: toggle mute specific song
  function toggleMuteSong(id) {
    const next = { ...mutedSongs, [id]: !mutedSongs[id] };
    setMutedSongs(next);
    localStorage.setItem("career_muted_songs", JSON.stringify(next));
  }

  // User: toggle sound effects
  function toggleSoundEffects() {
    const next = !soundEffectsEnabled;
    setSoundEffectsEnabled(next);
    localStorage.setItem("career_sfx_enabled", String(next));
  }

  // User: toggle loading spinner
  function toggleLoadingSpinner() {
    const next = !loadingSpinnerEnabled;
    setLoadingSpinnerEnabled(next);
    localStorage.setItem("career_spinner_enabled", String(next));
  }

  // Get next shuffled track (skip muted ones)
  function getNextTrack(fromIndex) {
    if (playlist.length === 0) return 0;
    let tries = 0;
    let idx = (fromIndex + 1) % shuffledOrder.length;
    while (tries < playlist.length) {
      const song = playlist[shuffledOrder[idx]];
      if (!mutedSongs[song?.id]) return idx;
      idx = (idx + 1) % shuffledOrder.length;
      tries++;
    }
    return idx;
  }

  function reshuffleAndPlay() {
    setShuffledOrder(shuffleArray(playlist.map((_, i) => i)));
    setCurrentIndex(0);
  }

  const currentTrack = playlist.length > 0 && shuffledOrder.length > 0
    ? playlist[shuffledOrder[currentIndex]]
    : null;

  return (
    <MusicContext.Provider value={{
      playlist,
      currentTrack,
      currentIndex,
      setCurrentIndex,
      shuffledOrder,
      isMutedAll,
      mutedSongs,
      soundEffectsEnabled,
      soundEffectUrl,
      loadingVideoUrl,
      loadingSpinnerEnabled,
      isPlaying,
      setIsPlaying,
      settingsLoaded,
      addSong,
      removeSong,
      updateSoundEffectUrl,
      updateLoadingVideoUrl,
      toggleMuteAll,
      toggleMuteSong,
      toggleSoundEffects,
      toggleLoadingSpinner,
      getNextTrack,
      reshuffleAndPlay,
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
