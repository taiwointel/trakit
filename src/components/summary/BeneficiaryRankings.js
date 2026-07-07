"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import { clusterByBeneficiary } from "@/lib/beneficiaryCluster";
import { CATEGORY_NAMES, categoryDefaults } from "@/lib/categories";

// Same self-transfer exclusion as every other summary panel — money moving
// between the user's own accounts isn't a real beneficiary relationship.
function relevant(entries, flow) {
  return entries.filter((e) => e.flow === flow && e.category !== "Self" && e.beneficiary);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

// Exhaustive, not top-N — the scroll container in RankTable handles length.
const rankBeneficiaries = clusterByBeneficiary;

const selectStyle = {
  background: "var(--ink-2)", border: "1px solid var(--rule)", color: "var(--ink-text)",
  fontFamily: "var(--font-sans)", fontSize: 11, borderRadius: 6, padding: "4px 22px 4px 8px", outline: "none",
};

// Full-screen drill-through — every transaction behind one ranked row, in
// date order, with a short description and the running total confirmed
// against the row's own figure so the two can never silently disagree.
// Retagging lives right here: a bulk bar to recategorize every transaction
// with this beneficiary in one action, plus a per-row select for the odd
// one that shouldn't follow the group.
function DrillThroughModal({ row, accent, onClose, onUpdate, onBulkUpdate }) {
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkNotice,   setBulkNotice]   = useState(null);
  // `row.entries` is a snapshot from whenever the modal was opened — the
  // parent's own state updates fine after a retag, but this modal keeps
  // rendering the same captured object, so a per-row change looked like it
  // silently did nothing even though it saved. Track overrides locally so
  // the select (and a "Saved" confirmation) reflect the change immediately.
  const [localCategory, setLocalCategory] = useState({}); // id -> category
  const [savingId,      setSavingId]      = useState(null);
  const [savedId,       setSavedId]       = useState(null);

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

  async function applyRowRetag(entry, category) {
    setLocalCategory((prev) => ({ ...prev, [entry.id]: category }));
    setSavingId(entry.id);
    setSavedId(null);
    await onUpdate(entry.id, { category, ...categoryDefaults(category) });
    setSavingId(null);
    setSavedId(entry.id);
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
                <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, margin: 0, lineHeight: 1.4, wordBreak: "break-word" }}>
                  {e.desc || "—"}
                </p>
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4 }}>
                  <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 10.5, margin: 0 }}>
                    {fmtDate(e.date)}
                  </p>
                  {onUpdate && (
                    <>
                      <select
                        value={localCategory[e.id] ?? e.category ?? ""}
                        onChange={(ev) => applyRowRetag(e, ev.target.value)}
                        disabled={savingId === e.id}
                        style={{ ...selectStyle, fontSize: 10, padding: "2px 18px 2px 6px", opacity: savingId === e.id ? 0.6 : 1 }}
                      >
                        {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {savingId === e.id && (
                        <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 10 }}>Saving…</span>
                      )}
                      {savedId === e.id && (
                        <span style={{ color: "var(--green)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600 }}>✓ Saved</span>
                      )}
                    </>
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

function RankTable({ title, accent, icon, rows, emptyMsg, onUpdate, onBulkUpdate }) {
  const [drillRow, setDrillRow] = useState(null);
  const [query,    setQuery]    = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  // Scale bars against the filtered set's own leader, not the unfiltered
  // list's — otherwise searching down to smaller names leaves every bar
  // looking nearly empty against a leader that's no longer even shown.
  const max = filteredRows.length ? filteredRows[0].total : 0;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderTop: `3px solid ${accent}` }}>
      <div className="px-4 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: "var(--rule)" }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent, fontFamily: "var(--font-sans)", flex: 1 }}>
          {title}
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          style={{
            background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)",
            fontFamily: "var(--font-sans)", fontSize: 11, borderRadius: 6, padding: "4px 8px",
            outline: "none", width: 110,
          }}
        />
      </div>
      <div className="px-4 py-3 flex flex-col gap-2.5" style={{ maxHeight: 340, overflowY: "auto" }}>
        {filteredRows.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            {rows.length === 0 ? emptyMsg : "No beneficiaries match that search."}
          </p>
        ) : filteredRows.map((r, i) => (
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
        <DrillThroughModal row={drillRow} accent={accent} onClose={() => setDrillRow(null)} onUpdate={onUpdate} onBulkUpdate={onBulkUpdate} />
      )}
    </div>
  );
}

export default function BeneficiaryRankings({ entries, onUpdate, onBulkUpdate }) {
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
          onUpdate={onUpdate}
          onBulkUpdate={onBulkUpdate}
        />
        <RankTable
          title="Highest Received From"
          accent="var(--green)"
          icon="📥"
          rows={topReceived}
          emptyMsg="No incoming transfers with a named sender in this period."
          onUpdate={onUpdate}
          onBulkUpdate={onBulkUpdate}
        />
      </div>
    </div>
  );
}
