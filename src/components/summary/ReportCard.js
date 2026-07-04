"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

const GRADE_POINTS = { A: 4, B: 3, C: 2, D: 1, F: 0 };
const GRADE_COLOR = {
  A: "var(--green)",
  B: "#5BA88A",
  C: "var(--amber)",
  D: "#C8862E",
  F: "var(--red)",
};

function bandLowerBetter(value, [a, b, c, d]) {
  if (value <= a) return "A";
  if (value <= b) return "B";
  if (value <= c) return "C";
  if (value <= d) return "D";
  return "F";
}
function bandHigherBetter(value, [a, b, c, d]) {
  if (value >= a) return "A";
  if (value >= b) return "B";
  if (value >= c) return "C";
  if (value >= d) return "D";
  return "F";
}

function averageGrade(grades) {
  const pts = grades.reduce((s, g) => s + GRADE_POINTS[g], 0) / grades.length;
  if (pts >= 3.5) return "A";
  if (pts >= 2.5) return "B";
  if (pts >= 1.5) return "C";
  if (pts >= 0.5) return "D";
  return "F";
}

export default function ReportCard({ entries, salary, monthsLiquidity, prevOut, periodLabel }) {
  const outEntries = entries.filter((e) => e.flow === "out" && e.category !== "Self");
  const monthOut   = outEntries.reduce((s, e) => s + Number(e.amount), 0);
  const essential  = outEntries.filter((e) => e.essentiality === "Essential").reduce((s, e) => s + Number(e.amount), 0);
  const discretionary = outEntries.filter((e) => e.essentiality === "Discretionary").reduce((s, e) => s + Number(e.amount), 0);
  const savedInvested = outEntries.filter((e) => e.category === "Savings & Investment").reduce((s, e) => s + Number(e.amount), 0);
  const discPct = monthOut > 0 ? (discretionary / monthOut) * 100 : 0;

  const subjects = useMemo(() => {
    const list = [];

    // 1. Savings discipline — how much of salary went to saving/investing.
    if (salary > 0) {
      const savingsRate = (savedInvested / salary) * 100;
      const grade = bandHigherBetter(savingsRate, [20, 15, 10, 5]);
      list.push({
        name: "Savings Discipline",
        grade,
        detail: `You put ${formatNaira(savedInvested, { compact: true })} toward savings & investment this period — ${savingsRate.toFixed(0)}% of your salary. The textbook target is 20%.`,
      });
    }

    // 2. Needs vs wants balance.
    if (monthOut > 0) {
      const grade = bandLowerBetter(discPct, [30, 40, 50, 60]);
      list.push({
        name: "Needs vs Wants Balance",
        grade,
        detail: `${discPct.toFixed(0)}% of what you spent was discretionary — things you wanted, not things you needed. Financial planners suggest keeping this under 30%.`,
      });
    }

    // 3. Trend vs the period before.
    if (prevOut > 0) {
      const pctChange = ((monthOut - prevOut) / prevOut) * 100;
      const grade = bandLowerBetter(pctChange, [0, 10, 20, 35]);
      list.push({
        name: "Spending Trend",
        grade,
        detail: pctChange <= 0
          ? `You spent ${formatNaira(Math.abs(monthOut - prevOut), { compact: true })} less than the period before — momentum is in your favour.`
          : `You spent ${formatNaira(monthOut - prevOut, { compact: true })} more than the period before, a ${pctChange.toFixed(0)}% jump.`,
      });
    }

    // 4. Safety net — months of essential spend the current cash balance covers.
    if (monthsLiquidity != null) {
      const grade = bandHigherBetter(monthsLiquidity, [6, 3, 1, 0.5]);
      list.push({
        name: "Safety Net",
        grade,
        detail: `Your current cash balance would cover ${monthsLiquidity.toFixed(1)} months of essential bills if income stopped today. The standard comfort zone is 3–6 months.`,
      });
    }

    return list;
  }, [salary, savedInvested, monthOut, discPct, prevOut, monthsLiquidity]);

  if (subjects.length === 0) return null;

  const overall = averageGrade(subjects.map((s) => s.grade));
  const best  = [...subjects].sort((a, b) => GRADE_POINTS[b.grade] - GRADE_POINTS[a.grade])[0];
  const worst = [...subjects].sort((a, b) => GRADE_POINTS[a.grade] - GRADE_POINTS[b.grade])[0];

  const comment = best && worst && best.name !== worst.name
    ? `Strongest showing in ${best.name.toLowerCase()}; ${worst.name.toLowerCase()} is where the next win is waiting.`
    : `Keep an eye on ${worst?.name?.toLowerCase() || "your spending"} next period.`;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
      <div
        className="flex items-center justify-between gap-3 flex-wrap"
        style={{ padding: "18px 22px", borderBottom: "1px solid var(--rule)", background: "linear-gradient(135deg, rgba(212,160,48,0.08) 0%, rgba(155,114,214,0.06) 100%)" }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            Report Card
          </p>
          <p className="text-[11px]" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", opacity: 0.75, marginTop: 2 }}>
            {periodLabel}
          </p>
        </div>
        <div
          className="flex items-center justify-center"
          style={{
            width: 52, height: 52, borderRadius: 12,
            background: "var(--ink-3)", border: `2px solid ${GRADE_COLOR[overall]}`,
            color: GRADE_COLOR[overall], fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 26,
          }}
        >
          {overall}
        </div>
      </div>

      <div className="flex flex-col" style={{ padding: "6px 22px" }}>
        {subjects.map((s, i) => (
          <div
            key={s.name}
            className="flex items-start gap-3"
            style={{ padding: "14px 0", borderBottom: i < subjects.length - 1 ? "1px solid var(--rule)" : "none" }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: "var(--ink-3)", border: `1px solid ${GRADE_COLOR[s.grade]}`,
                color: GRADE_COLOR[s.grade], fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14,
              }}
            >
              {s.grade}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>{s.name}</p>
              <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginTop: 2 }}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p
        className="text-sm italic"
        style={{ color: "var(--gold)", fontFamily: "var(--font-serif)", padding: "14px 22px", borderTop: "1px solid var(--rule)" }}
      >
        {comment}
      </p>
    </div>
  );
}
