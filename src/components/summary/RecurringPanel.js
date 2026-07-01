"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

export default function RecurringPanel({ entries }) {
  const { recurring, cycleTotal } = useMemo(() => {
    const groups = {};
    for (const e of entries) {
      if (e.flow !== "out") continue;
      const key = (e.desc || e.description || "").toLowerCase().trim();
      if (!key) continue;
      if (!groups[key]) groups[key] = { desc: e.desc || e.description || key, category: e.category || "", months: new Set(), total: 0, count: 0 };
      const month = (e.date || "").slice(0, 7);
      if (month) groups[key].months.add(month);
      groups[key].total += Number(e.amount);
      groups[key].count += 1;
    }

    const recurring = [];
    for (const g of Object.values(groups)) {
      if (g.months.size < 2) continue;
      const avgAmount = g.total / g.count;
      recurring.push({ desc: g.desc, category: g.category, monthCount: g.months.size, avgAmount, total: g.total });
    }

    recurring.sort((a, b) => b.avgAmount - a.avgAmount);
    const top = recurring.slice(0, 8);
    const cycleTotal = top.reduce((s, r) => s + r.avgAmount, 0);
    return { recurring: top, cycleTotal };
  }, [entries]);

  if (recurring.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--ink-2)",
        border: "1px solid var(--rule)",
        borderTop: "3px solid var(--amber)",
        borderTopWidth: "3px",
        borderTopColor: "var(--amber)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--amber)", fontFamily: "var(--font-sans)" }}
        >
          Recurring / committed spend
        </p>
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--amber)", fontFamily: "var(--font-mono)" }}
        >
          ≈{formatNaira(cycleTotal)}/cycle total
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {recurring.map(({ desc, category, monthCount, avgAmount }) => (
          <div key={desc} className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="text-sm font-medium truncate capitalize"
                style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
              >
                {desc}
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                {category && <>{category} · </>}seen {monthCount} months
              </span>
            </div>
            <span
              className="text-sm font-semibold shrink-0"
              style={{ color: "var(--amber)", fontFamily: "var(--font-mono)" }}
            >
              {formatNaira(avgAmount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
