import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, PATHS } from "../firebase";
import { ref, onValue, push, update, get, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";
import Modal from "../components/Modal";
import StadiumModal from "../modals/StadiumModal";
import TeamModal from "../modals/TeamModal";
import TeamHistoryModal from "../modals/TeamHistoryModal";

const TABS = [
  { id: "stadium", label: "STADIUM" },
  { id: "squad", label: "TEAM" },
  { id: "transfers", label: "TRANSFERS" },
  { id: "finance", label: "FINANCE" },
];

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const INCOME_CATEGORIES = ["Player Sales", "Player Loans", "Stadium Income", "Sponsorship", "Broadcasting", "Shirt Sales"];
const EXPENSE_CATEGORIES = ["Player Wages", "Staff Wages", "Facility Expenses", "Taxes", "Stadium Upgrade"];

const ALL_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── UPDATED formatBalance ──────────────────────────────────────────────
function formatBalance(num) {
  if (num === undefined || num === null) return "€0.00";
  return `€${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmount(num) {
  if (num >= 1_000_000_000) return `€${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `€${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `€${(num / 1_000).toFixed(0)}K`;
  return `€${Number(num).toLocaleString()}`;
}

// ─── SAST helper ──────────────────────────────────────────────────────────
function getSASTMonthIndex() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Johannesburg",
    month: "numeric",
  });
  return parseInt(formatter.format(new Date())) - 1;
}

// ─── ADMIN FINANCE MODAL (Add Transaction) ──────────────────────────────
function AdminFinanceModal({ onClose }) {
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [txType, setTxType] = useState("income");
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const teams = [...new Set(Object.values(data).filter(a => a.team).map(a => a.team))];
      setAllTeams(teams);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setCategory(txType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  }, [txType]);

  async function handleSubmit() {
    if (!selectedTeam || !amount || Number(amount) <= 0) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const amt = Number(amount);
      const now = new Date();
      const monthIndex = now.getMonth();
      const monthName = ALL_MONTHS[monthIndex];
      const year = now.getFullYear();

      await push(ref(db, `career_team_management/${selectedTeam}/finance/transactions`), {
        type: txType,
        category,
        source: source.trim() || null,
        amount: amt,
        month: monthName,
        monthIndex,
        year,
        createdAt: Date.now(),
        addedByAdmin: true,
      });

      setDone(true);
      setTimeout(onClose, 1600);
    } catch (e) {
      setError("Failed: " + e.message);
    }
    setSaving(false);
  }

  const inputStyle = {
    width: "100%", padding: "18px 20px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,20,147,0.35)",
    borderRadius: "14px", color: "#fff",
    fontFamily: "inherit", fontSize: "1.2rem",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    color: "rgba(255,255,255,0.65)", fontSize: "1rem",
    display: "block", marginBottom: "8px",
    textTransform: "uppercase", letterSpacing: "0.8px",
    fontWeight: 700,
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", marginBottom: "8px", letterSpacing: "3px" }}>
        💰 TEAM FINANCES
      </h3>
      <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "28px", fontSize: "1rem" }}>Assign funds or deduct expenses from a team's balance.</p>

      {done ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#00ff88", fontWeight: 700, fontSize: "1.4rem", background: "rgba(0,255,136,0.08)", borderRadius: "16px" }}>
          ✅ Transaction Applied!
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "22px" }}>
            <label style={labelStyle}>Select Team</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Choose a team —</option>
              {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label style={labelStyle}>Transaction Type</label>
            <div style={{ display: "flex", gap: "12px" }}>
              {["income", "expense"].map(t => (
                <button key={t} onClick={() => setTxType(t)} style={{
                  flex: 1, padding: "16px", borderRadius: "14px", cursor: "pointer",
                  fontFamily: "inherit", fontWeight: 700, fontSize: "1.1rem",
                  background: txType === t ? (t === "income" ? "#00cc66" : "#ff4444") : "rgba(255,255,255,0.06)",
                  border: `1px solid ${txType === t ? (t === "income" ? "#00cc66" : "#ff4444") : "rgba(255,255,255,0.15)"}`,
                  color: "#fff", transition: "all 0.2s", textTransform: "uppercase",
                }}>
                  {t === "income" ? "💰 Income" : "📤 Expense"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {(txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label style={labelStyle}>Source <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
            <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Spotify, Nike, Google..." style={inputStyle} />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={labelStyle}>Amount (€)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000000" style={inputStyle} type="number" min="0" />
            {amount && Number(amount) > 0 && (
              <div style={{ marginTop: "8px", color: txType === "income" ? "#00ff88" : "#ff6b6b", fontSize: "1.1rem", fontWeight: 700 }}>
                {txType === "income" ? "+" : "−"}{formatAmount(Number(amount))}
              </div>
            )}
          </div>

          {error && <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "16px", padding: "14px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>}

          <div style={{ display: "flex", gap: "14px" }}>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "18px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Applying..." : "✅ Apply Transaction"}
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.2rem" }}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ADMIN TEAM SELECTOR ──────────────────────────────────────────────────
function AdminTeamSelector({ onSelect }) {
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const t = [...new Set(Object.values(data).filter(a => a.team).map(a => a.team))];
      setTeams(t);
    });
    return () => unsub();
  }, []);

  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "32px", maxWidth: "480px", margin: "60px auto", textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔧</div>
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", color: "#FF1493", margin: "0 0 8px" }}>ADMIN VIEW</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "24px", fontSize: "1rem" }}>Select a team to manage their dashboard.</p>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        style={{ width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "14px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", marginBottom: "16px", cursor: "pointer" }}
      >
        <option value="">— Select a team —</option>
        {teams.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        style={{ width: "100%", padding: "16px", background: selected ? "#FF1493" : "rgba(255,20,147,0.2)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: selected ? "pointer" : "not-allowed" }}
      >
        View Team Dashboard →
      </button>
    </div>
  );
}

// ─── UPGRADE STADIUM POPUP ──────────────────────────────────────────────
function UpgradeStadiumPopup({ team, onClose }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    setSending(true);
    setError("");
    try {
      await push(ref(db, `career_team_management/${team}/stadium/upgradeRequests`), {
        description: description.trim() || null,
        amount: Number(amount),
        status: "pending",
        createdAt: Date.now(),
      });
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError("Failed: " + e.message);
    }
    setSending(false);
  }

  const inputStyle = { width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "14px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🏗️</div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: "3px", marginBottom: "8px" }}>UPGRADE STADIUM</h3>
        <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "24px", fontSize: "1rem" }}>Submit a request to admin. Once accepted, funds will be deducted from your balance.</p>
        {done ? (
          <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, padding: "20px", background: "rgba(0,255,136,0.08)", borderRadius: "14px", fontSize: "1.2rem" }}>✅ Request Sent!</div>
        ) : (
          <>
            <div style={{ marginBottom: "18px" }}>
              <label style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>What would you like to upgrade? (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. New seating, pitch renovation, lighting..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>Amount (€)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 10000000" style={inputStyle} type="number" min="0" />
              {amount && Number(amount) > 0 && (
                <div style={{ marginTop: "6px", color: "#ff6b6b", fontSize: "1rem", fontWeight: 700 }}>−{formatAmount(Number(amount))} from your balance</div>
              )}
            </div>
            {error && <div style={{ color: "#ff6b6b", fontSize: "0.95rem", marginBottom: "14px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleSend} disabled={sending} style={{ flex: 1, padding: "16px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: sending ? "not-allowed" : "pointer" }}>
                {sending ? "Sending..." : "💸 Send Request"}
              </button>
              <button onClick={onClose} style={{ flex: 1, padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── STADIUM TAB (doubled fonts/padding) ──────────────────────────────
function StadiumTab({ team, isAdmin, onEditStadium }) {
  const [data, setData] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/stadium`), snap => {
      setData(snap.val());
    });
    return () => unsub();
  }, [team]);

  useEffect(() => {
    if (!data?.images?.length) return;
    timerRef.current = setInterval(() => setSlideIdx(i => (i + 1) % data.images.length), 4000);
    return () => clearInterval(timerRef.current);
  }, [data?.images?.length]);

  if (!data) return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🏟️</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px" }}>No Stadium Data Yet</div>
      <div style={{ fontSize: "2rem", marginTop: "10px" }}>Admin can set up the stadium using the + menu.</div>
      {isAdmin && (
        <button onClick={onEditStadium} style={{ marginTop: "24px", padding: "16px 32px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: "pointer" }}>
          🏟️ Set Up Stadium
        </button>
      )}
    </div>
  );

  const images = data.images || [];

  return (
    <div style={{ width: "100%" }}>
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <button onClick={onEditStadium} style={{ padding: "12px 24px", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.5)", borderRadius: "12px", color: "#FF1493", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer" }}>
            ✏️ Edit Stadium
          </button>
        </div>
      )}

      {data.videoUrl ? (
        <div style={{ width: "100%", aspectRatio: "16/7", overflow: "hidden", borderRadius: "16px", marginBottom: "28px" }}>
          <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }}>
            <source src={data.videoUrl} />
          </video>
        </div>
      ) : images.length > 0 ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden", borderRadius: "16px", marginBottom: "28px" }}>
          {images.map((url, i) => (
            <img key={i} src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: i === slideIdx ? 1 : 0, transition: "opacity 0.7s ease" }} />
          ))}
          {images.length > 1 && (
            <div style={{ position: "absolute", bottom: "14px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px" }}>
              {images.map((_, i) => (
                <div key={i} onClick={() => setSlideIdx(i)} style={{ width: "10px", height: "10px", borderRadius: "50%", background: i === slideIdx ? "#FF1493" : "rgba(255,255,255,0.4)", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/7", background: "rgba(255,20,147,0.04)", border: "1px dashed rgba(255,20,147,0.2)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px" }}>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.4rem" }}>No images uploaded</span>
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.4rem, 6vw, 5rem)", letterSpacing: "5px", textTransform: "uppercase", textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>
          {data.stadiumName || "STADIUM NAME"}
        </div>
        {data.location && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.6rem", marginTop: "6px", letterSpacing: "2px" }}>📍 {data.location}</div>}
        {data.capacity && (
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.6rem", marginTop: "8px" }}>
            Capacity: <span style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{Number(data.capacity).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div style={{ ...GLASS, borderRadius: "20px", overflow: "hidden", marginBottom: "28px" }}>
        {[
          { label: "🎟️ Tickets Sold This Season", value: "0" },
          { label: "💶 Standard Ticket Price", value: data.ticketPrice ? `€${Number(data.ticketPrice).toLocaleString()}` : "—" },
          { label: "👑 VIP Ticket Price", value: data.vipTicketPrice ? `€${Number(data.vipTicketPrice).toLocaleString()}` : "—" },
          { label: "💸 Stadium Expenses Per Game", value: data.expensesPerGame ? `€${Number(data.expensesPerGame).toLocaleString()}` : "—" },
          { label: "🤝 Stadium Sponsorship Deals", value: data.sponsorshipDeals || "—" },
          { label: "🎪 Stadium External Events", value: "0" },
        ].map(({ label, value }, i) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "40px 56px", borderBottom: i < 5 ? "1px solid rgba(255,20,147,0.1)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "2.6rem" }}>{label}</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "2.8rem" }}>{value}</span>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setShowUpgrade(true)}
            style={{ padding: "36px 80px", background: "linear-gradient(135deg, rgba(255,20,147,0.2), rgba(255,20,147,0.05))", border: "1px solid rgba(255,20,147,0.5)", borderRadius: "16px", color: "#FF1493", fontWeight: 700, fontSize: "2.6rem", cursor: "pointer", letterSpacing: "1px" }}
          >
            🏗️ Upgrade Stadium
          </button>
        </div>
      )}

      {showUpgrade && <UpgradeStadiumPopup team={team} onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

// ─── SQUAD TAB WRAPPER ───────────────────────────────────────────────────
function SquadTabWrapper({ team, isAdmin, onEditSquad }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>👥</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", color: "#fff" }}>Squad Management</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.2rem", marginTop: "10px" }}>Click "TEAM" tab or visit the Squad page.</div>
      {isAdmin && (
        <button onClick={onEditSquad} style={{ marginTop: "24px", padding: "16px 32px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: "pointer" }}>
          ✏️ Edit Squad
        </button>
      )}
    </div>
  );
}

// ─── TRANSFERS TAB (doubled fonts/padding) ─────────────────────────────
function TransfersTab({ team, teamIcons }) {
  const [negotiations, setNegotiations] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `${PATHS.transfers}/negotiations`), snap => {
      const data = snap.val();
      if (!data) { setNegotiations([]); return; }
      const all = Object.entries(data).map(([id, n]) => ({ id, ...n }));
      setNegotiations(all);
    });
    return () => unsub();
  }, [team]);

  const offersReceived = negotiations.filter(n => n.toClub === team || n.playerClub === team);
  const offersSent = negotiations.filter(n => n.fromClub === team);

  const BlockHeader = ({ title, count, color }) => (
    <div style={{ color, fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
      {title}
      <span style={{ background: `${color}22`, border: `1px solid ${color}`, color, borderRadius: "20px", padding: "4px 28px", fontSize: "2.4rem" }}>{count}</span>
    </div>
  );

  const EmptyState = ({ label }) => (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "rgba(255,255,255,0.2)" }}>
      <div style={{ fontSize: "6rem", marginBottom: "12px" }}>📋</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "2px" }}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
          <BlockHeader title="📥 OFFERS RECEIVED" count={offersReceived.length} color="#00ff88" />
          {offersReceived.length === 0 ? (
            <EmptyState label="No Offers Received" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              {offersReceived.map(offer => (
                <NegotiationGridCard key={offer.id} offer={offer} teamIcons={teamIcons} onClick={() => setSelectedOffer(offer)} />
              ))}
            </div>
          )}
        </div>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
          <BlockHeader title="📤 OFFERS SENT" count={offersSent.length} color="#FF1493" />
          {offersSent.length === 0 ? (
            <EmptyState label="No Offers Sent" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              {offersSent.map(offer => (
                <NegotiationGridCard key={offer.id} offer={offer} teamIcons={teamIcons} onClick={() => setSelectedOffer(offer)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedOffer && <NegotiationDetailPopup offer={selectedOffer} onClose={() => setSelectedOffer(null)} />}
    </div>
  );
}

// ─── NEGOTIATION CARD ──────────────────────────────────────────────────
function NegotiationGridCard({ offer, teamIcons, onClick }) {
  const statusColors = { pending: "#ffaa44", accepted: "#00ff88", rejected: "#ff6b6b" };
  const statusColor = statusColors[offer.status] || "#ffaa44";
  const clubLogo = teamIcons?.[offer.playerClub] || teamIcons?.[offer.fromClub];

  return (
    <div
      onClick={onClick}
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,20,147,0.18)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column" }}
      onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.18)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ width: "100%", aspectRatio: "1/1", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        <div style={{ width: "70%", height: "70%" }}>
          <ShirtSVGSmall clubName={offer.playerClub} playerName={offer.playerName} squadNumber={null} />
        </div>
        <div style={{ position: "absolute", top: "10px", left: "10px", background: `${statusColor}33`, border: `1px solid ${statusColor}`, borderRadius: "8px", padding: "4px 10px", color: statusColor, fontSize: "1.7rem", fontWeight: 700, textTransform: "uppercase" }}>
          {offer.status}
        </div>
        <div style={{ position: "absolute", top: "10px", right: "10px", background: offer.type === "buy" ? "rgba(255,20,147,0.8)" : offer.type === "loan" ? "rgba(0,150,255,0.8)" : "rgba(255,170,0,0.8)", borderRadius: "8px", padding: "4px 10px", color: "#fff", fontSize: "1.7rem", fontWeight: 700, textTransform: "uppercase" }}>
          {offer.type}
        </div>
      </div>

      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: "2.4rem", lineHeight: 1.2 }}>{offer.playerName}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {clubLogo ? <img src={clubLogo} alt="" style={{ width: "40px", height: "40px", objectFit: "contain" }} /> : <span style={{ fontSize: "2rem" }}>⚽</span>}
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "2rem" }}>{offer.playerClub}</span>
        </div>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "1px" }}>
          {offer.offerAmount || offer.loanAmount || offer.bidAmount || "—"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.8rem" }}>
          From: <span style={{ color: "rgba(255,255,255,0.7)" }}>{offer.fromClub || offer.fromManagerName}</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{ marginTop: "auto", padding: "12px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#FF1493", fontWeight: 700, fontSize: "2rem", cursor: "pointer", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}
        >
          View Offer →
        </button>
      </div>
    </div>
  );
}

// ─── NEGOTIATION DETAIL POPUP ──────────────────────────────────────────
function NegotiationDetailPopup({ offer, onClose }) {
  if (!offer) return null;
  const statusColors = { pending: "#ffaa44", accepted: "#00ff88", rejected: "#ff6b6b" };
  const statusColor = statusColors[offer.status] || "#ffaa44";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "520px", width: "100%", position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4.8rem", letterSpacing: "2px", marginBottom: "6px" }}>{offer.playerName}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "2.2rem", marginBottom: "20px" }}>{offer.playerClub}</div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          <span style={{ background: offer.type === "buy" ? "rgba(255,20,147,0.2)" : offer.type === "loan" ? "rgba(0,150,255,0.2)" : "rgba(255,170,0,0.2)", color: offer.type === "buy" ? "#FF1493" : offer.type === "loan" ? "#44aaff" : "#ffaa44", padding: "6px 16px", borderRadius: "20px", fontSize: "2rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.type}</span>
          <span style={{ background: `${statusColor}22`, color: statusColor, padding: "6px 16px", borderRadius: "20px", fontSize: "2rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.status}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            ["From Club", offer.fromClub],
            ["Manager", offer.fromManagerName],
            ["To Club", offer.toClub || offer.playerClub],
            offer.type === "auction" ? ["Bid", offer.bidAmount] : offer.type === "loan" ? ["Loan Fee", offer.loanAmount] : ["Offer", offer.offerAmount],
            offer.contractLength && ["Contract", offer.contractLength],
            offer.loanTerm && ["Loan Term", offer.loanTerm],
            offer.wage && ["Wage", offer.wage],
            ["Date", offer.createdAt ? new Date(offer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"],
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "14px 16px" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>{label}</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "2.2rem" }}>{value || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SHIRT SVG ─────────────────────────────────────────────────────────
function ShirtSVGSmall({ clubName, playerName, squadNumber }) {
  const colors = { primary: "#FF1493", secondary: "#000033", text: "#fff" };
  const num = squadNumber || "?";
  const nameParts = (playerName || "").toUpperCase().split(" ");
  const displayName = nameParts[nameParts.length - 1] || "";
  return (
    <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={`tsg-${num}-${displayName}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path d="M 50 40 L 20 70 L 45 80 L 45 190 L 155 190 L 155 80 L 180 70 L 150 40 Q 130 30 115 38 Q 100 55 85 38 Q 70 30 50 40 Z"
        fill={`url(#tsg-${num}-${displayName})`} />
      <text x="100" y="135" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="52" fontWeight="900" fill={colors.text} opacity="0.95">{num}</text>
      <text x="100" y="172" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="13" fontWeight="700" fill={colors.text} opacity="0.8" letterSpacing="2">
        {displayName.length > 10 ? displayName.slice(0, 10) + "…" : displayName}
      </text>
    </svg>
  );
}

// ─── FINANCE TAB ─────────────────────────────────────────────────────────
function FinanceTab({ team, isAdmin }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const currentMonthIndex = getSASTMonthIndex();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/finance/transactions`), snap => {
      const data = snap.val();
      if (data) {
        setTransactions(Object.entries(data).map(([id, t]) => ({ id, ...t })).sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setTransactions([]);
      }
    });
    return () => unsub();
  }, [team]);

  const PLACEHOLDERS = {
    4: { income: 12_000_000, expense: 7_500_000 },
    5: { income: 16_400_000, expense: 9_200_000 },
    6: { income: 14_100_000, expense: 8_800_000 },
  };

  const chartData = ALL_MONTHS.map((_, mIdx) => {
    if (mIdx > currentMonthIndex) return { income: 0, expense: 0, empty: true };
    if (mIdx < 4) return { income: 0, expense: 0, empty: true };
    if (mIdx < 7 && PLACEHOLDERS[mIdx]) {
      const p = PLACEHOLDERS[mIdx];
      return { income: p.income, expense: p.expense, empty: false, placeholder: true };
    }
    const monthTxs = transactions.filter(t => t.monthIndex === mIdx);
    const income = monthTxs.filter(t => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { income, expense, empty: false, placeholder: false };
  });

  const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1) * 1.2;
  const barAreaH = 560;

  useEffect(() => {
    if (!scrollRef.current || currentMonthIndex < 4 || currentMonthIndex > 11) return;
    const barWidth = 120;
    const gap = 8;
    const scrollTo = (currentMonthIndex - 4) * (barWidth + gap) - 100;
    scrollRef.current.scrollLeft = Math.max(0, scrollTo);
  }, [currentMonthIndex]);

  const incomeTotals = {};
  const expenseTotals = {};
  INCOME_CATEGORIES.forEach(c => { incomeTotals[c] = transactions.filter(t => t.type === "income" && t.category === c).reduce((s, t) => s + (Number(t.amount) || 0), 0); });
  EXPENSE_CATEGORIES.forEach(c => { expenseTotals[c] = transactions.filter(t => t.type === "expense" && t.category === c).reduce((s, t) => s + (Number(t.amount) || 0), 0); });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <div>
      <div style={{ ...GLASS, borderRadius: "20px", padding: "64px", marginBottom: "40px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "3px", marginBottom: "40px" }}>📈 FINANCIAL OVERVIEW</div>

        <div
          ref={scrollRef}
          style={{
            width: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "16px",
          }}
        >
          <div style={{ minWidth: `${12 * 120 + 11 * 8 + 80}px`, position: "relative", height: `${barAreaH + 80}px` }}>
            {[0, 25, 50, 75, 100].map(pct => {
              const val = (maxVal * pct / 100);
              return (
                <div key={pct} style={{ position: "absolute", left: 0, top: `${barAreaH - (barAreaH * pct / 100)}px`, color: "rgba(255,255,255,0.3)", fontSize: "1.4rem", transform: "translateY(-50%)", width: "70px", textAlign: "right" }}>
                  {formatAmount(val)}
                </div>
              );
            })}
            {[0, 25, 50, 75, 100].map(pct => (
              <div key={pct} style={{ position: "absolute", left: "80px", right: 0, top: `${barAreaH - (barAreaH * pct / 100)}px`, borderTop: "1px dashed rgba(255,255,255,0.08)" }} />
            ))}

            <div style={{ position: "absolute", left: "80px", right: 0, bottom: "60px", top: 0, display: "flex", alignItems: "flex-end", gap: "8px" }}>
              {ALL_MONTHS.map((month, i) => {
                const d = chartData[i];
                const incH = d.empty || d.income === 0 ? 0 : (d.income / maxVal) * barAreaH;
                const expH = d.empty || d.expense === 0 ? 0 : (d.expense / maxVal) * barAreaH;
                const isFuture = d.empty;
                const isActive = i === currentMonthIndex && !d.empty;

                return (
                  <div key={month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 120px" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: `${barAreaH}px` }}>
                      <div style={{
                        flex: 1,
                        height: `${Math.max(incH, 0)}px`,
                        minWidth: "36px",
                        background: isFuture ? "rgba(255,255,255,0.04)" : "linear-gradient(to top, #FF1493, #ff69b4)",
                        borderRadius: "8px 8px 0 0",
                        border: isFuture ? "1px dashed rgba(255,255,255,0.1)" : isActive ? "3px solid #fff" : "none",
                        boxShadow: isActive ? "0 0 20px rgba(255,20,147,0.8)" : "none",
                        position: "relative", transition: "height 0.5s",
                      }}>
                        {incH > 20 && (
                          <div style={{ position: "absolute", top: "-30px", left: "50%", transform: "translateX(-50%)", color: "#FF1493", fontSize: "1.2rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {formatAmount(d.income)}
                          </div>
                        )}
                      </div>
                      <div style={{
                        flex: 1,
                        height: `${Math.max(expH, 0)}px`,
                        minWidth: "36px",
                        background: isFuture ? "rgba(255,255,255,0.04)" : "linear-gradient(to top, #000033, #001a66)",
                        borderRadius: "8px 8px 0 0",
                        border: isFuture ? "1px dashed rgba(255,255,255,0.1)" : isActive ? "3px solid #fff" : "1px solid rgba(0,100,255,0.4)",
                        boxShadow: isActive ? "0 0 20px rgba(0,100,255,0.8)" : "none",
                        position: "relative", transition: "height 0.5s",
                      }}>
                        {expH > 20 && (
                          <div style={{ position: "absolute", top: "-30px", left: "50%", transform: "translateX(-50%)", color: "#4488ff", fontSize: "1.2rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {formatAmount(d.expense)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ color: isFuture ? "rgba(255,255,255,0.2)" : isActive ? "#fff" : "rgba(255,255,255,0.5)", fontSize: isActive ? "2rem" : "1.6rem", fontWeight: isActive ? 900 : 700, marginTop: "12px" }}>
                      {month}
                      {isActive && <span style={{ fontSize: "1.2rem", marginLeft: "6px", color: "#FF1493" }}>⬅️</span>}
                    </div>
                    {isFuture && <div style={{ color: "rgba(255,255,255,0.15)", fontSize: "1rem", marginTop: "2px" }}>upcoming</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "36px", justifyContent: "center", marginTop: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "28px", height: "28px", background: "#FF1493", borderRadius: "6px" }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.6rem", fontWeight: 600 }}>Income</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "28px", height: "28px", background: "#000033", border: "1px solid rgba(0,100,255,0.5)", borderRadius: "6px" }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.6rem", fontWeight: 600 }}>Expenses</span>
          </div>
        </div>
      </div>

      {/* Income & Expense blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", marginBottom: "40px" }}>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "48px" }}>
          <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px", marginBottom: "28px" }}>💰 INCOME</div>
          <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: "1px", marginBottom: "24px" }}>Total: {formatAmount(totalIncome)}</div>
          {INCOME_CATEGORIES.map(label => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.4rem" }}>{label}</span>
              <span style={{ color: incomeTotals[label] > 0 ? "#00ff88" : "#fff", fontWeight: 700, fontSize: "1.4rem" }}>
                {incomeTotals[label] > 0 ? `+${formatAmount(incomeTotals[label])}` : "€0"}
              </span>
            </div>
          ))}
        </div>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "48px" }}>
          <div style={{ color: "#4488ff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px", marginBottom: "28px" }}>📤 EXPENSES</div>
          <div style={{ color: "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: "1px", marginBottom: "24px" }}>Total: {formatAmount(totalExpense)}</div>
          {EXPENSE_CATEGORIES.map(label => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.4rem" }}>{label}</span>
              <span style={{ color: expenseTotals[label] > 0 ? "#ff6b6b" : "#fff", fontWeight: 700, fontSize: "1.4rem" }}>
                {expenseTotals[label] > 0 ? `−${formatAmount(expenseTotals[label])}` : "€0"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History with Edit/Delete for admin */}
      <div style={{ ...GLASS, borderRadius: "20px", padding: "48px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "3px", marginBottom: "28px" }}>📋 TRANSACTION HISTORY</div>
        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>💳</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Transactions Yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {transactions.map(tx => {
              const isIncome = tx.type === "income";
              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: isIncome ? "rgba(0,255,136,0.05)" : "rgba(255,100,100,0.05)", border: `1px solid ${isIncome ? "rgba(0,255,136,0.15)" : "rgba(255,100,100,0.15)"}`, borderRadius: "14px", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.background = isIncome ? "rgba(0,255,136,0.1)" : "rgba(255,100,100,0.1)"}
                  onMouseOut={e => e.currentTarget.style.background = isIncome ? "rgba(0,255,136,0.05)" : "rgba(255,100,100,0.05)"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "96px", height: "96px", background: isIncome ? "rgba(0,255,136,0.15)" : "rgba(255,100,100,0.15)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.2rem" }}>
                      {isIncome ? "💰" : "📤"}
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "2.6rem" }}>{tx.category}</div>
                      {tx.source && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2rem", marginTop: "4px" }}>{tx.source}</div>}
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.9rem", marginTop: "4px" }}>{tx.month} {tx.year}</div>
                    </div>
                  </div>
                  <div style={{ color: isIncome ? "#00ff88" : "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "1px", fontWeight: 700 }}>
                    {isIncome ? "+" : "−"}{formatAmount(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedTx && (
        <TransactionEditPopup
          tx={selectedTx}
          team={team}
          isAdmin={isAdmin}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}

// ─── TRANSACTION EDIT/DELETE POPUP ──────────────────────────────────────
function TransactionEditPopup({ tx, team, isAdmin, onClose }) {
  const [type, setType] = useState(tx.type);
  const [category, setCategory] = useState(tx.category);
  const [source, setSource] = useState(tx.source || "");
  const [amount, setAmount] = useState(String(tx.amount));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const incomeCategories = INCOME_CATEGORIES;
  const expenseCategories = EXPENSE_CATEGORIES;

  async function handleSave() {
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await update(ref(db, `career_team_management/${team}/finance/transactions/${tx.id}`), {
        type,
        category,
        source: source.trim() || null,
        amount: Number(amount),
      });
      onClose();
    } catch (e) {
      setError("Update failed: " + e.message);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this transaction permanently?")) return;
    setDeleting(true);
    try {
      await remove(ref(db, `career_team_management/${team}/finance/transactions/${tx.id}`));
      onClose();
    } catch (e) {
      setError("Delete failed: " + e.message);
    }
    setDeleting(false);
  }

  const inputStyle = {
    width: "100%", padding: "16px 20px",
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "500px", width: "100%", position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>

        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px", marginBottom: "8px" }}>
          {type === "income" ? "💰 Edit Income" : "📤 Edit Expense"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1rem", marginBottom: "24px" }}>
          {tx.month} {tx.year} · {tx.category}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {["income", "expense"].map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                flex: 1, padding: "12px", borderRadius: "10px", cursor: "pointer",
                fontFamily: "inherit", fontWeight: 700, fontSize: "1rem",
                background: type === t ? (t === "income" ? "#00cc66" : "#ff4444") : "rgba(255,255,255,0.06)",
                border: `1px solid ${type === t ? (t === "income" ? "#00cc66" : "#ff4444") : "rgba(255,255,255,0.15)"}`,
                color: "#fff", transition: "all 0.2s", textTransform: "uppercase",
              }}>
                {t === "income" ? "💰 Income" : "📤 Expense"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {(type === "income" ? incomeCategories : expenseCategories).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Source (optional)</label>
          <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Spotify, Nike..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Amount (€)</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" style={inputStyle} />
        </div>

        {error && <div style={{ color: "#ff6b6b", fontSize: "0.95rem", marginBottom: "14px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "14px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
          {isAdmin && (
            <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "14px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.4)", borderRadius: "12px", color: "#ff6b6b", fontWeight: 700, fontSize: "1.1rem", cursor: deleting ? "not-allowed" : "pointer" }}>
              {deleting ? "..." : "🗑️"}
            </button>
          )}
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "12px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function TeamManagementPage() {
  const navigate = useNavigate();
  const { isAdmin, manager, teamIconsCache, managerLoading } = useAdmin();
  const [tab, setTab] = useState("stadium");
  const [balance, setBalance] = useState(0);
  const [teamIcon, setTeamIcon] = useState(null);
  const [teamIcons, setTeamIcons] = useState({});
  const [adminTeam, setAdminTeam] = useState(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showStadiumModal, setShowStadiumModal] = useState(false);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);

  const team = manager?.team || adminTeam;

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.teamIcons), snap => {
      if (snap.val()) setTeamIcons(snap.val());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/finance/transactions`), snap => {
      const data = snap.val();
      if (!data) { setBalance(0); return; }
      const txs = Object.values(data);
      const total = txs.reduce((sum, tx) => {
        const amt = Number(tx.amount) || 0;
        return tx.type === "income" ? sum + amt : sum - amt;
      }, 0);
      setBalance(Math.max(0, total));
    });
    return () => unsub();
  }, [team]);

  useEffect(() => {
    if (!team) return;
    const mergedIcons = { ...teamIconsCache, ...teamIcons };
    const icon = mergedIcons?.[team];
    if (icon) setTeamIcon(icon);
  }, [team, teamIconsCache, teamIcons]);

  const mergedIcons = { ...teamIconsCache, ...teamIcons };

  // ─── Admin menu items for navbar plus icon ──────────────────────────────
  const adminNavbarMenu = isAdmin ? [
    { icon: "🏟️", label: "Edit Stadium", action: () => { setShowStadiumModal(true); } },
    { icon: "👥", label: "Edit Team", action: () => { setShowSquadModal(true); } },
    { icon: "📜", label: "Team History", action: () => { setShowHistoryModal(true); } },
    { icon: "💰", label: "Team Finances", action: () => { setShowFinanceModal(true); } },
  ] : undefined;

  if (managerLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo />
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin && !manager) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo />
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 20px" }}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "48px 36px", maxWidth: "480px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🔒</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", color: "#FF1493", margin: "0 0 10px" }}>Manager Login Required</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "1.4rem" }}>Sign in as a manager to access your team dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin && !team) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo />
        <Navbar />
        <div style={{ padding: "32px 20px 80px" }}>
          <AdminTeamSelector onSelect={setAdminTeam} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      {/* Pass admin menu to Navbar so the plus icon appears */}
      <Navbar tokyoMenuItems={adminNavbarMenu} />

      <div style={{ padding: "32px 20px 80px" }}>

        {/* Optional: Keep the separate admin manage button if you want, but we already have the navbar plus */}
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "24px", position: "relative" }}>
            {adminTeam && (
              <button
                onClick={() => { setAdminTeam(null); setTab("stadium"); }}
                style={{ padding: "12px 22px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
              >← Teams</button>
            )}
            {/* The separate "Manage" button is still here, but you can remove it if you want only the navbar plus */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAdminMenuOpen(v => !v)}
                style={{ padding: "12px 22px", background: "#FF1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
              >➕ Manage</button>
              {adminMenuOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: "#0a0015", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "16px", padding: "8px", minWidth: "240px", zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                  {[
                    { label: "🏟️ Edit Stadium", action: () => { setShowStadiumModal(true); setAdminMenuOpen(false); } },
                    { label: "👥 Edit Team", action: () => { setShowSquadModal(true); setAdminMenuOpen(false); } },
                    { label: "📜 Team History", action: () => { setShowHistoryModal(true); setAdminMenuOpen(false); } },
                    { label: "💰 Team Finances", action: () => { setShowFinanceModal(true); setAdminMenuOpen(false); } },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action}
                      style={{ display: "block", width: "100%", padding: "14px 18px", background: "transparent", border: "none", color: "#fff", textAlign: "left", cursor: "pointer", fontSize: "1.1rem", fontWeight: 600, borderRadius: "10px", transition: "background 0.2s" }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team header — with manager profile fallback */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ width: "120px", height: "120px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {teamIcon ? (
              <img src={teamIcon} alt={team} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(255,20,147,0.4))" }} />
            ) : manager?.profilePhoto ? (
              <img src={manager.profilePhoto} alt="Manager" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              <div style={{ width: "120px", height: "120px", background: "rgba(255,20,147,0.1)", border: "2px solid rgba(255,20,147,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem" }}>🏟️</div>
            )}
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "5px", color: "#fff", margin: "0 0 6px" }}>
            {team || "No Club Assigned"}
          </h1>
          {isAdmin && adminTeam && (
            <div style={{ color: "#ffaa44", fontSize: "1.2rem", marginBottom: "8px", fontWeight: 700 }}>👁️ Admin View</div>
          )}
          <div style={{ marginTop: "12px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.2rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>Balance</div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(3rem, 8vw, 5.5rem)",
              letterSpacing: "4px",
              background: "linear-gradient(135deg, #FF1493, #ff69b4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1,
              filter: "drop-shadow(0 0 20px rgba(255,20,147,0.4))",
              wordBreak: "break-all",
            }}>
              {formatBalance(balance)}
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,20,147,0.4), transparent)", marginBottom: "28px" }} />

        <div style={{ marginBottom: "24px" }}>
          <TabBar
            tabs={TABS}
            activeTab={tab}
            onTabChange={(id) => {
              if (id === "squad") {
                navigate("/squad");
              } else {
                setTab(id);
              }
            }}
          />
        </div>

        <div style={{ width: "100%" }}>
          {tab === "stadium" && <StadiumTab team={team} isAdmin={isAdmin} onEditStadium={() => setShowStadiumModal(true)} />}
          {tab === "transfers" && <TransfersTab team={team} teamIcons={mergedIcons} />}
          {tab === "finance" && <FinanceTab team={team} isAdmin={isAdmin} />}
          {tab === "squad" && <SquadTabWrapper team={team} isAdmin={isAdmin} onEditSquad={() => setShowSquadModal(true)} />}
        </div>
      </div>

      <Modal active={showStadiumModal} onClose={() => setShowStadiumModal(false)} wide>
        <StadiumModal team={team} onClose={() => setShowStadiumModal(false)} />
      </Modal>
      <Modal active={showSquadModal} onClose={() => setShowSquadModal(false)} wide>
        <TeamModal team={team} onClose={() => setShowSquadModal(false)} />
      </Modal>
      <Modal active={showHistoryModal} onClose={() => setShowHistoryModal(false)} wide>
        <TeamHistoryModal team={team} onClose={() => setShowHistoryModal(false)} />
      </Modal>
      <Modal active={showFinanceModal} onClose={() => setShowFinanceModal(false)} wide>
        <AdminFinanceModal onClose={() => setShowFinanceModal(false)} />
      </Modal>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
