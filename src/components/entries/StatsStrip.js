"use client";

import { formatNaira } from "@/lib/format";

export default function StatsStrip({ entries, year, month, selectedDay }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const dayStr = selectedDay
    ? `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;

  const monthEntries = entries.filter((e) => e.date?.startsWith(monthStr));
  const dayEntries   = dayStr ? entries.filter((e) => e.date === dayStr) : null;
  const scope        = dayEntries || monthEntries;

  const todayOut  = entries.filter((e) => e.date === today && e.flow === "out")
                           .reduce((s, e) => s + Number(e.amount), 0);
  const last7     = (() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return entries.filter((e) => e.date >= cutoffStr && e.flow === "out")
                  .reduce((s, e) => s + Number(e.amount), 0);
  })();

  const monthOut  = scope.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const monthIn   = scope.filter((e) => e.flow === "in").reduce((s, e) => s + Number(e.amount), 0);
  const net       = monthIn - monthOut;
  const essential = scope.filter((e) => e.flow === "out" && e.essentiality === "Essential")
                         .reduce((s, e) => s + Number(e.amount), 0);
  const essentialPct = monthOut > 0 ? Math.round((essential / monthOut) * 100) : 0;

  const isDay = !!dayStr;

  const cells = [
    { label: "Today out",                  value: formatNaira(todayOut, { compact: true }) },
    { label: "Last 7 days out",            value: formatNaira(last7,    { compact: true }) },
    { label: isDay ? "Day out"  : "Month out",  value: formatNaira(monthOut, { compact: true }), color: "var(--red)" },
    { label: isDay ? "Day in"   : "Month in",   value: formatNaira(monthIn,  { compact: true }), color: "var(--green)" },
    { label: "Essential %",                value: `${essentialPct}%` },
  ];

  return (
    <div
      className="grid grid-cols-5 divide-x"
      style={{ borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", divideColor: "var(--rule)" }}
    >
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col items-center justify-center py-3 px-2 gap-0.5">
          <span
            className="text-[10px] uppercase tracking-wider text-center"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            {c.label}
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: c.color || "var(--ink-text)", fontFamily: "var(--font-mono)" }}
          >
            {c.value}
          </span>
        </div>
      ))}
    </div>
  );
}
