"use client";

import { useState, useEffect, useRef } from "react";
import { formatAmountInput, parseAmount, todayISO, formatNaira } from "@/lib/format";

const SYMBOLS   = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
const RATE_KEYS = { USD: "usdNgn", EUR: "eurNgn", GBP: "gbpNgn" };

export default function EntryForm({ entries, onAdd }) {
  const [date,        setDate]        = useState(todayISO());
  const [desc,        setDesc]        = useState("");
  const [amount,      setAmount]      = useState("");
  const [to,          setTo]          = useState("");
  const [flow,        setFlow]        = useState("out");
  const [busy,        setBusy]        = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [currency,    setCurrency]    = useState("NGN");
  const [fxRates,     setFxRates]     = useState(null);
  const toRef = useRef(null);

  useEffect(() => {
    fetch("/api/fx").then(r => r.json()).then(d => { if (!d.error) setFxRates(d); }).catch(() => {});
  }, []);

  function toNgn(raw) {
    const parsed = parseAmount(raw);
    if (!parsed || currency === "NGN") return parsed;
    const rate = fxRates?.[RATE_KEYS[currency]];
    return rate ? Math.round(parsed * rate) : parsed;
  }

  const outNames  = [...new Set(entries.filter(e => e.flow === "out" && e.beneficiary).map(e => e.beneficiary))];
  const inNames   = [...new Set(entries.filter(e => e.flow === "in"  && e.beneficiary).map(e => e.beneficiary))];
  const suggestions = (flow === "out" ? outNames : inNames).filter(
    n => to && n.toLowerCase().includes(to.toLowerCase()),
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
    setDesc(""); setAmount(""); setTo(""); setCurrency("NGN");
    setBusy(false);
  }

  const isOut      = flow === "out";
  const accentColor = isOut ? "rgba(184,57,43,0.45)" : "rgba(47,122,86,0.45)";
  const valueColor  = isOut ? "var(--red)" : "var(--green)";

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "var(--ink-2)",
          padding: "16px 16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >

        {/* ── Row 1: Purpose ── */}
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Purpose — what was this for? (e.g. Fuel, Groceries, Rent)"
          required
          style={{
            width:       "100%",
            padding:     "11px 14px",
            borderRadius: 10,
            background:  "var(--ink-3)",
            border:      "1px solid var(--rule)",
            color:       "var(--ink-text)",
            fontFamily:  "var(--font-sans)",
            fontSize:    14,
            outline:     "none",
            boxSizing:   "border-box",
          }}
        />

        {/* ── Row 2: Unified amount group [Out/In | ₦ Amount | Currency] ── */}
        <div
          style={{
            display:      "flex",
            borderRadius: 10,
            overflow:     "hidden",
            border:       `1.5px solid ${accentColor}`,
            background:   "var(--ink-3)",
          }}
        >
          {/* Flow toggle — left */}
          <div style={{ display: "flex", flexShrink: 0, borderRight: "1px solid var(--rule)" }}>
            <button
              type="button"
              onClick={() => setFlow("out")}
              style={{
                padding:    "0 12px",
                background: isOut ? "var(--red)" : "transparent",
                color:      isOut ? "#fff" : "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
                fontSize:   12,
                fontWeight: 700,
                border:     "none",
                borderRight:"1px solid var(--rule)",
                cursor:     "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Out ↑
            </button>
            <button
              type="button"
              onClick={() => setFlow("in")}
              style={{
                padding:    "0 12px",
                background: !isOut ? "var(--green)" : "transparent",
                color:      !isOut ? "#fff" : "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
                fontSize:   12,
                fontWeight: 700,
                border:     "none",
                cursor:     "pointer",
                whiteSpace: "nowrap",
              }}
            >
              In ↓
            </button>
          </div>

          {/* Amount — center, flex-1 */}
          <div style={{ position: "relative", flex: 1 }}>
            <span
              style={{
                position:   "absolute",
                left:       12,
                top:        "50%",
                transform:  "translateY(-50%)",
                color:      valueColor,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize:   14,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {SYMBOLS[currency]}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(formatAmountInput(e.target.value))}
              placeholder="0.00"
              style={{
                width:       "100%",
                height:      "100%",
                minHeight:   44,
                paddingLeft: 28,
                paddingRight: 8,
                background:  "transparent",
                border:      "none",
                outline:     "none",
                color:       valueColor,
                fontFamily:  "var(--font-mono)",
                fontWeight:  700,
                fontSize:    15,
                boxSizing:   "border-box",
              }}
            />
          </div>

          {/* Currency select — right */}
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            style={{
              flexShrink:  0,
              padding:     "0 8px",
              background:  "transparent",
              border:      "none",
              borderLeft:  "1px solid var(--rule)",
              color:       "var(--ink-text-dim)",
              fontFamily:  "var(--font-mono)",
              fontSize:    11,
              outline:     "none",
              cursor:      "pointer",
            }}
          >
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        {/* FX hint */}
        {currency !== "NGN" && amount && (
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 11, marginTop: -4 }}>
            {fxRates
              ? `≈ ${formatNaira(toNgn(amount))} at ₦${Number(fxRates[RATE_KEYS[currency]]).toLocaleString()}/${currency}`
              : "≈ ₦? (loading rates…)"}
          </p>
        )}

        {/* ── Row 3: Date | To/From | Add ── */}
        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              flexShrink:  0,
              padding:     "10px 10px",
              borderRadius: 10,
              background:  "var(--ink-3)",
              border:      "1px solid var(--rule)",
              color:       "var(--ink-text-dim)",
              fontFamily:  "var(--font-mono)",
              fontSize:    12,
              colorScheme: "dark",
              outline:     "none",
            }}
          />

          {/* To / From with autocomplete */}
          <div style={{ position: "relative", flex: 1 }}>
            <input
              ref={toRef}
              type="text"
              value={to}
              onChange={e => { setTo(e.target.value); setShowSuggest(true); }}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              onFocus={() => setShowSuggest(true)}
              placeholder={isOut ? "To (optional)" : "From (optional)"}
              autoComplete="off"
              style={{
                width:       "100%",
                padding:     "10px 12px",
                borderRadius: 10,
                background:  "var(--ink-3)",
                border:      "1px solid var(--rule)",
                color:       "var(--ink-text)",
                fontFamily:  "var(--font-sans)",
                fontSize:    13,
                outline:     "none",
                boxSizing:   "border-box",
              }}
            />
            {showSuggest && suggestions.length > 0 && (
              <ul
                style={{
                  position:   "absolute",
                  top:        "calc(100% + 4px)",
                  left:       0,
                  width:      "100%",
                  background: "var(--ink-3)",
                  border:     "1px solid var(--rule)",
                  borderRadius: 10,
                  overflow:   "hidden",
                  zIndex:     20,
                  boxShadow:  "0 8px 24px rgba(0,0,0,0.4)",
                  listStyle:  "none",
                  margin:     0,
                  padding:    0,
                }}
              >
                {suggestions.slice(0, 5).map(s => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => { setTo(s); setShowSuggest(false); }}
                      style={{
                        width:      "100%",
                        textAlign:  "left",
                        padding:    "9px 14px",
                        background: "transparent",
                        border:     "none",
                        color:      "var(--ink-text)",
                        fontFamily: "var(--font-sans)",
                        fontSize:   13,
                        cursor:     "pointer",
                      }}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={busy || !desc.trim() || !amount}
            style={{
              flexShrink:  0,
              padding:     "10px 20px",
              borderRadius: 10,
              background:  busy || !desc.trim() || !amount
                ? "var(--ink-3)"
                : "linear-gradient(135deg, var(--gold-deep), var(--gold))",
              color:       busy || !desc.trim() || !amount ? "var(--ink-text-dim)" : "#fff",
              fontFamily:  "var(--font-sans)",
              fontSize:    13,
              fontWeight:  700,
              border:      "1px solid " + (busy || !desc.trim() || !amount ? "var(--rule)" : "transparent"),
              cursor:      busy || !desc.trim() || !amount ? "default" : "pointer",
              whiteSpace:  "nowrap",
            }}
          >
            {busy ? "…" : "+ Add"}
          </button>
        </div>

      </div>
    </form>
  );
}
