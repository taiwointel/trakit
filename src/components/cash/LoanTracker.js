"use client";

import { useState } from "react";
import { useLoans } from "@/hooks/useLoans";
import { formatNaira } from "@/lib/format";

function parseComma(str) {
  return parseFloat(String(str).replace(/,/g, "")) || 0;
}

function formatComma(val) {
  const n = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(n)) return String(val);
  return n.toLocaleString("en-NG");
}

function monthsBetween(startDateStr, today) {
  const start = new Date(startDateStr);
  const y1 = start.getFullYear(), m1 = start.getMonth();
  const y2 = today.getFullYear(), m2 = today.getMonth();
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1));
}

function computeLoan(loan, today) {
  const principal = Number(loan.principal);
  const annualRate = Number(loan.interest_rate);
  const n = Number(loan.term_months);
  const r = annualRate / 100 / 12;

  let monthlyPayment;
  if (r === 0) {
    monthlyPayment = principal / n;
  } else {
    monthlyPayment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const elapsed = monthsBetween(loan.start_date, today);

  let remainingBalance;
  if (elapsed >= n) {
    remainingBalance = 0;
  } else if (r === 0) {
    remainingBalance = principal - monthlyPayment * elapsed;
  } else {
    remainingBalance = principal * Math.pow(1 + r, n) - monthlyPayment * ((Math.pow(1 + r, elapsed) - 1) / r);
  }
  remainingBalance = Math.max(0, remainingBalance);

  const totalInterest = monthlyPayment * n - principal;

  const startDate = new Date(loan.start_date);
  const payoffDate = new Date(startDate);
  payoffDate.setMonth(payoffDate.getMonth() + n);

  const progressPct = Math.min(100, (elapsed / n) * 100);

  return { monthlyPayment, remainingBalance, totalInterest, elapsed, payoffDate, progressPct };
}

function formatDate(date) {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
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

const statLabel = {
  fontSize: 11,
  color: "var(--ink-text-dim)",
  fontFamily: "var(--font-sans)",
};

const statValue = {
  fontSize: 13,
  color: "var(--ink-text)",
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
};

export default function LoanTracker() {
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [principalRaw, setPrincipalRaw] = useState("");
  const [form, setForm] = useState({ name: "", interest_rate: "", term_months: "", start_date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { loans, loading, addLoan, deleteLoan } = useLoans();
  const today = new Date();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const principal = parseComma(principalRaw);
    if (!form.name.trim() || !principal || !form.interest_rate || !form.term_months || !form.start_date) return;
    setSaving(true);
    await addLoan({
      name: form.name.trim(),
      principal,
      interest_rate: parseFloat(form.interest_rate),
      term_months: parseInt(form.term_months, 10),
      start_date: form.start_date,
      notes: form.notes || null,
    });
    setForm({ name: "", interest_rate: "", term_months: "", start_date: "", notes: "" });
    setPrincipalRaw("");
    setFormOpen(false);
    setSaving(false);
  };

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        background: "var(--ink-2)",
        border: "1px solid var(--rule)",
        borderLeft: "3px solid var(--gold)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: "var(--ink-2)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Loans & debt
        </span>
        <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
          {open ? "▲ Collapse" : "▼ Show"}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">

          {loading ? (
            <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Loading…</p>
          ) : (
            <>
              {loans.length === 0 && !formOpen && (
                <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  No loans added yet. Track your debt obligations here.
                </p>
              )}

              {loans.map((loan) => {
                const { monthlyPayment, remainingBalance, totalInterest, elapsed, payoffDate, progressPct } = computeLoan(loan, today);

                return (
                  <div
                    key={loan.id}
                    className="rounded-lg flex flex-col gap-2 p-3"
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--rule-paper)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}>
                          {loan.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
                          {formatNaira(loan.principal)} principal · {loan.interest_rate}% p.a. · {loan.term_months} months
                        </p>
                      </div>
                      <button
                        onClick={() => deleteLoan(loan.id)}
                        className="text-xs flex-shrink-0"
                        style={{ color: "var(--red)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
                        title="Remove loan"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid gap-x-4 gap-y-1" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                      <div>
                        <p style={statLabel}>Monthly payment</p>
                        <p style={statValue}>{formatNaira(monthlyPayment)}</p>
                      </div>
                      <div>
                        <p style={statLabel}>Remaining balance</p>
                        <p style={{ ...statValue, color: "var(--red)" }}>{formatNaira(remainingBalance)}</p>
                      </div>
                      <div>
                        <p style={statLabel}>Total interest</p>
                        <p style={statValue}>{formatNaira(totalInterest)}</p>
                      </div>
                      <div>
                        <p style={statLabel}>Months elapsed</p>
                        <p style={statValue}>{elapsed} of {loan.term_months}</p>
                      </div>
                      <div>
                        <p style={statLabel}>Payoff date</p>
                        <p style={statValue}>{formatDate(payoffDate)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
                          Repayment progress
                        </span>
                        <span className="text-xs" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)" }}>
                          {progressPct.toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ height: 7, borderRadius: 4, background: "var(--paper-3)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${progressPct}%`,
                            background: "var(--blue-accent)",
                            borderRadius: 4,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!formOpen ? (
            <button
              onClick={() => setFormOpen(true)}
              className="text-xs font-medium self-start"
              style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
            >
              + Add loan
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1">
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Loan name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Car loan, Personal loan"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Principal (₦)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={principalRaw}
                    onChange={(e) => setPrincipalRaw(e.target.value.replace(/[^\d.]/g, ""))}
                    onBlur={() => {
                      const n = parseComma(principalRaw);
                      if (!isNaN(n) && n > 0) setPrincipalRaw(formatComma(n));
                    }}
                    placeholder="0"
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Annual interest rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.interest_rate}
                    onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value }))}
                    placeholder="e.g. 18"
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Term (months)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.term_months}
                    onChange={(e) => setForm((f) => ({ ...f, term_months: e.target.value }))}
                    placeholder="e.g. 24"
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Start date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                    required
                  />
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
                  {saving ? "Saving…" : "Add loan"}
                </button>
                <button
                  type="button"
                  onClick={() => { setFormOpen(false); setForm({ name: "", interest_rate: "", term_months: "", start_date: "", notes: "" }); setPrincipalRaw(""); }}
                  className="text-sm rounded-lg px-4 py-2"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
