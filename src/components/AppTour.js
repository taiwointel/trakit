"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const STEPS = [
  {
    route:  null,
    target: "settings-btn",
    label:  "Settings",
    title:  "Step 1: Connect your AI provider",
    body:   "Tap the gear icon to open Settings, then expand 'Provider Setup.' Paste your Groq or Gemini key — both have free tiers with no credit card required. This powers AI categorization, Coach RBC, bank statement reading, and spend narration across the whole app.",
  },
  {
    route:  "/entries",
    target: "entry-form",
    label:  "Expense Entry",
    title:  "Step 2: Log your first transaction",
    body:   "Type a description and amount, then hit Add. Trakit7 reads the description and assigns a spending category, essential vs. discretionary tag, and a confidence score — all in under 10 seconds. A coloured dot shows how certain the classification was.",
  },
  {
    route:  "/entries",
    target: "import-card",
    label:  "Statement Import",
    title:  "Step 3: Import a bank statement",
    body:   "Drop a PDF or CSV bank statement and Trakit7 extracts every transaction and categorises them automatically. A labelling wizard walks you through any transactions that need extra context before importing.",
  },
  {
    route:  "/entries",
    target: "budgets-grid",
    label:  "Budgets",
    title:  "Step 4: Set spending caps",
    body:   "Set an overall monthly cap and per-category limits. Each card shows a live progress bar that turns amber at 75% and red when you breach the cap. The Bill Tracker below lets you log recurring bills so you never miss a due date.",
  },
  {
    route:  "/goals",
    target: "salary-panel",
    label:  "Goals",
    title:  "Step 5: Set your salary and savings goals",
    body:   "Enter your monthly take-home salary. This unlocks the 50/30/20 budget tracker, starts the payday countdown, and sets your emergency fund target from your actual essential spend. Add custom savings goals and Trakit7 calculates how much of your Wants budget to redirect each month to hit each target on time.",
  },
  {
    route:  "/goals",
    target: "emergency-fund",
    label:  "Emergency Fund",
    title:  "Step 6: Build your emergency fund",
    body:   "The Emergency Fund panel tracks a dedicated pot completely separate from your main cash balance. Trakit7 sets the target at 6x your current month's essential spending and recalculates it fresh every month. Deposits and withdrawals are logged in their own dated ledger.",
  },
  {
    route:  "/cash",
    target: "cash-balance",
    label:  "Cash Balance",
    title:  "Step 7: Anchor your opening balance",
    body:   "Tell Trakit7 how much was in your account on a specific date. From that point, your daily opening and closing balance is computed exactly from every transaction you log — no manual updates ever needed.",
  },
  {
    route:  "/cash",
    target: "investments-section",
    label:  "Investments",
    title:  "Step 8: Track your full portfolio",
    body:   "Log every position you hold: Treasury bills, fixed-term notes, commercial papers, equities, savings, mutual funds, life assurance, and pension. Each shows accrued return, tenor progress, and live status. Your portfolio total feeds directly into net worth on the Summary tab.",
  },
  {
    route:  "/summary",
    target: "summary-headline",
    label:  "Summary",
    title:  "Step 9: Your complete financial dashboard",
    body:   "After a few entries, Summary shows total spend, current cash balance, liquidity coverage, net worth, Coach RBC's analysis of your selected period, spend trend charts, and a full category breakdown. Most users make this their daily starting point.",
  },
  {
    route:  "/chat",
    target: "rbc-header",
    label:  "Ask Coach RBC",
    title:  "Step 10: Ask Coach RBC anything",
    body:   "Coach RBC is your personal financial advisor. She already knows your salary, cash balance, portfolio breakdown, emergency fund status, and this month's spend by category. Ask about spending habits, investment options, or savings strategy — she'll give you a straight answer.",
  },
  {
    route:  null,
    target: null,
    label:  "Privacy",
    title:  "Your data stays yours",
    body:   "Everything is stored in your private Supabase account, protected by Row Level Security so only you can access your records. Your provider key is encrypted at rest and never returned to the browser in plain text. No ads, no tracking, no data shared with third parties.",
  },
];

function findEl(tourId) {
  const els = document.querySelectorAll(`[data-tour="${tourId}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function AppTour({ open, onClose }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const pathnameRef = useRef(null);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const [step,       setStep]       = useState(0);
  const [navigating, setNavigating] = useState(false);

  // Reset when tour opens
  useEffect(() => {
    if (open) { setStep(0); setNavigating(false); }
  }, [open]);

  // Navigate + scroll the target into view on each step change
  useEffect(() => {
    if (!open) return;
    const s = STEPS[step];
    let cancelled = false;
    setNavigating(false);

    function scrollTarget() {
      if (cancelled || !s.target) return;
      const el = findEl(s.target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // Element not mounted yet — retry once after a short wait
        setTimeout(() => {
          if (cancelled) return;
          const el2 = findEl(s.target);
          if (el2) el2.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 400);
      }
    }

    const needsNav = s.route && pathnameRef.current !== s.route;
    if (needsNav) {
      setNavigating(true);
      router.push(s.route);
      const t = setTimeout(() => {
        setNavigating(false);
        scrollTarget();
      }, 900);
      return () => { cancelled = true; clearTimeout(t); };
    } else {
      const t = setTimeout(scrollTarget, 180);
      return () => { cancelled = true; clearTimeout(t); };
    }
  }, [step, open, router]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  function next() { isLast ? onClose() : setStep((s) => s + 1); }
  function back() { if (step > 0) setStep((s) => s - 1); }

  return (
    <>
      {/*
        CSS injection — the active target element gets a pulsing gold ring.
        No coordinate measurement needed; the outline follows the element
        naturally regardless of scroll position or layout shifts.
      */}
      <style>{`
        @keyframes _tring {
          0%,100% { outline-color: rgba(169,133,79,1);   box-shadow: 0 0 0 4px rgba(169,133,79,0.25), 0 0 24px rgba(169,133,79,0.2); }
          50%      { outline-color: rgba(200,134,46,0.7); box-shadow: 0 0 0 7px rgba(169,133,79,0.12), 0 0 36px rgba(169,133,79,0.12); }
        }
        ${current.target ? `[data-tour="${current.target}"] {
          outline: 2px solid #A9854F !important;
          outline-offset: 5px;
          border-radius: 14px !important;
          animation: _tring 2s ease-in-out infinite;
        }` : ""}
      `}</style>

      {/* Tooltip — pinned to bottom center, always visible */}
      <div
        style={{
          position:     "fixed",
          bottom:       20,
          left:         "50%",
          transform:    "translateX(-50%)",
          width:        "min(620px, calc(100vw - 20px))",
          zIndex:       9999,
          pointerEvents:"all",
        }}
      >
        <div style={{
          background:   "rgba(18,22,29,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border:       "1px solid rgba(169,133,79,0.3)",
          borderTop:    "2px solid var(--gold)",
          borderRadius: 20,
          padding:      "16px 22px 18px",
          boxShadow:    "0 24px 72px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>

          {/* Step progress pips */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12, alignItems: "center" }}>
            {STEPS.map((s, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                title={STEPS[i].label}
                style={{
                  width:        i === step ? 20 : 5,
                  height:       5,
                  borderRadius: 3,
                  background:   i < step ? "var(--green)" : i === step ? "var(--gold)" : "var(--ink-3)",
                  transition:   "width 0.3s, background 0.3s",
                  cursor:       "pointer",
                  flexShrink:   0,
                }}
              />
            ))}
            <span style={{
              marginLeft: "auto", color: "var(--ink-text-dim)",
              fontFamily: "var(--font-mono)", fontSize: 10, whiteSpace: "nowrap",
            }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Section chip */}
          <span style={{
            display:       "inline-block",
            fontSize:      9,
            fontWeight:    700,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            color:         "var(--gold)",
            fontFamily:    "var(--font-sans)",
            background:    "rgba(169,133,79,0.12)",
            borderRadius:  4,
            padding:       "2px 7px",
            marginBottom:  7,
          }}>
            {current.label}
          </span>

          {/* Title */}
          <h3 style={{
            color:        "var(--ink-text)",
            fontFamily:   "var(--font-serif)",
            fontSize:     "1rem",
            fontWeight:   700,
            lineHeight:   1.3,
            marginBottom: 6,
          }}>
            {current.title}
          </h3>

          {/* Body */}
          <p style={{
            color:        "var(--ink-text-dim)",
            fontFamily:   "var(--font-sans)",
            fontSize:     "0.82rem",
            lineHeight:   1.6,
            marginBottom: 16,
          }}>
            {navigating ? "Navigating to the right page…" : current.body}
          </p>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={onClose}
              style={{
                color:      "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
                fontSize:   11,
                background: "none",
                border:     "none",
                cursor:     "pointer",
                padding:    "6px 0",
              }}
            >
              End tour
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={back}
                  style={{
                    background:   "var(--ink-3)",
                    color:        "var(--ink-text-dim)",
                    fontFamily:   "var(--font-sans)",
                    fontSize:     12,
                    fontWeight:   600,
                    border:       "1px solid var(--rule)",
                    borderRadius: 10,
                    padding:      "8px 16px",
                    cursor:       "pointer",
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={next}
                style={{
                  background:    "linear-gradient(135deg, var(--gold-deep), var(--gold))",
                  color:         "#fff",
                  fontFamily:    "var(--font-sans)",
                  fontSize:      13,
                  fontWeight:    700,
                  border:        "none",
                  borderRadius:  10,
                  padding:       "8px 22px",
                  cursor:        "pointer",
                  letterSpacing: "0.01em",
                }}
              >
                {isLast ? "Let's go!" : "Next →"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
