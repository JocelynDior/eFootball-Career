import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function BackgroundVideo() {
  const [videoUrl, setVideoUrl] = useState("");
  const [debug, setDebug] = useState([]);
  const videoRef = useRef(null);

  function log(msg) {
    setDebug(prev => [...prev.slice(-8), msg]);
  }

  useEffect(() => {
    log("Mounting...");
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/backgroundVideo`), snap => {
      const val = snap.val();
      log("Firebase: " + (val ? val.substring(0, 40) : "empty"));
      if (val) setVideoUrl(val);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    log("Loading video...");
    const v = videoRef.current;
    v.onloadeddata = () => log("✅ Video loaded!");
    v.onplay = () => log("✅ Playing!");
    v.onerror = () => log("❌ Error: " + (v.error?.code || "unknown"));
    v.load();
    v.play().catch(e => log("❌ Play blocked: " + e.message));
  }, [videoUrl]);

  return (
    <>
      {videoUrl && (
        <>
          <video
            ref={videoRef}
            autoPlay muted loop playsInline
            style={{
              position: "fixed", top: 0, left: 0,
              width: "100vw", height: "100vh",
              objectFit: "cover", zIndex: -2,
              opacity: 0.4, pointerEvents: "none"
            }}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
          <div style={{
            position: "fixed", inset: 0, zIndex: -1,
            background: "linear-gradient(135deg, rgba(0,0,51,0.8) 0%, rgba(0,0,30,0.9) 100%)",
            pointerEvents: "none"
          }} />
        </>
      )}

      {/* Debug overlay - bottom left corner */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.85)", padding: "8px 12px",
        maxWidth: "320px", fontSize: "0.7rem", fontFamily: "monospace"
      }}>
        {debug.map((d, i) => (
          <div key={i} style={{ color: d.startsWith("❌") ? "#ff6b6b" : d.startsWith("✅") ? "#22c55e" : "#FF1493" }}>{d}</div>
        ))}
      </div>
    </>
  );
}
