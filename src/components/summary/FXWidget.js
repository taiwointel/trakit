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
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !data) return null;

  const pairs = [
    { label: "USD", value: data?.usdNgn },
    { label: "EUR", value: data?.eurNgn },
    { label: "GBP", value: data?.gbpNgn },
  ];

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 12px", borderRadius: 10,
        background: "var(--ink-2)", border: "1px solid var(--rule)",
      }}
    >
      <span style={{ fontSize: 13 }}>💱</span>
      {loading ? (
        <div style={{ display: "flex", gap: 16 }}>
          {[64, 64, 64].map((w, i) => (
            <div key={i} style={{ width: w, height: 12, borderRadius: 4, background: "var(--ink-3)", opacity: 0.6 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {pairs.map((p, i, arr) => (
            <span key={p.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                {p.label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>
                {fmt(p.value)}
              </span>
              {i < arr.length - 1 && (
                <span style={{ color: "var(--rule)", marginLeft: 2, fontSize: 10 }}>·</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
