import { useState } from "react";

// ─── LEAGUES (from LeagueGrid) ────────────────────────────────────────────
const LEAGUES = [
  { id: "premier", name: "Premier League", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "laliga", name: "La Liga", emoji: "🇪🇸" },
  { id: "seriea", name: "Serie A", emoji: "🇮🇹" },
  { id: "bundesliga", name: "Bundesliga", emoji: "🇩🇪" },
  { id: "ligue1", name: "Ligue 1", emoji: "🇫🇷" },
  { id: "ucl", name: "Champions League", emoji: "⭐" },
  { id: "uel", name: "Europa League", emoji: "🟠" },
  { id: "cwc", name: "Club World Cup", emoji: "🌍" },
  { id: "sc", name: "UEFA Super Cup", emoji: "🥇" },
  { id: "tokyo", name: "Tokyo Off Season", emoji: "🗼" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────
function getPreviousSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Football season: if before July (month < 6), previous season is (year-2)/(year-1)
  const endYear = month < 6 ? year - 1 : year;
  const startYear = endYear - 1;
  return { label: `${startYear}/${String(endYear).slice(2)}`, startYear, endYear };
}

function formatAmount(num) {
  if (!num || isNaN(num)) return "";
  if (num >= 1_000_000_000) return `€${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `€${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `€${(num / 1_000).toFixed(0)}K`;
  return `€${Number(num).toLocaleString()}`;
}

// ─── WIKIPEDIA SEARCH UTILITIES ───────────────────────────────────────────

// Extract a money value (€, £, $, M, B, K) from a text string
function extractMoneyValue(text) {
  if (!text) return null;
  // Match patterns like €45.3 million, £120m, $2.1 billion, 450,000,000
  const patterns = [
    /[€£$]?\s*([\d,]+(?:\.\d+)?)\s*billion/gi,
    /[€£$]?\s*([\d,]+(?:\.\d+)?)\s*bn/gi,
    /[€£$]?\s*([\d,]+(?:\.\d+)?)\s*million/gi,
    /[€£$]?\s*([\d,]+(?:\.\d+)?)\s*m\b/gi,
    /[€£$]?\s*([\d,]+(?:\.\d+)?)\s*thousand/gi,
    /[€£$]?\s*([\d,]+(?:\.\d+)?)\s*k\b/gi,
    /[€£$]([\d,]+(?:\.\d+)?)/g,
  ];

  const multipliers = {
    billion: 1_000_000_000, bn: 1_000_000_000,
    million: 1_000_000, m: 1_000_000,
    thousand: 1_000, k: 1_000,
  };

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const raw = match[1]?.replace(/,/g, "");
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        // Find multiplier keyword in the full match
        const fullMatch = match[0].toLowerCase();
        for (const [keyword, mult] of Object.entries(multipliers)) {
          if (fullMatch.includes(keyword)) return Math.round(num * mult);
        }
        // Bare currency symbol match
        if (num > 1000) return Math.round(num);
      }
    }
  }
  return null;
}

// Search Wikipedia and try to extract a relevant money figure
async function searchWikipedia(query) {
  try {
    // 1. Search for the page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const results = searchData?.query?.search;
    if (!results || results.length === 0) return { found: false };

    // 2. Get extract of the top result
    const pageTitle = results[0].title;
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&exintro=false&explaintext=true&format=json&origin=*`;
    const extractRes = await fetch(extractUrl);
    const extractData = await extractRes.json();
    const pages = extractData?.query?.pages;
    const page = pages ? Object.values(pages)[0] : null;
    if (!page || !page.extract) return { found: false, pageTitle };

    const extract = page.extract;
    const amount = extractMoneyValue(extract);

    return {
      found: !!amount,
      amount,
      pageTitle,
      snippet: extract.slice(0, 400) + "...",
      wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
    };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

// ─── WIKI SEARCH MODAL ────────────────────────────────────────────────────
// Props:
//   mode: "broadcasting" | "shirt_sales"
//   team: string (club name)
//   onConfirm(amount): called with the final amount (number)
//   onClose(): called to dismiss
export default function WikiSearchModal({ mode, team, onConfirm, onClose }) {
  const season = getPreviousSeason();
  const [selectedLeague, setSelectedLeague] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null); // { found, amount, pageTitle, snippet, wikiUrl }
  const [manualAmount, setManualAmount] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState("");

  const isBroadcasting = mode === "broadcasting";

  async function handleSearch() {
    if (isBroadcasting && !selectedLeague) {
      setError("Please select a league first.");
      return;
    }
    setSearching(true);
    setError("");
    setResult(null);
    setShowManual(false);

    const leagueName = isBroadcasting
      ? LEAGUES.find(l => l.id === selectedLeague)?.name || selectedLeague
      : null;

    const query = isBroadcasting
      ? `${team} ${leagueName} broadcasting revenue ${season.startYear} ${season.endYear}`
      : `${team} shirt kit sales revenue ${season.startYear} ${season.endYear}`;

    const res = await searchWikipedia(query);
    setResult(res);

    if (res.found && res.amount) {
      setEditAmount(String(res.amount));
    } else {
      setShowManual(true);
    }
    setSearching(false);
  }

  function handleConfirm() {
    const amt = result?.found ? Number(editAmount) : Number(manualAmount);
    if (!amt || amt <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    onConfirm(amt);
  }

  function handleRetry() {
    setResult(null);
    setShowManual(false);
    setEditAmount("");
    setManualAmount("");
    setError("");
    handleSearch();
  }

  const GLASS = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,20,147,0.2)",
  };

  const inputStyle = {
    width: "100%", padding: "16px 20px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.35)",
    borderRadius: "14px", color: "#fff",
    fontFamily: "inherit", fontSize: "1.1rem",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle = {
    color: "rgba(255,255,255,0.65)", fontSize: "0.95rem",
    display: "block", marginBottom: "8px",
    textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "540px", width: "100%", position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "2.6rem", marginBottom: "8px" }}>{isBroadcasting ? "📡" : "👕"}</div>
          <h3 style={{ color: "#ffffff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px", margin: "0 0 6px" }}>
            {isBroadcasting ? "BROADCASTING REVENUE" : "SHIRT SALES REVENUE"}
          </h3>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: "0.95rem" }}>
            Wikipedia search · {team} · {season.label} season
          </p>
        </div>

        {/* League dropdown (broadcasting only) */}
        {isBroadcasting && (
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Select League</label>
            <select
              value={selectedLeague}
              onChange={e => setSelectedLeague(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">— Choose a league —</option>
              {LEAGUES.map(l => (
                <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search button */}
        {!result && (
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              width: "100%", padding: "18px",
              background: searching ? "rgba(255,20,147,0.3)" : "rgba(255,20,147,0.8)",
              border: "1px solid rgba(255,20,147,0.6)",
              borderRadius: "14px", color: "#fff",
              fontWeight: 700, fontSize: "1.2rem",
              cursor: searching ? "not-allowed" : "pointer",
              marginBottom: "16px", transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            }}
          >
            {searching ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: "1.2rem" }}>⟳</span>
                Searching Wikipedia...
              </>
            ) : (
              <>🔍 Search Wikipedia</>
            )}
          </button>
        )}

        {/* Result — found */}
        {result?.found && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: "14px", padding: "16px 20px", marginBottom: "16px" }}>
              <div style={{ color: "#00ff88", fontWeight: 700, fontSize: "1rem", marginBottom: "6px" }}>
                ✅ Found: {result.pageTitle}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                {result.snippet}
              </div>
              {result.wikiUrl && (
                <a href={result.wikiUrl} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,20,147,0.8)", fontSize: "0.85rem", marginTop: "8px", display: "inline-block" }}>
                  View on Wikipedia ↗
                </a>
              )}
            </div>

            <label style={labelStyle}>Auto-filled Amount (editable)</label>
            <input
              value={editAmount}
              onChange={e => setEditAmount(e.target.value)}
              type="number"
              min="0"
              style={inputStyle}
            />
            {editAmount && Number(editAmount) > 0 && (
              <div style={{ color: "#00ff88", fontWeight: 700, fontSize: "1rem", marginTop: "6px" }}>
                {formatAmount(Number(editAmount))}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                onClick={handleRetry}
                style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
              >
                🔄 Retry Search
              </button>
              <button
                onClick={() => { setShowManual(true); setResult(null); }}
                style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "1rem" }}
              >
                ✏️ Manual Input
              </button>
            </div>
          </div>
        )}

        {/* Result — not found / manual */}
        {(result && !result.found || showManual) && (
          <div style={{ marginBottom: "20px" }}>
            {result && !result.found && (
              <div style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.25)", borderRadius: "14px", padding: "14px 18px", marginBottom: "16px" }}>
                <div style={{ color: "#ffaa44", fontWeight: 700, fontSize: "0.95rem" }}>
                  ⚠️ Wikipedia couldn't find a specific figure for {team}{isBroadcasting && selectedLeague ? ` in ${LEAGUES.find(l => l.id === selectedLeague)?.name}` : ""} ({season.label}).
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Enter the amount manually or retry with a different search.
                </div>
              </div>
            )}

            <label style={labelStyle}>Enter Amount Manually (€)</label>
            <input
              value={manualAmount}
              onChange={e => setManualAmount(e.target.value)}
              type="number"
              min="0"
              placeholder="e.g. 45000000"
              style={inputStyle}
            />
            {manualAmount && Number(manualAmount) > 0 && (
              <div style={{ color: "#00ff88", fontWeight: 700, fontSize: "1rem", marginTop: "6px" }}>
                {formatAmount(Number(manualAmount))}
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={searching}
              style={{ marginTop: "12px", width: "100%", padding: "14px", background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
            >
              {searching ? "⟳ Searching..." : "🔄 Retry Wikipedia Search"}
            </button>
          </div>
        )}

        {error && (
          <div style={{ color: "#ff6b6b", fontSize: "0.95rem", marginBottom: "14px", padding: "12px 16px", background: "rgba(255,0,0,0.08)", borderRadius: "10px" }}>
            {error}
          </div>
        )}

        {/* Confirm / Cancel */}
        {(result?.found || showManual) && (
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={handleConfirm}
              style={{ flex: 2, padding: "18px", background: "#ff1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: "pointer" }}
            >
              ✅ Use This Amount
            </button>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}
            >
              Cancel
            </button>
          </div>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
