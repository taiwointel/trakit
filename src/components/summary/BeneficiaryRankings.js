"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";

// Same self-transfer exclusion as every other summary panel — money moving
// between the user's own accounts isn't a real beneficiary relationship.
function relevant(entries, flow) {
  return entries.filter((e) => e.flow === flow && e.category !== "Self" && e.beneficiary);
}

function rankBeneficiaries(entries) {
  const map = {};
  for (const e of entries) {
    const key = e.beneficiary.trim();
    if (!key) continue;
    if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
    map[key].total += Number(e.amount);
    map[key].count += 1;
  }
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
}

function RankTable({ title, accent, icon, rows, emptyMsg }) {
  const max = rows.length ? rows[0].total : 0;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderTop: `3px solid ${accent}` }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--rule)" }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent, fontFamily: "var(--font-sans)" }}>
          {title}
        </p>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2.5" style={{ maxHeight: 340, overflowY: "auto" }}>
        {rows.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>{emptyMsg}</p>
        ) : rows.map((r, i) => (
          <div key={r.name} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] shrink-0" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", width: 16 }}>
                {i + 1}
              </span>
              <span className="flex-1 text-xs truncate" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }} title={r.name}>
                {r.name}
              </span>
              <span className="text-xs font-semibold shrink-0" style={{ color: accent, fontFamily: "var(--font-mono)" }}>
                {formatNaira(r.total, { compact: true })}
              </span>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--rule)", overflow: "hidden" }}>
                <div style={{ width: `${max > 0 ? (r.total / max) * 100 : 0}%`, height: "100%", background: accent, borderRadius: 2 }} />
              </div>
              <span className="text-[10px] shrink-0" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                {r.count} txn{r.count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BeneficiaryRankings({ entries }) {
  const [scope, setScope] = useState("month"); // "month" | "ytd"
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset,  setYearOffset]  = useState(0);

  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthStr  = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const year = today.getFullYear() + yearOffset;

  const scopedEntries = useMemo(() => {
    if (scope === "month") return entries.filter((e) => e.date?.startsWith(monthStr));
    return entries.filter((e) => e.date?.startsWith(`${year}-`));
  }, [entries, scope, monthStr, year]);

  const topSent     = useMemo(() => rankBeneficiaries(relevant(scopedEntries, "out")), [scopedEntries]);
  const topReceived = useMemo(() => rankBeneficiaries(relevant(scopedEntries, "in")),  [scopedEntries]);

  const hasEarlierMonth = entries.some((e) => e.date && e.date < monthStr);
  const hasEarlierYear  = entries.some((e) => e.date && e.date < `${year}-01-01`);

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Major beneficiaries
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--rule)" }}>
            {["month", "ytd"].map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className="text-xs px-3 py-1"
                style={{
                  fontFamily: "var(--font-sans)", fontWeight: 600,
                  background: scope === s ? "var(--gold)" : "var(--ink-3)",
                  color:      scope === s ? "#fff" : "var(--ink-text-dim)",
                  cursor: "pointer",
                }}
              >
                {s === "month" ? "By Month" : "Year to Date"}
              </button>
            ))}
          </div>

          {scope === "month" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthOffset((o) => o - 1)}
                disabled={!hasEarlierMonth}
                className="text-xs px-2 py-1 rounded-md"
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", opacity: hasEarlierMonth ? 1 : 0.35, cursor: hasEarlierMonth ? "pointer" : "default" }}
              >
                ‹
              </button>
              <span className="text-xs font-semibold" style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                {monthLabel}
              </span>
              <button
                onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
                disabled={monthOffset === 0}
                className="text-xs px-2 py-1 rounded-md"
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", opacity: monthOffset === 0 ? 0.35 : 1, cursor: monthOffset === 0 ? "default" : "pointer" }}
              >
                ›
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setYearOffset((o) => o - 1)}
                disabled={!hasEarlierYear}
                className="text-xs px-2 py-1 rounded-md"
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", opacity: hasEarlierYear ? 1 : 0.35, cursor: hasEarlierYear ? "pointer" : "default" }}
              >
                ‹
              </button>
              <span className="text-xs font-semibold" style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
                {year}
              </span>
              <button
                onClick={() => setYearOffset((o) => Math.min(0, o + 1))}
                disabled={yearOffset === 0}
                className="text-xs px-2 py-1 rounded-md"
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", opacity: yearOffset === 0 ? 0.35 : 1, cursor: yearOffset === 0 ? "default" : "pointer" }}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <RankTable
          title="Highest Sent To"
          accent="var(--red)"
          icon="📤"
          rows={topSent}
          emptyMsg="No outgoing transfers with a named beneficiary in this period."
        />
        <RankTable
          title="Highest Received From"
          accent="var(--green)"
          icon="📥"
          rows={topReceived}
          emptyMsg="No incoming transfers with a named sender in this period."
        />
      </div>
    </div>
  );
}
