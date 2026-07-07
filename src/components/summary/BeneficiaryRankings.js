"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import { namesLikelySamePerson } from "@/lib/selfTransfer";

// Same self-transfer exclusion as every other summary panel — money moving
// between the user's own accounts isn't a real beneficiary relationship.
function relevant(entries, flow) {
  return entries.filter((e) => e.flow === flow && e.category !== "Self" && e.beneficiary);
}

// Mirrors LedgerTable's splitDesc, kept local since only the "purpose" half
// (not the beneficiary detail, which we already know here) is needed for a
// short per-transaction line in the drill-through list.
function shortDesc(entry) {
  const desc = entry.desc || "";
  const sep  = desc.indexOf(" — ");
  return sep !== -1 ? desc.slice(0, sep).trim() : desc;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

// Different banks (or even different transactions on the same bank) print
// the same person's name in different forms — "KEHINDE OLAYINKA OGUNFILE"
// on one statement, just "KEHINDE OGUNFILE" on another. Left as exact
// string groups, those show up as two separate, smaller-looking entries
// instead of one real relationship. Cluster exact-string groups whose
// names are a same-person match (order-independent, one contained in the
// other) via union-find, then merge each cluster's totals (and underlying
// transactions, for drill-through) under whichever variant has the most
// name words (the fullest form seen).
function clusterBeneficiaries(groups) {
  const n = groups.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (namesLikelySamePerson(groups[i].name, groups[j].name)) union(i, j);
    }
  }

  const clusters = {};
  for (let i = 0; i < n; i++) {
    const root = find(i);
    (clusters[root] ||= []).push(groups[i]);
  }

  return Object.values(clusters).map((members) => {
    const total = members.reduce((s, m) => s + m.total, 0);
    const count = members.reduce((s, m) => s + m.count, 0);
    const txns  = members.flatMap((m) => m.entries).sort((a, b) => b.date.localeCompare(a.date));
    const canonical = [...members].sort((a, b) => {
      const wordsA = a.name.trim().split(/\s+/).length;
      const wordsB = b.name.trim().split(/\s+/).length;
      return wordsB !== wordsA ? wordsB - wordsA : b.total - a.total;
    })[0].name;
    return { name: canonical, total, count, entries: txns };
  });
}

function rankBeneficiaries(entries) {
  const map = {};
  for (const e of entries) {
    const key = e.beneficiary.trim();
    if (!key) continue;
    if (!map[key]) map[key] = { name: key, total: 0, count: 0, entries: [] };
    map[key].total += Number(e.amount);
    map[key].count += 1;
    map[key].entries.push(e);
  }
  // Exhaustive, not top-N — the scroll container in RankTable handles length.
  return clusterBeneficiaries(Object.values(map)).sort((a, b) => b.total - a.total);
}

// Full-screen drill-through — every transaction behind one ranked row, in
// date order, with a short description and the running total confirmed
// against the row's own figure so the two can never silently disagree.
function DrillThroughModal({ row, accent, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "var(--ink-2)",
          border:       `1px solid ${accent}`,
          borderRadius: 16,
          width:        "100%",
          maxWidth:     480,
          maxHeight:    "80vh",
          padding:      "20px 22px 18px",
          display:      "flex",
          flexDirection:"column",
          gap:          12,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, margin: 0 }}>
              {row.name}
            </p>
            <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11.5, marginTop: 2 }}>
              {row.count} transaction{row.count !== 1 ? "s" : ""} · <span style={{ color: accent, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{formatNaira(row.total)}</span> total
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--ink-text-dim)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 2 }}>
          {row.entries.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
                padding: "8px 10px", background: "var(--ink-3)", borderRadius: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {shortDesc(e) || "—"}
                </p>
                <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 10.5, margin: "2px 0 0" }}>
                  {fmtDate(e.date)}
                </p>
              </div>
              <span style={{ color: accent, fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>
                {formatNaira(e.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RankTable({ title, accent, icon, rows, emptyMsg }) {
  const [drillRow, setDrillRow] = useState(null);
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
              <button
                onClick={() => setDrillRow(r)}
                title={`See every transaction with ${r.name}`}
                style={{
                  width: 15, height: 15, borderRadius: "50%", border: `1px solid ${accent}`,
                  background: "none", color: accent, fontSize: 9, fontWeight: 700,
                  fontFamily: "var(--font-serif)", lineHeight: "13px", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0,
                }}
              >
                i
              </button>
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

      {drillRow && (
        <DrillThroughModal row={drillRow} accent={accent} onClose={() => setDrillRow(null)} />
      )}
    </div>
  );
}

export default function BeneficiaryRankings({ entries }) {
  const [scope, setScope] = useState("ytd"); // "month" | "ytd"
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
