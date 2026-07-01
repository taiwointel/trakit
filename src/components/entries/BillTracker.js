"use client";

import { useState } from "react";
import { useBills } from "@/hooks/useBills";
import { CATEGORY_NAMES } from "@/lib/categories";
import { formatNaira } from "@/lib/format";

function parseComma(str) {
  return parseFloat(String(str).replace(/,/g, "")) || 0;
}

function formatComma(val) {
  if (!val) return "";
  const n = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(n)) return val;
  return n.toLocaleString("en-NG");
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function thisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextDueDate(dueDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = today.getFullYear();
  const m = today.getMonth();
  const candidate = new Date(y, m, dueDay);
  if (candidate < today) {
    return new Date(y, m + 1, dueDay);
  }
  return candidate;
}

function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = date - today;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatDueLabel(bill, isPaid, isOverdue) {
  if (isPaid) return "Paid ✓";
  if (isOverdue) return "Overdue";
  const due = nextDueDate(bill.due_day);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `Due ${due.getDate()} ${MONTHS[due.getMonth()]}`;
}

const inputStyle = {
  background: "var(--ink-3)",
  border: "1px solid var(--rule)",
  color: "var(--ink-text)",
  borderRadius: 4,
  padding: "5px 8px",
  fontSize: 13,
  outline: "none",
  width: "100%",
  fontFamily: "var(--font-sans)",
};

const labelStyle = {
  fontSize: 11,
  color: "var(--ink-text-dim)",
  fontFamily: "var(--font-sans)",
  marginBottom: 2,
  display: "block",
};

export default function BillTracker({ onLogEntry }) {
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [amountRaw, setAmountRaw] = useState("");
  const [form, setForm] = useState({ name: "", due_day: "", category: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { bills, loading, addBill, deleteBill, markPaid, paymentsFor } = useBills();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = thisMonthStr();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseComma(amountRaw);
    if (!form.name.trim() || !amount || !form.due_day) return;
    setSaving(true);
    await addBill({
      name: form.name.trim(),
      amount,
      due_day: parseInt(form.due_day, 10),
      category: form.category || null,
      notes: form.notes || null,
    });
    setForm({ name: "", due_day: "", category: "", notes: "" });
    setAmountRaw("");
    setFormOpen(false);
    setSaving(false);
  };

  const handleMarkPaid = async (bill) => {
    const t = todayStr();
    await markPaid(bill.id, thisMonth, bill.amount, t);
    if (onLogEntry) {
      await onLogEntry({ date: t, desc: bill.name, amount: bill.amount, flow: "out", beneficiary: null });
    }
  };

  return (
    <div style={{ borderBottom: "1px solid var(--rule)", background: "var(--ink-2)" }}>

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5"
        style={{ background: "var(--ink-2)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Bills & subscriptions
        </span>
        <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
          {open ? "▲ Collapse" : "▼ Show"}
        </span>
      </button>

      {open && (
        <div
          style={{
            borderTop: "3px solid var(--amber)",
            background: "var(--ink-2)",
            padding: "12px 16px 16px",
          }}
        >
          {loading ? (
            <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Loading…</p>
          ) : bills.length === 0 && !formOpen ? (
            <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              No bills added yet. Track subscriptions, rent, utilities here.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {bills.map((bill) => {
                const pmts = paymentsFor(bill.id);
                const isPaid = pmts.some((p) => p.due_month === thisMonth);
                const dueDay = bill.due_day;
                const isOverdue = !isPaid && dueDay < today.getDate();
                const dueDays = daysUntil(nextDueDate(dueDay));

                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--rule-paper)",
                    }}
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="font-semibold text-sm truncate" style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}>
                        {bill.name}
                      </span>
                      <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)" }}>
                        {formatNaira(bill.amount)}/mo
                        {bill.category && (
                          <span style={{ fontFamily: "var(--font-sans)", marginLeft: 6 }}>· {bill.category}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="text-xs font-medium"
                        style={{
                          fontFamily: "var(--font-sans)",
                          color: isPaid ? "var(--green)" : isOverdue ? "var(--red)" : dueDays <= 3 ? "var(--amber)" : "var(--paper-text-dim)",
                        }}
                      >
                        {formatDueLabel(bill, isPaid, isOverdue)}
                      </span>

                      {!isPaid && (
                        <button
                          onClick={() => handleMarkPaid(bill)}
                          className="text-xs rounded px-2 py-1 font-medium"
                          style={{
                            background: "var(--green-soft)",
                            color: "var(--green)",
                            border: "1px solid var(--green)",
                            fontFamily: "var(--font-sans)",
                            cursor: "pointer",
                          }}
                        >
                          Mark paid
                        </button>
                      )}

                      <button
                        onClick={() => deleteBill(bill.id)}
                        className="text-xs"
                        style={{ color: "var(--red)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
                        title="Remove bill"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3">
            {!formOpen ? (
              <button
                onClick={() => setFormOpen(true)}
                className="text-xs font-medium"
                style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
              >
                + Add bill
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Netflix, Rent, DSTV"
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Amount (₦)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountRaw}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d.]/g, "");
                        setAmountRaw(raw);
                      }}
                      onBlur={() => {
                        const n = parseComma(amountRaw);
                        if (!isNaN(n) && n > 0) setAmountRaw(formatComma(n));
                      }}
                      placeholder="0"
                      style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Due day of month</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={form.due_day}
                      onChange={(e) => setForm((f) => ({ ...f, due_day: e.target.value }))}
                      placeholder="e.g. 15"
                      style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      style={{ ...inputStyle }}
                    >
                      <option value="">— optional —</option>
                      {CATEGORY_NAMES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="text-sm font-semibold rounded-lg px-4 py-2"
                    style={{
                      background: "var(--gold)",
                      color: "#fff",
                      fontFamily: "var(--font-sans)",
                      opacity: saving ? 0.6 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Saving…" : "Add bill"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormOpen(false); setForm({ name: "", due_day: "", category: "", notes: "" }); setAmountRaw(""); }}
                    className="text-sm rounded-lg px-4 py-2"
                    style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
