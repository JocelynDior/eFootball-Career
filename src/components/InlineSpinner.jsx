// Small in-page loading indicator. Use it while a section's data is still being fetched,
// so the section doesn't flash an empty state ("No … yet") before the data arrives.
// (LoadingSpinner.jsx is the separate full-screen overlay used when a whole page loads.)
export default function InlineSpinner({ label = "LOADING...", padding = "60px 20px", size = 48 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding, gap: "18px" }}>
      <div style={{
        width: `${size}px`, height: `${size}px`,
        border: "4px solid rgba(255,20,147,0.15)",
        borderTop: "4px solid #FF1493",
        borderRadius: "50%",
        animation: "inlineSpin 0.8s linear infinite",
      }} />
      {label && (
        <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "2px" }}>
          {label}
        </div>
      )}
      <style>{`@keyframes inlineSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
