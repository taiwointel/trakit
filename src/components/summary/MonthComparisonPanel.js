"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function MonthComparisonPanel({ entries }) {
  const [windowOffset, setWindowOffset] = useState(0); // 0 = most recent 6 months; -1 = one month further back, etc.

  const monthly = useMemo(() => {
    const now = new Date();
    const rows = [];
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i + windowOffset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const total = entries
        .filter((e) => e.date?.startsWith(key) && e.flow === "out" && e.category !== "Self")
        .reduce((s, e) => s + Number(e.amount), 0);
      rows.push({ key, label: `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`, total });
    }
    return rows;
  }, [entries, windowOffset]);

  const rangeLabel = `${monthly[0]?.label} – ${monthly[monthly.length - 1]?.label}`;
  const isCurrentWindow = windowOffset === 0;

  const withData = monthly.filter((m) => m.total > 0);
  if (withData.length < 2 && isCurrentWindow) return null;

  const thisMonth = monthly[monthly.length - 1];
  const lastMonth = monthly[monthly.length - 2];
  const momDelta  = thisMonth.total - lastMonth.total;
  const momPct    = lastMonth.total > 0 ? Math.round((momDelta / lastMonth.total) * 100) : 0;

  // Earlier half vs later half of the available months, for a trend verdict.
  const mid         = Math.floor(withData.length / 2);
  const earlierAvg  = withData.slice(0, mid).reduce((s, m) => s + m.total, 0) / Math.max(1, mid);
  const laterAvg    = withData.slice(mid).reduce((s, m) => s + m.total, 0) / Math.max(1, withData.length - mid);
  const trendPct    = earlierAvg > 0 ? ((laterAvg - earlierAvg) / earlierAvg) * 100 : 0;
  const direction    = trendPct > 5 ? "declining" : trendPct < -5 ? "improving" : "flat";
  const verdictText = {
    improving: "Your spending has been trending down — recent months are lighter than earlier ones.",
    declining: "Your spending has been trending up — recent months are heavier than earlier ones.",
    flat:      "Your spending has stayed roughly steady over these months.",
  }[direction];
  const verdictColor = { improving: "var(--green)", declining: "var(--red)", flat: "var(--ink-text-dim)" }[direction];

  const maxTotal = Math.max(...monthly.map((m) => m.total), 1);

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          {isCurrentWindow ? "This month vs last month" : `${thisMonth?.label} vs ${lastMonth?.label}`}
        </p>
        {lastMonth?.total > 0 && (
          <span
            className="text-sm font-semibold"
            style={{ color: momDelta > 0 ? "var(--red)" : "var(--green)", fontFamily: "var(--font-mono)" }}
          >
            {momDelta > 0 ? "▲" : momDelta < 0 ? "▼" : "—"} {formatNaira(Math.abs(momDelta), { compact: true })}
            {` (${momPct > 0 ? "+" : ""}${momPct}%)`}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setWindowOffset((o) => o - 1)}
          className="text-xs px-2 py-1 rounded-md"
          style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", cursor: "pointer" }}
        >
          ‹ Older
        </button>
        <span className="text-[11px]" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
          {rangeLabel}
        </span>
        <button
          onClick={() => setWindowOffset((o) => Math.min(0, o + 1))}
          disabled={isCurrentWindow}
          className="text-xs px-2 py-1 rounded-md"
          style={{
            background: "var(--ink-3)", border: "1px solid var(--rule)",
            color: isCurrentWindow ? "var(--ink-text-dim)" : "var(--ink-text)",
            opacity: isCurrentWindow ? 0.4 : 1,
            cursor: isCurrentWindow ? "default" : "pointer",
          }}
        >
          Newer ›
        </button>
      </div>

      {/* 6-month bar strip */}
      <div className="flex items-end gap-3" style={{ height: 90 }}>
        {monthly.map((m) => {
          const h = m.total > 0 ? Math.max(4, (m.total / maxTotal) * 70) : 2;
          const isThis = m === thisMonth;
          return (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
              <span className="text-[9px]" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                {m.total > 0 ? formatNaira(m.total, { compact: true, decimals: 0 }) : ""}
              </span>
              <div
                style={{
                  width: "100%",
                  height: h,
                  borderRadius: 4,
                  background: isThis ? "var(--gold)" : "var(--ink-3)",
                  border: isThis ? "none" : "1px solid var(--rule)",
                }}
              />
              <span className="text-[10px]" style={{ color: isThis ? "var(--gold)" : "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontWeight: isThis ? 700 : 400 }}>
                {m.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs" style={{ color: verdictColor, fontFamily: "var(--font-sans)" }}>
        {verdictText}
      </p>
    </div>
  );
}
