"use client";

import { useEffect, useState } from "react";

function fmt(n) {
  if (!n || isNaN(n)) return "—";
  return "₦" + Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export default function FXWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (!loading && !data) return null;

  const pairs = [
    { label: "USD", value: data?.usdNgn },
    { label: "EUR", value: data?.eurNgn },
    { label: "GBP", value: data?.gbpNgn },
  ];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
        💱
      </span>
      {loading ? (
        <div className="flex gap-4">
          {[60, 60, 60].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded animate-pulse"
              style={{ width: w, background: "var(--ink-3)" }}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          {pairs.map((p, i, arr) => (
            <span key={p.label} className="flex items-center gap-1.5">
              <span
                className="text-xs"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                {p.label}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
              >
                {fmt(p.value)}
              </span>
              {i < arr.length - 1 && (
                <span style={{ color: "var(--rule)", marginLeft: 2 }}>·</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
