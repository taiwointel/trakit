"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

export default function AnomalyAlerts({ entries, cycleStart, cycle, today }) {
  const anomalies = useMemo(() => {
    if (!cycleStart || !cycle) return [];

    const cycleLen = cycle.end && cycle.start
      ? Math.max(1, Math.round((new Date(cycle.end + "T00:00:00") - new Date(cycle.start + "T00:00:00")) / 86400000) + 1)
      : 30;

    const currentSpend = {};
    for (const e of entries) {
      if (e.flow !== "out" || !e.category || e.category === "Self") continue;
      if (e.date < cycleStart || e.date > today) continue;
      currentSpend[e.category] = (currentSpend[e.category] || 0) + Number(e.amount);
    }

    const historicalByCategory = {};
    const cs = new Date(cycleStart + "T00:00:00");
    for (let i = 1; i <= 3; i++) {
      const prevEnd   = new Date(cs); prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - cycleLen + 1);
      const prevStartStr = prevStart.toISOString().slice(0, 10);
      const prevEndStr   = prevEnd.toISOString().slice(0, 10);
      for (const e of entries) {
        if (e.flow !== "out" || !e.category || e.category === "Self") continue;
        if (e.date < prevStartStr || e.date > prevEndStr) continue;
        if (!historicalByCategory[e.category]) historicalByCategory[e.category] = [];
        historicalByCategory[e.category].push(Number(e.amount));
      }
      cs.setDate(cs.getDate() - cycleLen);
    }

    const histAvg = {};
    for (const [cat, amounts] of Object.entries(historicalByCategory)) {
      histAvg[cat] = amounts.reduce((s, v) => s + v, 0) / 3;
    }

    const flags = [];
    for (const [cat, current] of Object.entries(currentSpend)) {
      const avg = histAvg[cat];
      if (!avg || avg <= 0) continue;
      const ratio = current / avg;
      if (ratio >= 1.8) {
        flags.push({ category: cat, ratio, current, avg });
      }
    }

    return flags.sort((a, b) => b.ratio - a.ratio).slice(0, 4);
  }, [entries, cycleStart, cycle, today]);

  if (anomalies.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--ink-2)",
        border: "1px solid var(--rule)",
        borderLeft: "3px solid var(--red)",
        borderLeftWidth: "3px",
        borderLeftColor: "var(--red)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--red)", fontFamily: "var(--font-sans)" }}
      >
        Spending anomalies this cycle
      </p>

      <div className="flex flex-col gap-2">
        {anomalies.map(({ category, ratio, current, avg }) => (
          <div key={category} className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="text-sm font-medium truncate"
                style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
              >
                {category}
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}
              >
                {ratio.toFixed(1)}× usual
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
              >
                {formatNaira(current)}
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
              >
                avg {formatNaira(avg)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
