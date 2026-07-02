import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

function fmt(n) {
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(d) {
  const dt = new Date(d + "T00:00:00");
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${dt.getDate()} ${M[dt.getMonth()]}`;
}

function fmtFull(d) {
  const dt = new Date(d + "T00:00:00");
  const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${dt.getDate()} ${M[dt.getMonth()]} ${dt.getFullYear()}`;
}

function getRbcInsight(categoryBreakdown, totalOut, weekChange) {
  const parts = [];

  if (weekChange !== null) {
    if (weekChange > 30) {
      parts.push(`Up ${Math.abs(weekChange)}% from last week. Big week — either something important happened or the 'treat yourself' account got very excited. We'll find out which.`);
    } else if (weekChange < -20) {
      parts.push(`Down ${Math.abs(weekChange)}% from last week. That's the kind of number I like to see. Restraint, circumstance, or sheer luck — I'll take it.`);
    }
  }

  const top = categoryBreakdown[0];
  if (top && totalOut > 0) {
    const pct = Math.round((top.amount / totalOut) * 100);
    const quips = {
      "Dining & Lifestyle": `${pct}% of this week's spend went to Dining & Lifestyle. Your social calendar is impeccably funded. Your savings account sends its warmest regards — from a distance.`,
      "Transportation": `Transportation claimed ${pct}% of this week's spend. Lagos doesn't come to you, and apparently, you didn't come cheap to it either.`,
      "Food & Groceries": `${pct}% on Food & Groceries. Eating is non-negotiable, the market doesn't negotiate, and your stomach definitely doesn't take suggestions. Carry on.`,
      "Housing & Utilities": `Housing & Utilities took ${pct}% this week. NEPA, diesel, internet, estate fees — the holy quartet of Nigerian adult life. Respect.`,
      "Family & Dependents": `${pct}% went to Family & Dependents. Being the financially available one is expensive and quietly heroic. Worth tracking closely so you don't overshoot your capacity.`,
      "Debt Service": `${pct}% to Debt Service. Every naira paid is one step closer to zero balance and one step further from your lender's daily thought. Keep going.`,
      "Betting": `${pct}% on Betting this week. The odds are entertaining, occasionally profitable, and reliably present on this ledger. A budget helps here, just saying.`,
      "Personal Care": `${pct}% on Personal Care. Showing up well-groomed in a world that notices costs money. That's the honest trade. Budget for it properly.`,
      "Savings & Investment": `${pct}% into Savings & Investment — your future self is sending a thank-you note it hasn't written yet but absolutely will.`,
    };
    parts.push(quips[top.category] || `${top.category} led the charge at ${pct}% of your weekly spend. Worth a quick look to see if that matches your intentions.`);
  }

  return parts.slice(0, 2).join(" ") || null;
}

function buildEmailHtml({ userName, weekStart, weekEnd, totalOut, totalIn, categoryBreakdown, topTransactions, prevWeekTotal }) {
  const maxCat = Math.max(...categoryBreakdown.map(c => c.amount), 1);
  const weekChange = prevWeekTotal > 0 ? Math.round(((totalOut - prevWeekTotal) / prevWeekTotal) * 100) : null;
  const weekChangeLabel = weekChange === null ? null
    : weekChange > 0 ? `↑ ${Math.abs(weekChange)}% vs last week`
    : `↓ ${Math.abs(weekChange)}% vs last week`;
  const weekChangeColor = weekChange !== null && weekChange > 0 ? "#B8392B" : "#2F7A56";
  const net = totalIn - totalOut;
  const netColor = net >= 0 ? "#2F7A56" : "#B8392B";
  const netLabel = net >= 0 ? `+${fmt(net)} net positive` : `${fmt(Math.abs(net))} net deficit`;
  const rbcInsight = getRbcInsight(categoryBreakdown, totalOut, weekChange);

  const catRows = categoryBreakdown.slice(0, 7).map(c => {
    const w = Math.round((c.amount / maxCat) * 180);
    return `
<tr><td style="padding:7px 0;border-bottom:1px solid rgba(21,25,31,0.07);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="145" style="font-family:Arial,sans-serif;font-size:12px;color:#5B6472;padding-right:10px;vertical-align:middle;">${c.category}</td>
    <td style="vertical-align:middle;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="180" height="8" style="background:rgba(169,133,79,0.13);border-radius:4px;vertical-align:top;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="${w}" height="8" style="background:#A9854F;border-radius:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
        </td>
      </tr></table>
    </td>
    <td style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#21242A;font-weight:700;text-align:right;white-space:nowrap;padding-left:12px;vertical-align:middle;">${fmt(c.amount)}</td>
  </tr></table>
</td></tr>`;
  }).join("");

  const txRows = topTransactions.slice(0, 5).map(tx => `
<tr><td style="padding:8px 0;border-bottom:1px solid rgba(21,25,31,0.07);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:#21242A;font-weight:600;">${tx.desc || "(no description)"}</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#5B6472;margin-top:2px;">${tx.category || "Uncategorized"} &middot; ${fmtShort(tx.date)}</div>
    </td>
    <td style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#B8392B;font-weight:700;text-align:right;white-space:nowrap;padding-left:12px;">${fmt(tx.amount)}</td>
  </tr></table>
</td></tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Trakit7 — Weekly Spend Digest</title>
</head>
<body style="margin:0;padding:0;background:#E3DFD2;font-family:Arial,sans-serif;">
<center>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#E3DFD2;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

<!-- HEADER -->
<tr><td style="background:#1D232C;border-radius:16px 16px 0 0;padding:28px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#A9854F;letter-spacing:-0.5px;">Trakit7</div>
      <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(167,172,182,0.65);text-transform:uppercase;letter-spacing:0.14em;margin-top:4px;">Weekly Spend Digest</div>
    </td>
    <td align="right" style="vertical-align:top;">
      <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(167,172,182,0.55);line-height:1.7;">${weekStart}<br/>${weekEnd}</div>
    </td>
  </tr></table>
</td></tr>

<!-- GOLD BAR -->
<tr><td style="background:linear-gradient(90deg,#C8862E 0%,#A9854F 60%,#8C4F5B 100%);height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

<!-- HERO STAT -->
<tr><td style="background:#15191F;padding:36px 40px 30px;text-align:center;">
  <div style="font-family:Arial,sans-serif;font-size:10px;color:#A7ACB6;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:10px;">Hey ${userName} — this week you spent</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:700;color:#ECE9E1;letter-spacing:-1.5px;">${fmt(totalOut)}</div>
  ${weekChangeLabel ? `<div style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${weekChangeColor};margin-top:10px;font-weight:700;">${weekChangeLabel}</div>` : ""}
  ${totalIn > 0 ? `<div style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#A7ACB6;margin-top:8px;">${fmt(totalIn)} in &nbsp;&middot;&nbsp; <span style="color:${netColor};">${netLabel}</span></div>` : ""}
</td></tr>

<!-- BODY -->
<tr><td style="background:#F6F3EC;padding:32px 40px 8px;">

${categoryBreakdown.length > 0 ? `
<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#5B6472;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">WHERE YOUR MONEY WENT</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">${catRows}</table>
` : ""}

${topTransactions.length > 0 ? `
<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#5B6472;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">BIGGEST TRANSACTIONS</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">${txRows}</table>
` : ""}

${totalOut === 0 ? `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#5B6472;text-align:center;padding:24px 0 36px;font-style:italic;">
  No spending recorded this week. Either you were remarkably disciplined or you forgot to log things. Coach RBC accepts both explanations.
</div>
` : ""}

</td></tr>

${rbcInsight ? `
<!-- COACH RBC -->
<tr><td style="background:#F6F3EC;padding:0 40px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="border-left:3px solid #A9854F;background:#EDE9E1;border-radius:0 10px 10px 0;padding:16px 20px;">
      <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#A9854F;text-transform:uppercase;letter-spacing:0.13em;margin-bottom:8px;">Coach RBC Says</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#21242A;line-height:1.75;font-style:italic;">&ldquo;${rbcInsight}&rdquo;</div>
    </td>
  </tr></table>
</td></tr>
` : ""}

<!-- FOOTER -->
<tr><td style="background:#1D232C;border-radius:0 0 16px 16px;padding:22px 40px;text-align:center;">
  <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(167,172,182,0.45);line-height:1.9;">
    Trakit7 &middot; Your personal finance tracker<br/>
    To turn off weekly digests, open Settings &rarr; Notifications in the app.
  </div>
</td></tr>

</table>
</td></tr>
</table>
</center>
</body>
</html>`;
}

function pickSubject(weekStart, weekEnd, totalOut) {
  const options = [
    `The ₦ receipts are in — your week, ${weekStart}–${weekEnd}`,
    `Your money went where? Coach RBC has the full report`,
    `${fmt(totalOut)} later — here's how your week played out`,
    `Trakit7 weekly: ${weekStart}–${weekEnd} in full`,
  ];
  return options[new Date().getDay() % options.length];
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "Email not configured. Add RESEND_API_KEY to your Vercel environment variables. Get a free key at resend.com.",
    }, { status: 503 });
  }

  const today = new Date();
  const toDate = today.toISOString().slice(0, 10);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6);
  const fromDate = weekAgo.toISOString().slice(0, 10);

  const prevEnd = new Date(weekAgo); prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 6);
  const prevFromDate = prevStart.toISOString().slice(0, 10);
  const prevToDate = prevEnd.toISOString().slice(0, 10);

  const [{ data: entries }, { data: prevEntries }] = await Promise.all([
    supabase.from("entries").select("*").eq("user_id", user.id).gte("date", fromDate).lte("date", toDate),
    supabase.from("entries").select("amount, flow").eq("user_id", user.id).gte("date", prevFromDate).lte("date", prevToDate),
  ]);

  const outEntries = (entries || []).filter(e => e.flow === "out");
  const inEntries  = (entries || []).filter(e => e.flow === "in");
  const totalOut   = outEntries.reduce((s, e) => s + Number(e.amount), 0);
  const totalIn    = inEntries.reduce((s, e) => s + Number(e.amount), 0);
  const prevTotal  = (prevEntries || []).filter(e => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);

  const catMap = {};
  for (const e of outEntries) {
    const cat = e.category || "Miscellaneous";
    catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
  }
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const topTransactions = [...outEntries]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Taiwo";
  const weekStart = fmtShort(fromDate);
  const weekEnd   = fmtShort(toDate);

  const html = buildEmailHtml({
    userName,
    weekStart: fmtFull(fromDate),
    weekEnd: fmtFull(toDate),
    totalOut,
    totalIn,
    categoryBreakdown,
    topTransactions,
    prevWeekTotal: prevTotal,
  });

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Trakit7 <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: user.email,
    subject: pickSubject(weekStart, weekEnd, totalOut),
    html,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sentTo: user.email });
}
