import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, push, onValue, get, update, remove, set } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const MIN_BID_INCREMENT = 5_000_000;

function formatAmt(n) {
  if (!n && n !== 0) return "€0";
  if (n >= 1_000_000_000) return `€${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${Number(n).toLocaleString()}`;
}

function parseRaw(str) {
  if (!str && str !== 0) return 0;
  return Number(String(str).replace(/[^0-9.]/g, "")) || 0;
}

function useCountdown(deadlineTs) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });
  useEffect(() => {
    function tick() {
      const diff = (deadlineTs || 0) - Date.now();
      if (diff <= 0) { setTime({ d: 0, h: 0, m: 0, s: 0, expired: true }); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ d, h, m, s, expired: false });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineTs]);
  return time;
}

async function settleAuction(player, playerId) {
  try {
    const bidsSnap = await get(ref(db, `${PATHS.transfers}/auction/${playerId}/bids`));
    const bidsData = bidsSnap.val();
    if (!bidsData) return;
    const bids = Object.values(bidsData).sort((a, b) => (b.bidAmountRaw || 0) - (a.bidAmountRaw || 0));
    const winner = bids[0];
    if (!winner) return;

    const cardSnap = await get(ref(db, `${PATHS.transfers}/auction/${playerId}`));
    if (cardSnap.val()?.settled) return;

    await update(ref(db, `${PATHS.transfers}/auction/${playerId}`), {
      settled: true,
      winnerId: winner.fromManagerUid,
      winnerClub: winner.fromClub,
      winnerName: winner.fromManagerName,
      winningBid: winner.bidAmountRaw,
    });

    const amt = winner.bidAmountRaw || 0;
    const now = new Date();
    const monthIndex = now.getMonth();
    const monthName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][monthIndex];
    const year = now.getFullYear();
    const buyingClub = winner.fromClub;
    const sellingClub = player.club;
    const playerName = player.name;

    if (buyingClub && amt > 0) {
      await push(ref(db, `career_team_management/${buyingClub}/finance/transactions`), {
        type: "expense", category: "Player Purchase",
        source: playerName, amount: amt,
        month: monthName, monthIndex, year, createdAt: Date.now(),
      });
    }
    if (sellingClub && amt > 0) {
      await push(ref(db, `career_team_management/${sellingClub}/finance/transactions`), {
        type: "income", category: "Player Sales",
        source: playerName, amount: amt,
        month: monthName, monthIndex, year, createdAt: Date.now(),
      });
    }

    const sellingSnap = await get(ref(db, `career_team_management/${sellingClub}/squad`));
    const sellingData = sellingSnap.val();
    if (sellingData) {
      for (const [key, p] of Object.entries(sellingData)) {
        if (p.name === playerName) {
          await remove(ref(db, `career_team_management/${sellingClub}/squad/${key}`));
          const { loanStatus, loanClub, loanFrom, ...cleanPlayer } = p;
          await push(ref(db, `career_team_management/${buyingClub}/squad`), cleanPlayer);
          break;
        }
      }
    }
  } catch (e) {
    console.error("Auction settle error:", e);
  }
}

export default function AuctionBidModal({ player, playerId, onClose, isAdmin }) {
  const { manager } = useAdmin();
  const [bids, setBids] = useState([]);
  const [deadline, setDeadline] = useState(null);
  const [bidInput, setBidInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [adminImageUrl, setAdminImageUrl] = useState(player.imageUrl || "");
  const [adminValue, setAdminValue] = useState(player.value || "");
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [resettingTimer, setResettingTimer] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [cancellingBid, setCancellingBid] = useState(null);
  const [settled, setSettled] = useState(player.settled || false);

  const countdown = useCountdown(deadline);

  useEffect(() => {
    if (!playerId) return;
    const unsub = onValue(ref(db, `${PATHS.transfers}/auction/${playerId}/bids`), snap => {
      const data = snap.val();
      if (data) {
        setBids(Object.entries(data).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => (b.bidAmountRaw || 0) - (a.bidAmountRaw || 0)));
      } else {
        setBids([]);
      }
    });
    const dlUnsub = onValue(ref(db, `${PATHS.globalSettings}/auctionDeadline`), snap => {
      setDeadline(snap.val() || null);
    });
    const settledUnsub = onValue(ref(db, `${PATHS.transfers}/auction/${playerId}/settled`), snap => {
      setSettled(snap.val() || false);
    });
    return () => { unsub(); dlUnsub(); settledUnsub(); };
  }, [playerId]);

  // Only auto-settle if NOT admin-reset (settled flag check handles this)
  useEffect(() => {
    if (countdown.expired && !settled && playerId && bids.length > 0) {
      settleAuction(player, playerId);
    }
  }, [countdown.expired]);

  const leadingBid = bids[0] || null;
  const leadingRaw = leadingBid ? (leadingBid.bidAmountRaw || 0) : parseRaw(player.startingBid || player.value);
  const minNextBid = leadingRaw + MIN_BID_INCREMENT;
  // Auction is only considered expired/closed if the timer ran out AND it has been settled.
  // If admin resets (clears settled), the auction is open again even if the global deadline passed.
  const isExpired = countdown.expired && !!settled;
  const interestedCount = [...new Set(bids.map(b => b.fromManagerUid))].length;

  async function handleBid() {
    if (!manager) { setError("You must be logged in."); return; }
    const amt = parseRaw(bidInput);
    if (!amt || amt < minNextBid) {
      setError(`Minimum bid is ${formatAmt(minNextBid)} (leading bid + €5M).`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const bidData = {
        type: "auction",
        playerName: player.name,
        playerClub: player.club,
        playerId,
        bidAmount: `€${Number(amt).toLocaleString()}`,
        bidAmountRaw: amt,
        fromManagerUid: manager.uid,
        fromManagerName: manager.username,
        fromClub: manager.team || "Unknown Club",
        status: "pending",
        createdAt: Date.now(),
      };
      await push(ref(db, `${PATHS.transfers}/auction/${playerId}/bids`), bidData);
      await push(ref(db, `${PATHS.transfers}/negotiations`), bidData);
      setBidInput("");
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (e) {
      setError("Failed: " + e.message);
    }
    setSubmitting(false);
  }

  async function handleAdminSave() {
    setSavingAdmin(true);
    try {
      await update(ref(db, `${PATHS.transfers}/auction/${playerId}`), {
        imageUrl: adminImageUrl,
        value: adminValue,
      });
    } catch (e) { console.error(e); }
    setSavingAdmin(false);
  }

  // Reset timer: reads the current global auctionDeadline (set via + icon),
  // applies it to this auction by clearing settled and keeping the global timer alive.
  async function handleResetTimer() {
    setResettingTimer(true);
    setResetMsg("");
    try {
      const snap = await get(ref(db, `${PATHS.globalSettings}/auctionDeadline`));
      const currentGlobalDeadline = snap.val();
      if (!currentGlobalDeadline) {
        setResetMsg("⚠️ No timer set. Use the + icon in the navbar to set an Auction Deadline first.");
        setResettingTimer(false);
        return;
      }
      // Clear settled flag so auction is open again with the existing global timer
      await update(ref(db, `${PATHS.transfers}/auction/${playerId}`), {
        settled: false,
        winnerId: null,
        winnerClub: null,
        winnerName: null,
        winningBid: null,
      });
      setResetMsg("✅ Timer reset — auction is now open with the current deadline.");
      setTimeout(() => setResetMsg(""), 3000);
    } catch (e) {
      setResetMsg("❌ Failed: " + e.message);
    }
    setResettingTimer(false);
  }

  // Cancel a specific bid by its id
  async function handleCancelBid(bidId, bidInfo) {
    if (!window.confirm(`Cancel bid by ${bidInfo.fromManagerName} (${bidInfo.fromClub}) — ${formatAmt(bidInfo.bidAmountRaw)}?`)) return;
    setCancellingBid(bidId);
    try {
      await remove(ref(db, `${PATHS.transfers}/auction/${playerId}/bids/${bidId}`));
    } catch (e) {
      console.error("Cancel bid error:", e);
    }
    setCancellingBid(null);
  }

  const inputStyle = {
    width: "100%", padding: "28px 32px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.4)",
    borderRadius: "16px", color: "#fff",
    fontFamily: "inherit", fontSize: "2.2rem",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "900px", margin: "0 auto" }}>

      {/* Player image */}
      <div style={{ width: "100%", aspectRatio: "16/7", borderRadius: "20px", overflow: "hidden", marginBottom: "32px", background: "rgba(0,0,0,0.4)", position: "relative" }}>
        {(adminImageUrl || player.imageUrl) ? (
          <img src={adminImageUrl || player.imageUrl} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6rem" }}>⚽</div>
        )}
        {settled && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "6rem", letterSpacing: "6px", textShadow: "0 0 40px rgba(0,255,136,0.8)" }}>✅ SOLD</div>
          </div>
        )}
      </div>

      {/* Player name + value */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4.8rem", letterSpacing: "4px", lineHeight: 1 }}>{player.name}</div>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "2px", marginTop: "8px" }}>{adminValue || player.value || "—"}</div>
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        <div style={{ ...GLASS, borderRadius: "16px", padding: "24px 28px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Nationality</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{player.nationality || "—"}</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", marginTop: "16px" }}>Club</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{player.club || "—"}</div>
        </div>
        <div style={{ ...GLASS, borderRadius: "16px", padding: "24px 28px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Interested Managers</div>
          <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "3.2rem" }}>{interestedCount}</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", marginTop: "16px" }}>Age</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{player.age || "—"}</div>
        </div>
      </div>

      {/* Extra player info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        {[
          ["Position", player.position || "—"],
          ["Overall", player.overall || player.rating || "—"],
          ["Starting Bid", formatAmt(parseRaw(player.startingBid || player.value))],
        ].map(([label, val]) => (
          <div key={label} style={{ ...GLASS, borderRadius: "16px", padding: "20px 24px", textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.2rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>{label}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.8rem" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Countdown */}
      {deadline && (
        <div style={{ ...GLASS, borderRadius: "16px", padding: "28px", marginBottom: "32px", textAlign: "center", border: isExpired ? "1px solid rgba(255,107,107,0.4)" : "1px solid rgba(255,20,147,0.3)" }}>
          {isExpired ? (
            <div style={{ color: "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px" }}>⏰ AUCTION CLOSED</div>
          ) : (
            <>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>Auction Ends In</div>
              <div style={{ display: "flex", justifyContent: "center", gap: "24px" }}>
                {[["Days", countdown.d], ["Hours", countdown.h], ["Mins", countdown.m], ["Secs", countdown.s]].map(([label, val]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", lineHeight: 1, minWidth: "60px" }}>
                      {String(val).padStart(2, "0")}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.2rem", marginTop: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Leading bid */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.6rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>
          {bids.length > 0 ? "Leading Bid" : "Starting Bid"}
        </div>
        {bids.length > 0 ? (
          <>
            <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "5rem", letterSpacing: "3px", textShadow: "0 0 30px rgba(0,255,136,0.5)" }}>
              {formatAmt(leadingRaw)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.8rem", marginTop: "10px" }}>
              {leadingBid.fromClub} · <span style={{ color: "#FF1493" }}>{leadingBid.fromManagerName}</span>
            </div>
          </>
        ) : (
          <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "5rem", letterSpacing: "3px" }}>
            {formatAmt(parseRaw(player.startingBid || player.value))}
          </div>
        )}
      </div>

      {/* Bid input — managers only, auction open */}
      {!isExpired && !settled && manager && (
        <div style={{ ...GLASS, borderRadius: "20px", padding: "32px", marginBottom: "32px", border: "1px solid rgba(255,20,147,0.4)" }}>
          <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "2px", marginBottom: "8px" }}>🔨 ENTER NEW BID</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem", marginBottom: "20px" }}>
            Minimum bid: <span style={{ color: "#fff", fontWeight: 700 }}>{formatAmt(minNextBid)}</span>
            &nbsp;· Bidding as: <span style={{ color: "#FF1493", fontWeight: 700 }}>{manager.username}</span> ({manager.team})
          </div>
          <input
            value={bidInput}
            onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); setBidInput(v); }}
            placeholder={`Min. ${formatAmt(minNextBid)}`}
            style={inputStyle}
            type="number"
            min={minNextBid}
          />
          {error && (
            <div style={{ color: "#ff6b6b", fontSize: "1.4rem", marginTop: "12px", padding: "14px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>
          )}
          {done && (
            <div style={{ color: "#00ff88", fontSize: "1.6rem", marginTop: "12px", padding: "14px", background: "rgba(0,255,136,0.1)", borderRadius: "12px", textAlign: "center", fontWeight: 700 }}>✅ Bid placed!</div>
          )}
          <button
            onClick={handleBid}
            disabled={submitting}
            style={{ width: "100%", marginTop: "20px", padding: "28px", background: submitting ? "rgba(255,20,147,0.3)" : "linear-gradient(135deg,#FF1493,#cc0077)", border: "none", borderRadius: "16px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem", letterSpacing: "3px", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "PLACING BID..." : "🔨 PLACE BID"}
          </button>
        </div>
      )}

      {/* Auction closed banner */}
      {(isExpired || settled) && (
        <div style={{ textAlign: "center", padding: "28px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "16px", marginBottom: "32px" }}>
          <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "2px" }}>🏆 AUCTION CLOSED</div>
          {leadingBid && (
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.6rem", marginTop: "10px" }}>
              Won by <span style={{ color: "#00ff88", fontWeight: 700 }}>{leadingBid.fromManagerName}</span> ({leadingBid.fromClub}) with <span style={{ color: "#00ff88", fontWeight: 700 }}>{formatAmt(leadingRaw)}</span>
            </div>
          )}
        </div>
      )}

      {/* All bids list */}
      {bids.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.6rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
            {bids.length > 1 ? "All Bids" : "Current Bid"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {bids.map((bid, i) => (
              <div
                key={bid.id || i}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "18px 24px",
                  background: i === 0 ? "rgba(0,255,136,0.06)" : "rgba(255,107,107,0.06)",
                  border: i === 0 ? "1px solid rgba(0,255,136,0.2)" : "1px solid rgba(255,107,107,0.2)",
                  borderRadius: "14px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {i === 0 && <span style={{ background: "#00ff88", color: "#000", fontSize: "1rem", fontWeight: 700, padding: "3px 10px", borderRadius: "6px" }}>LEADING</span>}
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.8rem", fontWeight: 700 }}>{bid.fromClub}</span>
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem" }}>{bid.fromManagerName}</span>
                  {bid.createdAt && (
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.2rem", marginTop: "4px" }}>
                      {new Date(bid.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ color: i === 0 ? "#00ff88" : "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "1px" }}>
                    {formatAmt(bid.bidAmountRaw)}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleCancelBid(bid.id, bid)}
                      disabled={cancellingBid === bid.id}
                      style={{
                        background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.3)",
                        color: "#ff6b6b", padding: "10px 18px", borderRadius: "10px",
                        cursor: "pointer", fontSize: "1.3rem", fontWeight: 700,
                        opacity: cancellingBid === bid.id ? 0.5 : 1,
                      }}
                    >
                      {cancellingBid === bid.id ? "..." : "✕ Cancel"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin panel */}
      {isAdmin && (
        <div style={{ ...GLASS, borderRadius: "16px", padding: "28px", marginBottom: "24px", border: "1px solid rgba(255,170,0,0.3)" }}>
          <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px", marginBottom: "20px" }}>🔧 ADMIN CONTROLS</div>

          {/* Reset Timer */}
          <div style={{ marginBottom: "24px", padding: "20px", background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: "14px" }}>
            <div style={{ color: "#ffaa44", fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>⏱️ Reset Timer</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.3rem", marginBottom: "16px" }}>
              Reads the deadline set via the + icon in the navbar and reopens this auction with that timer. Will not close the auction.
            </div>
            <button
              onClick={handleResetTimer}
              disabled={resettingTimer}
              style={{
                padding: "18px 32px", background: resettingTimer ? "rgba(255,170,0,0.2)" : "rgba(255,170,0,0.25)",
                border: "1px solid rgba(255,170,0,0.5)", borderRadius: "12px",
                color: "#ffaa44", fontWeight: 700, fontSize: "1.5rem",
                cursor: resettingTimer ? "not-allowed" : "pointer",
              }}
            >
              {resettingTimer ? "Resetting..." : "🔄 Reset Timer"}
            </button>
            {resetMsg && (
              <div style={{ marginTop: "12px", color: resetMsg.startsWith("✅") ? "#00ff88" : resetMsg.startsWith("⚠️") ? "#ffaa44" : "#ff6b6b", fontSize: "1.3rem" }}>
                {resetMsg}
              </div>
            )}
          </div>

          {/* Edit card */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Image URL</label>
            <input value={adminImageUrl} onChange={e => setAdminImageUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, fontSize: "1.4rem", padding: "16px 20px" }} />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Player Value</label>
            <input value={adminValue} onChange={e => setAdminValue(e.target.value)} placeholder="e.g. €45M" style={{ ...inputStyle, fontSize: "1.4rem", padding: "16px 20px" }} />
          </div>
          <button
            onClick={handleAdminSave}
            disabled={savingAdmin}
            style={{ width: "100%", padding: "20px", background: "#ffaa44", border: "none", borderRadius: "14px", color: "#000", fontWeight: 700, fontSize: "1.6rem", cursor: savingAdmin ? "not-allowed" : "pointer" }}
          >
            {savingAdmin ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      )}

      <button onClick={onClose} style={{ width: "100%", padding: "22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "16px", color: "#fff", fontSize: "1.8rem", cursor: "pointer" }}>
        Close
      </button>
    </div>
  );
}
