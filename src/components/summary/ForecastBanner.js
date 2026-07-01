"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

export default function ForecastBanner({ cycleStart, cycleEnd, salary, entries, today }) {
  const result = useMemo(() => {
    if (!cycleStart || !cycleEnd) return null;

    const start = new Date(cycleStart + "T00:00:00");
    const end   = new Date(cycleEnd   + "T00:00:00");
    const now   = new Date(today      + "T00:00:00");

    const cycleDays   = Math.max(1, Math.round((end   - start) / 86400000) + 1);
    const daysElapsed = Math.max(1, Math.round((now   - start) / 86400000) + 1);
    const daysLeft    = Math.max(0, cycleDays - daysElapsed);

    const totalSpent = entries
      .filter((e) => e.flow === "out" && e.date >= cycleStart && e.date <= today)
      .reduce((s, e) => s + Number(e.amount), 0);

    if (totalSpent === 0) return null;

    const dailyAvg = totalSpent / daysElapsed;
    const projected = dailyAvg * cycleDays;

    let status, color, borderColor, bgColor, message;
    if (!salary || salary <= 0) {
      status = "neutral";
      color       = "var(--ink-text-dim)";
      borderColor = "var(--ink-text-dim)";
      bgColor     = "var(--ink-2)";
      message     = `Projected spend this cycle: ${formatNaira(projected)}`;
    } else if (projected > salary) {
      status = "red";
      color       = "var(--red)";
      borderColor = "var(--red)";
      bgColor     = "var(--red-soft)";
      message     = `⚠ Projected to overspend by ${formatNaira(projected - salary)} this salary cycle`;
    } else if (projected > salary * 0.9) {
      status = "amber";
      color       = "var(--amber)";
      borderColor = "var(--amber)";
      bgColor     = "var(--amber-soft)";
      const pct = Math.round((projected / salary) * 100);
      message     = `On track to use ${pct}% of salary — tight`;
    } else {
      status = "green";
      color       = "var(--green)";
      borderColor = "var(--green)";
      bgColor     = "var(--green-soft)";
      message     = `On track — ${formatNaira(salary - projected)} projected to remain`;
    }

    const barPct = salary && salary > 0
      ? Math.min(100, (projected / salary) * 100)
      : Math.min(100, (totalSpent / (totalSpent * 1.2)) * 100);

    return { message, color, borderColor, bgColor, status, dailyAvg, daysLeft, projected, barPct, salary };
  }, [cycleStart, cycleEnd, salary, entries, today]);

  if (!result) return null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: result.bgColor,
        borderLeft: `3px solid ${result.borderColor}`,
        border: `1px solid ${result.borderColor}`,
        borderLeftWidth: "3px",
      }}
    >
      <p
        className="text-sm font-semibold"
        style={{ color: result.color, fontFamily: "var(--font-sans)" }}
      >
        {result.message}
      </p>

      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: "6px", background: "rgba(255,255,255,0.12)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${result.barPct}%`, background: result.borderColor }}
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="text-xs"
          style={{ color: result.color, fontFamily: "var(--font-mono)" }}
        >
          {formatNaira(result.dailyAvg)}/day avg
        </span>
        <span
          className="text-xs"
          style={{ color: result.color, fontFamily: "var(--font-mono)" }}
        >
          {result.daysLeft} day{result.daysLeft !== 1 ? "s" : ""} left
        </span>
        <span
          className="text-xs ml-auto"
          style={{ color: result.color, fontFamily: "var(--font-mono)" }}
        >
          {formatNaira(result.projected)} projected
        </span>
      </div>
    </div>
  );
}
