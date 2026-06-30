/**
 * All cash balance math. No running total is ever stored — everything
 * is derived from the anchor + ledger entries. (spec §5.2, §5.3)
 */

/** Net flow for a single date from a sorted entry list */
export function netFlowForDate(entries, date) {
  return entries
    .filter((e) => e.date === date)
    .reduce((s, e) => s + (e.flow === "in" ? Number(e.amount) : -Number(e.amount)), 0);
}

/**
 * Closing balance for a given date.
 * anchor_date and date are ISO strings (YYYY-MM-DD).
 */
export function closingBalance(entries, anchorDate, anchorAmount, date) {
  if (!anchorDate) return null;
  return (
    Number(anchorAmount) +
    entries
      .filter((e) => e.date >= anchorDate && e.date <= date)
      .reduce((s, e) => s + (e.flow === "in" ? Number(e.amount) : -Number(e.amount)), 0)
  );
}

export function openingBalance(entries, anchorDate, anchorAmount, date) {
  const closing = closingBalance(entries, anchorDate, anchorAmount, date);
  if (closing === null) return null;
  return closing - netFlowForDate(entries, date);
}

/**
 * Liquidity months-of-coverage (spec §5.3).
 * Average essential spend over the last 3 calendar months with any essential spend.
 */
export function liquidityCoverage(entries, currentBalance) {
  if (currentBalance === null || currentBalance === undefined) return null;

  const today   = new Date();
  const samples = [];

  for (let i = 1; i <= 3; i++) {
    const m     = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const mStr  = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const total = entries
      .filter((e) => e.date?.startsWith(mStr) && e.flow === "out" && e.essentiality === "Essential")
      .reduce((s, e) => s + Number(e.amount), 0);
    if (total > 0) samples.push(total);
  }

  if (samples.length === 0) return null;
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return avg > 0 ? currentBalance / avg : null;
}

export function liquidityVerdict(months) {
  if (months === null) return { label: "No data", color: "var(--ink-text-dim)" };
  if (months < 1)  return { label: "Critically thin",       color: "var(--red)"        };
  if (months < 3)  return { label: "Below the safety line", color: "var(--amber)"      };
  if (months <= 6) return { label: "Healthy range",         color: "var(--green)"      };
  return              { label: "Very liquid",               color: "var(--blue-accent)" };
}

/** Last 14 days of daily opening/closing balance rows */
export function last14Days(entries, anchorDate, anchorAmount) {
  const rows = [];
  for (let i = 13; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const opening = openingBalance(entries, anchorDate, anchorAmount, iso) ?? 0;
    const net     = netFlowForDate(entries, iso);
    rows.push({ date: iso, opening, net, closing: opening + net });
  }
  return rows;
}
