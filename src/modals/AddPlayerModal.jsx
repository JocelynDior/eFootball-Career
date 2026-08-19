import { useState } from "react";
import { db, PATHS } from "../firebase";
import { ref, push } from "firebase/database";
import { uploadToImgBB } from "../utils/imgUpload";
import { fetchPlayerStats, fetchTop50Players } from "../utils/groq";

const TABS = ["topTargets", "listed", "scouts", "signings", "auction"];
const TAB_LABELS = {
  topTargets: "Top Targets",
  listed: "Listed",
  scouts: "Scouts",
  signings: "Signings",
  auction: "Auction",
};

const inputStyle = {
  width: "100%", padding: "18px 20px",
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

export default function AddPlayerModal({ onClose, defaultTab = "topTargets", isAdmin = false }) {
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

  // Top 50 batch state
  const [loadingTop50, setLoadingTop50] = useState(false);
  const [top50Progress, setTop50Progress] = useState("");
  const [top50Done, setTop50Done] = useState(false);
  const [top50Count, setTop50Count] = useState(0);

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

  async function handleLoadTop50() {
    setLoadingTop50(true);
    setTop50Done(false);
    setTop50Count(0);
    setError("");
    try {
      const players = await fetchTop50Players((start, end) => {
        setTop50Progress(`Fetching players ${start}–${end}...`);
      });

      let saved = 0;
      for (const player of players) {
        await push(ref(db, `${PATHS.transfers}/topTargets`), {
          ...player,
          price: player.value,
          tab: "topTargets",
          createdAt: Date.now(),
          bids: {},
        });
        saved++;
        setTop50Count(saved);
      }
      setTop50Done(true);
      setTop50Progress(`✅ ${saved} players loaded into Top Targets!`);
    } catch (e) {
      setError(`Top 50 error: ${e.message}`);
    }
    setLoadingTop50(false);
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
      setTimeout(onClose, 1200);
    } catch (e) {
      setError("Save failed: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", marginBottom: "28px", letterSpacing: "3px" }}>
        ➕ ADD PLAYER
      </h3>

      {/* Tab selector */}
      <div style={{ marginBottom: "28px" }}>
        <label style={labelStyle}>Add to Tab</label>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setSelectedTab(t)} style={{
              padding: "12px 22px", borderRadius: "24px", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, fontSize: "1rem",
              background: selectedTab === t ? "#FF1493" : "rgba(255,20,147,0.1)",
              border: `1px solid ${selectedTab === t ? "#FF1493" : "rgba(255,20,147,0.3)"}`,
              color: "#fff", transition: "all 0.2s",
            }}>{TAB_LABELS[t]}</button>
          ))}
        </div>
      </div>

      {/* Load Top 50 — admin only */}
      {isAdmin && (
        <div style={{ marginBottom: "28px", padding: "20px", background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", marginBottom: "12px" }}>🌍 Load Top 50 Most Expensive Players</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", marginBottom: "16px" }}>Automatically fetches and saves today's top 50 most valuable players into Top Targets. This replaces the current list.</div>

          {loadingTop50 && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>{top50Progress}</div>
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, #FF1493, #ff69b4)", width: `${(top50Count / 50) * 100}%`, transition: "width 0.3s", borderRadius: "8px" }} />
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: "6px" }}>{top50Count}/50 players saved</div>
            </div>
          )}

          {top50Done && (
            <div style={{ color: "#00ff88", fontWeight: 700, fontSize: "1rem", marginBottom: "12px" }}>{top50Progress}</div>
          )}

          <button
            onClick={handleLoadTop50}
            disabled={loadingTop50}
            style={{
              padding: "16px 28px", background: loadingTop50 ? "rgba(255,20,147,0.3)" : "linear-gradient(135deg, #FF1493, #cc0077)",
              border: "none", borderRadius: "14px", color: "#fff",
              fontWeight: 700, fontSize: "1.05rem", cursor: loadingTop50 ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            {loadingTop50 ? `Loading... (${top50Count}/50)` : "🚀 Load Top 50 Players"}
          </button>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,20,147,0.2)", marginBottom: "28px" }} />

      {/* Manual Search */}
      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>Or Search Manually</div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <input
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Player name (e.g. Lamine Yamal)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleSearch} disabled={searching} style={{
          padding: "18px 28px", background: "#FF1493", border: "none",
          borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.05rem",
          cursor: searching ? "not-allowed" : "pointer", whiteSpace: "nowrap",
          opacity: searching ? 0.7 : 1,
        }}>
          {searching ? "Searching..." : "🔍 Search"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "16px", padding: "14px", background: "rgba(255,0,0,0.1)", borderRadius: "12px", lineHeight: 1.5 }}>{error}</div>
      )}

      {/* Stats display */}
      {stats && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "18px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {[
                ["Name", stats.name], ["Age", stats.age],
                ["Club", stats.club], ["Nationality", stats.nationality],
                ["Position", stats.position], ["Overall", stats.overall],
                ["Squad #", stats.squadNumber], ["Weekly Wage", stats.weeklyWage],
                ["Value", stats.value], ["Contract End", stats.contractEnd],
                ["Foot", stats.preferredFoot], ["Height", stats.height],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{val || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Listed Price (€) — AI suggested: {stats.value}</label>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Override price in €" style={inputStyle} type="number" />
          </div>

          {selectedTab !== "auction" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Max Contract Length</label>
              <select value={contractLength} onChange={e => setContractLength(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Player Image (ImgBB)</label>
            {imagePreview && <img src={imagePreview} alt="" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "14px", marginBottom: "10px" }} />}
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", display: "block" }} />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Player Video URL (Cloudinary)</label>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Paste Cloudinary video URL" style={inputStyle} />
          </div>

          {saved ? (
            <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "18px", background: "rgba(0,255,136,0.1)", borderRadius: "14px", fontSize: "1.1rem" }}>✅ Player Added!</div>
          ) : (
            <div style={{ display: "flex", gap: "14px" }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "18px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save Player"}
              </button>
              <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
