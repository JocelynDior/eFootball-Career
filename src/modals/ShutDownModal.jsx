import { useState } from "react";
import Modal from "../components/Modal";
import { SHUTDOWN_PAGE_GROUPS } from "../utils/shutdownPages";

// Admin shutdown chooser for the sidebar "Shut Down" option.
//  • Full Website   → the existing site-wide maintenance switch (confirm Yes / No)
//  • Specific Pages → toggle individual pages on/off; visitors get the page maintenance screen
export default function ShutDownModal({
  active, maintenance = false, busy = false,
  pageShutdowns = {}, onToggleFull, onTogglePage, onClearPages, onClose,
}) {
  const [tab, setTab] = useState("full");
  const goingDown = !maintenance;
  const downCount = Object.keys(pageShutdowns).length;

  const tabBtn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
        borderRadius: "14px", color: tab === id ? "#fff" : "rgba(255,255,255,0.55)",
        background: tab === id ? "rgba(255,20,147,0.25)" : "transparent",
        border: tab === id ? "1px solid #FF1493" : "1px solid rgba(255,255,255,0.2)",
      }}
    >{label}</button>
  );

  return (
    <Modal active={active} onClose={busy ? () => {} : onClose}>
      <div style={{ padding: "10px 0" }}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
          {tabBtn("full", "Full Website")}
          {tabBtn("pages", downCount > 0 ? `Specific Pages (${downCount} down)` : "Specific Pages")}
        </div>

        {tab === "full" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "5rem", marginBottom: "16px" }}>{goingDown ? "🔴" : "🟢"}</div>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "2px",
              color: "#fff", margin: "0 0 14px", fontWeight: 400,
            }}>
              {goingDown ? "Shut down website?" : "Bring website back online?"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", margin: "0 0 32px", lineHeight: 1.4 }}>
              {goingDown
                ? "Do you want to set the whole website down for maintenance? Everyone except admins will see the maintenance screen."
                : "Do you want to turn maintenance off? The website will be available to everyone again."}
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
              <button
                onClick={onToggleFull}
                disabled={busy}
                style={{
                  flex: 1, maxWidth: "260px", cursor: busy ? "default" : "pointer",
                  background: goingDown ? "#E24B4A" : "#22c55e", border: "none",
                  borderRadius: "14px", color: "#fff", fontWeight: 700, fontFamily: "inherit",
                  opacity: busy ? 0.6 : 1,
                }}
              >{busy ? "Please wait…" : "Yes"}</button>
              <button
                onClick={onClose}
                disabled={busy}
                style={{
                  flex: 1, maxWidth: "260px", cursor: busy ? "default" : "pointer",
                  background: "transparent", border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "14px", color: "#fff", fontWeight: 700, fontFamily: "inherit",
                }}
              >No</button>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "2px",
              color: "#fff", margin: "0 0 10px", fontWeight: 400, textAlign: "center",
            }}>Shut down specific pages</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", margin: "0 0 24px", lineHeight: 1.4, textAlign: "center" }}>
              Tap a page to switch it off or on. Visitors who open a page that's down see a maintenance screen; admins can still open every page.
            </p>

            {downCount > 0 && (
              <button
                onClick={onClearPages}
                disabled={busy}
                style={{
                  width: "100%", marginBottom: "22px", cursor: busy ? "default" : "pointer",
                  background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.5)",
                  borderRadius: "14px", color: "#4ade80", fontWeight: 700, fontFamily: "inherit",
                  opacity: busy ? 0.6 : 1,
                }}
              >🟢 Bring all pages back online</button>
            )}

            {SHUTDOWN_PAGE_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: "22px" }}>
                <div style={{
                  color: "rgba(255,255,255,0.45)", fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: "2px", marginBottom: "10px",
                }}>{group.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                  {group.pages.map(pg => {
                    const down = pageShutdowns[pg.key] === true;
                    return (
                      <button
                        key={pg.key}
                        onClick={() => onTogglePage(pg.key, !down)}
                        disabled={busy}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                          cursor: busy ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700,
                          textAlign: "left", borderRadius: "14px", color: "#fff",
                          background: down ? "rgba(226,75,74,0.14)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${down ? "rgba(226,75,74,0.6)" : "rgba(255,255,255,0.15)"}`,
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        <span>{pg.label}</span>
                        <span style={{ color: down ? "#ff6b6b" : "#4ade80", whiteSpace: "nowrap" }}>{down ? "🔴 Down" : "🟢 Live"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
