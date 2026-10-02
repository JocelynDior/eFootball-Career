import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import AwardInfoModal from "../modals/AwardInfoModal";
import { useAdmin } from "../context/AdminContext";
import { db } from "../firebase";
import { ref, onValue, push, update, remove, set } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";

const PINK = "#FF1493";
const PINK_BORDER = "rgba(255,20,147,0.28)";
const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const TABS = [
  { key: "players", label: "⚽ Players" },
  { key: "managers", label: "🧑‍💼 Managers" },
  { key: "teams", label: "🛡️ Teams" },
];

const adminBtn = {
  padding: "14px 32px", background: `linear-gradient(135deg, ${PINK}, #ff69b4)`, border: "none",
  borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.7rem", cursor: "pointer",
  boxShadow: "0 4px 20px rgba(255,20,147,0.4)",
};

// ── Headline image ─────────────────────────────────────────────────────────
function HeroBanner({ isAdmin }) {
  const [imgUrl, setImgUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "career_awards_hero"), snap => {
      setImgUrl(snap.val() || "");
    });
    return () => unsub();
  }, []);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setError("");
    try {
      const url = await uploadToImgBB(file);
      await set(ref(db, "career_awards_hero"), url);
    } catch (err) {
      setError("Upload failed: " + err.message);
    }
    setUploading(false);
  }

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden", marginBottom: "32px" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {imgUrl ? (
          <>
            <img src={imgUrl} alt="eAwards" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)", pointerEvents: "none" }} />
          </>
        ) : (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: "6rem", marginBottom: "8px" }}>🏆</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "3px" }}>No Headline Image Set</div>
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.55)", border: `1px solid ${PINK_BORDER}`, borderRadius: "10px", color: PINK, padding: "8px 16px", cursor: "pointer", fontSize: "1.3rem", fontWeight: 700, backdropFilter: "blur(8px)", zIndex: 5 }}>
            {uploading ? "Uploading..." : "✏️ Change Headline Image"}
          </button>
          {error && <div style={{ position: "absolute", bottom: "8px", left: "12px", color: "#ff6b6b", fontSize: "1.3rem", zIndex: 5 }}>{error}</div>}
        </>
      )}
    </div>
  );
}

// ── Add / edit award (headline + image) ────────────────────────────────────
function AwardFormModal({ tabKey, existing, onClose }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const inputStyle = { width: "100%", padding: "14px 18px", background: "rgba(255,255,255,0.05)", border: `1px solid ${PINK_BORDER}`, borderRadius: "12px", color: "#fff", fontFamily: "inherit", fontSize: "1.5rem", outline: "none", boxSizing: "border-box" };
  const labelStyle = { color: "rgba(255,255,255,0.5)", fontSize: "1.3rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: "8px" };

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setError("");
    try {
      setImageUrl(await uploadToImgBB(file));
    } catch (err) {
      setError("Upload failed: " + err.message);
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!title.trim()) { setError("Enter an award headline."); return; }
    if (!imageUrl) { setError("Upload an award image."); return; }
    setSaving(true); setError("");
    try {
      const data = { title: title.trim(), imageUrl, updatedAt: Date.now() };
      if (existing?.id) {
        await update(ref(db, `career_awards/${tabKey}/${existing.id}`), data);
      } else {
        data.createdAt = Date.now();
        await push(ref(db, `career_awards/${tabKey}`), data);
      }
      onClose();
    } catch (e) {
      setError("Failed to save: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ ...GLASS, background: "rgba(20,20,28,0.94)", borderRadius: "22px", padding: "32px 28px", maxWidth: "520px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer", fontSize: "1.4rem" }}>✕</button>
        <h3 style={{ color: PINK, fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", margin: "0 0 22px" }}>
          {existing ? "✏️ EDIT AWARD" : "➕ ADD AWARD"}
        </h3>

        <div style={{ marginBottom: "18px" }}>
          <label style={labelStyle}>Award headline *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Player of the Season" style={inputStyle} />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={labelStyle}>Award image *</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ ...inputStyle, cursor: "pointer", textAlign: "center", border: `1px dashed ${PINK_BORDER}` }}>
            {uploading ? "Uploading..." : imageUrl ? "Replace image" : "Choose image"}
          </button>
          {imageUrl && <img src={imageUrl} alt="preview" style={{ width: "100%", height: "auto", display: "block", marginTop: "12px", borderRadius: "12px" }} />}
        </div>

        {error && <div style={{ color: "#ff6b6b", background: "rgba(255,0,0,0.08)", borderRadius: "10px", padding: "12px", marginBottom: "16px", fontSize: "1.4rem" }}>{error}</div>}

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSave} disabled={saving || uploading} style={{ flex: 1, padding: "14px", background: PINK, border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1.5rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.05)", border: `1px solid ${PINK_BORDER}`, borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "1.5rem" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({ onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ ...GLASS, background: "rgba(20,20,28,0.94)", borderRadius: "22px", padding: "36px", maxWidth: "380px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "3.4rem", marginBottom: "14px" }}>⚠️</div>
        <h3 style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem", marginBottom: "10px", letterSpacing: "2px" }}>DELETE AWARD?</h3>
        <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "24px", fontSize: "1.4rem" }}>This removes its image and all season info. It can't be undone.</p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: "14px", background: "rgba(255,80,80,0.18)", border: "1px solid rgba(255,80,80,0.35)", borderRadius: "12px", color: "#ff6b6b", cursor: "pointer", fontWeight: 700, fontSize: "1.5rem" }}>Delete</button>
          <button onClick={onCancel} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.05)", border: `1px solid ${PINK_BORDER}`, borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "1.5rem" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Award card ─────────────────────────────────────────────────────────────
function AwardCard({ award, isAdmin, onOpen, onEdit, onDelete }) {
  return (
    <div style={{ textAlign: "center", animation: "fadeUp 0.4s ease both" }}>
      <img
        src={award.imageUrl}
        alt={award.title}
        onClick={() => onOpen(award.id)}
        style={{ width: "100%", height: "auto", display: "block", cursor: "pointer", background: "#000", borderRadius: "14px" }}
      />
      <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px", marginTop: "12px", textAlign: "center" }}>
        {award.title}
      </div>
      <button onClick={() => onOpen(award.id)} style={{ background: "none", border: "none", color: PINK, fontSize: "1.7rem", fontWeight: 700, cursor: "pointer", padding: "4px 8px", textAlign: "center" }}>
        View Award
      </button>
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "8px" }}>
          <button onClick={() => onEdit(award)} style={{ padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: `1px solid ${PINK_BORDER}`, borderRadius: "10px", color: "#fff", cursor: "pointer", fontSize: "1.3rem" }}>✏️ Edit</button>
          <button onClick={() => onDelete(award.id)} style={{ padding: "8px 18px", background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.35)", borderRadius: "10px", color: "#ff6b6b", cursor: "pointer", fontSize: "1.3rem" }}>🗑️ Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function EAwardsPage() {
  const { isAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState("players");
  const [awards, setAwards] = useState({ players: [], managers: [], teams: [] });
  const [loaded, setLoaded] = useState({ players: false, managers: false, teams: false });
  const [openId, setOpenId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editAward, setEditAward] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const unsubs = TABS.map(({ key }) =>
      onValue(ref(db, `career_awards/${key}`), snap => {
        const data = snap.val();
        const list = data
          ? Object.entries(data).map(([id, a]) => ({ id, ...a })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
          : [];
        setAwards(prev => ({ ...prev, [key]: list }));
        setLoaded(prev => ({ ...prev, [key]: true }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => { setOpenId(null); }, [activeTab]);

  const list = awards[activeTab];
  const openAward = openId ? list.find(a => a.id === openId) : null;
  const isTeams = activeTab === "teams";

  async function deleteAward(id) {
    try {
      await remove(ref(db, `career_awards/${activeTab}/${id}`));
      setDeleteId(null);
    } catch (e) { console.error(e); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      <HeroBanner isAdmin={isAdmin} />

      <div style={{ padding: "0 0 100px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "36px", padding: "0 20px" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(4.8rem, 14vw, 8rem)", color: "#fff", letterSpacing: "6px", margin: "0 0 8px", textShadow: "0 0 30px rgba(255,20,147,0.35)" }}>
            eAWARDS
          </h1>
          <div style={{ height: "3px", width: "200px", background: `linear-gradient(to right, transparent, ${PINK}, transparent)`, margin: "0 auto" }} />
        </div>

        <div style={{ padding: "0 20px", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "stretch", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "50px", padding: "8px", gap: "4px", overflowX: "auto" }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{ flex: "1 1 0", background: activeTab === key ? PINK : "transparent", border: "none", color: activeTab === key ? "#fff" : "rgba(255,255,255,0.6)", padding: "20px 16px", borderRadius: "30px", fontWeight: 700, fontSize: "1.7rem", cursor: "pointer", letterSpacing: "0.4px", transition: "all 0.25s", fontFamily: "inherit", whiteSpace: "nowrap", textAlign: "center", minWidth: 0, boxShadow: activeTab === key ? "0 4px 20px rgba(255,20,147,0.4)" : "none" }}
                onMouseOver={e => { if (activeTab !== key) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onMouseOut={e => { if (activeTab !== key) e.currentTarget.style.background = "transparent"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px", padding: "0 20px" }}>
            <button onClick={() => { setEditAward(null); setShowForm(true); }} style={adminBtn}>➕ Add Award</button>
          </div>
        )}

        {!loaded[activeTab] && (
          <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.4rem", letterSpacing: "3px" }}>LOADING...</div>
        )}

        {loaded[activeTab] && list.length === 0 && (
          <div style={{ ...GLASS, margin: "0 20px", borderRadius: "20px", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "7rem", marginBottom: "12px" }}>🏆</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.4rem", color: "rgba(255,255,255,0.3)", letterSpacing: "3px" }}>
              {isAdmin ? "No Awards Yet — Add One Above" : "No Awards Published Yet"}
            </div>
          </div>
        )}

        {list.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: isTeams ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
            gap: isTeams ? "36px" : "28px 18px",
            padding: "0 20px",
          }}>
            {list.map(a => (
              <AwardCard key={a.id} award={a} isAdmin={isAdmin}
                onOpen={setOpenId}
                onEdit={x => { setEditAward(x); setShowForm(true); }}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        )}
      </div>

      {openAward && <AwardInfoModal award={openAward} tabKey={activeTab} isAdmin={isAdmin} onClose={() => setOpenId(null)} />}
      {showForm && <AwardFormModal tabKey={activeTab} existing={editAward} onClose={() => { setShowForm(false); setEditAward(null); }} />}
      {deleteId && <ConfirmDelete onConfirm={() => deleteAward(deleteId)} onCancel={() => setDeleteId(null)} />}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
