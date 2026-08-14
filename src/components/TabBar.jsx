export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div style={{
      display: "flex", justifyContent: "center", margin: "0 16px 20px",
      background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,20,147,0.2)", borderRadius: "50px",
      padding: "8px 12px", flexWrap: "wrap", gap: "4px"
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
          background: activeTab === tab.id ? "#FF1493" : "transparent",
          border: "none", color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.6)",
          padding: "8px 18px", borderRadius: "30px", fontWeight: 700,
          fontSize: "0.8rem", cursor: "pointer", letterSpacing: "0.5px",
          transition: "all 0.25s", fontFamily: "inherit", whiteSpace: "nowrap"
        }}>{tab.label}</button>
      ))}
    </div>
  );
}
