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

  // Salary cycle — use as the "this period" baseline when payday is configured
  const cycle = useMemo(
    () => getSalaryCycle(goals.payday_day),
    [goals.payday_day],
  );
  const cycleStart = cycle?.start || `${thisMonth}-01`;

  const cycleEntries = useMemo(
    () => entries.filter((e) => e.date >= cycleStart && e.date <= today),
    [entries, cycleStart, today],
  );

  // Cash balance
  const currentBalance = useMemo(
    () => closingBalance(entries, anchor.anchor_date, anchor.anchor_amount, today),
    [entries, anchor, today],
  );

  // Liquidity
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

  // Headline: this cycle's total out + biggest category
  const monthOut   = cycleEntries.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = useMemo(() => {
    const m = {};
    cycleEntries.filter((e) => e.flow === "out" && e.category).forEach((e) => {
      m[e.category] = (m[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(m).sort(([, a], [, b]) => b - a);
  }, [cycleEntries]);
  const biggestCat = byCategory[0];

  // Prior cycle delta
  const prevOut = useMemo(() => {
    if (!cycle) {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      const pm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return entries.filter((e) => e.date?.startsWith(pm) && e.flow === "out")
                    .reduce((s, e) => s + Number(e.amount), 0);
    }
    // Previous cycle: same length, ending day before cycleStart
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
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full pb-12">
      <style>{`
        @media print {
          .app-topbar, .app-bottom-nav, [data-no-print] { display: none !important; }
          body { background: #fff !important; }
          :root { --ink-text: #000 !important; }
        }
      `}</style>

      {/* Greeting */}
      <div
        className="rounded-xl px-5 py-4"
        style={{
          background: "linear-gradient(135deg, rgba(212,160,48,0.10) 0%, rgba(155,114,214,0.08) 100%)",
          border: "1px solid rgba(212,160,48,0.18)",
        }}
      >
        <p
          className="text-lg font-semibold"
          style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
        >
          {getGreeting(name)}
        </p>
      </div>

      <AnnualWrapped
        entries={entries}
        investments={investments}
        transactions={transactions}
        currentBalance={currentBalance}
        salary={goals.salary}
      />

      {/* FX rates widget */}
      <FXWidget />

      {/* Payday widget — clicking takes you to Goals to adjust */}
      <PaydayWidget paydayDay={goals.payday_day} salary={goals.salary} href="/goals" />

      {/* End-of-cycle spend forecast */}
      <ForecastBanner
        cycleStart={cycleStart}
        cycleEnd={cycle?.end || today}
        salary={goals.salary}
        entries={entries}
        today={today}
      />

      {/* Headline panel */}
      <div
        className="rounded-lg p-5 flex flex-col gap-2"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            {periodLabel}
          </p>
          <button
            onClick={() => window.print()}
            className="text-xs px-2.5 py-1 rounded-lg"
            style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            Print / PDF
          </button>
        </div>
        <div
          className="text-4xl font-bold"
          style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
        >
          {formatNaira(monthOut)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {biggestCat && (
            <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              Biggest: <strong style={{ color: "var(--ink-text)" }}>{biggestCat[0]}</strong> ({formatNaira(biggestCat[1], { compact: true })})
            </span>
          )}
          {prevOut > 0 && (
            <span
              className="text-sm font-semibold"
              style={{ color: deltaColor, fontFamily: "var(--font-mono)" }}
            >
              {deltaDir} {formatNaira(Math.abs(delta), { compact: true })} vs last month
            </span>
          )}
        </div>
      </div>

      {/* Cash & liquidity */}
      <LiquidityPanel
        balance={currentBalance}
        avgMonthlyEssential={avgEssential}
        months={months}
        sparkRows={sparkRows}
      />

      {/* Net worth */}
      <NetWorthCard
        cashBalance={currentBalance}
        investments={investments}
        transactions={transactions}
      />

      {/* Spending anomalies */}
      <AnomalyAlerts
        entries={entries}
        cycleStart={cycleStart}
        cycle={cycle}
        today={today}
      />

      {/* Coach RBC */}
      <CoachRBCPanel
        entries={entries}
        cashBalance={currentBalance}
        salary={goals.salary}
        paydayDay={goals.payday_day}
      />

      {/* Ask about your spending */}
      <AskSpending entries={entries} />

      {/* Where it went */}
      <WhereItWent entries={cycleEntries} />

      {/* Category explorer */}
      <CategoryExplorer entries={cycleEntries} />

      {/* Analytics row */}
      <AnalyticsRow entries={entries} />

      {/* Spending trend — use salary cycle range, fall back to 30 days */}
      <SpendTrendChart entries={entries} from={cycleStart} to={today} />

      {/* Spending heatmap */}
      <SpendHeatmap entries={entries} />

      {/* Recurring committed spend */}
      <RecurringPanel entries={entries} />

    </div>
  );
}
