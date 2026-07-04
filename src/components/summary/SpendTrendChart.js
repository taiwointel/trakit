"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/format";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtLabel(raw) {
  // monthly format already clean: "Jun '26"
  if (!raw || raw.includes("'")) return raw;
  // "MM-DD" → "21 Jun"
  const [mm, dd] = raw.split("-");
  return `${parseInt(dd, 10)} ${MONTHS[parseInt(mm, 10) - 1]}`;
}

function bucketEntries(entries, from, to) {
  const fromDate = new Date(from + "T00:00:00");
  const toDate   = new Date(to   + "T00:00:00");
  const days     = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
  const outEntries = entries.filter((e) => e.flow === "out" && e.category !== "Self" && e.date >= from && e.date <= to);

  if (days <= 21) {
    const map = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate); d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      map[iso] = 0;
    }
    for (const e of outEntries) map[e.date] = (map[e.date] || 0) + Number(e.amount);
    return Object.entries(map).map(([k, amount]) => ({ label: k.slice(5), amount }));
  }

  if (days <= 98) {
    const map = {};
    for (const e of outEntries) {
      const d = new Date(e.date + "T00:00:00");
      const dow = (d.getDay() + 6) % 7;
      const mon = new Date(d); mon.setDate(d.getDate() - dow);
      const key = mon.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + Number(e.amount);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, amount]) => ({ label: k.slice(5), amount }));
  }

  const map = {};
  for (const e of outEntries) {
    const key = e.date.slice(0, 7);
    map[key] = (map[key] || 0) + Number(e.amount);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, amount]) => ({
      label:  `${MONTHS[parseInt(k.slice(5)) - 1]} '${k.slice(2, 4)}`,
      amount,
    }));
}

export default function SpendTrendChart({ entries, from, to }) {
  const [hovered, setHovered] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const start = from || (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); })();
  const end   = to || today;

  const buckets = bucketEntries(entries, start, end);

  if (buckets.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Spending trend
        </p>
        <p className="text-sm text-center py-8" style={{ color: "var(--ink-text-dim)" }}>No data for this period.</p>
      </div>
    );
  }

  const maxAmount  = Math.max(...buckets.map((b) => b.amount), 1);
  const labelStep  = Math.ceil(buckets.length / 8);
  const H          = 220;
  const BAR_W      = Math.max(24, Math.min(44, Math.floor(560 / buckets.length) - 6));
  const GAP        = 6;
  const LABEL_H    = 28;
  // Headroom above the tallest bar for its value label — without this, a
  // bar hitting 100% of maxAmount puts its label right at y=0, which the
  // card's `overflow: hidden` then clips off at the top.
  const TOP_PAD    = 18;
  const chartW     = buckets.length * (BAR_W + GAP);
  const gridLines  = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxAmount));
  const showValLabels = buckets.length <= 14;

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", overflow: "hidden" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Spending trend
        </p>
        {hovered && (
          <div
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{
              background:  "var(--ink-3)",
              border:      "1px solid var(--gold)",
              color:       "var(--ink-text)",
              fontFamily:  "var(--font-mono)",
            }}
          >
            <span style={{ color: "var(--gold)", fontWeight: 600 }}>{formatNaira(hovered.amount)}</span>
            <span style={{ color: "var(--ink-text-dim)", marginLeft: 8 }}>{fmtLabel(hovered.label)}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto" style={{ cursor: "default" }}>
        <div style={{ minWidth: Math.max(chartW + 52, 300), position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start" }}>

            {/* Y-axis labels */}
            <div style={{ width: 52, height: TOP_PAD + H + LABEL_H, position: "relative", flexShrink: 0 }}>
              {gridLines.map((val) => {
                const y = TOP_PAD + H - (val / maxAmount) * H;
                return (
                  <div key={val} style={{
                    position:   "absolute",
                    top:        y,
                    right:      6,
                    fontSize:   9,
                    color:      "var(--ink-text-dim)",
                    fontFamily: "var(--font-mono)",
                    transform:  "translateY(-50%)",
                    whiteSpace: "nowrap",
                  }}>
                    {formatNaira(val, { compact: true, decimals: 0 })}
                  </div>
                );
              })}
            </div>

            {/* SVG chart */}
            <svg
              width={chartW}
              height={TOP_PAD + H + LABEL_H}
              style={{ overflow: "visible" }}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Gridlines */}
              {gridLines.map((val) => {
                const y = TOP_PAD + H - (val / maxAmount) * H;
                return (
                  <line key={val} x1={0} y1={y} x2={chartW} y2={y}
                    stroke="var(--rule)" strokeWidth={1} />
                );
              })}

              {/* Bars */}
              {buckets.map((b, i) => {
                const barH   = Math.max(3, (b.amount / maxAmount) * H);
                const x      = i * (BAR_W + GAP);
                const y      = TOP_PAD + H - barH;
                const isHov  = hovered?.i === i;
                const showXLabel = i % labelStep === 0;

                return (
                  <g
                    key={i}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered({ i, label: b.label, amount: b.amount })}
                  >
                    {/* Invisible wider hit area */}
                    <rect x={x - 3} y={0} width={BAR_W + 6} height={TOP_PAD + H} fill="transparent" />

                    {/* Bar */}
                    <rect
                      x={x} y={y}
                      width={BAR_W} height={barH}
                      fill={isHov ? "var(--gold-deep)" : "var(--gold)"}
                      rx={4}
                      style={{ transition: "fill 0.1s" }}
                    />

                    {/* Value label above bar (when few bars) */}
                    {showValLabels && (
                      <text
                        x={x + BAR_W / 2} y={y - 5}
                        textAnchor="middle" fontSize={9}
                        fill={isHov ? "var(--gold)" : "var(--ink-text-dim)"}
                        fontFamily="var(--font-mono)"
                        style={{ transition: "fill 0.1s" }}
                      >
                        {formatNaira(b.amount, { compact: true, decimals: 0 })}
                      </text>
                    )}

                    {/* X-axis label */}
                    {showXLabel && (
                      <text
                        x={x + BAR_W / 2} y={TOP_PAD + H + 18}
                        textAnchor="middle" fontSize={9}
                        fill={isHov ? "var(--gold)" : "var(--ink-text-dim)"}
                        fontFamily="var(--font-mono)"
                        style={{ transition: "fill 0.1s" }}
                      >
                        {fmtLabel(b.label)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* SVG tooltip for hovered bar */}
              {hovered !== null && (() => {
                const i   = hovered.i;
                const x   = i * (BAR_W + GAP) + BAR_W / 2;
                const barH = Math.max(3, (hovered.amount / maxAmount) * H);
                const ty  = TOP_PAD + H - barH - 10;
                const TW  = 90;
                const tx  = Math.min(Math.max(x - TW / 2, 0), chartW - TW);
                return (
                  <g style={{ pointerEvents: "none" }}>
                    <rect x={tx} y={ty - 22} width={TW} height={20} rx={5}
                      fill="var(--ink)" stroke="var(--gold)" strokeWidth={1} opacity={0.95} />
                    <text x={tx + TW / 2} y={ty - 8}
                      textAnchor="middle" fontSize={10} fontWeight="bold"
                      fill="var(--gold)" fontFamily="var(--font-mono)">
                      {formatNaira(hovered.amount, { compact: true, decimals: 1 })}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", opacity: 0.6 }}>
        Hover over a bar for the exact amount
      </p>
    </div>
  );
}
