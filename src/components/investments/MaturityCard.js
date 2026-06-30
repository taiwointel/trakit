"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/format";
import { maturityCalc } from "@/lib/investments";

export default function MaturityCard({ inv, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const calc = maturityCalc(inv);
  const { price, expectedReturn, maturityValue, maturityDate, daysToMaturity, elapsedPct, status } = calc;

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{ background: "var(--paper)", border: "1px solid var(--rule-paper)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}>
            {inv.label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)" }}>
            {inv.type} · {inv.rate}% p.a. · {inv.tenor_days}d
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
            style={{
              background: status === "Matured" ? "var(--green-soft)" : "var(--amber-soft)",
              color:      status === "Matured" ? "var(--green)"      : "var(--amber)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {status}
          </span>
          <button
            onClick={() => confirmDelete ? onDelete(inv.id) : setConfirmDelete(true)}
            onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}
            className="text-xs"
            style={{ color: confirmDelete ? "var(--red)" : "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            {confirmDelete ? "Delete?" : "✕"}
          </button>
        </div>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Price paid",       val: price         },
          { label: "Expected return",  val: expectedReturn },
          { label: "Maturity value",   val: maturityValue  },
          { label: "Days to maturity", val: null, raw: status === "Matured" ? "Matured" : `${daysToMaturity}d (${maturityDate})` },
        ].map(({ label, val, raw }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
              {label}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>
              {raw || formatNaira(val)}
            </span>
          </div>
        ))}
      </div>

      {/* Tenor progress bar */}
      <div className="flex flex-col gap-1">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 6, background: "var(--paper-3)" }}
        >
          <div
            style={{
              width:        `${elapsedPct}%`,
              height:       "100%",
              background:   "linear-gradient(90deg, var(--gold-deep), var(--gold))",
              borderRadius: 3,
              transition:   "width 0.4s",
            }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)" }}>
          {elapsedPct}% of tenor elapsed · purchased {inv.purchase_date}
        </p>
      </div>
    </div>
  );
}
