"use client";

import { useState, useRef, useEffect } from "react";
import { formatAmountInput, parseAmount, todayISO, formatNaira } from "@/lib/format";

export default function EntryForm({ entries, onAdd }) {
  const [date,   setDate]   = useState(todayISO());
  const [desc,   setDesc]   = useState("");
  const [amount, setAmount] = useState("");
  const [to,     setTo]     = useState("");
  const [flow,   setFlow]   = useState("out");
  const [busy,   setBusy]   = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [currency, setCurrency] = useState("NGN");
  const [fxRates, setFxRates] = useState(null);
  const toRef = useRef(null);

  useEffect(() => {
    fetch("/api/fx").then(r => r.json()).then(d => { if (!d.error) setFxRates(d); }).catch(() => {});
  }, []);

  const SYMBOLS = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
  const RATE_KEYS = { USD: "usdNgn", EUR: "eurNgn", GBP: "gbpNgn" };

  function toNgn(raw) {
    const parsed = parseAmount(raw);
    if (!parsed || currency === "NGN") return parsed;
    const rate = fxRates?.[RATE_KEYS[currency]];
    return rate ? Math.round(parsed * rate) : parsed;
  }

  const outNames = [...new Set(entries.filter((e) => e.flow === "out" && e.beneficiary).map((e) => e.beneficiary))];
  const inNames  = [...new Set(entries.filter((e) => e.flow === "in"  && e.beneficiary).map((e) => e.beneficiary))];
  const suggestions = (flow === "out" ? outNames : inNames).filter(
    (n) => to && n.toLowerCase().includes(to.toLowerCase()),
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const ngnAmount = toNgn(amount);
    if (!desc.trim() || !ngnAmount || ngnAmount <= 0) return;
    const finalDesc = currency !== "NGN"
      ? `${desc.trim()} (${currency} ${parseAmount(amount).toLocaleString("en-NG", { maximumFractionDigits: 2 })})`
      : desc.trim();
    setBusy(true);
    await onAdd({ date, desc: finalDesc, amount: ngnAmount, flow, beneficiary: to.trim() || null });
    setDesc("");
    setAmount("");
    setTo("");
    setCurrency("NGN");
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
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="shrink-0 rounded-lg text-xs outline-none"
              style={{
                background: "var(--ink-3)",
                border: "1px solid var(--rule)",
                color: "var(--ink-text-dim)",
                fontFamily: "var(--font-mono)",
                padding: "4px 6px",
                marginRight: 6,
                height: "100%",
              }}
            >
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            <span
              className="absolute top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
              style={{ color: isOut ? "var(--red)" : "var(--green)", fontFamily: "var(--font-mono)", left: 90 }}
            >
              {SYMBOLS[currency]}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(formatAmountInput(e.target.value))}
              placeholder="0.00"
              className="w-full pr-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--ink-3)",
                border:     `1px solid ${isOut ? "rgba(184,57,43,0.35)" : "rgba(47,122,86,0.35)"}`,
                color:      isOut ? "var(--red)" : "var(--green)",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                paddingLeft: 106,
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
        {currency !== "NGN" && amount && (
          <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", paddingLeft: 2 }}>
            {fxRates
              ? `≈ ${formatNaira(toNgn(amount))} at ₦${Number(fxRates[RATE_KEYS[currency]]).toLocaleString()}/${currency}`
              : "≈ ₦? (loading rates…)"}
          </p>
        )}

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
