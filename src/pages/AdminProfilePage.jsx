import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import TabBar from "../components/TabBar";
import { useAdmin } from "../context/AdminContext";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import AdminManagerModal from "../modals/AdminManagerModal";
import AdminClubModal from "../modals/AdminClubModal";

const inputStyle = {
  width: "100%",
  padding: "13px 16px",
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,20,147,0.3)",
  borderRadius: "12px",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
};

const ADMIN_TABS = [
  { id: "managers", label: "MANAGERS" },
  { id: "clubs", label: "CLUBS" },
];

// ── Manager card ─────────────────────────────────────────────────────────
function ManagerCard({ mgr, onClick }) {
  return (
    <div
      onClick={() => onClick(mgr)}
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        background: "rgba(255,20,147,0.05)",
        border: "1px solid rgba(255,20,147,0.15)",
        borderRadius: "16px",
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseOver={e => {
        e.currentTarget.style.background = "rgba(255,20,147,0.12)";
        e.currentTarget.style.borderColor = "rgba(255,20,147,0.4)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseOut={e => {
        e.currentTarget.style.background = "rgba(255,20,147,0.05)";
        e.currentTarget.style.borderColor = "rgba(255,20,147,0.15)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: "52px", height: "52px", borderRadius: "50%",
        border: "2px solid rgba(255,20,147,0.5)",
        background: "rgba(255,20,147,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", flexShrink: 0,
      }}>
        {mgr.profilePhoto
          ? <img src={mgr.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: "1.4rem" }}>👤</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {mgr.username}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: "2px" }}>{mgr.email}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          background: mgr.team ? "rgba(255,20,147,0.15)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${mgr.team ? "rgba(255,20,147,0.3)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: "20px", padding: "3px 12px",
          color: mgr.team ? "#FF69B4" : "rgba(255,255,255,0.35)",
          fontSize: "0.75rem", fontWeight: 600,
        }}>
          {mgr.team || "No Team"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", marginTop: "4px" }}>
          €{(mgr.balance ?? 0).toLocaleString("en-EU")}
        </div>
      </div>
      <div style={{ color: "rgba(255,20,147,0.6)", fontSize: "1rem" }}>›</div>
    </div>
  );
}

// ── Club card ────────────────────────────────────────────────────────────
function ClubCard({ club, manager, onClick }) {
  return (
    <div
      onClick={() => onClick(club)}
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        background: "rgba(255,20,147,0.05)",
        border: "1px solid rgba(255,20,147,0.15)",
        borderRadius: "16px",
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseOver={e => {
        e.currentTarget.style.background = "rgba(255,20,147,0.12)";
        e.currentTarget.style.borderColor = "rgba(255,20,147,0.4)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseOut={e => {
        e.currentTarget.style.background = "rgba(255,20,147,0.05)";
        e.currentTarget.style.borderColor = "rgba(255,20,147,0.15)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: "52px", height: "52px", borderRadius: "12px",
        border: "2px solid rgba(255,20,147,0.5)",
        background: "rgba(255,20,147,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", flexShrink: 0, fontSize: "1.6rem",
      }}>
        {club.badge ? <img src={club.badge} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🏟️"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {club.name}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: "2px" }}>
          Manager: <span style={{ color: "#FF69B4" }}>{manager?.username || "Unassigned"}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        {club.bankrupt && (
          <div style={{ background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)", borderRadius: "20px", padding: "2px 10px", color: "#ff6b6b", fontSize: "0.7rem", fontWeight: 700 }}>
            🔴 BANKRUPT
          </div>
        )}
        {club.objectives && club.objectives.length > 0 && (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem" }}>
            {club.objectives.length} objective{club.objectives.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
      <div style={{ color: "rgba(255,20,147,0.6)", fontSize: "1rem" }}>›</div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function AdminProfilePage() {
  const navigate = useNavigate();
  const { isAdmin, logoutAdmin } = useAdmin();
  const [adminProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("careerAdminProfile") || "{}"); } catch { return {}; }
  });

  const [tab, setTab] = useState("managers");
  const [managers, setManagers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedMgr, setSelectedMgr] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null);
  const [mgrSearch, setMgrSearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");

  // Load all managers
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .filter(([, v]) => v.role === "manager")
        .map(([uid, v]) => ({ uid, ...v }))
        .sort((a, b) => a.username?.localeCompare(b.username));
      setManagers(list);
    });
    return () => unsub();
  }, []);

  // Load all clubs from career_team_management
  useEffect(() => {
    const unsub = onValue(ref(db, "career_team_management"), snap => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([name, val]) => ({
        name,
        badge: val.info?.badge || null,
        bankrupt: val.bankrupt || false,
        objectives: val.objectives
          ? (Array.isArray(val.objectives) ? val.objectives : Object.values(val.objectives))
          : [],
      }));
      setClubs(list.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsub();
  }, []);

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
        <Navbar />
        <div style={{ maxWidth: "500px", margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,20,147,0.2)", borderRadius: "24px", padding: "48px 36px"
          }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🔒</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#FF1493", marginBottom: "12px" }}>
              Admin Only
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "28px" }}>
              You need admin access to view this page.
            </p>
            <button
              onClick={() => navigate("/create-account")}
              style={{
                padding: "14px 36px", background: "linear-gradient(135deg, #FF1493, #FF69B4)",
                border: "none", borderRadius: "14px", color: "#fff",
                fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif"
              }}
            >Go to Login</button>
          </div>
        </div>
      </div>
    );
  }

  const filteredManagers = managers.filter(m =>
    m.username?.toLowerCase().includes(mgrSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(mgrSearch.toLowerCase()) ||
    m.team?.toLowerCase().includes(mgrSearch.toLowerCase())
  );

  const filteredClubs = clubs.filter(c =>
    c.name?.toLowerCase().includes(clubSearch.toLowerCase())
  );

  function getClubManager(clubName) {
    return managers.find(m => m.team === clubName) || null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "36px 20px 80px" }}>

        {/* ── Admin profile card ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,20,147,0.2)",
          borderRadius: "24px",
          padding: "36px",
          marginBottom: "20px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Glow */}
          <div style={{
            position: "absolute", top: "-60px", right: "-60px",
            width: "200px", height: "200px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,20,147,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            <div style={{
              width: "100px", height: "100px", borderRadius: "50%",
              border: "3px solid #FF1493",
              boxShadow: "0 0 28px rgba(255,20,147,0.5)",
              background: "rgba(255,20,147,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "3rem" }}>🛡️</span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem",
                color: "#fff", letterSpacing: "2px", lineHeight: 1
              }}>{adminProfile.username || "Admin"}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "6px" }}>
                {adminProfile.email || ""}
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)",
                borderRadius: "20px", padding: "4px 14px", marginTop: "10px"
              }}>
                <span style={{ color: "#FF1493", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1px" }}>
                  ⚡ ADMIN
                </span>
              </div>
            </div>

            <button
              onClick={() => { logoutAdmin(); navigate("/"); }}
              style={{
                background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
                color: "#ff6b6b", padding: "10px 20px", borderRadius: "12px",
                cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                fontFamily: "'Inter', sans-serif",
              }}
            >Exit Admin</button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {[
            { icon: "👥", label: "Total Managers", value: managers.length },
            { icon: "⚽", label: "Teams Assigned", value: managers.filter(m => m.team).length },
            { icon: "🏟️", label: "Total Clubs", value: clubs.length },
          ].map(s => (
            <div key={s.label} style={{
              background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.15)",
              borderRadius: "16px", padding: "18px 16px",
            }}>
              <div style={{ fontSize: "1.4rem", marginBottom: "6px" }}>{s.icon}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem", marginTop: "4px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <TabBar tabs={ADMIN_TABS} activeTab={tab} onTabChange={setTab} />

        {/* ── MANAGERS TAB ── */}
        {tab === "managers" && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,20,147,0.2)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
          }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "#fff", letterSpacing: "2px", marginBottom: "4px" }}>
                👥 All Managers
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>
                {managers.length} registered manager{managers.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Search */}
            <input
              value={mgrSearch}
              onChange={e => setMgrSearch(e.target.value)}
              placeholder="🔍  Search by name, email or team…"
              style={{ ...inputStyle, marginBottom: "16px", background: "rgba(255,255,255,0.04)" }}
              onFocus={e => e.target.style.borderColor = "#FF1493"}
              onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
            />

            {!filteredManagers.length ? (
              <div style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>
                {mgrSearch ? "No managers match your search." : "No managers registered yet."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredManagers.map(mgr => (
                  <ManagerCard key={mgr.uid} mgr={mgr} onClick={setSelectedMgr} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CLUBS TAB ── */}
        {tab === "clubs" && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,20,147,0.2)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
          }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "#fff", letterSpacing: "2px", marginBottom: "4px" }}>
                🏟️ All Clubs
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>
                {clubs.length} club{clubs.length !== 1 ? "s" : ""} in the system
              </div>
            </div>

            {/* Search */}
            <input
              value={clubSearch}
              onChange={e => setClubSearch(e.target.value)}
              placeholder="🔍  Search by club name…"
              style={{ ...inputStyle, marginBottom: "16px", background: "rgba(255,255,255,0.04)" }}
              onFocus={e => e.target.style.borderColor = "#FF1493"}
              onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
            />

            {!filteredClubs.length ? (
              <div style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>
                {clubSearch ? "No clubs match your search." : "No clubs in the system yet."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredClubs.map(club => (
                  <ClubCard
                    key={club.name}
                    club={club}
                    manager={getClubManager(club.name)}
                    onClick={setSelectedClub}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manager modal */}
      {selectedMgr && (
        <AdminManagerModal
          mgr={selectedMgr}
          onClose={() => setSelectedMgr(null)}
          onSaved={() => setSelectedMgr(null)}
        />
      )}

      {/* Club modal */}
      {selectedClub && (
        <AdminClubModal
          club={selectedClub}
          managers={managers}
          onClose={() => setSelectedClub(null)}
          onSaved={() => setSelectedClub(null)}
        />
      )}
    </div>
  );
}
