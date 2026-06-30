"use client";

import { useState, useMemo } from "react";
import { formatNaira, formatAmountInput, parseAmount } from "@/lib/format";
import { lifeAssuranceCoverage, monthRange } from "@/lib/investments";

export default function LifeAssuranceCard({ inv, txns, onAddTxn, onBulkAddTxn, onUpdate, onDelete }) {
  const [singleMonth,  setSingleMonth]  = useState("");
  const [singleStatus, setSingleStatus] = useState("paid");
  const [singleAmount, setSingleAmount] = useState("");
  const [loggingSingle, setLoggingSingle] = useState(false);

  const [batchOpen,   setBatchOpen]   = useState(false);
  const [batchFrom,   setBatchFrom]   = useState("");
  const [batchTo,     setBatchTo]     = useState("");
  const [batchStatus, setBatchStatus] = useState("paid");
  const [batchAmount, setBatchAmount] = useState("");
  const [loggingBatch, setLoggingBatch] = useState(false);

  const [newPremium,   setNewPremium]   = useState("");
  const [savingPremium, setSavingPremium] = useState(false);

  const [confirmDel, setConfirmDel] = useState(false);

  const coverage = useMemo(() => lifeAssuranceCoverage(inv, txns), [inv, txns]);
  const { monthsSinceStart, paidCount, coveragePct, arrearsMonths, arrearsAmount } = coverage;

  const premium     = Number(inv.monthly_premium) || 0;
  const paidBalance = txns.filter((t) => t.type === "paid").reduce((s, t) => s + Number(t.amount), 0);

  const greenPct = monthsSinceStart > 0 ? (paidCount / monthsSinceStart) * 100 : 0;
  const redPct   = monthsSinceStart > 0 ? (arrearsMonths / monthsSinceStart) * 100 : 0;

  const statusLabel  = arrearsMonths === 0 ? "✓ Up to date" : `⚠ ${arrearsMonths} month${arrearsMonths !== 1 ? "s" : ""} overdue`;
  const statusColor  = arrearsMonths === 0 ? "var(--green)" : "var(--red)";
  const statusBg     = arrearsMonths === 0 ? "var(--green-soft)" : "var(--red-soft)";

  const recentTxns = [...txns]
    .filter((t) => t.type === "paid" || t.type === "missed")
    .sort((a, b) => (b.month || "").localeCompare(a.month || ""))
    .slice(0, 8);

  async function handleSingleLog(e) {
    e.preventDefault();
    if (!singleMonth) return;
    setLoggingSingle(true);
    const amt = parseAmount(singleAmount) || premium;
    await onAddTxn(inv.id, {
      month:  singleMonth,
      date:   singleMonth + "-01",
      type:   singleStatus,
      amount: amt,
    });
    setSingleMonth(""); setSingleAmount("");
    setLoggingSingle(false);
  }

  async function handleBatchLog(e) {
    e.preventDefault();
    if (!batchFrom || !batchTo || batchFrom > batchTo) return;
    setLoggingBatch(true);
    const months = monthRange(batchFrom, batchTo);
    const amt    = parseAmount(batchAmount) || premium;
    const rows   = months.map((m) => ({
      month:  m,
      date:   m + "-01",
      type:   batchStatus,
      amount: amt,
    }));
    await onBulkAddTxn(inv.id, rows);
    setBatchFrom(""); setBatchTo("");
    setLoggingBatch(false);
    setBatchOpen(false);
  }

  async function handlePremiumUpdate(e) {
    e.preventDefault();
    const val = parseAmount(newPremium);
    if (!val) return;
    setSavingPremium(true);
    await onUpdate(inv.id, { monthly_premium: val });
    setNewPremium("");
    setSavingPremium(false);
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
            Life Assurance · {formatNaira(premium)}/month · since {inv.start_date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ background: statusBg, color: statusColor, fontFamily: "var(--font-sans)" }}
          >
            {statusLabel}
          </span>
          <button
            onClick={() => confirmDel ? onDelete(inv.id) : setConfirmDel(true)}
            onBlur={() => setTimeout(() => setConfirmDel(false), 200)}
            className="text-xs"
            style={{ color: confirmDel ? "var(--red)" : "var(--paper-text-dim)" }}
          >
            {confirmDel ? "Delete?" : "✕"}
          </button>
        </div>
      </div>

      {/* Segmented two-color progress bar */}
      <div className="flex flex-col gap-1.5">
        <div
          className="flex rounded-full overflow-hidden"
          style={{ height: 10, background: "var(--paper-3)" }}
        >
          <div style={{ width: `${greenPct}%`, background: "var(--green)", transition: "width 0.4s" }} />
          <div style={{ width: `${redPct}%`,   background: "var(--red)",   transition: "width 0.4s" }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
            {paidCount} of {monthsSinceStart} months paid ({coveragePct.toFixed(1)}%)
          </span>
          {arrearsMonths === 0 ? (
            <span className="text-xs font-bold" style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>
              Fully covered
            </span>
          ) : (
            <span className="text-xs font-bold" style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
              {formatNaira(arrearsAmount)} overdue
            </span>
          )}
        </div>
      </div>

      {/* Stat row */}
      <div className="flex gap-6 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>Paid balance</span>
          <span className="text-sm font-semibold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>
            {formatNaira(paidBalance)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>Months in arrears</span>
          <span className="text-sm font-semibold" style={{ color: arrearsMonths > 0 ? "var(--red)" : "var(--green)", fontFamily: "var(--font-mono)" }}>
            {arrearsMonths}
          </span>
        </div>
      </div>

      {/* Payment log */}
      {recentTxns.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
            Payment log
          </p>
          {recentTxns.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 py-1 border-t text-xs"
              style={{ borderColor: "var(--rule-paper)" }}
            >
              <span style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)", minWidth: 64 }}>{t.month}</span>
              <span
                className="px-1.5 py-0.5 rounded uppercase font-semibold"
                style={{
                  background: t.type === "paid" ? "var(--green-soft)" : "var(--red-soft)",
                  color:      t.type === "paid" ? "var(--green)"      : "var(--red)",
                }}
              >
                {t.type}
              </span>
              <span className="ml-auto" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>
                {formatNaira(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Single-month logger */}
      <form onSubmit={handleSingleLog} className="flex flex-wrap gap-2 items-end border-t pt-3" style={{ borderColor: "var(--rule-paper)" }}>
        <p className="w-full text-xs font-semibold" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
          Log a month
        </p>
        <input
          type="month"
          value={singleMonth}
          onChange={(e) => setSingleMonth(e.target.value)}
          required
          className="px-2 py-1.5 rounded text-xs outline-none"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      "var(--paper-text)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <select
          value={singleStatus}
          onChange={(e) => setSingleStatus(e.target.value)}
          className="px-2 py-1.5 rounded text-xs outline-none"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      singleStatus === "paid" ? "var(--green)" : "var(--red)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <option value="paid">Paid</option>
          <option value="missed">Missed</option>
        </select>
        <input
          type="text"
          inputMode="decimal"
          value={singleAmount}
          onChange={(e) => setSingleAmount(formatAmountInput(e.target.value))}
          placeholder={`₦${premium.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}
          className="px-2 py-1.5 rounded text-xs outline-none w-32"
          style={{
            background: "var(--paper-2)",
            border:     "1px solid var(--rule-paper)",
            color:      "var(--paper-text)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          type="submit"
          disabled={loggingSingle}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: "var(--gold)", color: "#fff", opacity: loggingSingle ? 0.6 : 1 }}
        >
          {loggingSingle ? "…" : "Log"}
        </button>
      </form>

      {/* Batch logger toggle */}
      <div className="border-t pt-3" style={{ borderColor: "var(--rule-paper)" }}>
        <button
          onClick={() => setBatchOpen((v) => !v)}
          className="text-xs font-medium"
          style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
        >
          {batchOpen ? "▲ Hide batch logger" : "▼ Log a range of months at once →"}
        </button>

        {batchOpen && (
          <form onSubmit={handleBatchLog} className="mt-3 flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>From</label>
              <input
                type="month"
                value={batchFrom}
                onChange={(e) => setBatchFrom(e.target.value)}
                required
                className="px-2 py-1.5 rounded text-xs outline-none"
                style={{
                  background: "var(--paper-2)",
                  border:     "1px solid var(--rule-paper)",
                  color:      "var(--paper-text)",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>To</label>
              <input
                type="month"
                value={batchTo}
                onChange={(e) => setBatchTo(e.target.value)}
                required
                className="px-2 py-1.5 rounded text-xs outline-none"
                style={{
                  background: "var(--paper-2)",
                  border:     "1px solid var(--rule-paper)",
                  color:      "var(--paper-text)",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
            <select
              value={batchStatus}
              onChange={(e) => setBatchStatus(e.target.value)}
              className="px-2 py-1.5 rounded text-xs outline-none"
              style={{
                background: "var(--paper-2)",
                border:     "1px solid var(--rule-paper)",
                color:      batchStatus === "paid" ? "var(--green)" : "var(--red)",
                fontFamily: "var(--font-sans)",
              }}
            >
              <option value="paid">All paid</option>
              <option value="missed">All missed</option>
            </select>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>Amount/month</label>
              <input
                type="text"
                inputMode="decimal"
                value={batchAmount}
                onChange={(e) => setBatchAmount(formatAmountInput(e.target.value))}
                placeholder={`₦${premium.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}
                className="px-2 py-1.5 rounded text-xs outline-none w-32"
                style={{
                  background: "var(--paper-2)",
                  border:     "1px solid var(--rule-paper)",
                  color:      "var(--paper-text)",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loggingBatch}
              className="px-3 py-1.5 rounded text-xs font-semibold"
              style={{ background: "var(--gold)", color: "#fff", opacity: loggingBatch ? 0.6 : 1 }}
            >
              {loggingBatch ? "Logging…" : "Log range"}
            </button>
          </form>
        )}
      </div>

      {/* Premium update */}
      <form onSubmit={handlePremiumUpdate} className="flex gap-2 items-center border-t pt-3" style={{ borderColor: "var(--rule-paper)" }}>
        <label className="text-xs shrink-0" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
          Update premium:
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={newPremium}
          onChange={(e) => setNewPremium(formatAmountInput(e.target.value))}
          placeholder={formatNaira(premium)}
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
          disabled={savingPremium}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: "var(--ink-3)", border: "1px solid var(--rule-paper)", color: "var(--ink-text)", opacity: savingPremium ? 0.6 : 1 }}
        >
          {savingPremium ? "…" : "Save"}
        </button>
      </form>
    </div>
  );
}
