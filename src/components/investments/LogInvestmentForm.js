"use client";

import { useState } from "react";
import { formatAmountInput, parseAmount, todayISO } from "@/lib/format";

const FIELD_MAP = {
  "Treasury Bills":     "maturity-discount",
  "Commercial Papers":  "maturity-discount",
  "Fixed Term Notes":   "maturity-simple",
  "Equities":           "balance",
  "Savings":            "balance",
  "Ethical Investments":"balance",
  "Mutual Funds":       "balance",
  "Life Assurance":     "life",
  "Pension":            "pension",
};

export default function LogInvestmentForm({ onAdd }) {
  const [open,         setOpen]         = useState(false);
  const [type,         setType]         = useState("Treasury Bills");
  const [label,        setLabel]        = useState("");
  const [principal,    setPrincipal]    = useState("");
  const [rate,         setRate]         = useState("");
  const [tenor,        setTenor]        = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [premium,      setPremium]      = useState("");
  const [startDate,    setStartDate]    = useState("");
  const [contribution, setContribution] = useState("");
  const [openingBal,   setOpeningBal]   = useState("");
  const [startMonth,   setStartMonth]   = useState("");
  const [adding,       setAdding]       = useState(false);

  const variant = FIELD_MAP[type] || "balance";
  const isMaturity = variant === "maturity-discount" || variant === "maturity-simple";

  async function handleAdd(e) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);

    const data = { type, label: label.trim() };

    if (isMaturity) {
      data.principal    = parseAmount(principal);
      data.rate         = parseFloat(rate);
      data.tenor_days   = parseInt(tenor, 10);
      data.purchase_date = purchaseDate;
    }
    if (variant === "life") {
      data.monthly_premium = parseAmount(premium);
      data.start_date      = startDate;
    }
    if (variant === "pension") {
      data.monthly_contribution = parseAmount(contribution);
      data.opening_balance      = parseAmount(openingBal) || 0;
      data.start_month          = startMonth;
    }

    await onAdd(data);

    // Reset
    setLabel(""); setPrincipal(""); setRate(""); setTenor("");
    setPurchaseDate(todayISO()); setPremium(""); setStartDate("");
    setContribution(""); setOpeningBal(""); setStartMonth("");
    setOpen(false);
    setAdding(false);
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm px-4 py-2 rounded font-medium"
        style={{ background: "var(--gold)", color: "#fff", fontFamily: "var(--font-sans)" }}
      >
        {open ? "Cancel" : "+ Log an investment"}
      </button>

      {open && (
        <form
          onSubmit={handleAdd}
          className="mt-3 rounded-lg p-4 flex flex-col gap-4"
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
        >
          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              Investment type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 rounded text-sm outline-none"
              style={{
                background: "var(--ink-3)",
                border:     "1px solid var(--rule)",
                color:      "var(--ink-text)",
                fontFamily: "var(--font-sans)",
                maxWidth:   320,
              }}
            >
              <optgroup label="Fixed-income & money market">
                <option>Treasury Bills</option>
                <option>Fixed Term Notes</option>
                <option>Commercial Papers</option>
              </optgroup>
              <optgroup label="Funds & holdings">
                <option>Equities</option>
                <option>Savings</option>
                <option>Ethical Investments</option>
                <option>Mutual Funds</option>
              </optgroup>
              <optgroup label="Long-term">
                <option>Life Assurance</option>
                <option>Pension</option>
              </optgroup>
            </select>
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              Name / label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={type === "Pension" ? "e.g. Stanbic IBTC Pension" : "e.g. 91-Day T-Bill Aug 2026"}
              required
              className="px-3 py-2 rounded text-sm outline-none"
              style={{
                background: "var(--ink-3)",
                border:     "1px solid var(--rule)",
                color:      "var(--ink-text)",
                fontFamily: "var(--font-sans)",
                maxWidth:   400,
              }}
            />
          </div>

          {/* Maturity fields */}
          {isMaturity && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  {variant === "maturity-simple" ? "Amount invested (₦)" : "Face value (₦)"}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={principal}
                  onChange={(e) => setPrincipal(formatAmountInput(e.target.value))}
                  placeholder="0"
                  required
                  className="px-3 py-2 rounded text-sm outline-none w-44"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 18.5"
                  required
                  className="px-3 py-2 rounded text-sm outline-none w-28"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Tenor (days)</label>
                <input
                  type="number"
                  value={tenor}
                  onChange={(e) => setTenor(e.target.value)}
                  placeholder="e.g. 91"
                  required
                  className="px-3 py-2 rounded text-sm outline-none w-28"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Purchase date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                  className="px-2 py-2 rounded text-sm outline-none"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Life assurance fields */}
          {variant === "life" && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Monthly premium (₦)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={premium}
                  onChange={(e) => setPremium(formatAmountInput(e.target.value))}
                  placeholder="0"
                  required
                  className="px-3 py-2 rounded text-sm outline-none w-40"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="px-2 py-2 rounded text-sm outline-none"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Pension fields */}
          {variant === "pension" && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Monthly contribution (₦)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={contribution}
                  onChange={(e) => setContribution(formatAmountInput(e.target.value))}
                  placeholder="0"
                  required
                  className="px-3 py-2 rounded text-sm outline-none w-40"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Opening balance (₦)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={openingBal}
                  onChange={(e) => setOpeningBal(formatAmountInput(e.target.value))}
                  placeholder="0 (optional)"
                  className="px-3 py-2 rounded text-sm outline-none w-40"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>First contribution month (YYYY-MM)</label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  required
                  className="px-2 py-2 rounded text-sm outline-none"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid var(--rule)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>
          )}

          {variant === "balance" && (
            <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              Add the investment, then log deposits &amp; withdrawals on the card.
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={adding}
              className="px-5 py-2 rounded text-sm font-semibold"
              style={{
                background: "var(--gold)",
                color:      "#fff",
                opacity:    adding ? 0.6 : 1,
                fontFamily: "var(--font-sans)",
              }}
            >
              {adding ? "Adding…" : "Add investment"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
