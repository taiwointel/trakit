"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";

export default function ForecastBanner({ cycleStart, cycleEnd, salary, entries, today }) {
  const result = useMemo(() => {
    if (!cycleStart || !cycleEnd) return null;

    const start = new Date(cycleStart + "T00:00:00");
    const end   = new Date(cycleEnd   + "T00:00:00");
    const now   = new Date(today      + "T00:00:00");

    const cycleDays   = Math.max(1, Math.round((end   - start) / 86400000) + 1);
    const daysElapsed = Math.max(1, Math.round((now   - start) / 86400000) + 1);
    const daysLeft    = Math.max(0, cycleDays - daysElapsed);

    // Build per-day spend map (only days elapsed so far)
    const dayMap = {};
    for (let i = 0; i < daysElapsed; i++) {
      const d   = new Date(start.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = 0;
    }
    entries
      .filter((e) => e.flow === "out" && e.date >= cycleStart && e.date <= today)
      .forEach((e) => { dayMap[e.date] = (dayMap[e.date] || 0) + Number(e.amount); });

    const dayValues  = Object.values(dayMap);
    const totalSpent = dayValues.reduce((s, v) => s + v, 0);
    if (totalSpent === 0) return null;

    const dailyAvg  = totalSpent / daysElapsed;
    const projected = dailyAvg * cycleDays;
    const maxDay    = Math.max(...dayValues, dailyAvg * 1.5, 1);

    // Status
    let status, statusColor, statusBg, verdict;
    if (!salary || salary <= 0) {
      status = "neutral"; statusColor = "var(--gold)"; statusBg = "rgba(169,133,79,0.12)";
      verdict = `Projecting ${formatNaira(projected)} total spend this cycle`;
    } else if (projected > salary) {
      status = "danger"; statusColor = "var(--red)"; statusBg = "var(--red-soft)";
      verdict = `Overspend risk — projected to exceed salary by ${formatNaira(projected - salary)}`;
    } else if (projected > salary * 0.9) {
      status = "warning"; statusColor = "var(--amber)"; statusBg = "var(--amber-soft)";
      verdict = `Running tight — ${Math.round((projected / salary) * 100)}% of salary will be spent`;
    } else {
      status = "good"; statusColor = "var(--green)"; statusBg = "var(--green-soft)";
      verdict = `On track — ${formatNaira(salary - projected)} projected to remain by payday`;
    }

    const barColor  = { danger: "var(--red)", warning: "var(--amber)", good: "var(--green)", neutral: "var(--gold)" }[status];
    const baseline  = salary && salary > 0 ? Math.max(salary, projected) : projected * 1.1;
    const spentPct  = Math.min(100, (totalSpent / baseline) * 100);
    const projPct   = Math.min(100, (projected  / baseline) * 100);
    const salPct    = salary ? Math.min(100, (salary / baseline) * 100) : null;
    const timePct   = Math.min(100, (daysElapsed / cycleDays) * 100);

    return {
      status, statusColor, statusBg, verdict, barColor,
      totalSpent, dailyAvg, daysLeft, daysElapsed, cycleDays,
      projected, salary, spentPct, projPct, salPct, timePct,
      baseline, dayMap, dayValues, maxDay,
    };
  }, [cycleStart, cycleEnd, salary, entries, today]);

  if (!result) return null;

  const {
    statusColor, statusBg, verdict, barColor,
    totalSpent, dailyAvg, daysLeft, daysElapsed, cycleDays,
    projected, salary, spentPct, projPct, salPct, timePct,
    baseline, dayMap, maxDay,
  } = result;

  const dayEntries = Object.entries(dayMap);

  return (
    <div style={{
      background: "var(--ink-2)", border: "1px solid var(--rule)",
      borderRadius: 16, padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 20, width: "100%",
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--violet)",
        }}>
          Spend Forecast
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-text-dim)" }}>
          Day {daysElapsed} of {cycleDays} · {daysLeft}d to payday
        </span>
      </div>

      {/* ── Time bar ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          <span>Cycle start</span>
          <span style={{ opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 9 }}>Time elapsed</span>
          <span>Payday</span>
        </div>
        <div style={{ position: "relative", height: 7, borderRadius: 4, background: "rgba(255,255,255,0.07)" }}>
          <div style={{
            position: "absolute", inset: 0, width: `${timePct}%`,
            borderRadius: 4, background: "rgba(255,255,255,0.22)",
          }} />
          <div style={{
            position: "absolute", top: -4, left: `${timePct}%`,
            transform: "translateX(-50%)",
            width: 2, height: 15, borderRadius: 1,
            background: "rgba(255,255,255,0.65)",
          }} />
        </div>
      </div>

      {/* ── Spend vs salary bar ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          <span>₦0</span>
          <span style={{ opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 9 }}>Spending vs {salary ? "salary" : "projection"}</span>
          <span>{formatNaira(baseline)}</span>
        </div>
        <div style={{ position: "relative", height: 20, borderRadius: 10, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
          {/* Projected zone */}
          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%",
            width: `${projPct}%`, borderRadius: 10,
            background: `${barColor}22`,
            borderRight: `2px dashed ${barColor}70`,
          }} />
          {/* Actual spend */}
          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%",
            width: `${spentPct}%`, borderRadius: 10,
            background: `linear-gradient(90deg, ${barColor}bb, ${barColor})`,
          }} />
          {/* Salary marker */}
          {salPct && (
            <div style={{
              position: "absolute", top: 0, left: `${salPct}%`,
              height: "100%", width: 2, background: "rgba(255,255,255,0.5)",
              transform: "translateX(-50%)",
            }} />
          )}
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 14, fontSize: 9.5, fontFamily: "var(--font-sans)", color: "var(--ink-text-dim)", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 10, height: 6, borderRadius: 3, background: barColor }} />
            Spent ({formatNaira(totalSpent)})
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 10, height: 6, borderRadius: 3, background: `${barColor}30`, border: `1px dashed ${barColor}80`, boxSizing: "border-box" }} />
            Projected ({formatNaira(projected)})
          </span>
          {salary > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ display: "inline-block", width: 2, height: 10, background: "rgba(255,255,255,0.5)" }} />
              Salary ({formatNaira(salary)})
            </span>
          )}
        </div>
      </div>

      {/* ── Daily pattern chart ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{
          fontFamily: "var(--font-sans)", fontSize: 9.5, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-text-dim)",
        }}>
          Daily spending pattern
        </span>
        <div style={{ position: "relative", height: 52 }}>
          {/* Average line */}
          <div style={{
            position: "absolute", left: 0, right: 0, zIndex: 1, pointerEvents: "none",
            bottom: `${Math.min(96, (dailyAvg / maxDay) * 100)}%`,
            borderTop: "1px dashed rgba(255,255,255,0.18)",
          }} />
          {/* Bars container */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "100%", overflow: "hidden" }}>
            {/* Actual days */}
            {dayEntries.map(([date, amount]) => {
              const h   = Math.max(2, (amount / maxDay) * 52);
              const col = amount > dailyAvg * 1.6 ? "var(--red)" : amount > dailyAvg * 1.1 ? "var(--amber)" : barColor;
              return (
                <div
                  key={date}
                  title={`${date}: ${formatNaira(amount)}`}
                  style={{
                    flex: 1, minWidth: 2, height: h,
                    borderRadius: "2px 2px 0 0", background: col, opacity: 0.88,
                    alignSelf: "flex-end",
                  }}
                />
              );
            })}
            {/* Ghost bars for remaining days (at avg) */}
            {Array.from({ length: daysLeft }).map((_, i) => (
              <div
                key={`p${i}`}
                style={{
                  flex: 1, minWidth: 2,
                  height: Math.max(2, (dailyAvg / maxDay) * 52),
                  borderRadius: "2px 2px 0 0",
                  background: `${barColor}22`,
                  border: `1px solid ${barColor}40`,
                  borderBottom: "none",
                  alignSelf: "flex-end",
                  boxSizing: "border-box",
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
          <span>Day 1</span>
          <span style={{ opacity: 0.45 }}>dashed = avg {formatNaira(dailyAvg)}/day · ghost bars = forecast</span>
          <span>Day {cycleDays}</span>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
        {[
          { label: "Spent so far", value: formatNaira(totalSpent), sub: `${daysElapsed} days in` },
          { label: "Daily burn",   value: formatNaira(dailyAvg),   sub: "avg per day" },
          { label: "Days left",    value: String(daysLeft),         sub: `of ${cycleDays} cycle` },
          { label: "Projected",    value: formatNaira(projected),   sub: "by payday", highlight: true },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background:   s.highlight ? statusBg : "rgba(255,255,255,0.03)",
              border:       `1px solid ${s.highlight ? `${statusColor}55` : "var(--rule)"}`,
              borderRadius: 10, padding: "10px 12px",
              display: "flex", flexDirection: "column", gap: 3,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: s.highlight ? statusColor : "var(--ink-text)", lineHeight: 1.2 }}>
              {s.value}
            </span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-text-dim)" }}>
              {s.label}
            </span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "var(--ink-text-dim)", opacity: 0.6 }}>
              {s.sub}
            </span>
          </div>
        ))}
      </div>

      {/* ── Verdict ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 14px", borderRadius: 10,
        background: statusBg, border: `1px solid ${statusColor}40`,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>
          {result.status === "danger" ? "⚠️" : result.status === "warning" ? "🟡" : result.status === "good" ? "✅" : "📊"}
        </span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: statusColor, lineHeight: 1.4 }}>
          {verdict}
        </span>
      </div>
    </div>
  );
}
