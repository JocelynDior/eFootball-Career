import { useState, useEffect } from "react";
import { db, PATHS, ref, push } from "../firebase";
import { onValue } from "firebase/database";
import WikiSearchModal from "./WikiSearchModal";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const INCOME_CATEGORIES = [
  "Player Sales",
  "Player Loaned Out",
  "Stadium Income",
  "Sponsorship",
  "Broadcasting",
  "Shirt Sales",
];

const EXPENSE_CATEGORIES = [
  "Player Wages",
  "Staff Wages",
  "Facility Expenses",
  "Taxes",
  "Stadium Upgrade",
  "Player Purchase",
  "Player Loan In",
  "Fines",
  "Recurring Expense",
];

const ALL_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatAmount(num) {
  if (num >= 1_000_000_000) return `€${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `€${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `€${(num / 1_000).toFixed(0)}K`;
  return `€${Number(num).toLocaleString()}`;
}

function getRecurringEndDate(dailyAmount, totalCap) {
  const daily = Number(dailyAmount);
  const total = Number(totalCap);
  if (!daily || !total || daily <= 0 || total <= 0) return null;
  const days = Math.ceil(total / daily);
  const end = new Date();
  end.setDate(end.getDate() + days);
  return end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────
export default function AdminFinanceModal({ onClose, defaultTeam }) {
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(defaultTeam || "");

  // top-level: income or expense
  const [txType, setTxType] = useState("income");

  // income sub-mode: "standard" | "recurring_type" | "kit_sales"
  const [incomeMode, setIncomeMode] = useState("standard");

  // standard income/expense fields
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");

  // recurring expense fields
  const [recurringDescription, setRecurringDescription] = useState("");
  const [recurringDailyAmount, setRecurringDailyAmount] = useState("");
  const [recurringTotalCap, setRecurringTotalCap] = useState("");

  // recurring income (type field) fields
  const [riDescription, setRiDescription] = useState("");
  const [riDailyAmount, setRiDailyAmount] = useState("");
  const [riTotalCap, setRiTotalCap] = useState("");

  // kit sales fields
  const [kitPrice, setKitPrice] = useState("");
  const [kitDailyMin, setKitDailyMin] = useState("");
  const [kitDailyMax, setKitDailyMax] = useState("");

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [showWiki, setShowWiki] = useState(false);

  const isRecurringExpense = txType === "expense" && category === "Recurring Expense";
  const isBroadcasting = txType === "income" && incomeMode === "standard" && category === "Broadcasting";
  const isShirtSales = txType === "income" && incomeMode === "standard" && category === "Shirt Sales";
  const needsWiki = isBroadcasting || isShirtSales;

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const teams = [...new Set(Object.values(data).filter(a => a.team).map(a => a.team))];
      setAllTeams(teams);
    });
    return () => unsub();
  }, []);

  // Reset fields when switching type
  useEffect(() => {
    setCategory(txType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setAmount("");
    setSource("");
    setIncomeMode("standard");
  }, [txType]);

  async function handleSubmit() {
    if (!selectedTeam) { setError("Please select a team."); return; }
    setError("");

    // ── RECURRING EXPENSE ──
    if (isRecurringExpense) {
      if (!recurringDailyAmount || !recurringTotalCap || Number(recurringDailyAmount) <= 0 || Number(recurringTotalCap) <= 0) {
        setError("Please fill in daily amount and total cap.");
        return;
      }
      setSaving(true);
      try {
        const now = new Date();
        const daily = Number(recurringDailyAmount);
        const total = Number(recurringTotalCap);
        const days = Math.ceil(total / daily);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        await push(ref(db, `career_team_management/${selectedTeam}/finance/recurring`), {
          type: "expense",
          description: recurringDescription.trim() || "Recurring Expense",
          dailyAmount: daily,
          totalCap: total,
          startTs: now.getTime(),
          startDate: now.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          status: "active",
          createdAt: now.getTime(),
          addedByAdmin: true,
        });
        setDone(true);
        setTimeout(onClose, 1600);
      } catch (e) { setError("Failed: " + e.message); }
      setSaving(false);
      return;
    }

    // ── RECURRING INCOME (TYPE FIELD) ──
    if (txType === "income" && incomeMode === "recurring_type") {
      if (!riDailyAmount || !riTotalCap || Number(riDailyAmount) <= 0 || Number(riTotalCap) <= 0) {
        setError("Please fill in daily amount and total cap.");
        return;
      }
      setSaving(true);
      try {
        const now = new Date();
        const daily = Number(riDailyAmount);
        const total = Number(riTotalCap);
        const days = Math.ceil(total / daily);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        await push(ref(db, `career_team_management/${selectedTeam}/finance/recurring`), {
          type: "income",
          description: riDescription.trim() || "Recurring Income",
          dailyAmount: daily,
          totalCap: total,
          startTs: now.getTime(),
          startDate: now.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          status: "active",
          createdAt: now.getTime(),
          addedByAdmin: true,
        });
        setDone(true);
        setTimeout(onClose, 1600);
      } catch (e) { setError("Failed: " + e.message); }
      setSaving(false);
      return;
    }

    // ── KIT SALES ──
    if (txType === "income" && incomeMode === "kit_sales") {
      const kp = Number(kitPrice);
      const kMin = Number(kitDailyMin);
      const kMax = Number(kitDailyMax);
      if (!kp || kp <= 0) { setError("Please enter a valid kit price."); return; }
      if (!kMin || !kMax || kMin <= 0 || kMax <= 0 || kMin > kMax) {
        setError("Please enter a valid daily range (min must be ≤ max).");
        return;
      }
      setSaving(true);
      try {
        const now = new Date();
        await push(ref(db, `career_team_management/${selectedTeam}/finance/recurring_kits`), {
          kitPrice: kp,
          dailyMin: kMin,
          dailyMax: kMax,
          startTs: now.getTime(),
          startDate: now.toISOString().slice(0, 10),
          status: "active",
          createdAt: now.getTime(),
          addedByAdmin: true,
        });
        setDone(true);
        setTimeout(onClose, 1600);
      } catch (e) { setError("Failed: " + e.message); }
      setSaving(false);
      return;
    }

    // ── STANDARD INCOME / EXPENSE ──
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    setSaving(true);
    try {
      const amt = Number(amount);
      const now = new Date();
      const monthIndex = now.getMonth();
      await push(ref(db, `career_team_management/${selectedTeam}/finance/transactions`), {
        type: txType,
        category,
        source: source.trim() || null,
        amount: amt,
        month: ALL_MONTHS[monthIndex],
        monthIndex,
        year: now.getFullYear(),
        createdAt: Date.now(),
        addedByAdmin: true,
        sentBy: "Admin",
        receivedBy: selectedTeam,
      });
      setDone(true);
      setTimeout(onClose, 1600);
    } catch (e) { setError("Failed: " + e.message); }
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
    textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700,
  };

  function getSubmitLabel() {
    if (isRecurringExpense) return "🔁 Set Up Recurring Expense";
    if (incomeMode === "recurring_type") return "🟢 Set Up Recurring Income";
    if (incomeMode === "kit_sales") return "👕 Set Up Kit Sales";
    return "✅ Apply Transaction";
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#ffffff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", marginBottom: "8px", letterSpacing: "3px" }}>
        💰 TEAM FINANCES
      </h3>
      <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "28px", fontSize: "1rem" }}>
        Assign funds or deduct expenses from a team's balance.
      </p>

      {done ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#00ff88", fontWeight: 700, fontSize: "1.4rem", background: "rgba(0,255,136,0.08)", borderRadius: "16px" }}>
          ✅ Done!
        </div>
      ) : (
        <>
          {/* ── Team ── */}
          <div style={{ marginBottom: "22px" }}>
            <label style={labelStyle}>Select Team</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Choose a team —</option>
              {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* ── Income / Expense toggle ── */}
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

          {/* ── INCOME MODES ── */}
          {txType === "income" && (
            <div style={{ marginBottom: "22px" }}>
              <label style={labelStyle}>Income Mode</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[
                  { id: "standard", label: "💵 Standard" },
                  { id: "recurring_type", label: "🟢 Recurring Income" },
                  { id: "kit_sales", label: "👕 Kit Sales" },
                ].map(m => (
                  <button key={m.id} onClick={() => setIncomeMode(m.id)} style={{
                    flex: 1, minWidth: "120px", padding: "14px", borderRadius: "14px", cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 700, fontSize: "1rem",
                    background: incomeMode === m.id ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${incomeMode === m.id ? "rgba(0,255,136,0.6)" : "rgba(255,255,255,0.15)"}`,
                    color: incomeMode === m.id ? "#00ff88" : "#fff", transition: "all 0.2s",
                  }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STANDARD INCOME ── */}
          {txType === "income" && incomeMode === "standard" && (
            <>
              <div style={{ marginBottom: "22px" }}>
                <label style={labelStyle}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {needsWiki ? (
                <>
                  <div style={{ marginBottom: "22px" }}>
                    <label style={labelStyle}>{isBroadcasting ? "Broadcasting Revenue" : "Shirt Sales Revenue"}</label>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" placeholder="Auto-filled from Wikipedia or enter manually" style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => { if (selectedTeam) setShowWiki(true); else setError("Select a team first."); }}
                        style={{ padding: "18px 20px", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.5)", borderRadius: "14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem", whiteSpace: "nowrap" }}>
                        🔍 Wiki Search
                      </button>
                    </div>
                    {amount && Number(amount) > 0 && <div style={{ marginTop: "8px", color: "#00ff88", fontSize: "1.1rem", fontWeight: 700 }}>+{formatAmount(Number(amount))}</div>}
                  </div>
                  <div style={{ marginBottom: "22px" }}>
                    <label style={labelStyle}>Source <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                    <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Wikipedia, Official report..." style={inputStyle} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: "22px" }}>
                    <label style={labelStyle}>Source <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                    <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Spotify, Nike, Club Name..." style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: "28px" }}>
                    <label style={labelStyle}>Amount (€)</label>
                    <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000000" style={inputStyle} type="number" min="0" />
                    {amount && Number(amount) > 0 && <div style={{ marginTop: "8px", color: "#00ff88", fontSize: "1.1rem", fontWeight: 700 }}>+{formatAmount(Number(amount))}</div>}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── RECURRING INCOME (TYPE FIELD) ── */}
          {txType === "income" && incomeMode === "recurring_type" && (
            <div style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: "16px", padding: "20px", marginBottom: "22px" }}>
              <div style={{ color: "#00ff88", fontWeight: 700, fontSize: "1rem", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>
                🟢 Recurring Income Setup
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Description</label>
                <input value={riDescription} onChange={e => setRiDescription(e.target.value)} placeholder="e.g. Shirt sponsorship, Broadcasting deal..." style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Daily Amount (€)</label>
                  <input value={riDailyAmount} onChange={e => setRiDailyAmount(e.target.value)} type="number" min="0" placeholder="e.g. 50000" style={inputStyle} />
                  {riDailyAmount && Number(riDailyAmount) > 0 && (
                    <div style={{ color: "#00ff88", fontSize: "0.9rem", marginTop: "4px", fontWeight: 700 }}>+{formatAmount(Number(riDailyAmount))}/day</div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Total Cap (€)</label>
                  <input value={riTotalCap} onChange={e => setRiTotalCap(e.target.value)} type="number" min="0" placeholder="e.g. 5000000" style={inputStyle} />
                  {riTotalCap && Number(riTotalCap) > 0 && (
                    <div style={{ color: "#00ff88", fontSize: "0.9rem", marginTop: "4px", fontWeight: 700 }}>Total: {formatAmount(Number(riTotalCap))}</div>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>Start Date</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>End Date</div>
                  <div style={{ color: getRecurringEndDate(riDailyAmount, riTotalCap) ? "#00ff88" : "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: "1rem" }}>
                    {getRecurringEndDate(riDailyAmount, riTotalCap) || "Set amounts above"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── KIT SALES ── */}
          {txType === "income" && incomeMode === "kit_sales" && (
            <div style={{ background: "rgba(100,180,255,0.05)", border: "1px solid rgba(100,180,255,0.25)", borderRadius: "16px", padding: "20px", marginBottom: "22px" }}>
              <div style={{ color: "#64b4ff", fontWeight: 700, fontSize: "1rem", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>
                👕 Kit Sales Setup
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Kit Price (€ per kit)</label>
                <input value={kitPrice} onChange={e => setKitPrice(e.target.value)} type="number" min="0" placeholder="e.g. 80" style={inputStyle} />
                {kitPrice && Number(kitPrice) > 0 && (
                  <div style={{ color: "#64b4ff", fontSize: "0.9rem", marginTop: "4px", fontWeight: 700 }}>€{Number(kitPrice).toLocaleString()} per kit</div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Daily Min (kits)</label>
                  <input value={kitDailyMin} onChange={e => setKitDailyMin(e.target.value)} type="number" min="0" placeholder="e.g. 500" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Daily Max (kits)</label>
                  <input value={kitDailyMax} onChange={e => setKitDailyMax(e.target.value)} type="number" min="0" placeholder="e.g. 800" style={inputStyle} />
                </div>
              </div>
              {/* Preview */}
              {kitPrice && kitDailyMin && kitDailyMax && Number(kitPrice) > 0 && Number(kitDailyMin) > 0 && Number(kitDailyMax) >= Number(kitDailyMin) && (
                <div style={{ background: "rgba(100,180,255,0.08)", borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Daily Revenue Range</div>
                  <div style={{ color: "#64b4ff", fontWeight: 700, fontSize: "1.1rem" }}>
                    +{formatAmount(Number(kitDailyMin) * Number(kitPrice))} → +{formatAmount(Number(kitDailyMax) * Number(kitPrice))}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", marginTop: "4px" }}>
                    Based on {kitDailyMin}–{kitDailyMax} kits × €{Number(kitPrice).toLocaleString()} per kit
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EXPENSE ── */}
          {txType === "expense" && (
            <>
              <div style={{ marginBottom: "22px" }}>
                <label style={labelStyle}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Recurring Expense */}
              {isRecurringExpense ? (
                <div style={{ background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.25)", borderRadius: "16px", padding: "20px", marginBottom: "22px" }}>
                  <div style={{ color: "#ffaa44", fontWeight: 700, fontSize: "1rem", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    🔁 Recurring Expense Setup
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={labelStyle}>What is it for?</label>
                    <input value={recurringDescription} onChange={e => setRecurringDescription(e.target.value)} placeholder="e.g. Stadium lease, Staff salaries..." style={inputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                    <div>
                      <label style={labelStyle}>Daily Amount (€)</label>
                      <input value={recurringDailyAmount} onChange={e => setRecurringDailyAmount(e.target.value)} type="number" min="0" placeholder="e.g. 50000" style={inputStyle} />
                      {recurringDailyAmount && Number(recurringDailyAmount) > 0 && (
                        <div style={{ color: "#ff6b6b", fontSize: "0.9rem", marginTop: "4px", fontWeight: 700 }}>−{formatAmount(Number(recurringDailyAmount))}/day</div>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Total Cap (€)</label>
                      <input value={recurringTotalCap} onChange={e => setRecurringTotalCap(e.target.value)} type="number" min="0" placeholder="e.g. 5000000" style={inputStyle} />
                      {recurringTotalCap && Number(recurringTotalCap) > 0 && (
                        <div style={{ color: "#ffaa44", fontSize: "0.9rem", marginTop: "4px", fontWeight: 700 }}>Total: {formatAmount(Number(recurringTotalCap))}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "14px 16px" }}>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>Start Date</div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "14px 16px" }}>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>End Date</div>
                      <div style={{ color: getRecurringEndDate(recurringDailyAmount, recurringTotalCap) ? "#00ff88" : "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: "1rem" }}>
                        {getRecurringEndDate(recurringDailyAmount, recurringTotalCap) || "Set amounts above"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "22px" }}>
                    <label style={labelStyle}>Source <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                    <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Spotify, Nike, Club Name..." style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: "28px" }}>
                    <label style={labelStyle}>Amount (€)</label>
                    <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000000" style={inputStyle} type="number" min="0" />
                    {amount && Number(amount) > 0 && (
                      <div style={{ marginTop: "8px", color: "#ff6b6b", fontSize: "1.1rem", fontWeight: 700 }}>−{formatAmount(Number(amount))}</div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "16px", padding: "14px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: "14px" }}>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "18px", background: "#ff1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Applying..." : getSubmitLabel()}
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.2rem" }}>Cancel</button>
          </div>
        </>
      )}

      {showWiki && (
        <WikiSearchModal
          mode={isBroadcasting ? "broadcasting" : "shirt_sales"}
          team={selectedTeam}
          onConfirm={amt => { setAmount(String(amt)); setShowWiki(false); }}
          onClose={() => setShowWiki(false)}
        />
      )}
    </div>
  );
}
