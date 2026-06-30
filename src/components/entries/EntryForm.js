"use client";

import { useState, useRef } from "react";
import { formatAmountInput, parseAmount, todayISO } from "@/lib/format";

export default function EntryForm({ entries, onAdd }) {
  const [date,   setDate]   = useState(todayISO());
  const [desc,   setDesc]   = useState("");
  const [amount, setAmount] = useState("");
  const [to,     setTo]     = useState("");
  const [flow,   setFlow]   = useState("out");
  const [busy,   setBusy]   = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const toRef = useRef(null);

  const outNames = [...new Set(entries.filter((e) => e.flow === "out" && e.beneficiary).map((e) => e.beneficiary))];
  const inNames  = [...new Set(entries.filter((e) => e.flow === "in"  && e.beneficiary).map((e) => e.beneficiary))];
  const suggestions = (flow === "out" ? outNames : inNames).filter(
    (n) => to && n.toLowerCase().includes(to.toLowerCase()),
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!desc.trim() || parsed <= 0) return;
    setBusy(true);
    await onAdd({ date, desc: desc.trim(), amount: parsed, flow, beneficiary: to.trim() || null });
    setDesc("");
    setAmount("");
    setTo("");
    setBusy(false);
  }

  const isOut = flow === "out";

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="px-4 pt-4 pb-3 flex flex-col gap-3"
        style={{ background: "var(--ink-2)" }}
      >
        {/* Row 1: Description full width */}
        <div className="relative">
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What was this for? (e.g. Fuel at Oando)"
            required
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      "var(--ink-text)",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        {/* Row 2: Amount + Flow toggle */}
        <div className="flex gap-2">
          {/* Amount */}
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
              style={{ color: isOut ? "var(--red)" : "var(--green)", fontFamily: "var(--font-mono)" }}
            >
              ₦
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(formatAmountInput(e.target.value))}
              placeholder="0.00"
              className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--ink-3)",
                border:     `1px solid ${isOut ? "rgba(184,57,43,0.35)" : "rgba(47,122,86,0.35)"}`,
                color:      isOut ? "var(--red)" : "var(--green)",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
            />
          </div>

          {/* Flow toggle — pill buttons */}
          <div
            className="flex rounded-xl overflow-hidden shrink-0"
            style={{ border: "1px solid var(--rule)", background: "var(--ink-3)" }}
          >
            <button
              type="button"
              onClick={() => setFlow("out")}
              className="px-3 py-2.5 text-xs font-semibold transition-all"
              style={{
                background: isOut  ? "var(--red)" : "transparent",
                color:      isOut  ? "#fff"       : "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Out ↑
            </button>
            <button
              type="button"
              onClick={() => setFlow("in")}
              className="px-3 py-2.5 text-xs font-semibold transition-all"
              style={{
                background: !isOut ? "var(--green)" : "transparent",
                color:      !isOut ? "#fff"         : "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
              }}
            >
              In ↓
            </button>
          </div>
        </div>

        {/* Row 3: Date + To/From + Submit */}
        <div className="flex gap-2 items-center">
          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-xs outline-none shrink-0"
            style={{
              background:  "var(--ink-3)",
              border:      "1px solid var(--rule)",
              color:       "var(--ink-text-dim)",
              fontFamily:  "var(--font-mono)",
              colorScheme: "dark",
            }}
          />

          {/* To / From with autocomplete */}
          <div className="relative flex-1">
            <input
              ref={toRef}
              type="text"
              value={to}
              onChange={(e) => { setTo(e.target.value); setShowSuggest(true); }}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              onFocus={() => setShowSuggest(true)}
              placeholder={isOut ? "To (optional)" : "From (optional)"}
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--ink-3)",
                border:     "1px solid var(--rule)",
                color:      "var(--ink-text)",
                fontFamily: "var(--font-sans)",
              }}
            />
            {showSuggest && suggestions.length > 0 && (
              <ul
                className="absolute top-full left-0 mt-1 rounded-xl shadow-xl z-20 overflow-hidden w-full"
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)" }}
              >
                {suggestions.slice(0, 5).map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => { setTo(s); setShowSuggest(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-opacity-80"
                      style={{
                        color:      "var(--ink-text)",
                        fontFamily: "var(--font-sans)",
                        background: "transparent",
                      }}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy || !desc.trim() || !amount}
            className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: busy || !desc.trim() || !amount
                ? "var(--ink-3)"
                : "linear-gradient(135deg, var(--gold-deep), var(--gold))",
              color:      busy || !desc.trim() || !amount ? "var(--ink-text-dim)" : "#fff",
              fontFamily: "var(--font-sans)",
              border:     "1px solid " + (busy || !desc.trim() || !amount ? "var(--rule)" : "transparent"),
            }}
          >
            {busy ? "…" : "+ Add"}
          </button>
        </div>
      </div>
    </form>
  );
}
