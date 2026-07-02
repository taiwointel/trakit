import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

// ── Helpers ────────────────────────────────────────────────────────────────
const M_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const M_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const D_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const D_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmt(n)     { return `₦${Number(n).toLocaleString("en-NG",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtK(n)    { return n >= 1000 ? `₦${(n/1000).toFixed(1)}k` : fmt(n); }
function fmtShort(d){ const dt=new Date(d+"T00:00:00"); return `${dt.getDate()} ${M_SHORT[dt.getMonth()]}`; }
function fmtFull(d) { const dt=new Date(d+"T00:00:00"); return `${dt.getDate()} ${M_FULL[dt.getMonth()]} ${dt.getFullYear()}`; }
function fmtDay(d)  { const dt=new Date(d+"T00:00:00"); return `${D_FULL[dt.getDay()]}, ${dt.getDate()} ${M_FULL[dt.getMonth()]} ${dt.getFullYear()}`; }

const CAT_COLORS = {
  "Food & Groceries":     "#10B981",
  "Transportation":       "#F59E0B",
  "Housing & Utilities":  "#6366F1",
  "Dining & Lifestyle":   "#EC4899",
  "Healthcare":           "#3B82F6",
  "Family & Dependents":  "#8B5CF6",
  "Debt Service":         "#EF4444",
  "Savings & Investment": "#059669",
  "Personal Care":        "#F97316",
  "Betting":              "#DC2626",
  "Miscellaneous":        "#94A3B8",
};
function catColor(cat) { return CAT_COLORS[cat] || "#A9854F"; }

// ── Coach RBC full briefing (multi-paragraph, humorous, specific) ──────────
function buildRbcBriefing({ userName, totalOut, prevTotal, categoryBreakdown, essentialTotal, discretionaryTotal, totalIn, dayBreakdown, allEntries }) {
  const paras = [];
  const weekChange = prevTotal > 0 ? Math.round(((totalOut - prevTotal) / prevTotal) * 100) : null;
  const top  = categoryBreakdown[0];
  const top2 = categoryBreakdown[1];
  const discPct = totalOut > 0 ? Math.round((discretionaryTotal / totalOut) * 100) : 0;
  const essentialPct = 100 - discPct;
  const busiestDay = dayBreakdown.reduce((a,b)=>b.total>a.total?b:a,dayBreakdown[0]||{total:0});
  const activeDays = dayBreakdown.filter(d=>d.total>0).length;
  const dailyAvg = activeDays > 0 ? totalOut / activeDays : 0;

  // Para 1 — overall verdict
  if (totalOut === 0) {
    paras.push(`${userName}, I've looked at this week's numbers and I have to say — there's nothing to look at. Zero recorded spend. Either you had a genuinely quiet week, you're living off last week's groceries, or you forgot to log things in the app. All three are valid. The ledger remains ready to receive confessions whenever you are.`);
  } else if (weekChange === null) {
    paras.push(`${userName}, first week on record — so no previous week to benchmark against. But here's what I can tell you: ${fmt(totalOut)} across ${activeDays} active day${activeDays !== 1 ? "s" : ""} gives us a daily average of ${fmtK(dailyAvg)}. That's the baseline. Every week from here is a comparison point.`);
  } else if (weekChange > 40) {
    paras.push(`${userName}. ${fmt(totalOut)}. That's ${Math.abs(weekChange)}% more than last week, and that's not a rounding error — that's a meaningful jump. Before I say anything else: was this planned? Because there's a big difference between "I knew this week would be heavy" and "wait, it's already gone." If the former, we move on. If the latter, we need to talk.`);
  } else if (weekChange > 15) {
    paras.push(`Up ${Math.abs(weekChange)}% from last week. Not alarming on its own, but worth naming. ${fmt(totalOut)} against a previous ${fmt(prevTotal)} — the gap is ${fmt(totalOut - prevTotal)}. The question is always whether that gap went somewhere intentional or somewhere accidental. The ledger knows; now you do too.`);
  } else if (weekChange < -30) {
    paras.push(`${userName}, I want you to sit with this for a moment: down ${Math.abs(weekChange)}% from last week. ${fmt(totalOut)} versus last week's ${fmt(prevTotal)} — you kept ${fmt(prevTotal - totalOut)} more in your pocket. Whether that was deliberate restraint or just a quiet week, the financial effect is the same. This is what a lighter week looks like. Remember it.`);
  } else if (weekChange < -10) {
    paras.push(`Down ${Math.abs(weekChange)}% from last week. Steady, controlled improvement — the kind that actually adds up over months without requiring you to eat plain rice for a fortnight. ${fmt(totalOut)} is a more manageable week than ${fmt(prevTotal)}. The direction is right.`);
  } else {
    paras.push(`Roughly steady week — ${weekChange > 0 ? "up" : "down"} ${Math.abs(weekChange)}% from last week's ${fmt(prevTotal)}. You came in at ${fmt(totalOut)}. Consistency is underrated: it makes planning meaningful, projections accurate, and budgets actually useful. Keep the pattern visible.`);
  }

  // Para 2 — top categories
  if (top && totalOut > 0) {
    const topPct = Math.round((top.amount / totalOut) * 100);
    const catLines = {
      "Dining & Lifestyle": `${topPct}% of this week went to Dining & Lifestyle — ${fmt(top.amount)}. Your social life is well-funded. Your savings account is watching from a distance with complicated feelings. This isn't a scolding; it's an accounting. Budget for the suya, the dinners, the everything — just make sure it's a number you chose, not a number that chose you.`,
      "Transportation": `Transportation took the top spot at ${fmt(top.amount)} (${topPct}%). Lagos doesn't have a cheap direction and you've been moving in all of them. Uber, Bolt, fuel — it all adds up to a significant weekly overhead. Worth asking: is this level of movement typical, or was this week unusually busy?`,
      "Food & Groceries": `${fmt(top.amount)} on Food & Groceries leads the week at ${topPct}%. Feeding yourself and your household is non-negotiable, the market prices are not negotiating, and I respect both of those facts. What I'll note is that over-shopping at the market is one of the quietest budget leaks there is — things expire, duplicates accumulate. Keep an eye on the frequency.`,
      "Housing & Utilities": `Housing & Utilities claimed ${topPct}% — ${fmt(top.amount)}. NEPA tokens, diesel, internet, estate dues: the recurring cost of existing in a house in Nigeria. There's very little to cut here and very little point trying. What you can do is track it so you're never surprised by it.`,
      "Family & Dependents": `Family & Dependents led this week at ${fmt(top.amount)} (${topPct}%). Being the one who shows up financially is a real form of love and a real drain on cash flow. Both things are true simultaneously. The only protection is knowing the number, which you now do.`,
      "Debt Service": `${fmt(top.amount)} to Debt Service — ${topPct}% of the week. Every one of those naira is a step closer to zero. I know it doesn't feel exciting to watch money leave for a loan, but the math is simple: this week's payments are future you's freedom. Keep going.`,
      "Savings & Investment": `Savings & Investment leads this week at ${fmt(top.amount)} (${topPct}%). I almost never get to say this, but — well done. You paid your future self first, and that's the whole game.`,
      "Betting": `Betting comes in at ${fmt(top.amount)} this week, taking ${topPct}% of your spend. I'm not here to lecture about betting — the entertainment value is real. I'm here to make sure you saw the number. ${fmt(top.amount)}. In one week. That's the number. Do with it what you will.`,
      "Personal Care": `${fmt(top.amount)} on Personal Care (${topPct}%). Showing up well-groomed, well-rested, and well-presented in the world costs money. That's not waste — that's investment in yourself. Just make sure it fits the broader picture.`,
    };
    paras.push(catLines[top.category] || `${top.category} led the week at ${fmt(top.amount)} — ${topPct}% of total spend. ${top2 ? `Second was ${top2.category} at ${fmt(top2.amount)} (${Math.round((top2.amount/totalOut)*100)}%).` : ""} These two categories together account for ${Math.round(((top.amount + (top2?.amount||0)) / totalOut) * 100)}% of the week.`);
  }

  // Para 3 — essential vs discretionary
  if (totalOut > 0) {
    if (discPct > 55) {
      paras.push(`The essential/discretionary split this week: ${essentialPct}% essential, ${discPct}% discretionary. More than half of what left your account this week was, technically, optional. That's not a verdict — context matters and some discretionary spend is genuinely important. But it is a question worth sitting with: of the ${fmt(discretionaryTotal)} discretionary spend, how much of it would you choose again?`);
    } else if (discPct < 20) {
      paras.push(`${essentialPct}% of this week's spend went to essentials. That's a lean, purposeful week — the overwhelming majority of what you spent was necessary. Whether that's a budget victory or just a quiet week is yours to judge, but the pattern is worth noting.`);
    } else {
      paras.push(`Essential vs. discretionary this week: ${essentialPct}% needs (${fmt(essentialTotal)}), ${discPct}% wants (${fmt(discretionaryTotal)}). That's a relatively balanced split. The classic 50/30 target isn't far off, which means your natural spending rhythm is closer to the textbook than most people's.`);
    }
  }

  // Para 4 — busiest day observation
  if (busiestDay && busiestDay.total > 0 && activeDays > 1) {
    const bPct = Math.round((busiestDay.total / totalOut) * 100);
    paras.push(`${busiestDay.dayFull} was your heaviest day — ${fmt(busiestDay.total)} across ${busiestDay.count} transaction${busiestDay.count === 1 ? "" : "s"}, which is ${bPct}% of the entire week's spend in a single day. If ${busiestDay.dayShort} consistently spikes like this, it's worth naming what makes that day expensive. Named patterns are controllable patterns.`);
  }

  // Para 5 — income note if any
  if (totalIn > 0) {
    const net = totalIn - totalOut;
    if (net >= 0) {
      paras.push(`The money-in side: ${fmt(totalIn)} received this week. Net position: +${fmt(net)}. You spent less than you received — which is the foundational requirement for everything else in personal finance. Everything else is details.`);
    } else {
      paras.push(`You received ${fmt(totalIn)} this week, which means the net position was ${fmt(Math.abs(net))} in the red. Spending exceeded income this week. That's survivable if it's a one-off; it becomes a pattern if it repeats. Worth watching over the next two weeks.`);
    }
  }

  // Para 6 — closing challenge
  const closers = [
    `One thing to try this coming week: before any purchase over ₦5,000, ask yourself whether it would survive a 10-minute wait. Not because the answer is always no — sometimes it's a clear yes and you move on. But the pause tends to catch the impulse buys that end up in the ledger looking lonely and purposeless.`,
    `The week is done, the numbers are in, and you've read this far — which means you're paying attention. Paying attention is the first and most important step. See you next week.`,
    `Homework for the week ahead: look at the category that surprised you most in this report. Not to cut it — just to watch it consciously for 7 days. Awareness before action.`,
    `If one thing from this report sticks, let it be the biggest transaction this week. Was it worth it? If yes, no note. If uncertain, that's the thing to examine. Not everything on the ledger deserves a second thought; but one thing usually does.`,
  ];
  paras.push(closers[new Date().getDay() % closers.length]);

  return paras;
}

// ── Email subject lines ─────────────────────────────────────────────────────
function pickSubject(weekStart, weekEnd, totalOut) {
  const opts = [
    `${fmt(totalOut)} spent — your Trakit7 weekly report is here`,
    `Coach RBC's weekly briefing: ${weekStart} – ${weekEnd}`,
    `Your week in ₦ — everything that moved, explained`,
    `The full receipts: Trakit7 weekly digest, ${weekStart}–${weekEnd}`,
    `${weekStart}–${weekEnd} money report: ${fmt(totalOut)} out, full breakdown inside`,
  ];
  return opts[new Date().getDay() % opts.length];
}

// ── Email HTML builder ──────────────────────────────────────────────────────
function buildEmailHtml({
  userName, weekStart, weekEnd,
  totalOut, totalIn, prevWeekTotal,
  categoryBreakdown, dayBreakdown, allEntries,
  essentialTotal, discretionaryTotal,
  monthTotal, monthDaysElapsed, monthTotalDays,
  budgetOverall,
}) {
  const weekChange   = prevWeekTotal > 0 ? Math.round(((totalOut - prevWeekTotal) / prevWeekTotal) * 100) : null;
  const net          = totalIn - totalOut;
  const netColor     = net >= 0 ? "#10B981" : "#EF4444";
  const activeDays   = dayBreakdown.filter(d => d.total > 0).length;
  const dailyAvg     = activeDays > 0 ? totalOut / activeDays : 0;
  const busiestDay   = dayBreakdown.reduce((a,b) => b.total > a.total ? b : a, dayBreakdown[0] || {total:0,dayShort:""});
  const maxDayTotal  = Math.max(...dayBreakdown.map(d => d.total), 1);
  const maxCatAmount = Math.max(...categoryBreakdown.map(c => c.amount), 1);
  const discPct      = totalOut > 0 ? Math.round((discretionaryTotal / totalOut) * 100) : 0;
  const essPct       = 100 - discPct;

  const rbcParas = buildRbcBriefing({
    userName, totalOut, prevTotal: prevWeekTotal,
    categoryBreakdown, essentialTotal, discretionaryTotal,
    totalIn, dayBreakdown, allEntries,
  });

  // ── Category rows ────────────────────────────────────────────────────────
  const catRows = categoryBreakdown.map((c, i) => {
    const barW  = Math.max(4, Math.round((c.amount / maxCatAmount) * 200));
    const pct   = totalOut > 0 ? Math.round((c.amount / totalOut) * 100) : 0;
    const color = catColor(c.category);
    const rowBg = i % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
    return `
<tr>
  <td style="background:${rowBg};padding:10px 16px;border-bottom:1px solid #E2E8F0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="8" style="vertical-align:middle;padding-right:8px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};"></div>
      </td>
      <td width="150" style="font-family:Arial,sans-serif;font-size:12px;color:#374151;font-weight:500;vertical-align:middle;padding-right:10px;">${c.category}</td>
      <td style="vertical-align:middle;padding-right:10px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="200" height="10" style="background:#F1F5F9;border-radius:5px;vertical-align:top;overflow:hidden;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="${barW}" height="10" style="background:${color};border-radius:5px;font-size:0;line-height:0;">&nbsp;</td>
            </tr></table>
          </td>
        </tr></table>
      </td>
      <td width="38" style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#9CA3AF;text-align:right;vertical-align:middle;padding-right:10px;">${pct}%</td>
      <td style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#111827;font-weight:700;text-align:right;white-space:nowrap;vertical-align:middle;">${fmt(c.amount)}</td>
    </tr></table>
  </td>
</tr>`;
  }).join("");

  // ── Day-by-day rows ──────────────────────────────────────────────────────
  const dayRows = dayBreakdown.map((d, i) => {
    const barW   = d.total > 0 ? Math.max(6, Math.round((d.total / maxDayTotal) * 180)) : 0;
    const isBest = d.date === busiestDay.date && d.total > 0;
    const rowBg  = i % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
    const dayColor2 = d.total === 0 ? "#E5E7EB" : isBest ? "#EF4444" : "#6366F1";
    return `
<tr>
  <td style="background:${rowBg};padding:9px 16px;border-bottom:1px solid #E2E8F0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="80" style="font-family:Arial,sans-serif;font-size:12px;color:#374151;font-weight:${isBest?"700":"400"};vertical-align:middle;">${d.dayShort} ${d.displayDate}</td>
      <td style="vertical-align:middle;padding:0 10px;">
        ${d.total > 0 ? `
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="${barW}" height="8" style="background:${dayColor2};border-radius:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr></table>` : `<span style="font-family:Arial,sans-serif;font-size:11px;color:#D1D5DB;">no spend</span>`}
      </td>
      <td width="40" style="font-family:Arial,sans-serif;font-size:11px;color:#9CA3AF;text-align:right;vertical-align:middle;padding-right:10px;">${d.total > 0 ? `${d.count} txn${d.count!==1?"s":""}` : ""}</td>
      <td width="110" style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${d.total===0?"#D1D5DB":isBest?"#EF4444":"#111827"};font-weight:${isBest?"700":"500"};text-align:right;white-space:nowrap;vertical-align:middle;">
        ${d.total > 0 ? fmt(d.total) : "—"}${isBest ? " &nbsp;🔴" : ""}
      </td>
    </tr></table>
  </td>
</tr>`;
  }).join("");

  // ── Full transaction log, grouped by date ────────────────────────────────
  const byDate = {};
  for (const e of allEntries) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }
  const sortedDates = Object.keys(byDate).sort();

  const txLogSections = sortedDates.map(date => {
    const dayEntries = byDate[date].sort((a,b) => (a.created_at||"").localeCompare(b.created_at||""));
    const dayOutTotal = dayEntries.filter(e=>e.flow==="out").reduce((s,e)=>s+Number(e.amount),0);
    const dayInTotal  = dayEntries.filter(e=>e.flow==="in").reduce((s,e)=>s+Number(e.amount),0);

    const rows = dayEntries.map((e, i) => {
      const isOut = e.flow === "out";
      const rowBg = i % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
      const color = catColor(e.category || "Miscellaneous");
      return `
<tr>
  <td style="background:${rowBg};padding:7px 16px;border-bottom:1px solid #E2E8F0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="8" style="vertical-align:middle;padding-right:8px;">
        <div style="width:6px;height:6px;border-radius:50%;background:${isOut ? color : "#10B981"};"></div>
      </td>
      <td style="vertical-align:middle;">
        <div style="font-family:Arial,sans-serif;font-size:12px;color:#111827;font-weight:500;">${e.desc || "(no description)"}</div>
        ${e.category ? `<div style="font-family:Arial,sans-serif;font-size:10px;color:#9CA3AF;margin-top:1px;">${e.category}${e.essentiality && e.essentiality !== "—" ? " · " + e.essentiality : ""}</div>` : ""}
      </td>
      <td style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${isOut?"#EF4444":"#10B981"};font-weight:700;text-align:right;white-space:nowrap;padding-left:10px;vertical-align:middle;">
        ${isOut ? "−" : "+"}${fmt(e.amount)}
      </td>
    </tr></table>
  </td>
</tr>`;
    }).join("");

    return `
<!-- Date group: ${date} -->
<tr>
  <td style="background:linear-gradient(90deg,#1E293B 0%,#334155 100%);padding:8px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.1em;">${fmtDay(date)}</td>
      <td style="text-align:right;">
        ${dayOutTotal > 0 ? `<span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#FCA5A5;">out ${fmt(dayOutTotal)}</span>` : ""}
        ${dayInTotal  > 0 ? `<span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#6EE7B7;margin-left:8px;">in ${fmt(dayInTotal)}</span>` : ""}
      </td>
    </tr></table>
  </td>
</tr>
${rows}`;
  }).join("");

  // ── Income rows ──────────────────────────────────────────────────────────
  const incomeEntries = allEntries.filter(e => e.flow === "in");
  const incomeRows = incomeEntries.map((e, i) => `
<tr>
  <td style="background:${i%2===0?"#F0FDF4":"#FFFFFF"};padding:9px 16px;border-bottom:1px solid #D1FAE5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#065F46;font-weight:600;">${e.desc || "(no description)"}</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#6B7280;margin-top:2px;">${fmtShort(e.date)}${e.beneficiary ? " · from " + e.beneficiary : ""}</div>
      </td>
      <td style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#059669;font-weight:700;text-align:right;white-space:nowrap;padding-left:10px;">+${fmt(e.amount)}</td>
    </tr></table>
  </td>
</tr>`).join("");

  // ── Projected monthly spend ──────────────────────────────────────────────
  const projectedMonthly = monthDaysElapsed > 0
    ? Math.round((monthTotal / monthDaysElapsed) * monthTotalDays)
    : 0;
  const weekSharePct = monthTotal > 0 ? Math.round((totalOut / monthTotal) * 100) : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Trakit7 — Weekly Financial Report</title>
</head>
<body style="margin:0;padding:0;background:#E2E8F0;font-family:Arial,Helvetica,sans-serif;">
<center>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#E2E8F0;">
<tr><td align="center" style="padding:24px 12px 36px;">
<table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;">

<!-- ═══ HEADER ═══ -->
<tr><td style="background:linear-gradient(135deg,#0F0A1E 0%,#1E1B4B 40%,#0F172A 100%);border-radius:20px 20px 0 0;padding:32px 40px 28px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#F5A623;letter-spacing:-0.5px;">Trakit7</div>
      <div style="font-family:Arial,sans-serif;font-size:9px;color:rgba(199,210,254,0.6);text-transform:uppercase;letter-spacing:0.18em;margin-top:4px;">Weekly Financial Report</div>
    </td>
    <td align="right" style="vertical-align:top;">
      <div style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 14px;">
        <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(199,210,254,0.8);line-height:1.6;">${weekStart}</div>
        <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(199,210,254,0.5);">to ${weekEnd}</div>
      </div>
    </td>
  </tr></table>
</td></tr>

<!-- VIVID GRADIENT BAR -->
<tr><td style="background:linear-gradient(90deg,#7C3AED 0%,#EC4899 35%,#F59E0B 65%,#10B981 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

<!-- ═══ HERO STAT ═══ -->
<tr><td style="background:linear-gradient(180deg,#0F172A 0%,#1E293B 100%);padding:40px 40px 32px;text-align:center;">
  <div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.18em;margin-bottom:12px;">Hey ${userName} — this week you spent</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:52px;font-weight:700;color:#F1F5F9;letter-spacing:-2px;line-height:1;">${fmt(totalOut)}</div>

  ${weekChange !== null ? `
  <div style="margin-top:14px;">
    <span style="display:inline-block;background:${weekChange > 0 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)"};border:1px solid ${weekChange > 0 ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"};border-radius:20px;padding:5px 14px;">
      <span style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${weekChange > 0 ? "#FCA5A5" : "#6EE7B7"};font-weight:700;">
        ${weekChange > 0 ? "↑" : "↓"} ${Math.abs(weekChange)}% vs last week (${fmt(prevWeekTotal)})
      </span>
    </span>
  </div>` : `<div style="margin-top:14px;font-family:Arial,sans-serif;font-size:12px;color:#64748B;">First week on record — no previous week to compare</div>`}

  ${totalIn > 0 ? `
  <div style="margin-top:10px;font-family:'Courier New',Courier,monospace;font-size:12px;color:#94A3B8;">
    <span style="color:#6EE7B7;">+${fmt(totalIn)} received</span>
    &nbsp;&middot;&nbsp;
    <span style="color:${netColor};">net ${net >= 0 ? "+" : ""}${fmt(net)}</span>
  </div>` : ""}
</td></tr>

<!-- ═══ QUICK STATS (4 CARDS) ═══ -->
<tr><td style="background:#0F172A;padding:0 24px 28px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td width="25%" style="padding:0 5px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);border-radius:12px;padding:14px 10px;text-align:center;">
          <div style="font-family:Arial,sans-serif;font-size:8px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Daily Avg</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#fff;font-weight:700;">${fmtK(dailyAvg)}</div>
        </td>
      </tr></table>
    </td>
    <td width="25%" style="padding:0 5px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:linear-gradient(135deg,#DC2626,#B91C1C);border-radius:12px;padding:14px 10px;text-align:center;">
          <div style="font-family:Arial,sans-serif;font-size:8px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Biggest Day</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#fff;font-weight:700;">${busiestDay.total > 0 ? busiestDay.dayShort : "—"}</div>
        </td>
      </tr></table>
    </td>
    <td width="25%" style="padding:0 5px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:linear-gradient(135deg,#059669,#047857);border-radius:12px;padding:14px 10px;text-align:center;">
          <div style="font-family:Arial,sans-serif;font-size:8px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Essential %</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#fff;font-weight:700;">${essPct}%</div>
        </td>
      </tr></table>
    </td>
    <td width="25%" style="padding:0 0 0 5px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:linear-gradient(135deg,#D97706,#B45309);border-radius:12px;padding:14px 10px;text-align:center;">
          <div style="font-family:Arial,sans-serif;font-size:8px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Days Active</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#fff;font-weight:700;">${activeDays}/7</div>
        </td>
      </tr></table>
    </td>
  </tr>
  </table>
</td></tr>

<!-- ═══ CATEGORY BREAKDOWN ═══ -->
${categoryBreakdown.length > 0 ? `
<tr><td style="background:#FFFFFF;padding:28px 0 0;">
  <div style="padding:0 24px 16px;">
    <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:0.14em;">Where Your ₦ Went</span>
    <span style="font-family:Arial,sans-serif;font-size:10px;color:#9CA3AF;margin-left:8px;">${categoryBreakdown.length} categor${categoryBreakdown.length===1?"y":"ies"}</span>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E2E8F0;">${catRows}</table>
</td></tr>` : ""}

<!-- ═══ ESSENTIAL vs DISCRETIONARY ═══ -->
${totalOut > 0 ? `
<tr><td style="background:#FFFFFF;padding:24px 24px 0;">
  <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#EC4899;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">Essential vs Discretionary</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td width="48%" style="padding-right:8px;">
      <div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border:1px solid #A7F3D0;border-radius:12px;padding:16px;">
        <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Essential Spend</div>
        <div style="font-family:'Courier New',Courier,monospace;font-size:18px;color:#065F46;font-weight:700;">${fmt(essentialTotal)}</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#6EE7B7;margin-top:4px;">${essPct}% of total spend</div>
        <div style="background:#A7F3D0;border-radius:3px;height:4px;margin-top:10px;">
          <div style="background:#059669;border-radius:3px;height:4px;width:${essPct}%;"></div>
        </div>
      </div>
    </td>
    <td width="4%"></td>
    <td width="48%" style="padding-left:8px;">
      <div style="background:linear-gradient(135deg,#FFF7ED,#FED7AA);border:1px solid #FDBA74;border-radius:12px;padding:16px;">
        <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Discretionary Spend</div>
        <div style="font-family:'Courier New',Courier,monospace;font-size:18px;color:#92400E;font-weight:700;">${fmt(discretionaryTotal)}</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#FBBF24;margin-top:4px;">${discPct}% of total spend</div>
        <div style="background:#FED7AA;border-radius:3px;height:4px;margin-top:10px;">
          <div style="background:#D97706;border-radius:3px;height:4px;width:${discPct}%;"></div>
        </div>
      </div>
    </td>
  </tr>
  </table>
</td></tr>` : ""}

<!-- ═══ DAY BY DAY ═══ -->
<tr><td style="background:#FFFFFF;padding:24px 0 0;">
  <div style="padding:0 24px 16px;">
    <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:0.14em;">Day-by-Day Breakdown</span>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E2E8F0;">${dayRows}</table>
</td></tr>

<!-- ═══ MONEY IN / INCOME ═══ -->
${incomeEntries.length > 0 ? `
<tr><td style="background:#FFFFFF;padding:24px 0 0;">
  <div style="padding:0 24px 16px;">
    <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#10B981;text-transform:uppercase;letter-spacing:0.14em;">Money Received This Week</span>
    <span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#059669;margin-left:8px;font-weight:700;">+${fmt(totalIn)}</span>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #D1FAE5;">${incomeRows}
  <tr><td style="background:#ECFDF5;padding:10px 16px;border-top:2px solid #6EE7B7;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#065F46;">Total received</td>
      <td style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#059669;font-weight:700;text-align:right;">+${fmt(totalIn)}</td>
    </tr></table>
  </td></tr>
  </table>
</td></tr>` : ""}

<!-- ═══ FULL TRANSACTION LOG ═══ -->
<tr><td style="background:#F8FAFC;padding:24px 0 0;border-top:2px solid #E2E8F0;">
  <div style="padding:0 24px 16px;">
    <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.14em;">Full Week Ledger</span>
    <span style="font-family:Arial,sans-serif;font-size:10px;color:#9CA3AF;margin-left:8px;">— every transaction, ${allEntries.length} total</span>
  </div>
  ${allEntries.length > 0 ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E2E8F0;">${txLogSections}</table>`
    : `<div style="padding:0 24px 24px;font-family:Arial,sans-serif;font-size:13px;color:#9CA3AF;font-style:italic;">No transactions recorded this week.</div>`}
</td></tr>

<!-- ═══ MONTHLY CONTEXT ═══ -->
${monthTotal > 0 ? `
<tr><td style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-top:2px solid #BFDBFE;padding:24px 40px;">
  <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">This Month So Far — ${M_FULL[new Date().getMonth()]} ${new Date().getFullYear()}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td width="33%" style="text-align:center;padding:10px;">
      <div style="font-family:Arial,sans-serif;font-size:9px;color:#3B82F6;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Month-to-Date</div>
      <div style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#1E3A8A;font-weight:700;">${fmt(monthTotal)}</div>
    </td>
    <td width="33%" style="text-align:center;padding:10px;border-left:1px solid #BFDBFE;border-right:1px solid #BFDBFE;">
      <div style="font-family:Arial,sans-serif;font-size:9px;color:#3B82F6;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">This Week's Share</div>
      <div style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#1E3A8A;font-weight:700;">${weekSharePct}%</div>
    </td>
    <td width="33%" style="text-align:center;padding:10px;">
      <div style="font-family:Arial,sans-serif;font-size:9px;color:#3B82F6;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Projected Full Month</div>
      <div style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#1E3A8A;font-weight:700;">${projectedMonthly > 0 ? fmt(projectedMonthly) : "—"}</div>
    </td>
  </tr>
  </table>
  ${budgetOverall ? `
  <div style="margin-top:14px;background:#FFFFFF;border-radius:8px;padding:12px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-family:Arial,sans-serif;font-size:11px;color:#374151;font-weight:600;">Monthly budget cap</td>
      <td style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#1D4ED8;text-align:right;">${fmt(budgetOverall)}</td>
    </tr></table>
    <div style="background:#DBEAFE;border-radius:4px;height:8px;margin-top:8px;overflow:hidden;">
      <div style="background:${monthTotal/budgetOverall>1?"#EF4444":monthTotal/budgetOverall>0.75?"#F59E0B":"#3B82F6"};height:8px;border-radius:4px;width:${Math.min(100,Math.round((monthTotal/budgetOverall)*100))}%;"></div>
    </div>
    <div style="font-family:Arial,sans-serif;font-size:10px;color:#6B7280;margin-top:6px;">${Math.round((monthTotal/budgetOverall)*100)}% of monthly budget used &middot; ${fmt(Math.max(0,budgetOverall-monthTotal))} remaining</div>
  </div>` : ""}
</td></tr>` : ""}

<!-- ═══ COACH RBC BRIEFING ═══ -->
<tr><td style="background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border-top:4px solid #F59E0B;padding:28px 40px;">
  <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:0.16em;margin-bottom:4px;">Coach RBC</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#92400E;margin-bottom:18px;line-height:1.3;">The Weekly Financial Briefing</div>
  ${rbcParas.map((p,i) => `
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#451A03;line-height:1.8;${i>0?"margin-top:16px;":""}">${p}</div>`).join("")}
</td></tr>

<!-- COLORED BOTTOM BAR -->
<tr><td style="background:linear-gradient(90deg,#10B981 0%,#3B82F6 33%,#8B5CF6 66%,#EC4899 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

<!-- ═══ FOOTER ═══ -->
<tr><td style="background:linear-gradient(135deg,#0F0A1E 0%,#1E1B4B 100%);border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#F5A623;font-weight:700;margin-bottom:6px;">Trakit7</div>
  <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(148,163,184,0.55);line-height:1.9;">
    Your personal finance tracker &middot; Keeping the receipts so you don't have to<br/>
    To turn off these weekly digests: open the app &rarr; Settings &rarr; Notifications
  </div>
</td></tr>

</table>
</td></tr>
</table>
</center>
</body>
</html>`;
}

// ── POST handler ────────────────────────────────────────────────────────────
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service is temporarily unavailable." }, { status: 503 });
  }

  const today    = new Date();
  const toDate   = today.toISOString().slice(0, 10);
  const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 6);
  const fromDate = weekAgo.toISOString().slice(0, 10);

  const prevEnd   = new Date(weekAgo); prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);  prevStart.setDate(prevEnd.getDate() - 6);

  const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`;
  const monthTotalDays = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const monthDaysElapsed = today.getDate();

  const [
    { data: entries },
    { data: prevEntries },
    { data: monthEntries },
    { data: budgetData },
  ] = await Promise.all([
    supabase.from("entries").select("*").eq("user_id", user.id)
      .gte("date", fromDate).lte("date", toDate).order("date").order("created_at"),
    supabase.from("entries").select("amount, flow").eq("user_id", user.id)
      .gte("date", prevStart.toISOString().slice(0,10)).lte("date", prevEnd.toISOString().slice(0,10)),
    supabase.from("entries").select("amount, flow, essentiality").eq("user_id", user.id)
      .gte("date", monthStart).lte("date", toDate),
    supabase.from("budgets").select("overall, category_budgets").eq("user_id", user.id).maybeSingle(),
  ]);

  const allEntries = (entries || []).sort((a,b) => a.date.localeCompare(b.date) || (a.created_at||"").localeCompare(b.created_at||""));
  const outEntries = allEntries.filter(e => e.flow === "out");
  const inEntries  = allEntries.filter(e => e.flow === "in");

  const totalOut  = outEntries.reduce((s,e) => s + Number(e.amount), 0);
  const totalIn   = inEntries.reduce((s,e)  => s + Number(e.amount), 0);
  const prevTotal = (prevEntries||[]).filter(e => e.flow==="out").reduce((s,e) => s+Number(e.amount), 0);
  const monthTotal = (monthEntries||[]).filter(e => e.flow==="out").reduce((s,e) => s+Number(e.amount), 0);

  const essentialTotal     = outEntries.filter(e => e.essentiality === "Essential").reduce((s,e) => s+Number(e.amount), 0);
  const discretionaryTotal = outEntries.filter(e => e.essentiality === "Discretionary").reduce((s,e) => s+Number(e.amount), 0);

  // Category breakdown
  const catMap = {};
  for (const e of outEntries) {
    const cat = e.category || "Miscellaneous";
    catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
  }
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a,b) => b.amount - a.amount);

  // Day-by-day breakdown (7 days)
  const dayBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(weekAgo); dt.setDate(dt.getDate() + i);
    const dateStr = dt.toISOString().slice(0, 10);
    const dayOut  = outEntries.filter(e => e.date === dateStr);
    dayBreakdown.push({
      date:        dateStr,
      dayShort:    D_SHORT[dt.getDay()],
      dayFull:     D_FULL[dt.getDay()],
      displayDate: `${dt.getDate()} ${M_SHORT[dt.getMonth()]}`,
      total:       dayOut.reduce((s,e) => s+Number(e.amount), 0),
      count:       dayOut.length,
    });
  }

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Taiwo";
  const weekStart = fmtShort(fromDate);
  const weekEnd   = fmtShort(toDate);

  const html = buildEmailHtml({
    userName,
    weekStart: fmtFull(fromDate),
    weekEnd:   fmtFull(toDate),
    totalOut, totalIn,
    prevWeekTotal: prevTotal,
    categoryBreakdown,
    dayBreakdown,
    allEntries,
    essentialTotal,
    discretionaryTotal,
    monthTotal,
    monthDaysElapsed,
    monthTotalDays,
    budgetOverall: budgetData?.overall || null,
  });

  const resend    = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Trakit7 <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from:    fromEmail,
    to:      user.email,
    subject: pickSubject(weekStart, weekEnd, totalOut),
    html,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sentTo: user.email });
}
