import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set, update, push } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";
import { fetchStadiumInfo } from "../utils/groq";

const inputStyle = {
  width: "100%", padding: "16px 20px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "14px", color: "#fff",
  fontFamily: "inherit", fontSize: "1.1rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  color: "rgba(255,255,255,0.65)", fontSize: "0.9rem",
  display: "block", marginBottom: "8px",
  textTransform: "uppercase", letterSpacing: "0.8px",
  fontWeight: 700,
};

export default function StadiumModal({ team, onClose }) {
  const [stadiumName, setStadiumName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [vipTicketPrice, setVipTicketPrice] = useState("");
  const [expensesPerGame, setExpensesPerGame] = useState("");
  const [sponsorshipDeals, setSponsorshipDeals] = useState("");
  const [images, setImages] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill
  const [teams, setTeams] = useState([]);
  const [autoFillTeam, setAutoFillTeam] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);

  // Upgrade requests
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [acceptingId, setAcceptingId] = useState(null);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/stadium`), snap => {
      const d = snap.val();
      if (!d) return;
      setStadiumName(d.stadiumName || "");
      setCapacity(d.capacity || "");
      setLocation(d.location || "");
      setTicketPrice(d.ticketPrice || "");
      setVipTicketPrice(d.vipTicketPrice || "");
      setExpensesPerGame(d.expensesPerGame || "");
      setSponsorshipDeals(d.sponsorshipDeals || "");
      setImages(d.images || []);
      setVideoUrl(d.videoUrl || "");
    });

    // Load upgrade requests
    const reqUnsub = onValue(ref(db, `career_team_management/${team}/stadium/upgradeRequests`), snap => {
      const data = snap.val();
      if (data) {
        setUpgradeRequests(
          Object.entries(data)
            .map(([id, r]) => ({ id, ...r }))
            .filter(r => r.status === "pending")
            .sort((a, b) => b.createdAt - a.createdAt)
        );
      } else {
        setUpgradeRequests([]);
      }
    });

    return () => { unsub(); reqUnsub(); };
  }, [team]);

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const teamNames = [...new Set(Object.values(data).map(a => a.team).filter(Boolean))];
      setTeams(teamNames);
    });
    return () => unsub();
  }, []);

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = await Promise.all(files.map(f => uploadToImgBB(f)));
      setImages(prev => [...prev, ...urls]);
    } catch (e) {
      setError("Image upload failed: " + e.message);
    }
    setUploading(false);
  }

  function removeImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleAutoFill() {
    if (!autoFillTeam) return;
    setAutoFilling(true);
    setError("");
    try {
      const data = await fetchStadiumInfo(autoFillTeam);
      setStadiumName(data.stadiumName || "");
      setCapacity(data.capacity || "");
      setLocation(data.location || "");
      setTicketPrice(data.ticketPrice || "");
      setVipTicketPrice(data.vipTicketPrice || "");
      setExpensesPerGame(data.stadiumExpensesPerGame || "");
      setSponsorshipDeals(data.sponsorshipDeals || "");
    } catch (e) {
      setError("Auto-fill failed: " + e.message);
    }
    setAutoFilling(false);
  }

  async function handleAcceptUpgrade(req) {
    setAcceptingId(req.id);
    try {
      const amount = Number(req.amount);

      // Write expense transaction only — balance calculated from transactions
      await push(ref(db, `career_team_management/${team}/finance/transactions`), {
        type: "expense",
        category: "Stadium Upgrade",
        source: req.description || "Stadium Upgrade Request",
        amount,
        month: new Date().toLocaleString("default", { month: "long" }),
        monthIndex: new Date().getMonth(),
        year: new Date().getFullYear(),
        createdAt: Date.now(),
      });

      // Mark upgrade request as accepted
      await update(ref(db, `career_team_management/${team}/stadium/upgradeRequests/${req.id}`), {
        status: "accepted",
        acceptedAt: Date.now(),
      });
    } catch (e) {
      setError("Accept failed: " + e.message);
    }
    setAcceptingId(null);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await set(ref(db, `career_team_management/${team}/stadium`), {
        stadiumName,
        capacity,
        location,
        ticketPrice,
        vipTicketPrice,
        expensesPerGame,
        sponsorshipDeals,
        images,
        videoUrl,
        updatedAt: Date.now(),
      });
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError("Save failed: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", marginBottom: "8px", letterSpacing: "3px" }}>
        🏟️ STADIUM SETTINGS
      </h3>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", marginBottom: "28px" }}>
        Team: <span style={{ color: "#FF1493", fontWeight: 700 }}>{team}</span>
      </div>

      {/* Auto Fill */}
      <div style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "28px" }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", marginBottom: "4px" }}>⚡ Auto Fill Stadium Stats</div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", marginBottom: "14px" }}>AI will research and fill all stadium info automatically.</div>
        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Enter Team Name</label>
          <input
            value={autoFillTeam}
            onChange={e => setAutoFillTeam(e.target.value)}
            placeholder="e.g. Barcelona, Real Madrid, Arsenal..."
            style={inputStyle}
          />
        </div>
        <button onClick={handleAutoFill} disabled={!autoFillTeam || autoFilling} style={{
          width: "100%", padding: "16px", background: autoFilling ? "rgba(255,20,147,0.3)" : "#FF1493",
          border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.05rem",
          cursor: !autoFillTeam || autoFilling ? "not-allowed" : "pointer",
        }}>
          {autoFilling ? "🔍 AI Researching..." : "⚡ Auto Fill with AI"}
        </button>
      </div>

      {/* Images */}
      <div style={{ marginBottom: "24px" }}>
        <label style={labelStyle}>Stadium Images (Slideshow)</label>
        {images.length > 0 && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
            {images.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={url} alt="" style={{ width: "120px", height: "80px", objectFit: "cover", borderRadius: "10px", border: "1px solid rgba(255,20,147,0.3)" }} />
                <button onClick={() => removeImage(i)} style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem" }} />
        {uploading && <div style={{ color: "#FF1493", fontSize: "0.9rem", marginTop: "8px" }}>Uploading...</div>}
      </div>

      {/* Video URL */}
      <div style={{ marginBottom: "24px" }}>
        <label style={labelStyle}>Stadium Video URL (optional)</label>
        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Paste video URL" style={inputStyle} />
      </div>

      {/* Info fields */}
      {[
        ["Stadium Name", stadiumName, setStadiumName, "e.g. Camp Nou"],
        ["Capacity", capacity, setCapacity, "e.g. 99354"],
        ["Location", location, setLocation, "e.g. Barcelona, Spain"],
        ["Standard Ticket Price (€)", ticketPrice, setTicketPrice, "e.g. 65"],
        ["VIP Ticket Price (€)", vipTicketPrice, setVipTicketPrice, "e.g. 250"],
        ["Stadium Expenses Per Game (€)", expensesPerGame, setExpensesPerGame, "e.g. 500000"],
        ["Sponsorship Deals", sponsorshipDeals, setSponsorshipDeals, "e.g. €10,000,000/year"],
      ].map(([label, val, setter, placeholder]) => (
        <div key={label} style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>{label}</label>
          <input value={val} onChange={e => setter(e.target.value)} placeholder={placeholder} style={inputStyle} />
        </div>
      ))}

      {/* Upgrade Requests */}
      {upgradeRequests.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px", marginBottom: "14px" }}>
            🏗️ PENDING UPGRADE REQUESTS
          </div>
          {upgradeRequests.map(req => (
            <div key={req.id} style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: "14px", padding: "18px 20px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{team}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginTop: "4px" }}>
                    {new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  {req.description && (
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", marginTop: "8px", fontStyle: "italic" }}>
                      "{req.description}"
                    </div>
                  )}
                </div>
                <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "1px" }}>
                  €{Number(req.amount).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleAcceptUpgrade(req)}
                disabled={acceptingId === req.id}
                style={{ width: "100%", padding: "12px", background: acceptingId === req.id ? "rgba(0,255,136,0.2)" : "#00cc66", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: acceptingId === req.id ? "not-allowed" : "pointer" }}
              >
                {acceptingId === req.id ? "Processing..." : "✅ Accept & Deduct Funds"}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "16px", padding: "14px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>}

      {saved ? (
        <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "20px", background: "rgba(0,255,136,0.1)", borderRadius: "14px", fontSize: "1.1rem" }}>✅ Stadium Saved!</div>
      ) : (
        <div style={{ display: "flex", gap: "14px" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "18px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "💾 Save Stadium"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
