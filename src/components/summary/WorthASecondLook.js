"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function WorthASecondLook({ entries }) {
  const outEntries = useMemo(
    () => entries.filter((e) => e.flow === "out" && e.category !== "Self"),
    [entries],
  );

  const monthTotals = useMemo(() => {
    const map = {};
    for (const e of outEntries) {
      const key = e.date?.slice(0, 7);
      if (!key) continue;
      map[key] = (map[key] || 0) + Number(e.amount);
    }
    return Object.entries(map)
      .map(([key, total]) => {
        const [y, m] = key.split("-");
        return { key, total, label: `${MONTHS[parseInt(m, 10) - 1]} ${y}` };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [outEntries]);

  // Exclude the current, still-in-progress month — it hasn't finished
  // accumulating spend yet, so it isn't a fair "leanest/priciest" contender.
  const currentKey = new Date().toISOString().slice(0, 7);
  const completeMonths = useMemo(
    () => monthTotals.filter((m) => m.key !== currentKey),
    [monthTotals, currentKey],
  );

  const cheapest = completeMonths.length >= 2 ? [...completeMonths].sort((a, b) => a.total - b.total)[0] : null;
  const priciest = completeMonths.length >= 2 ? [...completeMonths].sort((a, b) => b.total - a.total)[0] : null;

  // Average month, drawing the same "rhythm" idea as the Year to Date card.
  const avgMonthly = useMemo(() => {
    if (completeMonths.length === 0) return null;
    return completeMonths.reduce((s, m) => s + m.total, 0) / completeMonths.length;
  }, [completeMonths]);

  const aboveAvgCount = useMemo(
    () => (avgMonthly ? completeMonths.filter((m) => m.total > avgMonthly).length : 0),
    [completeMonths, avgMonthly],
  );

  const currentMonthEntry = monthTotals.find((m) => m.key === currentKey) || null;
  const currentPace = useMemo(() => {
    if (!currentMonthEntry || !avgMonthly) return null;
    const now = new Date();
    const daysElapsed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projected = (currentMonthEntry.total / daysElapsed) * daysInMonth;
    return { projected, vsAvgPct: ((projected - avgMonthly) / avgMonthly) * 100 };
  }, [currentMonthEntry, avgMonthly]);

  // Recurring-charge creep: categories tagged Fixed/Discretionary subscription-style
  // spend that has grown for 3 consecutive months in a row.
  const creepCategory = useMemo(() => {
    if (monthTotals.length < 3) return null;
    const cats = [...new Set(outEntries.map((e) => e.category).filter(Boolean))];
    const recent3 = monthTotals.slice(-3).map((m) => m.key);
    let best = null;
    for (const cat of cats) {
      const totals = recent3.map((key) =>
        outEntries.filter((e) => e.category === cat && e.date?.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0),
      );
      if (totals[0] > 0 && totals[1] > totals[0] && totals[2] > totals[1]) {
        const growth = totals[2] - totals[0];
        if (!best || growth > best.growth) best = { cat, growth, totals };
      }
    }
    return best;
  }, [monthTotals, outEntries]);

  if (!cheapest && !priciest && !creepCategory && !avgMonthly) return null;

  return (
    <div className="grid-2">
      {(cheapest || priciest) && (
        <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            Best &amp; worst months
          </p>
          {priciest && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                Your priciest month was <strong>{priciest.label}</strong>
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                {formatNaira(priciest.total, { compact: true })}
              </span>
            </div>
          )}
          {cheapest && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                Your leanest month was <strong>{cheapest.label}</strong>
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                {formatNaira(cheapest.total, { compact: true })}
              </span>
            </div>
          )}
        </div>
      )}

      {avgMonthly && (
        <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            Your average month
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
              Across {completeMonths.length} completed month{completeMonths.length === 1 ? "" : "s"}, you spend about
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
              {formatNaira(avgMonthly, { compact: true })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
              {aboveAvgCount} of those {completeMonths.length} month{completeMonths.length === 1 ? "" : "s"} came in above that average
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
              {completeMonths.length > 0 ? `${Math.round((aboveAvgCount / completeMonths.length) * 100)}%` : "—"}
            </span>
          </div>
          {currentPace && (
            <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--rule)" }}>
              <span className="text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                This month is on pace to land
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: currentPace.vsAvgPct > 0 ? "var(--red)" : "var(--green)", fontFamily: "var(--font-mono)" }}
              >
                {currentPace.vsAvgPct > 0 ? "▲" : "▼"} {Math.abs(currentPace.vsAvgPct).toFixed(0)}% {currentPace.vsAvgPct > 0 ? "above" : "below"} average
              </span>
            </div>
          )}
        </div>
      )}

      {creepCategory && (
        <div className="rounded-xl p-5 flex flex-col gap-2" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            Quietly growing
          </p>
          <p className="text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
            <strong>{creepCategory.cat}</strong> has risen for 3 months straight, up{" "}
            <span style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {formatNaira(creepCategory.growth, { compact: true })}
            </span>{" "}
            since it started climbing. Worth a look before it becomes the new normal.
          </p>
        </div>
      )}
    </div>
  );
}
