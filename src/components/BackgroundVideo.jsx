import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function BackgroundVideo() {
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/backgroundVideo`), snap => {
      const val = snap.val();
      if (val) setVideoUrl(val);
    });
    return () => unsub();
  }, []);

  if (!videoUrl) return null;

  return (
    <>
      <video
        autoPlay
        muted
        loop
        playsInline
        key={videoUrl}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: -2,
          opacity: 0.4,
          pointerEvents: "none"
        }}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      <div style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, rgba(0,0,51,0.8) 0%, rgba(0,0,30,0.9) 100%)",
        zIndex: -1,
        pointerEvents: "none"
      }} />
    </>
  );
}
