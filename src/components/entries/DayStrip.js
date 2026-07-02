"use client";

import { datesInMonth, formatNaira } from "@/lib/format";
import { useRef, useEffect } from "react";

const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function dayColor(outflow, allowance, hasBudget) {
  if (outflow === 0) return "var(--rule)";
  if (!hasBudget) return "var(--amber)";
  const pct = outflow / allowance;
  if (pct <= 0.5) return "var(--green)";
  if (pct <= 1.0) return "var(--amber)";
  return "var(--red)";
}

export default function DayStrip({ entries, budgets, year, month, selectedDay, onSelectDay }) {
  const dates          = datesInMonth(year, month);
  const today          = new Date().toISOString().slice(0, 10);
  const hasBudget      = !!(budgets?.overall);
  const dailyAllowance = hasBudget ? (budgets.overall / dates.length) : 0;
  const stripRef       = useRef(null);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const todayBtn = el.querySelector("[data-today]");
    if (todayBtn) todayBtn.scrollIntoView({ inline: "center", block: "nearest" });
  }, [year, month]);

  return (
    <div
      ref={stripRef}
      style={{
        display:          "flex",
        flexDirection:    "row",
        gap:              4,
        overflowX:        "auto",
        padding:          "10px 24px",
        scrollbarWidth:   "none",
        msOverflowStyle:  "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {dates.map((date) => {
        const dayNum     = parseInt(date.slice(8), 10);
        const dow        = new Date(date + "T00:00:00").getDay();
        const dayOut     = entries
          .filter((e) => e.date === date && e.flow === "out")
          .reduce((s, e) => s + Number(e.amount), 0);
        const isToday    = date === today;
        const isSelected = selectedDay === dayNum;
        const color      = dayColor(dayOut, dailyAllowance, hasBudget);

        return (
          <button
            key={date}
            data-today={isToday || undefined}
            onClick={() => onSelectDay(isSelected ? null : dayNum)}
            title={`${date}: ${formatNaira(dayOut)} out`}
            style={{
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              gap:           3,
              flexShrink:    0,
              minWidth:      30,
              padding:       "5px 4px",
              borderRadius:  4,
              border:        "none",
              background:    isSelected ? "var(--ink-3)" : "transparent",
              outline:       isToday ? "1px solid var(--gold)" : "none",
              cursor:        "pointer",
            }}
          >
            <span style={{
              display:       "block",
              fontSize:      9,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color:         "var(--ink-text-dim)",
              fontFamily:    "var(--font-mono)",
              lineHeight:    1,
            }}>
              {DAY_LABELS[dow]}
            </span>
            <span style={{
              display:    "block",
              fontSize:   12,
              fontWeight: 600,
              color:      isToday ? "var(--gold)" : "var(--ink-text-dim)",
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
            }}>
              {dayNum}
            </span>
            <div style={{
              width:       18,
              height:      4,
              borderRadius: 2,
              background:  color,
              opacity:     dayOut === 0 ? 0.25 : 1,
            }} />
          </button>
        );
      })}
    </div>
  );
}
