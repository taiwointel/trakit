"use client";

import { useMemo, useState, useRef } from "react";

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function SpendHeatmap({ entries }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  const year = new Date().getFullYear();

  const { yearGrid, p25, p75, monthLabels } = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const startDow = jan1.getDay();
    const offsetToMon = (startDow === 0 ? 6 : startDow - 1);

    const totalDays = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;

    const dailyOut = {};
    entries.forEach((e) => {
      if (e.flow === "out" && e.date && e.date.startsWith(String(year))) {
        dailyOut[e.date] = (dailyOut[e.date] || 0) + Number(e.amount);
      }
    });

    const grid = [];
    for (let d = 0; d < totalDays; d++) {
      const date = new Date(year, 0, 1 + d);
      const dateStr = date.toISOString().slice(0, 10);
      const dow = date.getDay();
      const dayOfWeekMon = dow === 0 ? 6 : dow - 1;
      const slot = d + offsetToMon;
      const week = Math.floor(slot / 7);
      grid.push({ dateStr, week, dow: dayOfWeekMon, amount: dailyOut[dateStr] || 0 });
    }

    const nonZero = grid.filter((c) => c.amount > 0).map((c) => c.amount).sort((a, b) => a - b);
    let p25v = 0, p75v = 0;
    if (nonZero.length > 0) {
      p25v = nonZero[Math.floor(nonZero.length * 0.25)];
      p75v = nonZero[Math.floor(nonZero.length * 0.75)];
    }

    const months = [];
    let lastMonth = -1;
    grid.forEach((cell) => {
      const m = new Date(cell.dateStr + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        months.push({ week: cell.week, month: m });
      }
    });

    return { yearGrid: grid, p25: p25v, p75: p75v, monthLabels: months };
  }, [entries, year]);

  const CELL = 11;
  const GAP = 2;
  const STEP = CELL + GAP;
  const LEFT_OFFSET = 20;
  const TOP_OFFSET = 20;
  const numWeeks = yearGrid.length > 0 ? yearGrid[yearGrid.length - 1].week + 1 : 53;
  const svgWidth = LEFT_OFFSET + numWeeks * STEP;
  const svgHeight = TOP_OFFSET + 7 * STEP;

  const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW_LABELS = [{ i: 0, label: "M" }, { i: 2, label: "W" }, { i: 4, label: "F" }];

  function cellColor(amount) {
    if (amount === 0) return "var(--ink-3)";
    if (amount <= p25) return "rgba(169,133,79,0.3)";
    if (amount <= p75) return "rgba(169,133,79,0.65)";
    return "var(--gold)";
  }

  function handleMouseMove(e, cell) {
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      dateStr: cell.dateStr,
      amount: cell.amount,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
      >
        Spending heatmap · {year}
      </p>

      <div className="overflow-x-auto" ref={containerRef}>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: "block" }}
        >
          {DOW_LABELS.map(({ i, label }) => (
            <text
              key={label}
              x={LEFT_OFFSET - 4}
              y={TOP_OFFSET + i * STEP + CELL - 1}
              textAnchor="end"
              fontSize={10}
              fill="var(--ink-text-dim)"
              fontFamily="var(--font-sans)"
            >
              {label}
            </text>
          ))}

          {monthLabels.map(({ week, month }) => (
            <text
              key={month}
              x={LEFT_OFFSET + week * STEP}
              y={TOP_OFFSET - 6}
              fontSize={10}
              fill="var(--ink-text-dim)"
              fontFamily="var(--font-sans)"
            >
              {MONTH_ABBR[month]}
            </text>
          ))}

          {yearGrid.map((cell) => (
            <rect
              key={cell.dateStr}
              x={LEFT_OFFSET + cell.week * STEP}
              y={TOP_OFFSET + cell.dow * STEP}
              width={CELL}
              height={CELL}
              rx={2}
              fill={cellColor(cell.amount)}
              style={{ cursor: "pointer" }}
              onMouseMove={(e) => handleMouseMove(e, cell)}
              onMouseLeave={handleMouseLeave}
            />
          ))}
        </svg>
      </div>

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 36,
            zIndex: 60,
            background: "var(--ink-3)",
            border: "1px solid var(--rule)",
            borderRadius: 8,
            padding: "6px 10px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-text)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          {formatDate(tooltip.dateStr)} · {tooltip.amount > 0 ? `₦${Number(tooltip.amount).toLocaleString("en-NG")}` : "No spend"}
        </div>
      )}
    </div>
  );
}
