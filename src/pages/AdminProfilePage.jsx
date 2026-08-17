import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAdmin } from "../context/AdminContext";
import { db, PATHS } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";

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

const labelStyle = {
  display: "block",
  color: "rgba(255,255,255,0.5)",
  fontSize: "0.7rem",
  fontWeight: 600,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  marginBottom: "5px",
};

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
          €{(mgr.balance ?? 1000000000).toLocaleString("en-EU")}
        </div>
      </div>
      <div style={{ color: "rgba(255,20,147,0.6)", fontSize: "1rem" }}>›</div>
    </div>
  );
}

function ManagerEditPopup({ mgr, onClose, onSaved }) {
  const [team, setTeam] = useState(mgr.team || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(mgr.profilePhoto || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  async function handleSave() {
    setSaving(true);
    let photoUrl = mgr.profilePhoto || null;

    if (photoFile) {
      photoUrl = await uploadToImgBB(photoFile);
    }

    const updates = {
      team: team.trim() || null,
      profilePhoto: photoUrl,
    };

    await update(ref(db, `${PATHS.accounts}/${mgr.uid}`), updates);
    setSaving(false);
    setSuccess("Saved!");
    setTimeout(() => { setSuccess(""); onSaved(); onClose(); }, 1200);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,20,0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "500px",
          background: "rgba(0,0,30,0.7)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255,20,147,0.25)",
          borderRadius: "24px",
          padding: "36px",
          boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "20px",
          background: "none", border: "none", color: "rgba(255,255,255,0.5)",
          fontSize: "1.4rem", cursor: "pointer",
        }}>✕</button>

        {/* Manager identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            border: "2px solid #FF1493",
            background: "rgba(255,20,147,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", flexShrink: 0,
          }}>
            {photoPreview
              ? <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: "1.8rem" }}>👤</span>
            }
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{mgr.username}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{mgr.email}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Team assignment */}
          <div>
            <label style={labelStyle}>Assign Team</label>
            <input
              value={team}
              onChange={e => setTeam(e.target.value)}
              placeholder="e.g. Real Madrid"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#FF1493"}
              onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
            />
          </div>

          {/* Profile photo */}
          <div>
            <label style={labelStyle}>Profile Photo</label>
            {photoPreview && (
              <div style={{ marginBottom: "10px" }}>
                <img src={photoPreview} alt="" style={{
                  width: "80px", height: "80px", objectFit: "cover",
                  borderRadius: "50%", border: "2px solid rgba(255,20,147,0.4)"
                }} />
              </div>
            )}
            <label style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.3)",
              borderRadius: "10px", padding: "10px 18px", cursor: "pointer",
              color: "#FF69B4", fontSize: "0.85rem", fontWeight: 600,
            }}>
              📸 Upload Photo
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                const f = e.target.files[0];
                if (!f) return;
                setPhotoFile(f);
                const r = new FileReader();
                r.onload = ev => setPhotoPreview(ev.target.result);
                r.readAsDataURL(f);
              }} />
            </label>
          </div>

          {/* Info row */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px", padding: "14px 16px",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px"
          }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Balance</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem", marginTop: "3px" }}>
                €{(mgr.balance ?? 1000000000).toLocaleString("en-EU")}
              </div>
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rank</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem", marginTop: "3px" }}>
                {mgr.rank ? `#${mgr.rank}` : "—"}
              </div>
            </div>
          </div>

          {success && (
            <div style={{
              background: "rgba(0,200,100,0.12)", border: "1px solid rgba(0,200,100,0.3)",
              borderRadius: "10px", padding: "10px", color: "#4ade80",
              fontSize: "0.88rem", textAlign: "center"
            }}>{success}</div>
          )}

          <button onClick={handleSave} disabled={saving} style={{
            padding: "14px", background: "linear-gradient(135deg, #FF1493, #FF69B4)",
            border: "none", borderRadius: "14px", color: "#fff",
            fontWeight: 700, fontSize: "1rem", cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            opacity: saving ? 0.7 : 1,
          }}>{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const { isAdmin, logoutAdmin } = useAdmin();
  const [adminProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("careerAdminProfile") || "{}"); } catch { return {}; }
  });

  const [managers, setManagers] = useState([]);
  const [showManagers, setShowManagers] = useState(false);
  const [selectedMgr, setSelectedMgr] = useState(null);
  const [search, setSearch] = useState("");

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

  const filtered = managers.filter(m =>
    m.username?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.team?.toLowerCase().includes(search.toLowerCase())
  );

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
            {/* Avatar */}
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

        {/* ── Stats ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "12px", marginBottom: "20px"
        }}>
          {[
            { icon: "👥", label: "Total Managers", value: managers.length },
            { icon: "⚽", label: "Teams Assigned", value: managers.filter(m => m.team).length },
          ].map(s => (
            <div key={s.label} style={{
              background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.15)",
              borderRadius: "16px", padding: "20px 22px",
            }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "6px" }}>{s.icon}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.4rem", marginTop: "4px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── View Managers ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,20,147,0.2)",
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          {/* Header button */}
          <button
            onClick={() => setShowManagers(v => !v)}
            style={{
              width: "100%", padding: "22px 28px",
              background: "transparent",
              border: "none",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", color: "#fff",
              borderBottom: showManagers ? "1px solid rgba(255,20,147,0.15)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "1.4rem" }}>👥</span>
              <div style={{ textAlign: "left" }}>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem",
                  color: "#fff", letterSpacing: "2px"
                }}>View Managers</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>
                  {managers.length} registered manager{managers.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FF1493", fontSize: "1rem",
              transform: showManagers ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s",
            }}>▾</div>
          </button>

          {/* Expanded managers list */}
          {showManagers && (
            <div style={{ padding: "20px 24px" }}>
              {/* Search */}
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍  Search by name, email or team…"
                style={{
                  ...inputStyle,
                  marginBottom: "16px",
                  background: "rgba(255,255,255,0.04)",
                }}
                onFocus={e => e.target.style.borderColor = "#FF1493"}
                onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
              />

              {!filtered.length ? (
                <div style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>
                  {search ? "No managers match your search." : "No managers registered yet."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {filtered.map(mgr => (
                    <ManagerCard key={mgr.uid} mgr={mgr} onClick={setSelectedMgr} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manager edit popup */}
      {selectedMgr && (
        <ManagerEditPopup
          mgr={selectedMgr}
          onClose={() => setSelectedMgr(null)}
          onSaved={() => setSelectedMgr(null)}
        />
      )}
    </div>
  );
}
