"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";

export default function YearToDatePanel({ entries }) {
  const currentYear = new Date().getFullYear();
  const [yearOffset, setYearOffset] = useState(0);
  const [showMonthly, setShowMonthly] = useState(false);
  const year = currentYear + yearOffset;

  const today   = new Date().toISOString().slice(0, 10);
  const yearEnd = year === currentYear ? today : `${year}-12-31`;

  const yearEntries = useMemo(
    () => entries.filter((e) => e.date?.startsWith(`${year}-`) && e.category !== "Self"),
    [entries, year],
  );

  const inflow  = yearEntries.filter((e) => e.flow === "in").reduce((s, e) => s + Number(e.amount), 0);
  const outflow = yearEntries.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const net     = inflow - outflow;

  const daysElapsed = useMemo(() => {
    const a = new Date(`${year}-01-01T00:00:00`);
    const b = new Date(`${yearEnd}T00:00:00`);
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [year, yearEnd]);

  const avgMonthlySpend  = outflow > 0 ? (outflow / daysElapsed) * 30.44 : 0;
  const isFullYear       = year !== currentYear;
  const daysInYear       = ((y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365)(year);
  const projectedOutflow = isFullYear ? outflow : outflow * (daysInYear / daysElapsed);

  // Same elapsed-window comparison against the prior year.
  const prevYearEntries = useMemo(
    () => entries.filter((e) => e.date?.startsWith(`${year - 1}-`) && e.category !== "Self" && e.date <= `${year - 1}-${yearEnd.slice(5)}`),
    [entries, year, yearEnd],
  );
  const prevOutflow  = prevYearEntries.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const yoyDelta      = prevOutflow > 0 ? ((outflow - prevOutflow) / prevOutflow) * 100 : null;

  const hasEarlierData = entries.some((e) => e.date && e.date < `${year}-01-01`);
  const biggestCategory = useMemo(() => {
    const map = {};
    for (const e of yearEntries) {
      if (e.flow !== "out" || !e.category) continue;
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    }
    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a);
    return sorted[0] || null;
  }, [yearEntries]);

  const monthlyBreakdown = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: `${year}-${String(i + 1).padStart(2, "0")}`,
      inflow: 0, outflow: 0,
    }));
    for (const e of yearEntries) {
      const idx = Number(e.date.slice(5, 7)) - 1;
      if (idx < 0 || idx > 11) continue;
      if (e.flow === "in") months[idx].inflow += Number(e.amount);
      else months[idx].outflow += Number(e.amount);
    }
    return months
      .filter((m) => m.inflow > 0 || m.outflow > 0)
      .map((m) => ({ ...m, net: m.inflow - m.outflow }));
  }, [yearEntries, year]);

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Year to date
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYearOffset((o) => o - 1)}
            disabled={!hasEarlierData}
            className="text-xs px-2 py-1 rounded-md"
            style={{
              background: "var(--ink-3)", border: "1px solid var(--rule)",
              color: "var(--ink-text-dim)",
              opacity: hasEarlierData ? 1 : 0.35,
              cursor: hasEarlierData ? "pointer" : "default",
            }}
          >
            ‹
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
            {year}
          </span>
          <button
            onClick={() => setYearOffset((o) => Math.min(0, o + 1))}
            disabled={yearOffset === 0}
            className="text-xs px-2 py-1 rounded-md"
            style={{
              background: "var(--ink-3)", border: "1px solid var(--rule)",
              color: "var(--ink-text-dim)",
              opacity: yearOffset === 0 ? 0.35 : 1,
              cursor: yearOffset === 0 ? "default" : "pointer",
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", borderRadius: 10, padding: "10px 12px" }}>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", marginBottom: 4 }}>Inflow ({year})</p>
          <p className="text-sm font-bold" style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>{formatNaira(inflow, { compact: true })}</p>
        </div>
        <div style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", borderRadius: 10, padding: "10px 12px" }}>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", marginBottom: 4 }}>Outflow ({year})</p>
          <p className="text-sm font-bold" style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>{formatNaira(outflow, { compact: true })}</p>
        </div>
        <div style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", borderRadius: 10, padding: "10px 12px" }}>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", marginBottom: 4 }}>Net</p>
          <p className="text-sm font-bold" style={{ color: net >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}>
            {net >= 0 ? "+" : ""}{formatNaira(net, { compact: true })}
          </p>
        </div>
      </div>

      {yearEntries.length > 0 && (
        <div className="flex flex-col gap-2 pt-1" style={{ borderTop: "1px solid var(--rule)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              Avg monthly spend
            </span>
            <span className="text-xs font-semibold" style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>
              {formatNaira(avgMonthlySpend, { compact: true })}
            </span>
          </div>

          {!isFullYear && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                On pace for
              </span>
              <span className="text-xs font-semibold" style={{ color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                ≈{formatNaira(projectedOutflow, { compact: true })} by Dec 31
              </span>
            </div>
          )}

          {yoyDelta !== null && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Vs same period last year
              </span>
              <span className="text-xs font-semibold" style={{ color: yoyDelta > 0 ? "var(--red)" : "var(--green)", fontFamily: "var(--font-mono)" }}>
                {yoyDelta > 0 ? "▲" : "▼"} {Math.abs(yoyDelta).toFixed(0)}%
              </span>
            </div>
          )}

          {biggestCategory && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Biggest category
              </span>
              <span className="text-xs font-semibold" style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>
                {biggestCategory[0]} · {formatNaira(biggestCategory[1], { compact: true })}
              </span>
            </div>
          )}

          <button
            onClick={() => setShowMonthly((v) => !v)}
            className="text-xs font-medium text-left pt-1"
            style={{ background: "none", border: "none", color: "var(--gold)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
          >
            {showMonthly ? "Hide monthly breakdown ▲" : "Show monthly breakdown ▼"}
          </button>

          {showMonthly && (
            <div className="flex flex-col gap-1 pt-1">
              <div className="grid grid-cols-4 gap-2 pb-1" style={{ borderBottom: "1px solid var(--rule)" }}>
                <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Month</span>
                <span className="text-[10px] uppercase tracking-wide text-right" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>In</span>
                <span className="text-[10px] uppercase tracking-wide text-right" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Out</span>
                <span className="text-[10px] uppercase tracking-wide text-right" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Net</span>
              </div>
              {monthlyBreakdown.map((m) => (
                <div key={m.month} className="grid grid-cols-4 gap-2 py-0.5">
                  <span className="text-xs" style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>
                    {new Date(`${m.month}-01T00:00:00`).toLocaleString("en-US", { month: "short" })}
                  </span>
                  <span className="text-xs text-right" style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                    {formatNaira(m.inflow, { compact: true })}
                  </span>
                  <span className="text-xs text-right" style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                    {formatNaira(m.outflow, { compact: true })}
                  </span>
                  <span className="text-xs text-right font-semibold" style={{ color: m.net >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}>
                    {m.net >= 0 ? "+" : ""}{formatNaira(m.net, { compact: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {yearEntries.length === 0 && (
        <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          No entries logged for {year} yet.
        </p>
      )}
    </div>
  );
}
