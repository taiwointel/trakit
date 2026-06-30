"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

function ProgressBar({ pct, color }) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height: 8, background: "var(--ink-3)" }}
    >
      <div
        style={{
          width:        `${Math.min(100, pct)}%`,
          height:       "100%",
          background:   color,
          borderRadius: 4,
          transition:   "width 0.4s",
        }}
      />
    </div>
  );
}

function Badge({ breach }) {
  return (
    <span
      className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
      style={{
        background: breach ? "var(--red-soft)"   : "var(--green-soft)",
        color:      breach ? "var(--red)"         : "var(--green)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {breach ? "Breach" : "Within limit"}
    </span>
  );
}

export default function MonthlyTargets({ entries, salary, customGoals = [], userName = "" }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const today     = new Date();

  const monthOut = useMemo(
    () => entries.filter((e) => e.date?.startsWith(thisMonth) && e.flow === "out"),
    [entries, thisMonth],
  );

  const actualNeeds = useMemo(
    () => monthOut.filter((e) => e.essentiality === "Essential").reduce((s, e) => s + Number(e.amount), 0),
    [monthOut],
  );
  const actualWants = useMemo(
    () => monthOut.filter((e) => e.essentiality === "Discretionary").reduce((s, e) => s + Number(e.amount), 0),
    [monthOut],
  );
  // Savings proxy via category (investments tab will extend this)
  const actualSavings = useMemo(
    () => monthOut.filter((e) => e.category === "Savings & Investment").reduce((s, e) => s + Number(e.amount), 0),
    [monthOut],
  );

  const extraFromGoals = useMemo(() =>
    customGoals.reduce((sum, g) => {
      if (!g.target_date) return sum;
      const target = new Date(g.target_date + "T00:00:00");
      const months = Math.max(1,
        (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()),
      );
      return sum + Math.max(0, Number(g.target_amount) - Number(g.saved_so_far)) / months;
    }, 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [customGoals]);

  if (!salary) {
    return (
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
      >
        <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Set your salary above to see your 50/30/20 budget targets.
        </p>
      </div>
    );
  }

  const needsBudget       = salary * 0.50;
  const baseWants         = salary * 0.30;
  const baseSave          = salary * 0.20;
  const wantsBudget       = Math.max(0, baseWants - extraFromGoals);
  const saveTarget        = baseSave + extraFromGoals;
  const goalsReallocated  = extraFromGoals > 0;

  const needsPct  = needsBudget > 0 ? (actualNeeds   / needsBudget) * 100 : 0;
  const wantsPct  = wantsBudget > 0 ? (actualWants   / wantsBudget) * 100 : 0;
  const savePct   = saveTarget  > 0 ? (actualSavings / saveTarget)  * 100 : 0;

  const needsColor = needsPct > 100 ? "var(--red)" : needsPct > 80 ? "var(--amber)" : "var(--green)";
  const wantsColor = wantsPct > 100 ? "var(--red)" : wantsPct > 80 ? "var(--amber)" : "var(--green)";
  const saveColor  = savePct  >= 100 ? "var(--green)" : savePct > 60 ? "var(--amber)" : "var(--red)";
  const saveMet    = actualSavings >= saveTarget;

  const rows = [
    {
      label:  "Needs (50%)",
      target: needsBudget,
      actual: actualNeeds,
      pct:    needsPct,
      color:  needsColor,
      breach: actualNeeds > needsBudget,
      note:   null,
    },
    {
      label:  "Wants (30%)",
      target: wantsBudget,
      actual: actualWants,
      pct:    wantsPct,
      color:  wantsColor,
      breach: actualWants > wantsBudget,
      note:   goalsReallocated
        ? `${formatNaira(extraFromGoals, { compact: true })} trimmed from Wants → Save & Invest for your goals`
        : null,
    },
    {
      label:  "Save & Invest (20%)",
      target: saveTarget,
      actual: actualSavings,
      pct:    savePct,
      color:  saveColor,
      breach: actualSavings < saveTarget,
      note:   goalsReallocated
        ? `Includes ${formatNaira(extraFromGoals, { compact: true })} goal-driven top-up`
        : null,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {saveMet && (
        <div
          className="rounded-lg px-4 py-3 flex items-center gap-2"
          style={{ background: "var(--green-soft)", borderLeft: "3px solid var(--green)" }}
        >
          <span>🎉</span>
          <span className="text-sm font-medium" style={{ color: "var(--green)", fontFamily: "var(--font-sans)" }}>
            Save &amp; Invest target met this month — great work{userName ? `, ${userName}` : ""}!
          </span>
        </div>
      )}

      <div
        className="rounded-xl p-4 flex flex-col gap-5"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderTop: "3px solid var(--teal)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--teal)", fontFamily: "var(--font-sans)" }}
        >
          This month's targets
        </p>

        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
              >
                {row.label}
              </span>
              <Badge breach={row.breach} />
              <span
                className="ml-auto text-xs"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
              >
                {formatNaira(row.actual)} / {formatNaira(row.target)}
              </span>
            </div>
            <ProgressBar pct={row.pct} color={row.color} />
            {row.note && (
              <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                ⟳ {row.note}
              </p>
            )}
          </div>
        ))}

        <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", opacity: 0.7 }}>
          * Feasibility is checked independently per goal against your 20% baseline ({formatNaira(baseSave, { compact: true })}), not stacked — known simplification.
        </p>
      </div>
    </div>
  );
}
