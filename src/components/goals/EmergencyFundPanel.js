"use client";

import { useState } from "react";
import { formatNaira, formatAmountInput, parseAmount, todayISO } from "@/lib/format";
import InfoTooltip from "@/components/InfoTooltip";

export default function EmergencyFundPanel({
  transactions,
  balance,
  target,
  overrideTarget,
  onAdd,
  onSetOverride,
}) {
  const [type,           setType]           = useState("deposit");
  const [amount,         setAmount]         = useState("");
  const [date,           setDate]           = useState(todayISO());
  const [note,           setNote]           = useState("");
  const [overrideInput,  setOverrideInput]  = useState(
    overrideTarget ? overrideTarget.toLocaleString("en-NG", { maximumFractionDigits: 0 }) : "",
  );
  const [savingOverride, setSavingOverride] = useState(false);
  const [adding,         setAdding]         = useState(false);

  const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
  const met = target > 0 && balance >= target;

  async function handleAdd(e) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (parsed <= 0) return;
    setAdding(true);
    await onAdd({ type, amount: parsed, date, note: note.trim() || null });
    setAmount(""); setNote("");
    setAdding(false);
  }

  async function handleOverride(e) {
    e.preventDefault();
    setSavingOverride(true);
    const val = parseAmount(overrideInput) || null;
    await onSetOverride(val);
    setSavingOverride(false);
  }

  const barColor = met ? "var(--blue-accent)" : pct > 50 ? "var(--amber)" : "var(--red)";

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--blue-accent)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5"
        style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}
      >
        Emergency Fund
        <InfoTooltip text="This is your safety net: a separate pot of cash for genuine emergencies like a job loss or medical bill. It's tracked independently from your regular cash balance. The default target is 6 times what you spent on essentials this month (e.g. if you spent ₦150k on rent, food, and transport, the target becomes ₦900k)." />
      </p>

      {met && (
        <div
          className="rounded px-3 py-2 flex items-center gap-2"
          style={{ background: "rgba(91,143,168,0.12)", borderLeft: "3px solid var(--blue-accent)" }}
        >
          <span>🎉</span>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}
          >
            Emergency fund fully funded!
          </span>
        </div>
      )}

      {/* Balance + progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
          >
            {formatNaira(balance)}
          </span>
          <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
            target: {target > 0 ? formatNaira(target) : "—"}
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 8, background: "var(--ink-3)" }}
        >
          <div
            style={{
              width:        `${pct}%`,
              height:       "100%",
              background:   barColor,
              borderRadius: 4,
              transition:   "width 0.4s",
            }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          {pct.toFixed(1)}% funded
          {target > 0
            ? `. Target: ${overrideTarget ? "manual override" : "6x this month's essential spend"}`
            : ". Log essential spend this month and the target will auto-calculate"}
        </p>
      </div>

      {/* Add lodgement form */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-2 py-2 rounded text-sm outline-none"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      type === "deposit" ? "var(--green)" : "var(--red)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Amount (₦)</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            placeholder="0"
            className="px-3 py-2 rounded text-sm outline-none w-36"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      "var(--ink-text)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Date</label>
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

        <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 120 }}>
          <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note…"
            className="px-3 py-2 rounded text-sm outline-none"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      "var(--ink-text)",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={adding}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{
            background: "var(--blue-accent)",
            color:      "#fff",
            opacity:    adding ? 0.6 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          {adding ? "…" : "Log"}
        </button>
      </form>

      {/* Transaction log */}
      {transactions.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            Lodgement log
          </p>
          {transactions.slice(0, 12).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 py-1.5 border-t text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", minWidth: 80 }}>
                {t.date}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded uppercase font-semibold"
                style={{
                  background: t.type === "deposit" ? "var(--green-soft)" : "var(--red-soft)",
                  color:      t.type === "deposit" ? "var(--green)"      : "var(--red)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {t.type}
              </span>
              {t.note && (
                <span
                  className="flex-1 text-xs truncate"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
                >
                  {t.note}
                </span>
              )}
              <span
                className="font-semibold ml-auto"
                style={{
                  color:      t.type === "deposit" ? "var(--green)" : "var(--red)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {t.type === "deposit" ? "+" : "−"}{formatNaira(t.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          No lodgements yet. Log your first deposit above.
        </p>
      )}

      {/* Custom target override */}
      <form
        onSubmit={handleOverride}
        className="flex gap-2 items-end pt-3 border-t"
        style={{ borderColor: "var(--rule)" }}
      >
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            Override target (leave blank to use 6 × essential spend)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={overrideInput}
            onChange={(e) => setOverrideInput(formatAmountInput(e.target.value))}
            placeholder="Custom target amount"
            className="px-3 py-2 rounded text-sm outline-none"
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
          disabled={savingOverride}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{
            background: "var(--ink-3)",
            border:     "1px solid var(--rule)",
            color:      "var(--ink-text)",
            opacity:    savingOverride ? 0.6 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          {savingOverride ? "…" : "Set"}
        </button>
      </form>
    </div>
  );
}
