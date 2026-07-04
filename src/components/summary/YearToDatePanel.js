"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";

export default function YearToDatePanel({ entries }) {
  const currentYear = new Date().getFullYear();
  const [yearOffset, setYearOffset] = useState(0);
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

  const hasEarlierData = entries.some((e) => e.date && e.date < `${year}-01-01`);

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
              color: hasEarlierData ? "var(--ink-text-dim)" : "var(--ink-text-dim)",
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

      {yearEntries.length === 0 && (
        <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          No entries logged for {year} yet.
        </p>
      )}
    </div>
  );
}
