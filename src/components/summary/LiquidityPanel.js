"use client";

import { formatNaira } from "@/lib/format";
import { liquidityVerdict } from "@/lib/cashBalance";

function BalanceSparkline({ rows }) {
  if (!rows || rows.length < 2) return null;
  const values   = rows.map((r) => r.closing);
  const min      = Math.min(...values);
  const max      = Math.max(...values);
  const range    = max - min || 1;
  const W = 200, H = 40, pad = 4;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GaugeBar({ months }) {
  const MAX   = 9;
  const marks = [0, 3, 6, 9];
  const pct   = months !== null ? Math.min((months / MAX) * 100, 100) : 0;

  const { color } = liquidityVerdict(months);

  return (
    <div className="flex flex-col gap-1">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 8, background: "var(--ink-3)" }}
      >
        <div
          style={{
            width:        `${pct}%`,
            height:       "100%",
            background:   color,
            borderRadius: 4,
            transition:   "width 0.4s",
          }}
        />
      </div>
      <div className="flex justify-between">
        {marks.map((m) => (
          <span
            key={m}
            className="text-[10px]"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
          >
            {m}mo
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LiquidityPanel({ balance, avgMonthlyEssential, months, sparkRows }) {
  const { label, color } = liquidityVerdict(months);

  const stats = [
    { label: "Cash now",              value: balance !== null ? formatNaira(balance) : "—" },
    { label: "Avg monthly essentials", value: avgMonthlyEssential ? formatNaira(avgMonthlyEssential) : "—" },
    { label: "Liquidity coverage",    value: months !== null ? `${months.toFixed(1)} mo` : "—", color },
  ];

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
      >
        Cash & Liquidity
      </p>

      {/* Three-stat row */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <span
              className="text-[11px] uppercase tracking-wide"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              {s.label}
            </span>
            <span
              className="text-base font-semibold"
              style={{ color: s.color || "var(--ink-text)", fontFamily: "var(--font-mono)" }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Gauge */}
      <GaugeBar months={months} />

      {/* Verdict */}
      <p
        className="text-sm"
        style={{ color, fontFamily: "var(--font-sans)" }}
      >
        {label}
        {months !== null && ` — ${months.toFixed(1)} months of essential spend covered.`}
      </p>

      {/* 30-day sparkline */}
      {sparkRows && sparkRows.length > 1 && (
        <div>
          <p className="text-[10px] mb-1" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            30-day balance trend
          </p>
          <BalanceSparkline rows={sparkRows} />
        </div>
      )}
    </div>
  );
}
