import { useEffect, useState, useRef } from "react";
import { useMusic } from "../context/MusicContext";

// ─── Full-screen loading overlay ─────────────────────────────────────────────
// Behaviour:
//   • No video uploaded  → show pink spinner, disappear as soon as data is ready
//   • Video uploaded     → play video, load data in background, once data ready
//                          finish current video playback moment then fade out
export default function LoadingSpinner({ fadeOut = false, dataReady = false }) {
  const { loadingVideoUrl } = useMusic();
  const videoRef = useRef(null);
  const [videoCanDismiss, setVideoCanDismiss] = useState(false);

  // Start video as soon as it mounts
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [loadingVideoUrl]);

  // When data is ready and video is playing, wait for the next natural pause
  // point (end of a loop cycle ~every 1s check) then signal dismiss
  useEffect(() => {
    if (!loadingVideoUrl || !dataReady) return;
    // Poll every 300ms — when video is near a loop boundary (last 0.4s) dismiss
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const remaining = v.duration - v.currentTime;
      if (remaining <= 0.5 || isNaN(remaining)) {
        setVideoCanDismiss(true);
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, [dataReady, loadingVideoUrl]);

  // Determine actual fadeOut: for video mode wait for videoCanDismiss too
  const shouldFadeOut = loadingVideoUrl ? (dataReady && videoCanDismiss) : fadeOut;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "#000020",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: shouldFadeOut ? 0 : 1,
      transition: "opacity 0.5s ease",
      pointerEvents: shouldFadeOut ? "none" : "all",
    }}>
      {loadingVideoUrl ? (
        <video
          ref={videoRef}
          src={loadingVideoUrl}
          loop
          muted
          playsInline
          autoPlay
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
          }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
          <div style={{
            width: "60px",
            height: "60px",
            border: "4px solid rgba(255,20,147,0.2)",
            borderTop: "4px solid #FF1493",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", fontFamily: "inherit" }}>
            Loading...
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
