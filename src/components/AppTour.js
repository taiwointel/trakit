"use client";

import { useState, useEffect } from "react";

const STEPS = [
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="10" fill="var(--gold)" opacity="0.9">
          <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2s" repeatCount="indefinite" />
        </circle>
        <line x1="24" y1="4"  x2="24" y2="10" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="38" x2="24" y2="44" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="4"  y1="24" x2="10" y2="24" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="38" y1="24" x2="44" y2="24" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="9.4"  y1="9.4"  x2="13.7" y2="13.7" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="34.3" y1="34.3" x2="38.6" y2="38.6" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="38.6" y1="9.4"  x2="34.3" y2="13.7" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="13.7" y1="34.3" x2="9.4"  y2="38.6" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Welcome to Trakit7",
    body: "Your personal finance tracker built for the Nigerian professional. Let's take a 60-second tour of what you can do here.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6"  y="28" width="9"  height="14" rx="2" fill="var(--gold)" opacity="0.5" />
        <rect x="19" y="20" width="9"  height="22" rx="2" fill="var(--gold)" opacity="0.75" />
        <rect x="33" y="10" width="9"  height="32" rx="2" fill="var(--gold)" />
      </svg>
    ),
    title: "Summary — your command center",
    body: "See your salary cycle spend, liquidity coverage, Coach RBC's analysis, spending trends, and anomaly alerts all in one place.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="6" width="28" height="36" rx="3" stroke="var(--gold)" strokeWidth="2.5" fill="none" />
        <line x1="16" y1="16" x2="32" y2="16" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="22" x2="32" y2="22" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="28" x2="24" y2="28" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="35" cy="35" r="8" fill="var(--ink-2)" stroke="var(--gold)" strokeWidth="2" />
        <line x1="35" y1="31" x2="35" y2="39" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
        <line x1="31" y1="35" x2="39" y2="35" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: "Log every naira",
    body: "Add transactions manually with AI auto-categorization, or import directly from your bank statement (CSV, PDF, or screenshot).",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="18" stroke="var(--gold)" strokeWidth="2.5" fill="none" />
        <circle cx="24" cy="24" r="11" stroke="var(--gold)" strokeWidth="2" fill="none" opacity="0.6" />
        <circle cx="24" cy="24" r="4"  fill="var(--gold)" />
      </svg>
    ),
    title: "Hit your 50/30/20 targets",
    body: "Track your Needs, Wants, and Savings against your salary. Manage your emergency fund and savings goals with payoff timelines.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="18" width="32" height="22" rx="3" stroke="var(--gold)" strokeWidth="2.5" fill="none" />
        <path d="M16 18V14a8 8 0 0 1 16 0v4" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <line x1="24" y1="27" x2="24" y2="31" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="25.5" r="1.5" fill="var(--gold)" />
      </svg>
    ),
    title: "Your full portfolio",
    body: "Track T-Bills, fixed deposits, equities, savings accounts, life assurance, and pension. Monitor maturities and your net worth.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M40 8H8a3 3 0 0 0-3 3v20a3 3 0 0 0 3 3h10l6 8 6-8h10a3 3 0 0 0 3-3V11a3 3 0 0 0-3-3z" stroke="var(--gold)" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        <line x1="16" y1="20" x2="32" y2="20" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="26" x2="26" y2="26" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: "Coach RBC — your AI advisor",
    body: "Ask anything about your spending, get personalized coaching, search for investment rates, and get actionable cut recommendations.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <polygon points="24,6 28,18 42,18 31,26 35,38 24,30 13,38 17,26 6,18 20,18" fill="var(--gold)" opacity="0.85" />
      </svg>
    ),
    title: "Built-in intelligence",
    body: "Spend forecasts, anomaly alerts (when a category spikes vs your average), recurring spend detection, FX rates, and multi-currency entry.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="18" fill="var(--green)" opacity="0.15" />
        <circle cx="24" cy="24" r="18" stroke="var(--green)" strokeWidth="2.5" fill="none" />
        <polyline points="14,24 21,31 34,17" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "You're ready, Taiwo!",
    body: "Start by logging today's expenses. The more data you add, the smarter Coach RBC gets. Your financial clarity starts now.",
  },
];

export default function AppTour({ open, onClose }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  function next() {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.96)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col items-center text-center"
        style={{
          background: "var(--ink-2)",
          border: "1px solid var(--rule)",
          padding: "32px 28px 28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                width:        i === step ? 8 : 6,
                height:       i === step ? 8 : 6,
                borderRadius: "50%",
                background:   i === step ? "var(--gold)" : "var(--ink-3)",
                border:       "none",
                cursor:       "pointer",
                transition:   "all 0.2s",
                padding:      0,
              }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <div className="mb-6" style={{ minHeight: 52 }}>
          {current.icon}
        </div>

        <h2
          className="text-xl font-bold mb-3"
          style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", lineHeight: 1.3 }}
        >
          {current.title}
        </h2>

        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", maxWidth: 340 }}
        >
          {current.body}
        </p>

        <div className="flex items-center justify-between w-full">
          <button
            onClick={onClose}
            className="text-sm"
            style={{
              color:      "var(--ink-text-dim)",
              fontFamily: "var(--font-sans)",
              background: "none",
              border:     "none",
              cursor:     "pointer",
              padding:    "8px 0",
            }}
          >
            Skip tour
          </button>

          <button
            onClick={next}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--gold-deep), var(--gold))",
              color:      "#fff",
              fontFamily: "var(--font-sans)",
              border:     "none",
              cursor:     "pointer",
            }}
          >
            {isLast ? "Start tracking →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
