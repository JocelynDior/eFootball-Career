export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div style={{
      display: "flex", justifyContent: "center", margin: "0 0 24px",
      background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,20,147,0.2)", borderRadius: "50px",
      padding: "10px 16px", flexWrap: "wrap", gap: "6px"
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
          background: activeTab === tab.id ? "#FF1493" : "transparent",
          border: "none", color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.6)",
          padding: "10px 24px", borderRadius: "30px", fontWeight: 700,
          fontSize: "0.9rem", cursor: "pointer", letterSpacing: "0.5px",
          transition: "all 0.25s", fontFamily: "inherit", whiteSpace: "nowrap"
        }}
          onMouseOver={e => { if (activeTab !== tab.id) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          onMouseOut={e => { if (activeTab !== tab.id) e.currentTarget.style.background = "transparent"; }}
        >{tab.label}</button>
      ))}
    </div>
  );
}
