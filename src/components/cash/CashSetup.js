"use client";

import { useState } from "react";
import { formatNaira, formatAmountInput, parseAmount, todayISO } from "@/lib/format";
import InfoTooltip from "@/components/InfoTooltip";

export default function CashSetup({ anchor, onSave }) {
  const hasAnchor = !!anchor.anchor_date;

  const [date,   setDate]   = useState(anchor.anchor_date || todayISO());
  const [amount, setAmount] = useState(
    anchor.anchor_amount ? Number(anchor.anchor_amount).toLocaleString("en-NG", { maximumFractionDigits: 2 }) : "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!date || isNaN(parsed)) return;
    setSaving(true);
    await onSave(date, parsed);
    setSaving(false);
  }

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5"
        style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
      >
        Cash balance
        <InfoTooltip text="There's no stored running balance — every day's balance is computed fresh from this anchor point plus every ledger entry from that date forward. Re-anchoring just moves the reference point; it never edits or deletes past entries." />
      </p>

      {hasAnchor && (
        <div className="flex items-baseline gap-3">
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
          >
            {formatNaira(anchor.anchor_amount)}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            anchor as of {anchor.anchor_date}
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            {hasAnchor ? "Re-anchor: as of date" : "As of date"}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-2 py-2 rounded text-sm outline-none"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      "var(--ink-text)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            I had (₦)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            placeholder="0.00"
            className="px-3 py-2 rounded text-sm outline-none w-44"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      "var(--ink-text)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{
            background: "var(--gold)",
            color:      "#fff",
            opacity:    saving ? 0.6 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          {saving ? "Saving…" : hasAnchor ? "Re-anchor" : "Set opening balance"}
        </button>
      </form>

      {hasAnchor && (
        <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", opacity: 0.7 }}>
          Re-anchoring moves the reference point only — it never rewrites your ledger entries.
        </p>
      )}
    </div>
  );
}
