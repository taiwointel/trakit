"use client";

import { useState, useMemo } from "react";
import { formatNaira, formatAmountInput, parseAmount, todayISO } from "@/lib/format";
import { balanceNetValue } from "@/lib/investments";

export default function BalanceCard({ inv, txns, onAddTxn, onUpdate, onDelete }) {
  const [txnType,    setTxnType]    = useState("deposit");
  const [txnAmount,  setTxnAmount]  = useState("");
  const [txnDate,    setTxnDate]    = useState(todayISO());
  const [adding,     setAdding]     = useState(false);
  const [markInput,  setMarkInput]  = useState(inv.mark_value ? String(inv.mark_value) : "");
  const [confirmDel, setConfirmDel] = useState(false);

  const netContributions = useMemo(() => balanceNetValue(txns), [txns]);
  const currentValue     = (inv.type === "Equities" && inv.mark_value)
    ? Number(inv.mark_value)
    : netContributions;
  const gainLoss         = (inv.type === "Equities" && inv.mark_value)
    ? Number(inv.mark_value) - netContributions
    : null;

  const recentTxns = [...txns].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);

  async function handleAddTxn(e) {
    e.preventDefault();
    const amt = parseAmount(txnAmount);
    if (amt <= 0) return;
    setAdding(true);
    await onAddTxn(inv.id, { type: txnType, amount: amt, date: txnDate });
    setTxnAmount("");
    setAdding(false);
  }

  async function handleSetMark(e) {
    e.preventDefault();
    const val = parseAmount(markInput) || null;
    await onUpdate(inv.id, { mark_value: val });
  }

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
          <p className="text-xs mt-0.5" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
            {inv.type}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>
            {formatNaira(currentValue)}
          </span>
          {gainLoss !== null && (
            <span
              className="text-xs font-semibold"
              style={{ color: gainLoss >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}
            >
              {gainLoss >= 0 ? "+" : ""}{formatNaira(gainLoss)} gain/loss
            </span>
          )}
          <button
            onClick={() => confirmDel ? onDelete(inv.id) : setConfirmDel(true)}
            onBlur={() => setTimeout(() => setConfirmDel(false), 200)}
            className="text-xs"
            style={{ color: confirmDel ? "var(--red)" : "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            {confirmDel ? "Delete?" : "✕"}
          </button>
        </div>
      </div>

      {/* Transaction log */}
      {recentTxns.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {recentTxns.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 py-1 border-t text-xs"
              style={{ borderColor: "var(--rule-paper)" }}
            >
              <span style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)", minWidth: 72 }}>{t.date}</span>
              <span
                className="px-1.5 py-0.5 rounded uppercase font-semibold text-xs"
                style={{
                  background: t.type === "deposit" ? "var(--green-soft)" : "var(--red-soft)",
                  color:      t.type === "deposit" ? "var(--green)"      : "var(--red)",
                }}
              >
                {t.type}
              </span>
              <span
                className="ml-auto font-semibold"
                style={{ color: t.type === "deposit" ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}
              >
                {t.type === "deposit" ? "+" : "−"}{formatNaira(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add transaction */}
      <form onSubmit={handleAddTxn} className="flex gap-2 items-center flex-wrap">
        <select
          value={txnType}
          onChange={(e) => setTxnType(e.target.value)}
          className="px-2 py-1.5 rounded text-xs outline-none"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      txnType === "deposit" ? "var(--green)" : "var(--red)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
        </select>
        <input
          type="text"
          inputMode="decimal"
          value={txnAmount}
          onChange={(e) => setTxnAmount(formatAmountInput(e.target.value))}
          placeholder="₦ Amount"
          className="px-2 py-1.5 rounded text-xs outline-none w-32"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      "var(--paper-text)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <input
          type="date"
          value={txnDate}
          onChange={(e) => setTxnDate(e.target.value)}
          className="px-2 py-1.5 rounded text-xs outline-none"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      "var(--paper-text)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          type="submit"
          disabled={adding}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: "var(--gold)", color: "#fff", opacity: adding ? 0.6 : 1 }}
        >
          {adding ? "…" : "Log"}
        </button>
      </form>

      {/* Equities: set current market value */}
      {inv.type === "Equities" && (
        <form onSubmit={handleSetMark} className="flex gap-2 items-center border-t pt-3" style={{ borderColor: "var(--rule-paper)" }}>
          <label className="text-xs shrink-0" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
            Current market value (₦):
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={markInput}
            onChange={(e) => setMarkInput(formatAmountInput(e.target.value))}
            placeholder="mark-to-market"
            className="px-2 py-1.5 rounded text-xs outline-none flex-1"
            style={{
              background: "var(--paper-2)",
              border:     "1px solid var(--blue-accent)",
              color:      "var(--paper-text)",
              fontFamily: "var(--font-mono)",
            }}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: "var(--blue-accent)", color: "#fff" }}
          >
            Set
          </button>
        </form>
      )}
    </div>
  );
}
