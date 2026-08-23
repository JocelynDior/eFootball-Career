import { useEffect, useRef } from "react";
import { useMusic } from "../context/MusicContext";

export default function BackgroundMusic() {
  const {
    currentTrack,
    currentIndex,
    isMutedAll,
    mutedSongs,
    isPlaying,
    setIsPlaying,
    getNextTrack,
    setCurrentIndex,
    playlist,
    shuffledOrder,
  } = useMusic();

  const audioRef = useRef(null);
  const hasInteracted = useRef(false);
  const wasPlayingBeforeHide = useRef(false);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.4;
    audio.preload = "auto";
    audioRef.current = audio;

    // Start on first user interaction (browser autoplay policy)
    const startOnInteraction = () => {
      if (!hasInteracted.current) {
        hasInteracted.current = true;
        if (audioRef.current && audioRef.current.src) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    };

    window.addEventListener("click", startOnInteraction, { once: true });
    window.addEventListener("keydown", startOnInteraction, { once: true });
    window.addEventListener("touchstart", startOnInteraction, { once: true });

    return () => {
      audio.pause();
      audio.src = "";
      window.removeEventListener("click", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
    };
  }, []);

  // ── Page Visibility API — pause when tab hidden, resume when visible ──
  useEffect(() => {
    function handleVisibilityChange() {
      const audio = audioRef.current;
      if (!audio || !hasInteracted.current) return;

      if (document.hidden) {
        // User left the tab/minimized/switched app
        wasPlayingBeforeHide.current = !audio.paused;
        if (!audio.paused) {
          audio.pause();
          setIsPlaying(false);
        }
      } else {
        // User came back
        if (wasPlayingBeforeHide.current) {
          audio.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // When track changes, load and play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const isMuted = isMutedAll || mutedSongs[currentTrack.id];

    audio.src = currentTrack.url;
    audio.volume = isMuted ? 0 : 0.4;
    audio.load();

    // Only play if tab is visible and user has interacted
    if (hasInteracted.current && !document.hidden) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [currentTrack?.id]);

  // Handle mute state changes without reloading
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    const isMuted = isMutedAll || mutedSongs[currentTrack.id];
    audio.volume = isMuted ? 0 : 0.4;
  }, [isMutedAll, mutedSongs, currentTrack?.id]);

  // When current song ends, advance to next shuffled track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const nextIdx = getNextTrack(currentIndex);
      setCurrentIndex(nextIdx);
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [currentIndex, playlist, shuffledOrder, mutedSongs]);

  return null;
}
