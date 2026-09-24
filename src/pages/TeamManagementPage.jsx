import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import FinanceDateFilterModal from "../modals/FinanceDateFilterModal";
import AdminFinanceModal from "../modals/AdminFinanceModal";
import RequestFinanceLoanModal from "../modals/RequestFinanceLoanModal";

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

// ─── UPDATED CATEGORIES ────────────────────────────────────────────────────
const INCOME_CATEGORIES = [
  "Player Sales",
  "Player Loaned Out",
  "Loan Received",
  "Loan Repayments",
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
  "Loan Given",
  "Loan Repayments",
  "Fines",
  "Recurring Expense",
];

const ALL_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

function getSASTMonthIndex() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Johannesburg",
    month: "numeric",
  });
  return parseInt(formatter.format(new Date())) - 1;
}

function formatDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDateOnly(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── RECURRING TRANSACTIONS CHECK (runs on page load) ─────────────────────
async function processRecurringTransactions(team) {
  if (!team) return;

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // ── 1. Recurring expense + recurring income (type field) ──────────────
  try {
    const recurringSnap = await get(ref(db, `career_team_management/${team}/finance/recurring`));
    const recurringData = recurringSnap.val();

    if (recurringData) {
      const txSnap = await get(ref(db, `career_team_management/${team}/finance/transactions`));
      const txData = txSnap.val() || {};

      for (const [rid, rec] of Object.entries(recurringData)) {
        if (rec.status === "completed" || rec.status === "cancelled") continue;

        const isIncome = rec.type === "income";
        const dailyAmount = Number(rec.dailyAmount);
        const totalCap = Number(rec.totalCap);

        const linkedTxs = Object.values(txData).filter(t => t.recurringId === rid);
        const totalDebited = linkedTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);

        if (totalDebited >= totalCap) {
          await update(ref(db, `career_team_management/${team}/finance/recurring/${rid}`), { status: "completed" });
          continue;
        }

        const startDate = new Date(rec.startTs);
        startDate.setHours(0, 0, 0, 0);
        const debitedSet = new Set(linkedTxs.filter(t => t.debitDate).map(t => t.debitDate));
        const cursor = new Date(startDate);
        const writes = [];

        while (cursor <= todayMidnight) {
          const dateStr = cursor.toISOString().slice(0, 10);
          if (!debitedSet.has(dateStr)) {
            const remaining = totalCap - totalDebited - writes.reduce((s, w) => s + w.amount, 0);
            if (remaining <= 0) break;
            const amount = Math.min(dailyAmount, remaining);
            writes.push({
              type: isIncome ? "income" : "expense",
              category: isIncome ? "Recurring Income" : "Recurring Expense",
              source: rec.description || (isIncome ? "Recurring Income" : "Recurring"),
              amount,
              month: ALL_MONTHS[cursor.getMonth()],
              monthIndex: cursor.getMonth(),
              year: cursor.getFullYear(),
              createdAt: cursor.getTime(),
              debitDate: dateStr,
              recurringId: rid,
              addedByAdmin: true,
              sentBy: "System (Recurring)",
              receivedBy: team,
            });
          }
          cursor.setDate(cursor.getDate() + 1);
        }

        for (const tx of writes) {
          await push(ref(db, `career_team_management/${team}/finance/transactions`), tx);
        }

        const newTotal = totalDebited + writes.reduce((s, w) => s + w.amount, 0);
        if (newTotal >= totalCap) {
          await update(ref(db, `career_team_management/${team}/finance/recurring/${rid}`), { status: "completed" });
        }
      }
    }
  } catch (e) {
    console.error("Recurring tx error:", e);
  }

  // ── 2. Kit Sales ───────────────────────────────────────────────────────
  try {
    const kitsSnap = await get(ref(db, `career_team_management/${team}/finance/recurring_kits`));
    const kitsData = kitsSnap.val();
    if (!kitsData) return;

    const txSnap = await get(ref(db, `career_team_management/${team}/finance/transactions`));
    const txData = txSnap.val() || {};

    for (const [kid, kit] of Object.entries(kitsData)) {
      if (kit.status === "cancelled") continue;

      const kitPrice = Number(kit.kitPrice);
      const dailyMin = Number(kit.dailyMin);
      const dailyMax = Number(kit.dailyMax);

      const linkedTxs = Object.values(txData).filter(t => t.kitSalesId === kid);
      const debitedSet = new Set(linkedTxs.filter(t => t.debitDate).map(t => t.debitDate));

      const startDate = new Date(kit.startTs);
      startDate.setHours(0, 0, 0, 0);
      const cursor = new Date(startDate);
      const writes = [];

      while (cursor <= todayMidnight) {
        const dateStr = cursor.toISOString().slice(0, 10);
        if (!debitedSet.has(dateStr)) {
          // Seeded random using date so re-runs produce the same value for same day
          const seed = parseInt(dateStr.replace(/-/g, ""), 10) + kid.length;
          const pseudoRand = ((seed * 9301 + 49297) % 233280) / 233280;
          const kitsCount = Math.floor(dailyMin + pseudoRand * (dailyMax - dailyMin + 1));
          const amount = kitsCount * kitPrice;
          writes.push({
            type: "income",
            category: "Kit Sales",
            source: `${kitsCount} kits × €${kitPrice.toLocaleString()}`,
            amount,
            month: ALL_MONTHS[cursor.getMonth()],
            monthIndex: cursor.getMonth(),
            year: cursor.getFullYear(),
            createdAt: cursor.getTime(),
            debitDate: dateStr,
            kitSalesId: kid,
            kitsCount,
            kitPrice,
            addedByAdmin: true,
            sentBy: "System (Kit Sales)",
            receivedBy: team,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const tx of writes) {
        await push(ref(db, `career_team_management/${team}/finance/transactions`), tx);
      }
    }
  } catch (e) {
    console.error("Kit sales recurring error:", e);
  }
}

// ─── PEER-TO-PEER CLUB LOANS ──────────────────────────────────────────────
// Loans live on one shared record at career_club_loans/{loanId}:
//   { borrowerClub, lenderClub, amount, repayAmount, installments, frequency,
//     status: pending | active | completed | rejected,
//     createdAt, acceptedAt, startTs, processedDates: { i1: "YYYY-MM-DD", ... } }
// Nothing touches either club's balance until the lender accepts.

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function ymd(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function txDateFields(d) {
  return { month: ALL_MONTHS[d.getMonth()], monthIndex: d.getMonth(), year: d.getFullYear() };
}

// Due date of installment k (1-based): start date + k periods
function addLoanPeriod(start, k, frequency) {
  const d = new Date(start);
  if (frequency === "day") {
    d.setDate(d.getDate() + k);
  } else if (frequency === "week") {
    d.setDate(d.getDate() + 7 * k);
  } else {
    const day = start.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + k);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, daysInMonth));
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function loanFrequencyLabel(frequency) {
  return frequency === "day" ? "day" : frequency === "week" ? "week" : "month";
}

function getLoanStats(loan) {
  const n = Math.max(1, Math.floor(Number(loan.installments)) || 1);
  const repay = Number(loan.repayAmount) || 0;
  const amount = Number(loan.amount) || 0;
  const paid = Object.keys(loan.processedDates || {}).length;
  const per = round2(repay / n);
  const repaid = paid >= n ? repay : round2(per * paid);
  return { n, repay, amount, paid, per, repaid, interest: round2(repay - amount) };
}

// Runs on page load. For every active loan involving this club, pays each
// installment that has come due — borrower expense + lender income are written
// in ONE multi-path update, and the installment is marked in processedDates on
// the shared loan record. Transaction keys are deterministic, so even if both
// managers load the page at the same moment nothing is ever charged twice.
async function processClubLoanInstallments(team) {
  if (!team) return;
  try {
    const snap = await get(ref(db, PATHS.clubLoans));
    const all = snap.val();
    if (!all) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const [id, loan] of Object.entries(all)) {
      if (loan.status !== "active") continue;
      if (loan.borrowerClub !== team && loan.lenderClub !== team) continue;

      const { n, repay, per } = getLoanStats(loan);
      const processed = loan.processedDates || {};
      const startDate = new Date(loan.startTs || loan.acceptedAt || Date.now());
      startDate.setHours(0, 0, 0, 0);

      const updates = {};
      let paidCount = Object.keys(processed).length;

      for (let k = 1; k <= n; k++) {
        if (processed[`i${k}`]) continue;
        const due = addLoanPeriod(startDate, k, loan.frequency);
        if (due > today) break;

        const amount = k === n ? round2(repay - per * (n - 1)) : per;
        const dateStr = ymd(due);
        const common = {
          amount,
          ...txDateFields(due),
          createdAt: due.getTime(),
          debitDate: dateStr,
          loanId: id,
          installment: k,
          sentBy: "System (Club Loan)",
        };

        updates[`${PATHS.clubLoans}/${id}/processedDates/i${k}`] = dateStr;
        updates[`career_team_management/${loan.borrowerClub}/finance/transactions/loan_${id}_${k}_b`] = {
          ...common,
          type: "expense",
          category: "Loan Repayments",
          source: `Loan repayment ${k}/${n} · ${loan.lenderClub}`,
          receivedBy: loan.lenderClub,
        };
        updates[`career_team_management/${loan.lenderClub}/finance/transactions/loan_${id}_${k}_l`] = {
          ...common,
          type: "income",
          category: "Loan Repayments",
          source: `Loan repayment ${k}/${n} · ${loan.borrowerClub}`,
          receivedBy: loan.lenderClub,
        };
        paidCount++;
      }

      if (Object.keys(updates).length === 0) continue;
      if (paidCount >= n) {
        updates[`${PATHS.clubLoans}/${id}/status`] = "completed";
        updates[`${PATHS.clubLoans}/${id}/completedAt`] = Date.now();
      }
      await update(ref(db), updates);
    }
  } catch (e) {
    console.error("Club loan installment error:", e);
  }
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
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", color: "#ffffff", margin: "0 0 8px" }}>ADMIN VIEW</h2>
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
        style={{ width: "100%", padding: "16px", background: selected ? "#ff1493" : "rgba(255,20,147,0.2)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: selected ? "pointer" : "not-allowed" }}
      >
        View Team Dashboard →
      </button>
    </div>
  );
}

// ─── UPGRADE STADIUM POPUP ─────────────────────────────────────────────────
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
        <h3 style={{ color: "#ffffff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: "3px", marginBottom: "8px" }}>UPGRADE STADIUM</h3>
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
              <button onClick={handleSend} disabled={sending} style={{ flex: 1, padding: "16px", background: "#ff1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: sending ? "not-allowed" : "pointer" }}>
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

// ─── ALL LEAGUES FOR TICKET CALCULATION ───────────────────────────────────
const ALL_LEAGUES = ["premier", "laliga", "seriea", "bundesliga", "ligue1", "ucl", "uel"];

// ─── STADIUM TAB ──────────────────────────────────────────────────────────
function StadiumTab({ team, isAdmin, onEditStadium }) {
  const [data, setData] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [underConstruction, setUnderConstruction] = useState(false);
  const [savingConstruction, setSavingConstruction] = useState(false);
  const [homeGamesCount, setHomeGamesCount] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/stadium`), snap => {
      const d = snap.val();
      setData(d);
      setUnderConstruction(d?.underConstruction || false);
    });
    return () => unsub();
  }, [team]);

  // ── Fetch home games across all leagues active seasons ──────────────
  useEffect(() => {
    if (!team) return;
    let cancelled = false;

    async function fetchHomeGames() {
      let total = 0;

      // Get stadium data for transaction creation
      const stadiumSnap = await get(ref(db, `career_team_management/${team}/stadium`));
      const stadiumData = stadiumSnap.val();
      const capacity = stadiumData?.capacity ? Number(stadiumData.capacity) : 0;
      const ticketPrice = stadiumData?.ticketPrice ? Number(stadiumData.ticketPrice) : 0;
      const expensesPerGame = stadiumData?.expensesPerGame ? Number(stadiumData.expensesPerGame) : 0;

      // Get existing transactions to avoid duplicates
      const txSnap = await get(ref(db, `career_team_management/${team}/finance/transactions`));
      const txData = txSnap.val() || {};
      const existingMatchIds = new Set(
        Object.values(txData).filter(t => t.matchId).map(t => t.matchId)
      );

      for (const league of ALL_LEAGUES) {
        try {
          // Get active season — read season keys directly from the league node
          const seasonsSnap = await get(ref(db, `career_${league}/seasons`));
          const seasonsData = seasonsSnap.val();
          if (!seasonsData) continue;

          // Take the last season key (e.g. "season_1", "season_2")
          const seasonKeys = Object.keys(seasonsData).sort();
          const activeSeasonKey = seasonKeys[seasonKeys.length - 1];

          const resultsSnap = await get(ref(db, `career_${league}/seasons/${activeSeasonKey}/results`));
          const resultsData = resultsSnap.val();
          if (!resultsData) continue;

          const leagueLabel = league === "premier" ? "Premier League"
            : league === "laliga" ? "La Liga"
            : league === "seriea" ? "Serie A"
            : league === "bundesliga" ? "Bundesliga"
            : league === "ligue1" ? "Ligue 1"
            : league === "ucl" ? "Champions League"
            : league === "uel" ? "Europa League"
            : league.toUpperCase();

          const homeGames = Object.entries(resultsData).filter(([, r]) =>
            r.homeTeam === team && r.forfeitType !== "no_contest"
          );

          total += homeGames.length;

          // Auto-create ticket income + stadium expense per home match
          for (const [matchKey, match] of homeGames) {
            const matchId = `${league}_${activeSeasonKey}_${matchKey}`;
            const incomeMatchId = `income_${matchId}`;
            const expenseMatchId = `expense_${matchId}`;

            const matchDate = match.date ? new Date(match.date) : new Date();
            const monthIndex = matchDate.getMonth();
            const year = matchDate.getFullYear();
            const source = `${leagueLabel} — MD${match.md || "?"} vs ${match.awayTeam}`;

            // Ticket income
            if (!existingMatchIds.has(incomeMatchId) && capacity > 0 && ticketPrice > 0) {
              const incomeAmount = capacity * ticketPrice;
              await push(ref(db, `career_team_management/${team}/finance/transactions`), {
                type: "income",
                category: "Stadium Income",
                source,
                amount: incomeAmount,
                month: ALL_MONTHS[monthIndex],
                monthIndex,
                year,
                createdAt: matchDate.getTime(),
                matchId: incomeMatchId,
                addedByAdmin: true,
                sentBy: "System (Stadium)",
                receivedBy: team,
              });
              existingMatchIds.add(incomeMatchId);
            }

            // Stadium expense per game
            if (!existingMatchIds.has(expenseMatchId) && expensesPerGame > 0) {
              await push(ref(db, `career_team_management/${team}/finance/transactions`), {
                type: "expense",
                category: "Facility Expenses",
                source,
                amount: expensesPerGame,
                month: ALL_MONTHS[monthIndex],
                monthIndex,
                year,
                createdAt: matchDate.getTime(),
                matchId: expenseMatchId,
                addedByAdmin: true,
                sentBy: "System (Stadium)",
                receivedBy: team,
              });
              existingMatchIds.add(expenseMatchId);
            }
          }
        } catch (e) {
          // league may not exist, skip
        }
      }
      if (!cancelled) setHomeGamesCount(total);
    }

    fetchHomeGames();
    return () => { cancelled = true; };
  }, [team]);

  useEffect(() => {
    if (!data?.images?.length) return;
    timerRef.current = setInterval(() => setSlideIdx(i => (i + 1) % data.images.length), 4000);
    return () => clearInterval(timerRef.current);
  }, [data?.images?.length]);

  async function toggleConstruction() {
    setSavingConstruction(true);
    try {
      await update(ref(db, `career_team_management/${team}/stadium`), {
        underConstruction: !underConstruction,
      });
    } catch (e) {
      console.error(e);
    }
    setSavingConstruction(false);
  }

  const capacity = data?.capacity ? Number(data.capacity) : 0;
  const ticketPrice = data?.ticketPrice ? Number(data.ticketPrice) : 0;
  const ticketsSold = homeGamesCount * capacity;
  const stadiumIncome = ticketsSold * ticketPrice;

  if (!data) return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🏟️</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px" }}>No Stadium Data Yet</div>
      <div style={{ fontSize: "2rem", marginTop: "10px" }}>Admin can set up the stadium using the + menu.</div>
      {isAdmin && (
        <button onClick={onEditStadium} style={{ marginTop: "24px", padding: "16px 32px", background: "#ff1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: "pointer" }}>
          🏟️ Set Up Stadium
        </button>
      )}
    </div>
  );

  const images = data.images || [];

  return (
    <div style={{ width: "100%" }}>
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button
            onClick={toggleConstruction}
            disabled={savingConstruction}
            style={{
              padding: "12px 24px",
              background: underConstruction ? "rgba(255,170,0,0.2)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${underConstruction ? "rgba(255,170,0,0.6)" : "rgba(255,255,255,0.2)"}`,
              borderRadius: "12px", color: underConstruction ? "#ffaa44" : "#fff",
              fontWeight: 700, fontSize: "1.1rem", cursor: "pointer",
            }}
          >
            🏗️ {underConstruction ? "Remove Construction" : "Set Under Construction"}
          </button>
          <button onClick={onEditStadium} style={{ padding: "12px 24px", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.5)", borderRadius: "12px", color: "#ffffff", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer" }}>
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
                <div key={i} onClick={() => setSlideIdx(i)} style={{ width: "10px", height: "10px", borderRadius: "50%", background: i === slideIdx ? "#ffffff" : "rgba(255,255,255,0.4)", cursor: "pointer" }} />
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
        <div style={{ color: "#ffffff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.4rem, 6vw, 5rem)", letterSpacing: "5px", textTransform: "uppercase", textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>
          {data.stadiumName || "STADIUM NAME"}
        </div>
        {data.location && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.6rem", marginTop: "6px", letterSpacing: "2px" }}>📍 {data.location}</div>}
        {data.capacity && (
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.6rem", marginTop: "8px" }}>
            Capacity: <span style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{Number(data.capacity).toLocaleString()}</span>
          </div>
        )}
        {underConstruction && (
          <div style={{ marginTop: "10px", display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,170,0,0.12)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: "20px", padding: "8px 20px" }}>
            <span style={{ fontSize: "1.4rem" }}>🏗️</span>
            <span style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px" }}>STADIUM UNDER CONSTRUCTION</span>
          </div>
        )}
      </div>

      <div style={{ ...GLASS, borderRadius: "20px", overflow: "hidden", marginBottom: "28px" }}>
        {[
          {
            label: "🎟️ Tickets Sold This Season",
            value: capacity > 0
              ? `${ticketsSold.toLocaleString()} (${homeGamesCount} home game${homeGamesCount !== 1 ? "s" : ""})`
              : "—",
          },
          {
            label: "💶 Standard Ticket Price",
            value: data.ticketPrice ? `€${Number(data.ticketPrice).toLocaleString()}` : "—",
          },
          {
            label: "💰 Stadium Income",
            value: stadiumIncome > 0 ? `€${stadiumIncome.toLocaleString()}` : "—",
          },
          {
            label: "💸 Stadium Expenses Per Game",
            value: data.expensesPerGame ? `€${Number(data.expensesPerGame).toLocaleString()}` : "—",
          },
          {
            label: "🤝 Sponsorship Deals",
            value: data.sponsorshipDeals || "—",
          },
        ].map(({ label, value }, i) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "40px 56px", borderBottom: i < 4 ? "1px solid rgba(255,20,147,0.1)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "2.6rem" }}>{label}</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "2.8rem" }}>{value}</span>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setShowUpgrade(true)}
            style={{ padding: "36px 80px", background: "linear-gradient(135deg, rgba(255,20,147,0.2), rgba(255,20,147,0.05))", border: "1px solid rgba(255,20,147,0.5)", borderRadius: "16px", color: "#ffffff", fontWeight: 700, fontSize: "2.6rem", cursor: "pointer", letterSpacing: "1px" }}
          >
            🏗️ Upgrade Stadium
          </button>
        </div>
      )}

      {showUpgrade && <UpgradeStadiumPopup team={team} onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

// ─── SQUAD TAB WRAPPER ────────────────────────────────────────────────────
function SquadTabWrapper({ team, isAdmin, onEditSquad }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>👥</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", color: "#fff" }}>Squad Management</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.2rem", marginTop: "10px" }}>Click "TEAM" tab or visit the Squad page.</div>
      {isAdmin && (
        <button onClick={onEditSquad} style={{ marginTop: "24px", padding: "16px 32px", background: "#ff1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: "pointer" }}>
          ✏️ Edit Squad
        </button>
      )}
    </div>
  );
}

// ─── TRANSFERS TAB ─────────────────────────────────────────────────────────
// One merged table (offers received + offers sent), newest first, searchable,
// with each row expanding inline to show the full offer details.
function TransfersTab({ team, teamIcons, isAdmin }) {
  const [negotiations, setNegotiations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

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

  async function handleDelete(offerId) {
    if (!window.confirm("Delete this offer permanently?")) return;
    setDeletingId(offerId);
    try {
      await remove(ref(db, `${PATHS.transfers}/negotiations/${offerId}`));
    } catch (e) {
      console.error(e);
    }
    setDeletingId(null);
  }

  const rows = negotiations
    .filter(n => n.toClub === team || n.playerClub === team || n.fromClub === team)
    .map(n => ({ ...n, direction: n.fromClub === team ? "Sent" : "Received" }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const q = search.trim().toLowerCase();
  const visibleRows = !q ? rows : rows.filter(o => {
    const hay = [
      o.playerName, o.playerClub, o.fromClub, o.toClub, o.fromManagerName,
      o.type, o.status, o.direction,
      o.offerAmount, o.loanAmount, o.bidAmount,
      o.createdAt ? formatDateTime(o.createdAt) : "",
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });

  const statusColors = { pending: "#ffaa44", accepted: "#00ff88", rejected: "#ff6b6b", cancelled: "#aaaaaa" };
  const COLS = "2.4fr 1.1fr 1fr 2fr 1.3fr 1.1fr 1.6fr";

  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", display: "flex", alignItems: "center", gap: "12px" }}>
          🔁 TRANSFER OFFERS
          <span style={{ background: "rgba(255,20,147,0.15)", border: "1px solid #ff1493", color: "#ff1493", borderRadius: "20px", padding: "4px 28px", fontSize: "2rem" }}>{rows.length}</span>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search player, club, type, status..."
          style={{ flex: "1 1 320px", maxWidth: "520px", padding: "14px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "14px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: "6rem", marginBottom: "12px" }}>📋</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "2px" }}>No Transfer Offers</div>
        </div>
      ) : visibleRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "rgba(255,255,255,0.3)", fontSize: "1.4rem" }}>
          No offers match "{search}"
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: "900px" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: COLS, gap: "12px", padding: "10px 20px", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
              <div>Player</div><div>Direction</div><div>Type</div><div>From → To</div><div>Amount</div><div>Status</div><div>Date</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {visibleRows.map(offer => {
                const isOpen = expandedId === offer.id;
                const statusColor = statusColors[offer.status] || "#ffaa44";
                const typeColor = offer.type === "buy" ? "#ff1493" : offer.type === "loan" ? "#44aaff" : "#ffaa44";
                const isSent = offer.direction === "Sent";
                const clubLogo = teamIcons?.[offer.playerClub] || teamIcons?.[offer.fromClub];
                const amountText = offer.offerAmount || offer.loanAmount || offer.bidAmount || "—";
                return (
                  <div key={offer.id} style={{ background: isOpen ? "rgba(255,20,147,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${isOpen ? "rgba(255,20,147,0.5)" : "rgba(255,20,147,0.18)"}`, borderRadius: "14px", overflow: "hidden", transition: "all 0.2s" }}>
                    <div
                      onClick={() => setExpandedId(isOpen ? null : offer.id)}
                      style={{ display: "grid", gridTemplateColumns: COLS, gap: "12px", alignItems: "center", padding: "16px 20px", cursor: "pointer", color: "#fff", fontSize: "1.1rem" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        <div style={{ width: "44px", height: "44px", flexShrink: 0 }}>
                          {clubLogo
                            ? <img src={clubLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                            : <ShirtSVGSmall clubName={offer.playerClub} playerName={offer.playerName} squadNumber={null} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{offer.playerName}</div>
                          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{offer.playerClub}</div>
                        </div>
                      </div>
                      <div>
                        <span style={{ color: isSent ? "#ffffff" : "#00ff88", fontWeight: 700 }}>{isSent ? "📤 Sent" : "📥 Received"}</span>
                      </div>
                      <div>
                        <span style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}`, borderRadius: "8px", padding: "3px 10px", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.type}</span>
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.95rem", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {offer.fromClub || offer.fromManagerName || "—"} → {offer.toClub || offer.playerClub || "—"}
                      </div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "1px" }}>{amountText}</div>
                      <div>
                        <span style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}`, borderRadius: "8px", padding: "3px 10px", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.status}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", color: "rgba(255,255,255,0.55)", fontSize: "0.9rem" }}>
                        <span>{offer.createdAt ? formatDateOnly(offer.createdAt) : "—"}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          {isAdmin && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(offer.id); }}
                              disabled={deletingId === offer.id}
                              style={{ width: "34px", height: "34px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.4)", borderRadius: "10px", color: "#ff6b6b", cursor: "pointer", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                              title="Delete offer"
                            >
                              {deletingId === offer.id ? "..." : "🗑️"}
                            </button>
                          )}
                          <span style={{ color: "#ff1493", fontSize: "1rem" }}>{isOpen ? "▲" : "▼"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Inline expansion */}
                    {isOpen && (
                      <div style={{ padding: "4px 20px 22px", borderTop: "1px solid rgba(255,20,147,0.15)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", marginTop: "18px" }}>
                          {[
                            ["Player", offer.playerName],
                            ["Player Club", offer.playerClub],
                            ["From Club", offer.fromClub],
                            ["Manager", offer.fromManagerName],
                            ["To Club", offer.toClub || offer.playerClub],
                            offer.type === "auction" ? ["Bid", offer.bidAmount] : offer.type === "loan" ? ["Loan Fee", offer.loanAmount] : ["Offer", offer.offerAmount],
                            offer.contractLength && ["Contract", offer.contractLength],
                            offer.loanTerm && ["Loan Term", offer.loanTerm],
                            offer.wage && ["Wage", offer.wage],
                            ["Sent", offer.createdAt ? formatDateTime(offer.createdAt) : "—"],
                          ].filter(Boolean).map(([label, value]) => (
                            <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "14px 16px" }}>
                              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>{label}</div>
                              <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem" }}>{value || "—"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SHIRT SVG ─────────────────────────────────────────────────────────────
function ShirtSVGSmall({ clubName, playerName, squadNumber }) {
  const colors = { primary: "#ffffff", secondary: "#000033", text: "#fff" };
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

// ─── CLUB LOANS SECTION (Finance tab) ─────────────────────────────────────
function ClubLoansSection({ team, isAdmin }) {
  const { manager } = useAdmin();
  const [allLoans, setAllLoans] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showRequest, setShowRequest] = useState(false);
  const [viewAll, setViewAll] = useState(true); // admin: all clubs vs. just this club
  const [busyId, setBusyId] = useState(null);

  // Only the manager of the club being viewed can request / respond
  const isTeamManager = !isAdmin && !!manager && manager.team === team;

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, PATHS.clubLoans), snap => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, l]) => ({ id, ...l }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllLoans(list);
    });
    return () => unsub();
  }, [team]);

  const adminOverview = isAdmin && viewAll;
  const loans = adminOverview
    ? allLoans
    : allLoans.filter(l => l.lenderClub === team || l.borrowerClub === team);

  const incoming = loans.filter(l => l.lenderClub === team && l.status === "pending");
  const outgoing = loans.filter(l => l.borrowerClub === team && (l.status === "pending" || l.status === "rejected"));
  const running = loans.filter(l => l.status === "active" || l.status === "completed");

  async function handleAccept(loan) {
    if (!isTeamManager || busyId) return;
    setBusyId(loan.id);
    try {
      // Re-read so a stale card can never be accepted twice
      const cur = (await get(ref(db, `${PATHS.clubLoans}/${loan.id}`))).val();
      if (!cur || cur.status !== "pending") {
        alert("This loan request is no longer pending.");
        return;
      }
      const amount = Number(cur.amount) || 0;

      const lenderTxs = (await get(ref(db, `career_team_management/${cur.lenderClub}/finance/transactions`))).val() || {};
      const lenderBalance = Object.values(lenderTxs).reduce((sum, tx) => {
        const amt = Number(tx.amount) || 0;
        return tx.type === "income" ? sum + amt : sum - amt;
      }, 0);
      if (lenderBalance < amount) {
        alert(`Your club balance (${formatBalance(lenderBalance)}) is too low to lend ${formatBalance(amount)}.`);
        return;
      }

      const now = new Date();
      const startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const common = { amount, ...txDateFields(now), createdAt: now.getTime(), loanId: loan.id, sentBy: "System (Club Loan)" };

      // One atomic write: loan goes active AND the principal moves both ways
      await update(ref(db), {
        [`${PATHS.clubLoans}/${loan.id}/status`]: "active",
        [`${PATHS.clubLoans}/${loan.id}/acceptedAt`]: now.getTime(),
        [`${PATHS.clubLoans}/${loan.id}/acceptedByName`]: manager.username || "",
        [`${PATHS.clubLoans}/${loan.id}/startTs`]: startTs,
        [`career_team_management/${cur.lenderClub}/finance/transactions/loan_${loan.id}_out`]: {
          ...common, type: "expense", category: "Loan Given",
          source: `Loan to ${cur.borrowerClub}`, receivedBy: cur.borrowerClub,
        },
        [`career_team_management/${cur.borrowerClub}/finance/transactions/loan_${loan.id}_in`]: {
          ...common, type: "income", category: "Loan Received",
          source: `Loan from ${cur.lenderClub}`, receivedBy: cur.borrowerClub,
        },
      });
      // First installment may already be due for very short schedules
      processClubLoanInstallments(team);
    } catch (e) {
      console.error(e);
      alert("Could not accept the loan: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(loan) {
    if (!isTeamManager || busyId) return;
    if (!window.confirm(`Reject the loan request from ${loan.borrowerClub}?`)) return;
    setBusyId(loan.id);
    try {
      const cur = (await get(ref(db, `${PATHS.clubLoans}/${loan.id}`))).val();
      if (!cur || cur.status !== "pending") {
        alert("This loan request is no longer pending.");
        return;
      }
      await update(ref(db, `${PATHS.clubLoans}/${loan.id}`), {
        status: "rejected",
        respondedAt: Date.now(),
        respondedByName: manager.username || "",
      });
    } catch (e) {
      console.error(e);
      alert("Could not reject the loan: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  const blockHead = (title, color, count) => (
    <div style={{ color, fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "2px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
      {title}
      <span style={{ background: `${color}22`, border: `1px solid ${color}`, borderRadius: "20px", padding: "2px 22px", fontSize: "1.8rem" }}>{count}</span>
    </div>
  );

  const detailGrid = (loan, stats) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", marginTop: "20px" }}>
      {[
        ["Borrower", loan.borrowerClub],
        ["Lender", loan.lenderClub],
        ["Amount Borrowed", formatAmount(stats.amount)],
        ["Total To Repay", formatAmount(stats.repay)],
        ["Extra Paid Back", `${formatAmount(stats.interest)}${stats.amount > 0 ? ` (${((stats.interest / stats.amount) * 100).toFixed(1)}%)` : ""}`],
        ["Installments", `${stats.n} × ${formatAmount(stats.per)} per ${loanFrequencyLabel(loan.frequency)}`],
        ["Requested By", loan.requestedByName || "—"],
        ["Requested On", loan.createdAt ? formatDateTime(loan.createdAt) : "—"],
      ].map(([label, value]) => (
        <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px 18px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>{label}</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.5rem" }}>{value}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ ...GLASS, borderRadius: "20px", padding: "48px", marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "28px" }}>
        <div style={{ color: "#44aaff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "3px" }}>🏦 CLUB LOANS</div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "10px" }}>
            {[[true, "All Clubs"], [false, `${team} Only`]].map(([val, label]) => (
              <button key={label} onClick={() => setViewAll(val)} style={{ padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 700, fontSize: "1.2rem", background: viewAll === val ? "rgba(68,170,255,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${viewAll === val ? "#44aaff" : "rgba(255,255,255,0.15)"}`, color: viewAll === val ? "#44aaff" : "rgba(255,255,255,0.5)" }}>{label}</button>
            ))}
          </div>
        )}
        {isTeamManager && (
          <button
            onClick={() => setShowRequest(true)}
            style={{ padding: "16px 30px", background: "#ff1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.3rem", cursor: "pointer" }}
          >
            ➕ Request Loan
          </button>
        )}
      </div>

      {loans.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px", color: "rgba(255,255,255,0.25)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>
          No Club Loans Yet
        </div>
      )}

      {/* ── Admin overview: every loan between every club ── */}
      {adminOverview && loans.length > 0 && (
        <div>
          {blockHead("👁️ ALL LOANS BETWEEN CLUBS", "#44aaff", loans.length)}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {loans.map(loan => {
              const stats = getLoanStats(loan);
              const meta = {
                pending: ["Pending", "#ffaa44"], rejected: ["Rejected", "#ff6b6b"],
                active: ["Active", "#44aaff"], completed: ["Completed", "#00ff88"],
              }[loan.status] || [loan.status || "—", "#aaaaaa"];
              const started = loan.status === "active" || loan.status === "completed";
              const progress = Math.min((stats.paid / stats.n) * 100, 100);
              return (
                <div key={loan.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", padding: "28px 34px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{loan.borrowerClub} ← {loan.lenderClub}</div>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.4rem", marginTop: "6px" }}>
                        {formatAmount(stats.amount)} borrowed · {formatAmount(stats.repay)} to repay · {stats.n} × {formatAmount(stats.per)} per {loanFrequencyLabel(loan.frequency)}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.2rem", marginTop: "4px" }}>
                        Requested {loan.createdAt ? formatDateOnly(loan.createdAt) : "—"}{loan.requestedByName ? ` by ${loan.requestedByName}` : ""}
                        {loan.acceptedAt ? ` · Accepted ${formatDateOnly(loan.acceptedAt)}` : ""}
                      </div>
                    </div>
                    <span style={{ background: `${meta[1]}22`, color: meta[1], border: `1px solid ${meta[1]}`, borderRadius: "8px", padding: "8px 22px", fontSize: "1.5rem", fontWeight: 700, textTransform: "uppercase" }}>{meta[0]}</span>
                  </div>
                  {started && (
                    <div style={{ marginTop: "18px" }}>
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "8px", height: "16px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress}%`, background: loan.status === "completed" ? "#00ff88" : "linear-gradient(to right, #44aaff, #00ff88)", borderRadius: "8px" }} />
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.4rem", marginTop: "10px" }}>
                        {formatAmount(stats.repaid)} repaid of {formatAmount(stats.repay)} · {stats.paid}/{stats.n} installments
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Incoming pending requests (you are the lender) ── */}
      {!adminOverview && incoming.length > 0 && (
        <div style={{ marginBottom: "36px" }}>
          {blockHead("📥 LOAN REQUESTS RECEIVED", "#44aaff", incoming.length)}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {incoming.map(loan => {
              const stats = getLoanStats(loan);
              const isOpen = expandedId === loan.id;
              return (
                <div key={loan.id} style={{ background: "rgba(68,170,255,0.07)", border: "1px solid rgba(68,170,255,0.35)", borderRadius: "16px", padding: "28px 34px" }}>
                  <div onClick={() => setExpandedId(isOpen ? null : loan.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", cursor: "pointer", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{loan.borrowerClub} wants to borrow {formatAmount(stats.amount)}</div>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.4rem", marginTop: "6px" }}>
                        Repays {formatAmount(stats.repay)} in {stats.n} × {formatAmount(stats.per)} per {loanFrequencyLabel(loan.frequency)}
                      </div>
                    </div>
                    <span style={{ color: "#44aaff", fontSize: "1.6rem", fontWeight: 700 }}>{isOpen ? "▲ Hide" : "▼ Details"}</span>
                  </div>
                  {isOpen && (
                    <div>
                      {detailGrid(loan, stats)}
                      {isTeamManager ? (
                        <div style={{ display: "flex", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
                          <button onClick={() => handleAccept(loan)} disabled={busyId === loan.id} style={{ flex: 1, minWidth: "200px", padding: "18px", background: "rgba(0,255,136,0.18)", border: "1px solid rgba(0,255,136,0.6)", borderRadius: "14px", color: "#00ff88", fontWeight: 800, fontSize: "1.4rem", cursor: busyId === loan.id ? "not-allowed" : "pointer", opacity: busyId === loan.id ? 0.6 : 1 }}>
                            ✅ Accept
                          </button>
                          <button onClick={() => handleReject(loan)} disabled={busyId === loan.id} style={{ flex: 1, minWidth: "200px", padding: "18px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.5)", borderRadius: "14px", color: "#ff6b6b", fontWeight: 800, fontSize: "1.4rem", cursor: busyId === loan.id ? "not-allowed" : "pointer", opacity: busyId === loan.id ? 0.6 : 1 }}>
                            ❌ Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.2rem", marginTop: "18px" }}>Only {loan.lenderClub}'s manager can accept or reject this request.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Outgoing requests (you are the borrower) ── */}
      {!adminOverview && outgoing.length > 0 && (
        <div style={{ marginBottom: "36px" }}>
          {blockHead("📤 LOAN REQUESTS SENT", "#ffaa44", outgoing.length)}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {outgoing.map(loan => {
              const stats = getLoanStats(loan);
              const rejected = loan.status === "rejected";
              const color = rejected ? "#ff6b6b" : "#ffaa44";
              return (
                <div key={loan.id} style={{ background: rejected ? "rgba(255,107,107,0.06)" : "rgba(255,170,0,0.06)", border: `1px solid ${rejected ? "rgba(255,107,107,0.3)" : "rgba(255,170,0,0.3)"}`, borderRadius: "16px", padding: "28px 34px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{formatAmount(stats.amount)} from {loan.lenderClub}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.4rem", marginTop: "6px" }}>
                      Repay {formatAmount(stats.repay)} · {stats.n} × {formatAmount(stats.per)} per {loanFrequencyLabel(loan.frequency)}
                    </div>
                  </div>
                  <span style={{ background: `${color}22`, color, border: `1px solid ${color}`, borderRadius: "8px", padding: "8px 22px", fontSize: "1.5rem", fontWeight: 700, textTransform: "uppercase" }}>
                    {rejected ? "Loan Request Rejected" : "Loan Request Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active + completed loans, from either side ── */}
      {!adminOverview && running.length > 0 && (
        <div>
          {blockHead("💼 ACTIVE & COMPLETED LOANS", "#00ff88", running.length)}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {running.map(loan => {
              const stats = getLoanStats(loan);
              const iAmBorrower = loan.borrowerClub === team;
              const done = loan.status === "completed";
              const accent = iAmBorrower ? "#ff6b6b" : "#00ff88";
              const progress = Math.min((stats.paid / stats.n) * 100, 100);
              return (
                <div key={loan.id} style={{ background: iAmBorrower ? "rgba(255,107,107,0.05)" : "rgba(0,255,136,0.05)", border: `1px solid ${iAmBorrower ? "rgba(255,107,107,0.25)" : "rgba(0,255,136,0.25)"}`, borderRadius: "16px", padding: "32px 38px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
                    <div>
                      <div style={{ color: accent, fontSize: "1.5rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                        {iAmBorrower ? "💸 Borrowed from" : "🏦 Lent to"}
                      </div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "2.2rem" }}>{iAmBorrower ? loan.lenderClub : loan.borrowerClub}</div>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.5rem", marginTop: "8px" }}>
                        {formatAmount(stats.amount)} {iAmBorrower ? "received" : "lent"} · {formatAmount(stats.repay)} to {iAmBorrower ? "repay" : "be repaid"} · {stats.n} × {formatAmount(stats.per)} per {loanFrequencyLabel(loan.frequency)}
                      </div>
                      {loan.acceptedAt && (
                        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.3rem", marginTop: "4px" }}>Started {formatDateOnly(loan.acceptedAt)}</div>
                      )}
                    </div>
                    <span style={{ background: done ? "rgba(0,255,136,0.15)" : `${accent}22`, color: done ? "#00ff88" : accent, border: `1px solid ${done ? "rgba(0,255,136,0.4)" : accent}`, borderRadius: "8px", padding: "8px 22px", fontSize: "1.5rem", fontWeight: 700, textTransform: "uppercase" }}>
                      {done ? "Completed" : "Active"}
                    </span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "8px", height: "16px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: done ? "#00ff88" : iAmBorrower ? "linear-gradient(to right, #ffaa44, #ff6b6b)" : "linear-gradient(to right, #00cc66, #00ff88)", borderRadius: "8px", transition: "width 0.5s" }} />
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.5rem", marginTop: "12px" }}>
                    {formatAmount(stats.repaid)} {iAmBorrower ? "repaid" : "received back"} of {formatAmount(stats.repay)} · {stats.paid}/{stats.n} installments
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Portalled to <body>: a backdrop-filter ancestor would otherwise trap the fixed overlay and clip the bottom of the popup */}
      {showRequest && createPortal(
        <Modal active={showRequest} onClose={() => setShowRequest(false)}>
          <RequestFinanceLoanModal team={team} onClose={() => setShowRequest(false)} />
        </Modal>,
        document.body
      )}
    </div>
  );
}

// ─── FINANCE TAB ──────────────────────────────────────────────────────────
function FinanceTab({ team, isAdmin }) {
  const [transactions, setTransactions] = useState([]);
  const [recurringList, setRecurringList] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFilter, setDateFilter] = useState({ days: 30, from: null, to: null });
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

  useEffect(() => {
    if (!team || !isAdmin) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/finance/recurring`), snap => {
      const data = snap.val();
      if (data) {
        setRecurringList(Object.entries(data).map(([id, r]) => ({ id, ...r })));
      } else {
        setRecurringList([]);
      }
    });
    return () => unsub();
  }, [team, isAdmin]);

  function getFilteredTxs() {
    if (dateFilter.days === null && !dateFilter.from) return transactions;
    const now = Date.now();
    return transactions.filter(tx => {
      if (!tx.createdAt) return true;
      if (dateFilter.days !== null) {
        return tx.createdAt >= now - dateFilter.days * 24 * 60 * 60 * 1000;
      }
      return tx.createdAt >= dateFilter.from.getTime() && tx.createdAt <= dateFilter.to.getTime();
    });
  }

  const filteredTxs = getFilteredTxs();

  function getFilterLabel() {
    if (dateFilter.days !== null) return `Last ${dateFilter.days} Days`;
    if (!dateFilter.from) return "All Time";
    const fmt = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `${fmt(dateFilter.from)} – ${fmt(dateFilter.to)}`;
  }

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
  INCOME_CATEGORIES.forEach(c => {
    incomeTotals[c] = filteredTxs.filter(t => t.type === "income" && t.category === c).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  });
  EXPENSE_CATEGORIES.forEach(c => {
    expenseTotals[c] = filteredTxs.filter(t => t.type === "expense" && t.category === c).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  });

  const totalIncome = filteredTxs.filter(t => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpense = filteredTxs.filter(t => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const netPL = totalIncome - totalExpense;
  const isProfit = netPL >= 0;

  async function handleDeleteRecurring(rid) {
    if (!window.confirm("Stop and delete this recurring transaction?")) return;
    try {
      await remove(ref(db, `career_team_management/${team}/finance/recurring/${rid}`));
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      {/* ── Chart ── */}
      <div style={{ ...GLASS, borderRadius: "20px", padding: "64px", marginBottom: "40px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", letterSpacing: "3px", marginBottom: "40px" }}>📈 FINANCIAL OVERVIEW</div>
        <div ref={scrollRef} style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "16px" }}>
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
                      <div style={{ flex: 1, height: `${Math.max(incH, 0)}px`, minWidth: "36px", background: isFuture ? "rgba(255,255,255,0.04)" : "linear-gradient(to top, #ff1493, #ff69b4)", borderRadius: "8px 8px 0 0", border: isFuture ? "1px dashed rgba(255,255,255,0.1)" : isActive ? "3px solid #fff" : "none", boxShadow: isActive ? "0 0 20px rgba(255,20,147,0.8)" : "none", position: "relative", transition: "height 0.5s" }}>
                        {incH > 20 && <div style={{ position: "absolute", top: "-30px", left: "50%", transform: "translateX(-50%)", color: "#ff1493", fontSize: "1.2rem", fontWeight: 700, whiteSpace: "nowrap" }}>{formatAmount(d.income)}</div>}
                      </div>
                      <div style={{ flex: 1, height: `${Math.max(expH, 0)}px`, minWidth: "36px", background: isFuture ? "rgba(255,255,255,0.04)" : "linear-gradient(to top, #000033, #001a66)", borderRadius: "8px 8px 0 0", border: isFuture ? "1px dashed rgba(255,255,255,0.1)" : isActive ? "3px solid #fff" : "1px solid rgba(0,100,255,0.4)", boxShadow: isActive ? "0 0 20px rgba(0,100,255,0.8)" : "none", position: "relative", transition: "height 0.5s" }}>
                        {expH > 20 && <div style={{ position: "absolute", top: "-30px", left: "50%", transform: "translateX(-50%)", color: "#4488ff", fontSize: "1.2rem", fontWeight: 700, whiteSpace: "nowrap" }}>{formatAmount(d.expense)}</div>}
                      </div>
                    </div>
                    <div style={{ color: isFuture ? "rgba(255,255,255,0.2)" : isActive ? "#fff" : "rgba(255,255,255,0.5)", fontSize: isActive ? "2rem" : "1.6rem", fontWeight: isActive ? 900 : 700, marginTop: "12px" }}>
                      {month}{isActive && <span style={{ fontSize: "1.2rem", marginLeft: "6px", color: "#ff1493" }}>⬅️</span>}
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
            <div style={{ width: "28px", height: "28px", background: "#ff1493", borderRadius: "6px" }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.6rem", fontWeight: 600 }}>Income</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "28px", height: "28px", background: "#000033", border: "1px solid rgba(0,100,255,0.5)", borderRadius: "6px" }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.6rem", fontWeight: 600 }}>Expenses</span>
          </div>
        </div>
      </div>

      {/* ── Net P/L ── */}
      <div style={{ ...GLASS, borderRadius: "20px", padding: "36px 48px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${isProfit ? "rgba(0,255,136,0.3)" : "rgba(255,107,107,0.3)"}`, background: isProfit ? "rgba(0,255,136,0.05)" : "rgba(255,107,107,0.05)", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, marginBottom: "6px" }}>
            Net {isProfit ? "Profit" : "Loss"} · {getFilterLabel()}
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.4rem, 6vw, 4rem)", letterSpacing: "3px", color: isProfit ? "#00ff88" : "#ff6b6b", textShadow: isProfit ? "0 0 20px rgba(0,255,136,0.4)" : "0 0 20px rgba(255,107,107,0.4)" }}>
            {isProfit ? "+" : "−"}{formatAmount(Math.abs(netPL))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Income</div>
            <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem" }}>+{formatAmount(totalIncome)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Expenses</div>
            <div style={{ color: "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem" }}>−{formatAmount(totalExpense)}</div>
          </div>
        </div>
      </div>

      {/* ── Date Filter ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
        <button onClick={() => setShowFilterModal(true)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 24px", background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "14px", color: "#ffffff", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.2)"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.1)"; }}>
          📅 {getFilterLabel()} ▾
        </button>
      </div>

      {/* ── Income & Expense blocks ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", marginBottom: "40px" }}>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "48px" }}>
          <div style={{ color: "#ff1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px", marginBottom: "28px" }}>💰 INCOME</div>
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

      {/* ── Club Loans (peer-to-peer) ── */}
      <ClubLoansSection team={team} isAdmin={isAdmin} />

      {/* ── Active Recurring Transactions (Admin) ── */}
      {isAdmin && recurringList.length > 0 && (
        <div style={{ ...GLASS, borderRadius: "20px", padding: "48px", marginBottom: "40px" }}>
          <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "3px", marginBottom: "28px" }}>🔁 RECURRING TRANSACTIONS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {recurringList.map(rec => {
              const isRecIncome = rec.type === "income";
              const accentColor = isRecIncome ? "#00ff88" : "#ffaa44";
              const accentBg = isRecIncome ? "rgba(0,255,136,0.06)" : "rgba(255,170,0,0.06)";
              const accentBorder = isRecIncome ? "rgba(0,255,136,0.2)" : "rgba(255,170,0,0.2)";
              const linkedTxs = transactions.filter(t => t.recurringId === rec.id);
              const totalDebited = linkedTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
              const progress = Math.min((totalDebited / rec.totalCap) * 100, 100);
              return (
                <div key={rec.id} style={{ background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: "16px", padding: "40px 48px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ color: accentColor, fontSize: "1.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                          {isRecIncome ? "🟢 Income" : "🔁 Expense"}
                        </span>
                      </div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "2.2rem" }}>{rec.description}</div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.7rem", marginTop: "8px" }}>
                        {isRecIncome ? "+" : "−"}{formatAmount(rec.dailyAmount)}/day · Total cap: {formatAmount(rec.totalCap)}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.6rem", marginTop: "4px" }}>
                        {rec.startDate} → {rec.endDate}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ background: rec.status === "completed" ? "rgba(0,255,136,0.15)" : `${accentColor}22`, color: rec.status === "completed" ? "#00ff88" : accentColor, border: `1px solid ${rec.status === "completed" ? "rgba(0,255,136,0.4)" : accentBorder}`, borderRadius: "8px", padding: "8px 20px", fontSize: "1.6rem", fontWeight: 700, textTransform: "uppercase" }}>
                        {rec.status}
                      </span>
                      <button onClick={() => handleDeleteRecurring(rec.id)} style={{ width: "56px", height: "56px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.4)", borderRadius: "8px", color: "#ff6b6b", cursor: "pointer", fontSize: "1.8rem" }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "8px", height: "16px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: rec.status === "completed" ? "#00ff88" : isRecIncome ? "linear-gradient(to right, #00cc66, #00ff88)" : "linear-gradient(to right, #ffaa44, #ff6b6b)", borderRadius: "8px", transition: "width 0.5s" }} />
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.6rem", marginTop: "12px" }}>
                    {formatAmount(totalDebited)} {isRecIncome ? "credited" : "debited"} of {formatAmount(rec.totalCap)} ({progress.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Transaction History ── */}
      <div style={{ ...GLASS, borderRadius: "20px", padding: "48px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "3px", marginBottom: "28px" }}>📋 TRANSACTION HISTORY</div>
        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>💳</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Transactions Yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {transactions.map(tx => {
              const isIncome = tx.type === "income";
              return (
                <div
                  key={tx.id}
                  onClick={() => isAdmin ? setSelectedTx(tx) : undefined}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "40px 48px", background: isIncome ? "rgba(0,255,136,0.05)" : "rgba(255,100,100,0.05)", border: `1px solid ${isIncome ? "rgba(0,255,136,0.15)" : "rgba(255,100,100,0.15)"}`, borderRadius: "14px", cursor: isAdmin ? "pointer" : "default", transition: "all 0.2s" }}
                  onMouseOver={e => { if (isAdmin) e.currentTarget.style.background = isIncome ? "rgba(0,255,136,0.1)" : "rgba(255,100,100,0.1)"; }}
                  onMouseOut={e => { if (isAdmin) e.currentTarget.style.background = isIncome ? "rgba(0,255,136,0.05)" : "rgba(255,100,100,0.05)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
                    <div style={{ width: "112px", height: "112px", background: isIncome ? "rgba(0,255,136,0.15)" : "rgba(255,100,100,0.15)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.6rem", flexShrink: 0 }}>
                      {tx.kitSalesId ? "👕" : tx.recurringId ? "🔁" : isIncome ? "💰" : "📤"}
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "2.2rem" }}>{tx.category}</div>
                      {tx.source && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.8rem", marginTop: "4px" }}>{tx.source}</div>}
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.7rem", marginTop: "6px" }}>
                        {tx.createdAt ? formatDateOnly(tx.createdAt) : `${tx.month} ${tx.year}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: isIncome ? "#00ff88" : "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "1px", fontWeight: 700 }}>
                    {isIncome ? "+" : "−"}{formatAmount(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Admin edit popup ── */}
      {isAdmin && selectedTx && (
        <TransactionEditPopup
          tx={selectedTx}
          team={team}
          isAdmin={isAdmin}
          onClose={() => setSelectedTx(null)}
        />
      )}

      {/* ── Date Filter Modal ── */}
      {showFilterModal && (
        <FinanceDateFilterModal
          current={dateFilter}
          onApply={filter => { setDateFilter(filter); setShowFilterModal(false); }}
          onClose={() => setShowFilterModal(false)}
        />
      )}
    </div>
  );
}

// ─── TRANSACTION EDIT/DELETE POPUP ────────────────────────────────────────
function TransactionEditPopup({ tx, team, isAdmin, onClose }) {
  const [type, setType] = useState(tx.type);
  const [category, setCategory] = useState(tx.category);
  const [source, setSource] = useState(tx.source || "");
  const [amount, setAmount] = useState(String(tx.amount));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    setSaving(true);
    setError("");
    try {
      await update(ref(db, `career_team_management/${team}/finance/transactions/${tx.id}`), {
        type, category,
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

  const inputStyle = { width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "12px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", boxSizing: "border-box" };
  const labelStyle = { color: "rgba(255,255,255,0.65)", fontSize: "0.9rem", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "540px", width: "100%", position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>

        <div style={{ color: "#ffffff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px", marginBottom: "6px" }}>
          {type === "income" ? "💰 Edit Income" : "📤 Edit Expense"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.9rem", marginBottom: "8px" }}>
          {tx.month} {tx.year} · {tx.category}
        </div>

        {/* Full date/time + sent by / received by */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {[
            ["Sent At", tx.createdAt ? formatDateTime(tx.createdAt) : "—"],
            ["Sent By", tx.sentBy || (tx.addedByAdmin ? "Admin" : tx.source || "—")],
            ["Received By", tx.receivedBy || team],
            ["Source", tx.source || "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {["income", "expense"].map(t => (
              <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "12px", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: "1rem", background: type === t ? (t === "income" ? "#00cc66" : "#ff4444") : "rgba(255,255,255,0.06)", border: `1px solid ${type === t ? (t === "income" ? "#00cc66" : "#ff4444") : "rgba(255,255,255,0.15)"}`, color: "#fff", transition: "all 0.2s", textTransform: "uppercase" }}>
                {t === "income" ? "💰 Income" : "📤 Expense"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
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
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "14px", background: "#ff1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
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

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
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
  const [allTeams, setAllTeams] = useState([]);
  const recurringProcessed = useRef(false);

  const team = manager?.team || adminTeam;

  // ── Process recurring transactions on load ──────────────────────────
  useEffect(() => {
    if (!team || recurringProcessed.current) return;
    recurringProcessed.current = true;
    processRecurringTransactions(team);
    processClubLoanInstallments(team);
  }, [team]);

  // ── Load all teams for admin dropdown ──────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const teams = [...new Set(Object.values(data).filter(a => a.team).map(a => a.team))];
      setAllTeams(teams);
    });
    return () => unsub();
  }, [isAdmin]);

  // ── Load team icons ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.teamIcons), snap => {
      if (snap.val()) setTeamIcons(snap.val());
    });
    return () => unsub();
  }, []);

  // ── Load balance ──────────────────────────────────────────────────
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

  // ── Set team icon ─────────────────────────────────────────────────
  useEffect(() => {
    if (!team) return;
    const mergedIcons = { ...teamIconsCache, ...teamIcons };
    const icon = mergedIcons?.[team];
    if (icon) setTeamIcon(icon);
  }, [team, teamIconsCache, teamIcons]);

  const mergedIcons = { ...teamIconsCache, ...teamIcons };

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
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", color: "#ffffff", margin: "0 0 10px" }}>Manager Login Required</h2>
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
      <Navbar tokyoMenuItems={adminNavbarMenu} />

      <div style={{ padding: "32px 20px 80px" }}>

        {/* ── ADMIN TOOLBAR ── */}
        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
            <button
              onClick={() => { setAdminTeam(null); setTab("stadium"); recurringProcessed.current = false; }}
              style={{ padding: "12px 22px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
            >
              ← Teams
            </button>
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <select
                value={team}
                onChange={e => { setAdminTeam(e.target.value); setTab("stadium"); recurringProcessed.current = false; }}
                style={{ width: "100%", padding: "12px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "12px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", cursor: "pointer" }}
              >
                {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAdminMenuOpen(v => !v)}
                style={{ padding: "12px 22px", background: "#ff1493", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
              >
                ➕ Manage
              </button>
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

        {/* ── TEAM HEADER ── */}
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
            {/* ── HOT PINK BALANCE ── */}
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(3rem, 8vw, 5.5rem)",
              letterSpacing: "4px",
              color: "#ff1493",
              textShadow: "0 0 30px rgba(255,20,147,0.5)",
              lineHeight: 1,
              wordBreak: "break-all",
            }}>
              {formatBalance(balance)}
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,20,147,0.4), transparent)", marginBottom: "28px" }} />

        {/* ── TABS ── */}
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
          {tab === "transfers" && <TransfersTab team={team} teamIcons={mergedIcons} isAdmin={isAdmin} />}
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
        <AdminFinanceModal onClose={() => setShowFinanceModal(false)} defaultTeam={team} />
      </Modal>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
