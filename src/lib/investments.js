/** Pure investment calculations — no React, no Supabase. */

export const INVESTMENT_TYPE_TO_GROUP = {
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

/** Maturity-group calculations (§5.6) */
export function maturityCalc(inv) {
  const faceValue = Number(inv.principal);
  const rate      = Number(inv.rate);
  const days      = Number(inv.tenor_days);

  let price, expectedReturn, maturityValue;

  if (inv.type === "Fixed Term Notes") {
    price          = faceValue;
    expectedReturn = faceValue * (rate / 100) * (days / 365);
    maturityValue  = faceValue + expectedReturn;
  } else {
    // Discount basis: Treasury Bills, Commercial Papers
    price          = faceValue * (1 - (rate / 100) * (days / 365));
    expectedReturn = faceValue - price;
    maturityValue  = faceValue;
  }

  const purchaseObj    = new Date(inv.purchase_date + "T00:00:00");
  const maturityObj    = new Date(purchaseObj);
  maturityObj.setDate(maturityObj.getDate() + days);
  const maturityDate   = maturityObj.toISOString().slice(0, 10);

  const today          = new Date(); today.setHours(0, 0, 0, 0);
  const msDay          = 86400000;
  const daysToMaturity = Math.round((maturityObj - today) / msDay);
  const elapsedDays    = Math.max(0, days - Math.max(0, daysToMaturity));
  const elapsedPct     = Math.min(100, Math.round((elapsedDays / days) * 100));
  const status         = daysToMaturity <= 0 ? "Matured" : "Active";

  return { price, expectedReturn, maturityValue, maturityDate, daysToMaturity, elapsedPct, status };
}

/** Balance-group: net value from deposit/withdrawal transactions */
export function balanceNetValue(txns) {
  return txns.reduce((s, t) =>
    t.type === "deposit" ? s + Number(t.amount) : s - Number(t.amount), 0);
}

/** Life assurance coverage analytics (§5.6) */
export function lifeAssuranceCoverage(inv, txns) {
  if (!inv.start_date || !inv.monthly_premium) {
    return { monthsSinceStart: 0, paidCount: 0, coveragePct: 0, arrearsMonths: 0, arrearsAmount: 0, allMonths: [], paidSet: new Set() };
  }

  const start = new Date(inv.start_date + "T00:00:00");
  const now   = new Date();
  const allMonths = [];

  let y = start.getFullYear(), m = start.getMonth(); // 0-indexed month
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
    allMonths.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m++; if (m === 12) { m = 0; y++; }
  }

  const paidSet    = new Set(txns.filter((t) => t.type === "paid"   && t.month).map((t) => t.month));
  const missedTxns = txns.filter((t) => t.type === "missed" && t.month);
  const missedSet  = new Set(missedTxns.map((t) => t.month));

  const paidCount          = paidSet.size;
  const missedExplicitAmt  = missedTxns.reduce((s, t) => s + Number(t.amount), 0);
  const unloggedMonths     = allMonths.filter((mo) => !paidSet.has(mo) && !missedSet.has(mo));
  const arrearsMonths      = missedSet.size + unloggedMonths.length;
  const arrearsAmount      = missedExplicitAmt + unloggedMonths.length * Number(inv.monthly_premium);

  return {
    monthsSinceStart: allMonths.length,
    paidCount,
    coveragePct: allMonths.length > 0 ? (paidCount / allMonths.length) * 100 : 0,
    arrearsMonths,
    arrearsAmount,
    allMonths,
    paidSet,
  };
}

/**
 * Returns the list of YYYY-MM months to accrue for a pension
 * (from last_accrual_month+1 through current month inclusive).
 */
export function pensionAccrualMonths(lastAccrualMonth) {
  if (!lastAccrualMonth) return [];
  const [lastY, lastM] = lastAccrualMonth.split("-").map(Number);
  const now = new Date();
  const curY = now.getFullYear(), curM = now.getMonth() + 1; // 1-indexed

  const months = [];
  let y = lastY, m = lastM + 1;
  if (m > 12) { m = 1; y++; }
  while (y < curY || (y === curY && m <= curM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return months;
}

/** Portfolio grand total (§5.6 formula) */
export function portfolioTotal(investments, allTxns) {
  return investments.reduce((total, inv) => {
    const txns = allTxns.filter((t) => t.investment_id === inv.id);
    switch (inv.group) {
      case "maturity": return total + maturityCalc(inv).price;
      case "balance": {
        const net = balanceNetValue(txns);
        return total + (inv.type === "Equities" && inv.mark_value ? Number(inv.mark_value) : net);
      }
      case "life":    return total + txns.filter((t) => t.type === "paid").reduce((s, t) => s + Number(t.amount), 0);
      case "pension": return total + Number(inv.balance || 0);
      default:        return total;
    }
  }, 0);
}

/** Enumerate all YYYY-MM months between two YYYY-MM strings (inclusive) */
export function monthRange(from, to) {
  if (!from || !to || from > to) return [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const months = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return months;
}
