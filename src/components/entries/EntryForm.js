"use client";

import { useState, useRef, useEffect } from "react";
import { formatAmountInput, parseAmount, todayISO } from "@/lib/format";

export default function EntryForm({ entries, onAdd }) {
  const [date,   setDate]   = useState(todayISO());
  const [desc,   setDesc]   = useState("");
  const [amount, setAmount] = useState("");
  const [to,     setTo]     = useState("");
  const [flow,   setFlow]   = useState("out");
  const [busy,   setBusy]   = useState(false);

  // Separate autocomplete pools for "to" vs "from"
  const outNames = [...new Set(entries.filter((e) => e.flow === "out" && e.beneficiary).map((e) => e.beneficiary))];
  const inNames  = [...new Set(entries.filter((e) => e.flow === "in"  && e.beneficiary).map((e) => e.beneficiary))];
  const suggestions = (flow === "out" ? outNames : inNames).filter((n) =>
    to && n.toLowerCase().includes(to.toLowerCase()),
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!desc.trim() || parsed <= 0) return;
    setBusy(true);
    await onAdd({
      date,
      desc:        desc.trim(),
      amount:      parsed,
      flow,
      beneficiary: to.trim() || null,
    });
    setDesc("");
    setAmount("");
    setTo("");
    setBusy(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-2 p-4"
      style={{ gridTemplateColumns: "auto 1fr auto auto auto auto" }}
    >
      {/* Date */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="px-2 py-2 rounded text-sm outline-none"
        style={{
          background:  "var(--ink-3)",
          border:      "1px solid var(--rule)",
          color:       "var(--ink-text)",
          fontFamily:  "var(--font-mono)",
        }}
      />

      {/* Description */}
      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description"
        className="px-3 py-2 rounded text-sm outline-none"
        style={{
          background: "var(--ink-3)",
          border:     "1px solid var(--rule)",
          color:      "var(--ink-text)",
          fontFamily: "var(--font-sans)",
        }}
      />

      {/* Amount */}
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(formatAmountInput(e.target.value))}
        placeholder="₦ Amount"
        className="px-3 py-2 rounded text-sm outline-none w-36"
        style={{
          background: "var(--ink-3)",
          border:     "1px solid var(--rule)",
          color:      "var(--ink-text)",
          fontFamily: "var(--font-mono)",
        }}
      />

      {/* To / From */}
      <div className="relative">
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder={flow === "out" ? "To (optional)" : "From (optional)"}
          className="px-3 py-2 rounded text-sm outline-none w-36"
          style={{
            background: "var(--ink-3)",
            border:     "1px solid var(--rule)",
            color:      "var(--ink-text)",
            fontFamily: "var(--font-sans)",
          }}
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <ul
            className="absolute top-full left-0 mt-1 rounded shadow-lg z-10 overflow-hidden"
            style={{
              background:  "var(--ink-3)",
              border:      "1px solid var(--rule)",
              minWidth:    "100%",
            }}
          >
            {suggestions.slice(0, 5).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => setTo(s)}
                  className="w-full text-left px-3 py-1.5 text-sm"
                  style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Flow select */}
      <select
        value={flow}
        onChange={(e) => setFlow(e.target.value)}
        className="px-2 py-2 rounded text-sm outline-none"
        style={{
          background: "var(--ink-3)",
          border:     "1px solid var(--rule)",
          color:      flow === "out" ? "var(--red)" : "var(--green)",
          fontFamily: "var(--font-sans)",
          cursor:     "pointer",
        }}
      >
        <option value="out">Money out</option>
        <option value="in">Money in</option>
      </select>

      {/* Submit */}
      <button
        type="submit"
        disabled={busy}
        className="px-4 py-2 rounded text-sm font-semibold transition-opacity"
        style={{
          background: "var(--gold)",
          color:      "#fff",
          opacity:    busy ? 0.6 : 1,
          fontFamily: "var(--font-sans)",
        }}
      >
        {busy ? "…" : "Add"}
      </button>
    </form>
  );
}
