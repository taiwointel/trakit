"use client";

import { useState } from "react";
import { formatNaira, formatAmountInput, parseAmount, todayISO } from "@/lib/format";
import { closingBalance } from "@/lib/cashBalance";
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

  // If any entry carries a bank-reported balance_after (an OPay/Access
  // import — see lib/cashBalance.js), there's real ground truth to compute
  // from instead of guessing ₦0. closingBalance() already knows how to sum
  // every account's own latest known balance, so auto-calculate should
  // just read that off directly rather than reinventing a weaker version.
  const hasBankBalance = entries.some((e) => e.balance_after !== null && e.balance_after !== undefined);

  async function handleSave(e) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!date || isNaN(parsed)) return;
    setSaving(true);
    await onSave(date, parsed);
    setSaving(false);
  }

  async function handleAutoCalculate() {
    // Only offered when there's real bank-reported data to compute from
    // (see the button's own guard below) — sums every account's own
    // latest known balance as of today and anchors there. This is the
    // exact same math the app already uses live; auto-calculate just
    // saves it as the anchor so it's confirmed as the current baseline.
    //
    // There used to be a second path here for statements with no bank
    // balance data at all (PalmPay, generic CSV): assume ₦0 right before
    // the first logged entry. That's a guess, not a calculation, and it
    // produces a confidently wrong number the moment the real starting
    // balance wasn't actually zero. Removed. If there's no real number to
    // read, the user has to type their real one below. No auto path.
    if (!hasBankBalance) return;
    setAutoCalculating(true);
    const today = todayISO();
    const computed = closingBalance(entries, null, 0, today) ?? 0;
    setDate(today);
    setAmount(computed.toLocaleString("en-NG", { maximumFractionDigits: 2 }));
    await onSave(today, computed);
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
        <InfoTooltip text="This is your one real-world data point: what you actually had, on a specific date. From there the app adds and subtracts every entry you log to work out your balance on any day, live and automatically, with nothing to keep re-typing. Re-anchoring just moves that starting point forward; it never changes past entries." />
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

      {hasBankBalance && earliestDate && (
        <button
          type="button"
          onClick={handleAutoCalculate}
          disabled={autoCalculating}
          title="Sum every account's own latest bank-reported balance and anchor today to it."
          className="self-start px-4 py-2 rounded text-sm font-semibold whitespace-nowrap"
          style={{
            background: "var(--ink-3)",
            border:     "1px solid var(--gold)",
            color:      "var(--gold)",
            opacity:    autoCalculating ? 0.6 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          {autoCalculating ? "Calculating…" : "⚡ Auto-calculate from statements"}
        </button>
      )}

      {!hasBankBalance && earliestDate && (
        <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          No bank-reported balance found in your imports, so there is nothing to calculate automatically. Enter what you actually had below.
        </p>
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
