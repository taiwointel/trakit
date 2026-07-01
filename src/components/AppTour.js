"use client";

import { useState, useEffect, useCallback } from "react";

const STEPS = [
  {
    target: "settings-btn",
    label:  "Settings, top right",
    title:  "Step 1 of 10: Connect your AI key",
    body:   "Tap the gear icon to open Settings, then expand 'AI Connection.' Paste your Groq or Gemini API key — both have genuinely free tiers, no credit card required. This single step powers auto-categorization, Coach RBC coaching sessions, bank statement analysis, and spend narration across the whole app.",
  },
  {
    target: "tab-entries",
    label:  "Expense Entry tab",
    title:  "Step 2 of 10: Log your first transaction",
    body:   "Open Expense Entry and fill in a description and amount, then hit Add. The AI reads your description and assigns a spending category, essential vs. discretionary status, and a 0-to-1 confidence score — all in under 10 seconds. A small coloured dot shows you at a glance how certain the AI was.",
  },
  {
    target: "tab-entries",
    label:  "Statement import",
    title:  "Step 3 of 10: Import a bank statement — AI logs it all",
    body:   "Skip manual entry entirely. In the Expense Entry tab, open 'Import PDF / Image' to upload a scanned bank statement or receipt — Trakit7 sends it to Gemini, extracts every transaction, and categorizes them all automatically. You can also import a standard bank CSV export using the 'Import CSV' section below it.",
  },
  {
    target: "tab-entries",
    label:  "Budgets & bill tracker",
    title:  "Step 4 of 10: Set spending limits and track bills",
    body:   "Scroll down in Expense Entry to find the Budgets grid. Set an overall monthly spending cap and per-category limits — each card shows a live progress bar that turns amber at 75% and red when you breach the cap. The Bill Tracker beneath it lets you log recurring bills so you never miss a due date.",
  },
  {
    target: "tab-goals",
    label:  "Goals tab",
    title:  "Step 5 of 10: Set your salary and savings goals",
    body:   "Open Goals and enter your monthly take-home salary. This unlocks the 50/30/20 budget tracker, starts the payday countdown, and sets your emergency fund target automatically from your actual essential spend. Add custom savings goals — Trakit7 calculates how much of your 'Wants' budget to redirect each month to hit each target on time.",
  },
  {
    target: "tab-goals",
    label:  "Emergency fund",
    title:  "Step 6 of 10: Build your emergency fund separately",
    body:   "The Emergency Fund panel in Goals tracks a dedicated pot of money that is completely separate from your main cash balance. Trakit7 sets the target at 6x your current month's essential spending and recalculates it fresh every month. Deposits and withdrawals are logged in their own dated ledger, distinct from your regular transactions.",
  },
  {
    target: "tab-cash",
    label:  "Cash & Investments tab",
    title:  "Step 7 of 10: Anchor your opening balance",
    body:   "Go to Cash & Investments and tell Trakit7 how much was in your account on a specific date — this is the anchor. From that point, your daily opening and closing balance is computed exactly from every transaction you log. No manual updates ever needed: the balance always stays in sync with your ledger.",
  },
  {
    target: "tab-cash",
    label:  "Investment portfolio",
    title:  "Step 8 of 10: Track your full investment portfolio",
    body:   "Below the cash balance, log every position you hold: Treasury bills, fixed-term notes, commercial papers, equities, savings accounts, mutual funds, ethical investments, life assurance, and pension. Each position shows accrued return, tenor progress, and live status. Your total portfolio value feeds directly into the net worth figure on Summary.",
  },
  {
    target: "tab-summary",
    label:  "Summary tab",
    title:  "Step 9 of 10: Your complete financial dashboard",
    body:   "After a few entries, Summary shows total spend, current cash balance, liquidity coverage (how many months your cash covers your essential bills), net worth, Coach RBC's structured analysis of your selected period, spend trend charts, and a category-by-category breakdown — all on one screen. Most users make it their daily starting point.",
  },
  {
    target: "tab-chat",
    label:  "Ask Coach RBC tab",
    title:  "Step 10 of 10: Ask Coach RBC anything",
    body:   "Chat with your AI financial advisor anytime. She already knows your salary, cash balance, portfolio breakdown, emergency fund status, and this month's spend by category. Ask about your spending habits, investment options, or savings strategy — or upload a bank statement, receipt, or document directly in the chat for instant AI analysis of the actual file.",
  },
];

const TOOLTIP_W = 328;
const SPOT_PAD  = 8;

function findVisibleRect(tourId) {
  const els = document.querySelectorAll(`[data-tour="${tourId}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  return null;
}

export default function AppTour({ open, onClose }) {
  const [step,       setStep]       = useState(0);
  const [spotRect,   setSpotRect]   = useState(null);
  const [tipStyle,   setTipStyle]   = useState({});
  const [arrowLeft,  setArrowLeft]  = useState(TOOLTIP_W / 2 - 8);
  const [tipAbove,   setTipAbove]   = useState(false);

  const measure = useCallback(() => {
    if (!open) return;
    const r = findVisibleRect(STEPS[step].target);
    setSpotRect(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);

    if (!r) return;

    const W  = window.innerWidth;
    const H  = window.innerHeight;
    const cx = r.left + r.width / 2;

    // Horizontal: center on target, clamped to screen edges
    const rawLeft = cx - TOOLTIP_W / 2;
    const left    = Math.max(12, Math.min(rawLeft, W - TOOLTIP_W - 12));

    // Arrow offset relative to tooltip
    const arrow = Math.max(16, Math.min(cx - left - 8, TOOLTIP_W - 32));

    // Vertical: below if target in top half, above if bottom half
    const above = r.top > H * 0.55;
    const top   = above
      ? r.top  - SPOT_PAD - 12 - 200  // 200 ≈ tooltip height; might clip, refined by browser
      : r.bottom + SPOT_PAD + 12;

    setTipStyle({ top: Math.max(8, top), left });
    setArrowLeft(arrow);
    setTipAbove(above);
  }, [open, step]);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Small delay so the DOM settles after step change
    const t = setTimeout(measure, 40);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [measure, open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  function next() {
    if (isLast) onClose();
    else setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <>
      <style>{`
        @keyframes tour-spot-pulse {
          0%, 100% { box-shadow: 0 0 0 3px var(--gold),      0 0 0 9999px rgba(0,0,0,0.78); }
          50%       { box-shadow: 0 0 0 5px var(--gold-deep), 0 0 0 9999px rgba(0,0,0,0.84); }
        }
        @keyframes tour-tip-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* Background click-blocker (sits BEHIND spotlight) */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 58, pointerEvents: "all" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Spotlight hole — transparent div whose box-shadow darkens everything else */}
      {spotRect && (
        <div
          style={{
            position:     "fixed",
            top:          spotRect.top    - SPOT_PAD,
            left:         spotRect.left   - SPOT_PAD,
            width:        spotRect.width  + SPOT_PAD * 2,
            height:       spotRect.height + SPOT_PAD * 2,
            borderRadius: 10,
            zIndex:       59,
            pointerEvents:"none",
            animation:    "tour-spot-pulse 2.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        key={step}
        style={{
          position:    "fixed",
          width:       TOOLTIP_W,
          zIndex:      60,
          pointerEvents: "all",
          animation:   "tour-tip-in 0.22s ease forwards",
          ...tipStyle,
        }}
      >
        {/* Arrow pointing toward the highlighted element */}
        {spotRect && !tipAbove && (
          <div
            style={{
              position:    "absolute",
              top:         -8,
              left:        arrowLeft,
              width:       0,
              height:      0,
              borderLeft:  "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom:"8px solid var(--ink-2)",
              pointerEvents: "none",
              zIndex:      1,
            }}
          />
        )}
        {spotRect && tipAbove && (
          <div
            style={{
              position:    "absolute",
              bottom:      -8,
              left:        arrowLeft,
              width:       0,
              height:      0,
              borderLeft:  "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop:   "8px solid var(--ink-2)",
              pointerEvents: "none",
              zIndex:      1,
            }}
          />
        )}

        <div
          style={{
            background:   "var(--ink-2)",
            border:       "1px solid var(--rule)",
            borderTop:    `3px solid var(--gold)`,
            borderRadius: 14,
            padding:      "18px 20px 16px",
            boxShadow:    "0 20px 64px rgba(0,0,0,0.65)",
          }}
        >
          {/* Progress pips */}
          <div style={{ display: "flex", gap: 5, marginBottom: 14, alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width:        i === step ? 20 : 6,
                  height:       6,
                  borderRadius: 3,
                  background:   i < step ? "var(--green)" : i === step ? "var(--gold)" : "var(--ink-3)",
                  transition:   "all 0.3s ease",
                  cursor:       "pointer",
                  flexShrink:   0,
                }}
              />
            ))}
            <span style={{ marginLeft: "auto", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 10 }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Label chip */}
          <div style={{ marginBottom: 8 }}>
            <span style={{
              display:      "inline-block",
              fontSize:     10,
              fontWeight:   700,
              textTransform:"uppercase",
              letterSpacing:"0.07em",
              color:        "var(--gold)",
              fontFamily:   "var(--font-sans)",
              background:   "rgba(169,133,79,0.12)",
              borderRadius: 4,
              padding:      "2px 7px",
            }}>
              ↑ {current.label}
            </span>
          </div>

          <h3 style={{
            color:       "var(--ink-text)",
            fontFamily:  "var(--font-serif)",
            fontSize:    "1.05rem",
            fontWeight:  700,
            lineHeight:  1.3,
            marginBottom: 8,
          }}>
            {current.title}
          </h3>

          <p style={{
            color:       "var(--ink-text-dim)",
            fontFamily:  "var(--font-sans)",
            fontSize:    "0.85rem",
            lineHeight:  1.65,
            marginBottom: 16,
          }}>
            {current.body}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={onClose}
              style={{
                color:      "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
                fontSize:   12,
                background: "none",
                border:     "none",
                cursor:     "pointer",
                padding:    "6px 0",
              }}
            >
              Skip tour
            </button>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {step > 0 && (
                <button
                  onClick={back}
                  style={{
                    background:  "var(--ink-3)",
                    color:       "var(--ink-text-dim)",
                    fontFamily:  "var(--font-sans)",
                    fontSize:    13,
                    fontWeight:  600,
                    border:      "1px solid var(--rule)",
                    borderRadius:8,
                    padding:     "8px 16px",
                    cursor:      "pointer",
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={next}
                style={{
                  background:  "linear-gradient(135deg, var(--gold-deep), var(--gold))",
                  color:       "#fff",
                  fontFamily:  "var(--font-sans)",
                  fontSize:    13,
                  fontWeight:  600,
                  border:      "none",
                  borderRadius:8,
                  padding:     "8px 20px",
                  cursor:      "pointer",
                }}
              >
                {isLast ? "Let's go! →" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
