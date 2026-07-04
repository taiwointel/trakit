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

  const cheapest = monthTotals.length >= 2 ? [...monthTotals].sort((a, b) => a.total - b.total)[0] : null;
  const priciest = monthTotals.length >= 2 ? [...monthTotals].sort((a, b) => b.total - a.total)[0] : null;

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

  if (!cheapest && !priciest && !creepCategory) return null;

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
