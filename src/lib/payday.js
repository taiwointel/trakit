/**
 * Given a payday day-of-month (default 22), find the next payday date
 * from today. Clamped to the month's real length. Pulled back to the
 * nearest prior weekday if it falls on a weekend (Nigerian payroll norm).
 */
export function nextPayday(paydayDay = 22) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function makePayday(year, month /* 0-indexed */) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day     = Math.min(paydayDay, lastDay);
    const d       = new Date(year, month, day);
    // Pull back to Friday if Saturday, Thursday if Sunday
    const dow = d.getDay();
    if (dow === 6) d.setDate(d.getDate() - 1);
    if (dow === 0) d.setDate(d.getDate() - 2);
    return d;
  }

  let candidate = makePayday(today.getFullYear(), today.getMonth());
  if (candidate < today) {
    // Already passed this month — use next month
    candidate = makePayday(
      today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear(),
      (today.getMonth() + 1) % 12,
    );
  }

  const msDay      = 1000 * 60 * 60 * 24;
  const daysUntil  = Math.round((candidate - today) / msDay);
  // Use local date parts — toISOString() is UTC and shifts date back in UTC+ zones (e.g. WAT UTC+1)
  const pad        = (n) => String(n).padStart(2, "0");
  const isoDate    = `${candidate.getFullYear()}-${pad(candidate.getMonth() + 1)}-${pad(candidate.getDate())}`;

  return { daysUntil, isoDate };
}
