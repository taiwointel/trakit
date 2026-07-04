"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

function Card({ title, accent, icon, children }) {
  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderTop: `3px solid ${accent}` }}
    >
      <div className="px-4 py-3 border-b shrink-0 flex items-center gap-2" style={{ borderColor: "var(--rule)" }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent, fontFamily: "var(--font-sans)" }}>
          {title}
        </p>
      </div>
      <div className="overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ maxHeight: 240 }}>
        {children}
      </div>
    </div>
  );
}

export default function AnalyticsRow({ entries, from, to }) {
  const outEntries = entries.filter((e) => e.flow === "out" && e.category !== "Self");

  // ── Biggest Movers (this month vs prev month) ──────────────
  const movers = useMemo(() => {
    const now    = new Date();
    const thisMo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMo = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

    const cats = [...new Set(outEntries.map((e) => e.category).filter(Boolean))];
    return cats.map((cat) => {
      const curr = outEntries.filter((e) => e.category === cat && e.date?.startsWith(thisMo)).reduce((s, e) => s + Number(e.amount), 0);
      const prv  = outEntries.filter((e) => e.category === cat && e.date?.startsWith(prevMo)).reduce((s, e) => s + Number(e.amount), 0);
      return { cat, curr, prv, delta: curr - prv };
    }).filter((m) => m.curr > 0 || m.prv > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 8);
  }, [outEntries]);

  // ── Big-Ticket Items ───────────────────────────────────────
  const bigTickets = useMemo(() =>
    [...outEntries].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 8),
    [outEntries],
  );

  // ── Where to Cut (top discretionary) ──────────────────────
  const cutList = useMemo(() => {
    const disc = outEntries.filter((e) => e.essentiality === "Discretionary" && e.category);
    const map  = {};
    for (const e of disc) map[e.category] = (map[e.category] || 0) + Number(e.amount);
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, total]) => ({ cat, total, saving: Math.round(total * 0.2) }));
  }, [outEntries]);

  return (
    <div className="analytics-row">
      {/* Biggest Movers */}
      <Card title="Biggest Movers" accent="var(--violet)" icon="📊">
        {movers.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--ink-text-dim)" }}>Need 2 months of data.</p>
        ) : movers.map((m) => (
          <div key={m.cat} className="flex items-center gap-2">
            <span className="flex-1 text-xs truncate" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
              {m.cat}
            </span>
            <span
              className="text-xs font-semibold"
              style={{
                color:      m.delta > 0 ? "var(--red)" : "var(--green)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {m.delta > 0 ? "▲" : "▼"} {formatNaira(Math.abs(m.delta), { compact: true })}
            </span>
          </div>
        ))}
      </Card>

      {/* Big-Ticket Items */}
      <Card title="Big-Ticket Items" accent="var(--sky)" icon="💳">
        {bigTickets.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--ink-text-dim)" }}>No expenses yet.</p>
        ) : bigTickets.map((e) => (
          <div key={e.id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                {e.desc}
              </div>
              <div className="text-[10px]" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                {e.date}{e.beneficiary ? ` · ${e.beneficiary}` : ""}
              </div>
            </div>
            <span className="text-xs font-semibold shrink-0" style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
              {formatNaira(e.amount, { compact: true })}
            </span>
          </div>
        ))}
      </Card>

      {/* Where to Cut */}
      <Card title="Where to Cut" accent="var(--rose)" icon="✂️">
        {cutList.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--ink-text-dim)" }}>No discretionary spend found.</p>
        ) : cutList.map((c) => (
          <div key={c.cat} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs truncate" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                {c.cat}
              </span>
              <span className="text-xs" style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                {formatNaira(c.total, { compact: true })}
              </span>
            </div>
            <p className="text-[10px]" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              Cut 20% → save ≈{formatNaira(c.saving, { compact: true })}/mo
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}
