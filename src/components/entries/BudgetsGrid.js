"use client";

import { useState } from "react";
import { CATEGORY_NAMES } from "@/lib/categories";
import { formatAmountInput, parseAmount, formatNaira } from "@/lib/format";

function BudgetCard({ label, spent, cap, onSave, isOverall }) {
  const [editing, setEditing] = useState(false);
  const [raw,     setRaw]     = useState(cap ? String(cap) : "");

  const pct   = cap && cap > 0 ? Math.min((spent / cap) * 100, 100) : 0;
  const over  = cap && spent > cap;
  const color = over ? "var(--red)" : pct > 70 ? "var(--amber)" : "var(--green)";

  function save() {
    onSave(parseAmount(raw) || null);
    setEditing(false);
  }

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2"
      style={{
        background:  "var(--ink-2)",
        border:      isOverall ? "1px solid var(--gold)" : "1px solid var(--rule)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-semibold"
          style={{
            color:      isOverall ? "var(--gold)" : "var(--ink-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {label}
        </span>
        {cap && (
          <span
            className="text-xs"
            style={{ color: over ? "var(--red)" : "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
          >
            {formatNaira(spent, { compact: true })} / {formatNaira(cap, { compact: true })}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {cap && (
        <div style={{ height: 6, background: "var(--ink-3)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
      )}

      {/* Cap input */}
      {editing ? (
        <div className="flex gap-1 mt-1">
          <input
            type="text"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(formatAmountInput(e.target.value))}
            placeholder="₦ cap"
            autoFocus
            className="flex-1 px-2 py-1 rounded text-xs outline-none"
            style={{
              background:  "var(--ink-3)",
              border:      "1px solid var(--rule)",
              color:       "var(--ink-text)",
              fontFamily:  "var(--font-mono)",
            }}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          />
          <button onClick={save} className="px-2 py-1 rounded text-xs" style={{ background: "var(--gold)", color: "#fff" }}>✓</button>
        </div>
      ) : (
        <button
          onClick={() => { setRaw(cap ? String(cap) : ""); setEditing(true); }}
          className="text-xs text-left"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
        >
          {cap ? `Edit cap` : "Set cap…"}
        </button>
      )}
    </div>
  );
}

export default function BudgetsGrid({ entries, budgets, onSave }) {
  const monthEntries = entries; // caller passes already-filtered month entries

  function spentFor(category) {
    return monthEntries.filter((e) => e.flow === "out" && e.category === category)
                       .reduce((s, e) => s + Number(e.amount), 0);
  }
  const totalOut = monthEntries.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);

  function updateOverall(val) {
    onSave(val, budgets.categories);
  }
  function updateCategory(cat, val) {
    onSave(budgets.overall, { ...budgets.categories, [cat]: val });
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
        Budgets
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <BudgetCard
          key="overall"
          label="Overall cap"
          spent={totalOut}
          cap={budgets.overall}
          onSave={updateOverall}
          isOverall
        />
        {CATEGORY_NAMES.map((cat) => (
          <BudgetCard
            key={cat}
            label={cat}
            spent={spentFor(cat)}
            cap={budgets.categories[cat] ?? null}
            onSave={(val) => updateCategory(cat, val)}
          />
        ))}
      </div>
    </div>
  );
}
