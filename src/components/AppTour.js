"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

const STEPS = [
  {
    route:  null,
    target: "settings-btn",
    label:  "Settings, top right",
    title:  "Step 1: Connect your provider key",
    body:   "Tap the gear icon to open Settings, then expand 'Provider Setup.' Paste your Groq or Gemini key. Both have genuinely free tiers with no credit card required. This powers categorization, Coach RBC coaching sessions, bank statement reading, and spend narration across the whole app.",
  },
  {
    route:  "/entries",
    target: "entry-form",
    label:  "Expense Entry",
    title:  "Step 2: Log your first transaction",
    body:   "Fill in a description and amount, then hit Add. Trakit7 reads your description and assigns a spending category, essential vs. discretionary status, and a confidence score, all in under 10 seconds. A small coloured dot shows how certain the classification was.",
  },
  {
    route:  "/entries",
    target: "import-card",
    label:  "Statement import",
    title:  "Step 3: Import a bank statement",
    body:   "Skip manual entry entirely. Drop a scanned bank statement or CSV export and Trakit7 extracts every transaction and categorizes them automatically. A labeling wizard walks you through any transactions needing more context before importing.",
  },
  {
    route:  "/entries",
    target: "budgets-grid",
    label:  "Budgets and bill tracker",
    title:  "Step 4: Set spending limits and track bills",
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
    label:  "Emergency fund",
    title:  "Step 6: Build your emergency fund",
    body:   "The Emergency Fund panel tracks a dedicated pot completely separate from your main cash balance. Trakit7 sets the target at 6 times your current month's essential spending and recalculates it fresh every month. Deposits and withdrawals are logged in their own dated ledger.",
  },
  {
    route:  "/cash",
    target: "cash-balance",
    label:  "Cash and Investments",
    title:  "Step 7: Anchor your opening balance",
    body:   "Tell Trakit7 how much was in your account on a specific date. From that point, your daily opening and closing balance is computed exactly from every transaction you log. No manual updates ever needed: the balance stays in sync with your ledger automatically.",
  },
  {
    route:  "/cash",
    target: "investments-section",
    label:  "Investment portfolio",
    title:  "Step 8: Track your full investment portfolio",
    body:   "Log every position you hold: Treasury bills, fixed-term notes, commercial papers, equities, savings accounts, mutual funds, ethical investments, life assurance, and pension. Each shows accrued return, tenor progress, and live status. Your portfolio total feeds directly into net worth on Summary.",
  },
  {
    route:  "/summary",
    target: "summary-headline",
    label:  "Summary",
    title:  "Step 9: Your complete financial dashboard",
    body:   "After a few entries, Summary shows total spend, current cash balance, liquidity coverage, net worth, Coach RBC's structured analysis of your selected period, spend trend charts, and a full category breakdown. Most users make this their daily starting point.",
  },
  {
    route:  "/chat",
    target: "rbc-header",
    label:  "Ask Coach RBC",
    title:  "Step 10: Ask Coach RBC anything",
    body:   "Coach RBC is your personal financial advisor, powered by the provider you connected. She already knows your salary, cash balance, portfolio breakdown, emergency fund status, and this month's spend by category. Ask about spending habits, investment options, or savings strategy.",
  },
  {
    route:  null,
    target: null,
    label:  "Your data, your privacy",
    title:  "Your data stays yours",
    body:   "Trakit7 stores everything in your private Supabase account, protected by Row Level Security so only you can access your records. Your provider key is encrypted at rest and is never returned to the browser in plain text. No data is shared with third parties, no ads, no tracking. Coach RBC sends spending summaries to your chosen provider to generate responses; nothing else leaves your device.",
  },
];

const TOOLTIP_W = 340;
const SPOT_PAD  = 8;

function findVisibleEl(tourId) {
  const els = document.querySelectorAll(`[data-tour="${tourId}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function AppTour({ open, onClose }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [step,      setStep]      = useState(0);
  const [spotRect,  setSpotRect]  = useState(null);
  const [tipStyle,  setTipStyle]  = useState({});
  const [arrowLeft, setArrowLeft] = useState(TOOLTIP_W / 2 - 8);
  const [tipAbove,  setTipAbove]  = useState(false);

  const measure = useCallback(() => {
    if (!open) return;
    const s = STEPS[step];
    if (!s.target) { setSpotRect(null); setTipStyle({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }); return; }

    const el = findVisibleEl(s.target);
    const r  = el?.getBoundingClientRect();
    setSpotRect(r && r.width > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
    if (!r || r.width === 0) return;

    const W  = window.innerWidth;
    const H  = window.innerHeight;
    const cx = r.left + r.width / 2;

    const rawLeft = cx - TOOLTIP_W / 2;
    const left    = Math.max(12, Math.min(rawLeft, W - TOOLTIP_W - 12));
    const arrow   = Math.max(16, Math.min(cx - left - 8, TOOLTIP_W - 32));
    const above   = r.top > H * 0.55;
    const top     = above ? r.top - SPOT_PAD - 12 - 220 : r.bottom + SPOT_PAD + 12;

    setTipStyle({ top: Math.max(8, top), left });
    setArrowLeft(arrow);
    setTipAbove(above);
  }, [open, step]);

  useEffect(() => {
    if (open) { setStep(0); setSpotRect(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const s = STEPS[step];

    // Navigate to the step's page if needed
    if (s.route && pathname !== s.route) {
      router.push(s.route);
    }

    // Delay gives new page time to mount; scroll then measure
    const delay = s.route && pathname !== s.route ? 700 : 80;
    const t = setTimeout(() => {
      if (s.target) {
        const el = findVisibleEl(s.target);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(measure, 450);
        } else {
          measure();
        }
      } else {
        setSpotRect(null);
        setTipStyle({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      }
    }, delay);

    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [measure, open, step, pathname, router]);

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

  const isCenter = !current.target;

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
        @keyframes tour-center-in {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>

      {/* Background click-blocker */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 58, pointerEvents: "all", background: isCenter ? "rgba(0,0,0,0.82)" : "transparent" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Spotlight */}
      {spotRect && !isCenter && (
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

      {/* Tooltip / centered card */}
      <div
        key={step}
        style={{
          position:     "fixed",
          width:        TOOLTIP_W,
          zIndex:       60,
          pointerEvents:"all",
          animation:    isCenter ? "tour-center-in 0.22s ease forwards" : "tour-tip-in 0.22s ease forwards",
          ...(isCenter
            ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
            : tipStyle),
        }}
      >
        {/* Arrow (only for anchored tooltips) */}
        {spotRect && !tipAbove && !isCenter && (
          <div style={{ position: "absolute", top: -8, left: arrowLeft, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "8px solid var(--ink-2)", pointerEvents: "none", zIndex: 1 }} />
        )}
        {spotRect && tipAbove && !isCenter && (
          <div style={{ position: "absolute", bottom: -8, left: arrowLeft, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid var(--ink-2)", pointerEvents: "none", zIndex: 1 }} />
        )}

        <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderTop: "3px solid var(--gold)", borderRadius: 14, padding: "18px 20px 16px", boxShadow: "0 20px 64px rgba(0,0,0,0.65)" }}>
          {/* Progress pips */}
          <div style={{ display: "flex", gap: 5, marginBottom: 14, alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i < step ? "var(--green)" : i === step ? "var(--gold)" : "var(--ink-3)", transition: "all 0.3s ease", cursor: "pointer", flexShrink: 0 }}
              />
            ))}
            <span style={{ marginLeft: "auto", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 10 }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Label chip */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--gold)", fontFamily: "var(--font-sans)", background: "rgba(169,133,79,0.12)", borderRadius: 4, padding: "2px 7px" }}>
              {isCenter ? "🔒" : "↑"} {current.label}
            </span>
          </div>

          <h3 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>
            {current.title}
          </h3>

          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: "0.85rem", lineHeight: 1.65, marginBottom: 16 }}>
            {current.body}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={onClose} style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}>
              Skip tour
            </button>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {step > 0 && (
                <button onClick={back} style={{ background: "var(--ink-3)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, border: "1px solid var(--rule)", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
                  Back
                </button>
              )}
              <button onClick={next} style={{ background: "linear-gradient(135deg, var(--gold-deep), var(--gold))", color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}>
                {isLast ? "Let's go!" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
