import { useEffect, useRef } from "react";
import { useMusic } from "../context/MusicContext";

const CLICKABLE_SELECTORS = [
  "button",
  "a",
  "[role='button']",
  "[onClick]",
  "[data-clickable]",
  ".clickable",
];

export default function SoundEffects() {
  const { soundEffectsEnabled, soundEffectUrl } = useMusic();
  const audioPoolRef = useRef([]);
  const poolSize = 4; // Allow overlapping clicks

  // Build audio pool when URL changes
  useEffect(() => {
    if (!soundEffectUrl) {
      audioPoolRef.current = [];
      return;
    }

    const pool = Array.from({ length: poolSize }, () => {
      const a = new Audio(soundEffectUrl);
      a.volume = 0.35;
      a.preload = "auto";
      return a;
    });
    audioPoolRef.current = pool;

    return () => {
      pool.forEach(a => { a.pause(); a.src = ""; });
    };
  }, [soundEffectUrl]);

  useEffect(() => {
    if (!soundEffectsEnabled || !soundEffectUrl) return;

    let poolIndex = 0;

    const handleClick = (e) => {
      const target = e.target;
      const isClickable = CLICKABLE_SELECTORS.some(sel => target.closest(sel));
      if (!isClickable) return;

      const pool = audioPoolRef.current;
      if (!pool.length) return;

      const audio = pool[poolIndex % pool.length];
      poolIndex++;

      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [soundEffectsEnabled, soundEffectUrl]);

  return null;
}
