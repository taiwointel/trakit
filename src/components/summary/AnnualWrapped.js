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
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 10 }}>
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
          className="text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded-md"
          style={{ color: verdictColor, fontFamily: "var(--font-sans)", background: `${verdictColor}22` }}
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
    const inEntries  = yearEntries.filter((e) => e.flow === "in");

    const totalOut = outEntries.reduce((s, e) => s + Number(e.amount), 0);
    const totalIn  = inEntries.reduce((s, e) => s + Number(e.amount), 0);
    const outCount = outEntries.length;

    const monthlyOut = {};
    outEntries.forEach((e) => {
      const m = e.date.slice(0, 7);
      monthlyOut[m] = (monthlyOut[m] || 0) + Number(e.amount);
    });

    let bestMonth = null, bestAmt = Infinity;
    let busiestMonth = null, busiestAmt = 0;
    Object.entries(monthlyOut).forEach(([m, amt]) => {
      if (amt < bestAmt)   { bestAmt = amt;    bestMonth = m; }
      if (amt > busiestAmt){ busiestAmt = amt; busiestMonth = m; }
    });

    function fmtMonth(m) {
      if (!m) return "—";
      return new Date(m + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
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
      const monthsInYear  = Object.keys(monthlyOut).length || 1;
      const avgMonthlyOut = totalOut / Math.max(monthsInYear, 1);
      const rate          = ((salary - avgMonthlyOut) / salary) * 100;
      savingsRate = rate;
      if (rate < 10)  { savingsVerdict = "Needs work";    savingsColor = "var(--red)"; }
      else if (rate < 20){ savingsVerdict = "Getting there"; savingsColor = "var(--amber)"; }
      else             { savingsVerdict = "On track";     savingsColor = "var(--green)"; }
    }

    return {
      totalOut, totalIn, outCount,
      bestMonth:    bestMonth    ? fmtMonth(bestMonth)    : null, bestAmt: bestMonth ? bestAmt : 0,
      busiestMonth: busiestMonth ? fmtMonth(busiestMonth) : null, busiestAmt,
      top3, totalOutForPct: totalOut,
      topPayee, bigTx, avgDaily, daysWithSpend,
      savingsRate, savingsVerdict, savingsColor,
    };
  }, [entries, yearStr, salary]);

  /* ── Closed: dramatic entry card ── */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ width: "100%", border: "none", cursor: "pointer", background: "none", padding: 0, display: "block", textAlign: "left" }}
      >
        <div
          style={{
            borderRadius: 20,
            padding: "28px 32px 26px",
            background: "linear-gradient(145deg, #0F1620 0%, #1C0C04 40%, #180B1C 70%, #091522 100%)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(169,133,79,0.22), 0 20px 60px rgba(0,0,0,0.65), 0 0 80px rgba(169,133,79,0.07)",
          }}
        >
          {/* Prismatic top stripe */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #C8862E 0%, #A9854F 18%, #7C8C5B 36%, #5BA88A 54%, #8C4F5B 72%, #5B8FA8 88%, #8A6FA8 100%)" }} />

          {/* Watermark year */}
          <div
            style={{
              position: "absolute", right: -6, bottom: -14,
              fontSize: 140, fontFamily: "var(--font-serif)", fontWeight: 900,
              color: "transparent",
              WebkitTextStroke: "1px rgba(169,133,79,0.12)",
              lineHeight: 1, letterSpacing: "-0.06em",
              pointerEvents: "none", userSelect: "none",
            }}
          >
            {yearStr}
          </div>

          {/* Geometric rings */}
          <div style={{ position: "absolute", top: 22, right: 28, width: 68, height: 68, borderRadius: "50%", border: "1px solid rgba(169,133,79,0.18)" }} />
          <div style={{ position: "absolute", top: 36, right: 14, width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(91,143,168,0.16)" }} />
          <div style={{ position: "absolute", bottom: 18, left: 48, width: 22, height: 22, borderRadius: "50%", background: "rgba(200,134,46,0.13)" }} />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>🎁</span>
              <span style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Trakit7 · Annual Wrapped
              </span>
            </div>

            <div
              style={{
                color: "var(--ink-text)", fontFamily: "var(--font-serif)",
                fontSize: "clamp(1.5rem, 6vw, 2.1rem)", fontWeight: 700,
                lineHeight: 1.05, marginBottom: 12,
              }}
            >
              Your {yearStr}<br />in Review
            </div>

            <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.55, marginBottom: 24, maxWidth: 310 }}>
              Spending totals · Best month · Savings rate · Top categories · Biggest transactions
            </p>

            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "linear-gradient(135deg, var(--gold-deep), var(--gold))",
                color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700,
                borderRadius: 10, padding: "10px 22px",
                boxShadow: "0 4px 20px rgba(200,134,46,0.45)",
                letterSpacing: "0.01em",
              }}
            >
              <span>Open your year</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  /* ── Open: full-screen modal ── */
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.95)",
        overflowY: "auto",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "24px 16px 48px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Header */}
        <div
          style={{
            borderRadius: 20, padding: "24px 24px",
            background: "linear-gradient(145deg, #0F1620 0%, #1C0C04 40%, #180B1C 70%, #091522 100%)",
            border: "1px solid rgba(169,133,79,0.22)",
            position: "relative", overflow: "hidden",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #C8862E, #A9854F, #7C8C5B, #8C4F5B, #5B8FA8, #8A6FA8)" }} />
          <div
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 80, fontFamily: "var(--font-serif)", fontWeight: 900,
              color: "transparent", WebkitTextStroke: "1px rgba(169,133,79,0.11)",
              pointerEvents: "none", userSelect: "none", lineHeight: 1, letterSpacing: "-0.04em",
            }}
          >
            {yearStr}
          </div>
          <div style={{ position: "relative" }}>
            <p style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>
              🎁 Annual summary
            </p>
            <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700 }}>
              Your {yearStr} in numbers
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)",
              borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 16, cursor: "pointer", flexShrink: 0, position: "relative",
              fontFamily: "var(--font-sans)",
            }}
          >
            ✕
          </button>
        </div>

        <StatCard label="Total outflow"          value={formatNaira(stats.totalOut)}  sub={`${stats.outCount} transactions`} />
        <StatCard label="Total income recorded"  value={formatNaira(stats.totalIn)} />

        {stats.bestMonth    && <StatCard label="Best month (lowest spend)"    value={stats.bestMonth}    sub={formatNaira(stats.bestAmt)} />}
        {stats.busiestMonth && <StatCard label="Busiest month (highest spend)" value={stats.busiestMonth} sub={formatNaira(stats.busiestAmt)} />}

        {stats.top3.length > 0 && (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
            <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 10 }}>
              Top 3 categories
            </span>
            {stats.top3.map(([cat, amt], idx) => {
              const pct = stats.totalOutForPct > 0 ? ((amt / stats.totalOutForPct) * 100).toFixed(1) : "0.0";
              const colors = ["var(--gold)", "var(--blue-accent)", "var(--green)"];
              return (
                <div key={cat} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[idx], flexShrink: 0 }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>{cat}</span>
                  </div>
                  <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                    {formatNaira(amt)} · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {stats.topPayee && (
          <StatCard label="Most paid payee" value={stats.topPayee[0]} sub={`${stats.topPayee[1]} transaction${stats.topPayee[1] !== 1 ? "s" : ""}`} />
        )}
        {stats.bigTx && (
          <StatCard
            label="Biggest single transaction"
            value={formatNaira(Number(stats.bigTx.amount))}
            sub={`${stats.bigTx.desc || stats.bigTx.description || "—"} · ${fmtDate(stats.bigTx.date)}`}
          />
        )}

        <StatCard label="Average daily spend" value={formatNaira(stats.avgDaily)} sub={`across ${stats.daysWithSpend} days with spend`} />

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
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
