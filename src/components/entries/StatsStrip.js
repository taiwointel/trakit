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
  const essential = scope.filter((e) => e.flow === "out" && e.essentiality === "Essential")
                         .reduce((s, e) => s + Number(e.amount), 0);
  const essentialPct = monthOut > 0 ? Math.round((essential / monthOut) * 100) : 0;

  const isDay = !!dayStr;

  const cells = [
    {
      label:    "Today out",
      value:    formatNaira(todayOut),
      color:    "var(--red)",
      accent:   "#E84030",
      grad:     "rgba(232,64,48,0.12)",
    },
    {
      label:    "Last 7 days",
      value:    formatNaira(last7),
      color:    "var(--amber)",
      accent:   "#E8920A",
      grad:     "rgba(232,146,10,0.10)",
    },
    {
      label:    isDay ? "Day out" : "Month out",
      value:    formatNaira(monthOut),
      color:    "var(--red)",
      accent:   "#E84030",
      grad:     "rgba(232,64,48,0.12)",
    },
    {
      label:    isDay ? "Day in" : "Month in",
      value:    formatNaira(monthIn),
      color:    "var(--green)",
      accent:   "#25B56A",
      grad:     "rgba(37,181,106,0.10)",
    },
    {
      label:    "Essential %",
      value:    `${essentialPct}%`,
      color:    essentialPct > 70 ? "var(--amber)" : "var(--gold)",
      accent:   "#D4A030",
      grad:     "rgba(212,160,48,0.10)",
    },
  ];

  return (
    <div style={{
      background: "var(--ink)",
      borderTop:    "1px solid var(--rule)",
      borderBottom: "1px solid var(--rule)",
    }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 24px" }}>
      <div className="stats-strip-scroll">
      <div className="stats-strip-grid">
        {cells.map((c) => (
          <div
            key={c.label}
            style={{
              background:   `linear-gradient(160deg, ${c.grad} 0%, var(--ink-2) 55%)`,
              border:       "1px solid var(--rule)",
              borderTop:    `2.5px solid ${c.accent}`,
              borderRadius: 12,
              padding:      "14px 16px 12px",
              display:      "flex",
              flexDirection: "column",
              gap:          8,
            }}
          >
            {/* Dot + label */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: c.accent, flexShrink: 0, opacity: 0.9,
              }} />
              <span style={{
                color:         "var(--ink-text-dim)",
                fontFamily:    "var(--font-sans)",
                fontSize:      9,
                fontWeight:    700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                lineHeight:    1,
              }}>
                {c.label}
              </span>
            </div>
            {/* Value — the hero */}
            <span style={{
              color:         c.color,
              fontFamily:    "var(--font-mono)",
              fontSize:      "clamp(14px, 1.6vw, 20px)",
              fontWeight:    800,
              lineHeight:    1,
              letterSpacing: "-0.02em",
            }}>
              {c.value}
            </span>
          </div>
        ))}
      </div>
      </div>
      </div>
    </div>
  );
}
