"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import { clusterByBeneficiary } from "@/lib/beneficiaryCluster";
import { CATEGORY_NAMES, categoryDefaults } from "@/lib/categories";

function relevant(entries) {
  return entries.filter((e) => e.flow === "out" && e.category && e.category !== "Self");
}

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

function rankCategories(entries) {
  const map = {};
  for (const e of relevant(entries)) {
    const key = e.category;
    if (!map[key]) map[key] = { name: key, total: 0, count: 0, entries: [] };
    map[key].total += Number(e.amount);
    map[key].count += 1;
    map[key].entries.push(e);
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

const selectStyle = {
  background: "var(--ink-2)", border: "1px solid var(--rule)", color: "var(--ink-text)",
  fontFamily: "var(--font-sans)", fontSize: 11, borderRadius: 6, padding: "4px 22px 4px 8px", outline: "none",
};

// Full-screen drill-through for one beneficiary's spend *within a single
// category* — every underlying transaction, in date order, with a short
// description and the running total confirmed against the row's own figure.
// Retagging lives right here: a bulk bar to recategorize every transaction
// with this beneficiary (within this category) in one action, plus a
// per-row select for the odd one that shouldn't follow the group.
function BeneficiaryDrillModal({ row, accent, onClose, onUpdate, onBulkUpdate }) {
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkNotice,   setBulkNotice]   = useState(null);

  async function applyBulk() {
    if (!bulkCategory || !onBulkUpdate) return;
    if (!confirm(`Set category to "${bulkCategory}" for all ${row.entries.length} transactions with ${row.name}?`)) return;
    setBulkApplying(true);
    setBulkNotice(null);
    await onBulkUpdate(row.entries.map((e) => e.id), { category: bulkCategory, ...categoryDefaults(bulkCategory) });
    setBulkApplying(false);
    setBulkNotice(`Retagged ${row.entries.length} transactions as "${bulkCategory}".`);
    setBulkCategory("");
  }

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

        {onBulkUpdate && (
          <div className="flex items-center gap-2 flex-wrap" style={{ background: "rgba(169,133,79,0.1)", borderRadius: 8, padding: "8px 10px" }}>
            <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 600 }}>
              Retag all {row.entries.length} →
            </span>
            <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} style={selectStyle}>
              <option value="">Choose category…</option>
              {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={applyBulk}
              disabled={!bulkCategory || bulkApplying}
              style={{
                background: "var(--gold)", color: "#fff", border: "none",
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
                borderRadius: 6, padding: "4px 10px",
                cursor: (!bulkCategory || bulkApplying) ? "not-allowed" : "pointer",
                opacity: (!bulkCategory || bulkApplying) ? 0.6 : 1,
              }}
            >
              {bulkApplying ? "Applying…" : "Apply"}
            </button>
            {bulkNotice && (
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--green)" }}>{bulkNotice}</span>
            )}
          </div>
        )}

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 2 }}>
          {row.entries.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
                padding: "8px 10px", background: "var(--ink-3)", borderRadius: 8,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {shortDesc(e) || "—"}
                </p>
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4 }}>
                  <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 10.5, margin: 0 }}>
                    {fmtDate(e.date)}
                  </p>
                  {onUpdate && (
                    <select
                      value={e.category || ""}
                      onChange={(ev) => onUpdate(e.id, { category: ev.target.value, ...categoryDefaults(ev.target.value) })}
                      style={{ ...selectStyle, fontSize: 10, padding: "2px 18px 2px 6px" }}
                    >
                      {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
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

// One category's accordion row — collapsed shows the category total; expanded
// reveals every beneficiary spent on within that category, summed and
// clustered the same way Major Beneficiaries does, ranked highest first,
// each with its own (i) drill-through into the individual transactions.
function CategoryRow({ cat, index, accent, isOpen, onToggle, onUpdate, onBulkUpdate }) {
  const beneficiaries = useMemo(() => clusterByBeneficiary(cat.entries), [cat.entries]);
  const [drillRow, setDrillRow] = useState(null);
  const maxBene = beneficiaries.length ? beneficiaries[0].total : 0;

  return (
    <div style={{ borderBottom: "1px solid var(--rule)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: isOpen ? "var(--ink-2)" : "transparent", cursor: "pointer" }}
      >
        <span className="text-[10px] shrink-0" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", width: 16 }}>
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-semibold" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
          {cat.name}
        </span>
        <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
          {cat.count} txn{cat.count !== 1 ? "s" : ""}
        </span>
        <span className="text-sm font-bold" style={{ color: accent, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
          {formatNaira(cat.total)}
        </span>
        <span style={{ color: "var(--ink-text-dim)", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div style={{ background: "var(--ink)", padding: "4px 14px 14px 42px", display: "flex", flexDirection: "column", gap: 8 }}>
          {beneficiaries.map((b) => (
            <div key={b.name} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs truncate" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }} title={b.name}>
                  {b.name}
                </span>
                <button
                  onClick={() => setDrillRow(b)}
                  title={`See every ${cat.name} transaction with ${b.name}`}
                  style={{
                    width: 15, height: 15, borderRadius: "50%", border: `1px solid ${accent}`,
                    background: "none", color: accent, fontSize: 9, fontWeight: 700,
                    fontFamily: "var(--font-serif)", lineHeight: "13px", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0,
                  }}
                >
                  i
                </button>
                <span className="text-xs font-semibold shrink-0" style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>
                  {formatNaira(b.total)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--rule)", overflow: "hidden" }}>
                  <div style={{ width: `${maxBene > 0 ? (b.total / maxBene) * 100 : 0}%`, height: "100%", background: accent, borderRadius: 2 }} />
                </div>
                <span className="text-[10px] shrink-0" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {b.count} txn{b.count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {drillRow && (
        <BeneficiaryDrillModal row={drillRow} accent={accent} onClose={() => setDrillRow(null)} onUpdate={onUpdate} onBulkUpdate={onBulkUpdate} />
      )}
    </div>
  );
}

export default function SpendConcentration({ entries, onUpdate, onBulkUpdate }) {
  const [scope, setScope] = useState("ytd"); // "month" | "ytd"
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset,  setYearOffset]  = useState(0);
  const [query,       setQuery]       = useState("");
  const [openCats,    setOpenCats]    = useState(() => new Set());

  const monthDate  = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthStr   = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const year       = today.getFullYear() + yearOffset;

  const scopedEntries = useMemo(() => {
    if (scope === "month") return entries.filter((e) => e.date?.startsWith(monthStr));
    return entries.filter((e) => e.date?.startsWith(`${year}-`));
  }, [entries, scope, monthStr, year]);

  const rows = useMemo(() => rankCategories(scopedEntries), [scopedEntries]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const accent = "var(--red)";

  const hasEarlierMonth = entries.some((e) => e.date && e.date < monthStr);
  const hasEarlierYear  = entries.some((e) => e.date && e.date < `${year}-01-01`);

  function toggleCat(name) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Spend Concentration
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

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", borderTop: `3px solid ${accent}` }}>
        <div className="px-4 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: "var(--rule)" }}>
          <span style={{ fontSize: 13 }}>💸</span>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent, fontFamily: "var(--font-sans)", flex: 1 }}>
            Categories — click to see who the money went to
          </p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            style={{
              background: "var(--ink-2)", border: "1px solid var(--rule)", color: "var(--ink-text)",
              fontFamily: "var(--font-sans)", fontSize: 11, borderRadius: 6, padding: "4px 8px",
              outline: "none", width: 110,
            }}
          />
        </div>
        <div style={{ maxHeight: 480, overflowY: "auto" }}>
          {filteredRows.length === 0 ? (
            <p className="text-xs px-4 py-3" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              {rows.length === 0 ? "No categorized expenses in this period." : "No categories match that search."}
            </p>
          ) : filteredRows.map((cat, i) => (
            <CategoryRow
              key={cat.name}
              cat={cat}
              index={i}
              accent={accent}
              isOpen={openCats.has(cat.name)}
              onToggle={() => toggleCat(cat.name)}
              onUpdate={onUpdate}
              onBulkUpdate={onBulkUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
