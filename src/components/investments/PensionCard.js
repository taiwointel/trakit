"use client";

import { useState, useMemo } from "react";
import { formatNaira, formatAmountInput, parseAmount, todayISO } from "@/lib/format";

export default function PensionCard({ inv, txns, onUpdate, onAddTxn, onDelete }) {
  const [newContrib,   setNewContrib]   = useState("");
  const [savingContrib, setSavingContrib] = useState(false);
  const [adjustAmt,    setAdjustAmt]    = useState("");
  const [adjustDir,    setAdjustDir]    = useState("+");
  const [savingAdj,    setSavingAdj]    = useState(false);
  const [paymentDate,  setPaymentDate]  = useState(inv.last_payment_date || "");
  const [savingDate,   setSavingDate]   = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(false);

  const balance      = Number(inv.balance || 0);
  const contribution = Number(inv.monthly_contribution || 0);

  const historyTxns = useMemo(
    () => [...txns]
      .filter((t) => t.type === "accrual" || t.type === "adjustment")
      .sort((a, b) => (b.month || b.date || "").localeCompare(a.month || a.date || ""))
      .slice(0, 12),
    [txns],
  );

  async function handleContribUpdate(e) {
    e.preventDefault();
    const val = parseAmount(newContrib);
    if (!val) return;
    setSavingContrib(true);
    await onUpdate(inv.id, { monthly_contribution: val });
    setNewContrib("");
    setSavingContrib(false);
  }

  async function handleAdjust(e) {
    e.preventDefault();
    const raw = parseAmount(adjustAmt);
    if (!raw) return;
    const amount = adjustDir === "+" ? raw : -raw;
    setSavingAdj(true);
    const newBal = balance + amount;
    await onUpdate(inv.id, { balance: newBal });
    await onAddTxn(inv.id, {
      date:   todayISO(),
      type:   "adjustment",
      amount,
      month:  new Date().toISOString().slice(0, 7) + " (adj)",
    });
    setAdjustAmt("");
    setSavingAdj(false);
  }

  async function handleDateSave(e) {
    e.preventDefault();
    setSavingDate(true);
    await onUpdate(inv.id, { last_payment_date: paymentDate || null });
    setSavingDate(false);
  }

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: "var(--paper)", border: "1px solid var(--rule-paper)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}>
            {inv.label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)" }}>
            Pension · {formatNaira(contribution)}/month
          </p>
        </div>
        <button
          onClick={() => confirmDel ? onDelete(inv.id) : setConfirmDel(true)}
          onBlur={() => setTimeout(() => setConfirmDel(false), 200)}
          className="text-xs"
          style={{ color: confirmDel ? "var(--red)" : "var(--paper-text-dim)" }}
        >
          {confirmDel ? "Delete?" : "✕"}
        </button>
      </div>

      {/* Balance display */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>Current balance</span>
          <span className="text-2xl font-bold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>
            {formatNaira(balance)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>Last accrued</span>
          <span className="text-sm font-semibold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>
            {inv.last_accrual_month || "—"}
          </span>
        </div>
      </div>

      {/* Contribution history */}
      {historyTxns.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
            Contribution history
          </p>
          {historyTxns.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 py-1 border-t text-xs"
              style={{ borderColor: "var(--rule-paper)" }}
            >
              <span style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)", minWidth: 80 }}>
                {t.month || t.date}
              </span>
              <span
                className="px-1.5 py-0.5 rounded uppercase font-semibold"
                style={{
                  background: t.type === "accrual" ? "var(--green-soft)" : "var(--amber-soft)",
                  color:      t.type === "accrual" ? "var(--green)"      : "var(--amber)",
                }}
              >
                {t.type}
              </span>
              <span
                className="ml-auto font-semibold"
                style={{ color: Number(t.amount) >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}
              >
                {Number(t.amount) >= 0 ? "+" : ""}{formatNaira(Math.abs(t.amount))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Edit contribution */}
      <form onSubmit={handleContribUpdate} className="flex gap-2 items-center border-t pt-3" style={{ borderColor: "var(--rule-paper)" }}>
        <label className="text-xs shrink-0" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
          Monthly contribution:
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={newContrib}
          onChange={(e) => setNewContrib(formatAmountInput(e.target.value))}
          placeholder={formatNaira(contribution)}
          className="px-2 py-1.5 rounded text-xs outline-none w-36"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      "var(--paper-text)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          type="submit"
          disabled={savingContrib}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: "var(--gold)", color: "#fff", opacity: savingContrib ? 0.6 : 1 }}
        >
          {savingContrib ? "…" : "Update"}
        </button>
      </form>

      {/* Adjust balance */}
      <form onSubmit={handleAdjust} className="flex gap-2 items-center flex-wrap border-t pt-3" style={{ borderColor: "var(--rule-paper)" }}>
        <label className="text-xs shrink-0" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
          Adjust balance:
        </label>
        <select
          value={adjustDir}
          onChange={(e) => setAdjustDir(e.target.value)}
          className="px-2 py-1.5 rounded text-xs outline-none"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      adjustDir === "+" ? "var(--green)" : "var(--red)",
            fontFamily: "var(--font-mono)",
            width:      40,
          }}
        >
          <option value="+">+</option>
          <option value="-">−</option>
        </select>
        <input
          type="text"
          inputMode="decimal"
          value={adjustAmt}
          onChange={(e) => setAdjustAmt(formatAmountInput(e.target.value))}
          placeholder="Amount"
          className="px-2 py-1.5 rounded text-xs outline-none w-36"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      "var(--paper-text)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          type="submit"
          disabled={savingAdj}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", opacity: savingAdj ? 0.6 : 1 }}
        >
          {savingAdj ? "…" : "Apply"}
        </button>
      </form>

      {/* Last payment date (informational) */}
      <form onSubmit={handleDateSave} className="flex gap-2 items-center border-t pt-3" style={{ borderColor: "var(--rule-paper)" }}>
        <label className="text-xs shrink-0" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
          Last payment date:
        </label>
        <input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
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
          disabled={savingDate}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", opacity: savingDate ? 0.6 : 1 }}
        >
          {savingDate ? "…" : "Save"}
        </button>
        <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
          (informational only)
        </span>
      </form>
    </div>
  );
}
