/** Format a number as ₦1,234,567.89 */
export function formatNaira(amount, opts = {}) {
  const { decimals = 2, compact = false } = opts;
  if (amount == null || isNaN(amount)) return "₦0";
  const abs = Math.abs(Number(amount));
  if (compact && abs >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (compact && abs >= 1_000) {
    return `₦${(amount / 1_000).toFixed(1)}K`;
  }
  return "₦" + Number(amount).toLocaleString("en-NG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Add comma grouping as the user types — strips non-numeric chars, then re-formats */
export function formatAmountInput(raw) {
  const digits = raw.replace(/[^0-9.]/g, "");
  const parts  = digits.split(".");
  parts[0]     = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.slice(0, 2).join(".");
}

/** Parse a comma-formatted string back to a number */
export function parseAmount(str) {
  return parseFloat(String(str).replace(/,/g, "")) || 0;
}

/** Format date as "Mon, 30 Jun 2026" */
export function formatDateShort(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Format date as "Wednesday, June 30, 2026" (payday widget) */
export function formatDateLong(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Today's date as ISO string YYYY-MM-DD */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Return the last N calendar dates as ISO strings, oldest first */
export function lastNDays(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** All calendar dates for a given YYYY-MM month */
export function datesInMonth(year, month) {
  const dates = [];
  const total = new Date(year, month, 0).getDate();
  for (let d = 1; d <= total; d++) {
    dates.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}
