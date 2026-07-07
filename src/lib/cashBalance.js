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

// Every entry a bank-statement parser could read a real running balance
// off of carries a `balance_after` — the bank's own reported figure, not a
// guess. Treat each one as a known reference point in time, exactly like
// the user's manual anchor, and always compute off whichever reference
// point is closest to (and on/before) the requested date. This is what
// lets an OPay/Access import mean the app never needs the manual anchor to
// be right for a day that already has a bank-confirmed balance nearby.
//
// The two point types mean slightly different things: the manual anchor
// represents the *opening* balance for its date (that day's own entries
// still need to be added), while balance_after represents the *closing*
// balance for its date (that day's entries are already included — the
// parser only keeps it on the last entry of each day for exactly this
// reason). On the rare case both exist for the same date, the bank-
// reported figure wins over the manually-typed one.
function collectReferencePoints(entries, anchorDate, anchorAmount) {
  const points = [];
  if (anchorDate) points.push({ date: anchorDate, balance: Number(anchorAmount), type: "anchor" });
  for (const e of entries) {
    if (e.balance_after !== null && e.balance_after !== undefined) {
      points.push({ date: e.date, balance: Number(e.balance_after), type: "balance_after" });
    }
  }
  points.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.type === b.type) return 0;
    return a.type === "anchor" ? -1 : 1;
  });
  return points;
}

/**
 * Closing balance for a given date.
 * anchor_date and date are ISO strings (YYYY-MM-DD).
 */
export function closingBalance(entries, anchorDate, anchorAmount, date) {
  const points = collectReferencePoints(entries, anchorDate, anchorAmount);
  if (points.length === 0) return null;

  // Latest reference point on/before the target date (points are sorted
  // ascending, so the last one matched as we scan forward is the closest).
  let ref = null;
  for (const p of points) {
    if (p.date <= date) ref = p;
    else break;
  }

  if (ref) {
    const flows = entries
      .filter((e) => (ref.type === "balance_after" ? e.date > ref.date : e.date >= ref.date) && e.date <= date)
      .reduce((s, e) => s + (e.flow === "in" ? Number(e.amount) : -Number(e.amount)), 0);
    return Number(ref.balance) + flows;
  }

  // The target date is before every known reference point — project
  // backward from the earliest one, undoing entries between the target
  // date and that point (exclusive of the point's own date for an anchor,
  // since that represents its date's *opening* balance; inclusive for a
  // balance_after point, since that already covers its whole date).
  const earliest = points[0];
  const flows = entries
    .filter((e) => e.date > date && (earliest.type === "balance_after" ? e.date <= earliest.date : e.date < earliest.date))
    .reduce((s, e) => s + (e.flow === "in" ? Number(e.amount) : -Number(e.amount)), 0);
  return Number(earliest.balance) - flows;
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
