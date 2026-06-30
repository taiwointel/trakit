"use client";

import { useState } from "react";
import { formatAmountInput, parseAmount, formatNaira } from "@/lib/format";

export default function SalarySetup({ salary, paydayDay = 22, onSave }) {
  const [salaryInput, setSalaryInput] = useState(salary ? salary.toLocaleString("en-NG", { maximumFractionDigits: 0 }) : "");
  const [paydayInput, setPaydayInput] = useState(String(paydayDay));
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      salary:     parseAmount(salaryInput) || null,
      payday_day: Math.max(1, Math.min(31, parseInt(paydayInput, 10) || 22)),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
      >
        Salary &amp; Payday
      </p>

      <form onSubmit={handleSave} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label
            className="text-xs"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            Monthly net salary (₦)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={salaryInput}
            onChange={(e) => setSalaryInput(formatAmountInput(e.target.value))}
            placeholder="e.g. 500,000"
            className="px-3 py-2 rounded text-sm outline-none w-48"
            style={{
              background:  "var(--ink-3)",
              border:      "1px solid var(--rule)",
              color:       "var(--ink-text)",
              fontFamily:  "var(--font-mono)",
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            Payday (day of month)
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={paydayInput}
            onChange={(e) => setPaydayInput(e.target.value)}
            className="px-3 py-2 rounded text-sm outline-none w-24"
            style={{
              background:  "var(--ink-3)",
              border:      "1px solid var(--rule)",
              color:       "var(--ink-text)",
              fontFamily:  "var(--font-mono)",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{
            background: saved ? "var(--green)" : "var(--gold)",
            color:      "#fff",
            opacity:    saving ? 0.6 : 1,
            fontFamily: "var(--font-sans)",
            transition: "background 0.3s",
          }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </form>

      {salary && (
        <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Salary set to <strong style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>{formatNaira(salary)}</strong> · payday on the {paydayDay}{ordinal(paydayDay)} of each month
        </p>
      )}
    </div>
  );
}

function ordinal(n) {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
