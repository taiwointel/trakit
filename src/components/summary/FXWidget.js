"use client";

import { useEffect, useState } from "react";

function formatRate(n) {
  if (!n || isNaN(n)) return "—";
  return "₦" + Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export default function FXWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); }
        else         { setData(d); }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const pairs = [
    { label: "USD/NGN", value: data?.usdNgn },
    { label: "EUR/NGN", value: data?.eurNgn },
    { label: "GBP/NGN", value: data?.gbpNgn },
  ];

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <div className="grid grid-cols-3 gap-2">
        {loading
          ? pairs.map((p) => (
              <div key={p.label} className="flex flex-col gap-1">
                <span
                  className="text-xs"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
                >
                  {p.label}
                </span>
                <div
                  className="h-4 rounded animate-pulse"
                  style={{ background: "var(--ink-3)", width: "70%" }}
                />
              </div>
            ))
          : error
          ? (
              <div className="col-span-3">
                <span
                  className="text-xs"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
                >
                  Rates unavailable
                </span>
              </div>
            )
          : pairs.map((p) => (
              <div key={p.label} className="flex flex-col gap-0.5">
                <span
                  className="text-xs"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
                >
                  {p.label}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
                >
                  {formatRate(p.value)}
                </span>
              </div>
            ))
        }
      </div>
      <p
        className="text-xs"
        style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
      >
        Source: open.er-api.com · official rate
      </p>
    </div>
  );
}
