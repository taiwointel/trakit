import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TYPE_GROUP = {
  "Treasury Bills":     "maturity",
  "Fixed Term Notes":   "maturity",
  "Commercial Papers":  "maturity",
  "Equities":           "balance",
  "Savings":            "balance",
  "Ethical Investments":"balance",
  "Mutual Funds":       "balance",
  "Life Assurance":     "life",
  "Pension":            "pension",
};

function num(v) { return v != null ? Number(v) : null; }
function str(a, b) { return a || b || null; }

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }

  const uid = user.id;
  const summary = {
    entries: 0,
    budgets: false,
    cashBalance: false,
    investments: 0,
    investmentTxns: 0,
    emergencyFundTxns: 0,
    customGoals: 0,
    goals: false,
  };
  const errors = [];

  // ── 1. Entries ────────────────────────────────────────────────
  if (Array.isArray(body.entries) && body.entries.length > 0) {
    const rows = body.entries.map((e) => ({
      user_id:      uid,
      date:         e.date,
      desc:         e.desc,
      amount:       num(e.amount) ?? 0,
      flow:         e.flow || "out",
      beneficiary:  e.beneficiary || null,
      category:     e.category || null,
      subcategory:  e.subcategory || null,
      essentiality: e.essentiality || null,
      nature:       e.nature || null,
      confidence:   e.confidence != null ? Number(e.confidence) : null,
      note:         e.note || null,
      status:       e.status || "done",
    }));
    // Insert in chunks of 500 to stay within Supabase limits
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("entries").insert(rows.slice(i, i + 500));
      if (error) { errors.push("entries: " + error.message); break; }
      else summary.entries += Math.min(500, rows.length - i);
    }
  }

  // ── 2. Budgets ────────────────────────────────────────────────
  if (body.budgets) {
    const b = body.budgets;
    const row = {
      user_id:          uid,
      overall:          b.overall != null ? num(b.overall) : null,
      category_budgets: b.categories || b.category_budgets || {},
    };
    const { error } = await supabase.from("budgets").upsert(row, { onConflict: "user_id" });
    if (error) errors.push("budgets: " + error.message);
    else summary.budgets = true;
  }

  // ── 3. Cash balance ───────────────────────────────────────────
  if (body.cashbalance) {
    const cb = body.cashbalance;
    const row = {
      user_id:       uid,
      anchor_date:   str(cb.anchorDate, cb.anchor_date),
      anchor_amount: num(cb.anchorAmount ?? cb.anchor_amount) ?? 0,
    };
    const { error } = await supabase.from("cash_balance").upsert(row, { onConflict: "user_id" });
    if (error) errors.push("cash_balance: " + error.message);
    else summary.cashBalance = true;
  }

  // ── 4. Investments + transactions ─────────────────────────────
  if (Array.isArray(body.investments) && body.investments.length > 0) {
    for (const inv of body.investments) {
      const group = TYPE_GROUP[inv.type] || inv.group || "balance";

      const invRow = {
        user_id:              uid,
        type:                 inv.type,
        label:                inv.label,
        group,
        principal:            num(inv.principal),
        rate:                 num(inv.rate),
        tenor_days:           num(inv.tenorDays ?? inv.tenor_days),
        purchase_date:        str(inv.purchaseDate, inv.purchase_date),
        mark_value:           num(inv.markValue ?? inv.mark_value),
        monthly_premium:      num(inv.monthlyPremium ?? inv.monthly_premium),
        start_date:           str(inv.startDate, inv.start_date),
        monthly_contribution: num(inv.monthlyContribution ?? inv.monthly_contribution),
        balance:              num(inv.balance),
        last_accrual_month:   str(inv.lastAccrualMonth, inv.last_accrual_month),
        last_payment_date:    str(inv.lastPaymentDate, inv.last_payment_date),
      };

      const { data: invData, error: invErr } = await supabase
        .from("investments").insert(invRow).select("id").single();

      if (invErr) { errors.push(`investment "${inv.label}": ` + invErr.message); continue; }
      summary.investments++;
      const newId = invData.id;

      // Balance group transactions
      const balanceTxns = group === "balance" ? (inv.transactions || []) : [];
      // Life assurance payment log
      const lifeTxns = group === "life" ? (inv.paymentLog || inv.payment_log || []) : [];
      // Pension contribution history
      const pensionTxns = group === "pension" ? (inv.contributionHistory || inv.contribution_history || []) : [];

      const txnRows = [
        ...balanceTxns.map((t) => ({
          investment_id: newId,
          date:          t.date || null,
          type:          t.type || "deposit",
          amount:        num(t.amount) ?? 0,
          month:         t.month || null,
        })),
        ...lifeTxns.map((t) => ({
          investment_id: newId,
          date:          null,
          month:         t.month,
          type:          t.type || t.status || "paid",
          amount:        num(t.amount) ?? num(inv.monthlyPremium ?? inv.monthly_premium) ?? 0,
        })),
        ...pensionTxns.map((t) => ({
          investment_id: newId,
          date:          t.date || null,
          month:         t.month,
          type:          t.type || "accrual",
          amount:        num(t.amount) ?? 0,
        })),
      ];

      if (txnRows.length > 0) {
        const { error: txnErr } = await supabase.from("investment_transactions").insert(txnRows);
        if (txnErr) errors.push(`investment_transactions for "${inv.label}": ` + txnErr.message);
        else summary.investmentTxns += txnRows.length;
      }
    }
  }

  // ── 5. Goals + emergency fund + custom goals ──────────────────
  if (body.goals) {
    const g = body.goals;

    const goalsRow = {
      user_id:                        uid,
      salary:                         num(g.salary),
      payday_day:                     num(g.paydayDay ?? g.payday_day) ?? 22,
      emergency_fund_target_override: num(g.emergencyFundTargetOverride ?? g.emergency_fund_target_override),
    };
    const { error: gErr } = await supabase.from("goals").upsert(goalsRow, { onConflict: "user_id" });
    if (gErr) errors.push("goals: " + gErr.message);
    else summary.goals = true;

    // Emergency fund transactions
    const efTxns = g.emergencyFund?.transactions || g.emergency_fund?.transactions || g.emergency_fund_transactions || [];
    if (efTxns.length > 0) {
      const efRows = efTxns.map((t) => ({
        user_id: uid,
        date:    t.date,
        type:    t.type,
        amount:  num(t.amount) ?? 0,
        note:    t.note || null,
      }));
      const { error: efErr } = await supabase.from("emergency_fund_transactions").insert(efRows);
      if (efErr) errors.push("emergency_fund_transactions: " + efErr.message);
      else summary.emergencyFundTxns = efRows.length;
    }

    // Custom goals
    const cGoals = g.customGoals || g.custom_goals || [];
    if (cGoals.length > 0) {
      const cgRows = cGoals.map((cg) => ({
        user_id:       uid,
        name:          cg.name,
        target_amount: num(cg.targetAmount ?? cg.target_amount) ?? 0,
        target_date:   str(cg.targetDate, cg.target_date),
        saved_so_far:  num(cg.savedSoFar ?? cg.saved_so_far) ?? 0,
      }));
      const { error: cgErr } = await supabase.from("custom_goals").insert(cgRows);
      if (cgErr) errors.push("custom_goals: " + cgErr.message);
      else summary.customGoals = cgRows.length;
    }
  }

  return NextResponse.json({
    ok:      errors.length === 0,
    summary,
    errors:  errors.length > 0 ? errors : undefined,
  });
}
