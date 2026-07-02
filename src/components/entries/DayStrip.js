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
            title={`${date}: ${dayOut > 0 ? formatNaira(dayOut) + " out" : "No spending"}`}
            style={{
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              gap:           2,
              flexShrink:    0,
              width:         38,
              padding:       "8px 0 6px",
              borderRadius:  10,
              border:        isSelected ? "1px solid rgba(169,133,79,0.5)" : "1px solid transparent",
              background:    isSelected ? "rgba(169,133,79,0.1)" : "transparent",
              cursor:        "pointer",
            }}
          >
            {/* Day-of-week label */}
            <span style={{
              fontSize:      8,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color:         "var(--ink-text-dim)",
              fontFamily:    "var(--font-mono)",
              lineHeight:    1,
              opacity:       0.65,
            }}>
              {DAY_LABELS[dow]}
            </span>

            {/* Day number — filled gold circle for today */}
            <div style={{
              width:          26,
              height:         26,
              borderRadius:   "50%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              background:     isToday ? "var(--gold)" : "transparent",
              marginTop:      1,
            }}>
              <span style={{
                fontSize:   12,
                fontWeight: isToday ? 700 : 500,
                color:      isToday ? "#fff" : isSelected ? "var(--gold)" : "var(--ink-text-dim)",
                fontFamily: "var(--font-mono)",
                lineHeight: 1,
              }}>
                {dayNum}
              </span>
            </div>

            {/* Spend bar */}
            <div style={{
              width:        "calc(100% - 10px)",
              height:       5,
              borderRadius: 3,
              background:   color,
              opacity:      dayOut === 0 ? 0.18 : 1,
              marginTop:    3,
            }} />
          </button>
        );
      })}
    </div>
  );
}
