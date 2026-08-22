import { useEffect, useState, useRef } from "react";
import { useMusic } from "../context/MusicContext";

// ─── Hook: preload images then resolve ───────────────────────────────────────
export function usePageLoader(imageUrls = []) {
  const { loadingSpinnerEnabled, loadingVideoUrl, settingsLoaded } = useMusic();
  const [ready, setReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // If spinner disabled, show page immediately
    if (!loadingSpinnerEnabled) { setReady(true); return; }
    // Wait for settings to load from Firebase before deciding
    if (!settingsLoaded) return;

    const urls = imageUrls.filter(Boolean);

    if (urls.length === 0) {
      // No images to preload — still show video for minimum feel (1.5s)
      const t = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => setReady(true), 400);
      }, loadingVideoUrl ? 1500 : 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const promises = urls.map(url =>
      new Promise(resolve => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // Don't block on broken images
        img.src = url;
      })
    );

    Promise.all(promises).then(() => {
      if (cancelled) return;
      setFadeOut(true);
      setTimeout(() => { if (!cancelled) setReady(true); }, 400);
    });

    return () => { cancelled = true; };
  }, [imageUrls.join(","), loadingSpinnerEnabled, settingsLoaded, loadingVideoUrl]);

  return { ready, fadeOut };
}

// ─── Full-screen page loading overlay ────────────────────────────────────────
export default function LoadingSpinner({ fadeOut = false }) {
  const { loadingVideoUrl } = useMusic();
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "#000020",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: fadeOut ? 0 : 1,
      transition: "opacity 0.4s ease",
      pointerEvents: fadeOut ? "none" : "all",
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
        // Fallback spinner if no video uploaded yet
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

// ─── Page wrapper: shows spinner until images loaded ─────────────────────────
export function PageLoader({ imageUrls = [], children }) {
  const { loadingSpinnerEnabled } = useMusic();
  const { ready, fadeOut } = usePageLoader(imageUrls);

  if (!loadingSpinnerEnabled) return children;

  return (
    <>
      {!ready && <LoadingSpinner fadeOut={fadeOut} />}
      <div style={{ visibility: ready ? "visible" : "hidden" }}>
        {children}
      </div>
    </>
  );
}
