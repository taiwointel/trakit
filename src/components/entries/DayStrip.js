"use client";

import { datesInMonth, formatNaira } from "@/lib/format";
import { useRef, useEffect } from "react";

const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function dayColor(outflow, allowance, hasBudget) {
  if (outflow === 0) return "var(--rule)";
  if (!hasBudget) {
    // Relative heatmap: use amber for any spend
    return "var(--amber)";
  }
  const pct = outflow / allowance;
  if (pct <= 0.5)  return "var(--green)";
  if (pct <= 1.0)  return "var(--amber)";
  return "var(--red)";
}

export default function DayStrip({ entries, budgets, year, month, selectedDay, onSelectDay }) {
  const dates       = datesInMonth(year, month);
  const today       = new Date().toISOString().slice(0, 10);
  const hasBudget   = !!budgets.overall;
  const dailyAllowance = hasBudget ? budgets.overall / dates.length : 0;
  const stripRef    = useRef(null);

  // Auto-scroll to today on first render
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const todayBtn = el.querySelector("[data-today]");
    if (todayBtn) todayBtn.scrollIntoView({ inline: "center", block: "nearest" });
  }, [year, month]);

  return (
    <div
      ref={stripRef}
      className="flex gap-1 overflow-x-auto py-2 px-6"
      style={{ scrollbarWidth: "none" }}
    >
      {dates.map((date) => {
        const dayNum  = parseInt(date.slice(8), 10);
        const dow     = new Date(date + "T00:00:00").getDay();
        const dayOut  = entries.filter((e) => e.date === date && e.flow === "out")
                               .reduce((s, e) => s + Number(e.amount), 0);
        const isToday    = date === today;
        const isSelected = selectedDay === dayNum;
        const color      = dayColor(dayOut, dailyAllowance, hasBudget);

        return (
          <button
            key={date}
            data-today={isToday || undefined}
            onClick={() => onSelectDay(isSelected ? null : dayNum)}
            className="flex flex-col items-center gap-0.5 shrink-0 rounded px-1 py-1 transition-colors"
            style={{
              minWidth: 28,
              background:  isSelected ? "var(--ink-3)" : "transparent",
              outline:     isToday ? `1px solid var(--gold)` : "none",
              borderRadius: 4,
            }}
            title={`${date}: ${formatNaira(dayOut, { compact: true })} out`}
          >
            <span
              className="text-[9px] uppercase"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
            >
              {DAY_LABELS[dow]}
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: isToday ? "var(--gold)" : "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
            >
              {dayNum}
            </span>
            {/* Color bar */}
            <div
              style={{
                width: 16,
                height: 4,
                borderRadius: 2,
                background: color,
                opacity: dayOut === 0 ? 0.25 : 1,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
