"use client";

import { useState } from "react";
import { formatNaira, formatAmountInput, parseAmount, todayISO } from "@/lib/format";
import InfoTooltip from "@/components/InfoTooltip";

export default function CashSetup({ anchor, onSave, entries = [] }) {
  const hasAnchor = !!anchor.anchor_date;

  const [date,   setDate]   = useState(anchor.anchor_date || todayISO());
  const [amount, setAmount] = useState(
    anchor.anchor_amount ? Number(anchor.anchor_amount).toLocaleString("en-NG", { maximumFractionDigits: 2 }) : "",
  );
  const [saving, setSaving] = useState(false);
  const [autoCalculating, setAutoCalculating] = useState(false);

  const earliestDate = entries.reduce(
    (min, e) => (e.date && (!min || e.date < min) ? e.date : min),
    null,
  );

  async function handleSave(e) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!date || isNaN(parsed)) return;
    setSaving(true);
    await onSave(date, parsed);
    setSaving(false);
  }

  // No number to remember or guess at: anchor to your very first logged
  // entry's date at ₦0 (opening balance for that day, before its own
  // entries land), and every day from there — including that first day
  // itself — is 100% computed from what you've actually logged.
  async function handleAutoCalculate() {
    if (!earliestDate) return;
    setAutoCalculating(true);
    setDate(earliestDate);
    setAmount("0.00");
    await onSave(earliestDate, 0);
    setAutoCalculating(false);
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
        <InfoTooltip text="This is your one real-world data point: what you actually had, on a specific date. From there the app adds/subtracts every entry you log to work out your balance on any day — live, automatically, with nothing to keep re-typing. Re-anchoring just moves that starting point forward; it never changes past entries." />
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

      {earliestDate && (
        <div
          className="rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: "rgba(169,133,79,0.08)", border: "1px solid rgba(169,133,79,0.25)" }}
        >
          <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", lineHeight: 1.6, flex: 1, minWidth: 200 }}>
            Not sure what your real balance was? This assumes you had <strong style={{ color: "var(--ink-text)" }}>₦0</strong> right before your first logged entry ({earliestDate}) and tracks every naira in or out from there — quick, but only accurate if that ₦0 assumption is actually true. If you had real savings before you started logging, use the form below with today&apos;s real balance instead.
          </p>
          <button
            type="button"
            onClick={handleAutoCalculate}
            disabled={autoCalculating}
            className="px-4 py-2 rounded text-sm font-semibold whitespace-nowrap"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--gold)",
              color:      "var(--gold)",
              opacity:    autoCalculating ? 0.6 : 1,
              fontFamily: "var(--font-sans)",
            }}
          >
            {autoCalculating ? "Calculating…" : "⚡ Auto-calculate"}
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            {hasAnchor ? "Re-anchor: as of date" : "The date you're sure about"}
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
            What you actually had (₦)
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
          Re-anchoring just moves the starting point. Your past entries are not changed.
        </p>
      )}
    </div>
  );
}
