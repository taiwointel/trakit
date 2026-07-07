import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  "Charges":              "#94A3B8",
};
function catColor(cat) { return CAT_COLORS[cat] || "#A9854F"; }

// ── Coach RBC briefing — AI-generated, specific to this week's actual data ──
async function generateRbcBriefing({ settings, userName, totalOut, prevTotal, categoryBreakdown, essentialTotal, discretionaryTotal, totalIn, dayBreakdown, allEntries, weekStart, weekEnd }) {
  const weekChange  = prevTotal > 0 ? Math.round(((totalOut - prevTotal) / prevTotal) * 100) : null;
  const activeDays  = dayBreakdown.filter(d => d.total > 0).length;
  const dailyAvg    = activeDays > 0 ? totalOut / activeDays : 0;
  const discPct     = totalOut > 0 ? Math.round((discretionaryTotal / totalOut) * 100) : 0;
  const essPct      = 100 - discPct;
  const busiestDay  = dayBreakdown.reduce((a, b) => b.total > a.total ? b : a, dayBreakdown[0] || { total: 0 });
  const biggestTxns = [...allEntries].filter(e => e.flow === "out" && e.category !== "Self").sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);

  const PERSONA = `You are Coach RBC, a sharp, direct, warmly funny personal finance coach. Your client is ${userName}. You know Nigerian financial life intimately: naira volatility, NEPA bills, PFAs, T-Bills, Bolt receipts that would make a grown adult weep. Your humor is precise and earned. You roast gently. You celebrate genuinely. You are never preachy, never generic. Every sentence earns its place.`;

  const context = [
    `Week: ${weekStart} to ${weekEnd}`,
    `Total spent: ${fmt(totalOut)}`,
    weekChange !== null
      ? `vs last week (${fmt(prevTotal)}): ${weekChange > 0 ? "+" : ""}${weekChange}%`
      : "First week on record (no prior week to compare)",
    `Daily average: ${fmtK(dailyAvg)} across ${activeDays} active day${activeDays !== 1 ? "s" : ""}`,
    `Category breakdown: ${categoryBreakdown.slice(0, 5).map(c => `${c.category} ${fmt(c.amount)} (${Math.round((c.amount / (totalOut || 1)) * 100)}%)`).join("; ")}`,
    `Essential spend: ${fmt(essentialTotal)} (${essPct}%)`,
    `Discretionary spend: ${fmt(discretionaryTotal)} (${discPct}%)`,
    `Busiest day: ${busiestDay.dayFull || "n/a"} at ${fmt(busiestDay.total)} across ${busiestDay.count || 0} transactions`,
    totalIn > 0 ? `Income received: ${fmt(totalIn)} (net: ${totalIn >= totalOut ? "+" : ""}${fmt(totalIn - totalOut)})` : "No income recorded this week",
    biggestTxns.length > 0 ? `Biggest transactions: ${biggestTxns.map(e => `${e.desc} ${fmt(e.amount)}`).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const PROMPT = `Write a weekly financial briefing for ${userName} based on their real spending data below.

${context}

Rules you MUST follow:
- Write 4 to 6 distinct paragraphs, each covering a different angle: overall verdict, top category analysis, essential vs discretionary balance, a specific observation (busiest day or a notable transaction), income/net position if applicable, and a concrete challenge for the coming week.
- Every paragraph must reference specific numbers from the data above. No vague generalities.
- Do not use em dashes (no "—" character and no " -" used as an em dash). Use periods, commas, or colons to join clauses instead.
- Do not repeat sentence structures across paragraphs. Vary your openings.
- Be genuinely specific to THIS week's numbers. Avoid anything that could appear in any other week's email.
- Address ${userName} by name at least twice across the whole briefing.
- No bullet points. Plain prose paragraphs only.
- Return raw JSON only, no markdown fences: {"paragraphs": ["first paragraph", "second paragraph", ...]}`;

  try {
    let text = "";

    if (settings?.provider === "claude" && settings.claude_key_encrypted) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.claude_key_encrypted,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1400,
          system: PERSONA,
          messages: [{ role: "user", content: PROMPT }],
        }),
      });
      const data = await res.json();
      if (res.ok) text = data.content?.[0]?.text || "";

    } else if (settings?.groq_key_encrypted) {
      // Groq (default)
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.groq_key_encrypted}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: PERSONA }, { role: "user", content: PROMPT }],
          max_tokens: 1400,
          temperature: 0.85,
        }),
      });
      const data = await res.json();
      if (res.ok) text = data.choices?.[0]?.message?.content || "";
    }

    if (text) {
      const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed.paragraphs) && parsed.paragraphs.length > 0) {
        return parsed.paragraphs;
      }
    }
  } catch { /* fall through to static fallback */ }

  // Static fallback (no AI key or AI failed) — no em dashes
  const paras = [];
  if (totalOut === 0) {
    paras.push(`${userName}, this week's ledger is blank. Zero recorded spend. That could mean a genuinely quiet week, or it could mean the app didn't get the receipts. Either way, the numbers are ready when you are.`);
  } else if (weekChange === null) {
    paras.push(`${userName}, this is the first week on record, so there's no prior week to benchmark against. Here's what the data shows: ${fmt(totalOut)} across ${activeDays} active day${activeDays !== 1 ? "s" : ""}, with a daily average of ${fmtK(dailyAvg)}. That baseline is now set. Every future week gets measured against it.`);
  } else if (weekChange > 20) {
    paras.push(`${fmt(totalOut)} this week. That's ${Math.abs(weekChange)}% more than last week's ${fmt(prevTotal)}, and the extra ${fmt(totalOut - prevTotal)} deserves a name. Was this a planned heavy week or did things just accumulate? The ledger doesn't judge; it just records. But knowing the answer matters.`);
  } else if (weekChange < -15) {
    paras.push(`Down ${Math.abs(weekChange)}% from last week. ${fmt(totalOut)} against a previous ${fmt(prevTotal)}: you held back ${fmt(prevTotal - totalOut)} compared to seven days ago. That's not trivial. Whether it was deliberate or circumstantial, the financial result is the same.`);
  } else {
    paras.push(`${fmt(totalOut)} this week, coming in ${weekChange > 0 ? `${Math.abs(weekChange)}% above` : `${Math.abs(weekChange)}% below`} last week's ${fmt(prevTotal)}. Consistent weeks make planning reliable and projections accurate. The pattern is visible now.`);
  }

  const top = categoryBreakdown[0];
  if (top && totalOut > 0) {
    const topPct = Math.round((top.amount / totalOut) * 100);
    paras.push(`${top.category} led this week at ${fmt(top.amount)}, which is ${topPct}% of total spend. ${categoryBreakdown[1] ? `Second place went to ${categoryBreakdown[1].category} at ${fmt(categoryBreakdown[1].amount)} (${Math.round((categoryBreakdown[1].amount / totalOut) * 100)}%).` : ""} These two categories together represent ${Math.round(((top.amount + (categoryBreakdown[1]?.amount || 0)) / totalOut) * 100)}% of everything that moved this week.`);
  }

  if (totalOut > 0) {
    paras.push(`The essential vs. discretionary split: ${essPct}% essential (${fmt(essentialTotal)}) and ${discPct}% discretionary (${fmt(discretionaryTotal)}). ${discPct > 55 ? "More than half was technically optional. Worth sitting with the question: how much of that discretionary spend would you choose again?" : discPct < 20 ? "That's a lean week. The overwhelming majority went to necessary spending." : "A balanced split. The 50/30 benchmark isn't far off."}`);
  }

  if (busiestDay && busiestDay.total > 0 && activeDays > 1) {
    paras.push(`${busiestDay.dayFull} was the peak day at ${fmt(busiestDay.total)} across ${busiestDay.count} transaction${busiestDay.count === 1 ? "" : "s"}, which is ${Math.round((busiestDay.total / totalOut) * 100)}% of the entire week in a single day. If that day keeps being expensive, it's worth naming what makes it so.`);
  }

  if (totalIn > 0) {
    const net = totalIn - totalOut;
    paras.push(net >= 0
      ? `Income in: ${fmt(totalIn)}. Net position for the week: +${fmt(net)}. You spent less than you received. That's the foundational requirement for everything else in personal finance.`
      : `${fmt(totalIn)} came in this week. With ${fmt(totalOut)} going out, the net was ${fmt(Math.abs(net))} in the red. Spending exceeded income this week. Survivable once; worth watching if it repeats.`);
  }

  paras.push(`One thing to carry into next week: pick the single category that surprised you most in this report and watch it consciously for seven days. Not to cut it. Just to see it clearly. Awareness before action.`);
  return paras;
}

const APP_URL = "https://trakit-seven.vercel.app";

// ── Rotating catchy header lines — 52 unique lines, one per week of the year ─
function pickHeaderLine() {
  const weekNum = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const lines = [
    "Your wallet called. It has notes.",                                    // wk 0
    "The receipts are in. Brace yourself.",                                 // wk 1
    "This week's money confessional.",                                      // wk 2
    "Where did it all go? We did the math.",                               // wk 3
    "Numbers don't lie. We checked yours.",                                 // wk 4
    "Your week, in cold hard naira.",                                       // wk 5
    "The ledger has spoken. You should listen.",                            // wk 6
    "A full financial debrief, no filter.",                                 // wk 7
    "Coach RBC reviewed your week. She has thoughts.",                      // wk 8
    "The week in numbers. Some of them are fine.",                          // wk 9
    "Your spending, fully accounted for.",                                  // wk 10
    "Everything that moved this week, explained.",                          // wk 11
    "The weekly audit you didn't know you needed.",                         // wk 12
    "Financial honesty hour is here.",                                      // wk 13
    "The weekly reckoning, delivered fresh.",                               // wk 14
    "The numbers are in. Don't panic.",                                     // wk 15
    "Seven days, every naira, no excuses.",                                 // wk 16
    "The weekly financial mirror.",                                         // wk 17
    "What your bank statement won't tell you.",                             // wk 18
    "Your money moved. Here's where it went.",                              // wk 19
    "The full picture from the past seven days.",                           // wk 20
    "Weekly spend intelligence, delivered.",                                // wk 21
    "Your ledger, distilled to one email.",                                 // wk 22
    "Seven days of transactions. All accounted for.",                       // wk 23
    "The facts are in. Coach RBC has commentary.",                          // wk 24
    "Your financial week, told honestly.",                                  // wk 25
    "Time to look at the numbers. We'll go slow.",                          // wk 26
    "Another week, another audit.",                                         // wk 27
    "Your week's spending, no spin.",                                       // wk 28
    "This week's financial highlights and lowlights.",                      // wk 29
    "Your money diary from the past seven days.",                           // wk 30
    "All the numbers from this week, in one place.",                        // wk 31
    "Weekly financial clarity, served fresh.",                              // wk 32
    "The weekly report you actually want to read.",                         // wk 33
    "Your naira, your week, your numbers.",                                 // wk 34
    "Seven days of financial reality, summarized.",                         // wk 35
    "Coach RBC is in your inbox again.",                                    // wk 36
    "The weekly accounting of your financial life.",                        // wk 37
    "Week closes. Numbers settle. Here they are.",                          // wk 38
    "This is what your week looked like in naira.",                         // wk 39
    "The money moved. We tracked every step.",                              // wk 40
    "Your spend, your patterns, your week.",                                // wk 41
    "One week of transactions. Coach RBC has opinions.",                    // wk 42
    "The weekly financial check-in you can't ignore.",                      // wk 43
    "Your naira trail from the past seven days.",                           // wk 44
    "The weekly reality check is here.",                                    // wk 45
    "Transactions logged. Coach RBC briefed. Digest ready.",                // wk 46
    "Your cash flow story, week by week.",                                  // wk 47
    "This week's spend, decoded and delivered.",                            // wk 48
    "The weekly money check-in, no sugar-coating.",                         // wk 49
    "Your ledger doesn't forget. Neither do we.",                           // wk 50
    "52 weeks, 52 reports. Here's this one.",                               // wk 51
  ];
  return lines[weekNum % 52];
}

// ── Email subject lines ─────────────────────────────────────────────────────
function pickSubject(weekStart, weekEnd, totalOut) {
  const opts = [
    `${fmt(totalOut)} spent - your Trakit7 weekly report is here`,
    `Coach RBC's weekly briefing: ${weekStart} to ${weekEnd}`,
    `Your week in naira - everything that moved, explained`,
    `The full receipts: Trakit7 weekly digest, ${weekStart} to ${weekEnd}`,
    `${weekStart} to ${weekEnd} money report: ${fmt(totalOut)} out, full breakdown inside`,
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
  rbcParas,
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
        ${d.total > 0 ? fmt(d.total) : "-"}${isBest ? " &nbsp;🔴" : ""}
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
    const dayOutTotal = dayEntries.filter(e=>e.flow==="out" && e.category !== "Self").reduce((s,e)=>s+Number(e.amount),0);
    const dayInTotal  = dayEntries.filter(e=>e.flow==="in" && e.category !== "Self").reduce((s,e)=>s+Number(e.amount),0);

    const rows = dayEntries.map((e, i) => {
      const isOut = e.flow === "out";
      const rowBg = i % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
      const color = catColor(e.category || "Charges");
      return `
<tr>
  <td style="background:${rowBg};padding:7px 16px;border-bottom:1px solid #E2E8F0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="8" style="vertical-align:middle;padding-right:8px;">
        <div style="width:6px;height:6px;border-radius:50%;background:${isOut ? color : "#10B981"};"></div>
      </td>
      <td style="vertical-align:middle;">
        <div style="font-family:Arial,sans-serif;font-size:12px;color:#111827;font-weight:500;">${e.desc || "(no description)"}</div>
        ${e.category ? `<div style="font-family:Arial,sans-serif;font-size:10px;color:#9CA3AF;margin-top:1px;">${e.category}${e.essentiality && e.essentiality !== "-" ? " · " + e.essentiality : ""}</div>` : ""}
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
<title>Trakit7 -Weekly Financial Report</title>
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
      <a href="${APP_URL}" style="text-decoration:none;display:inline-block;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#F5A623;letter-spacing:-0.5px;">Trakit7</div>
      </a>
      <div style="font-family:Arial,sans-serif;font-size:12px;color:rgba(199,210,254,0.85);letter-spacing:0.02em;margin-top:6px;font-style:italic;">${pickHeaderLine()}</div>
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
  <div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.18em;margin-bottom:12px;">Hey ${userName} -this week you spent</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:52px;font-weight:700;color:#F1F5F9;letter-spacing:-2px;line-height:1;">${fmt(totalOut)}</div>

  ${weekChange !== null ? `
  <div style="margin-top:14px;">
    <span style="display:inline-block;background:${weekChange > 0 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)"};border:1px solid ${weekChange > 0 ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"};border-radius:20px;padding:5px 14px;">
      <span style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${weekChange > 0 ? "#FCA5A5" : "#6EE7B7"};font-weight:700;">
        ${weekChange > 0 ? "↑" : "↓"} ${Math.abs(weekChange)}% vs last week (${fmt(prevWeekTotal)})
      </span>
    </span>
  </div>` : `<div style="margin-top:14px;font-family:Arial,sans-serif;font-size:12px;color:#64748B;">First week on record -no previous week to compare</div>`}

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
          <div style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#fff;font-weight:700;">${busiestDay.total > 0 ? busiestDay.dayShort : "-"}</div>
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
  <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">This Month So Far: ${M_FULL[new Date().getMonth()]} ${new Date().getFullYear()}</div>
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
      <div style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#1E3A8A;font-weight:700;">${projectedMonthly > 0 ? fmt(projectedMonthly) : "-"}</div>
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

<!-- ═══ CTA ═══ -->
<tr><td style="background:#0F172A;padding:32px 40px;text-align:center;">
  <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#C8862E 0%,#A9854F 100%);color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:30px;letter-spacing:0.04em;">
    See full report in Trakit7 &rarr;
  </a>
  <div style="font-family:Arial,sans-serif;font-size:11px;color:#475569;margin-top:12px;">Your complete ledger, charts, and Coach RBC are waiting.</div>
</td></tr>

<!-- COLORED BOTTOM BAR -->
<tr><td style="background:linear-gradient(90deg,#10B981 0%,#3B82F6 33%,#8B5CF6 66%,#EC4899 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

<!-- ═══ FOOTER ═══ -->
<tr><td style="background:linear-gradient(135deg,#0F0A1E 0%,#1E1B4B 100%);border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;">
  <a href="${APP_URL}" style="text-decoration:none;display:inline-block;margin-bottom:6px;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#F5A623;font-weight:700;">Trakit7</div>
  </a>
  <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(148,163,184,0.55);line-height:1.9;">
    Your personal finance tracker. Keeping the receipts so you don't have to.<br/>
    To turn off these weekly digests: open Trakit7, go to Settings, then Notifications.
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

  const apiKey = process.env.BREVO_API_KEY;
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
    { data: aiSettings },
  ] = await Promise.all([
    supabase.from("entries").select("*").eq("user_id", user.id)
      .gte("date", fromDate).lte("date", toDate).order("date").order("created_at"),
    supabase.from("entries").select("amount, flow, category").eq("user_id", user.id)
      .gte("date", prevStart.toISOString().slice(0,10)).lte("date", prevEnd.toISOString().slice(0,10)),
    supabase.from("entries").select("amount, flow, essentiality, category").eq("user_id", user.id)
      .gte("date", monthStart).lte("date", toDate),
    supabase.from("budgets").select("overall, category_budgets").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_ai_settings").select("provider, groq_key_encrypted, claude_key_encrypted").eq("user_id", user.id).maybeSingle(),
  ]);

  const allEntries = (entries || []).sort((a,b) => a.date.localeCompare(b.date) || (a.created_at||"").localeCompare(b.created_at||""));
  const outEntries = allEntries.filter(e => e.flow === "out" && e.category !== "Self");
  const inEntries  = allEntries.filter(e => e.flow === "in" && e.category !== "Self");

  const totalOut  = outEntries.reduce((s,e) => s + Number(e.amount), 0);
  const totalIn   = inEntries.reduce((s,e)  => s + Number(e.amount), 0);
  const prevTotal = (prevEntries||[]).filter(e => e.flow==="out" && e.category !== "Self").reduce((s,e) => s+Number(e.amount), 0);
  const monthTotal = (monthEntries||[]).filter(e => e.flow==="out" && e.category !== "Self").reduce((s,e) => s+Number(e.amount), 0);

  const essentialTotal     = outEntries.filter(e => e.essentiality === "Essential").reduce((s,e) => s+Number(e.amount), 0);
  const discretionaryTotal = outEntries.filter(e => e.essentiality === "Discretionary").reduce((s,e) => s+Number(e.amount), 0);

  // Category breakdown
  const catMap = {};
  for (const e of outEntries) {
    const cat = e.category || "Charges";
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

  const userName  = user.user_metadata?.full_name || user.email?.split("@")[0] || "Taiwo";
  const weekStart = fmtShort(fromDate);
  const weekEnd   = fmtShort(toDate);

  const rbcParas = await generateRbcBriefing({
    settings: aiSettings,
    userName,
    totalOut, prevTotal,
    categoryBreakdown, essentialTotal, discretionaryTotal,
    totalIn, dayBreakdown, allEntries,
    weekStart: fmtFull(fromDate),
    weekEnd:   fmtFull(toDate),
  });

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
    rbcParas,
  });

  const fromName  = "Trakit7";
  const fromEmail = process.env.BREVO_FROM_EMAIL || "taiwointel@gmail.com";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept":       "application/json",
      "content-type": "application/json",
      "api-key":      apiKey,
    },
    body: JSON.stringify({
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: user.email, name: user.user_metadata?.full_name || user.email }],
      subject:     pickHeaderLine(),
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json({ error: errData.message || "Failed to send email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: user.email });
}
