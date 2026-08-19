import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";
import { fetchPlayerStats } from "../utils/groq";

const TABS = ["topTargets", "listed", "scouts", "signings", "auction"];
const TAB_LABELS = {
  topTargets: "Top Targets",
  listed: "Listed",
  scouts: "Scouts",
  signings: "Signings",
  auction: "Auction",
};

const inputStyle = {
  width: "100%", padding: "12px 16px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "12px", color: "#fff",
  fontFamily: "inherit", fontSize: "0.95rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  color: "rgba(255,255,255,0.55)", fontSize: "0.75rem",
  display: "block", marginBottom: "6px",
  textTransform: "uppercase", letterSpacing: "0.8px",
};

export default function AddPlayerModal({ onClose, defaultTab = "topTargets" }) {
  const [searchName, setSearchName] = useState("");
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const [price, setPrice] = useState("");
  const [contractLength, setContractLength] = useState("1");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSearch() {
    if (!searchName.trim()) return;
    setSearching(true);
    setError("");
    setStats(null);
    try {
      const data = await fetchPlayerStats(searchName.trim());
      setStats(data);
      setPrice(data.value?.replace(/[^0-9]/g, "") || "");
    } catch (e) {
      setError(`Error: ${e.message || "Unknown error"} | API Key loaded: ${!!import.meta.env.VITE_Career_Groq1}`);
    }
    setSearching(false);
  }

  function handleImageChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    const r = new FileReader();
    r.onload = ev => setImagePreview(ev.target.result);
    r.readAsDataURL(f);
  }

  async function handleSave() {
    if (!stats) return;
    setSaving(true);
    try {
      let imageUrl = "";
      if (imageFile) imageUrl = await uploadToImgBB(imageFile);

      const playerData = {
        ...stats,
        price: price ? `€${Number(price).toLocaleString()}` : stats.value,
        value: stats.value,
        contractLength,
        imageUrl,
        videoUrl: videoUrl.trim(),
        tab: selectedTab,
        createdAt: Date.now(),
        bids: {},
      };

      await push(ref(db, `${PATHS.transfers}/${selectedTab}`), playerData);
      setSaved(true);
      setTimeout(onClose, 1000);
    } catch (e) {
      setError("Save failed: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginBottom: "20px", letterSpacing: "2px" }}>
        ➕ Add Player
      </h3>

      {/* Tab selector */}
      <div style={{ marginBottom: "20px" }}>
        <label style={labelStyle}>Add to Tab</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setSelectedTab(t)} style={{
              padding: "8px 16px", borderRadius: "20px", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
              background: selectedTab === t ? "#FF1493" : "rgba(255,20,147,0.1)",
              border: `1px solid ${selectedTab === t ? "#FF1493" : "rgba(255,20,147,0.3)"}`,
              color: "#fff", transition: "all 0.2s",
            }}>{TAB_LABELS[t]}</button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <input
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Player name (e.g. Lamine Yamal)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleSearch} disabled={searching} style={{
          padding: "12px 24px", background: "#FF1493", border: "none",
          borderRadius: "12px", color: "#fff", fontWeight: 700,
          cursor: searching ? "not-allowed" : "pointer", whiteSpace: "nowrap",
          opacity: searching ? 0.7 : 1,
        }}>
          {searching ? "Searching..." : "🔍 Search"}
        </button>
      </div>

      {error && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: "12px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "8px" }}>{error}</div>}

      {/* Stats display */}
      {stats && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                ["Name", stats.name], ["Age", stats.age],
                ["Club", stats.club], ["Nationality", stats.nationality],
                ["Position", stats.position], ["Overall", stats.overall],
                ["Squad #", stats.squadNumber], ["Weekly Wage", stats.weeklyWage],
                ["Value", stats.value], ["Contract End", stats.contractEnd],
                ["Foot", stats.preferredFoot], ["Height", stats.height],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{val || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom price override */}
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Listed Price (€) — AI suggested: {stats.value}</label>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Override price in €" style={inputStyle} type="number" />
          </div>

          {/* Contract length */}
          {selectedTab !== "auction" && (
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Max Contract Length</label>
              <select value={contractLength} onChange={e => setContractLength(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
              </select>
            </div>
          )}

          {/* Image upload */}
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Player Image (ImgBB)</label>
            {imagePreview && <img src={imagePreview} alt="" style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "12px", marginBottom: "8px" }} />}
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", display: "block" }} />
          </div>

          {/* Video URL */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Player Video URL (Cloudinary)</label>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Paste Cloudinary video URL" style={inputStyle} />
          </div>

          {saved ? (
            <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "14px", background: "rgba(0,255,136,0.1)", borderRadius: "12px" }}>✅ Player Added!</div>
          ) : (
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save Player"}
              </button>
              <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
