import { useAdmin } from "../context/AdminContext";

// Small pill shown only while an admin is testing the site "as a manager",
// so it's always obvious which view you're in and how to get back.
const IS_MOBILE = typeof window !== "undefined" && window.screen.width < 900;
const S = IS_MOBILE ? 2 : 1;

export default function ManagerViewBadge() {
  const { managerView, setManagerView, manager } = useAdmin();
  if (!managerView) return null;

  return (
    <div
      onClick={() => setManagerView(false)}
      title="Switch back to admin view"
      style={{
        position: "fixed", left: `${14 * S}px`, bottom: `${(IS_MOBILE ? 150 : 24)}px`,
        zIndex: 900, cursor: "pointer",
        background: "rgba(0,0,20,0.9)", border: "1.5px solid #4fc3f7", color: "#4fc3f7",
        borderRadius: "999px", padding: `${0.55 * S}rem ${1.1 * S}rem`,
        fontWeight: 700, fontSize: `${0.85 * S}rem`, fontFamily: "'Inter', sans-serif",
        boxShadow: "0 4px 18px rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
      }}
    >
      👤 Manager view{manager?.username ? ` · ${manager.username}` : " · not signed in"} — tap for admin
    </div>
  );
}
