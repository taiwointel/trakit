"use client";

import { formatNaira } from "@/lib/format";

function bucketEntries(entries, from, to) {
  const fromDate = new Date(from + "T00:00:00");
  const toDate   = new Date(to   + "T00:00:00");
  const days     = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

  const outEntries = entries.filter((e) => e.flow === "out" && e.date >= from && e.date <= to);

  if (days <= 21) {
    // Daily
    const map = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate); d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      map[iso] = 0;
    }
    for (const e of outEntries) map[e.date] = (map[e.date] || 0) + Number(e.amount);
    return Object.entries(map).map(([label, amount]) => ({ label: label.slice(5), amount }));
  }

  if (days <= 98) {
    // Weekly (Mon-based)
    const map = {};
    for (const e of outEntries) {
      const d = new Date(e.date + "T00:00:00");
      const dow = (d.getDay() + 6) % 7; // 0=Mon
      const mon = new Date(d); mon.setDate(d.getDate() - dow);
      const key = mon.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + Number(e.amount);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      .map(([label, amount]) => ({ label: label.slice(5), amount }));
  }

  // Monthly
  const map = {};
  for (const e of outEntries) {
    const key = e.date.slice(0, 7);
    map[key] = (map[key] || 0) + Number(e.amount);
  }
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    .map(([label, amount]) => ({
      label:  `${months[parseInt(label.slice(5)) - 1]} '${label.slice(2, 4)}`,
      amount,
    }));
}

export default function SpendTrendChart({ entries, from, to }) {
  const today = new Date().toISOString().slice(0, 10);
  const start = from || (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); })();
  const end   = to   || today;

  const buckets = bucketEntries(entries, start, end);
  if (buckets.length === 0) {
    return (
      <div className="rounded-lg p-4" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Spending trend</p>
        <p className="text-sm text-center py-6" style={{ color: "var(--ink-text-dim)" }}>No data for this period.</p>
      </div>
    );
  }

  const maxAmount = Math.max(...buckets.map((b) => b.amount), 1);
  const showLabels = buckets.length <= 14;

  // Thin labels to max ~8
  const labelStep = Math.ceil(buckets.length / 8);
  const H = 140, BAR_W = 28, GAP = 6;
  const chartW = buckets.length * (BAR_W + GAP);

  // Gridline values
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxAmount));

  return (
    <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
        Spending trend
      </p>

      <div className="overflow-x-auto">
        <div style={{ minWidth: chartW + 48, position: "relative" }}>
          {/* Y-axis labels + gridlines */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {/* Y labels */}
            <div style={{ width: 44, height: H + 20, position: "relative", flexShrink: 0 }}>
              {gridLines.map((val) => {
                const y = H - (val / maxAmount) * H;
                return (
                  <div
                    key={val}
                    style={{
                      position:  "absolute",
                      top:       y,
                      right:     4,
                      fontSize:  9,
                      color:     "var(--ink-text-dim)",
                      fontFamily:"var(--font-mono)",
                      transform: "translateY(-50%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatNaira(val, { compact: true, decimals: 0 })}
                  </div>
                );
              })}
            </div>

            {/* Chart area */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <svg width={chartW} height={H + 20} style={{ overflow: "visible" }}>
                {/* Gridlines */}
                {gridLines.map((val) => {
                  const y = H - (val / maxAmount) * H;
                  return (
                    <line
                      key={val}
                      x1={0} y1={y}
                      x2={chartW} y2={y}
                      stroke="var(--rule)"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* Bars */}
                {buckets.map((b, i) => {
                  const barH = Math.max(2, (b.amount / maxAmount) * H);
                  const x    = i * (BAR_W + GAP);
                  const y    = H - barH;
                  const showLabel = i % labelStep === 0;

                  return (
                    <g key={i}>
                      <rect
                        x={x} y={y}
                        width={BAR_W} height={barH}
                        fill="var(--gold)"
                        rx={3}
                      />
                      {showLabels && (
                        <text
                          x={x + BAR_W / 2} y={y - 4}
                          textAnchor="middle"
                          fontSize={8}
                          fill="var(--ink-text-dim)"
                          fontFamily="var(--font-mono)"
                        >
                          {formatNaira(b.amount, { compact: true, decimals: 0 })}
                        </text>
                      )}
                      {showLabel && (
                        <text
                          x={x + BAR_W / 2} y={H + 14}
                          textAnchor="middle"
                          fontSize={9}
                          fill="var(--ink-text-dim)"
                          fontFamily="var(--font-mono)"
                        >
                          {b.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
