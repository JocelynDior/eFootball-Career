import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push } from "firebase/database";

function formatWithCommas(num) {
  if (!num) return "";
  const str = String(num).replace(/,/g, "");
  if (isNaN(str) || str === "") return "";
  return Number(str).toLocaleString("en-US");
}

function parseCommaValue(str) {
  return str ? Number(str.replace(/,/g, "")) : 0;
}

export default function BuySellModal({ mode, manager, onClose }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [manualTeam, setManualTeam] = useState("");
  const [isManualTeam, setIsManualTeam] = useState(false);
  const [squadPlayers, setSquadPlayers] = useState([]);
  const [selectedPlayerName, setSelectedPlayerName] = useState("");
  const [manualPlayerName, setManualPlayerName] = useState("");
  const [isManualPlayer, setIsManualPlayer] = useState(false);
  const [buyType, setBuyType] = useState("transfer"); // "transfer" | "freeAgent"
  const [bidAmount, setBidAmount] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [buyOptionClause, setBuyOptionClause] = useState("");
  const [addOns, setAddOns] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [windowOpen, setWindowOpen] = useState(true);
  const [windowLoading, setWindowLoading] = useState(true);

  // Check transfer window status
  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/transferWindowOpen`), snap => {
      const val = snap.val();
      setWindowOpen(val === null || val === undefined ? true : !!val);
      setWindowLoading(false);
    });
    return () => unsub();
  }, []);

  // Load teams from Firebase accounts — read only, never write
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), (snap) => {
      const data = snap.val() || {};
      const allTeams = Object.values(data)
        .filter((a) => a.team && a.team !== manager?.team)
        .map((a) => a.team);
      setTeams([...new Set(allTeams)]);
    });
    return () => unsub();
  }, [manager]);

  // Load squad for selected Firebase team only — manual team has no squad to load
  useEffect(() => {
    if (isManualTeam) { setSquadPlayers([]); setSelectedPlayerName(""); return; }
    if (!selectedTeam) { setSquadPlayers([]); setSelectedPlayerName(""); return; }
    const unsub = onValue(ref(db, `career_team_management/${selectedTeam}/squad`), (snap) => {
      const data = snap.val();
      setSquadPlayers(data ? Object.values(data).map((p) => p.name).filter(Boolean) : []);
      setSelectedPlayerName("");
      setIsManualPlayer(false);
      setManualPlayerName("");
    });
    return () => unsub();
  }, [selectedTeam, isManualTeam]);

  const handleTeamSelect = (e) => {
    const val = e.target.value;
    if (val === "__manual_team__") { setIsManualTeam(true); setSelectedTeam(""); }
    else { setIsManualTeam(false); setSelectedTeam(val); setManualTeam(""); }
  };

  const handlePlayerSelect = (e) => {
    const val = e.target.value;
    if (val === "__manual_player__") { setIsManualPlayer(true); setSelectedPlayerName(""); }
    else { setIsManualPlayer(false); setSelectedPlayerName(val); }
  };

  async function handleSubmit() {
    // Use manual team name as label only — never written to Firebase as a club
    const team = isManualTeam ? manualTeam.trim() : selectedTeam;
    const player = isManualPlayer ? manualPlayerName.trim() : selectedPlayerName;
    if (!team) { setError("Please select or enter a team."); return; }
    if (!player) { setError("Please select or enter a player name."); return; }

    const isFreeAgent = mode === "buy" && buyType === "freeAgent";

    if (mode === "buy" && !isFreeAgent) {
      const amount = parseCommaValue(bidAmount);
      if (amount <= 0) { setError("Please enter a valid bid amount."); return; }
    }
    if (mode === "loan") {
      const amount = parseCommaValue(loanAmount);
      if (amount <= 0) { setError("Please enter a valid loan fee."); return; }
    }

    setSending(true); setError("");
    try {
      const offer = {
        type: isFreeAgent ? "freeAgent" : mode,
        playerName: player,
        // playerClub used as display label only — manual teams are never registered clubs
        playerClub: team,
        toClub: team,
        fromClub: manager.team,
        fromManagerUid: manager.uid,
        fromManagerName: manager.username,
        status: "pending",
        createdAt: Date.now(),
      };

      if (isFreeAgent) {
        offer.offerAmount = "€0";
        if (addOns.trim()) offer.addOns = addOns.trim();
      } else if (mode === "buy") {
        offer.offerAmount = `€${formatWithCommas(bidAmount)}`;
        if (addOns.trim()) offer.addOns = addOns.trim();
      } else {
        offer.loanAmount = `€${formatWithCommas(loanAmount)}`;
        offer.loanTerm = "1 Season";
        if (buyOptionClause) offer.buyOptionClause = `€${formatWithCommas(buyOptionClause)}`;
        if (addOns.trim()) offer.addOns = addOns.trim();
      }

      await push(ref(db, `${PATHS.transfers}/negotiations`), offer);
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError("Network error, please try again.");
    }
    setSending(false);
  }

  const inputStyle = {
    width: "100%", padding: "14px 18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.35)",
    borderRadius: "12px", color: "#fff",
    fontFamily: "inherit", fontSize: "1.1rem",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    color: "rgba(255,255,255,0.65)", fontSize: "0.9rem",
    display: "block", marginBottom: "6px",
    textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700,
  };
  const handleNumberInput = (setter) => (e) => {
    const raw = e.target.value.replace(/,/g, "");
    if (raw === "" || /^\d+$/.test(raw)) setter(formatWithCommas(raw));
  };

  const isFreeAgent = mode === "buy" && buyType === "freeAgent";

  if (windowLoading) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)", fontSize: "1.2rem" }}>
      Checking transfer window status...
    </div>
  );

  if (!windowOpen) return (
    <div style={{ fontFamily: "'Inter', sans-serif", textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🔒</div>
      <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", marginBottom: "12px" }}>
        TRANSFER WINDOW CLOSED
      </div>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.1rem", marginBottom: "32px", lineHeight: 1.6 }}>
        The transfer window is currently closed.<br />No new offers can be submitted at this time.
      </div>
      <button onClick={onClose} style={{ padding: "16px 48px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", fontSize: "1.1rem", cursor: "pointer" }}>
        Close
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: mode === "buy" ? "#00cc66" : "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "3px", marginBottom: "4px" }}>
        {mode === "buy" ? "💰 BUY PLAYER" : "🔄 LOAN PLAYER"}
      </h3>
      <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "24px", fontSize: "1rem" }}>
        Send an offer to the selling club.
      </p>

      {success ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#00ff88", fontWeight: 700, fontSize: "1.4rem", background: "rgba(0,255,136,0.08)", borderRadius: "16px" }}>
          ✅ Offer sent!
        </div>
      ) : (
        <>
          {/* Buy type toggle — only shown in buy mode */}
          {mode === "buy" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Transfer Type</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setBuyType("transfer")}
                  style={{
                    flex: 1, padding: "12px",
                    background: buyType === "transfer" ? "#00cc66" : "rgba(255,255,255,0.06)",
                    border: buyType === "transfer" ? "none" : "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                  }}
                >
                  💸 Transfer
                </button>
                <button
                  onClick={() => setBuyType("freeAgent")}
                  style={{
                    flex: 1, padding: "12px",
                    background: buyType === "freeAgent" ? "rgba(0,200,255,0.3)" : "rgba(255,255,255,0.06)",
                    border: buyType === "freeAgent" ? "1px solid rgba(0,200,255,0.6)" : "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                  }}
                >
                  🆓 Free Agent
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Select Team</label>
            <select value={isManualTeam ? "__manual_team__" : selectedTeam} onChange={handleTeamSelect} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Choose a team —</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
              <option value="__manual_team__">✏️ Enter different team…</option>
            </select>
          </div>

          {isManualTeam && (
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Team Name</label>
              <input value={manualTeam} onChange={(e) => setManualTeam(e.target.value)} placeholder="Type team name…" style={inputStyle} />
            </div>
          )}

          {(selectedTeam || isManualTeam) && (
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Select Player</label>
              {isManualTeam ? (
                // Manual team — no squad to load, always type manually
                <input value={manualPlayerName} onChange={(e) => setManualPlayerName(e.target.value)} placeholder="Type player name…" style={inputStyle} />
              ) : (
                <select value={isManualPlayer ? "__manual_player__" : selectedPlayerName} onChange={handlePlayerSelect} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">— Choose a player —</option>
                  {squadPlayers.map((p) => <option key={p} value={p}>{p}</option>)}
                  <option value="__manual_player__">✏️ Enter different player…</option>
                </select>
              )}
            </div>
          )}

          {!isManualTeam && isManualPlayer && (
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Player Name</label>
              <input value={manualPlayerName} onChange={(e) => setManualPlayerName(e.target.value)} placeholder="Type player name…" style={inputStyle} />
            </div>
          )}

          {/* Fee fields — hidden for free agent */}
          {!isFreeAgent && (
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>{mode === "buy" ? "Your Bid (€)" : "Loan Fee (€)"}</label>
              <input
                value={mode === "buy" ? bidAmount : loanAmount}
                onChange={mode === "buy" ? handleNumberInput(setBidAmount) : handleNumberInput(setLoanAmount)}
                placeholder="e.g. 10,000,000"
                style={inputStyle}
              />
            </div>
          )}

          {isFreeAgent && (
            <div style={{ marginBottom: "18px", padding: "12px 16px", background: "rgba(0,200,255,0.06)", border: "1px solid rgba(0,200,255,0.2)", borderRadius: "12px" }}>
              <div style={{ color: "rgba(0,200,255,0.8)", fontSize: "0.95rem", fontWeight: 700 }}>🆓 Free Agent — No transfer fee required</div>
            </div>
          )}

          {mode === "loan" && (
            <>
              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Loan Term</label>
                <div style={{ ...inputStyle, background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)", cursor: "default" }}>1 Season (fixed)</div>
              </div>
              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Buy Option Clause <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></label>
                <input value={buyOptionClause} onChange={handleNumberInput(setBuyOptionClause)} placeholder="e.g. 15,000,000" style={inputStyle} />
              </div>
            </>
          )}

          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Add Ons <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></label>
            <input value={addOns} onChange={(e) => setAddOns(e.target.value)} placeholder="e.g. Performance bonuses, appearance fees, etc." style={inputStyle} />
          </div>

          {error && (
            <div style={{ color: "#ff6b6b", fontSize: "0.95rem", marginBottom: "16px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>❌ {error}</div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleSubmit}
              disabled={sending}
              style={{
                flex: 2, padding: "16px",
                background: mode === "buy" ? "#00cc66" : "#ffaa44",
                border: "none", borderRadius: "14px", color: "#fff",
                fontWeight: 700, fontSize: "1.1rem",
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? "Sending..." : "🚀 Send Offer"}
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
