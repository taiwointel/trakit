"use client";

import { useMemo } from "react";
import { useEntries }       from "@/hooks/useEntries";
import { useGoals }         from "@/hooks/useGoals";
import { useCashBalance }   from "@/hooks/useCashBalance";
import { closingBalance, liquidityCoverage, last14Days } from "@/lib/cashBalance";
import { formatNaira }      from "@/lib/format";

import PaydayWidget      from "@/components/summary/PaydayWidget";
import LiquidityPanel    from "@/components/summary/LiquidityPanel";
import CoachRBCPanel     from "@/components/summary/CoachRBCPanel";
import AskSpending       from "@/components/summary/AskSpending";
import WhereItWent       from "@/components/summary/WhereItWent";
import CategoryExplorer  from "@/components/summary/CategoryExplorer";
import AnalyticsRow      from "@/components/summary/AnalyticsRow";
import SpendTrendChart   from "@/components/summary/SpendTrendChart";

export default function SummaryPage() {
  const { entries, loading: entriesLoading } = useEntries();
  const { goals,   loading: goalsLoading   } = useGoals();
  const { anchor,  loading: cashLoading    } = useCashBalance();

  const today   = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date?.startsWith(thisMonth)),
    [entries, thisMonth],
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

  // Headline: this month's total out + biggest category
  const monthOut   = monthEntries.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = useMemo(() => {
    const m = {};
    monthEntries.filter((e) => e.flow === "out" && e.category).forEach((e) => {
      m[e.category] = (m[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(m).sort(([, a], [, b]) => b - a);
  }, [monthEntries]);
  const biggestCat = byCategory[0];

  // Prior month for delta
  const prevMonth = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const prevOut = entries
    .filter((e) => e.date?.startsWith(prevMonth) && e.flow === "out")
    .reduce((s, e) => s + Number(e.amount), 0);
  const delta    = monthOut - prevOut;
  const deltaDir = delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
  const deltaColor = delta > 0 ? "var(--red)" : "var(--green)";

  // 30-day date range for trend chart
  const thirtyDaysAgo = (() => {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  })();

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

      {/* Payday widget */}
      <PaydayWidget paydayDay={goals.payday_day} />

      {/* Headline panel */}
      <div
        className="rounded-lg p-5 flex flex-col gap-2"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          This month's spending
        </p>
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

      {/* Coach RBC */}
      <CoachRBCPanel
        entries={entries}
        cashBalance={currentBalance}
        salary={goals.salary}
      />

      {/* Ask about your spending */}
      <AskSpending entries={entries} />

      {/* Where it went */}
      <WhereItWent entries={monthEntries} />

      {/* Category explorer */}
      <CategoryExplorer entries={monthEntries} />

      {/* Analytics row */}
      <AnalyticsRow entries={entries} />

      {/* Spending trend */}
      <SpendTrendChart entries={entries} from={thirtyDaysAgo} to={today} />

    </div>
  );
}
