"use client";

import { useState, useMemo } from "react";
import { formatNaira, getSalaryCycle } from "@/lib/format";

const BASE_PRESETS = [
  { label: "Today",         days: 0   },
  { label: "Last 7 days",   days: 7   },
  { label: "This cycle",    days: -4  }, // salary cycle — shown only if paydayDay set
  { label: "This month",    days: -1  },
  { label: "Last month",    days: -3  },
  { label: "Last 3 months", days: 90  },
  { label: "Last 6 months", days: 180 },
  { label: "This year",     days: -2  },
];

function getDateRange(preset, customFrom, customTo, paydayDay) {
  const today = new Date().toISOString().slice(0, 10);
  if (preset === "custom") return { from: customFrom, to: customTo || today };
  const p = BASE_PRESETS.find((p) => p.label === preset);
  if (!p) return { from: today, to: today };
  if (p.days === 0) return { from: today, to: today };
  if (p.days === -1) { // This month
    const d = new Date(); const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0");
    return { from: `${y}-${m}-01`, to: today };
  }
  if (p.days === -2) { // This year
    return { from: `${new Date().getFullYear()}-01-01`, to: today };
  }
  if (p.days === -3) { // Last month
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(lastDay).padStart(2, "0")}` };
  }
  if (p.days === -4) { // This cycle
    const cycle = getSalaryCycle(paydayDay);
    if (!cycle) { // fall back to this month
      const d = new Date(); const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0");
      return { from: `${y}-${m}-01`, to: today };
    }
    return { from: cycle.start, to: today };
  }
  const from = new Date(); from.setDate(from.getDate() - p.days + 1);
  return { from: from.toISOString().slice(0, 10), to: today };
}

function buildContext(entries, from, to, cashBalance, salary) {
  const inRange = entries.filter((e) => e.date >= from && e.date <= to);
  const outRange = inRange.filter((e) => e.flow === "out");
  const inIncome = inRange.filter((e) => e.flow === "in");

  const totalOut      = outRange.reduce((s, e) => s + Number(e.amount), 0);
  const totalIn       = inIncome.reduce((s, e) => s + Number(e.amount), 0);
  const essential     = outRange.filter((e) => e.essentiality === "Essential").reduce((s, e) => s + Number(e.amount), 0);
  const discretionary = outRange.filter((e) => e.essentiality === "Discretionary").reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = {};
  for (const e of outRange) byCategory[e.category || "Uncategorized"] = (byCategory[e.category || "Uncategorized"] || 0) + Number(e.amount);
  const topCategories = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 5);

  // Trend: split range at midpoint
  const fromD = new Date(from + "T00:00:00"), toD = new Date(to + "T00:00:00");
  const midMs  = (fromD.getTime() + toD.getTime()) / 2;
  const midISO = new Date(midMs).toISOString().slice(0, 10);
  const earlyOut = outRange.filter((e) => e.date <= midISO).reduce((s, e) => s + Number(e.amount), 0);
  const lateOut  = outRange.filter((e) => e.date >  midISO).reduce((s, e) => s + Number(e.amount), 0);
  const trendDir = earlyOut === 0 ? "flat"
    : (lateOut - earlyOut) / earlyOut > 0.05  ? "declining"
    : (earlyOut - lateOut) / earlyOut > 0.05  ? "improving"
    : "flat";

  const biggest = [...outRange].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5)
    .map((e) => ({ desc: e.desc, amount: Number(e.amount), date: e.date }));

  const cutCandidates = outRange.filter((e) => e.essentiality === "Discretionary")
    .reduce((m, e) => { m[e.category] = (m[e.category] || 0) + Number(e.amount); return m; }, {});

  return {
    period: { from, to },
    totalOut, totalIn,
    essential, discretionary,
    topCategories,
    trend: { earlyHalf: earlyOut, lateHalf: lateOut, direction: trendDir },
    biggestTransactions: biggest,
    discretionaryCutCandidates: Object.entries(cutCandidates).sort(([, a], [, b]) => b - a).slice(0, 5),
    currentCashBalance: cashBalance,
    salary: salary || null,
  };
}

export default function CoachRBCPanel({ entries, cashBalance, salary, paydayDay }) {
  const defaultPreset = paydayDay ? "This cycle" : "This month";
  const [preset,     setPreset]     = useState(defaultPreset);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const visiblePresets = BASE_PRESETS.filter((p) => p.days !== -4 || paydayDay);
  const { from, to } = getDateRange(preset, customFrom, customTo, paydayDay);

  async function getCoached() {
    setLoading(true); setError(""); setSession(null);
    const context = buildContext(entries, from, to, cashBalance, salary);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coach unavailable.");
      setSession(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div
      className="rounded-lg flex flex-col gap-4 p-4"
      style={{ border: "1px solid var(--gold)", background: "var(--ink-2)" }}
    >
      {/* Title */}
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
      >
        Coach RBC
      </p>

      {/* Date range presets */}
      <div className="flex flex-wrap gap-1.5">
        {visiblePresets.map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p.label)}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              background: preset === p.label ? "var(--gold)" : "var(--ink-3)",
              color:      preset === p.label ? "#fff" : "var(--ink-text-dim)",
              border:     "1px solid var(--rule)",
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setPreset("custom")}
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={{
            background: preset === "custom" ? "var(--gold)" : "var(--ink-3)",
            color:      preset === "custom" ? "#fff" : "var(--ink-text-dim)",
            border:     "1px solid var(--rule)",
          }}
        >
          Custom
        </button>
      </div>

      {/* Custom date inputs */}
      {preset === "custom" && (
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
          />
          <span className="text-xs self-center" style={{ color: "var(--ink-text-dim)" }}>to</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
          />
        </div>
      )}

      {/* Period display + CTA */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
          {from} → {to}
        </span>
        <button
          onClick={getCoached}
          disabled={loading}
          className="px-4 py-2 rounded text-sm font-semibold transition-opacity"
          style={{ background: "var(--gold)", color: "#fff", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Coaching…" : "Get coached for this period"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: "var(--red)", fontFamily: "var(--font-sans)" }}>{error}</p>
      )}

      {/* Session render */}
      {session && <CoachSession session={session} />}
    </div>
  );
}

function CoachSession({ session }) {
  return (
    <div className="flex flex-col gap-5 mt-2">
      {/* Opener */}
      {session.opener && (
        <p className="text-base italic leading-relaxed" style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}>
          "{session.opener}"
        </p>
      )}

      {/* Headlines */}
      {session.headlines?.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)" }}>The Headlines</p>
          {session.headlines.map((h, i) => (
            <div key={i} className="rounded p-3" style={{ background: "var(--ink-3)", border: "1px solid var(--rule)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>{h.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>{h.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Red Flags */}
      {session.redFlags?.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--red)" }}>Red Flags</p>
          {session.redFlags.map((f, i) => (
            <div key={i} className="rounded p-3" style={{ background: "var(--red-soft)", borderLeft: "3px solid var(--red)" }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>{f.title}</p>
                {f.amount > 0 && (
                  <span className="text-sm font-bold shrink-0" style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                    {formatNaira(f.amount, { compact: true })}
                  </span>
                )}
              </div>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>{f.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cut List */}
      {session.cutList?.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--green)" }}>The Cut List</p>
          {session.cutList.map((c, i) => (
            <div key={i} className="rounded p-3" style={{ background: "var(--green-soft)", borderLeft: "3px solid var(--green)" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                  <span className="font-semibold">{i + 1}. {c.category}:</span> {c.action}
                </p>
                {c.targetSaving > 0 && (
                  <span className="text-sm font-semibold shrink-0" style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                    save ≈{formatNaira(c.targetSaving, { compact: true })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Closer */}
      {session.closer && (
        <p className="text-base italic leading-relaxed" style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}>
          "{session.closer}"
        </p>
      )}
    </div>
  );
}
