"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";
import { portfolioTotal } from "@/lib/investments";

export default function PortfolioSummary({ investments, transactions }) {
  const total = useMemo(
    () => portfolioTotal(investments, transactions),
    [investments, transactions],
  );

  return (
    <div
      className="rounded-lg p-4 flex items-center justify-between gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--gold)" }}
    >
      <div className="flex flex-col gap-0.5">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
        >
          Portfolio total
        </p>
        <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          {investments.length} investment{investments.length !== 1 ? "s" : ""} · price paid / current value / paid balance
        </p>
      </div>
      <span
        className="text-3xl font-bold"
        style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
      >
        {formatNaira(total)}
      </span>
    </div>
  );
}
