"use client";

import { useState, useMemo } from "react";
import { formatNaira } from "@/lib/format";

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({ label, value, sub, verdict, verdictColor }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "var(--ink-2)" }}
    >
      <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
        {label}
      </span>
      <span
        className="text-2xl font-bold"
        style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          {sub}
        </span>
      )}
      {verdict && (
        <span
          className="text-xs font-semibold mt-1"
          style={{ color: verdictColor, fontFamily: "var(--font-sans)" }}
        >
          {verdict}
        </span>
      )}
    </div>
  );
}

export default function AnnualWrapped({ entries, investments, transactions, currentBalance, salary }) {
  const [open, setOpen] = useState(false);
  const year = new Date().getFullYear();
  const yearStr = String(year);

  const stats = useMemo(() => {
    const yearEntries = (entries || []).filter((e) => e.date && e.date.startsWith(yearStr));
    const outEntries = yearEntries.filter((e) => e.flow === "out");
    const inEntries = yearEntries.filter((e) => e.flow === "in");

    const totalOut = outEntries.reduce((s, e) => s + Number(e.amount), 0);
    const totalIn = inEntries.reduce((s, e) => s + Number(e.amount), 0);
    const outCount = outEntries.length;

    const monthlyOut = {};
    outEntries.forEach((e) => {
      const m = e.date.slice(0, 7);
      monthlyOut[m] = (monthlyOut[m] || 0) + Number(e.amount);
    });

    let bestMonth = null, bestAmt = Infinity;
    let busiestMonth = null, busiestAmt = 0;
    Object.entries(monthlyOut).forEach(([m, amt]) => {
      if (amt < bestAmt) { bestAmt = amt; bestMonth = m; }
      if (amt > busiestAmt) { busiestAmt = amt; busiestMonth = m; }
    });

    function fmtMonth(m) {
      if (!m) return "—";
      const d = new Date(m + "-01T00:00:00");
      return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    }

    const catTotals = {};
    outEntries.forEach((e) => {
      if (e.category) catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
    });
    const top3 = Object.entries(catTotals).sort(([, a], [, b]) => b - a).slice(0, 3);

    const beneficiaryCounts = {};
    outEntries.forEach((e) => {
      if (e.beneficiary) beneficiaryCounts[e.beneficiary] = (beneficiaryCounts[e.beneficiary] || 0) + 1;
    });
    const topPayee = Object.entries(beneficiaryCounts).sort(([, a], [, b]) => b - a)[0];

    let bigTx = null;
    outEntries.forEach((e) => {
      if (!bigTx || Number(e.amount) > Number(bigTx.amount)) bigTx = e;
    });

    const daysWithSpend = new Set(outEntries.map((e) => e.date)).size;
    const avgDaily = daysWithSpend > 0 ? totalOut / daysWithSpend : 0;

    let savingsRate = null, savingsVerdict = null, savingsColor = null;
    if (salary) {
      const monthsInYear = Object.keys(monthlyOut).length || 1;
      const avgMonthlyOut = totalOut / Math.max(monthsInYear, 1);
      const estMonthlySavings = salary - avgMonthlyOut;
      const rate = (estMonthlySavings / salary) * 100;
      savingsRate = rate;
      if (rate < 10) { savingsVerdict = "Needs work"; savingsColor = "var(--red)"; }
      else if (rate < 20) { savingsVerdict = "Getting there"; savingsColor = "var(--amber)"; }
      else { savingsVerdict = "On track"; savingsColor = "var(--green)"; }
    }

    return {
      totalOut, totalIn, outCount,
      bestMonth: bestMonth ? fmtMonth(bestMonth) : null, bestAmt: bestMonth ? bestAmt : 0,
      busiestMonth: busiestMonth ? fmtMonth(busiestMonth) : null, busiestAmt,
      top3, totalOutForPct: totalOut,
      topPayee, bigTx, avgDaily, daysWithSpend,
      savingsRate, savingsVerdict, savingsColor,
    };
  }, [entries, yearStr, salary]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold self-start"
        style={{
          background: "var(--ink-3)",
          border: "1px solid var(--rule)",
          color: "var(--ink-text-dim)",
          fontFamily: "var(--font-sans)",
        }}
      >
        🎁 Year in review
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold self-start"
        style={{
          background: "var(--ink-3)",
          border: "1px solid var(--rule)",
          color: "var(--ink-text-dim)",
          fontFamily: "var(--font-sans)",
        }}
      >
        🎁 Year in review
      </button>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "rgba(0,0,0,0.93)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "24px 16px 48px",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            className="rounded-xl p-5 flex items-start justify-between"
            style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
          >
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}>
                Annual summary
              </p>
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
              >
                Your {yearStr} in numbers
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "var(--ink-3)",
                border: "1px solid var(--rule)",
                color: "var(--ink-text-dim)",
                borderRadius: 8,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          <StatCard
            label="Total outflow"
            value={formatNaira(stats.totalOut)}
            sub={`${stats.outCount} transactions`}
          />

          <StatCard
            label="Total income recorded"
            value={formatNaira(stats.totalIn)}
          />

          {stats.bestMonth && (
            <StatCard
              label="Best month (lowest spend)"
              value={stats.bestMonth}
              sub={formatNaira(stats.bestAmt)}
            />
          )}

          {stats.busiestMonth && (
            <StatCard
              label="Busiest month (highest spend)"
              value={stats.busiestMonth}
              sub={formatNaira(stats.busiestAmt)}
            />
          )}

          {stats.top3.length > 0 && (
            <div
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: "var(--ink-2)" }}
            >
              <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Top 3 categories
              </span>
              {stats.top3.map(([cat, amt]) => {
                const pct = stats.totalOutForPct > 0 ? ((amt / stats.totalOutForPct) * 100).toFixed(1) : "0.0";
                return (
                  <div key={cat} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                      {cat}
                    </span>
                    <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                      {formatNaira(amt)} · {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {stats.topPayee && (
            <StatCard
              label="Most paid payee"
              value={stats.topPayee[0]}
              sub={`${stats.topPayee[1]} transaction${stats.topPayee[1] !== 1 ? "s" : ""}`}
            />
          )}

          {stats.bigTx && (
            <StatCard
              label="Biggest single transaction"
              value={formatNaira(Number(stats.bigTx.amount))}
              sub={`${stats.bigTx.desc || stats.bigTx.description || "—"} · ${fmtDate(stats.bigTx.date)}`}
            />
          )}

          <StatCard
            label="Average daily spend"
            value={formatNaira(stats.avgDaily)}
            sub={`across ${stats.daysWithSpend} days with spend`}
          />

          {stats.savingsRate !== null && (
            <StatCard
              label="Estimated savings rate"
              value={`${stats.savingsRate.toFixed(1)}%`}
              sub="avg monthly savings vs salary"
              verdict={stats.savingsVerdict}
              verdictColor={stats.savingsColor}
            />
          )}

          <button
            onClick={() => setOpen(false)}
            className="rounded-xl py-3 text-sm font-semibold mt-2"
            style={{
              background: "var(--ink-2)",
              border: "1px solid var(--rule)",
              color: "var(--ink-text)",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
