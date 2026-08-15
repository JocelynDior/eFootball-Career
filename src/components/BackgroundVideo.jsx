import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function BackgroundVideo() {
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/backgroundVideo`), snap => {
      if (snap.val()) setVideoUrl(snap.val());
    });
    return () => unsub();
  }, []);

  if (!videoUrl) return null;

  return (
    <>
      <video autoPlay muted loop playsInline style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -2, opacity: 0.35 }} src={videoUrl} />
      <div style={{ position: "fixed", inset: 0, zIndex: -1, background: "linear-gradient(135deg, rgba(0,0,51,0.75) 0%, rgba(0,0,30,0.85) 100%)" }} />
    </>
  );
}
