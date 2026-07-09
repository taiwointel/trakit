"use client";

import { useState, useMemo } from "react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { formatNaira } from "@/lib/format";

/* ── SVG Pie chart ─────────────────────────────────────────────── */
function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function PieChart({ slices, size = 260 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  let cumAngle = 0;
  const arcs = slices.map((s, i) => {
    const startAngle = cumAngle;
    const sweep      = (s.pct / 100) * 360;
    cumAngle += sweep;
    const endAngle  = cumAngle;
    const start     = polarToXY(cx, cy, r, startAngle);
    const end       = polarToXY(cx, cy, r, endAngle);
    const largeArc  = sweep > 180 ? 1 : 0;
    const midAngle  = startAngle + sweep / 2;
    const labelPt   = polarToXY(cx, cy, r * 0.68, midAngle);

    return { ...s, startAngle, endAngle, sweep, start, end, largeArc, labelPt, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
  });

  const svgStyle = { width: "100%", maxWidth: size, height: "auto", display: "block" };

  if (slices.length === 1) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} style={svgStyle}>
        <circle cx={cx} cy={cy} r={r} fill={CATEGORY_COLORS[0]} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={14} fontFamily="var(--font-mono)" fontWeight={600}>
          100%
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={svgStyle}>
      {arcs.map((arc) => {
        const d = `M ${cx} ${cy} L ${arc.start.x} ${arc.start.y} A ${r} ${r} 0 ${arc.largeArc} 1 ${arc.end.x} ${arc.end.y} Z`;
        return (
          <g key={arc.category}>
            <path d={d} fill={arc.color} />
            {arc.pct >= 7 && (
              <text
                x={arc.labelPt.x}
                y={arc.labelPt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={11}
                fontFamily="var(--font-mono)"
                fontWeight={600}
              >
                {Math.round(arc.pct)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── SVG Bar chart ──────────────────────────────────────────────── */
function BarChart({ slices }) {
  const max = Math.max(...slices.map((s) => s.amount), 1);
  return (
    <div className="flex flex-col gap-2 w-full">
      {slices.map((s, i) => (
        <div key={s.category} className="flex items-center gap-2">
          <div className="text-xs w-32 truncate" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            {s.category}
          </div>
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: "var(--ink-3)" }}>
            <div style={{
              width:        `${(s.amount / max) * 100}%`,
              height:       "100%",
              background:   CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              borderRadius: 4,
              transition:   "width 0.3s",
            }} />
          </div>
          <div className="text-xs w-24 text-right" style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>
            {formatNaira(s.amount, { compact: true })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function WhereItWent({ entries }) {
  const [mode, setMode] = useState("pie");

  // mode (pie/bar toggle) and any hover state below are local UI state with
  // no bearing on the underlying numbers — without memoizing this, every
  // toggle click and every slice/bar hover re-filtered and re-reduced the
  // full entries array from scratch.
  const slices = useMemo(() => {
    const outEntries = entries.filter((e) => e.flow === "out" && e.category && e.category !== "Income" && e.category !== "Self");
    const total       = outEntries.reduce((s, e) => s + Number(e.amount), 0);

    const byCategory = {};
    for (const e of outEntries) {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    }

    return Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries]);

  const total = slices.reduce((s, sl) => s + sl.amount, 0);

  if (slices.length === 0) {
    return (
      <div
        className="rounded-lg p-4 flex flex-col gap-3"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", overflow: "hidden" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)" }}>
            Where it went
          </p>
        </div>
        <p className="text-sm text-center py-6" style={{ color: "var(--ink-text-dim)" }}>No expense entries for this period.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", overflow: "hidden" }}
    >
      {/* Header + toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Where it went
        </p>
        <div
          className="flex rounded overflow-hidden border text-xs"
          style={{ borderColor: "var(--rule)" }}
        >
          {["pie", "bars"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1 transition-colors"
              style={{
                background: mode === m ? "var(--gold)" : "var(--ink-3)",
                color:      mode === m ? "#fff" : "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {m === "pie" ? "Pie" : "Bars"}
            </button>
          ))}
        </div>
      </div>

      {mode === "pie" ? (
        <div className="pie-layout">
          <div style={{ width: "100%", maxWidth: 220, flexShrink: 0 }}>
            <PieChart slices={slices} size={220} />
          </div>
          {/* Legend */}
          <div className="flex flex-col gap-2 w-full min-w-0">
            {slices.map((s, i) => (
              <div key={s.category} className="flex items-center gap-2 min-w-0">
                <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], flexShrink: 0 }} />
                <span className="text-xs truncate flex-1" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                  {s.category}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {formatNaira(s.amount, { compact: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <BarChart slices={slices} />
      )}
    </div>
  );
}
