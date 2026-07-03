"use client";

import { useState } from "react";
import { CATEGORY_NAMES } from "@/lib/categories";
import { formatAmountInput, parseAmount, formatNaira } from "@/lib/format";

const BUCKETS = [
  {
    id: "needs",
    label: "Needs",
    sub: "Essential spending",
    pct: 50,
    color: "var(--blue-accent)",
    colorSoft: "rgba(91,143,168,0.10)",
    categories: [
      "Housing & Utilities", "Transportation", "Food & Groceries",
      "Healthcare", "Family & Dependents", "Debt Service",
    ],
  },
  {
    id: "save",
    label: "Save & Invest",
    sub: "Build your wealth",
    pct: 20,
    color: "var(--green)",
    colorSoft: "var(--green-soft)",
    higherIsBetter: true,
    categories: ["Savings & Investment"],
  },
  {
    id: "wants",
    label: "Wants",
    sub: "Lifestyle & discretionary",
    pct: 30,
    color: "var(--gold)",
    colorSoft: "rgba(169,133,79,0.10)",
    categories: ["Dining & Lifestyle", "Personal Care", "Betting", "Charges"],
  },
];

function EditableCapInput({ cap, onSave, accent }) {
  const [editing, setEditing] = useState(false);
  const [raw,     setRaw]     = useState(cap ? String(cap) : "");

  function commit() {
    onSave(parseAmount(raw) || null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          autoFocus
          onChange={(e) => setRaw(formatAmountInput(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          style={{
            width: 110, padding: "3px 6px", borderRadius: 4, boxSizing: "border-box",
            background: "var(--ink-3)", border: `1px solid ${accent || "var(--gold)"}`,
            color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: 11,
            outline: "none",
          }}
        />
        <button
          onClick={commit}
          style={{ background: accent || "var(--gold)", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}
        >
          ✓
        </button>
        <button
          onClick={() => setEditing(false)}
          style={{ background: "none", border: "none", color: "var(--ink-text-dim)", fontSize: 11, cursor: "pointer", padding: "3px 4px" }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setRaw(cap ? String(cap) : ""); setEditing(true); }}
      style={{
        color: cap ? "var(--ink-text-dim)" : (accent || "var(--gold)"),
        fontFamily: "var(--font-mono)", fontSize: 11,
        cursor: "pointer", background: "none", border: "none", padding: 0,
        textAlign: "left",
      }}
    >
      {cap ? `Edit cap` : "Set cap →"}
    </button>
  );
}

function CategoryCard({ cat, spent, cap, onSave, accent }) {
  const pct  = cap && cap > 0 ? Math.min((spent / cap) * 100, 100) : 0;
  const over = cap && spent > cap;
  const barColor = over ? "var(--red)" : pct > 75 ? "var(--amber)" : (accent || "var(--green)");

  return (
    <div style={{
      background: "var(--ink-2)",
      border: "1px solid var(--rule)",
      borderRadius: 10,
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
        <span style={{
          color: "var(--ink-text)", fontFamily: "var(--font-sans)",
          fontSize: 11, fontWeight: 600, lineHeight: 1.3, flex: 1, minWidth: 0,
        }}>
          {cat}
        </span>
        {over && (
          <span style={{
            flexShrink: 0, fontSize: 9, fontWeight: 700, fontFamily: "var(--font-sans)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            color: "var(--red)", background: "var(--red-soft)",
            padding: "1px 5px", borderRadius: 8,
          }}>
            Over
          </span>
        )}
      </div>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: over ? "var(--red)" : "var(--ink-text)" }}>
        {formatNaira(spent, { compact: true })}
        {cap && (
          <span style={{ color: "var(--ink-text-dim)", fontWeight: 400, fontSize: 11 }}>
            {" / "}{formatNaira(cap, { compact: true })}
          </span>
        )}
      </div>

      <div style={{ height: 4, background: "var(--ink-3)", borderRadius: 2, overflow: "hidden" }}>
        {cap && cap > 0 && (
          <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width 0.3s" }} />
        )}
      </div>

      <EditableCapInput cap={cap} onSave={onSave} accent={accent} />
    </div>
  );
}

function BucketSection({ bucket, entries, budgets, onSaveCategory, salary }) {
  const { label, sub, pct, color, colorSoft, categories, higherIsBetter } = bucket;

  const bucketSpent = categories.reduce((sum, cat) =>
    sum + entries.filter(e => e.flow === "out" && e.category === cat)
                 .reduce((s, e) => s + Number(e.amount), 0), 0);

  const bucketCap = categories.reduce((sum, cat) =>
    sum + (budgets.categories[cat] || 0), 0);

  const salaryTarget = salary ? Math.round(salary * (pct / 100)) : null;
  const pctOfCap = bucketCap > 0 ? Math.min((bucketSpent / bucketCap) * 100, 100) : 0;
  const over = bucketCap > 0 && bucketSpent > bucketCap;
  const barColor = higherIsBetter
    ? (bucketCap > 0 && bucketSpent >= bucketCap ? color : "var(--amber)")
    : (over ? "var(--red)" : pctOfCap > 75 ? "var(--amber)" : color);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Bucket header bar */}
      <div style={{
        background: colorSoft,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: "10px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            color, fontFamily: "var(--font-sans)", fontSize: 11,
            fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            {label}
          </span>
          <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11 }}>
            · {sub}
          </span>
          {salaryTarget && (
            <span style={{
              marginLeft: "auto", color: "var(--ink-text-dim)",
              fontFamily: "var(--font-mono)", fontSize: 11,
            }}>
              {pct}% target · {formatNaira(salaryTarget, { compact: true })}
            </span>
          )}
        </div>

        {bucketCap > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: over && !higherIsBetter ? "var(--red)" : "var(--ink-text)" }}>
                {formatNaira(bucketSpent, { compact: true })}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-text-dim)" }}>
                of {formatNaira(bucketCap, { compact: true })} cap
              </span>
              {over && !higherIsBetter && (
                <span style={{ color: "var(--red)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700 }}>
                  · +{formatNaira(bucketSpent - bucketCap, { compact: true })} over
                </span>
              )}
              {higherIsBetter && bucketSpent > 0 && bucketCap > 0 && (
                <span style={{
                  color: bucketSpent >= bucketCap ? "var(--green)" : "var(--amber)",
                  fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700,
                }}>
                  {bucketSpent >= bucketCap ? "· On track ✓" : `· ₦${formatNaira(bucketCap - bucketSpent, { compact: true })} to go`}
                </span>
              )}
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${pctOfCap}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.4s" }} />
            </div>
          </>
        )}
      </div>

      {/* Category cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 8 }}>
        {categories.map((cat) => {
          const spent = entries.filter(e => e.flow === "out" && e.category === cat)
                               .reduce((s, e) => s + Number(e.amount), 0);
          const cap = budgets.categories[cat] ?? null;
          return (
            <CategoryCard
              key={cat}
              cat={cat}
              spent={spent}
              cap={cap}
              onSave={(val) => onSaveCategory(cat, val)}
              accent={color}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function BudgetsGrid({ entries, budgets, onSave, salary }) {
  const totalOut   = entries.filter(e => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const overallCap = budgets.overall || null;
  const hasCaps    = overallCap || CATEGORY_NAMES.some(c => budgets.categories[c]);

  function updateOverall(val) {
    onSave(val, budgets.categories);
  }
  function updateCategory(cat, val) {
    onSave(budgets.overall, { ...budgets.categories, [cat]: val });
  }

  const overallPct  = overallCap ? Math.min((totalOut / overallCap) * 100, 100) : 0;
  const overallOver = overallCap && totalOut > overallCap;

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div>
        <h2 style={{
          fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700,
          color: "var(--ink-text)", margin: "0 0 4px",
        }}>
          {hasCaps ? "Monthly Budget" : "Start budgeting"}
        </h2>
        {!hasCaps && (
          <p style={{
            color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
            fontSize: 13, lineHeight: 1.65, margin: 0,
          }}>
            Set a monthly cap for each spending category. Trakit7 will track your pace in real time and warn you when you're approaching your limit.
            {salary
              ? ` Your salary-based targets: Needs ₦${Math.round(salary * 0.5).toLocaleString("en-NG")}, Wants ₦${Math.round(salary * 0.3).toLocaleString("en-NG")}, Save & Invest ₦${Math.round(salary * 0.2).toLocaleString("en-NG")}.`
              : " Set your salary in the Goals tab to auto-see your 50/30/20 targets alongside each cap."}
          </p>
        )}
      </div>

      {/* ── OVERALL CAP ────────────────────────────────────────────────── */}
      <div style={{
        background: "var(--ink-3)",
        border: `1px solid ${overallOver ? "var(--red)" : "var(--gold)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            color: "var(--gold)", fontFamily: "var(--font-sans)",
            fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            Overall monthly cap
          </span>
          {overallCap && (
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: "var(--font-sans)",
              textTransform: "uppercase", letterSpacing: "0.08em",
              color: overallOver ? "var(--red)" : "var(--green)",
              background: overallOver ? "var(--red-soft)" : "var(--green-soft)",
              padding: "2px 8px", borderRadius: 10,
            }}>
              {overallOver ? "Over budget" : "Within limit"}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700,
            color: overallOver ? "var(--red)" : "var(--ink-text)",
          }}>
            {formatNaira(totalOut)}
          </span>
          {overallCap ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-text-dim)" }}>
              of {formatNaira(overallCap)} cap
            </span>
          ) : salary ? (
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-text-dim)" }}>
              spent this month · {Math.round((totalOut / salary) * 100)}% of salary
            </span>
          ) : null}
        </div>

        {overallCap && (
          <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${overallPct}%`, height: "100%", borderRadius: 3, transition: "width 0.4s",
              background: overallOver ? "var(--red)" : overallPct > 80 ? "var(--amber)" : "var(--green)",
            }} />
          </div>
        )}

        <EditableCapInput cap={overallCap} onSave={updateOverall} accent="var(--gold)" />
      </div>

      {/* ── BUCKET SECTIONS ────────────────────────────────────────────── */}
      {BUCKETS.map((bucket) => (
        <BucketSection
          key={bucket.id}
          bucket={bucket}
          entries={entries}
          budgets={budgets}
          onSaveCategory={updateCategory}
          salary={salary}
        />
      ))}
    </div>
  );
}
