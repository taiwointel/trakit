"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useEntries }       from "@/hooks/useEntries";
import { useGoals }         from "@/hooks/useGoals";
import { useCashBalance }   from "@/hooks/useCashBalance";
import { closingBalance, liquidityCoverage, last14Days } from "@/lib/cashBalance";
import { formatNaira, getSalaryCycle } from "@/lib/format";

import PaydayWidget      from "@/components/summary/PaydayWidget";
import LiquidityPanel    from "@/components/summary/LiquidityPanel";
import { useUser }       from "@/hooks/useUser";
import CoachRBCPanel     from "@/components/summary/CoachRBCPanel";
import AskSpending       from "@/components/summary/AskSpending";
import WhereItWent       from "@/components/summary/WhereItWent";
import CategoryExplorer  from "@/components/summary/CategoryExplorer";
import AnalyticsRow      from "@/components/summary/AnalyticsRow";
import SpendTrendChart   from "@/components/summary/SpendTrendChart";
import { useInvestments } from "@/hooks/useInvestments";
import ForecastBanner    from "@/components/summary/ForecastBanner";
import NetWorthCard      from "@/components/summary/NetWorthCard";
import AnomalyAlerts     from "@/components/summary/AnomalyAlerts";
import RecurringPanel    from "@/components/summary/RecurringPanel";
import FXWidget          from "@/components/summary/FXWidget";
import SpendHeatmap      from "@/components/summary/SpendHeatmap";
import AnnualWrapped     from "@/components/summary/AnnualWrapped";

const GREETINGS = {
  latenight: (n) => [
    `It's late, ${n}. Logging expenses before bed? Respect.`,
    `Still up, ${n}? Your budget never sleeps either.`,
    `Late night check-in, ${n}. The kobo do not care what time it is.`,
    `${n}, it's practically tomorrow. Tomorrow's budget starts in a few hours.`,
    `Grinding late, ${n}? Make sure the spending doesn't grind just as hard.`,
    `Night shift vibe detected, ${n}. The ledger is always clocking in.`,
    `The generator is still running, ${n}? Log it before it runs dry.`,
    `Can't sleep? Maybe it's the untracked expenses haunting you, ${n}.`,
    `${n}, midnight money check. Bold. Commendable. Slightly concerning.`,
    `Late night Trakit session, ${n}. Your discipline is unmatched.`,
  ],
  morning: (n) => [
    `Good morning, ${n}! The day is young and so is your spending budget.`,
    `Rise and shine, ${n}! Log today's expenses before they log themselves.`,
    `Morning, ${n}! The only thing that should rise faster than you is your savings.`,
    `Good morning, ${n}! Hope yesterday's receipts are still fresh in your memory.`,
    `Morning, ${n}! Let's make sure the budget woke up before the spending did.`,
    `Good morning, ${n}! A new day, a new chance to not eat out three times.`,
    `Morning, ${n}! The FOMO is strong, but the savings goal is stronger.`,
    `Good morning, ${n}! Today's challenge: spend less than you earn. Classic.`,
    `${n}, morning! The Naira doesn't wait for you to finish breakfast.`,
    `Rise and grind, ${n}! And by grind I mean budget, not just spend.`,
    `Good morning, ${n}! Yesterday's expenses don't disappear with sleep.`,
    `Morning, ${n}! One coffee is fine. Three and you're funding someone else's retirement.`,
    `Good morning, ${n}! The difference between rich and broke is mostly breakfast decisions. Log yours.`,
  ],
  afternoon: (n) => [
    `Good afternoon, ${n}! How are we getting our urgent 2k today?`,
    `Afternoon, ${n}! It's not too late to pretend the morning's expenses didn't happen. Log them anyway.`,
    `Hey ${n}, good afternoon! The suya was 100% worth it. Now let's log it.`,
    `Good afternoon, ${n}! The numbers don't lie, but they do need to be recorded first.`,
    `Afternoon, ${n}! Your future self is watching. Make them proud.`,
    `Good afternoon, ${n}! The lunch budget is either a friend or a warning sign right now.`,
    `Afternoon check-in, ${n}! No judgment. Log the shawarma. It counts.`,
    `Hey ${n}! How is the pocket holding up this afternoon?`,
    `Good afternoon, ${n}! Productivity peaks in the afternoon. So does impulse buying.`,
    `${n}, traffic is bad either way. Might as well review the budget.`,
    `Good afternoon, ${n}! The government cannot fix the economy, but you can fix this budget.`,
    `Afternoon, ${n}! People who check their spending midday spend less. You're doing the right thing.`,
    `Good afternoon, ${n}! Is the account balance where you expected it? Let's find out.`,
  ],
  evening: (n) => [
    `Good evening, ${n}! Time to review today's financial adventures.`,
    `Evening, ${n}! The market is closed. Your spending tab, however, is still open.`,
    `Good evening, ${n}! Payday is coming. We just need to make sure there's room for it.`,
    `Evening, ${n}! How are we doing? Let's see what the ledger says.`,
    `Hey ${n}, good evening! Let's debrief before the day escapes your wallet entirely.`,
    `Good evening, ${n}! Quick check: did today's spending match today's plan?`,
    `Evening, ${n}! The hardest financial habit? Logging expenses before Netflix wins.`,
    `${n}, NEPA took the light but they cannot take your budget discipline.`,
    `Good evening, ${n}! Dinner plans sorted? Make sure the budget is just as settled.`,
    `Evening vibes, ${n}. Today's transactions are waiting for their moment of judgment.`,
    `${n}, good evening! You worked hard today. Let's see if the money kept up.`,
    `Evening, ${n}! Fuel is expensive. So is not knowing where your money went.`,
    `Good evening, ${n}! The day is almost done. Let's count the kobo.`,
  ],
  night: (n) => [
    `Good night, ${n}! One last expense check before the dream of financial freedom.`,
    `Night owl energy, ${n}! Your savings rate won't track itself.`,
    `Still at it, ${n}? Log the damage and get some rest.`,
    `Night shift vibes, ${n}. The budget is always clocking in.`,
    `${n}, almost midnight. How did the kobo move today?`,
    `Late evening check, ${n}! Better late than never. Log those expenses.`,
    `${n}, the day is done. Let's see if the budget survived intact.`,
    `Night energy, ${n}! Future you will thank present you for opening this app tonight.`,
    `${n}, the street is quiet. Your spending history? Less quiet.`,
    `Good night soon, ${n}. But first, let's look at the receipts.`,
    `${n}, logging expenses before sleep is peak financial maturity. We see you.`,
  ],
};

function getGreeting(name, idx) {
  const firstName = (name || "").split(" ")[0] || "Taiwo";
  const h = new Date().getHours();
  const key = h < 5 ? "latenight" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  const arr = GREETINGS[key](firstName);
  return arr[idx % arr.length];
}

/* ── Financial fun facts — rotates every 15s ─────────────────── */
const FIN_FACTS = [
  "The word 'salary' comes from Latin 'salarium'. Roman soldiers were partly paid in salt.",
  "Compound interest doubles money in 72 divided by your interest rate years. At 18%, that's just 4 years.",
  "Nigeria's pension fund assets exceeded 17 trillion naira in 2023, and it keeps growing.",
  "People who track expenses spend an average of 15% less than those who don't.",
  "Treasury bills have been Nigeria's safest short-term investment since 1959.",
  "The average Nigerian household spends about 56% of income on food and food-related costs.",
  "Writing down financial goals makes you 42% more likely to achieve them.",
  "The Naira was introduced on 1 January 1973, replacing the Nigerian pound.",
  "A 500 naira daily saving at 15% annual return grows to over 20 million naira in 30 years.",
  "70% of lottery winners go bankrupt within 5 years. Habits outlast windfalls.",
  "The first ATM in Nigeria was installed in 1989 by Societe Generale Bank.",
  "Emergency funds should cover 3 to 6 months of essential expenses, not total income.",
  "Nigeria's informal economy is estimated at 60%+ of GDP, which makes budgeting harder for most people.",
  "Inflation in 2024 eroded Nigerian purchasing power by over 30%. Idle cash loses real value.",
  "The 50/30/20 rule was popularised by US Senator Elizabeth Warren in her 2005 book.",
  "Investors who check their portfolio daily earn less than those who check quarterly.",
  "The average person makes over 35,000 financial micro-decisions per year.",
  "Automating savings is the single most effective financial habit, per behavioural economists.",
  "Nigerian banks pay 3 to 5% on savings accounts. Treasury bills return 15 to 20%.",
  "Less than 10% of Nigerians have any form of life insurance.",
  "A 1% difference in investment return over 30 years can mean a 35% difference in final wealth.",
  "The CBN's Monetary Policy Rate directly influences what banks pay on deposits.",
  "Dollar cost averaging, investing fixed amounts regularly, outperforms market timing for most people.",
  "Nigeria's GSM subscriber base grew from zero to over 200 million in 20 years. The fastest in Africa.",
  "Discretionary spending is the highest-leverage area to cut when building savings.",
  "The average Nigerian worker saves less than 5% of income. The recommended minimum is 20%.",
  "Mutual funds in Nigeria became accessible to retail investors in the early 2000s.",
  "A single missed credit payment can damage your score more than 6 months of on-time payments help.",
  "Less than 10 million Nigerians have active pension contributions.",
  "Consumer debt in Nigeria is concentrated in personal loans and credit cards, not mortgages.",
  "Studies show budgeters have 20% lower financial anxiety than non-budgeters.",
  "The NGX Exchange (formerly NSE) has returned 12 to 15% annually on average over the last decade.",
  "Financial stress is the number-one cause of workplace absenteeism globally.",
  "Dollar subscriptions like Netflix, Spotify, and iCloud cost Nigerian households billions in FX annually.",
  "Nigeria processes over 60 trillion naira in electronic transactions monthly through NIBSS.",
  "The average impulse purchase decision takes just 13 seconds to make.",
  "Life assurance premiums are tax-deductible under Nigerian tax law. Not many people know this.",
  "People who discuss money openly with their partners fight about it 40% less.",
  "Waiting 48 hours before a purchase over 20,000 naira eliminates 70% of impulse buys.",
  "The average Nigerian in Lagos spends 30,000 to 50,000 naira per month on fuel and generator costs.",
  "Financial literacy correlates more strongly with wealth than IQ or formal education level.",
  "Housing is the single largest expense for 80% of Nigerians living in major cities.",
  "Equity markets historically outperform fixed income over any 10-year window.",
  "Less than 3% of working-age Nigerians invest in equities on the NGX.",
  "Lifestyle inflation, spending more as you earn more, is the top wealth-killer for high earners.",
  "The Cowry shell was Nigeria's currency before colonial contact with Europeans.",
  "Research shows people underestimate their monthly spending by an average of 18%.",
  "A 30-minute financial review every Sunday correlates with better outcomes over 12 months.",
  "Nigeria's foreign exchange market trades over $1 billion daily at peak periods.",
  "Dollar-denominated Eurobonds offer Nigerians a hedge against naira depreciation.",
  "Naming a savings account, for example 'School Fees 2026', increases deposits by 30% per studies.",
  "Pension contributions in Nigeria are split: 8% employee and 10% employer under the CPS scheme.",
  "Compound interest works both ways. Credit card debt at 30% doubles every 2.4 years.",
  "The CBN's FX policy directly affects how much imported goods cost, including your food.",
  "Diversifying across equities, bonds, and cash reduces portfolio volatility significantly.",
  "FGN Bonds allow ordinary Nigerians to lend directly to the government at competitive rates.",
  "Over 60% of small business failures in Nigeria cite cash-flow problems as the primary cause.",
  "The stock market is the only place where things go on sale and everyone runs out of the store.",
  "A 10,000 naira T-bill investment every month for 10 years at 18% grows to over 3.5 million naira.",
  "Nigeria had over 50 commercial banks in the 1990s. Consolidation reduced that to 25 today.",
];

function FinFunFact() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * FIN_FACTS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % FIN_FACTS.length);
        setVisible(true);
      }, 380);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex items-start gap-2"
      style={{ transition: "opacity 0.38s ease", opacity: visible ? 1 : 0 }}
    >
      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1, opacity: 0.7 }}>💡</span>
      <p style={{ color: "rgba(236,233,225,0.55)", fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
        {FIN_FACTS[idx]}
      </p>
    </div>
  );
}

/* ── Live FX rates — polls every 5 min, shows ▲/▼ on change ─────── */
function FXRatesInline() {
  const ratesRef = useRef(null);
  const [rates, setRates]   = useState(null);
  const [prev,  setPrev]    = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/fx-rates");
        const data = await res.json();
        if (data?.usdNgn) {
          setPrev(ratesRef.current);
          ratesRef.current = data;
          setRates(data);
        }
      } catch { /* silent — widget just stays empty */ }
    }
    load();
    const t = setInterval(load, 300_000); // 5 min
    return () => clearInterval(t);
  }, []);

  if (!rates) return null;

  const pairs = [
    { label: "USD", value: rates.usdNgn, prevVal: prev?.usdNgn, symbol: "$" },
    { label: "EUR", value: rates.eurNgn, prevVal: prev?.eurNgn, symbol: "€" },
    { label: "GBP", value: rates.gbpNgn, prevVal: prev?.gbpNgn, symbol: "£" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "var(--green)", display: "inline-block",
          boxShadow: "0 0 4px var(--green)",
        }} />
        <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Live rates (NGN)
        </span>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {pairs.map(({ label, value, prevVal }) => {
          const diff = prevVal ? value - prevVal : 0;
          const arrow = diff > 0.5 ? "▲" : diff < -0.5 ? "▼" : null;
          const arrowColor = diff > 0.5 ? "var(--red)" : "var(--green)";
          return (
            <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700 }}>
                {label}
              </span>
              <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700 }}>
                {Math.round(value).toLocaleString("en-NG")}
              </span>
              {arrow && (
                <span style={{ color: arrowColor, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700 }}>
                  {arrow}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GreetingTimeIcon() {
  const h = new Date().getHours();
  const isNight = h < 6 || h >= 21;
  if (isNight) {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        style={{ color: "#9DA3C8", filter: "drop-shadow(0 0 6px rgba(157,163,200,0.55))", flexShrink: 0 }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="rgba(157,163,200,0.18)" />
      </svg>
    );
  }
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "#E8920A", filter: "drop-shadow(0 0 8px rgba(232,146,10,0.65))", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="5" fill="rgba(232,146,10,0.2)" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export default function SummaryPage() {
  const [greetingIdx] = useState(() => Math.floor(Math.random() * 100));

  const { entries, loading: entriesLoading } = useEntries();
  const { goals,   loading: goalsLoading   } = useGoals();
  const { anchor,  loading: cashLoading    } = useCashBalance();
  const { name }                             = useUser();
  const { investments, transactions }        = useInvestments();

  const today     = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const cycle = useMemo(
    () => getSalaryCycle(goals.payday_day),
    [goals.payday_day],
  );
  const cycleStart = cycle?.start || `${thisMonth}-01`;

  const cycleEntries = useMemo(
    () => entries.filter((e) => e.date >= cycleStart && e.date <= today),
    [entries, cycleStart, today],
  );

  const currentBalance = useMemo(
    () => closingBalance(entries, anchor.anchor_date, anchor.anchor_amount, today),
    [entries, anchor, today],
  );

  const avgEssential = useMemo(() => {
    const now = new Date();
    const samples = [];
    for (let i = 1; i <= 3; i++) {
      const m    = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      const total = entries
        .filter((e) => e.date?.startsWith(mStr) && e.flow === "out" && e.essentiality === "Essential")
        .reduce((s, e) => s + Number(e.amount), 0);
      if (total > 0) samples.push(total);
    }
    return samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
  }, [entries]);

  const months     = useMemo(() => liquidityCoverage(entries, currentBalance), [entries, currentBalance]);
  const sparkRows  = useMemo(() => last14Days(entries, anchor.anchor_date, anchor.anchor_amount), [entries, anchor]);

  const monthOut   = cycleEntries.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const cycleIn    = cycleEntries.filter((e) => e.flow === "in").reduce((s, e) => s + Number(e.amount), 0);
  const cycleTxCount = cycleEntries.filter((e) => e.flow === "out").length;

  const cycleDaysElapsed = useMemo(() => {
    const a = new Date(cycleStart + "T00:00:00");
    const b = new Date(today    + "T00:00:00");
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [cycleStart, today]);

  const cycleDaysTotal = useMemo(() => {
    if (!cycle) return 30;
    const a = new Date(cycle.start + "T00:00:00");
    const b = new Date(cycle.end   + "T00:00:00");
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [cycle]);

  const cycleDailyAvg = cycleDaysElapsed > 0 ? monthOut / cycleDaysElapsed : 0;

  const cycleEssential = useMemo(
    () => cycleEntries.filter((e) => e.flow === "out" && e.essentiality === "Essential").reduce((s, e) => s + Number(e.amount), 0),
    [cycleEntries]
  );
  const cycleDiscretionary = useMemo(
    () => cycleEntries.filter((e) => e.flow === "out" && e.essentiality === "Discretionary").reduce((s, e) => s + Number(e.amount), 0),
    [cycleEntries]
  );
  const essPct  = monthOut > 0 ? Math.round((cycleEssential / monthOut) * 100) : 0;
  const discPct = monthOut > 0 ? Math.round((cycleDiscretionary / monthOut) * 100) : 0;

  const byCategory = useMemo(() => {
    const m = {};
    cycleEntries.filter((e) => e.flow === "out" && e.category).forEach((e) => {
      m[e.category] = (m[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(m).sort(([, a], [, b]) => b - a);
  }, [cycleEntries]);
  const biggestCat = byCategory[0];

  const prevOut = useMemo(() => {
    if (!cycle) {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      const pm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return entries.filter((e) => e.date?.startsWith(pm) && e.flow === "out")
                    .reduce((s, e) => s + Number(e.amount), 0);
    }
    const cs = new Date(cycle.start + "T00:00:00");
    const ce = new Date(cs); ce.setDate(ce.getDate() - 1);
    const ps = new Date(cs); ps.setDate(ps.getDate() - (new Date(cycle.end + "T00:00:00") - cs) / 86400000 - 1);
    const prevStart = ps.toISOString().slice(0, 10);
    const prevEnd   = ce.toISOString().slice(0, 10);
    return entries.filter((e) => e.flow === "out" && e.date >= prevStart && e.date <= prevEnd)
                  .reduce((s, e) => s + Number(e.amount), 0);
  }, [entries, cycle]);

  const delta      = monthOut - prevOut;
  const deltaDir   = delta > 0 ? "▲" : delta < 0 ? "▼" : "";
  const deltaColor = delta > 0 ? "var(--red)" : "var(--green)";
  const periodLabel = cycle ? `Salary cycle: ${cycle.label}` : "This month";

  if (entriesLoading || goalsLoading || cashLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="page-root">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .app-topbar, .app-bottom-nav, .page-root, [data-no-print] { display: none !important; }
          #print-report { display: block !important; }
          body { background: #0F172A !important; margin: 0 !important; padding: 0 !important; }
          @page { margin: 0; size: A4 portrait; }
        }
        #print-report { display: none; }
      `}</style>

      {/* ── PRINT REPORT ── hidden on screen, shown on print ────────────────── */}
      <div id="print-report" style={{ fontFamily: "Arial, Helvetica, sans-serif", background: "#0F172A", color: "#ECE9E1", minHeight: "100vh", padding: "0" }}>
        {/* Header band */}
        <div style={{ background: "linear-gradient(135deg, #0F0A1E 0%, #1E1B4B 50%, #0F172A 100%)", padding: "32px 40px 24px", borderBottom: "3px solid #A9854F" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, color: "#F5A623", letterSpacing: -0.5 }}>Trakit7</div>
              <div style={{ fontSize: 12, color: "rgba(199,210,254,0.7)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Financial Report · {periodLabel}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", letterSpacing: "0.04em" }}>Generated</div>
              <div style={{ fontSize: 12, color: "#A9854F", fontFamily: "Courier New, monospace", marginTop: 2 }}>
                {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              {name && <div style={{ fontSize: 11, color: "rgba(148,163,184,0.55)", marginTop: 2 }}>{name}</div>}
            </div>
          </div>
        </div>

        {/* Gradient bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg,#7C3AED 0%,#EC4899 35%,#F59E0B 65%,#10B981 100%)" }} />

        {/* Hero stat */}
        <div style={{ padding: "36px 40px 28px", background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 10 }}>Total Expenses</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 52, fontWeight: 700, color: "#F1F5F9", letterSpacing: -2, lineHeight: 1 }}>{formatNaira(monthOut)}</div>
          {prevOut > 0 && (
            <div style={{ marginTop: 12 }}>
              <span style={{ display: "inline-block", background: delta > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)", border: `1px solid ${delta > 0 ? "rgba(239,68,68,0.35)" : "rgba(16,185,129,0.35)"}`, borderRadius: 20, padding: "4px 14px" }}>
                <span style={{ fontFamily: "Courier New, monospace", fontSize: 13, color: delta > 0 ? "#FCA5A5" : "#6EE7B7", fontWeight: 700 }}>
                  {delta > 0 ? "↑" : "↓"} {formatNaira(Math.abs(delta))} vs prior period
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Quick stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { label: "Transactions", value: `${cycleTxCount}` },
            { label: "Daily Average", value: formatNaira(cycleDailyAvg, { compact: true }) },
            { label: "Essential", value: `${essPct}%` },
            { label: "Income In", value: cycleIn > 0 ? formatNaira(cycleIn, { compact: true }) : "—" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "18px 20px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none", background: i % 2 === 0 ? "#1E293B" : "#0F172A" }}>
              <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: "Courier New, monospace", fontSize: 17, color: "#F1F5F9", fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {/* Category breakdown */}
          <div style={{ padding: "28px 32px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 16 }}>Where it went</div>
            {byCategory.slice(0, 8).map(([cat, amt], idx) => {
              const pct = monthOut > 0 ? (amt / monthOut) * 100 : 0;
              const colors = ["#A9854F","#5B8FA8","#7C8C5B","#A8645B","#8A6FA8","#A89A5B","#5BA88A","#A85B86"];
              const color  = colors[idx % colors.length];
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 11.5, color: idx < 3 ? "#ECE9E1" : "rgba(236,233,225,0.6)", fontWeight: idx < 3 ? 600 : 400 }}>{cat}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontFamily: "Courier New, monospace" }}>{pct.toFixed(0)}%</span>
                      <span style={{ fontSize: 12, color, fontFamily: "Courier New, monospace", fontWeight: 700 }}>{formatNaira(amt, { compact: true })}</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                    <div style={{ height: 5, width: `${pct}%`, background: color, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right column: essential/disc split + cash */}
          <div style={{ padding: "28px 32px" }}>
            <div style={{ fontSize: 10, color: "#EC4899", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 16 }}>Essential vs Discretionary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "14px" }}>
                <div style={{ fontSize: 9, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Essential</div>
                <div style={{ fontFamily: "Courier New, monospace", fontSize: 16, color: "#6EE7B7", fontWeight: 700 }}>{formatNaira(cycleEssential, { compact: true })}</div>
                <div style={{ fontSize: 11, color: "rgba(110,231,183,0.6)", marginTop: 3 }}>{essPct}% of spend</div>
              </div>
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "14px" }}>
                <div style={{ fontSize: 9, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Discretionary</div>
                <div style={{ fontFamily: "Courier New, monospace", fontSize: 16, color: "#FCD34D", fontWeight: 700 }}>{formatNaira(cycleDiscretionary, { compact: true })}</div>
                <div style={{ fontSize: 11, color: "rgba(252,211,77,0.6)", marginTop: 3 }}>{discPct}% of spend</div>
              </div>
            </div>

            <div style={{ fontSize: 10, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 14 }}>Cash &amp; Liquidity</div>
            {[
              { label: "Current Balance", value: formatNaira(currentBalance) },
              { label: "Avg Monthly Essentials", value: avgEssential ? formatNaira(avgEssential, { compact: true }) : "—" },
              { label: "Liquidity Coverage", value: `${months?.toFixed(1) ?? "0.0"} months` },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 11.5, color: "rgba(148,163,184,0.7)" }}>{r.label}</span>
                <span style={{ fontFamily: "Courier New, monospace", fontSize: 12, color: "#F1F5F9", fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}

            {cycleIn > 0 && (
              <div style={{ marginTop: 20, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 10, padding: "14px" }}>
                <div style={{ fontSize: 9, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Income This Cycle</div>
                <div style={{ fontFamily: "Courier New, monospace", fontSize: 16, color: "#6EE7B7", fontWeight: 700 }}>+{formatNaira(cycleIn)}</div>
                <div style={{ fontSize: 11, color: "rgba(110,231,183,0.6)", marginTop: 3 }}>
                  Net: {cycleIn >= monthOut ? "+" : ""}{formatNaira(cycleIn - monthOut)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "linear-gradient(135deg, #0F0A1E, #1E1B4B)", padding: "20px 40px", textAlign: "center", borderTop: "1px solid rgba(169,133,79,0.2)" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#F5A623", fontWeight: 700, marginBottom: 4 }}>Trakit7</div>
          <div style={{ fontSize: 10, color: "rgba(148,163,184,0.45)", letterSpacing: "0.04em" }}>Your personal finance tracker · trakit-seven.vercel.app</div>
        </div>
        {/* Bottom colour bar */}
        <div style={{ height: 4, background: "linear-gradient(90deg,#10B981 0%,#3B82F6 33%,#8B5CF6 66%,#EC4899 100%)" }} />
      </div>

      {/* ── HERO: greeting + payday ──────────────────────────────────────
          Two things only. Greeting sets the emotional tone; payday is the
          most time-sensitive number the user cares about on first load.
      ── */}
      <div style={{ padding: "24px 24px 4px" }} className="sm:p-8 sm:pb-1" data-tour="summary-headline">
        <div className="grid-hero">
          {/* Left: greeting */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(212,160,48,0.10) 0%, rgba(155,114,214,0.08) 100%)",
              border: "1px solid rgba(212,160,48,0.18)",
              borderRadius: 16,
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ paddingTop: 4, flexShrink: 0 }}>
                <GreetingTimeIcon />
              </div>
              <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "clamp(1.1rem, 2.2vw, 1.35rem)", fontWeight: 700, lineHeight: 1.45, margin: 0 }}>
                {getGreeting(name, greetingIdx)}
              </p>
            </div>
            <FXRatesInline />
            <FinFunFact />
          </div>

          {/* Right: payday widget */}
          <PaydayWidget paydayDay={goals.payday_day} salary={goals.salary} href="/goals" />
        </div>
      </div>

      {/* Anomaly alerts sit right below the hero — urgent items need
          to be the first thing the eye catches after orientation. */}
      <div style={{ padding: "12px 24px 0" }} className="sm:px-8">
        <AnomalyAlerts
          entries={entries}
          cycleStart={cycleStart}
          cycle={cycle}
          today={today}
        />
      </div>

      {/* ── YOUR NUMBERS ──────────────────────────────────────────────────
          Status first: what is my current financial position?
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Your Numbers</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        How much you have spent since payday, what is sitting in your account right now, how many months that cash would cover your essential bills if your income stopped today, and your total net worth across cash and investments. Four numbers, full picture.
      </p>

      <div className="section-body">
        <div className="grid-2">
          {/* Headline spend */}
          <div
            style={{
              background: "var(--ink-2)",
              border: "1px solid var(--rule)",
              borderRadius: 16,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                {periodLabel}
              </p>
              <button
                onClick={() => window.print()}
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, padding: "4px 10px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Print / PDF
              </button>
            </div>

            {/* Label + amount */}
            <div>
              <p style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 4 }}>
                Total Expenses
              </p>
              <div style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, lineHeight: 1 }}>
                {formatNaira(monthOut)}
              </div>
            </div>

            {/* vs prior period */}
            {prevOut > 0 && (
              <span style={{ color: deltaColor, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
                {deltaDir} {formatNaira(Math.abs(delta), { compact: true })} vs prior period
              </span>
            )}

            {/* Quick stats strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 2 }}>
              {[
                { label: "Transactions", value: `${cycleTxCount}` },
                { label: "Daily avg", value: formatNaira(cycleDailyAvg, { compact: true }) },
                { label: "Essential", value: `${essPct}%` },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", borderRadius: 10, padding: "8px 10px" }}>
                  <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{s.label}</p>
                  <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Top 3 categories */}
            {byCategory.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Top categories</p>
                {byCategory.slice(0, 3).map(([cat, amt], idx) => {
                  const pct    = monthOut > 0 ? (amt / monthOut) * 100 : 0;
                  const colors = ["#A9854F", "#5B8FA8", "#7C8C5B"];
                  const color  = colors[idx];
                  return (
                    <div key={cat}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 600 }}>{cat}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 10 }}>{pct.toFixed(0)}%</span>
                          <span style={{ color, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>{formatNaira(amt, { compact: true })}</span>
                        </div>
                      </div>
                      <div style={{ height: 4, background: "var(--ink-3)", borderRadius: 2 }}>
                        <div style={{ height: 4, width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Income this cycle */}
            {cycleIn > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "rgba(47,122,86,0.08)", border: "1px solid rgba(47,122,86,0.2)", borderRadius: 10, marginTop: 2 }}>
                <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11 }}>Income this cycle</span>
                <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>+{formatNaira(cycleIn, { compact: true })}</span>
              </div>
            )}
          </div>

          <LiquidityPanel
            balance={currentBalance}
            avgMonthlyEssential={avgEssential}
            months={months}
            sparkRows={sparkRows}
          />
        </div>

        <NetWorthCard
          cashBalance={currentBalance}
          investments={investments}
          transactions={transactions}
        />
      </div>

      {/* ── SPEND BREAKDOWN ───────────────────────────────────────────────
          Charts come before the coach analysis — visuals give instant
          gratification with no click/wait. Users see where money went,
          then naturally want the coach's take on it.
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--teal)" }} />
        <span className="section-divider-label" style={{ color: "var(--teal)" }}>Spend Breakdown</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        The pie chart shows what share of your spending each category took this cycle so you can see at a glance if Dining is eating 30% while Savings barely registers. The trend chart shows whether you spent harder at the start or end of the cycle. Click any category row in the explorer below to expand it and see every individual transaction that went into the total.
      </p>

      <div className="section-body">
        <div className="grid-2">
          <WhereItWent entries={cycleEntries} />
          <SpendTrendChart entries={entries} from={cycleStart} to={today} />
        </div>
        <CategoryExplorer entries={cycleEntries} />
        <AnalyticsRow entries={entries} />
      </div>

      {/* ── COACH RBC ─────────────────────────────────────────────────────
          Advice follows the visual breakdown — users have already seen
          where money went, so they're primed to hear what to do about it.
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Coach RBC</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Pick a date range, hit Get Coached, and Coach RBC reads your actual transaction data and writes a structured briefing in seconds. You get concrete findings like which category jumped 40% versus last period and a specific cut list with naira estimates attached. No generic advice. Switch to the Chat tab to upload a bank statement or ask her a follow-up question about anything she flagged.
      </p>

      <div className="section-body">
        <CoachRBCPanel
          entries={entries}
          cashBalance={currentBalance}
          salary={goals.salary}
          paydayDay={goals.payday_day}
        />
        <AskSpending entries={entries} />
      </div>

      {/* ── OUTLOOK ───────────────────────────────────────────────────────
          Forward-looking tools: cycle forecast, FX rates, annual review.
          Below the coach because they require deliberate engagement
          (clicking "Generate forecast", checking FX rates manually).
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--violet)" }} />
        <span className="section-divider-label" style={{ color: "var(--violet)" }}>Outlook</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        The spend forecast tells you if your current daily spending rate will drain your salary account before the next payday and by exactly how much. The FX widget pulls live USD, GBP, and Euro rates in Naira so you can make dollar-linked decisions without leaving the app.
      </p>

      <div className="section-body">
        <ForecastBanner
          cycleStart={cycleStart}
          cycleEnd={cycle?.end || today}
          salary={goals.salary}
          entries={entries}
          today={today}
        />
        <FXWidget />
      </div>

      {/* ── HISTORY & PATTERNS ────────────────────────────────────────────
          Long-run patterns for users who want to go deeper.
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--amber)" }} />
        <span className="section-divider-label" style={{ color: "var(--amber)" }}>History &amp; Patterns</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        The recurring panel scans your transactions and flags entries that repeat monthly at similar amounts, like subscriptions, standing orders, and regular transfers, so you can see your committed overhead in one place without hunting through the ledger. The heatmap shows spending intensity across the calendar so you can spot which days or weeks you consistently overspend and plan around them.
      </p>

      <div className="section-body">
        <RecurringPanel entries={entries} />
        <SpendHeatmap entries={entries} />
      </div>

      {/* ── YEAR IN REVIEW ────────────────────────────────────────────────
          Grand finale — 7-chapter annual story, always last.
      ── */}
      <div id="annual-wrapped" className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--rose)" }} />
        <span className="section-divider-label" style={{ color: "var(--rose)" }}>Year in Review</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Seven chapters. One year. Your complete financial story — monthly trajectory, category breakdown, spending habits, hall-of-records moments, needs vs. wants split, and a personalised savings score — all generated from your own ledger data.
      </p>

      <div className="section-body">
        <AnnualWrapped
          entries={entries}
          salary={goals.salary}
        />
      </div>
    </div>
  );
}
