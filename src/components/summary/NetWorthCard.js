"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

function computePortfolioTotal(investments, transactions) {
  let total = 0;
  for (const inv of investments) {
    const txns = transactions.filter((t) => t.investment_id === inv.id);
    if (inv.group === "maturity") {
      const principal = Number(inv.principal || 0);
      const rate      = Number(inv.rate || 0);
      const tenor     = Number(inv.tenor_days || 0);
      if (inv.type === "Fixed Term Notes") {
        total += principal;
      } else {
        const price = principal * (1 - (rate / 100) * (tenor / 365));
        total += price;
      }
    } else if (inv.group === "balance") {
      if (inv.mark_value != null && Number(inv.mark_value) > 0) {
        total += Number(inv.mark_value);
      } else {
        const net = txns.reduce((s, t) => {
          if (t.type === "deposit")    return s + Number(t.amount);
          if (t.type === "withdrawal") return s - Number(t.amount);
          return s;
        }, 0);
        total += net;
      }
    } else if (inv.group === "life") {
      const paid = txns
        .filter((t) => t.type === "paid")
        .reduce((s, t) => s + Number(t.amount), 0);
      total += paid;
    } else if (inv.group === "pension") {
      total += Number(inv.balance || 0);
    }
  }
  return total;
}

export default function NetWorthCard({ cashBalance, investments, transactions }) {
  const portfolioTotal = useMemo(
    () => computePortfolioTotal(investments || [], transactions || []),
    [investments, transactions],
  );

  const netWorth = (cashBalance || 0) + portfolioTotal;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--ink-2)",
        borderTop: "3px solid var(--blue-accent)",
        border: "1px solid var(--rule)",
        borderTopWidth: "3px",
        borderTopColor: "var(--blue-accent)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}
      >
        Net Worth
      </p>

      <div
        className="text-3xl font-bold"
        style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
      >
        {formatNaira(netWorth)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-lg p-3 flex flex-col gap-1"
          style={{ background: "var(--ink-3)" }}
        >
          <span
            className="text-xs"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            Cash
          </span>
          <span
            className="text-base font-semibold"
            style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
          >
            {formatNaira(cashBalance || 0)}
          </span>
        </div>
        <div
          className="rounded-lg p-3 flex flex-col gap-1"
          style={{ background: "var(--ink-3)" }}
        >
          <span
            className="text-xs"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            Investments
          </span>
          <span
            className="text-base font-semibold"
            style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
          >
            {formatNaira(portfolioTotal)}
          </span>
        </div>
      </div>

      <p
        className="text-xs"
        style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
      >
        Cash + investments. Liabilities not tracked.
      </p>
    </div>
  );
}
