import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function DebugPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [firebaseStatus, setFirebaseStatus] = useState("checking...");
  const [videoStatus, setVideoStatus] = useState("waiting...");
  const [canAutoplay, setCanAutoplay] = useState("checking...");
  const [logs, setLogs] = useState([]);
  const videoRef = useRef(null);

  function addLog(msg) {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }

  useEffect(() => {
    addLog("Component mounted");
    try {
      const unsub = onValue(ref(db, `${PATHS.globalSettings}/backgroundVideo`), snap => {
        const val = snap.val();
        addLog(`Firebase response: ${val ? val : "null/empty"}`);
        if (val) {
          setVideoUrl(val);
          setFirebaseStatus("✅ Got URL: " + val);
        } else {
          setFirebaseStatus("⚠️ No video URL in Firebase");
        }
      });
      return () => unsub();
    } catch (e) {
      setFirebaseStatus("❌ Firebase error: " + e.message);
      addLog("Firebase error: " + e.message);
    }
  }, []);

  useEffect(() => {
    if (!videoUrl) return;
    addLog("Video URL set, attempting to load...");
    const video = videoRef.current;
    if (!video) { addLog("Video ref is null!"); return; }
    video.onloadstart = () => { addLog("Video loadstart"); setVideoStatus("Loading..."); };
    video.onloadeddata = () => { addLog("Video loadeddata ✅"); setVideoStatus("✅ Loaded!"); };
    video.oncanplay = () => { addLog("Video canplay ✅"); };
    video.onplay = () => { addLog("Video playing ✅"); setVideoStatus("✅ Playing!"); };
    video.onerror = (e) => { addLog("Video error: " + JSON.stringify(video.error)); setVideoStatus("❌ Error: " + (video.error?.message || "unknown")); };
    video.load();
    video.play().then(() => addLog("play() promise resolved")).catch(e => { addLog("play() rejected: " + e.message); setVideoStatus("❌ Autoplay blocked: " + e.message); });

    // Test autoplay
    const testVideo = document.createElement("video");
    testVideo.muted = true;
    testVideo.src = videoUrl;
    testVideo.play().then(() => { setCanAutoplay("✅ Autoplay allowed"); addLog("Autoplay test passed"); }).catch(e => { setCanAutoplay("❌ Autoplay blocked: " + e.message); addLog("Autoplay test failed: " + e.message); });
  }, [videoUrl]);

  const boxStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", padding: "16px", marginBottom: "12px" };
  const labelStyle = { color: "#FF1493", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "6px" };
  const valueStyle = { color: "#fff", fontSize: "0.9rem", wordBreak: "break-all" };

  return (
    <div style={{ minHeight: "100vh", background: "#000020", fontFamily: "'Inter', sans-serif", padding: "20px 16px" }}>
      <h1 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginBottom: "20px" }}>🔧 Debug Panel</h1>

      <div style={boxStyle}>
        <div style={labelStyle}>Firebase Status</div>
        <div style={valueStyle}>{firebaseStatus}</div>
      </div>

      <div style={boxStyle}>
        <div style={labelStyle}>Video URL</div>
        <div style={valueStyle}>{videoUrl || "none"}</div>
      </div>

      <div style={boxStyle}>
        <div style={labelStyle}>Video Load Status</div>
        <div style={valueStyle}>{videoStatus}</div>
      </div>

      <div style={boxStyle}>
        <div style={labelStyle}>Autoplay Status</div>
        <div style={valueStyle}>{canAutoplay}</div>
      </div>

      {videoUrl && (
        <div style={boxStyle}>
          <div style={labelStyle}>Video Preview (visible test)</div>
          <video
            ref={videoRef}
            autoPlay muted loop playsInline
            controls
            style={{ width: "100%", borderRadius: "8px", marginTop: "8px" }}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        </div>
      )}

      <div style={boxStyle}>
        <div style={labelStyle}>Event Log</div>
        {logs.map((log, i) => (
          <div key={i} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{log}</div>
        ))}
      </div>
    </div>
  );
}
