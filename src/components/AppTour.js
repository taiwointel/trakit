"use client";

import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { useRouter, usePathname } from "next/navigation";

const STEPS = [
  {
    route:  null,
    target: "settings-btn",
    label:  "Settings",
    title:  "Step 1: Connect your provider key",
    body:   "Tap the gear icon to open Settings, then expand 'Provider Setup.' Paste your Groq or Gemini key — both have genuinely free tiers with no credit card required. This powers categorization, Coach RBC sessions, bank statement reading, and spend narration across the whole app.",
  },
  {
    route:  "/entries",
    target: "entry-form",
    label:  "Expense Entry",
    title:  "Step 2: Log your first transaction",
    body:   "Fill in a description and amount, then hit Add. Trakit7 reads your description and assigns a spending category, essential vs. discretionary status, and a confidence score — all in under 10 seconds. A small coloured dot shows how certain the classification was.",
  },
  {
    route:  "/entries",
    target: "import-card",
    label:  "Statement Import",
    title:  "Step 3: Import a bank statement",
    body:   "Skip manual entry entirely. Drop a scanned bank statement or CSV export and Trakit7 extracts every transaction and categorizes them automatically. A labeling wizard walks you through any transactions needing more context before importing.",
  },
  {
    route:  "/entries",
    target: "budgets-grid",
    label:  "Budgets",
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
    label:  "Emergency Fund",
    title:  "Step 6: Build your emergency fund",
    body:   "The Emergency Fund panel tracks a dedicated pot completely separate from your main cash balance. Trakit7 sets the target at 6 times your current month's essential spending and recalculates it fresh every month. Deposits and withdrawals are logged in their own dated ledger.",
  },
  {
    route:  "/cash",
    target: "cash-balance",
    label:  "Cash Balance",
    title:  "Step 7: Anchor your opening balance",
    body:   "Tell Trakit7 how much was in your account on a specific date. From that point, your daily opening and closing balance is computed exactly from every transaction you log — no manual updates ever needed. The balance stays in sync with your ledger automatically.",
  },
  {
    route:  "/cash",
    target: "investments-section",
    label:  "Investments",
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
    label:  "Privacy",
    title:  "Your data stays yours",
    body:   "Trakit7 stores everything in your private Supabase account, protected by Row Level Security so only you can access your records. Your provider key is encrypted at rest and never returned to the browser in plain text. No data is shared with third parties, no ads, no tracking. Coach RBC sends spending summaries to your chosen provider to generate responses — nothing else leaves your device.",
  },
];

const SPOT_PAD = 10;
const TOOLTIP_W = 520;

function findVisibleEl(tourId) {
  const els = document.querySelectorAll(`[data-tour="${tourId}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function AppTour({ open, onClose }) {
  const router      = useRouter();
  const pathnameRef = useRef(null);
  const pathname    = usePathname();

  // Sync pathname into ref without adding it as an effect dep
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const [step,     setStep]     = useState(0);
  const [spotRect, setSpotRect] = useState(null);
  const [tipAtTop, setTipAtTop] = useState(false);

  // Drag state — null means "use default pinned position"
  const [dragPos,  setDragPos]  = useState(null);
  const dragRef   = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const measure = useCallback(() => {
    if (!open) return;
    const s = STEPS[step];

    if (!s.target) {
      setSpotRect(null);
      setTipAtTop(false);
      return;
    }

    const el = findVisibleEl(s.target);
    const r  = el?.getBoundingClientRect();

    if (!r || r.width === 0) {
      setSpotRect(null);
      setTipAtTop(false);
      return;
    }

    setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height });

    // Pin tooltip to top of viewport when element occupies the lower half,
    // otherwise pin to bottom — tooltip never overlaps the element.
    const H = window.innerHeight;
    const elementMidY = (r.top + r.bottom) / 2;
    setTipAtTop(elementMidY > H * 0.55);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  useEffect(() => {
    if (open) { setStep(0); setSpotRect(null); setTipAtTop(false); }
  }, [open]);

  // Navigate + scroll + measure on step change.
  // Does NOT list pathname as a dep — read via ref so router.push()
  // changing pathname doesn't re-trigger this effect.
  useEffect(() => {
    if (!open) return;
    const s = STEPS[step];
    let cancelled = false;

    function doMeasure() {
      if (cancelled) return;

      if (!s.target) {
        setSpotRect(null);
        setTipAtTop(false);
        return;
      }

      const el = findVisibleEl(s.target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Wait for smooth scroll to settle before measuring
        setTimeout(() => { if (!cancelled) measure(); }, 260);
      } else {
        // Element not in DOM yet — retry after another 350ms
        setTimeout(() => {
          if (cancelled) return;
          const el2 = findVisibleEl(s.target);
          if (el2) {
            el2.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => { if (!cancelled) measure(); }, 260);
          } else {
            if (!cancelled) measure();
          }
        }, 350);
      }
    }

    const needsNav = s.route && pathnameRef.current !== s.route;
    if (needsNav) {
      router.push(s.route);
      // Give Next.js time to navigate, mount, and hydrate before looking for element
      const t = setTimeout(doMeasure, 850);
      return () => { cancelled = true; clearTimeout(t); };
    } else {
      const t = setTimeout(doMeasure, 150);
      return () => { cancelled = true; clearTimeout(t); };
    }
  }, [step, open, measure, router]);

  // Reset drag position when step changes (tooltip snaps back to default)
  useEffect(() => { setDragPos(null); }, [step]);

  // Drag handlers — attached to the drag-handle element
  function onDragStart(e) {
    e.preventDefault();
    const isTouch = e.type === "touchstart";
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    // Get current tooltip position from DOM
    const tooltipEl = tooltipRef.current;
    const rect = tooltipEl?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      originX: rect.left,
      originY: rect.top,
    };

    function onMove(ev) {
      if (!dragRef.current.active) return;
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = mx - dragRef.current.startX;
      const dy = my - dragRef.current.startY;
      const W  = window.innerWidth;
      const H  = window.innerHeight;
      const tw = tooltipRef.current?.offsetWidth  || TOOLTIP_W;
      const th = tooltipRef.current?.offsetHeight || 280;
      setDragPos({
        left: Math.max(8, Math.min(dragRef.current.originX + dx, W - tw - 8)),
        top:  Math.max(8, Math.min(dragRef.current.originY + dy, H - th - 8)),
      });
    }

    function onUp() {
      dragRef.current.active = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
  }

  const tooltipRef = useRef(null);

  if (!open) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isCenter = !current.target;

  function next() { if (isLast) onClose(); else setStep((s) => s + 1); }
  function back() { if (step > 0) setStep((s) => s - 1); }

  // If user has dragged the tooltip, use their chosen position; otherwise default pinning
  const tooltipStyle = dragPos
    ? { top: dragPos.top, left: dragPos.left, transform: "none" }
    : isCenter
      ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
      : tipAtTop
        ? { top: 80, left: "50%", transform: "translateX(-50%)" }
        : { bottom: 24, left: "50%", transform: "translateX(-50%)" };

  return (
    <>
      <style>{`
        @keyframes tour-spot-pulse {
          0%,100% { box-shadow: 0 0 0 3px var(--gold),      0 0 0 9999px rgba(0,0,0,0.72); }
          50%      { box-shadow: 0 0 0 6px var(--gold-deep), 0 0 0 9999px rgba(0,0,0,0.80); }
        }
        @keyframes tour-tip-in {
          from { opacity:0; transform:translateX(-50%) translateY(8px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0);   }
        }
        @keyframes tour-tip-in-top {
          from { opacity:0; transform:translateX(-50%) translateY(-8px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0);    }
        }
        @keyframes tour-center-in {
          from { opacity:0; transform:translate(-50%,-48%); }
          to   { opacity:1; transform:translate(-50%,-50%); }
        }
      `}</style>

      {/* Backdrop — sits below spotlight and tooltip, closes on click */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 58, pointerEvents: "all",
                 background: isCenter ? "rgba(0,0,0,0.82)" : "transparent" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Spotlight ring around the target element */}
      {spotRect && !isCenter && (
        <div
          style={{
            position:      "fixed",
            top:           spotRect.top    - SPOT_PAD,
            left:          spotRect.left   - SPOT_PAD,
            width:         spotRect.width  + SPOT_PAD * 2,
            height:        spotRect.height + SPOT_PAD * 2,
            borderRadius:  12,
            zIndex:        59,
            pointerEvents: "none",
            animation:     "tour-spot-pulse 2.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Tooltip — always fixed to bottom (or top, or center) of viewport; draggable */}
      <div
        ref={tooltipRef}
        key={step}
        style={{
          position:      "fixed",
          width:         TOOLTIP_W,
          maxWidth:      "calc(100vw - 24px)",
          zIndex:        60,
          pointerEvents: "all",
          animation:     dragPos ? "none" : isCenter
            ? "tour-center-in 0.22s ease forwards"
            : tipAtTop
              ? "tour-tip-in-top 0.22s ease forwards"
              : "tour-tip-in 0.22s ease forwards",
          ...tooltipStyle,
        }}
      >
        <div style={{
          background:   "var(--ink-2)",
          border:       "1px solid var(--rule)",
          borderTop:    "3px solid var(--gold)",
          borderRadius: 16,
          padding:      "18px 22px 18px",
          boxShadow:    "0 24px 72px rgba(0,0,0,0.7)",
        }}>

          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            onTouchStart={onDragStart}
            title="Drag to reposition"
            style={{
              display:       "flex",
              justifyContent:"center",
              alignItems:    "center",
              marginBottom:  12,
              cursor:        "grab",
              padding:       "2px 0 4px",
              touchAction:   "none",
              userSelect:    "none",
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--ink-3)", opacity: 0.7 }} />
          </div>

          {/* Progress pips + step counter */}
          <div style={{ display: "flex", gap: 5, marginBottom: 14, alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                title={STEPS[i].label}
                style={{
                  width:      i === step ? 22 : 6,
                  height:     6,
                  borderRadius: 3,
                  background: i < step ? "var(--green)" : i === step ? "var(--gold)" : "var(--ink-3)",
                  transition: "all 0.3s ease",
                  cursor:     "pointer",
                  flexShrink: 0,
                }}
              />
            ))}
            <span style={{ marginLeft: "auto", color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 11, whiteSpace: "nowrap" }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Section chip */}
          <div style={{ marginBottom: 8 }}>
            <span style={{
              display:       "inline-block",
              fontSize:      10,
              fontWeight:    700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color:         "var(--gold)",
              fontFamily:    "var(--font-sans)",
              background:    "rgba(169,133,79,0.13)",
              borderRadius:  4,
              padding:       "2px 8px",
            }}>
              {isCenter ? "🔒" : "↑"} {current.label}
            </span>
          </div>

          <h3 style={{
            color:        "var(--ink-text)",
            fontFamily:   "var(--font-serif)",
            fontSize:     "1.05rem",
            fontWeight:   700,
            lineHeight:   1.3,
            marginBottom: 8,
          }}>
            {current.title}
          </h3>

          <p style={{
            color:        "var(--ink-text-dim)",
            fontFamily:   "var(--font-sans)",
            fontSize:     "0.85rem",
            lineHeight:   1.65,
            marginBottom: 18,
          }}>
            {current.body}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={onClose}
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}
            >
              Skip tour
            </button>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {step > 0 && (
                <button
                  onClick={back}
                  style={{
                    background: "var(--ink-3)",
                    color:      "var(--ink-text-dim)",
                    fontFamily: "var(--font-sans)",
                    fontSize:   13,
                    fontWeight: 600,
                    border:     "1px solid var(--rule)",
                    borderRadius: 8,
                    padding:    "8px 16px",
                    cursor:     "pointer",
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                style={{
                  background:  "linear-gradient(135deg, var(--gold-deep), var(--gold))",
                  color:       "#fff",
                  fontFamily:  "var(--font-sans)",
                  fontSize:    13,
                  fontWeight:  700,
                  border:      "none",
                  borderRadius: 8,
                  padding:     "8px 22px",
                  cursor:      "pointer",
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
