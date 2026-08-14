export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "80px 20px", gap: "20px"
    }}>
      <div style={{
        width: "50px", height: "50px",
        border: "4px solid rgba(255,20,147,0.2)",
        borderTop: "4px solid #FF1493",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      <span style={{ color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: "1rem" }}>{text}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
