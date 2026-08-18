export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "stretch",
      margin: "0 0 24px",
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,20,147,0.2)",
      borderRadius: "50px",
      padding: "8px",
      gap: "4px",
      overflowX: "auto",
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: "1 1 0",
            background: activeTab === tab.id ? "#FF1493" : "transparent",
            border: "none",
            color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.6)",
            padding: "12px 8px",
            borderRadius: "30px",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            letterSpacing: "0.4px",
            transition: "all 0.25s",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            textAlign: "center",
            minWidth: 0,
          }}
          onMouseOver={e => { if (activeTab !== tab.id) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          onMouseOut={e => { if (activeTab !== tab.id) e.currentTarget.style.background = "transparent"; }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
