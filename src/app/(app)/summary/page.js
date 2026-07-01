"use client";

import { useMemo } from "react";
import { useEntries }       from "@/hooks/useEntries";
import { useGoals }         from "@/hooks/useGoals";
import { useCashBalance }   from "@/hooks/useCashBalance";
import { closingBalance, liquidityCoverage, last14Days } from "@/lib/cashBalance";
import { formatNaira, getSalaryCycle } from "@/lib/format";

import PaydayWidget      from "@/components/summary/PaydayWidget";
import LiquidityPanel    from "@/components/summary/LiquidityPanel";
import { useUser }       from "@/hooks/useUser";
import CoachRBCPanel     from "@/components/summary/CoachRBCPanel";
import AskSpending       from "@/components/summary/AskSpending";
import WhereItWent       from "@/components/summary/WhereItWent";
import CategoryExplorer  from "@/components/summary/CategoryExplorer";
import AnalyticsRow      from "@/components/summary/AnalyticsRow";
import SpendTrendChart   from "@/components/summary/SpendTrendChart";
import { useInvestments } from "@/hooks/useInvestments";
import ForecastBanner    from "@/components/summary/ForecastBanner";
import NetWorthCard      from "@/components/summary/NetWorthCard";
import AnomalyAlerts     from "@/components/summary/AnomalyAlerts";
import RecurringPanel    from "@/components/summary/RecurringPanel";
import FXWidget          from "@/components/summary/FXWidget";
import SpendHeatmap      from "@/components/summary/SpendHeatmap";
import AnnualWrapped     from "@/components/summary/AnnualWrapped";

const GREETINGS = {
  latenight: (n) => [
    `It's late, ${n}. Logging expenses before bed? Respect.`,
    `Still up, ${n}? Your budget never sleeps either.`,
    `Late night check-in, ${n}. The kobo don't care what time it is.`,
  ],
  morning: (n) => [
    `Good morning, ${n}! The day is young and so is your spending budget.`,
    `Rise and shine, ${n}! Log today's expenses before they log themselves.`,
    `Morning, ${n}! The only thing that should rise faster than you is your savings.`,
    `Good morning, ${n}! Hope yesterday's receipts are still fresh in your memory.`,
    `Morning, ${n}! Let's make sure the budget woke up before the spending did.`,
  ],
  afternoon: (n) => [
    `Good afternoon, ${n}! How are we getting our urgent 2k today?`,
    `Afternoon, ${n}! It's not too late to pretend the morning's expenses didn't happen. Log them anyway.`,
    `Hey ${n}, good afternoon! The suya was 100% worth it. Now let's log it.`,
    `Good afternoon, ${n}! The numbers don't lie, but they do need to be recorded first.`,
    `Afternoon, ${n}! Your future self is watching. Make them proud.`,
  ],
  evening: (n) => [
    `Good evening, ${n}! Time to review today's financial adventures.`,
    `Evening, ${n}! The market is closed. Your spending tab, however, is still open.`,
    `Good evening, ${n}! Payday is coming. We just need to make sure there's still room for it.`,
    `Evening, ${n}! How are we getting our urgent 2k? Let's find out together.`,
    `Hey ${n}, good evening! Let's debrief before the day escapes your wallet entirely.`,
  ],
  night: (n) => [
    `Good night, ${n}! One last expense check before the dream of financial freedom.`,
    `Night owl energy, ${n}! Your savings rate won't track itself.`,
    `Still at it, ${n}? Log the damage and get some rest.`,
    `Night shift vibes, ${n}. The budget is always clocking in.`,
  ],
};

function getGreeting(name) {
  const firstName = (name || "").split(" ")[0] || "Taiwo";
  const h = new Date().getHours();
  const key = h < 5 ? "latenight" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  const arr = GREETINGS[key](firstName);
  return arr[new Date().getDate() % arr.length];
}

export default function SummaryPage() {
  const { entries, loading: entriesLoading } = useEntries();
  const { goals,   loading: goalsLoading   } = useGoals();
  const { anchor,  loading: cashLoading    } = useCashBalance();
  const { name }                             = useUser();
  const { investments, transactions }        = useInvestments();

  const today     = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const cycle = useMemo(
    () => getSalaryCycle(goals.payday_day),
    [goals.payday_day],
  );
  const cycleStart = cycle?.start || `${thisMonth}-01`;

  const cycleEntries = useMemo(
    () => entries.filter((e) => e.date >= cycleStart && e.date <= today),
    [entries, cycleStart, today],
  );

  const currentBalance = useMemo(
    () => closingBalance(entries, anchor.anchor_date, anchor.anchor_amount, today),
    [entries, anchor, today],
  );

  const avgEssential = useMemo(() => {
    const now = new Date();
    const samples = [];
    for (let i = 1; i <= 3; i++) {
      const m    = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      const total = entries
        .filter((e) => e.date?.startsWith(mStr) && e.flow === "out" && e.essentiality === "Essential")
        .reduce((s, e) => s + Number(e.amount), 0);
      if (total > 0) samples.push(total);
    }
    return samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
  }, [entries]);

  const months     = useMemo(() => liquidityCoverage(entries, currentBalance), [entries, currentBalance]);
  const sparkRows  = useMemo(() => last14Days(entries, anchor.anchor_date, anchor.anchor_amount), [entries, anchor]);

  const monthOut   = cycleEntries.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = useMemo(() => {
    const m = {};
    cycleEntries.filter((e) => e.flow === "out" && e.category).forEach((e) => {
      m[e.category] = (m[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(m).sort(([, a], [, b]) => b - a);
  }, [cycleEntries]);
  const biggestCat = byCategory[0];

  const prevOut = useMemo(() => {
    if (!cycle) {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      const pm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return entries.filter((e) => e.date?.startsWith(pm) && e.flow === "out")
                    .reduce((s, e) => s + Number(e.amount), 0);
    }
    const cs = new Date(cycle.start + "T00:00:00");
    const ce = new Date(cs); ce.setDate(ce.getDate() - 1);
    const ps = new Date(cs); ps.setDate(ps.getDate() - (new Date(cycle.end + "T00:00:00") - cs) / 86400000 - 1);
    const prevStart = ps.toISOString().slice(0, 10);
    const prevEnd   = ce.toISOString().slice(0, 10);
    return entries.filter((e) => e.flow === "out" && e.date >= prevStart && e.date <= prevEnd)
                  .reduce((s, e) => s + Number(e.amount), 0);
  }, [entries, cycle]);

  const delta      = monthOut - prevOut;
  const deltaDir   = delta > 0 ? "▲" : delta < 0 ? "▼" : "";
  const deltaColor = delta > 0 ? "var(--red)" : "var(--green)";
  const periodLabel = cycle ? `Salary cycle: ${cycle.label}` : "This month";

  if (entriesLoading || goalsLoading || cashLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="page-root">
      <style>{`
        @media print {
          .app-topbar, .app-bottom-nav, [data-no-print] { display: none !important; }
          body { background: #fff !important; }
          :root { --ink-text: #000 !important; }
        }
      `}</style>

      {/* ── HERO: greeting + payday ──────────────────────────────────────
          Two things only. Greeting sets the emotional tone; payday is the
          most time-sensitive number the user cares about on first load.
      ── */}
      <div style={{ padding: "24px 24px 4px" }} className="sm:p-8 sm:pb-1">
        <div className="grid-hero">
          {/* Left: greeting */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(212,160,48,0.10) 0%, rgba(155,114,214,0.08) 100%)",
              border: "1px solid rgba(212,160,48,0.18)",
              borderRadius: 16,
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 600, lineHeight: 1.5 }}>
              {getGreeting(name)}
            </p>
          </div>

          {/* Right: payday widget */}
          <PaydayWidget paydayDay={goals.payday_day} salary={goals.salary} href="/goals" />
        </div>
      </div>

      {/* Anomaly alerts sit right below the hero — urgent items need
          to be the first thing the eye catches after orientation. */}
      <div style={{ padding: "12px 24px 0" }} className="sm:px-8">
        <AnomalyAlerts
          entries={entries}
          cycleStart={cycleStart}
          cycle={cycle}
          today={today}
        />
      </div>

      {/* ── YOUR NUMBERS ──────────────────────────────────────────────────
          Status first: what is my current financial position?
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Your Numbers</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Your real-time financial position for this salary cycle: total spend, cash balance, liquidity coverage, and net worth. Every entry you add updates these figures instantly so you always know exactly where you stand.
      </p>

      <div className="section-body">
        <div className="grid-2">
          {/* Headline spend */}
          <div
            style={{
              background: "var(--ink-2)",
              border: "1px solid var(--rule)",
              borderRadius: 16,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {periodLabel}
              </p>
              <button
                onClick={() => window.print()}
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, padding: "4px 10px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Print / PDF
              </button>
            </div>
            <div style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, lineHeight: 1 }}>
              {formatNaira(monthOut)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {biggestCat && (
                <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 13 }}>
                  Biggest: <strong style={{ color: "var(--ink-text)" }}>{biggestCat[0]}</strong>{" "}
                  ({formatNaira(biggestCat[1], { compact: true })})
                </span>
              )}
              {prevOut > 0 && (
                <span style={{ color: deltaColor, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>
                  {deltaDir} {formatNaira(Math.abs(delta), { compact: true })} vs prior period
                </span>
              )}
            </div>
          </div>

          <LiquidityPanel
            balance={currentBalance}
            avgMonthlyEssential={avgEssential}
            months={months}
            sparkRows={sparkRows}
          />
        </div>

        <NetWorthCard
          cashBalance={currentBalance}
          investments={investments}
          transactions={transactions}
        />
      </div>

      {/* ── SPEND BREAKDOWN ───────────────────────────────────────────────
          Charts come before the coach analysis — visuals give instant
          gratification with no click/wait. Users see where money went,
          then naturally want the coach's take on it.
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--teal)" }} />
        <span className="section-divider-label" style={{ color: "var(--teal)" }}>Spend Breakdown</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        A full picture of where your money went this cycle. Charts surface patterns that raw transaction lists hide. Click any category in the explorer below the charts to drill into the individual transactions that made up the total.
      </p>

      <div className="section-body">
        <div className="grid-2">
          <WhereItWent entries={cycleEntries} />
          <SpendTrendChart entries={entries} from={cycleStart} to={today} />
        </div>
        <CategoryExplorer entries={cycleEntries} />
        <AnalyticsRow entries={entries} />
      </div>

      {/* ── COACH RBC ─────────────────────────────────────────────────────
          Advice follows the visual breakdown — users have already seen
          where money went, so they're primed to hear what to do about it.
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Coach RBC</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Coach RBC analyses your actual spending data for any date range you choose and gives you specific, personalised guidance based on what the numbers say. Select a period and get a structured briefing, or ask her anything about your finances directly in the Chat tab.
      </p>

      <div className="section-body">
        <CoachRBCPanel
          entries={entries}
          cashBalance={currentBalance}
          salary={goals.salary}
          paydayDay={goals.payday_day}
        />
        <AskSpending entries={entries} />
      </div>

      {/* ── OUTLOOK ───────────────────────────────────────────────────────
          Forward-looking tools: cycle forecast, FX rates, annual review.
          Below the coach because they require deliberate engagement
          (clicking "Generate forecast", checking FX rates manually).
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--violet)" }} />
        <span className="section-divider-label" style={{ color: "var(--violet)" }}>Outlook</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Forward-looking projections and market data. The cycle forecast tells you whether your current spending pace will take you past salary before payday. The FX widget surfaces live Naira exchange rates for dollar-linked decisions. Your annual financial review is generated on demand.
      </p>

      <div className="section-body">
        <ForecastBanner
          cycleStart={cycleStart}
          cycleEnd={cycle?.end || today}
          salary={goals.salary}
          entries={entries}
          today={today}
        />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <FXWidget />
          <AnnualWrapped
            entries={entries}
            investments={investments}
            transactions={transactions}
            currentBalance={currentBalance}
            salary={goals.salary}
          />
        </div>
      </div>

      {/* ── HISTORY & PATTERNS ────────────────────────────────────────────
          Long-run patterns for users who want to go deeper.
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--amber)" }} />
        <span className="section-divider-label" style={{ color: "var(--amber)" }}>History &amp; Patterns</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Patterns that are invisible in a single transaction become obvious when you see weeks of data at once. Recurring charges and subscriptions surface automatically. The spending heatmap shows which days and weeks you consistently spend the most, so you can anticipate and plan around them.
      </p>

      <div className="section-body">
        <RecurringPanel entries={entries} />
        <SpendHeatmap entries={entries} />
      </div>
    </div>
  );
}
