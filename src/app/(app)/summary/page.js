"use client";

import { useMemo, useState, useEffect } from "react";
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
    `Late night check-in, ${n}. The kobo don't care what time it is.`,
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
    `${n}, traffic is bad either way — might as well review the budget.`,
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
    `Late evening check, ${n}! Better late than never — log those expenses.`,
    `${n}, the day is done. Let's see if the budget survived intact.`,
    `Night energy, ${n}! Future you will thank present you for opening this app tonight.`,
    `${n}, the street is quiet. Your spending history? Less quiet.`,
    `Good night soon, ${n}. But first — let's look at the receipts.`,
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
  "The word 'salary' comes from Latin 'salarium' — Roman soldiers were partly paid in salt.",
  "Compound interest doubles money in 72 ÷ interest-rate years. At 18%, that's just 4 years.",
  "Nigeria's pension fund assets exceeded ₦17 trillion in 2023 — and growing.",
  "People who track expenses spend an average of 15% less than those who don't.",
  "Treasury bills have been Nigeria's safest short-term investment since 1959.",
  "The average Nigerian household spends about 56% of income on food and food-related costs.",
  "Writing down financial goals makes you 42% more likely to achieve them.",
  "The Naira was introduced on 1 January 1973, replacing the Nigerian pound.",
  "A ₦500 daily saving at 15% annual return grows to over ₦20M in 30 years.",
  "70% of lottery winners go bankrupt within 5 years. Habits outlast windfalls.",
  "The first ATM in Nigeria was installed in 1989 by Societe Generale Bank.",
  "Emergency funds should cover 3–6 months of essential expenses — not total income.",
  "Nigeria's informal economy is estimated at 60%+ of GDP — making budgeting harder for most.",
  "Inflation in 2024 eroded Nigerian purchasing power by over 30% — idle cash loses real value.",
  "The 50/30/20 rule was popularised by US Senator Elizabeth Warren in her 2005 book.",
  "Investors who check their portfolio daily earn less than those who check quarterly.",
  "The average person makes over 35,000 financial micro-decisions per year.",
  "Automating savings is the single most effective financial habit, per behavioural economists.",
  "Nigerian banks pay 3–5% on savings accounts; treasury bills return 15–20%.",
  "Less than 10% of Nigerians have any form of life insurance.",
  "A 1% difference in investment return over 30 years can mean a 35% difference in final wealth.",
  "The CBN's Monetary Policy Rate directly influences what banks pay on deposits.",
  "Dollar cost averaging — investing fixed amounts regularly — outperforms market timing for most people.",
  "Nigeria's GSM subscriber base grew from zero to over 200 million in 20 years — the fastest in Africa.",
  "Discretionary spending is the highest-leverage area to cut when building savings.",
  "The average Nigerian worker saves less than 5% of income; the recommended minimum is 20%.",
  "Mutual funds in Nigeria became accessible to retail investors in the early 2000s.",
  "A single missed credit payment can damage your score more than 6 months of on-time payments help.",
  "Less than 10 million Nigerians have active pension contributions.",
  "Consumer debt in Nigeria is concentrated in personal loans and credit cards, not mortgages.",
  "Studies show budgeters have 20% lower financial anxiety than non-budgeters.",
  "The NGX Exchange (former NSE) has returned 12–15% annually on average over the last decade.",
  "Financial stress is the number-one cause of workplace absenteeism globally.",
  "Dollar subscriptions — Netflix, Spotify, iCloud — cost Nigerian households billions in FX annually.",
  "Nigeria processes over ₦60 trillion in electronic transactions monthly through NIBSS.",
  "The average impulse purchase decision takes just 13 seconds to make.",
  "Life assurance premiums are tax-deductible under Nigerian tax law — not many know this.",
  "People who discuss money openly with their partners fight about it 40% less.",
  "Waiting 48 hours before a purchase over ₦20,000 eliminates 70% of impulse buys.",
  "The average Nigerian in Lagos spends ₦30,000–₦50,000 per month on fuel and generator costs.",
  "Financial literacy correlates more strongly with wealth than IQ or formal education level.",
  "Housing is the single largest expense for 80% of Nigerians living in major cities.",
  "Equity markets historically outperform fixed income over any 10-year window.",
  "Less than 3% of working-age Nigerians invest in equities on the NGX.",
  "Lifestyle inflation — spending more as you earn more — is the top wealth-killer for high earners.",
  "The Cowry shell was Nigeria's currency before colonial contact with Europeans.",
  "Research shows people underestimate their monthly spending by an average of 18%.",
  "A 30-minute financial review every Sunday correlates with better outcomes over 12 months.",
  "Nigeria's foreign exchange market trades over $1 billion daily at peak periods.",
  "Dollar-denominated Eurobonds offer Nigerians a hedge against naira depreciation.",
  "Naming a savings account (e.g. 'School Fees 2026') increases deposits by 30%, studies show.",
  "Pension contributions in Nigeria are split 8% employee and 10% employer under the CPS scheme.",
  "Compound interest works both ways — credit card debt at 30% doubles every 2.4 years.",
  "The CBN's FX policy directly affects how much imported goods cost — including your food.",
  "Diversifying across equities, bonds, and cash reduces portfolio volatility significantly.",
  "FGN Bonds allow ordinary Nigerians to lend directly to the government at competitive rates.",
  "Over 60% of small business failures in Nigeria cite cash-flow problems as the primary cause.",
  "The stock market is the only place where things go on sale and everyone runs out of the store.",
  "A ₦10,000 T-bill investment every month for 10 years at 18% grows to over ₦3.5 million.",
  "Nigeria had over 50 commercial banks in the 1990s; consolidation reduced that to 25 today.",
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
      className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{
        background:  "rgba(212,160,48,0.06)",
        border:      "1px solid rgba(212,160,48,0.14)",
        transition:  "opacity 0.38s ease",
        opacity:     visible ? 1 : 0,
      }}
    >
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>💡</span>
      <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.65, margin: 0 }}>
        <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 3 }}>
          Financial fact · changes every 15s
        </span>
        {FIN_FACTS[idx]}
      </p>
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
          .app-topbar, .app-bottom-nav, [data-no-print] { display: none !important; }
          body { background: #fff !important; }
          :root { --ink-text: #000 !important; }
        }
      `}</style>

      {/* ── HERO: greeting + payday ──────────────────────────────────────
          Two things only. Greeting sets the emotional tone; payday is the
          most time-sensitive number the user cares about on first load.
      ── */}
      <div style={{ padding: "24px 24px 4px" }} className="sm:p-8 sm:pb-1">
        <div className="grid-hero">
          {/* Left: greeting */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(212,160,48,0.10) 0%, rgba(155,114,214,0.08) 100%)",
              border: "1px solid rgba(212,160,48,0.18)",
              borderRadius: 16,
              padding: "20px 24px",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <div style={{ paddingTop: 3 }}>
              <GreetingTimeIcon />
            </div>
            <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
              {getGreeting(name, greetingIdx)}
            </p>
          </div>

          {/* Right: payday widget */}
          <PaydayWidget paydayDay={goals.payday_day} salary={goals.salary} href="/goals" />
        </div>
      </div>

      {/* Financial fun fact — sits between greeting and anomaly alerts */}
      <div style={{ padding: "10px 24px 0" }} className="sm:px-8">
        <FinFunFact />
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
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {periodLabel}
              </p>
              <button
                onClick={() => window.print()}
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, padding: "4px 10px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Print / PDF
              </button>
            </div>
            <div style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, lineHeight: 1 }}>
              {formatNaira(monthOut)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {biggestCat && (
                <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 13 }}>
                  Biggest: <strong style={{ color: "var(--ink-text)" }}>{biggestCat[0]}</strong>{" "}
                  ({formatNaira(biggestCat[1], { compact: true })})
                </span>
              )}
              {prevOut > 0 && (
                <span style={{ color: deltaColor, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>
                  {deltaDir} {formatNaira(Math.abs(delta), { compact: true })} vs prior period
                </span>
              )}
            </div>
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

      {/* ── YEAR IN REVIEW ────────────────────────────────────────────────
          Standalone section — it's a major on-demand feature, not a widget
          to tuck beside the FX rates.
      ── */}
      <div id="annual-wrapped" className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--rose)" }} />
        <span className="section-divider-label" style={{ color: "var(--rose)" }}>Year in Review</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        A full-year snapshot of your financial life, generated on demand. Income, spending by category, investment growth, savings rate, and your biggest financial moments — all in one place.
      </p>

      <div className="section-body">
        <AnnualWrapped
          entries={entries}
          investments={investments}
          transactions={transactions}
          currentBalance={currentBalance}
          salary={goals.salary}
        />
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
    </div>
  );
}
